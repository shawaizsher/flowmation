import { useState, FormEvent, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import FluxionLogo from '../components/FluxionLogo';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

const OTP_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[a-zA-Z\s'\-]+$/;

export default function RegisterPage() {
  const navigate  = useNavigate();
  const setAuth   = useStore((s) => s.setAuth);
  const setShowTutorial = useStore((s) => s.setShowTutorial);

  // Registration form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState({ firstName: false, lastName: false, email: false, password: false });

  // Step state: form → otp → experience
  const [step, setStep]           = useState<'form' | 'otp' | 'experience'>('form');
  const [digits, setDigits]       = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError]   = useState('');

  // Pending auth data — held until experience is selected
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any; workspaces: any[] } | null>(null);

  /* ── Validators ── */
  const validateFirstName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'First name is required.';
    if (trimmed.length < 2) return 'Must be at least 2 characters.';
    if (trimmed.length > 40) return 'Must be 40 characters or fewer.';
    if (!NAME_PATTERN.test(trimmed)) return 'Only letters, hyphens, or apostrophes allowed.';
    return '';
  };

  const validateLastName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Last name is required.';
    if (trimmed.length < 2) return 'Must be at least 2 characters.';
    if (trimmed.length > 40) return 'Must be 40 characters or fewer.';
    if (!NAME_PATTERN.test(trimmed)) return 'Only letters, hyphens, or apostrophes allowed.';
    return '';
  };

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email is required.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email like name@example.com.';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required.';
    if (value.length < 8) return 'Password must be at least 8 characters.';
    return '';
  };

  /* ── Submit registration form ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const firstNameError = validateFirstName(firstName);
    const lastNameError  = validateLastName(lastName);
    const emailError     = validateEmail(email);
    const passwordError  = validatePassword(password);
    setShowErrors(true);
    setTouched({ firstName: true, lastName: true, email: true, password: true });

    if (firstNameError || lastNameError || emailError || passwordError) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedName  = `${firstName.trim()} ${lastName.trim()}`;
    setEmail(normalizedEmail);

    setLoading(true);
    try {
      const { data } = await authApi.register({ name: normalizedName, email: normalizedEmail, password });
      if (data.emailVerificationRequired) {
        setStep('otp');
        toast.success('A 6-digit code was sent to your email!');
      } else {
        setAuth(data.token, data.user, data.workspaces || (data.workspace ? [data.workspace] : []));
        toast.success('Account created!');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP digit input handlers ── */
  const focusBox = (idx: number) => inputRefs.current[idx]?.focus();

  const handleDigitChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (otpError) setOtpError('');
    if (char && idx < OTP_LENGTH - 1) focusBox(idx + 1);
    if (char && next.every(d => d !== '') && idx === OTP_LENGTH - 1) submitOtp(next.join(''));
  };

  const handleDigitKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) { next[idx] = ''; setDigits(next); }
      else if (idx > 0) { next[idx - 1] = ''; setDigits(next); focusBox(idx - 1); }
    } else if (e.key === 'ArrowLeft' && idx > 0) focusBox(idx - 1);
    else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) focusBox(idx + 1);
    else if (e.key === 'Enter') { const code = digits.join(''); if (code.length === OTP_LENGTH) submitOtp(code); }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  };

  /* ── Verify OTP — go to experience step instead of dashboard ── */
  const submitOtp = async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    try {
      const { data } = await authApi.verifyOtp(email, code);
      setPendingAuth({
        token: data.token,
        user: data.user,
        workspaces: data.workspaces || (data.workspace ? [data.workspace] : []),
      });
      toast.success('Email verified! One more thing…');
      setStep('experience');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Invalid code';
      setOtpError(msg);
      toast.error(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => focusBox(0), 80);
    } finally {
      setVerifying(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success('New code sent! Check your inbox.');
      setDigits(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      setTimeout(() => focusBox(0), 80);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  /* ── Experience selection ── */
  const handleExperienceSelect = (isNew: boolean) => {
    if (!pendingAuth) return;
    setAuth(pendingAuth.token, pendingAuth.user, pendingAuth.workspaces || []);
    if (isNew) {
      setShowTutorial(true);
      toast.success("Welcome! We'll show you around.");
    } else {
      setShowTutorial(false);
      toast.success("Welcome back! Let's build something.");
    }
    navigate('/dashboard');
  };

  const firstNameError  = validateFirstName(firstName);
  const lastNameError   = validateLastName(lastName);
  const emailError      = validateEmail(email);
  const passwordError   = validatePassword(password);
  const showFirstNameError  = (showErrors || touched.firstName) && firstNameError;
  const showLastNameError   = (showErrors || touched.lastName) && lastNameError;
  const showEmailError      = (showErrors || touched.email) && emailError;
  const showPasswordError   = (showErrors || touched.password) && passwordError;

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 relative">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Home</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <FluxionLogo size={36} />
          <span className="font-body text-2xl font-bold text-foreground tracking-tight">Fluxion</span>
        </div>

        <div className="card p-8">

          {/* ── Experience step ── */}
          {step === 'experience' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-brand-500" />
              </div>
              <h2 className="font-body text-xl font-bold text-foreground mb-2">
                Welcome, {pendingAuth?.user?.name?.split(' ')[0]}!
              </h2>
              <p className="text-sm text-foreground-muted mb-8">
                Have you used workflow automation tools before?<br />
                <span className="text-xs">(e.g. Zapier, Make, n8n)</span>
              </p>

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => handleExperienceSelect(false)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-surface-border hover:border-brand-500 hover:bg-brand-500/5 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0 group-hover:bg-brand-500/20 transition">
                    <Zap size={20} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">Yes, I'm familiar</p>
                    <p className="text-xs text-foreground-muted">I've used tools like this before — take me straight to the canvas.</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExperienceSelect(true)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-surface-border hover:border-green-500 hover:bg-green-500/5 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition">
                    <Sparkles size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">No, I'm new to this</p>
                    <p className="text-xs text-foreground-muted">Show me a quick tour so I can get started confidently.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                <Mail size={28} className="text-brand-500" />
              </div>
              <h2 className="font-body text-xl font-bold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-foreground-muted mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-semibold text-foreground mb-6">{email}</p>

              <div className="flex items-center gap-2.5 mb-3">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    autoFocus={i === 0}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-lg border-2 bg-surface-input text-foreground outline-none transition-all duration-150
                      ${d ? 'border-brand-500 bg-brand-500/5' : 'border-surface-border'}
                      focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`}
                    style={{ height: '52px' }}
                    disabled={verifying}
                  />
                ))}
              </div>

              {otpError ? (
                <p className="text-xs text-red-400 mb-3">{otpError}</p>
              ) : (
                <p className="text-xs text-foreground-muted mb-3">Enter all 6 digits to continue.</p>
              )}

              <button
                onClick={() => submitOtp(digits.join(''))}
                disabled={digits.some(d => !d) || verifying}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Verifying…</>
                  : <><CheckCircle2 size={15} /> Verify Email</>
                }
              </button>

              <p className="text-xs text-foreground-muted mb-3">Code expires in 15 minutes.</p>

              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending…' : 'Resend code'}
              </button>

              <div className="mt-6 pt-4 border-t border-surface-border w-full">
                <button
                  onClick={() => { setStep('form'); setDigits(Array(OTP_LENGTH).fill('')); }}
                  onMouseDown={() => setOtpError('')}
                  className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          )}

          {/* ── Registration form ── */}
          {step === 'form' && (
            <>
              <h2 className="font-body text-xl font-bold text-foreground text-center mb-1">
                Create your account
              </h2>
              <p className="text-sm text-foreground-muted text-center mb-6">
                Start building workflows in seconds
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First + Last name side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">First Name *</label>
                    <input
                      type="text"
                      className={`input-field w-full ${showFirstNameError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      placeholder="Jane"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                      autoComplete="given-name"
                      aria-invalid={Boolean(showFirstNameError)}
                    />
                    {showFirstNameError && (
                      <p className="mt-1 text-xs text-red-400">{firstNameError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      className={`input-field w-full ${showLastNameError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      placeholder="Doe"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, lastName: true }))}
                      autoComplete="family-name"
                      aria-invalid={Boolean(showLastNameError)}
                    />
                    {showLastNameError && (
                      <p className="mt-1 text-xs text-red-400">{lastNameError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Email *</label>
                  <input
                    type="email"
                    className={`input-field w-full ${showEmailError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    autoComplete="email"
                    aria-invalid={Boolean(showEmailError)}
                  />
                  {showEmailError ? (
                    <p className="mt-1 text-xs text-red-400">{emailError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-foreground-muted">We'll send a 6-digit code to this email.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className={`input-field w-full pr-10 ${showPasswordError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      autoComplete="new-password"
                      aria-invalid={Boolean(showPasswordError)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary"
                      onClick={() => setShowPw(!showPw)}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {showPasswordError ? (
                    <p className="mt-1 text-xs text-red-400">{passwordError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-foreground-muted">Use at least 8 characters.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <p className="text-sm text-foreground-muted text-center mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

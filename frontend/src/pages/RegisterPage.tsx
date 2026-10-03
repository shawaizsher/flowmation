import { useState, FormEvent, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Lock, Mail, RefreshCw, Sparkles, User, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthPanel, AuthHeading, AuthSubmit, rise } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { OtpBoxes } from '../components/auth/OtpBoxes';
import { authApi } from '../utils/api';
import { useStore } from '../store';

const OTP_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[a-zA-Z\s'\-]+$/;

const ART = {
  form: { eyebrow: 'create account', title: 'Automate your first workflow in minutes.', sub: 'Drag, connect and deploy. No code needed.' },
  otp: { eyebrow: 'verify email', title: 'One quick check, then you are in.', sub: 'We sent a 6-digit code to confirm it is really you.' },
  experience: { eyebrow: 'almost there', title: 'Let us tailor your first steps.', sub: 'Tell us how familiar you are with automation tools.' },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const setShowTutorial = useStore((s) => s.setShowTutorial);

  // Registration form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState({ firstName: false, lastName: false, email: false, password: false });

  // Step state: form → otp → experience
  const [step, setStep] = useState<'form' | 'otp' | 'experience'>('form');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError] = useState('');

  // Pending auth data — held until experience is selected
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any; workspaces: any[] } | null>(null);

  /* ── Validators ── */
  const validateName = (label: string) => (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return `${label} is required.`;
    if (trimmed.length < 2) return 'Must be at least 2 characters.';
    if (trimmed.length > 40) return 'Must be 40 characters or fewer.';
    if (!NAME_PATTERN.test(trimmed)) return 'Only letters, hyphens, or apostrophes allowed.';
    return '';
  };
  const validateFirstName = validateName('First name');
  const validateLastName = validateName('Last name');

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
    const lastNameError = validateLastName(lastName);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setShowErrors(true);
    setTouched({ firstName: true, lastName: true, email: true, password: true });

    if (firstNameError || lastNameError || emailError || passwordError) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedName = `${firstName.trim()} ${lastName.trim()}`;
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
    if (char && next.every((d) => d !== '') && idx === OTP_LENGTH - 1) submitOtp(next.join(''));
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

  const firstNameError = validateFirstName(firstName);
  const lastNameError = validateLastName(lastName);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const showFirstNameError = (showErrors || touched.firstName) && firstNameError;
  const showLastNameError = (showErrors || touched.lastName) && lastNameError;
  const showEmailError = (showErrors || touched.email) && emailError;
  const showPasswordError = (showErrors || touched.password) && passwordError;

  return (
    <AuthShell art={ART[step]}>
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <AuthPanel key="form">
            <AuthHeading eyebrow="sign up" title="Create your account" sub="Start building workflows in seconds." />

            <form onSubmit={handleSubmit} noValidate className="au-form">
              <div className="au-row2">
                <AuthField
                  id="reg-first"
                  label="First name"
                  icon={User}
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                  autoComplete="given-name"
                  error={showFirstNameError}
                />
                <AuthField
                  id="reg-last"
                  label="Last name"
                  icon={User}
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                  autoComplete="family-name"
                  error={showLastNameError}
                />
              </div>
              <AuthField
                id="reg-email"
                label="Email"
                icon={Mail}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                autoComplete="email"
                error={showEmailError}
                hint="We'll send a 6-digit code to this email."
              />
              <AuthField
                id="reg-password"
                label="Password"
                icon={Lock}
                reveal
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                autoComplete="new-password"
                error={showPasswordError}
                hint="Use at least 8 characters."
              />
              <AuthSubmit loading={loading} loadingLabel="Creating account…">Create account</AuthSubmit>
            </form>

            <motion.p variants={rise} className="au-foot">
              Already have an account? <Link to="/login" className="au-link">Sign in</Link>
            </motion.p>
          </AuthPanel>
        )}

        {step === 'otp' && (
          <AuthPanel key="otp" className="au-center">
            <motion.div variants={rise} className="au-badge-row">
              <div className="au-icon-badge"><Mail size={26} aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading
              eyebrow="verify"
              title="Check your email"
              sub={<>We sent a 6-digit code to <span className="au-strong">{email}</span></>}
            />

            <OtpBoxes
              digits={digits}
              inputRefs={inputRefs}
              onChange={handleDigitChange}
              onKeyDown={handleDigitKeyDown}
              onPaste={handlePaste}
              disabled={verifying}
              invalid={Boolean(otpError)}
            />

            <motion.div variants={rise} aria-live="polite">
              {otpError ? <p className="au-error" role="alert">{otpError}</p> : <p className="au-hint" style={{ marginTop: 0 }}>Enter all 6 digits to continue. The code expires in 15 minutes.</p>}
            </motion.div>

            <motion.div variants={rise}>
              <button
                type="button"
                onClick={() => submitOtp(digits.join(''))}
                disabled={digits.some((d) => !d) || verifying}
                className="au-submit"
              >
                <span className="au-submit__label">
                  {verifying ? (<><span className="au-spinner" aria-hidden="true" />Verifying…</>) : (<><CheckCircle2 size={17} aria-hidden="true" />Verify email</>)}
                </span>
              </button>
            </motion.div>

            <motion.div variants={rise} className="au-stack">
              <button type="button" onClick={handleResend} disabled={resending} className="au-ghost">
                <RefreshCw size={14} aria-hidden="true" className={resending ? 'au-spin-icon' : ''} />
                {resending ? 'Sending…' : 'Resend code'}
              </button>
              <div className="au-divider">
                <button
                  type="button"
                  className="au-ghost au-ghost--muted"
                  onClick={() => { setStep('form'); setDigits(Array(OTP_LENGTH).fill('')); setOtpError(''); }}
                >
                  <ArrowLeft size={14} aria-hidden="true" /> Use a different email
                </button>
              </div>
            </motion.div>
          </AuthPanel>
        )}

        {step === 'experience' && (
          <AuthPanel key="experience" className="au-center">
            <motion.div variants={rise} className="au-badge-row">
              <div className="au-icon-badge"><Sparkles size={26} aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading
              eyebrow="welcome"
              title={`Welcome, ${pendingAuth?.user?.name?.split(' ')[0] ?? 'there'}!`}
              sub={<>Have you used workflow automation tools before? <span className="au-mono">(Zapier, Make, n8n)</span></>}
            />

            <motion.div variants={rise} className="au-choices">
              <button type="button" onClick={() => handleExperienceSelect(false)} className="au-choice">
                <span className="au-choice__icon"><Zap size={20} aria-hidden="true" /></span>
                <span>
                  <span className="au-choice__title">Yes, I'm familiar</span>
                  <span className="au-choice__desc">I've used tools like this before — take me straight to the canvas.</span>
                </span>
              </button>
              <button type="button" onClick={() => handleExperienceSelect(true)} className="au-choice">
                <span className="au-choice__icon"><Sparkles size={20} aria-hidden="true" /></span>
                <span>
                  <span className="au-choice__title">No, I'm new to this</span>
                  <span className="au-choice__desc">Show me a quick tour so I can get started confidently.</span>
                </span>
              </button>
            </motion.div>
          </AuthPanel>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

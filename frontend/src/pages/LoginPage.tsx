import { useState, FormEvent, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import FlowaLogo from '../components/FlowaLogo';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

const OTP_LENGTH = 6;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const requestLoginOtp = async (mode: 'submit' | 'resend') => {
    if (!email || !password) {
      toast.error('Fill in all fields');
      return;
    }

    if (mode === 'submit') {
      setLoading(true);
    } else {
      setResending(true);
    }

    try {
      const { data } = await authApi.login(email, password);
      if (data.loginOtpRequired) {
        setStep('otp');
        setDigits(Array(OTP_LENGTH).fill(''));
        toast.success('A 6-digit login code was sent to your email.');
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }
      if (data.token && data.user) {
        setAuth(data.token, data.user, data.workspaces || []);
        toast.success(`Welcome back, ${data.user.name}!`);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Login failed';
      toast.error(msg);
    } finally {
      if (mode === 'submit') {
        setLoading(false);
      } else {
        setResending(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await requestLoginOtp('submit');
  };

  const focusBox = (idx: number) => inputRefs.current[idx]?.focus();

  const handleDigitChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < OTP_LENGTH - 1) focusBox(idx + 1);
    if (char && next.every((d) => d !== '') && idx === OTP_LENGTH - 1) submitOtp(next.join(''));
  };

  const handleDigitKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        next[idx - 1] = '';
        setDigits(next);
        focusBox(idx - 1);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusBox(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      focusBox(idx + 1);
    } else if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === OTP_LENGTH) submitOtp(code);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  };

  const submitOtp = async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    try {
      const { data } = await authApi.verifyLoginOtp(email, code);
      setAuth(data.token, data.user, data.workspaces || []);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Invalid code';
      toast.error(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => focusBox(0), 80);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    await requestLoginOtp('resend');
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 relative">
      {/* Back to home */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Home</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <FlowaLogo size={36} />
          <span className="font-display text-2xl font-bold text-foreground tracking-tight">Flowa</span>
        </div>

        {/* Card */}
        <div className="card p-8">
          {step === 'otp' ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                <Mail size={28} className="text-brand-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-foreground-muted mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-semibold text-foreground mb-6">{email}</p>

              <div className="flex items-center gap-2.5 mb-3">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    autoFocus={i === 0}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-lg border-2 bg-surface-input text-foreground outline-none transition-all duration-150
                      ${d ? 'border-brand-500 bg-brand-500/5' : 'border-surface-border'}
                      focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`}
                    style={{ height: '52px' }}
                    disabled={verifying}
                  />
                ))}
              </div>

              <button
                onClick={() => submitOtp(digits.join(''))}
                disabled={digits.some((d) => !d) || verifying}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Verify code
                  </>
                )}
              </button>

              <p className="text-xs text-foreground-muted mb-3">Code expires in 15 minutes.</p>

              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending...' : 'Resend code'}
              </button>

              <div className="mt-6 pt-4 border-t border-surface-border w-full">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-foreground-muted hover:text-foreground transition"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-foreground-muted text-center mb-6">
                Sign in to your account
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Email</label>
                  <input
                    type="email"
                    className="input-field w-full"
                    placeholder="admin@flowa.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input-field w-full pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-foreground-muted hover:text-brand-500 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>

              <p className="text-sm text-foreground-muted text-center mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-brand-500 hover:text-brand-400 font-medium">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

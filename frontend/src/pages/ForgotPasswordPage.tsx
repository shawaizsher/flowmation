import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react';
import FluxionLogo from '../components/FluxionLogo';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';

const OTP_LENGTH = 6;

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (idx: number) => inputRefs.current[idx]?.focus();

  /* ── Step 1: Send reset email ── */
  const handleSendCode = async () => {
    if (!email) return toast.error('Enter your email address');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      toast.success('Reset code sent! Check your inbox.');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: OTP input ── */
  const handleDigitChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < OTP_LENGTH - 1) focusBox(idx + 1);
    if (char && next.every(d => d !== '') && idx === OTP_LENGTH - 1) {
      setStep('password');
    }
  };

  const handleDigitKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) { next[idx] = ''; setDigits(next); }
      else if (idx > 0) { next[idx - 1] = ''; setDigits(next); focusBox(idx - 1); }
    } else if (e.key === 'ArrowLeft' && idx > 0) focusBox(idx - 1);
    else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) focusBox(idx + 1);
    else if (e.key === 'Enter' && digits.every(d => d)) setStep('password');
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) setStep('password');
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.forgotPassword(email);
      toast.success('New code sent!');
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => focusBox(0), 80);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  /* ── Step 3: Set new password ── */
  const handleResetPassword = async () => {
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authApi.resetPassword(email, digits.join(''), newPassword);
      setStep('done');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to reset password';
      toast.error(msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setStep('otp');
        setDigits(Array(OTP_LENGTH).fill(''));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 relative">
      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Back to login</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <FluxionLogo size={36} />
          <span className="font-body text-2xl font-bold text-foreground tracking-tight">Fluxion</span>
        </div>

        <div className="card p-8">

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <div>
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4 mx-auto">
                <Mail size={28} className="text-brand-500" />
              </div>
              <h2 className="font-body text-xl font-bold text-foreground text-center mb-2">Forgot your password?</h2>
              <p className="text-sm text-foreground-muted text-center mb-6">
                Enter your email and we'll send you a 6-digit reset code.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Email</label>
                  <input
                    type="email"
                    className="input-field w-full"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send Reset Code'}
                </button>
              </div>
              <p className="text-sm text-foreground-muted text-center mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                <Mail size={28} className="text-brand-500" />
              </div>
              <h2 className="font-body text-xl font-bold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-foreground-muted mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-semibold text-foreground mb-6">{email}</p>

              <div className="flex items-center gap-2.5 mb-6">
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
                    className={`w-11 text-center text-xl font-bold rounded-lg border-2 bg-surface-input text-foreground outline-none transition-all duration-150
                      ${d ? 'border-brand-500 bg-brand-500/5' : 'border-surface-border'}
                      focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`}
                    style={{ height: '52px' }}
                  />
                ))}
              </div>

              <button
                onClick={() => setStep('password')}
                disabled={!digits.every(d => d)}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm mb-4 disabled:opacity-50"
              >
                Continue
              </button>

              <p className="text-xs text-foreground-muted mb-3">Code expires in 15 minutes. Check your spam folder.</p>

              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          )}

          {/* ── Step 3: New password ── */}
          {step === 'password' && (
            <div>
              <h2 className="font-body text-xl font-bold text-foreground text-center mb-2">Set new password</h2>
              <p className="text-sm text-foreground-muted text-center mb-6">Choose a strong password for your account.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input-field w-full pr-10"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary" tabIndex={-1}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      className="input-field w-full pr-10"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary" tabIndex={-1}>
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Resetting…</>
                    : 'Reset Password'
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <h2 className="font-body text-xl font-bold text-foreground mb-2">Password reset!</h2>
              <p className="text-sm text-foreground-muted mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

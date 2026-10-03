import { useState, useRef, FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthPanel, AuthHeading, AuthSubmit, rise } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { OtpBoxes } from '../components/auth/OtpBoxes';
import { authApi } from '../utils/api';

const OTP_LENGTH = 6;

type Step = 'email' | 'otp' | 'password' | 'done';

const ART: Record<Step, { eyebrow: string; title: string; sub: string }> = {
  email: { eyebrow: 'account recovery', title: 'Locked out? Back in a minute.', sub: 'Reset your password with a 6-digit code.' },
  otp: { eyebrow: 'check your inbox', title: 'Code on its way.', sub: 'It expires in 15 minutes, so use it soon.' },
  password: { eyebrow: 'almost done', title: 'Choose a strong new password.', sub: 'At least 8 characters. Make it one you will remember.' },
  done: { eyebrow: 'all set', title: 'Password updated.', sub: 'Sign in and get back to your workflows.' },
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (idx: number) => inputRefs.current[idx]?.focus();

  /* ── Step 1: Send reset email ── */
  const handleSendCode = async (e?: FormEvent) => {
    e?.preventDefault();
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
    if (char && next.every((d) => d !== '') && idx === OTP_LENGTH - 1) {
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
    else if (e.key === 'Enter' && digits.every((d) => d)) setStep('password');
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
  const handleResetPassword = async (e?: FormEvent) => {
    e?.preventDefault();
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

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match.' : false;

  return (
    <AuthShell art={ART[step]} backTo="/login" backLabel="Back to login">
      <AnimatePresence mode="wait">
        {step === 'email' && (
          <AuthPanel key="email">
            <AuthHeading eyebrow="reset password" title="Forgot your password?" sub="Enter your email and we'll send you a 6-digit reset code." />
            <form onSubmit={handleSendCode} noValidate className="au-form">
              <AuthField
                id="fp-email"
                label="Email"
                icon={Mail}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
              <AuthSubmit loading={loading} loadingLabel="Sending…" disabled={!email}>Send reset code</AuthSubmit>
            </form>
            <motion.p variants={rise} className="au-foot">
              Remember your password? <Link to="/login" className="au-link">Sign in</Link>
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
            />
            <motion.p variants={rise} className="au-hint" style={{ marginTop: 0 }}>
              Code expires in 15 minutes. Check your spam folder.
            </motion.p>
            <motion.div variants={rise}>
              <button type="button" onClick={() => setStep('password')} disabled={!digits.every((d) => d)} className="au-submit">
                <span className="au-submit__label">Continue</span>
              </button>
            </motion.div>
            <motion.div variants={rise} className="au-stack">
              <button type="button" onClick={handleResend} disabled={resending} className="au-ghost">
                <RefreshCw size={14} aria-hidden="true" className={resending ? 'au-spin-icon' : ''} />
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </motion.div>
          </AuthPanel>
        )}

        {step === 'password' && (
          <AuthPanel key="password">
            <AuthHeading eyebrow="new password" title="Set new password" sub="Choose a strong password for your account." />
            <form onSubmit={handleResetPassword} noValidate className="au-form">
              <AuthField
                id="fp-new"
                label="New password"
                icon={Lock}
                reveal
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <AuthField
                id="fp-confirm"
                label="Confirm password"
                icon={KeyRound}
                reveal
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                error={mismatch}
              />
              <AuthSubmit loading={loading} loadingLabel="Resetting…" disabled={!newPassword || !confirmPassword}>Reset password</AuthSubmit>
            </form>
            <motion.div variants={rise} className="au-stack">
              <button type="button" className="au-ghost au-ghost--muted" onClick={() => setStep('otp')}>
                <ArrowLeft size={14} aria-hidden="true" /> Back to code
              </button>
            </motion.div>
          </AuthPanel>
        )}

        {step === 'done' && (
          <AuthPanel key="done" className="au-center">
            <motion.div variants={rise} className="au-badge-row">
              <div className="au-icon-badge au-icon-badge--ok"><CheckCircle2 size={28} aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading eyebrow="done" title="Password reset!" sub="Your password has been updated. You can now sign in with your new password." />
            <motion.div variants={rise}>
              <button type="button" onClick={() => navigate('/login')} className="au-submit">
                <span className="au-submit__label">Sign in</span>
              </button>
            </motion.div>
          </AuthPanel>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

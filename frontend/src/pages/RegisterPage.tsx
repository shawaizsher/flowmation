import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return toast.error('Fill in required fields');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const { data } = await authApi.register({
        name: fullName,
        email,
        password,
      });

      if (data.emailVerificationRequired) {
        setEmailSent(true);
        toast.success('Check your email for a verification link!');
      } else {
        // Fallback in case verification is disabled
        setAuth(data.token, data.user, data.workspace ?? { id: '', name: '', slug: '', role: '' });
        toast.success('Account created!');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success('Verification email resent!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Failed to resend';
      toast.error(msg);
    } finally {
      setResending(false);
    }
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
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground tracking-tight">Flowa</span>
        </div>

        {/* Card */}
        <div className="card p-8">
          {emailSent ? (
            /* ── Email sent confirmation ── */
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                <Mail size={32} className="text-brand-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-foreground-muted mb-2">
                We sent a verification link to
              </p>
              <p className="text-sm font-semibold text-foreground mb-6">{email}</p>
              <p className="text-xs text-foreground-muted mb-6 max-w-xs">
                Click the link in the email to verify your account. The link expires in 24 hours.
              </p>
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
              <div className="mt-6 pt-4 border-t border-surface-border w-full">
                <Link
                  to="/login"
                  className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* ── Registration form ── */
            <>
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">
            Create your account
          </h2>
          <p className="text-sm text-foreground-muted text-center mb-6">
            Start building workflows in seconds
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Full Name *</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Email *</label>
              <input
                type="email"
                className="input-field w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                Workspace Name <span className="text-foreground-muted">(optional)</span>
              </label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="My Team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-foreground-muted text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

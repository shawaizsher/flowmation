import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import FlowaLogo from '../components/FlowaLogo';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

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

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const showEmailError = (showErrors || touched.email) && emailError;
  const showPasswordError = (showErrors || touched.password) && passwordError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setTouched({ email: true, password: true });

    if (emailError || passwordError) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim(), password);
      setAuth(data.token, data.user, data.workspaces || []);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
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
          <FlowaLogo size={36} />
          <span className="font-display text-2xl font-bold text-foreground tracking-tight">Flowa</span>
        </div>

        {/* Card */}
        <div className="card p-8">
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
                className={`input-field w-full ${showEmailError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                placeholder="admin@flowa.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                autoComplete="email"
                aria-invalid={Boolean(showEmailError)}
              />
              {showEmailError ? (
                <p className="mt-1 text-xs text-red-400">{emailError}</p>
              ) : (
                <p className="mt-1 text-xs text-foreground-muted">Use the email you registered with.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input-field w-full pr-10 ${showPasswordError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  autoComplete="current-password"
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
                <p className="mt-1 text-xs text-foreground-muted">Password must be at least 8 characters.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
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
        </div>
      </div>
    </div>
  );
}

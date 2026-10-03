import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthPanel, AuthHeading, AuthSubmit, rise } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { authApi } from '../utils/api';
import { useStore } from '../store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <AuthShell>
      <AuthPanel>
        <AuthHeading eyebrow="sign in" title="Welcome back" sub="Sign in to continue to your workspace." />

        <form onSubmit={handleSubmit} noValidate className="au-form">
          <AuthField
            id="login-email"
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            autoComplete="email"
            error={showEmailError}
          />
          <AuthField
            id="login-password"
            label="Password"
            icon={Lock}
            reveal
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
            autoComplete="current-password"
            error={showPasswordError}
            labelAside={<Link to="/forgot-password" className="au-link au-link--sm">Forgot password?</Link>}
          />
          <AuthSubmit loading={loading} loadingLabel="Signing in…">Sign in</AuthSubmit>
        </form>

        <motion.p variants={rise} className="au-foot">
          New to Flowmation? <Link to="/register" className="au-link">Create an account</Link>
        </motion.p>
      </AuthPanel>
    </AuthShell>
  );
}

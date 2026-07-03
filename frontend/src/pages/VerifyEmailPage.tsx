import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import FluxionLogo from '../components/FluxionLogo';
import BanterLoader from '../components/BanterLoader';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the URL.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(({ data }) => {
        setStatus('success');
        // Auto-login: set auth state
        if (data.token && data.user) {
          const workspaces = data.workspaces || (data.workspace ? [data.workspace] : []);
          setAuth(
            data.token,
            data.user,
            workspaces
          );
          toast.success('Email verified! Redirecting…');
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(
          err.response?.data?.error || 'Verification failed. The link may be expired or invalid.'
        );
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 relative">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors duration-200 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Home</span>
      </Link>

      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <FluxionLogo size={36} />
          <span className="font-display text-2xl font-bold text-foreground tracking-tight">Fluxion</span>
        </div>

        <div className="card p-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-6 py-2">
              <BanterLoader label="Verifying your email…" />
              <p className="text-sm text-foreground-muted">Please wait while we confirm your address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Email Verified!</h2>
              <p className="text-sm text-foreground-muted">
                Your account is now active. Redirecting to dashboard…
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle size={36} className="text-red-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Verification Failed</h2>
              <p className="text-sm text-foreground-muted">{errorMsg}</p>
              <div className="flex gap-3 mt-2">
                <Link
                  to="/login"
                  className="btn-primary !py-2.5 !px-5 !text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="border border-surface-border rounded-lg px-5 py-2.5 text-sm text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition"
                >
                  Register Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

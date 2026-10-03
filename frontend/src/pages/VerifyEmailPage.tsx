import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthPanel, AuthHeading, rise } from '../components/auth/AuthShell';
import { authApi } from '../utils/api';
import { useStore } from '../store';

type Status = 'loading' | 'success' | 'error';

const ART: Record<Status, { eyebrow: string; title: string; sub: string }> = {
  loading: { eyebrow: 'verifying', title: 'Confirming your email.', sub: 'This only takes a moment.' },
  success: { eyebrow: 'verified', title: 'You are all set.', sub: 'Taking you to your dashboard.' },
  error: { eyebrow: 'link problem', title: 'That link did not work.', sub: 'It may be expired or already used.' },
};

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
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
          setAuth(data.token, data.user, workspaces);
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
    <AuthShell art={ART[status]}>
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <AuthPanel key="loading" className="au-center">
            <motion.div variants={rise} className="au-badge-row" role="status" aria-label="Verifying your email">
              <div className="au-icon-badge"><span className="au-spinner" aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading eyebrow="verifying" title="Verifying your email…" sub="Please wait while we confirm your address." />
          </AuthPanel>
        )}

        {status === 'success' && (
          <AuthPanel key="success" className="au-center">
            <motion.div variants={rise} className="au-badge-row">
              <div className="au-icon-badge au-icon-badge--ok"><CheckCircle2 size={28} aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading eyebrow="verified" title="Email verified!" sub="Your account is now active. Redirecting to dashboard…" />
          </AuthPanel>
        )}

        {status === 'error' && (
          <AuthPanel key="error" className="au-center">
            <motion.div variants={rise} className="au-badge-row">
              <div className="au-icon-badge au-icon-badge--bad"><XCircle size={28} aria-hidden="true" /></div>
            </motion.div>
            <AuthHeading eyebrow="error" title="Verification failed" sub={errorMsg} />
            <motion.div variants={rise} className="au-stack">
              <Link to="/login" className="au-submit" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
                <span className="au-submit__label">Sign in</span>
              </Link>
              <Link to="/register" className="au-ghost au-ghost--muted" style={{ textDecoration: 'none' }}>Register again</Link>
            </motion.div>
          </AuthPanel>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

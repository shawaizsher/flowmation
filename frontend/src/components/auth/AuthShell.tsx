import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import FluxionLogo from '../FluxionLogo';
import AuthArt from './AuthArt';
import '../../pages/auth.css';

const EASE = [0.16, 1, 0.3, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

interface AuthShellProps {
  art?: { eyebrow?: string; title?: string; sub?: string };
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}

export function AuthShell({ art, backTo = '/', backLabel = 'Home', children }: AuthShellProps) {
  return (
    <div className="au-root">
      <AuthArt {...art} />
      <main className="au-main">
        <div className="au-main__glow" aria-hidden="true" />
        <Link to={backTo} className="au-back">
          <ArrowLeft size={16} aria-hidden="true" className="au-back__icon" />
          {backLabel}
        </Link>
        <div className="au-card">
          <div className="au-card__brand">
            <FluxionLogo size={36} />
            <span>Flowmation</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** One animated step. Render as a direct child of <AnimatePresence mode="wait"> with a unique key. */
export function AuthPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`au-panel ${className}`.trim()}
      variants={stagger}
      initial={reduced ? 'show' : 'hidden'}
      animate="show"
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
    >
      {children}
    </motion.div>
  );
}

export function AuthHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: ReactNode }) {
  return (
    <motion.div variants={rise}>
      <p className="au-eyebrow au-mono">// {eyebrow}</p>
      <h1 className="au-title">{title}</h1>
      {sub && <p className="au-sub">{sub}</p>}
    </motion.div>
  );
}

export function AuthSubmit({
  loading,
  loadingLabel,
  disabled,
  children,
  icon = true,
}: {
  loading?: boolean;
  loadingLabel: string;
  disabled?: boolean;
  children: ReactNode;
  icon?: boolean;
}) {
  return (
    <motion.div variants={rise}>
      <button type="submit" disabled={loading || disabled} className="au-submit">
        <span className="au-submit__label">
          {loading ? (
            <>
              <span className="au-spinner" aria-hidden="true" />
              {loadingLabel}
            </>
          ) : (
            <>
              {children}
              {icon && <ArrowRight size={17} aria-hidden="true" className="au-submit__arrow" />}
            </>
          )}
        </span>
      </button>
    </motion.div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { rise } from './AuthShell';

const EASE = [0.16, 1, 0.3, 1] as const;

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string | false;
  hint?: string;
  labelAside?: ReactNode;
  /** Adds a show/hide toggle; the field then manages its own input type. */
  reveal?: boolean;
}

export function AuthField({ id, label, icon: Icon, error, hint, labelAside, reveal, className, ...input }: AuthFieldProps) {
  const [shown, setShown] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <motion.div variants={rise} className="au-field">
      <div className="au-label-row">
        <label htmlFor={id} className="au-label">{label}</label>
        {labelAside}
      </div>
      <div className={`au-input-wrap${error ? ' au-input-wrap--error' : ''}`}>
        <Icon size={16} className="au-input-icon" aria-hidden="true" />
        <input
          {...input}
          id={id}
          type={reveal ? (shown ? 'text' : 'password') : input.type}
          className={`au-input${reveal ? ' au-input--pw' : ''}${className ? ` ${className}` : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {reveal && (
          <button
            type="button"
            className="au-eye"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
          >
            {shown ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="err"
            id={errorId}
            role="alert"
            className="au-error"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={hintId} className="au-hint">{hint}</p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

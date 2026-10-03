import { motion } from 'framer-motion';
import type { ClipboardEvent, KeyboardEvent, MutableRefObject } from 'react';
import { rise } from './AuthShell';

interface OtpBoxesProps {
  digits: string[];
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (idx: number, value: string) => void;
  onKeyDown: (idx: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function OtpBoxes({ digits, inputRefs, onChange, onKeyDown, onPaste, disabled, invalid }: OtpBoxesProps) {
  return (
    <motion.div variants={rise} className="au-otp" role="group" aria-label="6-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          autoFocus={i === 0}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${digits.length}`}
          aria-invalid={invalid}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={i === 0 ? onPaste : undefined}
          className={`au-otp__box${d ? ' au-otp__box--filled' : ''}${invalid ? ' au-otp__box--error' : ''}`}
        />
      ))}
    </motion.div>
  );
}

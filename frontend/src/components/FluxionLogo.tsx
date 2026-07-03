/**
 * Fluxion brand logo — matches favicon.svg exactly.
 * Glassy violet badge with an infinity-flow loop mark: white input node,
 * cyan "charged" output node — literalizes flux (flow) + ion (charge).
 */
export default function FluxionLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="fx-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="fx-mark" x1="9" y1="27" x2="31" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="fx-sheen" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="fx-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#fx-bg)" />
      <rect width="40" height="40" rx="11" fill="url(#fx-sheen)" />
      <g filter="url(#fx-glow)">
        <path
          d="M9 20 C9 13 17 13 20 20 C23 27 31 27 31 20"
          stroke="url(#fx-mark)"
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <circle cx="9" cy="20" r="2.6" fill="#ffffff" />
      <circle cx="31" cy="20" r="2.6" fill="#22D3EE" />
    </svg>
  );
}

/**
 * Flowmation brand logo — maroon badge with a node-flow "F" glyph
 * (three connected workflow nodes tracing the letter F).
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
          <stop offset="0%" stopColor="#D45060" />
          <stop offset="55%" stopColor="#800020" />
          <stop offset="100%" stopColor="#3a000e" />
        </linearGradient>
        <linearGradient id="fx-mark" x1="10" y1="31" x2="30" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF9F2" />
          <stop offset="55%" stopColor="#F3E6D5" />
          <stop offset="100%" stopColor="#D45060" />
        </linearGradient>
        <linearGradient id="fx-sheen" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="fx-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="40" height="40" rx="11" fill="url(#fx-bg)" />
      <rect width="40" height="40" rx="11" fill="url(#fx-sheen)" />

      {/* Node-flow "F": a workflow stem with two branches, echoing connected canvas nodes */}
      <g filter="url(#fx-glow)" stroke="url(#fx-mark)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M13 31 V9 H28" />
        <path d="M13 19 H24" />
      </g>

      <circle cx="13" cy="9" r="2.3" fill="#FFF9F2" />
      <circle cx="24" cy="19" r="2.1" fill="#D45060" />
      <circle cx="13" cy="31" r="2.3" fill="#F3E6D5" />
      <circle cx="28" cy="9" r="2.1" fill="#D45060" />
    </svg>
  );
}

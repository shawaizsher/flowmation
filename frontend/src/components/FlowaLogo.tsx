/**
 * Flowa brand logo — matches favicon.svg exactly.
 * Red rounded-rect with three staggered lines + circle.
 */
export default function FlowaLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#F63049" />
      <path
        d="M8 10h16M8 16h12M8 22h8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="22" r="3" fill="white" />
    </svg>
  );
}

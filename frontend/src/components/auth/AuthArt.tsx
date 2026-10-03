import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FluxionLogo from '../FluxionLogo';

const ROSE = '#D45060';
const BEIGE = '#F3E6D5';
const MAROON = '#800020';

const EDGES = [
  'M150 95 C 200 95, 200 205, 250 205',
  'M330 205 C 380 205, 380 95, 430 95',
  'M330 205 C 380 205, 380 315, 430 315',
];

const NODES = [
  { x: 40, y: 70, w: 110, label: 'WEBHOOK', sub: 'new sign-up' },
  { x: 250, y: 175, w: 80, label: 'AI.STEP', sub: 'classify', hero: true },
  { x: 430, y: 70, w: 110, label: 'SLACK', sub: '#sales' },
  { x: 430, y: 290, w: 110, label: 'SHEETS', sub: 'append row' },
];

const CHIPS = [
  { text: 'run #4821 ✓ 142ms', cls: 'au-chip--a' },
  { text: 'ai.debug() · 3 fixes', cls: 'au-chip--b' },
];

interface AuthArtProps {
  eyebrow?: string;
  title?: string;
  sub?: string;
}

export default function AuthArt({
  eyebrow = 'welcome back',
  title = 'Pick up right where you left off.',
  sub = 'Build, debug and ship automations from one canvas.',
}: AuthArtProps) {
  const reduced = useReducedMotion();

  return (
    <aside className="au-art" aria-hidden="true">
      <div className="au-art__grid" />
      <div className="au-art__glow" />

      <div className="au-art__top">
        <Link to="/" className="au-brand" tabIndex={-1}>
          <FluxionLogo size={30} />
          <span>Flowmation</span>
        </Link>
      </div>

      <div className="au-art__stage">
        <motion.svg
          viewBox="0 0 580 400"
          className="au-art__svg"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <defs>
            <pattern id="au-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill={BEIGE} opacity="0.1" />
            </pattern>
            <linearGradient id="au-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ROSE} stopOpacity="0.2" />
              <stop offset="100%" stopColor={ROSE} stopOpacity="0.7" />
            </linearGradient>
            <radialGradient id="au-hero" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ROSE} stopOpacity="0.55" />
              <stop offset="100%" stopColor={MAROON} stopOpacity="0.15" />
            </radialGradient>
          </defs>

          <rect x="1" y="1" width="578" height="398" rx="22" fill="rgba(10,0,3,0.55)" stroke={ROSE} strokeOpacity="0.2" />
          <rect x="1" y="1" width="578" height="398" rx="22" fill="url(#au-dots)" />

          {EDGES.map((d, i) => (
            <g key={d}>
              <path d={d} fill="none" stroke="url(#au-edge)" strokeWidth="2.5" strokeLinecap="round" />
              {!reduced && (
                <circle r="4.5" fill={BEIGE}>
                  <animateMotion dur="3.2s" begin={`${i * 0.8}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
                </circle>
              )}
            </g>
          ))}

          {NODES.map((n, i) => (
            <motion.g
              key={n.label}
              initial={reduced ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              {n.hero && (
                <>
                  <circle cx={n.x + n.w / 2} cy={n.y + 30} r="58" fill="url(#au-hero)" className="au-pulse" />
                  <circle cx={n.x + n.w / 2} cy={n.y + 30} r="46" fill="none" stroke={ROSE} strokeOpacity="0.45" strokeDasharray="3 6" className="au-spin" />
                </>
              )}
              <rect x={n.x} y={n.y} width={n.w} height="60" rx="13" fill={n.hero ? 'rgba(128,0,32,0.75)' : 'rgba(30,0,10,0.92)'} stroke={ROSE} strokeOpacity={n.hero ? 0.9 : 0.45} />
              <circle cx={n.x + 17} cy={n.y + 22} r="5" fill={n.hero ? BEIGE : ROSE} />
              <text x={n.x + 30} y={n.y + 26} fill="#FFF9F2" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1">{n.label}</text>
              <text x={n.x + 14} y={n.y + 46} fill={BEIGE} fillOpacity="0.6" fontSize="10" fontFamily="JetBrains Mono, monospace">{n.sub}</text>
            </motion.g>
          ))}
        </motion.svg>

        {CHIPS.map((c) => (
          <div key={c.text} className={`au-chip au-mono ${c.cls}`}>
            <span className="au-chip__dot" />
            {c.text}
          </div>
        ))}
      </div>

      <div className="au-art__copy">
        <p className="au-eyebrow au-mono">// {eyebrow}</p>
        <h2 className="au-art__title">{title}</h2>
        <p className="au-art__sub">{sub}</p>
      </div>
    </aside>
  );
}

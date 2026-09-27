const ROSE = '#D45060';
const BEIGE = '#F3E6D5';
const MAROON = '#800020';

function DotGrid({ id }: { id: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={BEIGE} opacity="0.12" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
    </>
  );
}

export function CanvasIllustration() {
  return (
    <svg viewBox="0 0 400 300" className="fx-ill" role="img" aria-label="Visual canvas with connected workflow nodes">
      <DotGrid id="g-canvas" />
      <path className="fx-ill__dash" d="M110 90 C 170 90, 170 150, 220 150" stroke={ROSE} strokeWidth="2" fill="none" />
      <path className="fx-ill__dash" d="M110 210 C 170 210, 170 150, 220 150" stroke={ROSE} strokeWidth="2" fill="none" />
      <path className="fx-ill__dash" d="M300 150 L 340 150" stroke={ROSE} strokeWidth="2" fill="none" />
      {[
        { x: 30, y: 68, label: 'TRIGGER' },
        { x: 30, y: 188, label: 'SCHEDULE' },
        { x: 220, y: 128, label: 'AI.STEP' },
      ].map((n) => (
        <g key={n.label}>
          <rect x={n.x} y={n.y} width="80" height="44" rx="8" fill="rgba(128,0,32,0.25)" stroke={ROSE} strokeOpacity="0.6" />
          <circle cx={n.x + 14} cy={n.y + 22} r="5" fill={ROSE} />
          <text x={n.x + 26} y={n.y + 26} fill={BEIGE} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{n.label}</text>
        </g>
      ))}
      <rect x="340" y="132" width="36" height="36" rx="18" fill="none" stroke={BEIGE} strokeOpacity="0.5" strokeDasharray="3 4" />
      <path d="M358 142 v16 M350 150 h16" stroke={BEIGE} strokeOpacity="0.7" strokeWidth="1.5" />
      <g className="fx-ill__cursor">
        <path d="M250 190 l0 22 l6 -6 l5 11 l4 -2 l-5 -11 l8 0 z" fill={BEIGE} />
        <rect x="266" y="210" width="44" height="16" rx="4" fill={ROSE} />
        <text x="272" y="221" fill="#1a0008" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="700">SARA</text>
      </g>
    </svg>
  );
}

export function AiIllustration() {
  const pins = [70, 100, 130, 160, 190, 220];
  return (
    <svg viewBox="0 0 400 300" className="fx-ill" role="img" aria-label="AI chip scanning and repairing a workflow">
      <DotGrid id="g-ai" />
      {pins.map((y) => (
        <g key={y}>
          <path d={`M60 ${y + 10} H 130`} stroke={ROSE} strokeOpacity="0.45" strokeWidth="1.5" />
          <path d={`M270 ${y + 10} H 340`} stroke={ROSE} strokeOpacity="0.45" strokeWidth="1.5" />
          <circle cx="60" cy={y + 10} r="3" fill={ROSE} />
          <circle cx="340" cy={y + 10} r="3" fill={ROSE} />
        </g>
      ))}
      <rect x="130" y="60" width="140" height="180" rx="14" fill="rgba(128,0,32,0.3)" stroke={ROSE} strokeWidth="1.5" />
      <rect x="150" y="80" width="100" height="140" rx="8" fill="none" stroke={BEIGE} strokeOpacity="0.25" />
      <text x="200" y="140" textAnchor="middle" fill={BEIGE} fontSize="30" fontFamily="Space Grotesk, sans-serif" fontWeight="700">AI</text>
      <text x="200" y="162" textAnchor="middle" fill={ROSE} fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="2">DEBUG.CORE</text>
      <rect className="fx-ill__scan" x="150" y="80" width="100" height="3" fill={ROSE} opacity="0.8" />
      <g transform="translate(290 36)">
        <rect width="92" height="26" rx="6" fill="#0d0003" stroke={ROSE} strokeOpacity="0.5" />
        <text x="10" y="17" fill={BEIGE} fontSize="9" fontFamily="JetBrains Mono, monospace">fixed: 3 edges</text>
      </g>
    </svg>
  );
}

export function ConnectIllustration() {
  const spokes = [
    { x: 60, y: 60, t: 'SLACK' },
    { x: 60, y: 240, t: 'STRIPE' },
    { x: 340, y: 60, t: 'GITHUB' },
    { x: 340, y: 240, t: 'OPENAI' },
    { x: 200, y: 36, t: 'SHEETS' },
    { x: 200, y: 268, t: 'POSTGRES' },
  ];
  return (
    <svg viewBox="0 0 400 300" className="fx-ill" role="img" aria-label="Hub connecting to many integrations">
      <DotGrid id="g-connect" />
      {spokes.map((s) => (
        <line key={s.t} className="fx-ill__dash" x1="200" y1="150" x2={s.x} y2={s.y} stroke={ROSE} strokeOpacity="0.55" strokeWidth="1.5" />
      ))}
      <circle cx="200" cy="150" r="46" fill="rgba(128,0,32,0.35)" stroke={ROSE} strokeWidth="1.5" />
      <circle className="fx-ill__ring" cx="200" cy="150" r="62" fill="none" stroke={BEIGE} strokeOpacity="0.25" strokeDasharray="4 6" />
      <text x="200" y="155" textAnchor="middle" fill={BEIGE} fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1">FLOW.HUB</text>
      {spokes.map((s) => (
        <g key={`${s.t}-n`}>
          <rect x={s.x - 34} y={s.y - 12} width="68" height="24" rx="12" fill="#0d0003" stroke={ROSE} strokeOpacity="0.6" />
          <text x={s.x} y={s.y + 4} textAnchor="middle" fill={BEIGE} fontSize="8.5" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{s.t}</text>
        </g>
      ))}
    </svg>
  );
}

export function DeployIllustration() {
  const lines = [
    { c: ROSE, t: '$ flow deploy onboarding' },
    { c: BEIGE, t: '  building graph ........ ok' },
    { c: BEIGE, t: '  validating 6 nodes .... ok' },
    { c: BEIGE, t: '  encrypting secrets .... ok' },
    { c: ROSE, t: '  ✓ live · webhook armed' },
  ];
  return (
    <svg viewBox="0 0 400 300" className="fx-ill" role="img" aria-label="Terminal deploying a workflow">
      <DotGrid id="g-deploy" />
      <rect x="40" y="50" width="320" height="200" rx="12" fill="#0d0003" stroke={ROSE} strokeOpacity="0.5" />
      <rect x="40" y="50" width="320" height="28" rx="12" fill={MAROON} fillOpacity="0.45" />
      {[62, 78, 94].map((x, i) => (
        <circle key={x} cx={x} cy="64" r="5" fill={i === 0 ? ROSE : BEIGE} fillOpacity={i === 0 ? 1 : 0.35} />
      ))}
      <text x="200" y="68" textAnchor="middle" fill={BEIGE} fillOpacity="0.6" fontSize="9" fontFamily="JetBrains Mono, monospace">~/flowmation</text>
      {lines.map((l, i) => (
        <text key={i} className="fx-ill__type" style={{ animationDelay: `${i * 0.35}s` }} x="60" y={108 + i * 24} fill={l.c} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
          {l.t}
        </text>
      ))}
      <rect className="fx-ill__caret" x="60" y="222" width="8" height="14" fill={ROSE} />
    </svg>
  );
}

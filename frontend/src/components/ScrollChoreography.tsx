import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '../lib/utils';

const PANELS = [
  {
    label: 'Visual Builder',
    sub: 'Drag. Drop. Deploy.',
    gradient: 'linear-gradient(135deg, #1a0008 0%, #800020 50%, #D45060 100%)',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="rgba(255,249,242,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="14" height="14" rx="3" />
        <rect x="28" y="28" width="14" height="14" rx="3" />
        <path d="M20 13h8a4 4 0 014 4v11" />
        <circle cx="13" cy="13" r="2" fill="rgba(243,230,213,0.4)" stroke="none" />
        <circle cx="35" cy="35" r="2" fill="rgba(212,80,96,0.6)" stroke="none" />
      </svg>
    ),
    dots: true,
  },
  {
    label: 'AI Debugger',
    sub: 'Describe it. We fix it.',
    gradient: 'linear-gradient(135deg, #D45060 0%, #800020 60%, #1a0008 100%)',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="rgba(255,249,242,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 6a8 8 0 018 8v2H16v-2a8 8 0 018-8z" />
        <rect x="10" y="16" width="28" height="22" rx="6" />
        <path d="M18 24h12M18 30h8" />
        <path d="M4 20h6M38 20h6M4 28h6M38 28h6" />
        <circle cx="24" cy="24" r="1.5" fill="rgba(243,230,213,0.4)" stroke="none" />
      </svg>
    ),
    dots: false,
  },
  {
    label: 'Integrations',
    sub: '50+ connectors.',
    gradient: 'linear-gradient(135deg, #800020 0%, #4a0012 50%, #1a0008 100%)',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="rgba(255,249,242,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 6L6 16l18 10 18-10L24 6z" />
        <path d="M6 32l18 10 18-10" />
        <path d="M6 24l18 10 18-10" />
      </svg>
    ),
    dots: true,
  },
  {
    label: 'Flowmation',
    sub: 'Workflows that think.',
    gradient: 'linear-gradient(135deg, #D45060 0%, #800020 40%, #4a0012 100%)',
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="rgba(255,249,242,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="28" cy="28" r="20" strokeDasharray="4 6" />
        <circle cx="28" cy="28" r="10" />
        <path d="M28 8v8M28 40v8M8 28h8M40 28h8" />
        <circle cx="28" cy="28" r="3" fill="rgba(243,230,213,0.5)" stroke="none" />
      </svg>
    ),
    dots: false,
  },
];

function GridPattern({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#FFF9F2" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function GlowOrb({ position }: { position: 'tl' | 'br' | 'center' }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: '-20%', left: '-10%', width: '60%', height: '60%' },
    br: { bottom: '-20%', right: '-10%', width: '50%', height: '50%' },
    center: { top: '20%', left: '30%', width: '40%', height: '40%' },
  };
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        ...styles[position],
        background: 'radial-gradient(circle, rgba(243,230,213,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}
    />
  );
}

export default function ScrollChoreography({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 50,
    mass: 1.2,
    restDelta: 0.001,
  });

  const xLeft = '-17vw';
  const xRight = '17vw';
  const yTop = '-13vh';
  const yBottom = '13vh';

  const tlX = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [xLeft, xLeft, xLeft, '0vw', '0vw']);
  const tlY = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [yTop, yBottom, yBottom, '0vh', '0vh']);

  const brX = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [xRight, xRight, xRight, '0vw', '0vw']);
  const brY = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [yBottom, yTop, yTop, '0vh', '0vh']);

  const blX = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [xLeft, xLeft, xLeft, '0vw', '0vw']);
  const blY = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [yBottom, yBottom, yBottom, '0vh', '0vh']);

  const trX = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [xRight, xRight, xRight, '0vw', '0vw']);
  const trY = useTransform(smoothProgress, [0, 0.3, 0.35, 0.65, 1], [yTop, yTop, yTop, '0vh', '0vh']);

  const heroWidth = useTransform(smoothProgress, [0.65, 0.7, 0.9, 1], ['30vw', '30vw', '58vw', '58vw']);
  const heroHeight = useTransform(smoothProgress, [0.65, 0.7, 0.9, 1], ['22vh', '22vh', '46vh', '46vh']);
  const underImagesOpacity = useTransform(smoothProgress, [0.75, 0.85], [1, 0]);

  const panelClasses =
    'w-[30vw] h-[22vh] overflow-hidden rounded-2xl flex flex-col items-center justify-center';

  const positions = [
    { x: tlX, y: tlY, z: 'z-10', opacity: underImagesOpacity, panel: PANELS[0] },
    { x: brX, y: brY, z: 'z-20', opacity: underImagesOpacity, panel: PANELS[2] },
    { x: blX, y: blY, z: 'z-30', opacity: underImagesOpacity, panel: PANELS[1] },
    { x: trX, y: trY, z: 'z-40', opacity: undefined, panel: PANELS[3], isHero: true },
  ];

  return (
    <div ref={containerRef} className={cn('relative h-[300vh] w-full', className)}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {positions.map(({ x, y, z, opacity, panel, isHero }, i) => (
            <motion.div
              key={i}
              style={{
                x,
                y,
                ...(opacity ? { opacity } : {}),
              }}
              className={cn('absolute will-change-transform', z)}
            >
            <motion.div
              style={{
                ...(isHero ? { width: heroWidth, height: heroHeight } : {}),
                background: panel.gradient,
              }}
              className={cn(
                panelClasses,
                isHero && 'origin-center',
                'border border-white/[0.08] shadow-[0_8px_32px_rgba(128,0,32,0.3),inset_0_1px_0_rgba(255,249,242,0.08)]'
              )}
            >
              <GridPattern show={panel.dots} />
              <GlowOrb position={i % 2 === 0 ? 'tl' : 'br'} />
              {i === 3 && <GlowOrb position="center" />}

              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="mb-1 opacity-70">
                  {panel.icon}
                </div>
                <span className="text-[#F3E6D5] text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                  {panel.label}
                </span>
                <span className="text-[#F3E6D5]/50 text-xs md:text-sm tracking-widest uppercase">
                  {panel.sub}
                </span>
              </div>

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,249,242,0.03) 0%, transparent 40%, rgba(128,0,32,0.1) 100%)',
                }}
              />
            </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Layers, Plug, Users, Zap, type LucideIcon } from 'lucide-react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

const STATS: Stat[] = [
  { value: 50, suffix: '+', label: 'Integrations', detail: 'Plus any API over HTTP', icon: Plug },
  { value: 23, suffix: '', label: 'Node categories', detail: 'AI, data, messaging, payments…', icon: Layers },
  { value: 4, suffix: '', label: 'Trigger types', detail: 'Webhook, schedule, email, manual', icon: Zap },
  { value: 4, suffix: '', label: 'Workspace roles', detail: 'Owner, Admin, Editor, Viewer', icon: Users },
];

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return; }
    const c = animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);

  return <span ref={ref}>{n}{suffix}</span>;
}

function TiltCard({ s, i }: { s: Stat; i: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });
  const glowX = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);
  const glowY = useTransform(my, [-0.5, 0.5], ['0%', '100%']);
  const Icon = s.icon;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      className="fx-tilt"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="fx-tilt__glow" style={{ left: glowX, top: glowY }} />
      <div className="fx-tilt__inner">
        <Icon className="fx-tilt__icon" size={22} strokeWidth={1.6} aria-hidden="true" />
        <div className="fx-tilt__value"><Counter to={s.value} suffix={s.suffix} /></div>
        <div className="fx-tilt__label">{s.label}</div>
        <div className="fx-mono fx-tilt__detail">{s.detail}</div>
      </div>
    </motion.div>
  );
}

export default function TiltStats() {
  return (
    <div className="fx-stats">
      {STATS.map((s, i) => <TiltCard key={s.label} s={s} i={i} />)}
    </div>
  );
}

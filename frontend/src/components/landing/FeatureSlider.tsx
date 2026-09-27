import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AiIllustration, CanvasIllustration, ConnectIllustration, DeployIllustration } from './Illustrations';

interface Feature {
  tag: string;
  title: string;
  desc: string;
  chips: string[];
  art: ReactNode;
}

const FEATURES: Feature[] = [
  {
    tag: 'BUILD',
    title: 'A canvas that thinks in flows',
    desc: 'Drag triggers, logic branches and actions onto an infinite canvas. See your teammates’ cursors live while you wire it together.',
    chips: ['Drag & drop', 'Multiplayer', 'Branching logic'],
    art: <CanvasIllustration />,
  },
  {
    tag: 'DEBUG',
    title: 'AI that fixes what breaks',
    desc: 'Describe the outcome in plain English. Flowmation’s AI generates nodes, spots broken edges and repairs failed runs for you.',
    chips: ['Plain-English prompts', 'Auto-repair', 'Run diagnostics'],
    art: <AiIllustration />,
  },
  {
    tag: 'CONNECT',
    title: '50+ tools, one hub',
    desc: 'Slack, GitHub, Stripe, OpenAI, Postgres and more — or any API via HTTP and webhook nodes. Credentials are AES-256 encrypted at rest.',
    chips: ['50+ connectors', 'HTTP & webhooks', 'Encrypted secrets'],
    art: <ConnectIllustration />,
  },
  {
    tag: 'DEPLOY',
    title: 'Ship it with one command',
    desc: 'Run on a schedule, a webhook or a click. Every execution is logged step by step, so you always know what ran and why.',
    chips: ['Schedules', 'Webhooks', 'Live execution logs'],
    art: <DeployIllustration />,
  },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function Panel({ f, i }: { f: Feature; i: number }) {
  return (
    <article className="fx-panel">
      <div className="fx-panel__copy">
        <span className="fx-mono fx-panel__tag">
          <span className="fx-panel__idx">0{i + 1}</span> // {f.tag}
        </span>
        <h3 className="fx-panel__title">{f.title}</h3>
        <p className="fx-panel__desc">{f.desc}</p>
        <ul className="fx-panel__chips">
          {f.chips.map((c) => (
            <li key={c} className="fx-mono">{c}</li>
          ))}
        </ul>
      </div>
      <div className="fx-panel__art">{f.art}</div>
    </article>
  );
}

export default function FeatureSlider() {
  const stacked = useMediaQuery('(max-width: 900px), (prefers-reduced-motion: reduce)');
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));

  useLayoutEffect(() => {
    if (stacked) return;
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
      setVh(window.innerHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [stacked]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, (p) => -p * distance);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [active, setActive] = useState(0);
  useEffect(() => scrollYProgress.on('change', (p) => setActive(Math.min(FEATURES.length - 1, Math.round(p * (FEATURES.length - 1))))), [scrollYProgress]);

  if (stacked) {
    return (
      <div className="fx-slider fx-slider--stacked">
        {FEATURES.map((f, i) => <Panel key={f.tag} f={f} i={i} />)}
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="fx-slider" style={{ height: distance + vh }}>
      <div className="fx-slider__sticky">
        <motion.div ref={trackRef} className="fx-slider__track" style={{ x }}>
          {FEATURES.map((f, i) => <Panel key={f.tag} f={f} i={i} />)}
        </motion.div>
        <div className="fx-slider__hud">
          <span className="fx-mono">{String(active + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}</span>
          <div className="fx-slider__bar"><motion.div className="fx-slider__bar-fill" style={{ scaleX: bar }} /></div>
          <span className="fx-mono">{FEATURES[active].tag}</span>
        </div>
      </div>
    </div>
  );
}

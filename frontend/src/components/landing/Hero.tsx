import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';

const HeroScene = lazy(() => import('./HeroScene'));

const EASE = [0.16, 1, 0.3, 1] as const;

const lineVariants: Variants = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: '0%', transition: { duration: 0.9, delay: 0.25 + i * 0.12, ease: EASE } }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (d: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: EASE } }),
};

const CHIPS = [
  { text: 'trigger: webhook', pos: 'fx-chip--a', d: 1.1 },
  { text: 'ai.debug() ✓ 3 fixes', pos: 'fx-chip--b', d: 1.3 },
  { text: 'slack.send → #ops', pos: 'fx-chip--c', d: 1.5 },
];

const HEADLINE: { text: string; accent?: boolean }[] = [
  { text: 'Automate' },
  { text: 'anything.', accent: true },
  { text: 'Ship it today.' },
];

export default function Hero() {
  return (
    <section className="fx-hero" id="top">
      <div className="fx-hero__grid" aria-hidden="true" />
      <div className="fx-hero__glow" aria-hidden="true" />

      <div className="fx-hero__copy">
        <motion.div className="fx-mono fx-hero__eyebrow" variants={fadeUp} initial="hidden" animate="show" custom={0.1}>
          <span className="fx-hero__eyebrow-tag">v2.0</span>
          AI-native workflow engine
        </motion.div>

        <h1 className="fx-hero__title">
          {HEADLINE.map((l, i) => (
            <span key={l.text} className="fx-hero__line">
              <motion.span
                className={l.accent ? 'fx-hero__accent' : undefined}
                variants={lineVariants}
                initial="hidden"
                animate="show"
                custom={i}
                style={{ display: 'inline-block' }}
              >
                {l.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p className="fx-hero__lede" variants={fadeUp} initial="hidden" animate="show" custom={0.75}>
          Build workflows on a visual canvas, let AI debug them, and deploy to 50+ tools — without writing glue code.
        </motion.p>

        <motion.div className="fx-hero__actions" variants={fadeUp} initial="hidden" animate="show" custom={0.9}>
          <Link to="/register" className="btn btn-solid btn-lg fx-hero__cta">
            Start building free <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="#how-it-works" className="btn btn-hero-ghost btn-lg">
            See how it works
          </a>
        </motion.div>

        <motion.div className="fx-mono fx-hero__term" variants={fadeUp} initial="hidden" animate="show" custom={1.05}>
          <Terminal size={14} aria-hidden="true" />
          <span className="fx-hero__term-prompt">$</span> flow deploy onboarding
          <span className="fx-hero__term-ok">✓ live in 142ms</span>
        </motion.div>
      </div>

      <div className="fx-hero__visual">
        <Suspense fallback={<div className="fx-scene fx-scene--fallback" aria-hidden="true" />}>
          <HeroScene />
        </Suspense>
        {CHIPS.map((c) => (
          <motion.div
            key={c.text}
            className={`fx-chip fx-mono ${c.pos}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: c.d, ease: EASE }}
            aria-hidden="true"
          >
            <span className="fx-chip__dot" />
            {c.text}
          </motion.div>
        ))}
      </div>

      <a href="#features" className="fx-hero__scroll fx-mono" aria-label="Scroll to features">
        scroll <span className="fx-hero__scroll-line" />
      </a>
    </section>
  );
}

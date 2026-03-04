import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Zap,
  BrainCircuit,
  GitBranch,
  Users,
  Shield,
  ArrowRight,
  Play,
  Workflow,
  Sparkles,
  MousePointerClick,
  Layers,
  Globe,
  ChevronRight,
  Terminal,
  Code2,
} from 'lucide-react';
import FlowaLogo from '../components/FlowaLogo';

/* ── Feature data ── */
const features = [
  {
    icon: Workflow,
    title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop canvas powered by ReactFlow. Connect nodes, configure triggers, and deploy automation in minutes.',
    gradient: 'from-rose-500 to-red-600',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Native Debugger',
    desc: 'Describe what you want in plain English and let AI generate, debug, and optimise your workflows automatically.',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: GitBranch,
    title: 'Version History & Diffing',
    desc: 'Every save is versioned. Compare any two snapshots side-by-side, restore previous versions with one click.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Users,
    title: 'Real-Time Multiplayer',
    desc: 'Collaborate live with your team — see cursors, selections, and changes as they happen on the canvas.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Zap,
    title: 'Parallel Execution Engine',
    desc: 'BFS-based engine runs independent branches in parallel. Variables resolve dynamically between nodes.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Shield,
    title: 'Secure & Self-Hosted',
    desc: 'AES-256 encrypted credentials, JWT auth, role-based access. Deploy on your own infrastructure with Docker.',
    gradient: 'from-red-500 to-rose-600',
  },
];

/* ── "How it works" steps ── */
const steps = [
  { num: '01', title: 'Design', desc: 'Drag nodes onto the canvas and wire them together visually.', icon: MousePointerClick },
  { num: '02', title: 'Configure', desc: 'Set triggers, conditions, and AI prompts per node.', icon: Layers },
  { num: '03', title: 'Deploy', desc: 'One-click deploy — Flowa runs your pipeline in parallel.', icon: Globe },
];

/* ── Marquee logos ── */
const marqueeItems = [
  'OpenAI', 'Slack', 'GitHub', 'Stripe', 'Notion', 'Discord', 'Zapier', 'Jira',
  'Twilio', 'Airtable', 'HubSpot', 'Shopify', 'PostgreSQL', 'Redis', 'Docker',
];

/* ── Typewriter hook (dify-style) ── */
function useTypewriter(words: string[], typingMs = 100, pauseMs = 2200, deletingMs = 60) {
  const [display, setDisplay] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIdx < word.length) {
      timeout = setTimeout(() => {
        setDisplay(word.slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, typingMs);
    } else if (!isDeleting && charIdx === word.length) {
      timeout = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplay(word.slice(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, deletingMs);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setWordIdx((wordIdx + 1) % words.length);
    }

    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, wordIdx, words, typingMs, pauseMs, deletingMs]);

  return display;
}

/* ── Animated counter hook ── */
function useCountUp(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      // easeOutExpo for snappier feel
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return value;
}

/* ── Intersection Observer hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Pointer glow hook (dify-style global cursor follow) ── */
function usePointerGlow() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      el.style.setProperty('--px', `${e.clientX}px`);
      el.style.setProperty('--py', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return containerRef;
}

export default function LandingPage() {
  const pointerRef = usePointerGlow();
  const statsObs = useInView(0.3);
  const stepsObs = useInView(0.2);
  const featObs = useInView(0.1);
  const ctaObs = useInView(0.2);

  /* Typewriter words */
  const typed = useTypewriter([
    'Speed of Thought',
    'Power of AI',
    'Click of a Button',
    'Scale You Need',
  ], 90, 2000, 50);

  /* Animated counters */
  const count10x = useCountUp(10, 1500, statsObs.inView);
  const count100 = useCountUp(100, 1800, statsObs.inView);

  /* Spotlight cursor tracking on hero */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div ref={pointerRef} className="pointer-glow-container min-h-screen bg-surface-base text-foreground overflow-hidden">
      {/* ── Global pointer glow (dify-style) ── */}
      <div className="pointer-glow" aria-hidden="true" />

      {/* ── Animated grid + noise background ── */}
      <div className="fixed inset-0 animated-grid pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 noise-overlay pointer-events-none" aria-hidden="true" />

      {/* ── Aurora gradient wash ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] animate-aurora opacity-30" />
      </div>

      {/* ── Gradient mesh orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="glow-dot animate-morph-blob w-[700px] h-[700px] bg-brand-500/[0.04] top-[-20%] left-[-10%] animate-float-slow" />
        <div className="glow-dot animate-morph-blob w-[500px] h-[500px] bg-accent-500/[0.03] top-[30%] right-[-12%] animate-float-slow" style={{ animationDelay: '4s' }} />
        <div className="glow-dot animate-morph-blob w-[400px] h-[400px] bg-brand-400/[0.03] bottom-[5%] left-[20%] animate-float-slow" style={{ animationDelay: '8s' }} />
      </div>

      {/* ── Floating particles ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              '--x': `${5 + (i * 5.3) % 90}%`,
              '--delay': `${(i * 0.7) % 10}s`,
              '--duration': `${10 + (i % 5) * 3}s`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              background: i % 3 === 0
                ? 'rgba(246,48,73,0.12)'
                : i % 3 === 1
                  ? 'rgba(6,182,212,0.08)'
                  : 'rgba(246,48,73,0.06)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Nav (glassmorphism) ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-surface-base/70 border-b border-surface-border/50">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto animate-fade-in">
          <div className="flex items-center gap-3 group cursor-default">
            <FlowaLogo size={36} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-display text-xl font-bold tracking-tight">Flowa</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm px-4 py-2 rounded-lg font-medium text-foreground-secondary hover:text-foreground transition-colors duration-200">
              Sign In
            </Link>
            <Link to="/register" className="btn-shimmer relative bg-brand-500 hover:bg-brand-600 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="spotlight-container relative z-10 max-w-5xl mx-auto text-center pt-20 pb-28 px-6"
        onMouseMove={handleMouseMove}
      >
        {/* Rotating decorative rings */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rotating-ring opacity-[0.06] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rotating-ring-reverse opacity-[0.04] pointer-events-none" />

        {/* Floating badge — with pulse ring */}
        <div className="relative inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-card/60 backdrop-blur-sm px-5 py-2 mb-12 animate-scale-in group cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
          </span>
          <span className="text-xs font-medium text-foreground-secondary tracking-wide">
            AI-Native Automation Platform
          </span>
        </div>

        {/* Hero headline with typewriter */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.08] mb-8 tracking-[-0.03em]">
          <span className="block hero-text-reveal" style={{ animationDelay: '0.15s' }}>
            Build Workflows
          </span>
          <span className="block hero-text-reveal" style={{ animationDelay: '0.35s' }}>
            at the{' '}
            <span className="hero-gradient-text">
              {typed}
              <span className="typewriter-cursor">|</span>
            </span>
          </span>
        </h1>

        {/* Subline with stagger */}
        <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto mb-14 font-body leading-relaxed hero-text-reveal" style={{ animationDelay: '0.6s' }}>
          Flowa is a visual, AI-powered workflow automation platform.
          Drag, connect, and let artificial intelligence debug your pipelines — all in real time.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 hero-text-reveal" style={{ animationDelay: '0.8s' }}>
          <Link
            to="/register"
            className="cta-primary group relative inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-4 rounded-xl text-sm font-bold shadow-xl shadow-brand-500/30 transition-all duration-300 hover:shadow-brand-500/50 hover:scale-[1.03] hover:-translate-y-0.5"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Building Free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </Link>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 border border-surface-border hover:border-brand-500/40 text-foreground-secondary hover:text-foreground px-8 py-4 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-brand-500/5"
          >
            <Play size={14} className="group-hover:scale-110 transition-transform" /> Watch Demo
          </Link>
        </div>

        {/* Terminal preview (dify-style code snippet) */}
        <div className="mt-16 mx-auto max-w-lg hero-text-reveal" style={{ animationDelay: '1s' }}>
          <div className="rounded-xl border border-surface-border bg-surface-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-hover/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-foreground-muted font-mono ml-2">workflow.flowa</span>
            </div>
            <div className="px-4 py-4 font-mono text-xs leading-relaxed text-left">
              <div className="flex items-center gap-2 text-foreground-muted">
                <Terminal size={12} className="text-brand-400" />
                <span className="text-brand-400">flowa</span>
                <span className="text-foreground-muted/60">run</span>
                <span className="text-accent-400">--workflow</span>
                <span className="text-foreground">"email-campaign"</span>
              </div>
              <div className="mt-2 text-emerald-400 flex items-center gap-2">
                <Code2 size={12} />
                <span>✓ 12 nodes executed in 340ms</span>
              </div>
              <div className="text-foreground-muted/50 mt-1 ml-5">
                → 3 branches run in parallel
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div ref={statsObs.ref} className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: `${count10x}x`, label: 'Faster Builds' },
            { value: `${count100}%`, label: 'Self-Hosted' },
            { value: '∞', label: 'Workflows' },
          ].map((stat, i) => (
            <div key={stat.label} className={`text-center transition-all duration-700 ${statsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-foreground-muted font-medium uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marquee — Integration logos ── */}
      <section className="relative z-10 py-10 overflow-hidden border-y border-surface-border/50">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-foreground-muted mb-6">
          Connects with your favorite tools
        </p>
        <div className="marquee-track">
          <div className="marquee-content">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="marquee-item">{item}</span>
            ))}
          </div>
          <div className="marquee-content" aria-hidden="true">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={`dup-${i}`} className="marquee-item">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={stepsObs.ref} className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-brand-400 mb-4 transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            HOW IT WORKS
          </span>
          <h2 className={`font-display text-3xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em] transition-all duration-700 delay-100 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Three steps to{' '}
            <span className="gradient-text-vivid">automate anything</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Animated connecting line (desktop) */}
          <div className={`hidden md:block absolute top-14 left-[16%] right-[16%] h-px transition-all duration-1000 delay-500 ${stepsObs.inView ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
            <div className="h-full w-full bg-gradient-to-r from-brand-500/40 via-accent-500/40 to-brand-500/20 animated-line" />
          </div>

          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`relative text-center group transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${400 + i * 200}ms` }}
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-6 group-hover:border-brand-500/50 group-hover:shadow-lg group-hover:shadow-brand-500/10 transition-all duration-300 group-hover:-translate-y-1">
                <s.icon size={24} className="text-foreground-secondary group-hover:text-brand-400 transition-colors duration-300" />
              </div>
              <span className="inline-block text-xs font-mono text-brand-400/60 tracking-widest mb-1">{s.num}</span>
              <h3 className="font-display text-lg font-bold mt-1 mb-2">{s.title}</h3>
              <p className="text-sm text-foreground-muted font-body leading-relaxed max-w-[240px] mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-20">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-brand-400 mb-4 transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            FEATURES
          </span>
          <h2 className={`font-display text-3xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em] transition-all duration-700 delay-100 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Everything you need to{' '}
            <span className="gradient-text-vivid">automate</span>
          </h2>
          <p className={`text-foreground-muted max-w-lg mx-auto font-body text-base transition-all duration-700 delay-200 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            A complete toolkit for building, debugging, and deploying workflows at any scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card group p-7 rounded-2xl border border-surface-border bg-surface-card/50 backdrop-blur-sm transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 100}ms` }}
            >
              {/* Hover spotlight */}
              <div className="feature-card-glow" />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="font-display text-base font-bold mb-2 group-hover:text-foreground transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed font-body">{f.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  Learn more <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section ref={ctaObs.ref} className="relative z-10 max-w-4xl mx-auto px-6 pb-28 text-center">
        <div className={`rounded-3xl p-14 relative overflow-hidden border border-surface-border bg-surface-card transition-all duration-1000 ${ctaObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Background glow */}
          <div className="absolute inset-0 animate-aurora opacity-20 pointer-events-none rounded-3xl" />
          <div className="glow-dot animate-morph-blob w-[300px] h-[300px] bg-brand-500/[0.08] -top-24 -right-24" />
          <div className="glow-dot animate-morph-blob w-[200px] h-[200px] bg-accent-500/[0.05] -bottom-20 -left-20" style={{ animationDelay: '4s' }} />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-5 tracking-[-0.02em]">
              Ready to{' '}
              <span className="gradient-text-vivid">automate</span>?
            </h2>
            <p className="text-foreground-muted mb-10 max-w-md mx-auto font-body text-base">
              Create your free account and start building intelligent workflows in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="cta-primary group relative inline-flex items-center gap-2 bg-brand-500 text-white px-10 py-4 rounded-xl text-sm font-bold shadow-xl shadow-brand-500/30 transition-all duration-300 hover:shadow-brand-500/50 hover:scale-[1.03] hover:-translate-y-0.5"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground text-sm font-medium transition-colors duration-200"
              >
                <Sparkles size={14} /> Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-surface-border/50 py-10">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlowaLogo size={24} />
            <span className="font-display text-sm font-medium text-foreground-muted">
              &copy; {new Date().getFullYear()} Flowa
            </span>
          </div>
          <span className="text-sm text-foreground-muted font-body">AI-Native Workflow Automation</span>
        </div>
      </footer>
    </div>
  );
}

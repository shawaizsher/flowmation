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
} from 'lucide-react';

/* ── Feature data ── */
const features = [
  {
    icon: Workflow,
    title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop canvas powered by ReactFlow. Connect nodes, configure triggers, and deploy automation in minutes.',
    gradient: 'from-violet-500 to-purple-600',
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
    gradient: 'from-indigo-500 to-violet-600',
  },
];

/* ── "How it works" steps ── */
const steps = [
  { num: '01', title: 'Design', desc: 'Drag nodes onto the canvas and wire them together visually.', icon: MousePointerClick },
  { num: '02', title: 'Configure', desc: 'Set triggers, conditions, and AI prompts per node.', icon: Layers },
  { num: '03', title: 'Deploy', desc: 'One-click deploy — Flowa runs your pipeline in parallel.', icon: Globe },
];

/* ── Marquee logos (text-only, no images needed) ── */
const marqueeItems = [
  'OpenAI', 'Slack', 'GitHub', 'Stripe', 'Notion', 'Discord', 'Zapier', 'Jira',
  'Twilio', 'Airtable', 'HubSpot', 'Shopify', 'PostgreSQL', 'Redis', 'Docker',
];

/* ── Animated counter hook ── */
function useCountUp(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      setValue(Math.floor(progress * end));
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

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const statsObs = useInView(0.3);
  const stepsObs = useInView(0.2);
  const featObs = useInView(0.1);

  /* Spotlight cursor tracking on hero */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  /* Animated counters */
  const count10x = useCountUp(10, 1500, statsObs.inView);
  const count100 = useCountUp(100, 1800, statsObs.inView);

  return (
    <div className="min-h-screen bg-surface-base text-foreground overflow-hidden">
      {/* ── Animated grid + noise background ── */}
      <div className="fixed inset-0 animated-grid pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 noise-overlay pointer-events-none" aria-hidden="true" />

      {/* ── Aurora gradient wash ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] animate-aurora opacity-30" />
      </div>

      {/* ── Subtle gradient orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="glow-dot animate-morph-blob w-[600px] h-[600px] bg-brand-500/[0.04] top-[-15%] left-[-10%] animate-float-slow" />
        <div className="glow-dot animate-morph-blob w-[500px] h-[500px] bg-accent-500/[0.03] top-[25%] right-[-12%] animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="glow-dot animate-morph-blob w-[400px] h-[400px] bg-brand-400/[0.03] bottom-[0%] left-[25%] animate-float-slow" style={{ animationDelay: '6s' }} />
      </div>

      {/* ── Floating particles ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              '--x': `${8 + (i * 7.3) % 84}%`,
              '--delay': `${(i * 0.9) % 8}s`,
              '--duration': `${8 + (i % 4) * 3}s`,
              width: `${2 + (i % 2)}px`,
              height: `${2 + (i % 2)}px`,
              background: i % 2 === 0 ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 group-hover:scale-105 transition-all duration-300">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Flowa</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm px-4 py-2 rounded-lg font-medium text-foreground-secondary hover:text-foreground transition-colors duration-200">
            Sign In
          </Link>
          <Link to="/register" className="bg-white text-black text-sm px-5 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-all duration-200 shadow-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="spotlight-container relative z-10 max-w-5xl mx-auto text-center pt-24 pb-28 px-6"
        onMouseMove={handleMouseMove}
      >
        {/* Rotating decorative rings */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rotating-ring opacity-20 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rotating-ring-reverse opacity-15 pointer-events-none" />

        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-card/60 backdrop-blur-sm px-4 py-1.5 mb-10 animate-scale-in">
          <Sparkles size={13} className="text-brand-400" />
          <span className="text-xs font-medium text-foreground-secondary">
            AI-Native Automation Platform
          </span>
        </div>

        {/* Hero headline — Inter font, clean and bold */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.08] mb-6 tracking-[-0.03em]">
          <span className="inline-block animate-letter-reveal" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            Build Workflows
          </span>
          <br />
          <span className="inline-block animate-letter-reveal" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            at the{' '}
          </span>
          <span
            className="animate-gradient-text inline-block animate-letter-reveal"
            style={{
              animationDelay: '0.6s',
              animationFillMode: 'both',
              backgroundImage: 'linear-gradient(90deg, #A78BFA, #8B5CF6, #06B6D4, #22D3EE, #A78BFA)',
            }}
          >
            Speed of Thought
          </span>
        </h1>

        {/* Handwritten accent */}
        <p className="font-accent text-2xl md:text-3xl text-foreground-muted mb-6 animate-text-reveal" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          — drag, connect, let AI do the rest
        </p>

        <p className="text-base md:text-lg text-foreground-muted max-w-xl mx-auto mb-12 font-body leading-relaxed animate-slide-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          Flowa is a visual, AI-powered workflow automation platform. Drag, connect,
          and let artificial intelligence debug your pipelines — all in real time.
        </p>

        {/* CTA buttons — n8n-style clean */}
        <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
          <Link
            to="/register"
            className="btn-magnetic relative inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-white/10 transition-all duration-300 hover:shadow-white/20 hover:scale-[1.02]"
          >
            Start Building <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="btn-magnetic inline-flex items-center gap-2 border border-surface-border hover:border-foreground-muted/40 text-foreground-secondary hover:text-foreground px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300"
          >
            <Play size={14} /> Watch Demo
          </Link>
        </div>

        {/* Stats strip — with animated counters */}
        <div ref={statsObs.ref} className="mt-20 flex items-center justify-center gap-16 animate-slide-up" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
          {[
            { value: `${count10x}x`, label: 'Faster Builds', raw: 10 },
            { value: `${count100}%`, label: 'Self-Hosted', raw: 100 },
            { value: '∞', label: 'Workflows', raw: 0 },
          ].map((stat, i) => (
            <div key={stat.label} className={`text-center ${statsObs.inView ? 'animate-counter-pop' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.15}s`, animationFillMode: 'both' }}>
              <div className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-foreground-muted mt-1.5 font-medium uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marquee — Integration logos ── */}
      <section className="relative z-10 py-10 overflow-hidden border-y border-surface-border">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-foreground-muted mb-6">
          Connects with your favorite tools
        </p>
        <div className="flex whitespace-nowrap">
          <div className="animate-marquee flex items-center gap-12 px-6">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="text-foreground-muted/40 font-display text-base font-medium hover:text-foreground-secondary transition-colors duration-300 cursor-default select-none">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={stepsObs.ref} className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <h2 className={`font-display text-3xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em] transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            How it{' '}
            <span className="gradient-text-vivid">works</span>
          </h2>
          <p className={`text-foreground-muted max-w-md mx-auto font-body text-sm transition-all duration-700 delay-200 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Three simple steps to automate anything.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-14 left-[16%] right-[16%] h-px bg-gradient-to-r from-brand-500/40 via-accent-500/40 to-pink-500/40" />

          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`relative text-center transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 200}ms` }}
            >
              {/* Step circle */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-6 group-hover:border-brand-500/40 transition-colors duration-300">
                <s.icon size={24} className="text-foreground-secondary group-hover:text-brand-400 transition-colors" />
              </div>
              <span className="text-xs font-mono text-foreground-muted tracking-widest">{s.num}</span>
              <h3 className="font-display text-lg font-bold mt-1 mb-2">{s.title}</h3>
              <p className="text-sm text-foreground-muted font-body leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className={`font-display text-3xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em] transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Everything you need to{' '}
            <span className="gradient-text-vivid">
              automate
            </span>
          </h2>
          <p className={`text-foreground-muted max-w-lg mx-auto font-body text-sm transition-all duration-700 delay-200 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            A complete toolkit for building, debugging, and deploying workflows at any scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`card-gradient-border card-glow hover-tilt group p-6 transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="font-display text-base font-bold mb-2 group-hover:text-white transition-colors duration-300">
                {f.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed font-body">{f.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                Learn more <ChevronRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-28 text-center">
        <div className="rounded-3xl p-14 relative overflow-hidden border border-surface-border bg-surface-card">
          {/* Background glow */}
          <div className="absolute inset-0 animate-aurora opacity-20 pointer-events-none rounded-3xl" />
          <div className="glow-dot animate-morph-blob w-[250px] h-[250px] bg-brand-500/[0.06] -top-24 -right-24" />
          <div className="glow-dot animate-morph-blob w-[180px] h-[180px] bg-accent-500/[0.04] -bottom-20 -left-20" style={{ animationDelay: '4s' }} />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-5 tracking-[-0.02em]">
              Ready to{' '}
              <span className="gradient-text-vivid">automate</span>?
            </h2>
            <p className="text-foreground-muted mb-10 max-w-md mx-auto font-body text-base">
              Create your free account and start building intelligent workflows in seconds.
            </p>
            <div className="relative inline-block">
              <Link
                to="/register"
                className="btn-magnetic relative z-10 inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-xl text-sm font-bold shadow-lg shadow-white/10 transition-all duration-300 hover:shadow-white/20 hover:scale-[1.02]"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-surface-border py-10 text-center">
        <span className="font-display text-sm font-medium text-foreground-muted">
          &copy; {new Date().getFullYear()} Flowa
        </span>
        <span className="text-foreground-muted/40 mx-2">—</span>
        <span className="text-sm text-foreground-muted font-body">AI-Native Workflow Automation</span>
      </footer>
    </div>
  );
}

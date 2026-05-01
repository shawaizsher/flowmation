import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Zap,
  BrainCircuit,
  GitBranch,
  Users,
  Shield,
  ArrowRight,
  Workflow,
  Sparkles,
  MousePointerClick,
  Layers,
  Globe,
  ChevronRight,
  Terminal,
  Code2,
  CheckCircle2,
  Database,
  Clock3,
  BarChart3,
  Building2,
  Mail,
  ShoppingCart,
  Bot,
  Plus,
  Minus,
} from 'lucide-react';
import {
  SiOpenai,
  SiSlack,
  SiGithub,
  SiStripe,
  SiNotion,
  SiDiscord,
  SiZapier,
  SiJira,
  SiTwilio,
  SiAirtable,
  SiHubspot,
  SiShopify,
  SiPostgresql,
  SiRedis,
  SiDocker,
} from 'react-icons/si';
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
  { name: 'OpenAI', icon: SiOpenai, color: '#10A37F' },
  { name: 'Slack', icon: SiSlack, color: '#4A154B' },
  { name: 'GitHub', icon: SiGithub, color: '#181717' },
  { name: 'Stripe', icon: SiStripe, color: '#635BFF' },
  { name: 'Notion', icon: SiNotion, color: '#000000' },
  { name: 'Discord', icon: SiDiscord, color: '#5865F2' },
  { name: 'Zapier', icon: SiZapier, color: '#FF4F00' },
  { name: 'Jira', icon: SiJira, color: '#0052CC' },
  { name: 'Twilio', icon: SiTwilio, color: '#F22F46' },
  { name: 'Airtable', icon: SiAirtable, color: '#18BFFF' },
  { name: 'HubSpot', icon: SiHubspot, color: '#FF7A59' },
  { name: 'Shopify', icon: SiShopify, color: '#95BF47' },
  { name: 'PostgreSQL', icon: SiPostgresql, color: '#336791' },
  { name: 'Redis', icon: SiRedis, color: '#DC382D' },
  { name: 'Docker', icon: SiDocker, color: '#2496ED' },
];

const platformHighlights = [
  {
    icon: Database,
    title: 'Production-Ready Core',
    desc: 'Built with queue workers, retry-aware execution, real-time updates, and encrypted credential storage.',
  },
  {
    icon: Clock3,
    title: 'Faster Delivery Cycles',
    desc: 'Ship automation in hours, not weeks, with reusable workflow templates and clear execution traces.',
  },
  {
    icon: BarChart3,
    title: 'Live Observability',
    desc: 'Track node-level statuses, execution timing, and failure points as your workflows run.',
  },
  {
    icon: Building2,
    title: 'Built For Teams',
    desc: 'Give product, ops, and engineering one shared automation canvas with version-safe collaboration.',
  },
];

const useCases = [
  {
    icon: Mail,
    title: 'Lifecycle Messaging',
    desc: 'Auto-trigger onboarding, retention, and support messages based on user behavior.',
    tags: ['Email sequences', 'CRM sync', 'Lead routing'],
  },
  {
    icon: ShoppingCart,
    title: 'E-commerce Ops',
    desc: 'Connect orders, inventory, shipping, and notifications into one reliable pipeline.',
    tags: ['Order orchestration', 'Stock alerts', 'Post-purchase flows'],
  },
  {
    icon: Bot,
    title: 'AI Backoffice',
    desc: 'Route text, classify requests, and summarize activity with model-driven decision nodes.',
    tags: ['AI triage', 'Auto classification', 'Human handoff'],
  },
];

const dayOneChecklist = [
  'Visual workflow builder with reusable node patterns',
  'Real-time run logs with node-by-node execution updates',
  'Secure credentials vault with encrypted secret storage',
  'Version history with rollback safety for every workflow',
  'Webhook and API-first triggers for custom integrations',
  'Docker-ready deployment for local or self-hosted environments',
];

const faqs = [
  {
    q: 'Can I self-host Flowa in my own infrastructure?',
    a: 'Yes. Flowa is built for self-hosting with Docker Compose and environment-based configuration for backend, worker, database, and Redis services.',
  },
  {
    q: 'Is this only for engineers?',
    a: 'No. Engineers can extend nodes and APIs, while product and operations teams can build flows visually with no-code style configuration.',
  },
  {
    q: 'How do I monitor failures and retries?',
    a: 'Each run includes status tracking and logs. You can inspect execution state, identify failed nodes, and replay flows with controlled retries.',
  },
  {
    q: 'Can I connect external tools and custom APIs?',
    a: 'Yes. Use the HTTP/API nodes and webhook triggers to integrate external services, then combine them with built-in nodes for orchestration.',
  },
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
  const highlightsObs = useInView(0.15);
  const useCasesObs = useInView(0.15);
  const valueObs = useInView(0.18);
  const faqObs = useInView(0.18);
  const ctaObs = useInView(0.2);
  const footerObs = useInView(0.2);
  const [openFaq, setOpenFaq] = useState(0);

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
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-surface-base/80 border-b border-surface-border/40 shadow-sm">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto animate-fade-in">
          <div className="flex items-center gap-3 group cursor-default">
            <FlowaLogo size={34} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-display text-xl font-bold tracking-wide">Flowa</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm px-4 py-2 rounded-lg font-medium text-foreground-secondary hover:text-foreground transition-all duration-300 hover:bg-surface-hover/50 uppercase tracking-widest text-xs">
              Sign In
            </Link>
            <Link to="/register" className="btn-shimmer relative bg-brand-500 hover:bg-brand-600 text-white text-xs px-6 py-2.5 rounded-lg font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] hover:-translate-y-0.5 border border-brand-500/50">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="spotlight-container relative z-10 max-w-5xl mx-auto text-center pt-24 pb-32 px-6"
        onMouseMove={handleMouseMove}
      >
        {/* Rotating decorative rings */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rotating-ring opacity-[0.06] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rotating-ring-reverse opacity-[0.04] pointer-events-none" />

        {/* Floating badge — with pulse ring */}
        <div className="relative inline-flex items-center gap-2.5 rounded-full border border-amber-500/20 bg-amber-500/[0.05] backdrop-blur-sm px-5 py-2 mb-12 animate-scale-in group cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-xs font-medium text-amber-500/90 tracking-widest uppercase">
            AI-Native Automation Platform
          </span>
        </div>

        {/* Hero headline with typewriter */}
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8" style={{ letterSpacing: '-0.01em' }}>
          <span className="block hero-text-reveal" style={{ animationDelay: '0.15s' }}>
            Build Workflows
          </span>
          <span className="block hero-text-reveal italic" style={{ animationDelay: '0.35s' }}>
            at the{' '}
            <span className="hero-gradient-text not-italic text-amber-300/90 dark:text-amber-400">
              {typed}
              <span className="typewriter-cursor">|</span>
            </span>
          </span>
        </h1>

        {/* Subline with stagger */}
        <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto mb-14 font-body leading-relaxed hero-text-reveal font-light" style={{ animationDelay: '0.6s' }}>
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
      <section className="relative z-10 py-10 overflow-hidden border-y border-surface-border/40">
        <p className="text-center text-xs font-body font-light uppercase tracking-[0.2em] text-foreground-muted/60 mb-8">
          Connects with your favorite tools
        </p>
        <div className="marquee-track">
          <div className="marquee-content">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="marquee-item" title={item.name} aria-label={item.name} style={{ color: item.color }}>
                <item.icon aria-hidden="true" />
                <span className="sr-only">{item.name}</span>
              </span>
            ))}
          </div>
          <div className="marquee-content" aria-hidden="true">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={`dup-${i}`} className="marquee-item" title={item.name} style={{ color: item.color }}>
                <item.icon aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section divider ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-surface-border to-transparent" />
      </div>

      {/* ── How It Works ── */}
      <section ref={stepsObs.ref} className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-4 transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            HOW IT WORKS
          </span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-100 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Three steps to{' '}
            <span className="text-amber-400">automate anything</span>
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
              className={`relative group transition-all duration-700 border border-surface-border/60 rounded-2xl p-8 bg-surface-card/40 backdrop-blur-sm hover:border-amber-500/30 hover:bg-surface-card/60 hover:-translate-y-1 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${400 + i * 200}ms` }}
            >
              <span className="absolute top-4 right-5 text-5xl font-bold font-display text-foreground-muted/10 leading-none select-none">{s.num}</span>
              <div className="w-14 h-14 rounded-xl bg-surface-hover border border-surface-border flex items-center justify-center mb-6 group-hover:border-amber-500/40 group-hover:shadow-lg group-hover:shadow-amber-500/5 transition-all duration-300">
                <s.icon size={22} className="text-foreground-secondary group-hover:text-amber-400 transition-colors duration-300" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-sm text-foreground-muted font-body leading-relaxed font-light">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-20">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-4 transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            FEATURES
          </span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-100 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Everything you need to{' '}
            <span className="text-amber-400">automate</span>
          </h2>
          <p className={`text-foreground-muted max-w-lg mx-auto font-body text-base font-light transition-all duration-700 delay-200 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            A complete toolkit for building, debugging, and deploying workflows at any scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card group p-7 rounded-2xl border border-surface-border/70 bg-surface-card/40 backdrop-blur-sm transition-all duration-700 hover:scale-[1.02] hover:border-amber-500/25 hover:bg-surface-card/60 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 100}ms` }}
            >
              {/* Hover spotlight */}
              <div className="feature-card-glow" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <f.icon size={20} className="text-white" />
                  </div>
                  <span className="text-3xl font-bold font-display text-foreground-muted/10 leading-none select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mb-2 group-hover:text-foreground transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed font-body font-light">{f.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-amber-400/70 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  Learn more <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Highlights ── */}
      <section ref={highlightsObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {platformHighlights.map((item, i) => (
            <div
              key={item.title}
              className={`rounded-2xl border border-surface-border bg-surface-card/60 backdrop-blur-sm p-6 hover:border-amber-500/30 hover:scale-[1.01] hover:translate-y-[-2px] transition-all duration-700 ${highlightsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <item.icon size={20} className="text-brand-400" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section ref={useCasesObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-4 transition-all duration-700 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            USE CASES
          </span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-100 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Built for real{' '}
            <span className="text-amber-400">automation workloads</span>
          </h2>
          <p className={`text-foreground-muted max-w-2xl mx-auto font-body text-base font-light transition-all duration-700 delay-150 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            From customer communication to AI-assisted operations, Flowa helps teams automate repetitive work with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map((item, i) => (
            <div
              key={item.title}
              className={`rounded-2xl border border-surface-border bg-surface-card/50 p-6 hover:translate-y-[-2px] hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-700 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${250 + i * 120}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-4">
                <item.icon size={20} className="text-accent-400" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed mb-4">{item.desc}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full border border-surface-border text-foreground-secondary bg-surface-hover/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Day One Value ── */}
      <section ref={valueObs.ref} className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className={`rounded-3xl border border-surface-border bg-surface-card/70 backdrop-blur-sm p-8 md:p-10 transition-all duration-800 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-4 transition-all duration-700 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                WHAT YOU GET
              </span>
              <h2 className={`font-display text-3xl md:text-4xl font-bold mb-4 transition-all duration-700 delay-100 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Everything you need on{' '}
                <span className="text-amber-400">day one</span>
              </h2>
              <p className={`text-foreground-muted font-body text-base leading-relaxed font-light transition-all duration-700 delay-150 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Start small with one workflow, then scale to cross-team automation with visibility, control, and security built in.
              </p>
            </div>

            <div className="space-y-3">
              {dayOneChecklist.map((item, i) => (
                <div
                  key={item}
                  className={`flex items-start gap-3 rounded-xl border border-surface-border bg-surface-base/40 px-4 py-3 transition-all duration-700 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${220 + i * 90}ms` }}
                >
                  <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground-secondary leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section ref={faqObs.ref} className="relative z-10 max-w-4xl mx-auto px-6 pb-28">
        <div className="text-center mb-12">
          <span className={`inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-4 transition-all duration-700 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            FAQ
          </span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold transition-all duration-700 delay-100 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Questions teams ask before{' '}
            <span className="text-amber-400">launching</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <button
                key={item.q}
                onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                className={`w-full text-left rounded-2xl border border-surface-border bg-surface-card/60 p-5 hover:border-amber-500/30 hover:bg-surface-card/80 transition-all duration-500 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${220 + idx * 100}ms` }}
              >
                <div className="flex items-center justify-between gap-6">
                  <h3 className="font-display text-base md:text-lg font-bold">{item.q}</h3>
                  <span className="text-brand-400 shrink-0">
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </div>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden text-sm text-foreground-muted leading-relaxed">{item.a}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quote / Manifesto section ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center border border-surface-border/50 rounded-3xl p-10 md:p-14 bg-surface-card/30 backdrop-blur-sm">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-6">Our Belief</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-[1.2] mb-6">
              We used to build things.<br />
              <span className="italic text-amber-400/80">Then we automated them.</span>
            </h2>
            <p className="text-foreground-muted font-body font-light leading-relaxed text-sm mb-4">
              A few years ago, teams spent weeks writing the same glue code — connecting APIs, retrying failed jobs, syncing data between tools. Our demos went down well, but the effort didn't scale.
            </p>
            <p className="text-foreground-muted font-body font-light leading-relaxed text-sm">
              We realised the problem wasn't the tools — it was the missing orchestration layer. So we built Flowa: one visual canvas to design, run, and monitor any workflow.
            </p>
          </div>
          <div className="border-l border-surface-border/60 pl-10">
            <blockquote className="font-display text-xl md:text-2xl italic font-medium leading-relaxed text-foreground/80 mb-4">
              "Teams do not want automation. They want results, reliably."
            </blockquote>
            <p className="text-xs uppercase tracking-widest text-amber-500/60 font-semibold">Flowa Team</p>
          </div>
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
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-5">
              Ready to{' '}
              <span className="text-amber-400">automate</span>?
            </h2>
            <p className="text-foreground-muted mb-10 max-w-md mx-auto font-body text-base font-light">
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
      <footer ref={footerObs.ref} className="relative z-10 border-t border-surface-border/50 py-10">
        <div className={`max-w-7xl mx-auto px-8 flex items-center justify-between transition-all duration-700 ${footerObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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

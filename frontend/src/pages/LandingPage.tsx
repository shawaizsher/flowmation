import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Zap, BrainCircuit, GitBranch, Users, Shield, ArrowRight,
  Workflow, Sparkles, MousePointerClick, Layers, Globe,
  ChevronRight, Terminal, Code2, CheckCircle2, Database,
  Clock3, BarChart3, Building2, Mail, ShoppingCart, Bot,
  Plus, Minus, Sun, Moon,
} from 'lucide-react';
import {
  SiOpenai, SiSlack, SiGithub, SiStripe, SiNotion,
  SiDiscord, SiZapier, SiJira, SiTwilio, SiAirtable,
  SiHubspot, SiShopify, SiPostgresql, SiRedis, SiDocker,
} from 'react-icons/si';
import FlowaLogo from '../components/FlowaLogo';
import { Radar, IconContainer } from '../components/Radar';
import WorkflowAnimation from '../components/WorkflowAnimation';
import { useTheme } from '../hooks/useTheme';

/* ── Theme helper ── */
function mkTheme(dark: boolean) {
  return {
    bg:          dark ? '#000000'              : '#f9fafb',
    cardBg:      dark ? '#0a0a0a'              : '#ffffff',
    text:        dark ? '#ededed'              : '#0f172a',
    textMuted:   dark ? 'rgba(255,255,255,0.42)' : 'rgba(15,23,42,0.55)',
    textDim:     dark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.35)',
    border:      dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.09)',
    borderHover: dark ? 'rgba(246,48,73,0.25)'   : 'rgba(246,48,73,0.35)',
    navBg:       dark ? 'rgba(0,0,0,0.88)'        : 'rgba(255,255,255,0.92)',
    dotGrid:     dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)',
    faqBg:       (open: boolean) => open
      ? (dark ? 'rgba(246,48,73,0.04)' : 'rgba(246,48,73,0.03)')
      : (dark ? '#0a0a0a' : '#ffffff'),
    faqBorder:   (open: boolean) => open
      ? 'rgba(246,48,73,0.22)'
      : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.09)'),
    tagBorder:   dark ? 'rgba(255,255,255,0.08)'  : 'rgba(15,23,42,0.1)',
    tagColor:    dark ? 'rgba(255,255,255,0.45)'  : 'rgba(15,23,42,0.5)',
    tagBg:       dark ? 'rgba(255,255,255,0.03)'  : 'rgba(15,23,42,0.03)',
  };
}

/* ── Feature data ── */
const features = [
  { icon: Workflow,    title: 'Visual Workflow Builder',    desc: 'Drag-and-drop canvas powered by ReactFlow. Connect nodes, configure triggers, and deploy automation in minutes.', gradient: 'from-rose-500 to-red-600' },
  { icon: BrainCircuit,title: 'AI-Native Debugger',        desc: 'Describe what you want in plain English and let AI generate, debug, and optimise your workflows automatically.',    gradient: 'from-red-500 to-rose-700' },
  { icon: GitBranch,   title: 'Version History & Diffing', desc: 'Every save is versioned. Compare any two snapshots side-by-side, restore previous versions with one click.',       gradient: 'from-rose-600 to-red-800' },
  { icon: Users,       title: 'Real-Time Multiplayer',     desc: 'Collaborate live with your team — see cursors, selections, and changes as they happen on the canvas.',              gradient: 'from-red-600 to-rose-500' },
  { icon: Zap,         title: 'Parallel Execution Engine', desc: 'BFS-based engine runs independent branches in parallel. Variables resolve dynamically between nodes.',              gradient: 'from-rose-500 to-red-600' },
  { icon: Shield,      title: 'Secure & Self-Hosted',      desc: 'AES-256 encrypted credentials, JWT auth, role-based access. Deploy on your own infrastructure with Docker.',        gradient: 'from-red-500 to-rose-600' },
];

const steps = [
  { num: '01', title: 'Design',    desc: 'Drag nodes onto the canvas and wire them together visually.',          icon: MousePointerClick },
  { num: '02', title: 'Configure', desc: 'Set triggers, conditions, and AI prompts per node.',                   icon: Layers },
  { num: '03', title: 'Deploy',    desc: 'One-click deploy — Flowa runs your pipeline in parallel.',             icon: Globe },
];

const marqueeItems = [
  { name: 'OpenAI',     icon: SiOpenai,     color: '#10A37F' },
  { name: 'Slack',      icon: SiSlack,      color: '#E01E5A' },
  { name: 'GitHub',     icon: SiGithub,     color: '#aaa'    },
  { name: 'Stripe',     icon: SiStripe,     color: '#635BFF' },
  { name: 'Notion',     icon: SiNotion,     color: '#888'    },
  { name: 'Discord',    icon: SiDiscord,    color: '#5865F2' },
  { name: 'Zapier',     icon: SiZapier,     color: '#FF4F00' },
  { name: 'Jira',       icon: SiJira,       color: '#0052CC' },
  { name: 'Twilio',     icon: SiTwilio,     color: '#F22F46' },
  { name: 'Airtable',   icon: SiAirtable,   color: '#18BFFF' },
  { name: 'HubSpot',    icon: SiHubspot,    color: '#FF7A59' },
  { name: 'Shopify',    icon: SiShopify,    color: '#95BF47' },
  { name: 'PostgreSQL', icon: SiPostgresql, color: '#336791' },
  { name: 'Redis',      icon: SiRedis,      color: '#DC382D' },
  { name: 'Docker',     icon: SiDocker,     color: '#2496ED' },
];

const radarIcons = [
  { icon: <SiOpenai  size={22} color="#10A37F" />, text: 'OpenAI',   delay: 0.1,  pos: 'top-[8%]  left-[20%]' },
  { icon: <SiSlack   size={22} color="#E01E5A" />, text: 'Slack',    delay: 0.2,  pos: 'top-[8%]  right-[20%]' },
  { icon: <SiGithub  size={22} color="#aaa"    />, text: 'GitHub',   delay: 0.3,  pos: 'top-[42%] left-[2%]' },
  { icon: <SiStripe  size={22} color="#635BFF" />, text: 'Stripe',   delay: 0.4,  pos: 'top-[42%] right-[2%]' },
  { icon: <SiTwilio  size={22} color="#F22F46" />, text: 'Twilio',   delay: 0.5,  pos: 'bottom-[8%] left-[20%]' },
  { icon: <SiDiscord size={22} color="#5865F2" />, text: 'Discord',  delay: 0.6,  pos: 'bottom-[8%] right-[20%]' },
];

const platformHighlights = [
  { icon: Database,  title: 'Production-Ready Core',  desc: 'Built with queue workers, retry-aware execution, real-time updates, and encrypted credential storage.' },
  { icon: Clock3,    title: 'Faster Delivery Cycles', desc: 'Ship automation in hours, not weeks, with reusable workflow templates and clear execution traces.' },
  { icon: BarChart3, title: 'Live Observability',     desc: 'Track node-level statuses, execution timing, and failure points as your workflows run.' },
  { icon: Building2, title: 'Built For Teams',        desc: 'Give product, ops, and engineering one shared automation canvas with version-safe collaboration.' },
];

const useCases = [
  { icon: Mail,         title: 'Lifecycle Messaging', desc: 'Auto-trigger onboarding, retention, and support messages based on user behavior.',                          tags: ['Email sequences', 'CRM sync', 'Lead routing'] },
  { icon: ShoppingCart, title: 'E-commerce Ops',      desc: 'Connect orders, inventory, shipping, and notifications into one reliable pipeline.',                        tags: ['Order orchestration', 'Stock alerts', 'Post-purchase flows'] },
  { icon: Bot,          title: 'AI Backoffice',       desc: 'Route text, classify requests, and summarize activity with model-driven decision nodes.',                   tags: ['AI triage', 'Auto classification', 'Human handoff'] },
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
  { q: 'Can I self-host Flowa in my own infrastructure?',  a: 'Yes. Flowa is built for self-hosting with Docker Compose and environment-based configuration for backend, worker, database, and Redis services.' },
  { q: 'Is this only for engineers?',                      a: 'No. Engineers can extend nodes and APIs, while product and operations teams can build flows visually with no-code style configuration.' },
  { q: 'How do I monitor failures and retries?',           a: 'Each run includes status tracking and logs. You can inspect execution state, identify failed nodes, and replay flows with controlled retries.' },
  { q: 'Can I connect external tools and custom APIs?',    a: 'Yes. Use the HTTP/API nodes and webhook triggers to integrate external services, then combine them with built-in nodes for orchestration.' },
];

/* ── Tag colour rotation for use cases ── */
const TAG_CLASSES = ['tag-brand', 'tag-cyan', 'tag-rose'];

/* ── Highlight icon accent colours ── */
const HIGHLIGHT_ACCENTS = [
  { bg: 'rgba(246,48,73,0.08)',   border: 'rgba(246,48,73,0.15)',  color: '#F63049' },
  { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.15)',  color: '#06B6D4' },
  { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.15)',  color: '#06B6D4' },
  { bg: 'rgba(246,48,73,0.08)',   border: 'rgba(246,48,73,0.15)',  color: '#F63049' },
];

/* ── Step number accent colours ── */
const STEP_NUM_COLORS = [
  'rgba(246,48,73,0.08)',
  'rgba(6,182,212,0.07)',
  'rgba(246,48,73,0.08)',
];

/* ── Hooks ── */
function useTypewriter(words: string[], typingMs = 100, pauseMs = 2200, deletingMs = 60) {
  const [display, setDisplay]     = useState('');
  const [wordIdx, setWordIdx]     = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    const word = words[wordIdx];
    let t: ReturnType<typeof setTimeout>;
    if (!isDeleting && charIdx < word.length)         t = setTimeout(() => { setDisplay(word.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, typingMs);
    else if (!isDeleting && charIdx === word.length)  t = setTimeout(() => setIsDeleting(true), pauseMs);
    else if (isDeleting && charIdx > 0)               t = setTimeout(() => { setDisplay(word.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, deletingMs);
    else { setIsDeleting(false); setWordIdx(i => (i + 1) % words.length); }
    return () => clearTimeout(t);
  }, [charIdx, isDeleting, wordIdx, words, typingMs, pauseMs, deletingMs]);
  return display;
}

function useCountUp(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      setValue(Math.floor((1 - Math.pow(2, -10 * p)) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return value;
}

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

function usePointerGlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = (e: MouseEvent) => { el.style.setProperty('--px', `${e.clientX}px`); el.style.setProperty('--py', `${e.clientY}px`); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return containerRef;
}

/* ══════════════════════════════════════════════════════ */

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return progress;
}

export default function LandingPage() {
  const pointerRef    = usePointerGlow();
  const scrollProgress = useScrollProgress();
  const statsObs      = useInView(0.3);
  const radarObs      = useInView(0.2);
  const stepsObs      = useInView(0.2);
  const workflowObs   = useInView(0.15);
  const featObs       = useInView(0.1);
  const highlightsObs = useInView(0.15);
  const useCasesObs   = useInView(0.15);
  const valueObs      = useInView(0.18);
  const faqObs        = useInView(0.18);
  const ctaObs        = useInView(0.2);
  const footerObs     = useInView(0.2);
  const [openFaq, setOpenFaq] = useState(0);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark   = resolvedTheme === 'dark';
  const setIsDark = (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(isDark) : v;
    setTheme(next ? 'dark' : 'light');
  };

  const t = mkTheme(isDark);

  const typed    = 'AI.';
  const count10x = useCountUp(10,  1500, statsObs.inView);
  const count100 = useCountUp(100, 1800, statsObs.inView);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
  }, []);

  return (
    <div
      ref={pointerRef}
      className="pointer-glow-container landing-shell min-h-screen overflow-hidden"
      style={{ background: t.bg, color: t.text, transition: 'background 0.4s ease, color 0.3s ease' }}
    >
      <div
        className="landing-scroll-progress fixed top-0 left-0 h-[3px] z-[120] origin-left"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      {/* Pointer glow */}
      <div className="pointer-glow" aria-hidden="true" />

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true"
        style={{ backgroundImage: `radial-gradient(circle, ${t.dotGrid} 1px, transparent 1px)`, backgroundSize: '28px 28px', transition: 'background-image 0.4s ease' }} />

      <div className="landing-beams fixed inset-0 pointer-events-none" aria-hidden="true" />
      <div className="landing-scanlines fixed inset-0 pointer-events-none" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b"
        style={{ background: t.navBg, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderColor: t.border, transition: 'background 0.4s ease, border-color 0.4s ease' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-7xl mx-auto animate-fade-in">
          <div className="flex items-center gap-3 group cursor-default">
            <FlowaLogo size={32} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-body text-lg font-bold tracking-tight" style={{ color: t.text }}>Flowa</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(d => !d)}
              className="flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-300"
              style={{ borderColor: t.border, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: t.textMuted }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link
              to="/login"
              className="hover-underline text-xs px-4 py-2 rounded-lg font-medium uppercase tracking-widest transition-all duration-300"
              style={{ color: t.textMuted }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="landing-nav-cta btn-shimmer relative text-xs px-6 py-2.5 rounded-lg font-semibold uppercase tracking-widest transition-all duration-300 text-white border"
              style={{ background: '#F63049', borderColor: 'rgba(246,48,73,0.5)', boxShadow: '0 4px 24px rgba(246,48,73,0.28)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="spotlight-container relative z-10 max-w-6xl mx-auto text-center pt-24 md:pt-28 pb-20 px-5 sm:px-6"
        onMouseMove={handleMouseMove}
      >
        {/* Badge */}
        <div className="landing-chip relative inline-flex items-center gap-2.5 rounded-full px-5 py-2 mb-10 animate-scale-in cursor-default border"
          style={{ borderColor: 'rgba(246,48,73,0.28)', background: 'rgba(246,48,73,0.07)', backdropFilter: 'blur(8px)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#F63049' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#F63049' }} />
          </span>
          <span className="font-accent text-base" style={{ color: 'rgba(246,48,73,0.9)' }}>
            AI-Native Automation Platform
          </span>
        </div>

        {/* Headline */}
        <h1 className="landing-hero-title font-display font-bold leading-[1.03] mb-8" style={{ fontSize: 'clamp(2.45rem, 8.2vw, 7.25rem)' }}>
          <span className="block hero-text-reveal" style={{ color: t.text, animationDelay: '0.15s' }}>
            <span className="block sm:inline">Flowa</span>{' '}
            <span className="block sm:inline">automates work.</span>
          </span>
          <span className="block hero-text-reveal italic" style={{ color: t.text, animationDelay: '0.35s' }}>
            With{' '}
            <span className="not-italic" style={{ color: '#F63049' }}>
              {typed}<span className="typewriter-cursor">|</span>
            </span>
          </span>
        </h1>

        {/* Subline */}
        <p className="landing-hero-copy text-lg md:text-xl max-w-2xl mx-auto mb-14 font-body leading-relaxed hero-text-reveal font-light"
          style={{ color: t.textMuted, animationDelay: '0.6s' }}>
          Flowa is a visual, AI-powered workflow automation platform.
          Drag, connect, and let artificial intelligence debug your pipelines - all in real time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 hero-text-reveal" style={{ animationDelay: '0.8s' }}>
          <Link
            to="/register"
            className="cta-primary group relative inline-flex items-center gap-2 text-white px-8 py-4 rounded-xl text-sm font-bold transition-all duration-300"
            style={{ background: '#F63049', boxShadow: '0 8px 36px rgba(246,48,73,0.38)' }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Building Free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </Link>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 text-sm font-medium rounded-xl px-8 py-4 border transition-all duration-300"
            style={{ color: t.textMuted, borderColor: t.border, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(246,48,73,0.25)'; e.currentTarget.style.color = t.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}
          >
            Sign In <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>

        {/* Terminal preview */}
        <div className="mt-16 mx-auto max-w-3xl hero-text-reveal" style={{ animationDelay: '1s' }}>
          <div className="landing-terminal rounded-2xl overflow-hidden border"
            style={{ borderColor: t.border, background: t.cardBg, boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(246,48,73,0.06)' : '0 16px 48px rgba(0,0,0,0.08)', transition: 'background 0.4s ease' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b"
              style={{ borderColor: t.border, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#F63049', opacity: 0.8 }} />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs font-mono ml-2" style={{ color: t.textDim }}>workflow.flowa</span>
            </div>
            <div className="px-4 py-4 font-mono text-xs leading-relaxed text-left">
              <div className="flex items-center gap-2" style={{ color: t.textMuted }}>
                <Terminal size={12} style={{ color: '#F63049' }} />
                <span style={{ color: '#F63049' }}>flowa</span>
                <span style={{ color: t.textDim }}>run</span>
                <span style={{ color: '#fb7185' }}>--workflow</span>
                <span style={{ color: t.text }}>"email-campaign"</span>
              </div>
              <div className="mt-2 flex items-center gap-2" style={{ color: '#4ade80' }}>
                <Code2 size={12} /><span>OK 12 nodes executed in 340ms</span>
              </div>
              <div className="mt-1 ml-5" style={{ color: '#06B6D4' }}>-&gt; 3 branches run in parallel</div>
              <div className="mt-1 ml-5" style={{ color: t.textDim }}>-&gt; 0 errors - 2 retries resolved</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div ref={statsObs.ref} className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: `${count10x}x`, label: 'Faster Builds',  accent: '#F63049' },
            { value: `${count100}%`, label: 'Self-Hosted',     accent: '#06B6D4' },
            { value: '24/7',          label: 'Workflows',       accent: '#F63049' },
          ].map((stat, i) => (
            <div key={stat.label}
              className={`relative text-center transition-all duration-700 ${statsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              {i > 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-px -translate-x-4"
                  style={{ background: `linear-gradient(to bottom, transparent, ${t.border}, transparent)` }} />
              )}
              <div className="font-display text-3xl md:text-4xl font-extrabold mb-1" style={{ color: stat.accent }}>{stat.value}</div>
              <div className="text-xs font-medium uppercase tracking-widest" style={{ color: t.textDim }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Radar / Integrations showcase ── */}
      <section ref={radarObs.ref} className="landing-section relative z-10 py-20 overflow-hidden">
        <div className="text-center mb-4">
          <span className={`inline-block font-accent text-xl mb-1 transition-all duration-700 ${radarObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}>
            Integrations
          </span>
          <h2 className={`font-display text-3xl md:text-4xl font-bold mt-1 transition-all duration-700 delay-100 ${radarObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ color: t.text }}>
            Connects with your ecosystem
          </h2>
          <p className={`mt-3 text-sm font-light max-w-md mx-auto transition-all duration-700 delay-150 ${radarObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ color: t.textMuted }}>
            Plug into the tools your team already uses — no code required.
          </p>
        </div>

        {/* Radar canvas */}
        <div className={`relative mx-auto flex items-center justify-center transition-all duration-1000 ${radarObs.inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          style={{ width: '480px', height: '380px', maxWidth: '100%' }}>
          <Radar className="w-[380px] h-[380px]" />

          {radarIcons.map((item, i) => (
            <div key={i} className={`absolute ${item.pos}`}>
              <IconContainer icon={item.icon} text={item.text} delay={item.delay} isDark={isDark} />
            </div>
          ))}

          <div className="absolute z-50 flex flex-col items-center gap-1">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl border"
              style={{ background: isDark ? 'rgba(246,48,73,0.12)' : 'rgba(246,48,73,0.08)', borderColor: 'rgba(246,48,73,0.3)' }}>
              <FlowaLogo size={28} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F63049' }}>Flowa</span>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <section className="relative z-10 py-10 overflow-hidden border-y"
        style={{ borderColor: t.border, transition: 'border-color 0.4s ease' }}>
        <p className="text-center font-accent text-base mb-7" style={{ color: t.textDim }}>
          Connects with your favorite tools
        </p>
        <div className="marquee-track">
          <div className="marquee-content">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="marquee-item" title={item.name} style={{ color: item.color }}>
                <item.icon aria-hidden="true" /><span className="sr-only">{item.name}</span>
              </span>
            ))}
          </div>
          <div className="marquee-content" aria-hidden="true">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={`d-${i}`} className="marquee-item" title={item.name} style={{ color: item.color }}>
                <item.icon aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={stepsObs.ref} className="landing-section relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <span className={`inline-block font-accent text-xl mb-3 transition-all duration-700 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}>How it works</span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold leading-[1.15] mb-4 transition-all duration-700 delay-100 ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.text }}>
            Three steps to<br />
            <span className="italic" style={{ color: '#F63049' }}>automate anything.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className={`hidden md:block absolute top-14 left-[16%] right-[16%] h-px transition-all duration-1000 delay-500 ${stepsObs.inView ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
            <div className="h-full w-full animated-line" style={{ background: 'linear-gradient(90deg, rgba(246,48,73,0.4), rgba(6,182,212,0.25), rgba(246,48,73,0.08))' }} />
          </div>

          {steps.map((s, i) => (
            <div key={s.num}
              className={`relative group transition-all duration-700 rounded-2xl p-8 border ${stepsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${400 + i * 200}ms`, background: t.cardBg, borderColor: t.border }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = isDark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 12px 32px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <span className="absolute top-3 right-4 text-6xl font-bold font-display leading-none select-none" style={{ color: STEP_NUM_COLORS[i] }}>{s.num}</span>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border transition-all duration-300"
                style={{ background: i === 1 ? 'rgba(6,182,212,0.07)' : 'rgba(246,48,73,0.06)', borderColor: i === 1 ? 'rgba(6,182,212,0.15)' : 'rgba(246,48,73,0.15)' }}>
                <s.icon size={22} style={{ color: i === 1 ? '#06B6D4' : 'rgba(246,48,73,0.8)' }} />
              </div>
              <h3 className="font-display text-xl font-bold mb-3" style={{ color: t.text }}>{s.title}</h3>
              <p className="text-sm font-body leading-relaxed font-light" style={{ color: t.textMuted }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Workflow Animation ── */}
      <section ref={workflowObs.ref} className="landing-section relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span
            className={`inline-block font-accent text-xl mb-3 transition-all duration-700 ${workflowObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}
          >
            Live Preview
          </span>
          <h2
            className={`font-display text-4xl md:text-5xl font-bold leading-[1.15] mb-4 transition-all duration-700 delay-100 ${workflowObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.text }}
          >
            Watch a workflow<br />
            <span className="italic" style={{ color: '#F63049' }}>execute in real time.</span>
          </h2>
          <p
            className={`max-w-lg mx-auto font-body text-base font-light transition-all duration-700 delay-150 ${workflowObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ color: t.textMuted }}
          >
            Nodes fire in parallel, data flows between them, and every step is logged — exactly as you'd see it in the editor.
          </p>
        </div>

        <div
          className={`rounded-3xl border p-6 md:p-10 overflow-x-auto transition-all duration-700 delay-200 ${workflowObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: t.cardBg, borderColor: t.border }}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10b981' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#10b981' }} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#10b981' }}>
              Running
            </span>
            <span className="text-xs ml-auto font-mono" style={{ color: t.textDim }}>
              exec_a4f9c2 · 4 nodes active
            </span>
          </div>

          <WorkflowAnimation isDark={isDark} />
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${t.border}, transparent)` }} />
      </div>

      {/* ── Features ── */}
      <section ref={featObs.ref} className="landing-section relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-20">
          <span className={`inline-block font-accent text-xl mb-3 transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}>Core Capabilities</span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold leading-[1.15] mb-4 transition-all duration-700 delay-100 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.text }}>
            Everything you need.<br />
            <span className="italic" style={{ color: '#F63049' }}>Nothing you don't.</span>
          </h2>
          <p className={`max-w-lg mx-auto font-body text-base font-light transition-all duration-700 delay-200 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.textMuted }}>
            A complete toolkit for building, debugging, and deploying workflows at any scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title}
              className={`feature-card card-gradient-border group p-7 rounded-2xl border transition-all duration-700 ${featObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              onMouseMove={handleMouseMove}
              style={{ transitionDelay: `${300 + i * 100}ms`, background: t.cardBg, borderColor: t.border }}>
              <div className="feature-card-glow" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <f.icon size={20} className="text-white" />
                  </div>
                  <span className="text-3xl font-bold font-display leading-none select-none" style={{ color: 'rgba(246,48,73,0.07)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: t.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed font-body font-light" style={{ color: t.textMuted }}>{f.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                  style={{ color: '#F63049' }}>
                  Learn more <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Highlights ── */}
      <section ref={highlightsObs.ref} className="landing-section relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {platformHighlights.map((item, i) => {
            const accent = HIGHLIGHT_ACCENTS[i];
            return (
              <div key={item.title}
                className={`rounded-2xl p-6 border transition-all duration-700 ${highlightsObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 120}ms`, background: t.cardBg, borderColor: t.border }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = ''; }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ background: accent.bg, borderColor: accent.border }}>
                  <item.icon size={20} style={{ color: accent.color }} />
                </div>
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: t.text }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section ref={useCasesObs.ref} className="landing-section relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <span className={`inline-block font-accent text-xl mb-3 transition-all duration-700 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}>Use Cases</span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold leading-[1.15] mb-4 transition-all duration-700 delay-100 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.text }}>
            Built for real work.<br />
            <span className="italic" style={{ color: '#F63049' }}>Real automation.</span>
          </h2>
          <p className={`max-w-2xl mx-auto font-body text-base font-light transition-all duration-700 delay-150 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.textMuted }}>
            From customer communication to AI-assisted operations, Flowa helps teams automate repetitive work with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map((item, i) => (
            <div key={item.title}
              className={`rounded-2xl p-6 border transition-all duration-700 ${useCasesObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${250 + i * 120}ms`, background: t.cardBg, borderColor: t.border }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = ''; }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 border"
                style={{ background: 'rgba(246,48,73,0.08)', borderColor: 'rgba(246,48,73,0.15)' }}>
                <item.icon size={20} style={{ color: '#F63049' }} />
              </div>
              <h3 className="font-display text-lg font-bold mb-2" style={{ color: t.text }}>{item.title}</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: t.textMuted }}>{item.desc}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, ti) => (
                  <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TAG_CLASSES[ti % TAG_CLASSES.length]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Day One Value ── */}
      <section ref={valueObs.ref} className="landing-section relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className={`rounded-3xl p-8 md:p-10 border transition-all duration-700 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: t.cardBg, borderColor: t.border }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className={`inline-block font-accent text-xl mb-4 transition-all duration-700 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ color: 'rgba(246,48,73,0.75)' }}>What You Get</span>
              <h2 className={`font-display text-3xl md:text-4xl font-bold leading-[1.18] mb-4 transition-all duration-700 delay-100 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ color: t.text }}>
                Everything you need.<br />
                <span className="italic" style={{ color: '#F63049' }}>From day one.</span>
              </h2>
              <p className={`font-body text-base leading-relaxed font-light transition-all duration-700 delay-150 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ color: t.textMuted }}>
                Start small with one workflow, then scale to cross-team automation with visibility, control, and security built in.
              </p>
            </div>
            <div className="space-y-2.5">
              {dayOneChecklist.map((item, i) => (
                <div key={item}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3.5 border transition-all duration-700 ${valueObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${220 + i * 90}ms`, borderColor: t.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = i % 2 === 0 ? 'rgba(246,48,73,0.18)' : 'rgba(6,182,212,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}>
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: i % 2 === 0 ? 'rgba(246,48,73,0.75)' : 'rgba(6,182,212,0.75)' }} />
                  <span className="text-sm leading-relaxed font-light" style={{ color: t.textMuted }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section ref={faqObs.ref} className="landing-section relative z-10 max-w-4xl mx-auto px-6 pb-28">
        <div className="text-center mb-12">
          <span className={`inline-block font-accent text-xl mb-3 transition-all duration-700 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'rgba(246,48,73,0.75)' }}>FAQ</span>
          <h2 className={`font-display text-4xl md:text-5xl font-bold leading-[1.15] transition-all duration-700 delay-100 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ color: t.text }}>
            Questions teams ask before{' '}
            <span style={{ color: '#F63049' }}>launching</span>
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <button key={item.q}
                onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                className={`w-full text-left rounded-2xl p-5 border transition-all duration-500 ${faqObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${220 + idx * 100}ms`, background: t.faqBg(isOpen), borderColor: t.faqBorder(isOpen) }}>
                <div className="flex items-center justify-between gap-6">
                  <h3 className="font-display text-base md:text-lg font-bold" style={{ color: t.text }}>{item.q}</h3>
                  <span className="shrink-0" style={{ color: '#F63049' }}>{isOpen ? <Minus size={18} /> : <Plus size={18} />}</span>
                </div>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden text-sm leading-relaxed" style={{ color: t.textMuted }}>{item.a}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Manifesto ── */}
      <section className="landing-section relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center rounded-3xl p-10 md:p-14 border"
          style={{ background: t.cardBg, borderColor: t.border }}>
          <div>
            <span className="inline-block font-accent text-xl mb-6" style={{ color: 'rgba(246,48,73,0.75)' }}>Our Belief</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-[1.18] mb-6" style={{ color: t.text }}>
              We used to build things.<br />
              <span className="italic" style={{ color: '#F63049' }}>Then we automated them.</span>
            </h2>
            <p className="font-body font-light leading-relaxed text-sm mb-4" style={{ color: t.textMuted }}>
              A few years ago, teams spent weeks writing the same glue code — connecting APIs, retrying failed jobs, syncing data between tools.
            </p>
            <p className="font-body font-light leading-relaxed text-sm" style={{ color: t.textMuted }}>
              We realised the problem wasn't the tools — it was the missing orchestration layer. So we built Flowa: one visual canvas to design, run, and monitor any workflow.
            </p>
          </div>
          <div className="pl-0 md:pl-10 border-t md:border-t-0 md:border-l pt-8 md:pt-0" style={{ borderColor: t.border }}>
            <blockquote className="font-display text-2xl md:text-3xl italic font-bold leading-relaxed mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.75)' }}>
              "Teams do not want automation. They want results, reliably."
            </blockquote>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(246,48,73,0.6)' }}>Flowa Team</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaObs.ref} className="relative z-10 overflow-hidden">
        <div className="cta-full-section relative">
          {/* Radial mesh top glow */}
          <div className="cta-radial-mesh" aria-hidden="true" />

          {/* Decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
            <div style={{ width: 700, height: 700, borderRadius: '50%', border: '1px solid rgba(246,48,73,0.06)', position: 'absolute' }} />
            <div style={{ width: 950, height: 950, borderRadius: '50%', border: '1px solid rgba(6,182,212,0.04)', position: 'absolute' }} />
            <div style={{ width: 1200, height: 1200, borderRadius: '50%', border: '1px solid rgba(246,48,73,0.03)', position: 'absolute' }} />
          </div>

          <div className={`max-w-4xl mx-auto px-6 py-32 md:py-44 text-center relative z-10 transition-all duration-1000 ${ctaObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ borderColor: 'rgba(246,48,73,0.3)', background: 'rgba(246,48,73,0.08)' }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#F63049' }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#F63049' }} />
              </span>
              <span className="font-accent text-base" style={{ color: 'rgba(246,48,73,0.9)' }}>Free to start · Self-hosted</span>
            </div>

            <h2
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6"
              style={{ color: t.text }}
            >
              Ready to automate?<br />
              <span className="italic" style={{ color: '#F63049' }}>Let's build.</span>
            </h2>
            <p className="mb-10 max-w-md mx-auto font-body text-base font-light" style={{ color: t.textMuted }}>
              Create your free account and start building intelligent workflows in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"
                className="cta-primary group relative inline-flex items-center gap-2 text-white px-10 py-4 rounded-xl text-sm font-bold transition-all duration-300"
                style={{ background: '#F63049', boxShadow: '0 8px 40px rgba(246,48,73,0.45)' }}>
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
                style={{ color: t.textMuted }}
                onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
                <Sparkles size={14} /> Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer ref={footerObs.ref} className="relative z-10 py-12 border-t" style={{ borderColor: t.border }}>
        <div className={`max-w-7xl mx-auto px-8 transition-all duration-700 ${footerObs.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <FlowaLogo size={22} />
              <span className="font-body text-sm font-medium" style={{ color: t.textDim }}>
                Flowa &copy; {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex items-center gap-6">
              {['Features', 'Integrations', 'Docs', 'GitHub'].map(label => (
                <span key={label} className="text-xs font-body font-light cursor-default transition-colors duration-200"
                  style={{ color: t.textDim }}
                  onMouseEnter={e => (e.currentTarget.style.color = t.textMuted)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}>
                  {label}
                </span>
              ))}
            </div>
            <span className="text-xs font-body font-light uppercase tracking-widest" style={{ color: t.textDim }}>
              AI-Native Workflow Automation
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

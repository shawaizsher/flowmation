import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import FluxionLogo from '../components/FluxionLogo';
import IntegrationCard from '../components/IntegrationCard';
import ScrollChoreography from '../components/ScrollChoreography';
import WorkflowShowcase from '../components/WorkflowShowcase';
import './vesper-landing.css';

const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4';

const NAV_ITEMS = [
  { label: 'Features', href: '#benefits' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'FAQs', href: '#faqs' },
];

const BENEFITS = [
  {
    title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop canvas powered by ReactFlow. Connect nodes, configure triggers, and deploy automation — no code required.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <path d="M10 6.5h4.5a2 2 0 012 2V14" />
      </svg>
    ),
  },
  {
    title: 'AI-Powered Debugger',
    desc: 'Describe what you want in plain English. Our AI generates, debugs, and optimizes your workflows automatically.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 014 4v1H8V6a4 4 0 014-4z" />
        <rect x="5" y="7" width="14" height="12" rx="3" />
        <path d="M9 12h6M9 15h4" />
        <path d="M2 10h3M19 10h3M2 14h3M19 14h3" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Collaboration',
    desc: 'See cursors, selections, and changes as they happen. Work with your team on the same canvas simultaneously.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: '50+ Integrations',
    desc: 'Connect Slack, GitHub, Stripe, OpenAI, databases, and dozens more. Every tool your team already uses.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: '01', title: 'Design', desc: 'Drag nodes onto the visual canvas. Configure triggers, logic branches, and actions with a few clicks.' },
  { num: '02', title: 'Connect', desc: 'Link your tools — APIs, databases, AI models, messaging platforms. Credentials are encrypted and stored securely.' },
  { num: '03', title: 'Deploy', desc: 'Activate your workflow. It runs on schedule, webhook, or manual trigger. Monitor every execution in real time.' },
];

const FAQS = [
  { q: 'What is Flowmation?', a: 'Flowmation is a visual workflow automation platform that lets you build, connect, and deploy intelligent automations using a drag-and-drop canvas. It combines a powerful execution engine with AI-powered debugging and real-time multiplayer collaboration.' },
  { q: 'Do I need coding experience?', a: 'Not at all. Flowmation is designed for both technical and non-technical users. The visual builder lets you create complex workflows by connecting nodes — no code required. For advanced users, we support custom JavaScript nodes and API integrations.' },
  { q: 'How does the AI debugger work?', a: 'Describe what your workflow should do in plain English, and our AI agent will generate, debug, or optimize it for you. It can identify broken connections, suggest missing nodes, and fix execution errors automatically.' },
  { q: 'What integrations are supported?', a: 'Flowmation supports 50+ integrations including Slack, GitHub, Stripe, OpenAI, Google Sheets, PostgreSQL, Redis, Telegram, and many more. You can also connect any service via HTTP/webhook nodes.' },
  { q: 'Is my data secure?', a: 'Yes. All credentials are encrypted at rest using AES-256. Workflows run in isolated environments, and we never store your API responses. Self-hosted deployment is available for Enterprise plans.' },
];

function SparkleIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 24 24" fill="white" className="badge-star">
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.body.classList.add('vesper-page');
    document.title = 'Flowmation — AI-Powered Workflow Automation';

    return () => {
      document.body.classList.remove('vesper-page', 'menu-open');
      document.title = prev;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.appear');
    const handler = function (this: HTMLElement) { this.classList.add('is-in'); };
    els.forEach((el) => el.addEventListener('animationend', handler, { once: true }));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.forEach((el) => {
          const anims = el.getAnimations();
          if (!anims.some((a) => a.playState === 'running' || a.playState === 'finished')) el.classList.add('is-in');
        });
      });
    });
    return () => { els.forEach((el) => el.removeEventListener('animationend', handler)); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const mq = window.matchMedia('(min-width: 901px)');
    const onResize = () => { if (mq.matches) setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onResize);
    return () => { window.removeEventListener('keydown', onKey); mq.removeEventListener('change', onResize); };
  }, []);

  useEffect(() => { document.body.classList.toggle('menu-open', menuOpen); }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <div className="grain" />

      {/* ── Fixed Header ── */}
      <header className={`vp-header${scrolled ? ' vp-header--solid' : ''}`}>
        <a className="logo appear appear--scale" href="#top" style={{ '--d': '0.08s' } as React.CSSProperties}>
          <FluxionLogo size={28} />
          <span>Flowmation</span>
        </a>

        <nav id="site-nav" aria-label="Primary">
          {NAV_ITEMS.map((item, i) => (
            <a key={item.href} href={item.href} className={`nav-pill appear ${i % 2 === 0 ? 'appear--scale' : 'appear--soft'}`}
              style={{ '--d': `${0.16 + i * 0.12}s` } as React.CSSProperties} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
        </nav>

        <Link to="/register" className="btn btn-solid header-cta appear appear--scale" style={{ '--d': '0.34s' } as React.CSSProperties}>
          Get Started
        </Link>

        <button className="burger appear appear--scale" style={{ '--d': '0.34s' } as React.CSSProperties}
          onClick={() => setMenuOpen((p) => !p)} aria-controls="site-nav" aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          <div className="burger-lines"><span className="burger-line" /><span className="burger-line" /><span className="burger-line" /></div>
        </button>
      </header>

      <div className="menu-backdrop" onClick={closeMenu} />

      {/* ── Hero ── */}
      <section className="vp-hero" id="top">
        <div className="hero-bg"><video autoPlay muted loop playsInline src={VIDEO_SRC} /></div>
        <div className="hero-bg-scrim" />
        <div className="hero-copy">
          <div className="badge appear appear--pop" style={{ '--d': '0.22s' } as React.CSSProperties}>
            <SparkleIcon /> AI-Powered Workflow Automation
          </div>
          <h1>
            <span className="headline-line appear appear--mask" style={{ '--d': '0.42s' } as React.CSSProperties}>
              Automate <em>any workflow</em>
            </span>
            <span className="headline-line appear appear--mask" style={{ '--d': '0.62s' } as React.CSSProperties}>
              in minutes, not months.
            </span>
          </h1>
          <p className="lede appear appear--soft" style={{ '--d': '0.82s', animationDuration: '1.25s' } as React.CSSProperties}>
            Build, connect, and deploy intelligent workflows from a visual canvas. Let AI handle the complexity while you focus on what matters.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-solid appear appear--btn" style={{ '--d': '0.96s' } as React.CSSProperties}>
              Start Building — Free
            </Link>
            <a href="#how-it-works" className="btn btn-hero-ghost appear appear--side" style={{ '--d': '1.10s' } as React.CSSProperties}>
              See How It Works
            </a>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat appear appear--stat" style={{ '--d': '1.12s' } as React.CSSProperties}>
            <span className="stat-num">50+</span> integrations
          </div>
          <div className="stat appear appear--stat" style={{ '--d': '1.28s' } as React.CSSProperties}>
            <span className="stat-num">10x</span> faster than coding
          </div>
          <div className="stat appear appear--stat" style={{ '--d': '1.44s' } as React.CSSProperties}>
            <span className="stat-num">&infin;</span> workflows
          </div>
        </div>
      </section>

      {/* ── Scroll Choreography ── */}
      <ScrollChoreography />

      {/* ── Benefits ── */}
      <section className="vp-section" id="benefits">
        <div className="section-inner">
          <p className="section-eyebrow reveal">Why Flowmation</p>
          <h2 className="section-title reveal">Everything you need to automate at scale</h2>
          <p className="section-sub reveal">From simple tasks to complex multi-step pipelines — build it visually, deploy it instantly.</p>
          <div className="benefits-grid">
            {BENEFITS.map((b, i) => (
              <div key={i} className="benefit-card reveal" style={{ '--reveal-d': `${i * 0.1}s` } as React.CSSProperties}>
                <div className="benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integration Card ── */}
      <section className="vp-section vp-section--alt" id="integrations">
        <div className="section-inner">
          <p className="section-eyebrow reveal">Integrations</p>
          <h2 className="section-title reveal">Connect everything your team uses</h2>
          <p className="section-sub reveal">50+ pre-built connectors for the tools you already rely on. One platform, zero context switching.</p>
          <IntegrationCard />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="vp-section" id="how-it-works">
        <div className="section-inner">
          <p className="section-eyebrow reveal">How It Works</p>
          <h2 className="section-title reveal">Three steps to your first automation</h2>
          <div className="steps-row">
            {STEPS.map((s, i) => (
              <div key={i} className="step-card reveal" style={{ '--reveal-d': `${i * 0.12}s` } as React.CSSProperties}>
                <span className="step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="steps-cta reveal" style={{ '--reveal-d': '0.36s' } as React.CSSProperties}>
            <Link to="/register" className="btn btn-solid">Start Building — Free</Link>
          </div>
        </div>
      </section>

      {/* ── Example Automation ── */}
      <section className="vp-section" id="example">
        <div className="section-inner">
          <p className="section-eyebrow reveal">See It In Action</p>
          <h2 className="section-title reveal">One platform, every team</h2>
          <p className="section-sub reveal">Real workflows built in Flowmation — pick a team to see how they automate their busywork.</p>
          <WorkflowShowcase />
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="vp-section vp-section--alt" id="faqs">
        <div className="section-inner section-inner--narrow">
          <p className="section-eyebrow reveal">FAQs</p>
          <h2 className="section-title reveal">Frequently asked questions</h2>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div key={i} className={`faq-item reveal${openFaq === i ? ' faq-item--open' : ''}`}
                style={{ '--reveal-d': `${i * 0.08}s` } as React.CSSProperties}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <span>{f.q}</span>
                  <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="vp-cta-banner" id="start">
        <div className="section-inner">
          <h2 className="reveal">Ready to automate?</h2>
          <p className="reveal" style={{ '--reveal-d': '0.1s' } as React.CSSProperties}>
            Join teams already building smarter workflows with Flowmation.
          </p>
          <div className="reveal" style={{ '--reveal-d': '0.2s' } as React.CSSProperties}>
            <Link to="/register" className="btn btn-solid btn-lg">Get Started — It's Free</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="vp-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <FluxionLogo size={24} />
            <span>Flowmation</span>
          </div>
          <div className="footer-links">
            <a href="#benefits">Features</a>
            <a href="#integrations">Integrations</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#faqs">FAQs</a>
            <Link to="/login">Sign In</Link>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} Flowmation. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

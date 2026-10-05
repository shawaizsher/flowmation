import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import FluxionLogo from '../components/FluxionLogo';
import IntegrationCard from '../components/IntegrationCard';
import WorkflowShowcase from '../components/WorkflowShowcase';
import HowItWorksPins from '../components/HowItWorksPins';
import Hero from '../components/landing/Hero';
import Marquee from '../components/landing/Marquee';
import FeatureSlider from '../components/landing/FeatureSlider';
import TiltStats from '../components/landing/TiltStats';
import ToolsBento from '../components/landing/ToolsBento';
import './vesper-landing.css';
import './landing-next.css';

const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'Tools', href: '#tools' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Use Cases', href: '#example' },
  { label: 'FAQs', href: '#faqs' },
];

const FAQS = [
  { q: 'What is Flowmation?', a: 'Flowmation is a visual workflow automation platform that lets you build, connect, and deploy intelligent automations using a drag-and-drop canvas. It combines a powerful execution engine with AI-powered debugging and real-time multiplayer collaboration.' },
  { q: 'Do I need coding experience?', a: 'Not at all. Flowmation is designed for both technical and non-technical users. The visual builder lets you create complex workflows by connecting nodes — no code required. For advanced users, we support custom JavaScript nodes and API integrations.' },
  { q: 'How does the AI debugger work?', a: 'Describe what your workflow should do in plain English, and our AI agent will generate, debug, or optimize it for you. It can identify broken connections, suggest missing nodes, and fix execution errors automatically.' },
  { q: 'What integrations are supported?', a: 'Flowmation supports 50+ integrations including Slack, GitHub, Stripe, OpenAI, Google Sheets, PostgreSQL, Redis, Telegram, and many more. You can also connect any service via HTTP/webhook nodes.' },
  { q: 'Is my data secure?', a: 'Workspaces are access-controlled with Owner, Admin, Editor and Viewer roles, and credentials live in a dedicated manager rather than inside your workflow definitions. Risky steps can be gated behind a human approval before they run.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const prev = document.title;
    document.body.classList.add('vesper-page');
    document.title = 'Flowmation';

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

  // Scrollspy: mark the nav link for the section crossing the middle of the viewport.
  useEffect(() => {
    const ids = NAV_ITEMS.map((n) => n.href.slice(1));
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => obs.observe(s));
    const onTop = () => { if (window.scrollY < 200) setActiveId(''); };
    window.addEventListener('scroll', onTop, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener('scroll', onTop); };
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
      <a href="#features" className="skip-link">Skip to content</a>
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
              style={{ '--d': `${0.16 + i * 0.12}s` } as React.CSSProperties} onClick={closeMenu}
              aria-current={activeId === item.href.slice(1) ? 'location' : undefined}>
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

      <Hero />

      <Marquee />

      {/* ── Features: horizontal slide ── */}
      <div className="fx-features-head" id="features">
        <div className="section-inner">
          <p className="section-eyebrow reveal">Platform</p>
          <h2 className="section-title reveal">Build. Debug. Connect. Deploy.</h2>
          <p className="section-sub reveal">Four stages, one canvas. Keep scrolling to slide through the platform.</p>
        </div>
      </div>
      <FeatureSlider />

      {/* ── Tools ── */}
      <section className="vp-section" id="tools">
        <div className="section-inner section-inner--wide">
          <p className="section-eyebrow reveal">The toolkit</p>
          <h2 className="section-title reveal">Everything inside Flowmation</h2>
          <p className="section-sub reveal">One workspace for building, testing, shipping and running automations with your team.</p>
          <ToolsBento />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="vp-section" id="numbers">
        <div className="section-inner">
          <p className="section-eyebrow reveal">Under the hood</p>
          <h2 className="section-title reveal">Built for teams that ship</h2>
          <p className="section-sub reveal">Roles, triggers and integrations are built in, not bolted on.</p>
          <TiltStats />
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
          <h2 className="section-title reveal">Five steps to your first automation</h2>
          <HowItWorksPins />
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
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                // The reveal wrapper keeps a static className: the IntersectionObserver adds "revealed"
                // imperatively, and React would strip it if it lived on the toggling .faq-item.
                <div key={i} className="faq-reveal reveal" style={{ '--reveal-d': `${i * 0.08}s` } as React.CSSProperties}>
                  <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
                    <button
                      className="faq-q"
                      id={`faq-q-${i}`}
                      aria-expanded={open}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      <span className="faq-idx fx-mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="faq-q-text">{f.q}</span>
                      <span className="faq-toggle" aria-hidden="true" />
                    </button>
                    <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                      <div className="faq-a-inner"><p>{f.a}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            <a href="#features">Features</a>
            <a href="#tools">Tools</a>
            <a href="#integrations">Integrations</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#example">Use Cases</a>
            <a href="#faqs">FAQs</a>
            <Link to="/login">Sign In</Link>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} Flowmation. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

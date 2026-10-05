import { useLayoutEffect, useRef, useState } from 'react';

interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: 'Design your flow',
    description: 'Drag nodes onto the visual canvas. Wire up triggers, branches, and actions — no code needed.',
  },
  {
    title: 'Connect your tools',
    description: 'Link Slack, GitHub, Stripe, OpenAI, and 50+ other integrations from one credentials manager.',
  },
  {
    title: 'Let AI debug it',
    description: 'Describe what should happen. Our AI finds broken connections and fixes them automatically.',
  },
  {
    title: 'Deploy instantly',
    description: 'Activate on a schedule, webhook, or manual trigger. Every run is logged in real time.',
  },
  {
    title: 'Scale with your team',
    description: 'Invite collaborators with roles, comment on nodes, and ship automations together.',
  },
];

function Pin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
    </svg>
  );
}

/** Builds the connector from measured card positions, so it always meets the pins whatever the card heights. */
function buildPath(container: HTMLElement, cards: HTMLElement[]) {
  const box = container.getBoundingClientRect();
  const pts = cards.map((c) => {
    const pin = c.querySelector('.hiw-card__pin') as HTMLElement | null;
    const r = (pin ?? c).getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  });
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dy = (b.y - a.y) * 0.55;
    d += ` C ${a.x.toFixed(1)} ${(a.y + dy).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - dy).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

export default function HowItWorksPins() {
  const innerRef = useRef<HTMLOListElement>(null);
  const [path, setPath] = useState({ d: '', w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>('.hiw-card'));
      setPath({ d: buildPath(el, cards), w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="hiw-pins">
      <div className="hiw-pins__grid" aria-hidden="true" />
      <ol ref={innerRef} className="hiw-pins__inner">
        {path.d && (
          <svg className="hiw-pins__svg" viewBox={`0 0 ${path.w} ${path.h}`} aria-hidden="true">
            <path d={path.d} className="hiw-pins__path" />
          </svg>
        )}

        {STEPS.map((step, i) => (
          <li key={step.title} className={`hiw-card hiw-card--${i % 2 === 0 ? 'left' : 'right'}`} style={{ '--i': i } as React.CSSProperties}>
            <div className="hiw-card__frame">
              <Pin className="hiw-card__pin" />
              <div className="hiw-card__body">
                <span className="hiw-card__number">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="hiw-card__title">{step.title}</h3>
                <p className="hiw-card__desc">{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

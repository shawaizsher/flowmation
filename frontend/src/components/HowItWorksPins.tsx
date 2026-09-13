import { LazyMotion, domAnimation, m } from 'framer-motion';

interface Step {
  title: string;
  description: string;
}

interface StepPosition {
  className?: string;
  rotate?: string;
}

const STEPS: Step[] = [
  {
    title: 'Design Your Flow',
    description: 'Drag nodes onto the visual canvas. Wire up triggers, branches, and actions — no code needed.',
  },
  {
    title: 'Connect Your Tools',
    description: 'Link Slack, GitHub, Stripe, OpenAI, and 50+ other integrations. Credentials stay encrypted.',
  },
  {
    title: 'Let AI Debug It',
    description: 'Describe what should happen. Our AI finds broken connections and fixes them automatically.',
  },
  {
    title: 'Deploy Instantly',
    description: 'Activate on a schedule, webhook, or manual trigger. Every run is logged in real time.',
  },
  {
    title: 'Scale With Your Team',
    description: 'Invite collaborators, watch cursors move live, and ship automations together.',
  },
];

const CARD_POSITIONS: StepPosition[] = [
  { className: 'hiw-card--p1', rotate: 'hiw-card--rot-r' },
  { className: 'hiw-card--p2', rotate: 'hiw-card--rot-l' },
  { className: 'hiw-card--p3', rotate: 'hiw-card--rot-r' },
  { className: 'hiw-card--p4', rotate: 'hiw-card--rot-l' },
  { className: 'hiw-card--p5', rotate: 'hiw-card--rot-r' },
];

function Pin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
    </svg>
  );
}

function StepCard({ number, title, description, position }: { number: string; title: string; description: string; position: StepPosition }) {
  return (
    <div className={`hiw-card ${position.className || ''} ${position.rotate || ''}`}>
      <div className="hiw-card__frame">
        <Pin className="hiw-card__pin" />
        <div className="hiw-card__body">
          <span className="hiw-card__number">{number}</span>
          <h3 className="hiw-card__title">{title}</h3>
          <p className="hiw-card__desc">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPins() {
  const pathD =
    'M 130 90 C 260 90, 300 190, 460 190' +
    ' C 620 190, 300 260, 130 330' +
    ' C 130 440, 380 490, 560 490' +
    ' C 720 490, 300 560, 130 610';

  return (
    <LazyMotion features={domAnimation}>
      <div className="hiw-pins">
        <div className="hiw-pins__grid" />
        <div className="hiw-pins__inner">
          <svg className="hiw-pins__svg" viewBox="0 0 720 720" preserveAspectRatio="none">
            <m.path
              d={pathD}
              stroke="rgba(212, 80, 96, 0.4)"
              strokeWidth="2"
              strokeDasharray="8 6"
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -140 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </svg>

          {STEPS.map((step, i) => (
            <StepCard
              key={step.title}
              number={`0${i + 1}`}
              title={step.title}
              description={step.description}
              position={CARD_POSITIONS[i]}
            />
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}

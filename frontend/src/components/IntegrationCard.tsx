import { useId } from 'react';
import { motion } from 'framer-motion';
import FluxionLogo from './FluxionLogo';

interface IntegrationItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
  path: string;
  delay: number;
}

const SlackIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const GmailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </svg>
);

const StripeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.144l-.892 5.56C4.57 22.757 7.498 24 11.265 24c2.585 0 4.731-.626 6.228-1.764 1.644-1.243 2.507-3.06 2.507-5.418 0-4.1-2.516-5.807-6.024-7.668z" />
  </svg>
);

const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const PostgresIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.128 0a10.134 10.134 0 0 0-2.755.403l-.063.02A10.922 10.922 0 0 0 12.6.258C11.422.238 10.41.524 9.594 1 8.79.721 7.122.24 5.364.336 4.14.403 2.804.775 1.814 1.82.824 2.865.35 4.482.455 6.682c.03.607.203 1.597.49 2.879s.732 2.74 1.352 4.234c.62 1.495 1.27 2.726 2.14 3.6a3.37 3.37 0 0 0 1.076.755c.298.147.62.25.994.222.745-.056 1.263-.55 1.61-1.02.138-.188.261-.39.373-.6a5.21 5.21 0 0 0 1.747.314l.29-.001c.265-.006.53-.028.79-.067a4.726 4.726 0 0 0-.065.655v.024c-.037.467-.099 1.08.196 1.621.303.555.935.927 1.932.927 1.148 0 1.948-.374 2.477-.96.53-.588.804-1.386.95-2.252.072-.428.118-.905.152-1.434l.003-.022.01-.066.003-.007a.3.3 0 0 1 .013-.053c.04-.112.09-.182.127-.22a.455.455 0 0 1 .106-.084l.01-.001c.376.084.87.127 1.461.073.601-.054 1.287-.236 1.988-.645.702-.41 1.452-1.08 2.084-2.14a.446.446 0 0 0-.18-.615.456.456 0 0 0-.62.176c-.558.937-1.182 1.505-1.756 1.84-.574.336-1.104.44-1.562.487-.46.046-.82.006-1.09-.069l-.016-.005c.263-.38.51-.91.64-1.64.143-.81.122-1.406.02-2.007-.053-.315-.126-.622-.197-.937-.07-.312-.138-.632-.18-.984a6.37 6.37 0 0 1 .012-1.642c.092-.582.253-1.04.477-1.385.195-.301.457-.555.883-.67.376-.1.878-.071 1.553.213a.446.446 0 0 0 .574-.235.446.446 0 0 0-.233-.573c-.818-.346-1.538-.42-2.153-.258-.616.162-1.056.544-1.368 1.025-.311.48-.504 1.059-.61 1.729a7.292 7.292 0 0 0-.014 1.883c.047.405.124.748.196 1.068s.14.616.186.895c.092.548.1 1.022-.023 1.717-.1.569-.288.93-.475 1.168-.09.113-.18.198-.259.261a.67.67 0 0 1-.073.053 3.384 3.384 0 0 1-.15-.19c-.365-.512-.571-1.23-.63-2.197-.03-.493-.011-1.07.001-1.73.012-.658.017-1.398-.052-2.165-.137-1.533-.567-3.247-1.815-4.594a7.13 7.13 0 0 0-.847-.777A6.252 6.252 0 0 0 17.128 0z" />
  </svg>
);

const integrations: IntegrationItem[] = [
  { id: 'slack', icon: SlackIcon, x: 110, y: 90, path: 'M 270 205 V 105 Q 270 90 255 90 H 110', delay: 0.1 },
  { id: 'github', icon: GitHubIcon, x: 360, y: 70, path: 'M 294 205 V 85 Q 294 70 309 70 H 360', delay: 0.2 },
  { id: 'gmail', icon: GmailIcon, x: 160, y: 205, path: 'M 250 205 H 160', delay: 0.3 },
  { id: 'stripe', icon: StripeIcon, x: 480, y: 205, path: 'M 314 205 H 480', delay: 0.4 },
  { id: 'openai', icon: OpenAIIcon, x: 282, y: 360, path: 'M 282 205 V 360', delay: 0.6 },
  { id: 'postgres', icon: PostgresIcon, x: 460, y: 340, path: 'M 314 215 V 325 Q 314 340 329 340 H 460', delay: 0.7 },
];

function AnimatedPath({ d, id }: { d: string; id: string }) {
  return (
    <>
      <path d={d} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
      <motion.path
        d={d}
        stroke={`url(#${id})`}
        strokeWidth="2"
        fill="none"
        strokeDasharray="40 160"
        initial={{ strokeDashoffset: 200 }}
        animate={{ strokeDashoffset: -200 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
      />
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </>
  );
}

export default function IntegrationCard() {
  const containerId = useId();

  return (
    <div className="integration-card-wrapper reveal">
      <div className="integration-card">
        <div className="integration-visual">
          {/* Dot grid background */}
          <div className="integration-dots" />
          <div className="integration-gradient-overlay" />

          <div className="integration-content">
            {/* SVG connection lines */}
            <svg
              className="integration-lines"
              viewBox="0 0 564 410"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {integrations.map((item) => (
                <AnimatedPath key={item.id} d={item.path} id={`${containerId}-${item.id}`} />
              ))}
            </svg>

            {/* Center Fluxion logo */}
            <div className="integration-center">
              <div className="integration-center-inner">
                <FluxionLogo size={32} />
              </div>
              <motion.div
                className="integration-pulse"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>

            {/* Peripheral integration icons */}
            {integrations.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  className="integration-node"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: item.delay }}
                  style={{
                    left: `${(item.x / 564) * 100}%`,
                    top: `${(item.y / 410) * 100}%`,
                  }}
                >
                  <Icon className="integration-node-icon" />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="integration-body">
          <h3>Seamless Integrations</h3>
          <p>Connect Slack, GitHub, Gmail, Stripe, OpenAI, databases, and dozens more — keep your workflows unified without switching between platforms.</p>
          <a href="#benefits" className="btn btn-solid integration-cta">Explore Integrations</a>
        </div>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Zap, Layers, BrainCircuit, Mail, Database } from 'lucide-react';

const NW = 130; // node width
const NH = 52;  // node height

const NODES = [
  { id: 'n1', x: 15,  y: 108, label: 'Webhook',   sub: 'HTTP trigger', Icon: Zap,          color: '#F63049', bg: 'rgba(246,48,73,0.1)'  },
  { id: 'n2', x: 195, y: 108, label: 'Transform', sub: 'Map fields',   Icon: Layers,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'n3', x: 375, y: 108, label: 'AI Agent',  sub: 'Run model',    Icon: BrainCircuit,  color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
  { id: 'n4', x: 555, y: 108, label: 'Notify',    sub: 'Send email',   Icon: Mail,          color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { id: 'n5', x: 195, y: 225, label: 'Log to DB', sub: 'PostgreSQL',   Icon: Database,      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

// Edge connection point math (NW=130, NH=52):
// right-center of node (x,y) = (x+130, y+26)
// bottom-center          = (x+65,  y+52)
// left-center            = (x,     y+26)
// top-center             = (x+65,  y)
const EDGES = [
  { id: 'e1', x1: 145, y1: 134, x2: 195, y2: 134, isV: false, dur: 1.5, delay: 0   }, // n1 → n2
  { id: 'e2', x1: 325, y1: 134, x2: 375, y2: 134, isV: false, dur: 1.5, delay: 0.5 }, // n2 → n3
  { id: 'e3', x1: 505, y1: 134, x2: 555, y2: 134, isV: false, dur: 1.5, delay: 1.0 }, // n3 → n4
  { id: 'e4', x1: 260, y1: 160, x2: 260, y2: 225, isV: true,  dur: 1.2, delay: 0.6 }, // n2 ↓ n5
];

const CANVAS_W = 700;
const CANVAS_H = 295;

export default function WorkflowAnimation({ isDark }: { isDark: boolean }) {
  const edgeColor = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.12)';
  const textMain  = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.82)';
  const textSub   = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.38)';

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: '100%' }}
    >
      {/* ── Nodes (HTML so Lucide icons render naturally) ── */}
      {NODES.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute flex items-center gap-2.5 px-3 rounded-xl border"
          style={{
            left: node.x, top: node.y,
            width: NW, height: NH,
            background: node.bg,
            borderColor: node.color + '38',
          }}
        >
          {/* Icon box */}
          <div
            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0 border"
            style={{ background: node.bg, borderColor: node.color + '55' }}
          >
            <node.Icon size={13} style={{ color: node.color }} />
          </div>

          {/* Labels */}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: textMain }}>
              {node.label}
            </div>
            <div className="text-[9px] leading-tight mt-[2px] truncate" style={{ color: textSub }}>
              {node.sub}
            </div>
          </div>

          {/* Status pulse dot */}
          <div
            className="w-[6px] h-[6px] rounded-full shrink-0 animate-pulse"
            style={{ background: node.color }}
          />
        </motion.div>
      ))}

      {/* ── SVG overlay: edges + animated dots ── */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Arrowhead */}
          <marker id="wf-arrow" viewBox="0 0 8 8" refX="7" refY="4"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 7 4 L 0 7 z" fill={edgeColor} />
          </marker>

          {/* Glow filter for dot */}
          <filter id="dot-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {EDGES.map((e, i) => {
          const len = e.isV ? (e.y2 - e.y1) : (e.x2 - e.x1);
          const d = `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;

          // 4-keyframe arrays so lengths always match
          const xFrames = e.isV
            ? [e.x1, e.x1, e.x1, e.x1]
            : [e.x1, e.x1, e.x2, e.x2];
          const yFrames = e.isV
            ? [e.y1, e.y1, e.y2, e.y2]
            : [e.y1, e.y1, e.y1, e.y1];

          return (
            <g key={e.id}>
              {/* Edge line — draws itself on mount */}
              <motion.path
                d={d}
                fill="none"
                stroke={edgeColor}
                strokeWidth="1.5"
                strokeDasharray={`${len} ${len}`}
                markerEnd="url(#wf-arrow)"
                initial={{ strokeDashoffset: len }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
              />

              {/* Traveling pulse dot */}
              <motion.g
                initial={{ x: e.x1, y: e.y1, opacity: 0 }}
                animate={{
                  x: xFrames,
                  y: yFrames,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: e.dur,
                  times: [0, 0.07, 0.82, 1],
                  repeat: Infinity,
                  delay: e.delay,
                  ease: 'linear',
                  repeatDelay: 1.8,
                }}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={3.5}
                  fill="#F63049"
                  filter="url(#dot-glow)"
                />
              </motion.g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

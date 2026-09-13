import { useEffect, useRef, useState } from 'react';

interface WorkflowNode {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  x: number;
  y: number;
  color: string;
}

interface WorkflowEdge {
  from: string;
  to: string;
}

const NODES: WorkflowNode[] = [
  { id: 'trigger', label: 'New Sign-Up', sublabel: 'Webhook Trigger', icon: '⚡', x: 80, y: 160, color: '#800020' },
  { id: 'enrich', label: 'Enrich Data', sublabel: 'Clearbit API', icon: '🔍', x: 300, y: 80, color: '#D45060' },
  { id: 'segment', label: 'Segment User', sublabel: 'AI Classifier', icon: '🧠', x: 300, y: 240, color: '#800020' },
  { id: 'email', label: 'Welcome Email', sublabel: 'SendGrid', icon: '✉️', x: 530, y: 80, color: '#D45060' },
  { id: 'slack', label: 'Notify Team', sublabel: 'Slack #sales', icon: '💬', x: 530, y: 240, color: '#800020' },
  { id: 'crm', label: 'Create Contact', sublabel: 'HubSpot CRM', icon: '📇', x: 750, y: 160, color: '#D45060' },
];

const EDGES: WorkflowEdge[] = [
  { from: 'trigger', to: 'enrich' },
  { from: 'trigger', to: 'segment' },
  { from: 'enrich', to: 'email' },
  { from: 'segment', to: 'slack' },
  { from: 'email', to: 'crm' },
  { from: 'slack', to: 'crm' },
];

const NODE_W = 160;
const NODE_H = 64;

function getNodeCenter(node: WorkflowNode) {
  return { cx: node.x + NODE_W / 2, cy: node.y + NODE_H / 2 };
}

export default function AutomationShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeEdge, setActiveEdge] = useState(-1);
  const [activeNode, setActiveNode] = useState(-1);
  const [pulseNode, setPulseNode] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let edgeIdx = 0;
    let nodeIdx = 0;

    const nodeTimer = setInterval(() => {
      if (nodeIdx < NODES.length) {
        setActiveNode(nodeIdx);
        nodeIdx++;
      }
    }, 200);

    const edgeTimer = setTimeout(() => {
      clearInterval(nodeTimer);
      const eTimer = setInterval(() => {
        if (edgeIdx < EDGES.length) {
          setActiveEdge(edgeIdx);
          edgeIdx++;
        } else {
          clearInterval(eTimer);
          // Start pulse animation
          let pIdx = 0;
          const pulseTimer = setInterval(() => {
            setPulseNode(NODES[pIdx % NODES.length].id);
            pIdx++;
          }, 600);
          return () => clearInterval(pulseTimer);
        }
      }, 300);
      return () => clearInterval(eTimer);
    }, NODES.length * 200 + 400);

    return () => {
      clearInterval(nodeTimer);
      clearTimeout(edgeTimer);
    };
  }, [visible]);

  return (
    <div ref={containerRef} className="automation-showcase">
      <div className="automation-showcase__canvas">
        <svg
          viewBox="0 0 910 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="automation-showcase__svg"
        >
          <defs>
            <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#800020" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#D45060" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="edge-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D45060" />
              <stop offset="100%" stopColor="#800020" />
            </linearGradient>
            <filter id="glow-edge">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map((edge, i) => {
            const fromNode = NODES.find(n => n.id === edge.from)!;
            const toNode = NODES.find(n => n.id === edge.to)!;
            const from = getNodeCenter(fromNode);
            const to = getNodeCenter(toNode);
            const midX = (from.cx + to.cx) / 2;
            const isActive = i <= activeEdge;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M${from.cx},${from.cy} C${midX},${from.cy} ${midX},${to.cy} ${to.cx},${to.cy}`}
                  stroke="url(#edge-grad)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity={0.3}
                />
                {isActive && (
                  <path
                    d={`M${from.cx},${from.cy} C${midX},${from.cy} ${midX},${to.cy} ${to.cx},${to.cy}`}
                    stroke="url(#edge-active)"
                    strokeWidth="2.5"
                    filter="url(#glow-edge)"
                    className="automation-showcase__edge-anim"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {NODES.map((node, i) => {
          const isActive = i <= activeNode;
          const isPulsing = pulseNode === node.id;

          return (
            <div
              key={node.id}
              className={`automation-showcase__node${isActive ? ' automation-showcase__node--active' : ''}${isPulsing ? ' automation-showcase__node--pulse' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                width: NODE_W,
                height: NODE_H,
                '--node-color': node.color,
                transitionDelay: `${i * 0.15}s`,
              } as React.CSSProperties}
            >
              <span className="automation-showcase__node-icon">{node.icon}</span>
              <div className="automation-showcase__node-text">
                <span className="automation-showcase__node-label">{node.label}</span>
                <span className="automation-showcase__node-sub">{node.sublabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="automation-showcase__legend">
        <div className="automation-showcase__legend-item">
          <span className="automation-showcase__legend-dot" style={{ background: '#800020' }} />
          <span>Trigger & Logic</span>
        </div>
        <div className="automation-showcase__legend-item">
          <span className="automation-showcase__legend-dot" style={{ background: '#D45060' }} />
          <span>Actions & APIs</span>
        </div>
        <div className="automation-showcase__legend-item">
          <span className="automation-showcase__legend-dot" style={{ background: '#F3E6D5' }} />
          <span>Data Flow</span>
        </div>
      </div>
    </div>
  );
}

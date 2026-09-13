import { motion, type PanInfo } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight } from 'lucide-react';

interface WfNode {
  id: string;
  label: string;
  sub: string;
  icon: string;
  position: { x: number; y: number };
}

interface WfConnection {
  from: string;
  to: string;
}

interface Workflow {
  field: string;
  tagline: string;
  nodes: WfNode[];
  connections: WfConnection[];
}

const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;

const WORKFLOWS: Workflow[] = [
  {
    field: 'IT Ops',
    tagline: 'On-board new employees automatically',
    nodes: [
      { id: 'webhook', label: 'HR Webhook', sub: 'New hire event', icon: '⚡', position: { x: 40, y: 120 } },
      { id: 'account', label: 'Create Account', sub: 'Google Workspace', icon: '👤', position: { x: 270, y: 40 } },
      { id: 'access', label: 'Assign Access', sub: 'Okta SSO', icon: '🔑', position: { x: 270, y: 200 } },
      { id: 'laptop', label: 'Provision Laptop', sub: 'Jamf MDM', icon: '💻', position: { x: 500, y: 40 } },
      { id: 'welcome', label: 'Welcome Email', sub: 'SendGrid', icon: '✉️', position: { x: 500, y: 200 } },
      { id: 'notify', label: 'Notify Manager', sub: 'Slack #onboard', icon: '💬', position: { x: 730, y: 120 } },
    ],
    connections: [
      { from: 'webhook', to: 'account' },
      { from: 'webhook', to: 'access' },
      { from: 'account', to: 'laptop' },
      { from: 'access', to: 'welcome' },
      { from: 'laptop', to: 'notify' },
      { from: 'welcome', to: 'notify' },
    ],
  },
  {
    field: 'Sales',
    tagline: 'Generate customer insights from reviews',
    nodes: [
      { id: 'reviews', label: 'Get Reviews', sub: 'Trustpilot API', icon: '⭐', position: { x: 40, y: 120 } },
      { id: 'cluster', label: 'Cluster Topics', sub: 'K-means', icon: '📊', position: { x: 260, y: 40 } },
      { id: 'ai', label: 'AI Analysis', sub: 'OpenAI GPT-4', icon: '🧠', position: { x: 260, y: 200 } },
      { id: 'insights', label: 'Extract Insights', sub: 'AI Agent', icon: '💡', position: { x: 490, y: 120 } },
      { id: 'sheets', label: 'Save to Sheets', sub: 'Google Sheets', icon: '📋', position: { x: 720, y: 40 } },
      { id: 'crm', label: 'Update CRM', sub: 'HubSpot', icon: '📇', position: { x: 720, y: 200 } },
    ],
    connections: [
      { from: 'reviews', to: 'cluster' },
      { from: 'reviews', to: 'ai' },
      { from: 'cluster', to: 'insights' },
      { from: 'ai', to: 'insights' },
      { from: 'insights', to: 'sheets' },
      { from: 'insights', to: 'crm' },
    ],
  },
  {
    field: 'Dev Ops',
    tagline: 'Auto-deploy on every PR merge',
    nodes: [
      { id: 'gh', label: 'GitHub Webhook', sub: 'PR merged', icon: '🔀', position: { x: 40, y: 120 } },
      { id: 'test', label: 'Run Tests', sub: 'Jest + Cypress', icon: '✅', position: { x: 260, y: 40 } },
      { id: 'lint', label: 'Lint & Type Check', sub: 'ESLint + TSC', icon: '🔍', position: { x: 260, y: 200 } },
      { id: 'build', label: 'Build Image', sub: 'Docker', icon: '🐳', position: { x: 490, y: 120 } },
      { id: 'deploy', label: 'Deploy', sub: 'Kubernetes', icon: '🚀', position: { x: 720, y: 40 } },
      { id: 'slack', label: 'Notify Team', sub: 'Slack #deploys', icon: '💬', position: { x: 720, y: 200 } },
    ],
    connections: [
      { from: 'gh', to: 'test' },
      { from: 'gh', to: 'lint' },
      { from: 'test', to: 'build' },
      { from: 'lint', to: 'build' },
      { from: 'build', to: 'deploy' },
      { from: 'build', to: 'slack' },
    ],
  },
  {
    field: 'Marketing',
    tagline: 'Automate social content pipeline',
    nodes: [
      { id: 'calendar', label: 'Content Calendar', sub: 'Notion DB', icon: '📅', position: { x: 40, y: 120 } },
      { id: 'gen', label: 'Generate Copy', sub: 'Claude AI', icon: '✍️', position: { x: 270, y: 40 } },
      { id: 'image', label: 'Create Visual', sub: 'Canva API', icon: '🎨', position: { x: 270, y: 200 } },
      { id: 'schedule', label: 'Schedule Post', sub: 'Buffer', icon: '📤', position: { x: 500, y: 120 } },
      { id: 'analytics', label: 'Track Metrics', sub: 'Google Analytics', icon: '📈', position: { x: 730, y: 40 } },
      { id: 'report', label: 'Weekly Report', sub: 'Slack #marketing', icon: '📊', position: { x: 730, y: 200 } },
    ],
    connections: [
      { from: 'calendar', to: 'gen' },
      { from: 'calendar', to: 'image' },
      { from: 'gen', to: 'schedule' },
      { from: 'image', to: 'schedule' },
      { from: 'schedule', to: 'analytics' },
      { from: 'schedule', to: 'report' },
    ],
  },
  {
    field: 'Security',
    tagline: 'Enrich and triage incident tickets',
    nodes: [
      { id: 'alert', label: 'Security Alert', sub: 'PagerDuty', icon: '🚨', position: { x: 40, y: 120 } },
      { id: 'enrich', label: 'Enrich IOCs', sub: 'VirusTotal', icon: '🔬', position: { x: 270, y: 40 } },
      { id: 'classify', label: 'Classify Severity', sub: 'AI Triage', icon: '⚖️', position: { x: 270, y: 200 } },
      { id: 'ticket', label: 'Create Ticket', sub: 'Jira', icon: '🎫', position: { x: 500, y: 120 } },
      { id: 'block', label: 'Block IP', sub: 'Cloudflare', icon: '🛡️', position: { x: 730, y: 40 } },
      { id: 'report', label: 'Incident Report', sub: 'Confluence', icon: '📝', position: { x: 730, y: 200 } },
    ],
    connections: [
      { from: 'alert', to: 'enrich' },
      { from: 'alert', to: 'classify' },
      { from: 'enrich', to: 'ticket' },
      { from: 'classify', to: 'ticket' },
      { from: 'ticket', to: 'block' },
      { from: 'ticket', to: 'report' },
    ],
  },
];

function getContentSize(nodes: WfNode[]) {
  const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH));
  const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_HEIGHT));
  return { width: maxX + 40, height: maxY + 40 };
}

function ConnectionLine({ from, to, nodes }: { from: string; to: string; nodes: WfNode[] }) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const startX = fromNode.position.x + NODE_WIDTH;
  const startY = fromNode.position.y + NODE_HEIGHT / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y + NODE_HEIGHT / 2;

  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;
  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  return <path d={path} fill="none" stroke="#D45060" strokeWidth={2} strokeDasharray="7,5" strokeLinecap="round" opacity={0.4} />;
}

function WorkflowCanvas({ workflow }: { workflow: Workflow }) {
  const [nodes, setNodes] = useState<WfNode[]>(workflow.nodes);
  const [contentSize, setContentSize] = useState(() => getContentSize(workflow.nodes));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(workflow.nodes);
    setContentSize(getContentSize(workflow.nodes));
  }, [workflow]);

  const handleDragStart = (nodeId: string) => {
    setDraggingId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) dragStart.current = { x: node.position.x, y: node.position.y };
  };

  const handleDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingId !== nodeId || !dragStart.current) return;
    const newX = Math.max(0, dragStart.current.x + offset.x);
    const newY = Math.max(0, dragStart.current.y + offset.y);

    flushSync(() => {
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n)));
    });

    setContentSize((prev) => ({
      width: Math.max(prev.width, newX + NODE_WIDTH + 40),
      height: Math.max(prev.height, newY + NODE_HEIGHT + 40),
    }));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    dragStart.current = null;
  };

  return (
    <div ref={canvasRef} className="wf-canvas" role="region" aria-label="Workflow canvas">
      <div className="wf-canvas__content" style={{ minWidth: contentSize.width, minHeight: contentSize.height }}>
        <svg className="wf-canvas__svg" width={contentSize.width} height={contentSize.height} style={{ overflow: 'visible' }} aria-hidden="true">
          {workflow.connections.map((c) => (
            <ConnectionLine key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} />
          ))}
        </svg>

        {nodes.map((node) => {
          const isDragging = draggingId === node.id;
          return (
            <motion.div
              key={node.id}
              drag
              dragMomentum={false}
              dragConstraints={{ left: 0, top: 0, right: 100000, bottom: 100000 }}
              onDragStart={() => handleDragStart(node.id)}
              onDrag={(_, info) => handleDrag(node.id, info)}
              onDragEnd={handleDragEnd}
              style={{ x: node.position.x, y: node.position.y, width: NODE_WIDTH, transformOrigin: '0 0' }}
              className="wf-canvas__node-wrap"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              whileHover={{ scale: 1.02 }}
              whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
              aria-grabbed={isDragging}
            >
              <div className={`wf-canvas__node${isDragging ? ' wf-canvas__node--dragging' : ''}`}>
                <div className="wf-canvas__node-head">
                  <span className="wf-canvas__node-icon">{node.icon}</span>
                  <span className="wf-canvas__node-label">{node.label}</span>
                </div>
                <p className="wf-canvas__node-sub">{node.sub}</p>
                <div className="wf-canvas__node-foot">
                  <ArrowRight size={10} />
                  <span>Connected</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkflowShowcase() {
  const [active, setActive] = useState(0);

  return (
    <div className="wf-showcase">
      <div className="wf-showcase__sidebar">
        {WORKFLOWS.map((wf, i) => (
          <button
            key={wf.field}
            className={`wf-showcase__tab${i === active ? ' wf-showcase__tab--active' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="wf-showcase__tab-field">{wf.field}</span>
            <span className="wf-showcase__tab-tagline">{wf.tagline}</span>
          </button>
        ))}
      </div>

      <div className="wf-showcase__canvas-wrap">
        <div className="wf-showcase__hint">Drag nodes to reposition</div>
        <WorkflowCanvas key={active} workflow={WORKFLOWS[active]} />
      </div>
    </div>
  );
}

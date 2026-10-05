import { motion, type PanInfo } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, BarChart3, Brain, CalendarDays, CheckCircle2, Contact, Container, FileText, GitMerge, KeyRound, Laptop, Lightbulb, Mail, MessageSquare, Microscope, Palette, PenLine, Rocket, Scale, SearchCode, Send, Sheet, ShieldCheck, Siren, Star, Ticket, TrendingUp, UserPlus, Zap, type LucideIcon } from 'lucide-react';

interface WfNode {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
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
      { id: 'webhook', label: 'HR Webhook', sub: 'New hire event', icon: Zap, position: { x: 40, y: 120 } },
      { id: 'account', label: 'Create Account', sub: 'Google Workspace', icon: UserPlus, position: { x: 270, y: 40 } },
      { id: 'access', label: 'Assign Access', sub: 'Okta SSO', icon: KeyRound, position: { x: 270, y: 200 } },
      { id: 'laptop', label: 'Provision Laptop', sub: 'Jamf MDM', icon: Laptop, position: { x: 500, y: 40 } },
      { id: 'welcome', label: 'Welcome Email', sub: 'SendGrid', icon: Mail, position: { x: 500, y: 200 } },
      { id: 'notify', label: 'Notify Manager', sub: 'Slack #onboard', icon: MessageSquare, position: { x: 730, y: 120 } },
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
      { id: 'reviews', label: 'Get Reviews', sub: 'Trustpilot API', icon: Star, position: { x: 40, y: 120 } },
      { id: 'cluster', label: 'Cluster Topics', sub: 'K-means', icon: BarChart3, position: { x: 260, y: 40 } },
      { id: 'ai', label: 'AI Analysis', sub: 'OpenAI GPT-4', icon: Brain, position: { x: 260, y: 200 } },
      { id: 'insights', label: 'Extract Insights', sub: 'AI Agent', icon: Lightbulb, position: { x: 490, y: 120 } },
      { id: 'sheets', label: 'Save to Sheets', sub: 'Google Sheets', icon: Sheet, position: { x: 720, y: 40 } },
      { id: 'crm', label: 'Update CRM', sub: 'HubSpot', icon: Contact, position: { x: 720, y: 200 } },
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
      { id: 'gh', label: 'GitHub Webhook', sub: 'PR merged', icon: GitMerge, position: { x: 40, y: 120 } },
      { id: 'test', label: 'Run Tests', sub: 'Jest + Cypress', icon: CheckCircle2, position: { x: 260, y: 40 } },
      { id: 'lint', label: 'Lint & Type Check', sub: 'ESLint + TSC', icon: SearchCode, position: { x: 260, y: 200 } },
      { id: 'build', label: 'Build Image', sub: 'Docker', icon: Container, position: { x: 490, y: 120 } },
      { id: 'deploy', label: 'Deploy', sub: 'Kubernetes', icon: Rocket, position: { x: 720, y: 40 } },
      { id: 'slack', label: 'Notify Team', sub: 'Slack #deploys', icon: MessageSquare, position: { x: 720, y: 200 } },
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
      { id: 'calendar', label: 'Content Calendar', sub: 'Notion DB', icon: CalendarDays, position: { x: 40, y: 120 } },
      { id: 'gen', label: 'Generate Copy', sub: 'Claude AI', icon: PenLine, position: { x: 270, y: 40 } },
      { id: 'image', label: 'Create Visual', sub: 'Canva API', icon: Palette, position: { x: 270, y: 200 } },
      { id: 'schedule', label: 'Schedule Post', sub: 'Buffer', icon: Send, position: { x: 500, y: 120 } },
      { id: 'analytics', label: 'Track Metrics', sub: 'Google Analytics', icon: TrendingUp, position: { x: 730, y: 40 } },
      { id: 'report', label: 'Weekly Report', sub: 'Slack #marketing', icon: BarChart3, position: { x: 730, y: 200 } },
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
      { id: 'alert', label: 'Security Alert', sub: 'PagerDuty', icon: Siren, position: { x: 40, y: 120 } },
      { id: 'enrich', label: 'Enrich IOCs', sub: 'VirusTotal', icon: Microscope, position: { x: 270, y: 40 } },
      { id: 'classify', label: 'Classify Severity', sub: 'AI Triage', icon: Scale, position: { x: 270, y: 200 } },
      { id: 'ticket', label: 'Create Ticket', sub: 'Jira', icon: Ticket, position: { x: 500, y: 120 } },
      { id: 'block', label: 'Block IP', sub: 'Cloudflare', icon: ShieldCheck, position: { x: 730, y: 40 } },
      { id: 'report', label: 'Incident Report', sub: 'Confluence', icon: FileText, position: { x: 730, y: 200 } },
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

/** Narrow screens flow top-to-bottom: horizontal layout would scale nodes down to unreadable size. */
const VERTICAL_BELOW = 560;

function toVertical(nodes: WfNode[]): WfNode[] {
  return nodes.map((n) => ({ ...n, position: { x: (n.position.y - 40) * 1.4 + 20, y: n.position.x } }));
}

function ConnectionLine({ from, to, nodes, vertical }: { from: string; to: string; nodes: WfNode[]; vertical: boolean }) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  let path: string;
  if (vertical) {
    const sx = fromNode.position.x + NODE_WIDTH / 2;
    const sy = fromNode.position.y + NODE_HEIGHT;
    const ex = toNode.position.x + NODE_WIDTH / 2;
    const ey = toNode.position.y;
    const my = (sy + ey) / 2;
    path = `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`;
  } else {
    const sx = fromNode.position.x + NODE_WIDTH;
    const sy = fromNode.position.y + NODE_HEIGHT / 2;
    const ex = toNode.position.x;
    const ey = toNode.position.y + NODE_HEIGHT / 2;
    const mx = (sx + ex) / 2;
    path = `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`;
  }

  return <path d={path} fill="none" stroke="#D45060" strokeWidth={2} strokeDasharray="7,5" strokeLinecap="round" opacity={0.4} />;
}

function WorkflowCanvas({ workflow }: { workflow: Workflow }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const vertical = width > 0 && width < VERTICAL_BELOW;
  const layout = vertical ? toVertical(workflow.nodes) : workflow.nodes;
  const base = getContentSize(layout);
  const [nodes, setNodes] = useState<WfNode[]>(layout);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const scale = width ? Math.min(1, width / base.width) : 1;

  // Track the canvas width: it decides orientation and the fit scale (no scrollbars, every node visible).
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Orientation flip resets the layout (dragged positions belong to the old axis).
  useLayoutEffect(() => {
    setNodes(vertical ? toVertical(workflow.nodes) : workflow.nodes);
  }, [vertical, workflow]);

  const startDrag = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraggingId(nodeId);
    dragStart.current = { x: node.position.x, y: node.position.y };
  };

  // Pan (not drag) so framer never moves the element itself; offsets are screen px, so divide by the fit scale.
  const moveDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingId !== nodeId || !dragStart.current) return;
    const x = Math.min(base.width - NODE_WIDTH - 8, Math.max(8, dragStart.current.x + offset.x / scale));
    const y = Math.min(base.height - NODE_HEIGHT - 8, Math.max(8, dragStart.current.y + offset.y / scale));
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position: { x, y } } : n)));
  };

  const endDrag = () => {
    setDraggingId(null);
    dragStart.current = null;
  };

  return (
    <div ref={canvasRef} className="wf-canvas" role="region" aria-label="Workflow canvas" style={{ height: base.height * scale }}>
      <div
        className="wf-canvas__content"
        style={{ width: base.width, height: base.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        <svg className="wf-canvas__svg" width={base.width} height={base.height} style={{ overflow: 'visible' }} aria-hidden="true">
          {workflow.connections.map((c) => (
            <ConnectionLine key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} vertical={vertical} />
          ))}
        </svg>

        {nodes.map((node) => {
          const isDragging = draggingId === node.id;
          return (
            <motion.div
              key={node.id}
              onPanStart={() => startDrag(node.id)}
              onPan={(_, info) => moveDrag(node.id, info)}
              onPanEnd={endDrag}
              style={{ x: node.position.x, y: node.position.y, width: NODE_WIDTH, touchAction: 'none' }}
              className={`wf-canvas__node-wrap${isDragging ? ' is-dragging' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              aria-grabbed={isDragging}
            >
              <div className={`wf-canvas__node${isDragging ? ' wf-canvas__node--dragging' : ''}`}>
                <div className="wf-canvas__node-head">
                  <span className="wf-canvas__node-icon"><node.icon size={16} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="wf-canvas__node-label">{node.label}</span>
                </div>
                <p className="wf-canvas__node-sub">{node.sub}</p>
                <div className="wf-canvas__node-foot">
                  <ArrowRight size={10} aria-hidden="true" />
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
            aria-pressed={i === active}
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

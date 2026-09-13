import { useState } from 'react';
import { motion } from 'framer-motion';

interface WfNode {
  id: string;
  label: string;
  sub?: string;
  icon: string;
  x: number;
  y: number;
}

interface WfEdge {
  from: string;
  to: string;
}

interface Workflow {
  field: string;
  tagline: string;
  nodes: WfNode[];
  edges: WfEdge[];
}

const WORKFLOWS: Workflow[] = [
  {
    field: 'IT Ops',
    tagline: 'On-board new employees automatically',
    nodes: [
      { id: 'webhook', label: 'HR Webhook', sub: 'New hire event', icon: '⚡', x: 40, y: 120 },
      { id: 'account', label: 'Create Account', sub: 'Google Workspace', icon: '👤', x: 230, y: 50 },
      { id: 'access', label: 'Assign Access', sub: 'Okta SSO', icon: '🔑', x: 230, y: 190 },
      { id: 'laptop', label: 'Provision Laptop', sub: 'Jamf MDM', icon: '💻', x: 420, y: 50 },
      { id: 'welcome', label: 'Welcome Email', sub: 'SendGrid', icon: '✉️', x: 420, y: 190 },
      { id: 'notify', label: 'Notify Manager', sub: 'Slack #onboard', icon: '💬', x: 610, y: 120 },
    ],
    edges: [
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
      { id: 'reviews', label: 'Get Reviews', sub: 'Trustpilot API', icon: '⭐', x: 40, y: 120 },
      { id: 'cluster', label: 'Cluster Topics', sub: 'K-means', icon: '📊', x: 210, y: 50 },
      { id: 'ai', label: 'AI Analysis', sub: 'OpenAI GPT-4', icon: '🧠', x: 210, y: 190 },
      { id: 'insights', label: 'Extract Insights', sub: 'AI Agent', icon: '💡', x: 410, y: 120 },
      { id: 'sheets', label: 'Save to Sheets', sub: 'Google Sheets', icon: '📋', x: 600, y: 50 },
      { id: 'crm', label: 'Update CRM', sub: 'HubSpot', icon: '📇', x: 600, y: 190 },
    ],
    edges: [
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
      { id: 'gh', label: 'GitHub Webhook', sub: 'PR merged', icon: '🔀', x: 40, y: 120 },
      { id: 'test', label: 'Run Tests', sub: 'Jest + Cypress', icon: '✅', x: 210, y: 50 },
      { id: 'lint', label: 'Lint & Type Check', sub: 'ESLint + TSC', icon: '🔍', x: 210, y: 190 },
      { id: 'build', label: 'Build Image', sub: 'Docker', icon: '🐳', x: 410, y: 120 },
      { id: 'deploy', label: 'Deploy', sub: 'Kubernetes', icon: '🚀', x: 600, y: 50 },
      { id: 'slack', label: 'Notify Team', sub: 'Slack #deploys', icon: '💬', x: 600, y: 190 },
    ],
    edges: [
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
      { id: 'calendar', label: 'Content Calendar', sub: 'Notion DB', icon: '📅', x: 40, y: 120 },
      { id: 'gen', label: 'Generate Copy', sub: 'Claude AI', icon: '✍️', x: 220, y: 50 },
      { id: 'image', label: 'Create Visual', sub: 'Canva API', icon: '🎨', x: 220, y: 190 },
      { id: 'schedule', label: 'Schedule Post', sub: 'Buffer', icon: '📤', x: 420, y: 120 },
      { id: 'analytics', label: 'Track Metrics', sub: 'Google Analytics', icon: '📈', x: 610, y: 50 },
      { id: 'report', label: 'Weekly Report', sub: 'Slack #marketing', icon: '📊', x: 610, y: 190 },
    ],
    edges: [
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
      { id: 'alert', label: 'Security Alert', sub: 'PagerDuty', icon: '🚨', x: 40, y: 120 },
      { id: 'enrich', label: 'Enrich IOCs', sub: 'VirusTotal', icon: '🔬', x: 220, y: 50 },
      { id: 'classify', label: 'Classify Severity', sub: 'AI Triage', icon: '⚖️', x: 220, y: 190 },
      { id: 'ticket', label: 'Create Ticket', sub: 'Jira', icon: '🎫', x: 420, y: 120 },
      { id: 'block', label: 'Block IP', sub: 'Cloudflare', icon: '🛡️', x: 610, y: 50 },
      { id: 'report', label: 'Incident Report', sub: 'Confluence', icon: '📝', x: 610, y: 190 },
    ],
    edges: [
      { from: 'alert', to: 'enrich' },
      { from: 'alert', to: 'classify' },
      { from: 'enrich', to: 'ticket' },
      { from: 'classify', to: 'ticket' },
      { from: 'ticket', to: 'block' },
      { from: 'ticket', to: 'report' },
    ],
  },
];

const NODE_W = 146;
const NODE_H = 58;

function getCenter(node: WfNode) {
  return { cx: node.x + NODE_W / 2, cy: node.y + NODE_H / 2 };
}

function WorkflowDiagram({ workflow }: { workflow: Workflow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="wf-diagram"
    >
      <svg viewBox="0 0 756 270" fill="none" className="wf-diagram__svg">
        <defs>
          <linearGradient id="wf-edge-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D45060" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#800020" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {workflow.edges.map((edge) => {
          const fromNode = workflow.nodes.find((n) => n.id === edge.from)!;
          const toNode = workflow.nodes.find((n) => n.id === edge.to)!;
          const from = getCenter(fromNode);
          const to = getCenter(toNode);
          const midX = (from.cx + to.cx) / 2;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={`M${from.cx},${from.cy} C${midX},${from.cy} ${midX},${to.cy} ${to.cx},${to.cy}`}
                stroke="url(#wf-edge-g)"
                strokeWidth="2"
              />
              <circle cx={to.cx - (to.cx - from.cx) * 0.02} cy={to.cy - (to.cy - from.cy) * 0.02} r="3" fill="#D45060" opacity="0.6" />
            </g>
          );
        })}
      </svg>

      {workflow.nodes.map((node, i) => (
        <motion.div
          key={node.id}
          className="wf-node"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
          style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
        >
          <span className="wf-node__icon">{node.icon}</span>
          <div className="wf-node__text">
            <span className="wf-node__label">{node.label}</span>
            {node.sub && <span className="wf-node__sub">{node.sub}</span>}
          </div>
        </motion.div>
      ))}
    </motion.div>
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

      <div className="wf-showcase__canvas">
        <WorkflowDiagram key={active} workflow={WORKFLOWS[active]} />
      </div>
    </div>
  );
}

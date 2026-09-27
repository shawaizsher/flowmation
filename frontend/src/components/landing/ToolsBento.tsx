import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import type { PointerEvent, ReactNode } from 'react';
import {
  Bot, Check, CheckCircle2, GitBranch, LayoutDashboard, Mail, MessagesSquare,
  PenTool, Play, ShieldCheck, Star, Store, UserCheck, Users, X, type LucideIcon,
} from 'lucide-react';

interface Tool {
  id: string;
  icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
  size: 'xl' | 'wide' | 'sm';
  visual: ReactNode;
}

function EditorVisual() {
  const nodes = [
    { x: 6, y: 18, t: 'Webhook' },
    { x: 38, y: 8, t: 'OpenAI Chat' },
    { x: 38, y: 50, t: 'Sheets Read' },
    { x: 70, y: 30, t: 'Slack Send' },
  ];
  return (
    <div className="tb-editor">
      <svg className="tb-editor__wires" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M24 24 C 31 24, 31 14, 38 14" />
        <path d="M24 24 C 31 24, 31 56, 38 56" />
        <path d="M56 14 C 63 14, 63 36, 70 36" />
        <path d="M56 56 C 63 56, 63 36, 70 36" />
      </svg>
      {nodes.map((n) => (
        <div key={n.t} className="tb-editor__node fx-mono" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
          <span className="tb-editor__port" />
          {n.t}
        </div>
      ))}
      <div className="tb-editor__io fx-mono">
        <span className="tb-editor__io-label">INPUT → config</span>
        <code>{'{{$node["Webhook"].json.email}}'}</code>
      </div>
      <div className="tb-editor__cats fx-mono">
        {['Triggers', 'AI & ML', 'Databases', 'Messaging', 'Payments', '+18'].map((c) => <span key={c}>{c}</span>)}
      </div>
    </div>
  );
}

function AiVisual() {
  return (
    <div className="tb-chat">
      <div className="tb-chat__msg tb-chat__msg--user">Every new Stripe charge → log to Sheets and ping #sales</div>
      <div className="tb-chat__msg tb-chat__msg--ai">
        <Bot size={14} aria-hidden="true" />
        <span>Generated 3 nodes: <b>Stripe Webhook</b> → <b>Sheets Write</b> → <b>Slack Send</b></span>
      </div>
      <div className="tb-chat__chips fx-mono">
        <span>explain error</span><span>debug node</span><span>apply fix</span>
      </div>
    </div>
  );
}

function TestVisual() {
  const rows = [
    { t: 'empty payload', ok: true },
    { t: 'missing email', ok: true },
    { t: 'rate limited', ok: false },
  ];
  return (
    <ul className="tb-tests fx-mono">
      {rows.map((r) => (
        <li key={r.t}>
          {r.ok ? <Check size={12} className="tb-ok" aria-label="passed" /> : <X size={12} className="tb-bad" aria-label="failed" />}
          {r.t}
        </li>
      ))}
      <li className="tb-tests__heal"><ShieldCheck size={12} aria-hidden="true" /> self-heal: retry w/ backoff</li>
    </ul>
  );
}

function VersionVisual() {
  return (
    <div className="tb-versions fx-mono">
      {['v4', 'v3', 'v2'].map((v, i) => (
        <div key={v} className={`tb-versions__row${i === 0 ? ' is-live' : ''}`}>
          <span className="tb-versions__dot" />
          <span>{v}</span>
          <span className="tb-versions__meta">{i === 0 ? 'live' : i === 1 ? '+2 −1 nodes' : 'checkpoint'}</span>
        </div>
      ))}
    </div>
  );
}

function MarketVisual() {
  const items = [
    { t: 'Lead enrichment', r: 4.8 },
    { t: 'Invoice reminders', r: 4.6 },
    { t: 'Support triage', r: 4.9 },
  ];
  return (
    <div className="tb-market">
      {items.map((it) => (
        <div key={it.t} className="tb-market__card">
          <span className="tb-market__title">{it.t}</span>
          <span className="tb-market__meta fx-mono"><Star size={11} aria-hidden="true" /> {it.r}</span>
          <span className="tb-market__install fx-mono">install</span>
        </div>
      ))}
    </div>
  );
}

function TeamVisual() {
  const people = [
    { i: 'AK', role: 'Owner' },
    { i: 'SR', role: 'Admin' },
    { i: 'MJ', role: 'Editor' },
    { i: 'LT', role: 'Viewer' },
  ];
  return (
    <ul className="tb-team">
      {people.map((p) => (
        <li key={p.i}>
          <span className="tb-team__avatar">{p.i}</span>
          <span className="tb-team__role fx-mono">{p.role}</span>
        </li>
      ))}
    </ul>
  );
}

function InboxVisual() {
  return (
    <div className="tb-inbox">
      <div className="tb-inbox__thread fx-mono"># ops-automation</div>
      <div className="tb-inbox__bubble">Published v4 — webhook is armed</div>
      <div className="tb-inbox__bubble tb-inbox__bubble--me">Nice, pinging finance now</div>
    </div>
  );
}

function ApprovalVisual() {
  return (
    <div className="tb-approve">
      <div className="tb-approve__mail fx-mono"><Mail size={12} aria-hidden="true" /> Approval needed: refund $420</div>
      <div className="tb-approve__actions">
        <span className="tb-approve__btn tb-approve__btn--yes"><CheckCircle2 size={12} aria-hidden="true" /> Approve</span>
        <span className="tb-approve__btn">Reject</span>
      </div>
      <div className="tb-approve__status fx-mono">run paused · waiting for decision</div>
    </div>
  );
}

function DashboardVisual() {
  const stats = [
    { k: 'Workflows', v: '24' },
    { k: 'Active', v: '17' },
    { k: 'Errors', v: '1' },
  ];
  return (
    <div className="tb-dash">
      {stats.map((s) => (
        <div key={s.k} className="tb-dash__stat">
          <span className="tb-dash__v">{s.v}</span>
          <span className="tb-dash__k fx-mono">{s.k}</span>
        </div>
      ))}
      <div className="tb-dash__run fx-mono"><Play size={11} aria-hidden="true" /> run · generate with AI · publish</div>
    </div>
  );
}

const TOOLS: Tool[] = [
  { id: 'editor', icon: PenTool, tag: 'EDITOR', title: 'Visual workflow editor', desc: 'Drag from 23 node categories onto the canvas, then map data between steps by dragging fields from the input/output panel.', size: 'xl', visual: <EditorVisual /> },
  { id: 'ai', icon: Bot, tag: 'AI ASSISTANT', title: 'Describe it, get a workflow', desc: 'Generate flows from plain English, explain errors, debug a node and apply the fix — powered by Claude or your own RAG knowledge base.', size: 'wide', visual: <AiVisual /> },
  { id: 'tests', icon: CheckCircle2, tag: 'TEST & REPLAY', title: 'AI test cases', desc: 'Generate edge-case tests, replay past runs and let self-heal suggest recoveries.', size: 'sm', visual: <TestVisual /> },
  { id: 'versions', icon: GitBranch, tag: 'VERSIONS', title: 'Publish, diff, restore', desc: 'Named checkpoints and version diffs, with one-click restore.', size: 'sm', visual: <VersionVisual /> },
  { id: 'market', icon: Store, tag: 'MARKETPLACE', title: 'Community templates', desc: 'Browse, rate and install workflows other teams have published — or publish your own with an AI-written description.', size: 'wide', visual: <MarketVisual /> },
  { id: 'team', icon: Users, tag: 'TEAM', title: 'Roles & invites', desc: 'Invite by email as Owner, Admin, Editor or Viewer.', size: 'sm', visual: <TeamVisual /> },
  { id: 'inbox', icon: MessagesSquare, tag: 'INBOX', title: 'Team threads', desc: 'Group chats with your workspace, right next to your flows.', size: 'sm', visual: <InboxVisual /> },
  { id: 'approve', icon: UserCheck, tag: 'HUMAN-IN-THE-LOOP', title: 'Approval steps', desc: 'Pause a run and email an approver. Approve continues it, reject stops it.', size: 'wide', visual: <ApprovalVisual /> },
  { id: 'dash', icon: LayoutDashboard, tag: 'DASHBOARD', title: 'Every flow at a glance', desc: 'Status for every workflow — draft, active, paused or erroring — with search and one-click runs.', size: 'wide', visual: <DashboardVisual /> },
];

function BentoCard({ tool, i }: { tool: Tool; i: number }) {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const spotlight = useMotionTemplate`radial-gradient(320px circle at ${mx}px ${my}px, rgba(212, 80, 96, 0.16), transparent 70%)`;
  const Icon = tool.icon;

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <motion.article
      className={`tb-card tb-card--${tool.size}`}
      onPointerMove={onMove}
      onPointerLeave={() => { mx.set(-200); my.set(-200); }}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (i % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="tb-card__spot" style={{ background: spotlight }} aria-hidden="true" />
      <div className="tb-card__visual">{tool.visual}</div>
      <div className="tb-card__copy">
        <span className="tb-card__tag fx-mono"><Icon size={13} strokeWidth={2} aria-hidden="true" /> {tool.tag}</span>
        <h3 className="tb-card__title">{tool.title}</h3>
        <p className="tb-card__desc">{tool.desc}</p>
      </div>
    </motion.article>
  );
}

export default function ToolsBento() {
  return (
    <div className="tb-grid">
      {TOOLS.map((t, i) => <BentoCard key={t.id} tool={t} i={i} />)}
    </div>
  );
}

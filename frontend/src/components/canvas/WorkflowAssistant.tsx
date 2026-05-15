import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, Loader2, Workflow, X, Trash2, AlertCircle,
  CheckCircle2, HelpCircle, Activity, Play, Lightbulb,
  Wrench, Zap, ChevronRight,
} from 'lucide-react';
import { aiApi } from '../../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface HealthData {
  score: number;
  grade: string;
  issues: { type: 'error' | 'warning'; msg: string }[];
  tips: string[];
}

interface CompileData {
  status: 'ready' | 'review' | 'blocked';
  readinessScore: number;
  unsupportedNodes: { nodeLabel: string; nodeType: string }[];
  missingConfig: { nodeLabel: string; nodeType: string; fields: string[] }[];
  dataContracts: { from: string; to: string; availableFields: string[] }[];
  releaseChecklist: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  workflowUpdated?: boolean;
  messageType?: string;
  suggestions?: string[];
  metadata?: {
    summary?: string;
    explanation?: string[];
    confidence?: string;
    changes?: string[];
    health?: HealthData;
    compile?: CompileData;
    simulation?: string[];
    issues?: { type: string; msg: string }[];
  };
}

interface WorkflowAssistantProps {
  workspaceId: string;
  workflowId: string;
  workflowNodes: unknown[];
  workflowEdges: unknown[];
  onWorkflowUpdate: (nodes: unknown[], edges: unknown[]) => void;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi, I'm Freckles — your AI workflow copilot! I can build, edit, debug, and optimize workflows conversationally.\n\nWhat would you like to automate today?",
  messageType: 'message',
  suggestions: [
    'When email arrives, send a Slack notification',
    'Daily sales report emailed at 9 AM',
    'Analyze workflow health',
    'Show help',
  ],
};

const THINKING_STATES = [
  'Thinking…',
  'Analyzing workflow…',
  'Detecting intent…',
  'Optimizing structure…',
  'Building connections…',
  'Inspecting nodes…',
  'Generating workflow…',
];

// ── Health bar component ───────────────────────────────────────────────────

function HealthBar({ health }: { health: HealthData }) {
  const color =
    health.score >= 80 ? 'bg-green-500' :
    health.score >= 60 ? 'bg-yellow-500' :
    health.score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  const textColor =
    health.score >= 80 ? 'text-green-400' :
    health.score >= 60 ? 'text-yellow-400' :
    health.score >= 40 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="mt-2.5 rounded-lg border border-surface-border bg-surface-base p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Workflow Health</span>
        <span className={`text-sm font-bold ${textColor}`}>{health.score}/100 — {health.grade}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-border overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${health.score}%` }} />
      </div>
      {health.issues.length > 0 && (
        <div className="mt-2 space-y-1">
          {health.issues.map((iss, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span className={iss.type === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                {iss.type === 'error' ? '●' : '◐'}
              </span>
              <span className="text-foreground-muted">{iss.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simulation steps component ─────────────────────────────────────────────

function SimulationSteps({ steps }: { steps: string[] }) {
  return (
    <div className="mt-2.5 rounded-lg border border-surface-border bg-surface-base p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Play size={11} className="text-brand-400" />
        <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Execution Preview</span>
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={i} className="text-xs font-mono text-foreground-secondary leading-relaxed">{step}</div>
        ))}
      </div>
    </div>
  );
}

// ── Message icon ───────────────────────────────────────────────────────────

function CompileReport({ compile }: { compile: CompileData }) {
  const tone =
    compile.status === 'ready'
      ? 'text-green-400 border-green-500/25 bg-green-500/5'
      : compile.status === 'review'
        ? 'text-yellow-400 border-yellow-500/25 bg-yellow-500/5'
        : 'text-red-400 border-red-500/25 bg-red-500/5';

  const blockers = [
    ...compile.unsupportedNodes.map((node) => `${node.nodeLabel}: unsupported runtime type ${node.nodeType}`),
    ...compile.missingConfig.map((node) => `${node.nodeLabel}: missing ${node.fields.join(', ')}`),
  ];

  return (
    <div className="mt-2.5 rounded-lg border border-surface-border bg-surface-base p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">AI Compiler</span>
        </div>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
          {compile.readinessScore}/100 {compile.status}
        </span>
      </div>

      {blockers.length > 0 ? (
        <div className="space-y-1">
          {blockers.slice(0, 4).map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted">
              <AlertCircle size={11} className="mt-0.5 shrink-0 text-yellow-400" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground-muted">No runtime blockers detected. Ready for a dry run.</p>
      )}

      {compile.dataContracts.length > 0 && (
        <div className="mt-2 border-t border-surface-border pt-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
            Data contracts
          </div>
          {compile.dataContracts.slice(0, 3).map((contract, i) => (
            <div key={i} className="truncate text-xs font-mono text-foreground-secondary">
              {contract.from} -&gt; {contract.to}: {contract.availableFields.join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageTypeIcon({ type }: { type?: string }) {
  if (!type || type === 'message') return null;
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    workflow_built:  { icon: <Zap size={10} />,        label: 'Workflow built',   color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    workflow_edited: { icon: <Wrench size={10} />,      label: 'Workflow updated', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    health:          { icon: <Activity size={10} />,    label: 'Health analysis',  color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    simulation:      { icon: <Play size={10} />,        label: 'Simulation',       color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    debug:           { icon: <AlertCircle size={10} />, label: 'Debug report',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  };
  const cfg = map[type];
  if (!cfg) return null;
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} mb-1.5`}>
      {cfg.icon} {cfg.label}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function WorkflowAssistant({
  workspaceId,
  workflowId,
  workflowNodes,
  workflowEdges,
  onWorkflowUpdate,
  onClose,
}: WorkflowAssistantProps) {
  const storageKey = `freckles-${workflowId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [GREETING];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState(THINKING_STATES[0]);
  const thinkingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cycle through thinking messages while loading
  useEffect(() => {
    if (loading) {
      let i = 0;
      thinkingRef.current = setInterval(() => {
        i = (i + 1) % THINKING_STATES.length;
        setThinkingMsg(THINKING_STATES[i]);
      }, 1400);
    } else {
      if (thinkingRef.current) clearInterval(thinkingRef.current);
      setThinkingMsg(THINKING_STATES[0]);
    }
    return () => { if (thinkingRef.current) clearInterval(thinkingRef.current); };
  }, [loading]);

  const clearHistory = () => {
    setMessages([GREETING]);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

      const res = await aiApi.workflowChat(workspaceId, {
        message: trimmed,
        history,
        workflow: { nodes: workflowNodes, edges: workflowEdges },
      });

      const { reply, updatedWorkflow, messageType, suggestions, metadata } = res.data;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply || 'Done.',
        workflowUpdated: !!updatedWorkflow,
        messageType: messageType || 'message',
        suggestions: suggestions || [],
        metadata: metadata || {},
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (updatedWorkflow) {
        onWorkflowUpdate(updatedWorkflow.nodes, updatedWorkflow.edges);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.', messageType: 'message' },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [messages, loading, workspaceId, workflowNodes, workflowEdges, onWorkflowUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-card">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
            <Bot size={14} className="text-brand-400" />
          </div>
          <div>
            <span className="font-body text-sm font-bold text-foreground">Freckles</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
              AI Copilot
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearHistory} title="Clear history"
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-border hover:text-foreground transition">
            <Trash2 size={13} />
          </button>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-border hover:text-foreground transition">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-brand-500/15 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                <Bot size={11} className="text-brand-400" />
              </div>
            )}

            <div className="max-w-[85%] space-y-1.5">
              {/* Message type badge */}
              {msg.role === 'assistant' && msg.messageType && msg.messageType !== 'message' && (
                <MessageTypeIcon type={msg.messageType} />
              )}

              {/* Bubble */}
              <div className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-500/15 border border-brand-500/20 text-foreground ml-auto'
                  : 'bg-surface-input border border-surface-border text-foreground'
              }`}>
                <p className="whitespace-pre-wrap font-medium">{msg.content}</p>

                {/* Workflow updated indicator */}
                {msg.workflowUpdated && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 border-t border-emerald-500/20 pt-2">
                    <Workflow size={11} /> Canvas updated
                  </div>
                )}
              </div>

              {/* Health bar */}
              {msg.metadata?.health && (
                <HealthBar health={msg.metadata.health} />
              )}

              {msg.metadata?.compile && (
                <CompileReport compile={msg.metadata.compile} />
              )}

              {/* Simulation steps */}
              {msg.metadata?.simulation && msg.metadata.simulation.length > 0 && (
                <SimulationSteps steps={msg.metadata.simulation} />
              )}

              {/* Changes list */}
              {msg.metadata?.changes && msg.metadata.changes.length > 0 && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 space-y-1">
                  {msg.metadata.changes.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-1.5 text-xs text-blue-300">
                      <CheckCircle2 size={10} /> {c}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestion chips */}
              {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {msg.suggestions.map((s, si) => (
                    <button
                      key={si}
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      className="flex items-center gap-1 rounded-full border border-surface-border bg-surface-base px-2.5 py-1 text-[11px] font-medium text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition disabled:opacity-40"
                    >
                      <ChevronRight size={9} /> {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-500/15 flex items-center justify-center shrink-0">
              <Bot size={11} className="text-brand-400" />
            </div>
            <div className="bg-surface-input border border-surface-border rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-brand-400 shrink-0" />
                <span className="text-xs font-medium text-foreground-muted transition-all">{thinkingMsg}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-surface-border p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Build, edit, debug, or ask anything about your workflow…"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal placeholder:text-foreground-muted/50 disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] font-medium text-foreground-muted/40">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

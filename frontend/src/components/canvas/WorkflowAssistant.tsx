import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Workflow, X, Trash2, Activity, Play, CheckCircle2 } from 'lucide-react';
import { aiApi } from '../../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface HealthData {
  score: number;
  grade: string;
  issues: { type: 'error' | 'warning'; msg: string }[];
  tips: string[];
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

// ── Greeting ───────────────────────────────────────────────────────────────

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi, I'm Freckles. Tell me what you want to automate and I'll build it for you.",
  messageType: 'message',
  suggestions: [
    'When email arrives, send a Slack notification',
    'Daily sales report emailed at 9 AM',
    'Any suggestions?',
    'What does this workflow do?',
  ],
};

// ── Typing indicator (3 bouncing dots) ────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-foreground-muted/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  );
}

// ── Health bar ────────────────────────────────────────────────────────────

function HealthBar({ health }: { health: HealthData }) {
  const barColor =
    health.score >= 80 ? 'bg-emerald-500' :
    health.score >= 60 ? 'bg-yellow-500' :
    health.score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  const scoreColor =
    health.score >= 80 ? 'text-emerald-400' :
    health.score >= 60 ? 'text-yellow-400' :
    health.score >= 40 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="mt-2 rounded-xl border border-surface-border bg-surface-base p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-foreground-muted" />
          <span className="text-xs font-semibold text-foreground-muted">Workflow Health</span>
        </div>
        <span className={`text-xs font-bold ${scoreColor}`}>{health.score}/100 · {health.grade}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-surface-border overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${health.score}%` }} />
      </div>
      {health.issues.length > 0 && (
        <div className="space-y-1 pt-1">
          {health.issues.map((iss, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
              <span className={`mt-px shrink-0 ${iss.type === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                {iss.type === 'error' ? '●' : '○'}
              </span>
              <span>{iss.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simulation steps ──────────────────────────────────────────────────────

function SimulationSteps({ steps }: { steps: string[] }) {
  return (
    <div className="mt-2 rounded-xl border border-surface-border bg-surface-base p-3 space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <Play size={11} className="text-brand-400" />
        <span className="text-xs font-semibold text-foreground-muted">Execution Preview</span>
      </div>
      {steps.map((step, i) => (
        <div key={i} className="text-xs font-mono text-foreground-secondary leading-relaxed">{step}</div>
      ))}
    </div>
  );
}

// ── Changes list ──────────────────────────────────────────────────────────

function ChangesList({ changes }: { changes: string[] }) {
  return (
    <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1">
      {changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 size={10} className="shrink-0" />
          <span>{c}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

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

  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply || 'Done.',
        workflowUpdated: !!updatedWorkflow,
        messageType: messageType || 'message',
        suggestions: suggestions || [],
        metadata: metadata || {},
      }]);
      if (updatedWorkflow) onWorkflowUpdate(updatedWorkflow.nodes, updatedWorkflow.edges);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', messageType: 'message' }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [messages, loading, workspaceId, workflowNodes, workflowEdges, onWorkflowUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-surface-card">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-sm">
            <Bot size={15} className="text-white" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface-card" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Freckles</p>
            <p className="text-[10px] text-foreground-muted mt-0.5">AI Workflow Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearHistory}
            title="Clear chat"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}>

            {/* Bot avatar */}
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={11} className="text-white" />
              </div>
            )}

            <div className={`space-y-2 ${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[88%]'}`}>

              {/* Bubble */}
              <div className={
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed'
                  : 'bg-surface-hover rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed text-foreground'
              }>
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Canvas updated pill */}
                {msg.workflowUpdated && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                    <Workflow size={10} />
                    Canvas updated
                  </div>
                )}
              </div>

              {/* Metadata cards */}
              {msg.metadata?.health && <HealthBar health={msg.metadata.health} />}
              {msg.metadata?.simulation && msg.metadata.simulation.length > 0 && (
                <SimulationSteps steps={msg.metadata.simulation} />
              )}
              {msg.metadata?.changes && msg.metadata.changes.length > 0 && (
                <ChangesList changes={msg.metadata.changes} />
              )}

              {/* Suggestion chips */}
              {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestions.map((s, si) => (
                    <button
                      key={si}
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      className="rounded-full border border-surface-border bg-surface-card px-2.5 py-1 text-[11px] text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 mt-1">
              <Bot size={11} className="text-white" />
            </div>
            <div className="bg-surface-hover rounded-2xl rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-surface-border">
        <div className="flex items-end gap-2 rounded-2xl border border-surface-border bg-surface-input px-3 py-2 focus-within:border-brand-500/50 transition">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your workflow…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted/50 disabled:opacity-60 leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="h-7 w-7 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end"
          >
            <Send size={12} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-foreground-muted/35 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

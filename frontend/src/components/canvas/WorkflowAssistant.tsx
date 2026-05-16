import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Workflow, X, Trash2, Activity, Play, CheckCircle2, Sparkles } from 'lucide-react';
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

interface PendingAction {
  type: 'add_node' | 'add_nodes';
  nodeType?: string;
  nodeTypes?: string[];
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
    pendingAction?: PendingAction;
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
  content: "Hi! I'm Freckles, your AI workflow copilot. Describe what you want to automate and I'll build it — or ask me anything about your workflow.",
  messageType: 'message',
  suggestions: [
    'Fetch gold prices daily and send a WhatsApp alert',
    'Send Slack notification when GitHub PR is opened',
    'What can you do?',
    'Any suggestions?',
  ],
};

// ── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-brand-400/60 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.85s' }}
        />
      ))}
    </div>
  );
}

// ── Markdown renderer — supports **bold**, • bullets, _italic_, `code` ────

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Render inline formatting
        const rendered = renderInline(line);
        return <p key={i} className="text-sm">{rendered}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Split on **bold**, _italic_, `code`
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0, m;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={idx++}>{text.slice(last, m.index)}</span>);
    const raw = m[0];
    if (raw.startsWith('**'))      parts.push(<strong key={idx++} className="font-semibold text-foreground">{raw.slice(2, -2)}</strong>);
    else if (raw.startsWith('_')) parts.push(<em key={idx++} className="italic text-foreground-muted">{raw.slice(1, -1)}</em>);
    else                           parts.push(<code key={idx++} className="rounded bg-surface-border px-1 py-0.5 text-[11px] font-mono text-brand-400">{raw.slice(1, -1)}</code>);
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>);
  return parts;
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

// ── Clarification card ────────────────────────────────────────────────────

function ClarificationCard({ options, onSelect }: { options: string[]; onSelect: (s: string) => void }) {
  return (
    <div className="mt-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles size={11} className="text-brand-400" />
        <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">Choose an option</span>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opt)}
            className="w-full text-left rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-foreground-secondary hover:border-brand-500/50 hover:text-brand-400 hover:bg-brand-500/5 transition"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Confirmation prompt ───────────────────────────────────────────────────

function ConfirmationPrompt({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={onYes}
        className="flex-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
      >
        Yes, do it
      </button>
      <button
        onClick={onNo}
        className="flex-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground hover:border-foreground-muted transition"
      >
        Skip
      </button>
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

  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const clearHistory = () => {
    setMessages([GREETING]);
    setPendingAction(null);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const sendMessage = useCallback(async (text: string, overridePendingAction?: PendingAction | null) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    // Determine which pending action to send
    const actionToSend = overridePendingAction !== undefined ? overridePendingAction : pendingAction;

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await aiApi.workflowChat(workspaceId, {
        message: trimmed,
        history,
        workflow: { nodes: workflowNodes, edges: workflowEdges },
        pendingAction: actionToSend,
      });
      const { reply, updatedWorkflow, messageType, suggestions, metadata } = res.data;

      // Update pending action from response
      const newPending = metadata?.pendingAction ?? null;
      setPendingAction(newPending);

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
  }, [messages, loading, workspaceId, workflowNodes, workflowEdges, onWorkflowUpdate, pendingAction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

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
          <button onClick={clearHistory} title="Clear chat"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition">
            <Trash2 size={13} />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isClarification = msg.messageType === 'clarification';
          const hasPending = msg.metadata?.pendingAction && !isUser;
          // Only show confirm prompt on the LAST assistant suggest message
          const isLastSuggest = hasPending && i === messages.length - 1;

          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start gap-2.5'}`}>

              {/* Bot avatar */}
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={11} className="text-white" />
                </div>
              )}

              <div className={`space-y-2 ${isUser ? 'max-w-[80%]' : 'max-w-[90%]'}`}>

                {/* Bubble */}
                <div className={
                  isUser
                    ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5'
                    : 'bg-surface-hover rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-foreground'
                }>
                  {isUser
                    ? <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    : <MarkdownText text={msg.content} />
                  }

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

                {/* Clarification card — option buttons */}
                {isClarification && msg.suggestions && msg.suggestions.length > 0 && i === messages.length - 1 && (
                  <ClarificationCard
                    options={msg.suggestions}
                    onSelect={s => sendMessage(s)}
                  />
                )}

                {/* Confirmation prompt for pending actions (only on last suggest msg) */}
                {isLastSuggest && !loading && (
                  <ConfirmationPrompt
                    onYes={() => sendMessage('yes', pendingAction)}
                    onNo={() => sendMessage('no', null)}
                  />
                )}

                {/* Regular suggestion chips (not shown for clarification — those use ClarificationCard) */}
                {!isUser && msg.suggestions && msg.suggestions.length > 0 && !isClarification && !isLastSuggest && (
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
          );
        })}

        {/* Thinking indicator */}
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

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Workflow, X, Trash2 } from 'lucide-react';
import { aiApi } from '../../utils/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  workflowUpdated?: boolean;
}

interface WorkflowAssistantProps {
  workspaceId: string;
  workflowId: string;
  workflowNodes: unknown[];
  workflowEdges: unknown[];
  onWorkflowUpdate: (nodes: unknown[], edges: unknown[]) => void;
  onClose: () => void;
}

const GREETING = "Hi, I'm Freckles! Describe the automation you want to build, or tell me what to change. I can create, edit, and connect nodes for you.";

const SUGGESTIONS = [
  'Create a workflow that sends a Slack message when a webhook is received',
  'Add an OpenAI node to summarise emails from Gmail',
  'Build a daily report that reads from Google Sheets and emails the results',
];

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
      const stored = localStorage.getItem(`freckles-${workflowId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ role: 'assistant', content: GREETING }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(messages.length === 1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const clearHistory = () => {
    const fresh = [{ role: 'assistant' as const, content: GREETING }];
    setMessages(fresh);
    setShowSuggestions(true);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

      const res = await aiApi.workflowChat(workspaceId, {
        message: trimmed,
        history,
        workflow: { nodes: workflowNodes, edges: workflowEdges },
      });

      const { reply, updatedWorkflow } = res.data;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'Done.',
          workflowUpdated: !!updatedWorkflow,
        },
      ]);

      if (updatedWorkflow) {
        onWorkflowUpdate(updatedWorkflow.nodes, updatedWorkflow.edges);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-500/15 flex items-center justify-center">
            <Bot size={13} className="text-brand-400" />
          </div>
          <span className="font-body text-sm font-bold text-foreground">Freckles</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            title="Clear chat history"
            className="rounded-lg p-1 text-foreground-muted hover:bg-surface-border hover:text-foreground transition"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-foreground-muted hover:bg-surface-border hover:text-foreground transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-5 h-5 rounded-full bg-brand-500/15 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                <Bot size={10} className="text-brand-400" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-500/15 border border-brand-500/20 text-foreground'
                  : 'bg-base border border-surface-border text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
              {msg.workflowUpdated && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 border-t border-emerald-500/20 pt-2">
                  <Workflow size={11} />
                  Canvas updated
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-brand-500/15 flex items-center justify-center shrink-0">
              <Bot size={10} className="text-brand-400" />
            </div>
            <div className="bg-base border border-surface-border rounded-xl px-3 py-2.5">
              <div className="flex gap-1.5 items-center">
                <Loader2 size={12} className="animate-spin text-brand-400" />
                <span className="text-xs font-medium text-foreground-muted">Thinking…</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion chips — only shown on first load */}
        {showSuggestions && messages.length === 1 && !loading && (
          <div className="space-y-1.5 pt-1">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="w-full text-left text-xs font-medium px-3 py-2 rounded-lg border border-surface-border bg-base text-foreground-muted hover:border-brand-500/30 hover:text-foreground hover:bg-surface-hover transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-surface-border p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a workflow or request a change…"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-surface-border bg-base px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal placeholder:text-foreground-muted/50 disabled:opacity-60"
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

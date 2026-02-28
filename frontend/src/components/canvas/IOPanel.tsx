import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NodeIcon from './NodeIcon';

/* ────────── Types ────────── */
export interface NodeIOEntry {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  input?: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

interface IOPanelProps {
  entries: NodeIOEntry[];
  visible: boolean;
  onToggle: () => void;
}

/* ────────── Helpers ────────── */
function formatJson(data: unknown): string {
  if (data === undefined || data === null) return '—';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

const statusIcon: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={14} className="text-green-400" />,
  failed: <AlertCircle size={14} className="text-red-400" />,
  running: <Clock size={14} className="text-yellow-400 animate-pulse" />,
  pending: <Clock size={14} className="text-foreground-muted" />,
};

const statusColor: Record<string, string> = {
  success: 'border-green-500/30',
  failed: 'border-red-500/30',
  running: 'border-yellow-500/30',
  pending: 'border-surface-border',
};

/* ────────── Component ────────── */
export default function IOPanel({ entries, visible, onToggle }: IOPanelProps) {
  const [expanded, setExpanded] = useState(false); // full-height mode
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('output');

  const handleCopy = (data: unknown) => {
    navigator.clipboard.writeText(formatJson(data));
    toast.success('Copied to clipboard', { duration: 1500 });
  };

  const selectedNode = entries.find((e) => e.nodeId === selectedEntry);

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-4 py-2 text-sm text-foreground-muted shadow-xl hover:text-foreground hover:border-brand-500/40 transition"
      >
        <ArrowUpFromLine size={15} />
        Input / Output
        <ChevronUp size={14} />
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col border-t border-surface-border bg-surface-card shadow-2xl transition-all ${
        expanded ? 'h-[70%]' : 'h-72'
      }`}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} className="text-brand-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Input / Output</h3>
          </div>
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-400">
            {entries.length} node{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onToggle}
            className="rounded p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node list */}
        <div className="w-60 shrink-0 border-r border-surface-border overflow-y-auto custom-scrollbar">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <ArrowUpFromLine size={24} className="mb-2 text-foreground-muted/40" />
              <p className="text-sm text-foreground-muted">Run the workflow to see node inputs & outputs</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {entries.map((entry) => (
                <button
                  key={entry.nodeId}
                  onClick={() => { setSelectedEntry(entry.nodeId); setActiveTab('output'); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition group ${
                    selectedEntry === entry.nodeId
                      ? 'bg-brand-500/10 border border-brand-500/30'
                      : 'hover:bg-base/60 border border-transparent'
                  }`}
                >
                  <NodeIcon nodeType={entry.nodeType} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{entry.nodeLabel}</span>
                      {statusIcon[entry.status]}
                    </div>
                    {entry.durationMs !== undefined && (
                      <span className="text-xs text-foreground-muted">{entry.durationMs}ms</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNode ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center gap-0 border-b border-surface-border shrink-0">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activeTab === 'input'
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <ArrowDownToLine size={14} /> Input
                </button>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activeTab === 'output'
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <ArrowUpFromLine size={14} /> Output
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleCopy(activeTab === 'input' ? selectedNode.input : selectedNode.output)}
                  className="mr-3 flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
                >
                  <Copy size={13} /> Copy
                </button>
              </div>

              {/* Data display */}
              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {selectedNode.status === 'failed' && activeTab === 'output' && selectedNode.error ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-red-400" />
                      <span className="text-sm font-semibold text-red-400">Error</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-red-300 font-mono leading-relaxed">
                      {selectedNode.error}
                    </pre>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground-secondary font-mono leading-relaxed">
                    {formatJson(activeTab === 'input' ? selectedNode.input : selectedNode.output) || (
                      <span className="text-foreground-muted italic">No {activeTab} data available</span>
                    )}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10">
                <ArrowDownToLine size={24} className="text-brand-400/60" />
              </div>
              <p className="text-sm text-foreground-muted">Select a node to inspect its input and output data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

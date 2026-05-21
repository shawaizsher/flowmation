import { useMemo, useState } from 'react';
import type { Node, Edge } from 'reactflow';
import { X, Play, Inbox, Settings as SettingsIcon, FileCode } from 'lucide-react';
import DraggableJsonTree from './DraggableJsonTree';
import NodeConfigFields from './NodeConfigFields';
import NodeIcon from './NodeIcon';
import type { NodeIOEntry } from './IOPanel';

interface NodeEditorModalProps {
  open: boolean;
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  ioEntries: NodeIOEntry[];
  onClose: () => void;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateLabel: (label: string) => void;
  onExecuteStep: () => void;
  /** Drop-target factory injected from EditorPage (shares its closure over state) */
  makeTokenDropHandler: (key: string, current: string) => any;
  isExecuting?: boolean;
}

/**
 * n8n-style three-column node editor modal.
 *   ┌───────────┬───────────────────────┬───────────┐
 *   │  INPUT    │  PARAMETERS  SETTINGS │  OUTPUT   │
 *   │ (drag-from│  (config form +       │ (drag-from│
 *   │ upstream) │   Execute step)       │  this     │
 *   │           │                       │  node)    │
 *   └───────────┴───────────────────────┴───────────┘
 *
 * Inputs are grouped per upstream source node so the user can drag values out
 * with full node-label context. Outputs are this node's most recent execution
 * result. Dragging anywhere inserts {{$node["X"].json.PATH}} into the focused
 * config input on the middle column.
 */
export default function NodeEditorModal({
  open,
  node,
  nodes,
  edges,
  ioEntries,
  onClose,
  onUpdateConfig,
  onUpdateLabel,
  onExecuteStep,
  makeTokenDropHandler,
  isExecuting,
}: NodeEditorModalProps) {
  const [tab, setTab] = useState<'parameters' | 'settings'>('parameters');
  const [editingLabel, setEditingLabel] = useState(false);

  // Match the IOPanel entry for this node (for output data)
  const thisEntry = useMemo(
    () => (node ? ioEntries.find((e) => e.nodeId === node.id) : null),
    [ioEntries, node]
  );

  // Find upstream nodes (sources connected to this node) and their entries
  const upstreams = useMemo(() => {
    if (!node) return [] as Array<{ id: string; label: string; output: unknown }>;
    const incoming = edges.filter((e) => e.target === node.id);
    return incoming
      .map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const entry = ioEntries.find((e) => e.nodeId === edge.source);
        const label = (sourceNode?.data?.label as string) || sourceNode?.id || edge.source;
        return { id: edge.source, label, output: entry?.output };
      })
      .filter((u): u is { id: string; label: string; output: unknown } => Boolean(u));
  }, [edges, ioEntries, node, nodes]);

  if (!open || !node) return null;

  const config = (node.data?.config as Record<string, any>) || {};
  const nodeType = (node.data?.type as string) || '';
  const nodeLabel = (node.data?.label as string) || node.id;
  const hasOutput = thisEntry?.output !== undefined && thisEntry?.output !== null;
  const hasInputs = upstreams.length > 0 && upstreams.some((u) => u.output !== undefined);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-[96vw] max-w-[1700px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-base shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Title bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-surface-border bg-surface-card px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <NodeIcon nodeType={nodeType} size="sm" className="!h-9 !w-9 shrink-0" />
            <div className="min-w-0">
              {editingLabel ? (
                <input
                  autoFocus
                  defaultValue={nodeLabel}
                  onBlur={(e) => { onUpdateLabel(e.target.value.trim() || nodeLabel); setEditingLabel(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') { setEditingLabel(false); }
                  }}
                  className="rounded border border-brand-500/40 bg-surface-input px-2 py-0.5 text-base font-bold text-foreground outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingLabel(true)}
                  title="Rename"
                  className="truncate text-base font-bold text-foreground hover:text-brand-400 transition"
                >
                  {nodeLabel}
                </button>
              )}
              <div className="truncate text-[11px] font-mono text-foreground-muted">{nodeType}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-border hover:text-foreground transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 3-column body ─────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* ── INPUT (left) ──────────────────────────────────────────── */}
          <div className="flex w-[28%] min-w-[260px] flex-col border-r border-surface-border bg-surface-card/40">
            <div className="flex items-center gap-2 border-b border-surface-border px-4 py-2.5">
              <Inbox size={14} className="text-foreground-muted" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground-muted">Input</span>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {!hasInputs ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-6">
                  <p className="text-sm text-foreground-muted mb-2">No input data</p>
                  <button
                    onClick={onExecuteStep}
                    disabled={isExecuting}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                  >
                    Execute previous nodes
                  </button>
                  <p className="mt-2 text-[10px] text-foreground-muted/70">to view input data</p>
                </div>
              ) : (
                upstreams.map((src) => (
                  <div key={src.id} className="rounded-lg border border-surface-border bg-surface-hover/40 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">From: {src.label}</span>
                    </div>
                    {src.output === undefined ? (
                      <p className="text-xs italic text-foreground-muted/70">Not run yet</p>
                    ) : (
                      <DraggableJsonTree data={src.output} nodeLabel={src.label} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── PARAMETERS (center) ───────────────────────────────────── */}
          <div className="flex flex-1 flex-col min-w-0 bg-surface-base">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
              <div className="flex gap-4">
                <button
                  onClick={() => setTab('parameters')}
                  className={`flex items-center gap-1.5 py-1.5 text-sm font-semibold transition ${
                    tab === 'parameters'
                      ? 'text-brand-400 border-b-2 border-brand-400 -mb-2 pb-2'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <FileCode size={13} /> Parameters
                </button>
                <button
                  onClick={() => setTab('settings')}
                  className={`flex items-center gap-1.5 py-1.5 text-sm font-semibold transition ${
                    tab === 'settings'
                      ? 'text-brand-400 border-b-2 border-brand-400 -mb-2 pb-2'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <SettingsIcon size={13} /> Settings
                </button>
              </div>
              <button
                onClick={onExecuteStep}
                disabled={isExecuting}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-400 disabled:opacity-50 transition"
              >
                <Play size={12} /> {isExecuting ? 'Executing…' : 'Execute step'}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {tab === 'parameters' && (
                Object.keys(config).filter((k) => !k.startsWith('_')).length === 0 ? (
                  <p className="text-sm text-foreground-muted italic">This node has no configurable parameters.</p>
                ) : (
                  <NodeConfigFields
                    config={config}
                    nodeType={nodeType}
                    onUpdate={onUpdateConfig}
                    makeTokenDropHandler={makeTokenDropHandler}
                  />
                )
              )}

              {tab === 'settings' && (
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground-muted">Node ID</label>
                    <input
                      readOnly
                      value={node.id}
                      className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2 font-mono text-xs text-foreground-muted outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground-muted">Display Name</label>
                    <input
                      defaultValue={nodeLabel}
                      onBlur={(e) => onUpdateLabel(e.target.value.trim() || nodeLabel)}
                      className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <p className="text-xs text-foreground-muted/70 italic">
                    Credential binding is managed from the right side-panel quick view. Reopen when needed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── OUTPUT (right) ────────────────────────────────────────── */}
          <div className="flex w-[28%] min-w-[260px] flex-col border-l border-surface-border bg-surface-card/40">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-foreground-muted">Output</span>
              {thisEntry?.status && (
                <span className={`text-[10px] font-bold uppercase ${
                  thisEntry.status === 'success' ? 'text-emerald-400'
                  : thisEntry.status === 'failed' ? 'text-red-400'
                  : 'text-foreground-muted'
                }`}>
                  {thisEntry.status}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {!hasOutput ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-6">
                  <p className="text-sm text-foreground-muted mb-2">No output data</p>
                  <button
                    onClick={onExecuteStep}
                    disabled={isExecuting}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                  >
                    Execute step
                  </button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[10px] text-foreground-muted/70 italic">
                    Drag any value into the parameters column or another node.
                  </p>
                  <DraggableJsonTree data={thisEntry?.output} nodeLabel={nodeLabel} />
                  {thisEntry?.error && (
                    <pre className="mt-3 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-300 whitespace-pre-wrap">
                      {thisEntry.error}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

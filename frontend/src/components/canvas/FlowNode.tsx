import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) summaryMap[n.type] = n.description;

// ── Status border colours ──────────────────────────────────────────────────
const statusRing: Record<string, string> = {
  running: 'border-yellow-400 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]',
  success: 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.2)]',
  failed:  'border-red-400   shadow-[0_0_0_1px_rgba(248,113,113,0.25)]',
  skipped: 'border-slate-500',
};

const statusBadge: Record<string, { dot: string; text: string; label: string }> = {
  running: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400',  label: 'Running' },
  success: { dot: 'bg-emerald-400',              text: 'text-emerald-400', label: 'Done'    },
  failed:  { dot: 'bg-red-400',                  text: 'text-red-400',     label: 'Failed'  },
  skipped: { dot: 'bg-slate-400',                text: 'text-slate-400',   label: 'Skipped' },
};

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const { deleteElements } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div
      className={`group relative flex w-[220px] items-center gap-3 overflow-visible rounded-xl border px-3.5 py-3 bg-surface-card transition-all duration-150 ${
        selected
          ? 'border-brand-500/50 shadow-[0_0_0_2px_rgba(var(--brand-500-rgb),0.12),0_8px_24px_rgba(0,0,0,0.18)]'
          : status && statusRing[status]
          ? statusRing[status]
          : 'border-surface-border hover:border-foreground-muted/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
      } ${dragging ? 'scale-[1.02] shadow-[0_12px_32px_rgba(0,0,0,0.22)]' : ''}`}
    >
      {/* ── Delete button ─────────────────────────────────────────────── */}
      <button
        onClick={handleDelete}
        className="absolute right-1.5 top-1.5 z-20 hidden h-5 w-5 items-center justify-center rounded-md text-foreground-muted/40 transition hover:bg-red-500/15 hover:text-red-400 group-hover:flex"
        title="Delete node"
      >
        <X size={11} />
      </button>

      {/* ── Input handle ──────────────────────────────────────────────── */}
      <Handle
        type="target"
        id="in"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{
          top: '50%',
          left: -5,
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: '2px solid var(--surface-border)',
          boxShadow: '0 0 0 2px var(--surface-card)',
          zIndex: 20,
        }}
        className="transition-all group-hover:!border-foreground-muted/50"
      />

      {/* ── Output handle ─────────────────────────────────────────────── */}
      <Handle
        type="source"
        id="out"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{
          top: '50%',
          right: -5,
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: '2px solid var(--surface-border)',
          boxShadow: '0 0 0 2px var(--surface-card)',
          zIndex: 20,
        }}
        className="transition-all group-hover:!border-foreground-muted/50"
      />

      {/* ── Quick-add button ───────────────────────────────────────────── */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(
            new CustomEvent('flowa:node-quick-add', { detail: { sourceNodeId: id } })
          );
        }}
        className="absolute top-1/2 -translate-y-1/2 z-30 hidden h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface-card text-foreground-muted shadow-md transition-all duration-150 hover:border-brand-500 hover:bg-brand-500 hover:text-white group-hover:flex"
        style={{ right: -34 }}
        title="Add connected node"
      >
        <span className="text-[14px] font-light leading-none">+</span>
      </button>

      {/* ── Icon — plain brand colour, no background box ───────────────── */}
      <div className="shrink-0 flex items-center justify-center w-9 h-9">
        <NodeIcon nodeType={data.type || ''} plain />
      </div>

      {/* ── Text ──────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 pr-4">
        <div
          className="truncate text-[12.5px] font-semibold leading-snug text-foreground"
          title={data.label}
        >
          {data.label}
        </div>
        {summaryMap[data.type || ''] && (
          <div className="mt-[2px] truncate text-[10px] leading-snug text-foreground-muted">
            {summaryMap[data.type || '']}
          </div>
        )}

        {/* Status pill */}
        {status && statusBadge[status] && (
          <div className="mt-1 inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[status].dot}`} />
            <span className={`text-[10px] font-medium ${statusBadge[status].text}`}>
              {statusBadge[status].label}
            </span>
          </div>
        )}
      </div>

      {/* ── Running pulse (top-right corner) ──────────────────────────── */}
      {status === 'running' && (
        <div className="absolute -right-1 -top-1 h-2.5 w-2.5 z-30">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
        </div>
      )}
    </div>
  );
}

export default memo(FlowNode);

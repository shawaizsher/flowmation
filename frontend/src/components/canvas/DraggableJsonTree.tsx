import { useState } from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';

interface DraggableJsonTreeProps {
  data: unknown;
  /** Label of the source node — used to build the n8n-style token */
  nodeLabel: string;
  /** Internal — current dotted path from root, e.g. "body.items[0].name" */
  path?: string;
  /** Internal — recursion depth, for indent + auto-collapse */
  depth?: number;
}

/**
 * Recursive, draggable JSON tree.
 * Each leaf shows its value and is draggable; dragging carries an n8n-style
 * placeholder like `{{$node["My Webhook"].json.body.price}}` on `text/plain`,
 * which the EditorPage config inputs accept as drop targets.
 */
export default function DraggableJsonTree({
  data,
  nodeLabel,
  path = '',
  depth = 0,
}: DraggableJsonTreeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  const buildToken = (subPath: string) => {
    const prefix = `{{$node["${nodeLabel}"].json`;
    return subPath ? `${prefix}.${subPath}}}` : `${prefix}}}`;
  };

  // ── Primitive (leaf) ───────────────────────────────────────────────────
  if (data === null || data === undefined || typeof data !== 'object') {
    const token = buildToken(path);
    const valueStr = (() => {
      if (data === null) return 'null';
      if (data === undefined) return 'undefined';
      if (typeof data === 'string') return `"${data}"`;
      return String(data);
    })();
    const valueColor =
      typeof data === 'string' ? 'text-emerald-400'
      : typeof data === 'number' ? 'text-amber-400'
      : typeof data === 'boolean' ? 'text-purple-400'
      : 'text-foreground-muted';

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', token);
          e.dataTransfer.setData('application/fluxion-token', token);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        title={`Drag into an input → ${token}`}
        className="group/leaf inline-flex items-center gap-1.5 rounded px-1 py-0.5 cursor-grab hover:bg-brand-500/10 active:cursor-grabbing"
      >
        <GripVertical size={10} className="opacity-0 group-hover/leaf:opacity-60 text-brand-400 shrink-0" />
        <span className={`text-xs font-mono truncate ${valueColor}`}>{valueStr}</span>
      </div>
    );
  }

  // ── Array ──────────────────────────────────────────────────────────────
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-xs text-foreground-muted font-mono">[]</span>;
    }
    return (
      <div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
        >
          <ChevronRight
            size={11}
            className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
          />
          <span className="font-mono">[{data.length}]</span>
        </button>
        {!collapsed && (
          <div className="ml-3 border-l border-surface-border pl-2 mt-0.5 space-y-0.5">
            {data.map((item, i) => {
              const childPath = path ? `${path}[${i}]` : `[${i}]`;
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] text-foreground-muted/60 font-mono shrink-0 mt-0.5">{i}:</span>
                  <DraggableJsonTree data={item} nodeLabel={nodeLabel} path={childPath} depth={depth + 1} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Object ─────────────────────────────────────────────────────────────
  const keys = Object.keys(data as Record<string, unknown>);
  if (keys.length === 0) {
    return <span className="text-xs text-foreground-muted font-mono">{'{}'}</span>;
  }
  return (
    <div>
      {depth > 0 && (
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
        >
          <ChevronRight
            size={11}
            className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
          />
          <span className="font-mono">{`{${keys.length}}`}</span>
        </button>
      )}
      {(!collapsed || depth === 0) && (
        <div className={depth > 0 ? 'ml-3 border-l border-surface-border pl-2 mt-0.5 space-y-0.5' : 'space-y-0.5'}>
          {keys.map((key) => {
            const childPath = path ? `${path}.${key}` : key;
            const childData = (data as Record<string, unknown>)[key];
            const isLeaf = childData === null || typeof childData !== 'object';
            const keyToken = buildToken(childPath);
            return (
              <div key={key} className="flex items-start gap-1.5">
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', keyToken);
                    e.dataTransfer.setData('application/fluxion-token', keyToken);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title={`Drag → ${keyToken}`}
                  className="text-xs font-mono text-sky-400 cursor-grab hover:bg-brand-500/10 rounded px-1 py-0.5 shrink-0"
                >
                  {key}:
                </span>
                {isLeaf ? (
                  <DraggableJsonTree data={childData} nodeLabel={nodeLabel} path={childPath} depth={depth + 1} />
                ) : (
                  <div className="min-w-0">
                    <DraggableJsonTree data={childData} nodeLabel={nodeLabel} path={childPath} depth={depth + 1} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

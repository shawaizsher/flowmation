import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Maximize2,
  Minimize2,
  Search,
  Info,
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

export interface NodeIOEdge {
  source: string;
  target: string;
}

interface IOPanelProps {
  entries: NodeIOEntry[];
  edges: NodeIOEdge[];
  visible: boolean;
  onToggle: () => void;
}

/* ────────── Helpers ────────── */
function formatJsonPretty(data: unknown): string {
  if (data === undefined || data === null) return '-';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatJsonRaw(data: unknown): string {
  if (data === undefined || data === null) return '-';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function stringifyCellValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function previewValue(data: unknown, max = 120): string {
  const raw = formatJsonRaw(data);
  return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}

function buildTableData(data: unknown): { headers: string[]; rows: string[][] } {
  if (data === undefined || data === null) {
    return { headers: ['Value'], rows: [] };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { headers: ['Value'], rows: [] };
    }

    const allObjects = data.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
    if (allObjects) {
      const headers = Array.from(
        new Set(
          data
            .slice(0, 50)
            .flatMap((item) => Object.keys(item as Record<string, unknown>))
        )
      );

      const rows = data.slice(0, 200).map((item) => {
        const rowObj = item as Record<string, unknown>;
        return headers.map((header) => stringifyCellValue(rowObj[header]));
      });

      return { headers, rows };
    }

    return {
      headers: ['Index', 'Value'],
      rows: data.slice(0, 200).map((item, index) => [String(index), stringifyCellValue(item)]),
    };
  }

  if (typeof data === 'object') {
    return {
      headers: ['Field', 'Value'],
      rows: Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, stringifyCellValue(value)]),
    };
  }

  return {
    headers: ['Value'],
    rows: [[stringifyCellValue(data)]],
  };
}

const statusIcon: Record<string, JSX.Element> = {
  success: <CheckCircle2 size={14} className="text-green-400" />,
  failed: <AlertCircle size={14} className="text-red-400" />,
  running: <Clock size={14} className="text-yellow-400 animate-pulse" />,
  pending: <Clock size={14} className="text-foreground-muted" />,
};

const statusTone: Record<string, string> = {
  success: 'border-green-500/30 bg-green-500/5',
  failed: 'border-red-500/30 bg-red-500/5',
  running: 'border-yellow-500/30 bg-yellow-500/5',
  pending: 'border-surface-border bg-surface-hover',
};

/* ────────── Component ────────── */
export default function IOPanel({ entries, edges, visible, onToggle }: IOPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'error' | 'meta'>('output');
  const [viewMode, setViewMode] = useState<'json' | 'raw' | 'table'>('json');
  const [statusFilter, setStatusFilter] = useState<'all' | NodeIOEntry['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesQuery =
        query.length === 0 ||
        entry.nodeLabel.toLowerCase().includes(query) ||
        entry.nodeType.toLowerCase().includes(query) ||
        entry.nodeId.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [entries, searchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedEntry || !filteredEntries.some((entry) => entry.nodeId === selectedEntry)) {
      setSelectedEntry(filteredEntries[0]?.nodeId ?? null);
    }
  }, [filteredEntries, selectedEntry]);

  const selectedNode = useMemo(
    () => entries.find((entry) => entry.nodeId === selectedEntry),
    [entries, selectedEntry]
  );

  const connectedNodeGroups = useMemo(() => {
    if (!selectedNode) {
      return { previousNodes: [] as NodeIOEntry[], nextNodes: [] as NodeIOEntry[] };
    }

    const entryMap = new Map(entries.map((entry) => [entry.nodeId, entry]));

    const previousIds = Array.from(
      new Set(
        edges
          .filter((edge) => edge.target === selectedNode.nodeId)
          .map((edge) => edge.source)
      )
    );

    const nextIds = Array.from(
      new Set(
        edges
          .filter((edge) => edge.source === selectedNode.nodeId)
          .map((edge) => edge.target)
      )
    );

    return {
      previousNodes: previousIds
        .map((nodeId) => entryMap.get(nodeId))
        .filter((entry): entry is NodeIOEntry => Boolean(entry)),
      nextNodes: nextIds
        .map((nodeId) => entryMap.get(nodeId))
        .filter((entry): entry is NodeIOEntry => Boolean(entry)),
    };
  }, [edges, entries, selectedNode]);

  const activePayload = useMemo(() => {
    if (!selectedNode) return undefined;
    if (activeTab === 'input') return selectedNode.input;
    if (activeTab === 'output') return selectedNode.output;
    if (activeTab === 'meta') {
      return {
        nodeId: selectedNode.nodeId,
        nodeLabel: selectedNode.nodeLabel,
        nodeType: selectedNode.nodeType,
        status: selectedNode.status,
        durationMs: selectedNode.durationMs,
        hasInput: selectedNode.input !== undefined,
        hasOutput: selectedNode.output !== undefined,
      };
    }
    return selectedNode.error;
  }, [selectedNode, activeTab]);

  const tableData = useMemo(() => buildTableData(activePayload), [activePayload]);

  const handleCopy = (data: unknown) => {
    if (activeTab === 'error') {
      navigator.clipboard.writeText(typeof data === 'string' ? data : formatJsonRaw(data));
    } else if (viewMode === 'raw') {
      navigator.clipboard.writeText(formatJsonRaw(data));
    } else {
      navigator.clipboard.writeText(formatJsonPretty(data));
    }
    toast.success('Copied to clipboard', { duration: 1500 });
  };

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-4 py-2 text-sm text-foreground-muted shadow-xl hover:text-foreground hover:border-brand-500/40 transition"
      >
        <ArrowUpFromLine size={15} />
        Input / Output Panel
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col border-t border-surface-border bg-surface-card shadow-2xl transition-all ${
        expanded ? 'h-[82%]' : 'h-[30rem]'
      }`}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} className="text-brand-400" />
            <h3 className="font-body text-sm font-semibold text-foreground">Execution Data</h3>
          </div>
          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-400">
            {filteredEntries.length}/{entries.length} node{entries.length !== 1 ? 's' : ''}
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
        <div className="w-80 shrink-0 border-r border-surface-border flex flex-col">
          <div className="p-3 border-b border-surface-border space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search node by name, type, or id"
                className="w-full rounded-lg border border-surface-border bg-surface-input py-2 pl-8 pr-2 text-xs text-foreground outline-none focus:border-brand-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'running', 'success', 'failed', 'pending'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium border transition ${
                    statusFilter === status
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                      : 'border-surface-border text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <ArrowUpFromLine size={24} className="mb-2 text-foreground-muted/40" />
              <p className="text-sm text-foreground-muted">Run the workflow to see node inputs & outputs</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.nodeId}
                  onClick={() => { setSelectedEntry(entry.nodeId); setActiveTab('output'); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition group ${
                    selectedEntry === entry.nodeId
                      ? `border ${statusTone[entry.status]}`
                      : 'hover:bg-surface-hover border border-transparent'
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

              {filteredEntries.length === 0 && (
                <div className="p-4 text-center text-xs text-foreground-muted">No nodes match current filters.</div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Right: Detail view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNode ? (
            <>
              {/* Detail header */}
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5 shrink-0">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-foreground">{selectedNode.nodeLabel}</h4>
                  <p className="truncate text-xs text-foreground-muted">{selectedNode.nodeType} · {selectedNode.nodeId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon[selectedNode.status]}
                  <span className="text-xs text-foreground-muted">
                    {selectedNode.durationMs !== undefined ? `${selectedNode.durationMs}ms` : selectedNode.status}
                  </span>
                </div>
              </div>

              {/* Option rows */}
              <div className="border-b border-surface-border shrink-0 px-4 py-2.5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {(['input', 'output', 'error', 'meta'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        activeTab === tab
                          ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                          : 'border-surface-border text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {activeTab !== 'error' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-foreground-muted">View</span>
                    {(['json', 'raw', 'table'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                          viewMode === mode
                            ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                            : 'border-surface-border text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end">
                <button
                  onClick={() => handleCopy(activePayload)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
              </div>

              {/* Data display */}
              <div className="flex-1 overflow-auto p-4 custom-scrollbar space-y-4">
                {activeTab === 'error' ? (
                  selectedNode.error ? (
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
                    <div className="rounded-lg border border-surface-border bg-surface-hover p-4 text-sm text-foreground-muted">
                      This node completed without an error payload.
                    </div>
                  )
                ) : viewMode === 'table' ? (
                  tableData.rows.length > 0 ? (
                    <div className="overflow-auto rounded-lg border border-surface-border">
                      <table className="min-w-full text-xs">
                        <thead className="bg-surface-hover">
                          <tr>
                            {tableData.headers.map((header) => (
                              <th key={header} className="border-b border-surface-border px-3 py-2 text-left font-semibold text-foreground-secondary">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, rowIndex) => (
                            <tr key={`row-${rowIndex}`} className="odd:bg-surface-hover">
                              {row.map((cell, cellIndex) => (
                                <td key={`cell-${rowIndex}-${cellIndex}`} className="max-w-[320px] border-b border-surface-border/60 px-3 py-2 text-foreground-secondary align-top">
                                  <div className="whitespace-pre-wrap break-words">{cell}</div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-surface-border bg-surface-hover p-4 text-sm text-foreground-muted">
                      No tabular data available for this view.
                    </div>
                  )
                ) : viewMode === 'raw' ? (
                  <pre className="whitespace-pre-wrap text-sm text-foreground-secondary font-mono leading-relaxed">
                    {formatJsonRaw(activePayload)}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground-secondary font-mono leading-relaxed">
                    {formatJsonPretty(activePayload)}
                  </pre>
                )}

                {/* Previous / Next node context */}
                <div className="rounded-xl border border-surface-border bg-surface-hover p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">Connected Node Data</h5>
                    <span className="text-[11px] text-foreground-muted">
                      Prev: {connectedNodeGroups.previousNodes.length} · Next: {connectedNodeGroups.nextNodes.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <div className="rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden">
                      <div className="border-b border-surface-border bg-surface-hover px-3 py-2 text-xs font-semibold text-foreground-secondary">
                        Previous Nodes
                      </div>
                      {connectedNodeGroups.previousNodes.length > 0 ? (
                        <div className="overflow-auto max-h-64">
                          <table className="min-w-full text-xs">
                            <thead className="bg-surface-hover sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Node</th>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Input</th>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Output</th>
                              </tr>
                            </thead>
                            <tbody>
                              {connectedNodeGroups.previousNodes.map((entry) => (
                                <tr key={`prev-${entry.nodeId}`} className="odd:bg-surface-hover">
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60">
                                    <div className="flex items-center gap-1.5">
                                      {statusIcon[entry.status]}
                                      <span className="text-foreground">{entry.nodeLabel}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60 text-foreground-secondary break-words whitespace-pre-wrap">
                                    {previewValue(entry.input)}
                                  </td>
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60 text-foreground-secondary break-words whitespace-pre-wrap">
                                    {previewValue(entry.output)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-xs text-foreground-muted">No previous nodes connected.</div>
                      )}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden">
                      <div className="border-b border-surface-border bg-surface-hover px-3 py-2 text-xs font-semibold text-foreground-secondary">
                        Next Nodes
                      </div>
                      {connectedNodeGroups.nextNodes.length > 0 ? (
                        <div className="overflow-auto max-h-64">
                          <table className="min-w-full text-xs">
                            <thead className="bg-surface-hover sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Node</th>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Input</th>
                                <th className="px-3 py-2 text-left font-semibold text-foreground-secondary border-b border-surface-border">Output</th>
                              </tr>
                            </thead>
                            <tbody>
                              {connectedNodeGroups.nextNodes.map((entry) => (
                                <tr key={`next-${entry.nodeId}`} className="odd:bg-surface-hover">
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60">
                                    <div className="flex items-center gap-1.5">
                                      {statusIcon[entry.status]}
                                      <span className="text-foreground">{entry.nodeLabel}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60 text-foreground-secondary break-words whitespace-pre-wrap">
                                    {previewValue(entry.input)}
                                  </td>
                                  <td className="px-3 py-2 align-top border-b border-surface-border/60 text-foreground-secondary break-words whitespace-pre-wrap">
                                    {previewValue(entry.output)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-xs text-foreground-muted">No next nodes connected.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
                <Info size={22} className="text-brand-400/70" />
              </div>
              <p className="text-sm text-foreground-muted">Select a node from the left list to inspect input, output, metadata, and errors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

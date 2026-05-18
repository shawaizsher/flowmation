import { useRef, useState, useCallback, useEffect } from 'react';
import { X, Play, ExternalLink, ChevronRight, ChevronDown, Loader2, Key, Link2, Unlink, Plus } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import DynamicHeadersInput from './DynamicHeadersInput';
import NodeIcon from './canvas/NodeIcon';
import { useCredentialStore, getServiceForNodeType } from '../store/credentials';

// ── Output field inference ──────────────────────────────────────────────────

function inferOutputFields(nodeType: string): { expr: string; label: string; example?: string }[] {
  switch (nodeType) {
    case 'http_request':
    case 'httpRequest':
      return [
        { expr: 'data', label: 'Response body', example: '{ "price": 1923.4 }' },
        { expr: 'status', label: 'HTTP status', example: '200' },
        { expr: 'headers', label: 'Response headers', example: '{ "content-type": "..." }' },
        { expr: 'output', label: 'Full output' },
      ];
    case 'trigger_webhook':
    case 'triggerWebhook':
      return [
        { expr: 'body', label: 'Request body', example: '{ "event": "..." }' },
        { expr: 'headers', label: 'Request headers' },
        { expr: 'query', label: 'Query params' },
        { expr: 'method', label: 'HTTP method', example: '"POST"' },
      ];
    case 'trigger_schedule':
      return [
        { expr: 'timestamp', label: 'ISO timestamp' },
        { expr: 'date', label: 'Date string' },
      ];
    case 'transform_set':
    case 'transformSet':
      return [{ expr: 'output', label: 'Transformed data' }];
    case 'transform_filter':
      return [
        { expr: 'output', label: 'Filtered output' },
        { expr: 'passed', label: 'Filter result', example: 'true' },
      ];
    case 'console_log':
    case 'consoleLog':
      return [{ expr: 'output', label: 'Logged value' }];
    case 'email_send':
      return [{ expr: 'messageId', label: 'Message ID' }, { expr: 'output', label: 'Send result' }];
    case 'ai_summarize':
    case 'ai_prompt':
    case 'aiPrompt':
      return [
        { expr: 'result', label: 'AI response' },
        { expr: 'output', label: 'Full AI output' },
      ];
    default:
      return [{ expr: 'output', label: 'Node output' }];
  }
}

// ── HTTP field groups & defaults ────────────────────────────────────────────

const HTTP_GROUPS: Record<string, string[]> = {
  'Basic': ['method', 'url'],
  'Headers': ['dynamicHeaders'],
  'Body': ['bodyType', 'body'],
  'Authentication': ['authType', 'basicAuthUsername', 'basicAuthPassword', 'bearerToken', 'apiKeyName', 'apiKeyValue'],
  'Options': ['timeout', 'followRedirects', 'returnFullResponse'],
};

const HTTP_DEFAULTS: Record<string, any> = {
  method: 'GET', url: '', dynamicHeaders: [], bodyType: 'auto', body: '',
  authType: 'none', basicAuthUsername: '', basicAuthPassword: '', bearerToken: '',
  apiKeyName: '', apiKeyValue: '', timeout: 30, followRedirects: true, returnFullResponse: false,
};

function fmt(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Props ────────────────────────────────────────────────────────────────────

interface NodeConfigModalProps {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onUpdateConfig: (key: string, value: any) => void;
  nodeOutputMap?: Record<string, any>;
  lastOutput?: Record<string, any> | null;
  onRunUpstream?: () => void;
  runningUpstream?: boolean;
  onOpenCredManager?: (serviceId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

// Flatten a nested object into dot-path entries: { "a.b.c": value }
function flattenObject(obj: any, prefix = '', maxDepth = 3): Record<string, any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || maxDepth === 0) {
    return prefix ? { [prefix]: obj } : {};
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && maxDepth > 1) {
      Object.assign(result, flattenObject(v, path, maxDepth - 1));
    } else {
      result[path] = v;
    }
  }
  return result;
}

export default function NodeConfigModal({
  node, nodes, edges, onClose, onUpdateConfig,
  nodeOutputMap, lastOutput, onRunUpstream, runningUpstream, onOpenCredManager,
}: NodeConfigModalProps) {
  const credentialStore = useCredentialStore();
  const config: Record<string, any> = node.data.config || {};
  const nodeType: string = node.data.type || '';
  const isHttp = nodeType === 'http_request' || nodeType === 'httpRequest';

  const [tab, setTab] = useState<'parameters' | 'settings'>('parameters');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(
    edges.filter(e => e.target === node.id).map(e => e.source)
  ));
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  const lastFocusedRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const draggingExprRef = useRef<string | null>(null);

  const upstreamNodes = nodes.filter(n =>
    edges.some(e => e.source === n.id && e.target === node.id)
  );

  useEffect(() => {
    setExpandedNodes(new Set(edges.filter(e => e.target === node.id).map(e => e.source)));
  }, [edges, node.id]);

  const getVal = (key: string) => key in config ? config[key] : (HTTP_DEFAULTS[key] ?? '');

  const shouldShow = (key: string) => {
    if (!isHttp) return true;
    const auth = getVal('authType');
    if (key.startsWith('basicAuth') && auth !== 'basic') return false;
    if (key === 'bearerToken' && auth !== 'bearer') return false;
    if (key.startsWith('apiKey') && auth !== 'api_key') return false;
    return true;
  };

  const insertExpr = useCallback((expr: string) => {
    const el = lastFocusedRef.current;
    if (!el) return;
    const key = el.getAttribute('data-field-key');
    if (!key) return;
    const s = el.selectionStart ?? el.value.length;
    const e2 = el.selectionEnd ?? el.value.length;
    onUpdateConfig(key, el.value.slice(0, s) + expr + el.value.slice(e2));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + expr.length, s + expr.length);
    });
  }, [onUpdateConfig]);

  const handleDrop = useCallback((e: React.DragEvent<any>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(null);

    // Try dataTransfer first, fall back to our ref (works across all browsers)
    const expr = e.dataTransfer.getData('text/plain') || draggingExprRef.current || '';
    draggingExprRef.current = null;
    if (!expr) return;

    const currentVal = String(getVal(key) ?? '');
    // Append to end — avoids cursor-position issues with React controlled inputs
    onUpdateConfig(key, currentVal ? `${currentVal} ${expr}` : expr);
  }, [onUpdateConfig, getVal]);

  // ── Field renderer ────────────────────────────────────────────────────────

  const renderField = (key: string) => {
    const value = getVal(key);

    if (key === 'dynamicHeaders') {
      return (
        <DynamicHeadersInput
          value={Array.isArray(value) ? value : []}
          onChange={(h) => onUpdateConfig(key, h)}
        />
      );
    }

    if (typeof value === 'boolean') {
      return (
        <button
          onClick={() => onUpdateConfig(key, !value)}
          className={`w-full rounded-md px-3 py-2 text-sm font-semibold transition text-center border ${
            value
              ? 'bg-brand-500/15 text-brand-500 border-brand-500/30'
              : 'bg-surface-input text-foreground-muted border-surface-border hover:border-foreground-muted/30'
          }`}
        >
          {value ? '✓ Enabled' : '○ Disabled'}
        </button>
      );
    }

    const selects: Record<string, string[]> = {
      method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      authType: ['none', 'basic', 'bearer', 'api_key'],
      bodyType: ['auto', 'json', 'form', 'raw'],
      responseType: ['auto', 'json', 'text'],
    };
    if (selects[key]) {
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => onUpdateConfig(key, e.target.value)}
          className="w-full rounded-md border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
        >
          {selects[key].map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ').toUpperCase()}</option>)}
        </select>
      );
    }

    const isLong = String(value).length > 60 || ['body', 'headers', 'parameters', 'code'].includes(key);
    const fieldProps = {
      'data-field-key': key,
      onFocus: (e: React.FocusEvent<any>) => { lastFocusedRef.current = e.currentTarget; },
      onDragEnter: (e: React.DragEvent<any>) => { e.preventDefault(); setIsDragOver(key); },
      onDragOver: (e: React.DragEvent<any>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(key); },
      onDragLeave: (e: React.DragEvent<any>) => { e.preventDefault(); setIsDragOver(null); },
      onDrop: (e: React.DragEvent<any>) => handleDrop(e, key),
    };
    const isOver = isDragOver === key || (draggingExprRef.current !== null && isDragOver === null);
    const dropClass = isDragOver === key
      ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/30 shadow-[0_0_0_3px_rgba(var(--brand-500-rgb)/0.1)]'
      : isOver
        ? 'border-brand-500/50'
        : 'border-surface-border focus:border-brand-500/50';

    if (isLong) {
      return (
        <textarea
          {...fieldProps}
          value={String(value ?? '')}
          onChange={(e) => onUpdateConfig(key, e.target.value)}
          rows={key === 'body' ? 5 : 3}
          placeholder={`Enter ${fmt(key).toLowerCase()}…`}
          className={`w-full rounded-md border bg-surface-input p-3 font-mono text-sm text-foreground outline-none resize-none transition ${dropClass}`}
        />
      );
    }

    return (
      <input
        {...fieldProps}
        type={key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') ? 'password' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onUpdateConfig(key, e.target.value)}
        placeholder={`Enter ${fmt(key).toLowerCase()}…`}
        className={`w-full rounded-md border bg-surface-input px-3 py-2 text-sm text-foreground outline-none transition ${dropClass}`}
      />
    );
  };

  // ── Credential picker ─────────────────────────────────────────────────────

  const renderCredentialPicker = () => {
    const service = getServiceForNodeType(nodeType);
    if (!service) return null;

    const savedCreds = credentialStore.credentials.filter(c => c.serviceId === service.serviceId);
    const linkedCredId = node.data.credentialId as string | undefined;
    const linkedCred = linkedCredId ? credentialStore.getCredentialById(linkedCredId) : undefined;

    return (
      <div className="mt-5 pt-4 border-t border-surface-border">
        <div className="flex items-center gap-1.5 mb-3">
          <Key size={13} className="text-brand-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
            {service.label} Credential
          </span>
        </div>

        {linkedCred ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-green-400" />
                <span className="text-sm font-medium text-green-400">{linkedCred.name}</span>
              </div>
              <button
                onClick={() => onUpdateConfig('credentialId', '')}
                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-red-400 transition"
              >
                <Unlink size={12} /> Unlink
              </button>
            </div>
            <p className="mt-1 text-xs text-foreground-muted">
              {Object.values(linkedCred.values).filter(Boolean).length} field(s) configured
            </p>
          </div>
        ) : savedCreds.length > 0 ? (
          <div className="space-y-2">
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) onUpdateConfig('credentialId', e.target.value); }}
              className="w-full rounded-md border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
            >
              <option value="" disabled>Select a credential…</option>
              {savedCreds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => onOpenCredManager?.(service.serviceId)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-surface-border py-2 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-500 transition"
            >
              <Plus size={13} /> Add New {service.label} Credential
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenCredManager?.(service.serviceId)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-surface-border bg-surface-input py-3 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-500 transition"
          >
            <Key size={14} /> Connect {service.label} Account
          </button>
        )}
      </div>
    );
  };

  // ── Config form ───────────────────────────────────────────────────────────

  const renderConfig = () => {
    if (isHttp) {
      return (
        <>
          {Object.entries(HTTP_GROUPS).map(([group, fields]) => {
            const visible = fields.filter(shouldShow);
            if (!visible.length) return null;
            return (
              <div key={group} className="mb-5">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-500">{group}</p>
                <div className="space-y-3">
                  {visible.map((key) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">{fmt(key)}</label>
                      {renderField(key)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {renderCredentialPicker()}
        </>
      );
    }
    return (
      <>
        <div className="space-y-4">
          {Object.keys(config).map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">{fmt(key)}</label>
              {renderField(key)}
            </div>
          ))}
        </div>
        {renderCredentialPicker()}
      </>
    );
  };

  // ── Output panel ──────────────────────────────────────────────────────────

  const renderOutput = () => {
    const output = nodeOutputMap?.[node.id] ?? lastOutput;
    if (output) { const lastOutput = output;
      return (
        <div className="space-y-2">
          {Object.entries(lastOutput).map(([k, v]) => (
            <div key={k} className="rounded-md border border-surface-border bg-surface-base p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-1">{k}</p>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
                {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
              </pre>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <div className="text-foreground-muted/30">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 5H21M13 9H18M13 15H21M13 19H18M3 5C3 5 5 7 5 12C5 17 3 19 3 19" />
            <line x1="3" y1="5" x2="3" y2="19" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground-muted">No output data</p>
          <p className="text-xs text-foreground-muted/60 mt-1 leading-relaxed">
            Output will appear here once the<br />parent node is run
          </p>
        </div>
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden"
        style={{ width: 980, maxWidth: '96vw', height: '86vh', maxHeight: 740 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-surface-base shrink-0">
          <div className="flex items-center gap-2.5">
            <NodeIcon nodeType={nodeType} size="sm" />
            <span className="text-sm font-semibold text-foreground">{node.data.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition">
              <ExternalLink size={12} /> Docs
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-border hover:text-foreground transition"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── 3-column body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT — INPUT ─────────────────────────────────────────────────── */}
          <div className="w-[260px] shrink-0 flex flex-col border-r border-surface-border bg-surface-base">
            <div className="px-4 pt-3 pb-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Input</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {upstreamNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="text-foreground-muted/25">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13 5H3M13 9H6M13 15H3M13 19H6" />
                      <line x1="21" y1="5" x2="21" y2="19" />
                    </svg>
                  </div>
                  <p className="text-xs text-foreground-muted/60 leading-relaxed">
                    No input data.<br />Connect an upstream node.
                  </p>
                  {onRunUpstream && (
                    <button
                      onClick={onRunUpstream}
                      disabled={runningUpstream}
                      className="flex items-center gap-2 rounded-md bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600 transition disabled:opacity-50"
                    >
                      {runningUpstream ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      Execute previous nodes
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] text-foreground-muted/60 mb-3 leading-relaxed">
                    Drag or click a field to insert it into the focused input.
                  </p>

                  {upstreamNodes.map((upNode) => {
                    const label = upNode.data.label || upNode.id;
                    const fields = inferOutputFields(upNode.data.type || '');
                    const isOpen = expandedNodes.has(upNode.id);

                    return (
                      <div key={upNode.id} className="rounded-lg border border-surface-border overflow-hidden">
                        <button
                          onClick={() => setExpandedNodes((prev) => {
                            const next = new Set(prev);
                            next.has(upNode.id) ? next.delete(upNode.id) : next.add(upNode.id);
                            return next;
                          })}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-surface-hover hover:bg-surface-border/60 transition text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <NodeIcon nodeType={upNode.data.type || ''} size="sm" />
                            <span className="text-xs font-medium text-foreground truncate">{label}</span>
                          </div>
                          {isOpen
                            ? <ChevronDown size={11} className="text-foreground-muted shrink-0" />
                            : <ChevronRight size={11} className="text-foreground-muted shrink-0" />
                          }
                        </button>

                        {isOpen && (() => {
                          // Use real execution output if available, else inferred fields
                          const realOutput = nodeOutputMap?.[upNode.id];
                          const flatFields = realOutput
                            ? Object.entries(flattenObject(realOutput)).slice(0, 30)
                            : fields.map(({ expr, label: fieldLabel, example }) => [expr, example ?? fieldLabel] as [string, any]);

                          return (
                            <div className="divide-y divide-surface-border">
                              {realOutput && (
                                <div className="px-3 py-1.5 bg-green-500/5 border-b border-surface-border">
                                  <span className="text-[10px] font-medium text-green-500">● Live data from last run</span>
                                </div>
                              )}
                              {flatFields.map(([path, val]) => {
                                const fullExpr = `{{ ${label}.${path} }}`;
                                const preview = val !== null && val !== undefined
                                  ? String(val).slice(0, 40)
                                  : '';
                                return (
                                  <div
                                    key={path}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', fullExpr);
                                      e.dataTransfer.effectAllowed = 'copy';
                                      draggingExprRef.current = fullExpr;
                                    }}
                                    onDragEnd={() => { draggingExprRef.current = null; }}
                                    onClick={() => insertExpr(fullExpr)}
                                    className="group flex items-start gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-surface-hover transition select-none"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <code className="block text-[11px] font-mono text-brand-500 truncate mb-0.5">
                                        {`{{ ${path} }}`}
                                      </code>
                                      {preview && (
                                        <p className="text-[10px] text-foreground-muted/60 font-mono truncate">{preview}</p>
                                      )}
                                    </div>
                                    <div className="mt-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                      <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" className="text-foreground-muted/40">
                                        <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
                                        <circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/>
                                        <circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/>
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE — CONFIG ──────────────────────────────────────────────── */}
          <div
            className="flex-1 flex flex-col min-w-0"
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex border-b border-surface-border shrink-0 px-5 bg-surface-card">
              {(['parameters', 'settings'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition capitalize ${
                    tab === t
                      ? 'border-brand-500 text-brand-500'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-surface-card">
              {tab === 'parameters' ? (
                renderConfig()
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">Node Label</label>
                    <input
                      type="text"
                      defaultValue={node.data.label}
                      onChange={(e) => onUpdateConfig('__label__', e.target.value)}
                      className="w-full rounded-md border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">Node Type</label>
                    <input
                      readOnly
                      value={nodeType}
                      className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-foreground-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — OUTPUT ───────────────────────────────────────────────── */}
          <div className="w-[260px] shrink-0 flex flex-col border-l border-surface-border bg-surface-base">
            <div className="px-4 pt-3 pb-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Output</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {renderOutput()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

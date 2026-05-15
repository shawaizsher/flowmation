import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) summaryMap[n.type] = n.description;

// ── Category → solid accent colour ────────────────────────────────────────
const categoryColor: Record<string, string> = {
  triggers:  '#f59e0b',
  google:    '#3b82f6',
  ai:        '#e11d48',
  social:    '#ec4899',
  messaging: '#10b981',
  databases: '#f97316',
  cloud:     '#06b6d4',
  http:      '#6366f1',
  files:     '#f59e0b',
  transform: '#14b8a6',
  logic:     '#64748b',
  crm:       '#10b981',
  payments:  '#84cc16',
  analytics: '#e11d48',
  utilities: '#6b7280',
};

// ── Status styles ──────────────────────────────────────────────────────────
const statusRing: Record<string, string> = {
  running: 'border-yellow-400 shadow-[0_0_0_1px_rgba(250,204,21,0.3)]',
  success: 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]',
  failed:  'border-red-400   shadow-[0_0_0_1px_rgba(248,113,113,0.3)]',
  skipped: 'border-slate-400',
};

const statusBadge: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  running: { bg: 'bg-yellow-400/10',  dot: 'bg-yellow-400',  text: 'text-yellow-500',  label: 'Running' },
  success: { bg: 'bg-emerald-400/10', dot: 'bg-emerald-400', text: 'text-emerald-600', label: 'Done'    },
  failed:  { bg: 'bg-red-400/10',     dot: 'bg-red-400',     text: 'text-red-500',     label: 'Failed'  },
  skipped: { bg: 'bg-slate-400/10',   dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'Skipped' },
};

function getCategoryFromType(type: string): string {
  if (type.startsWith('trigger_'))                                                                  return 'triggers';
  if (type.startsWith('google_') || type.startsWith('youtube_'))                                   return 'google';
  if (type.startsWith('openai_') || type.startsWith('anthropic_') || type.startsWith('ai_') || type.startsWith('whisper_') || type.startsWith('huggingface_')) return 'ai';
  if (type.startsWith('twitter_') || type.startsWith('instagram_') || type.startsWith('linkedin_') || type.startsWith('reddit_')) return 'social';
  if (type.startsWith('slack_') || type.startsWith('discord_') || type.startsWith('telegram_') || type.startsWith('whatsapp_') || type.startsWith('email_') || type.startsWith('twilio_')) return 'messaging';
  if (type.startsWith('postgres_') || type.startsWith('mysql_') || type.startsWith('mongodb_') || type.startsWith('redis_') || type.startsWith('firebase_') || type.startsWith('supabase_')) return 'databases';
  if (type.startsWith('aws_') || type.startsWith('github_') || type.startsWith('docker_') || type.startsWith('vercel_')) return 'cloud';
  if (type.startsWith('http_') || type.startsWith('graphql_') || type.startsWith('rest_') || type.startsWith('soap_')) return 'http';
  if (type.startsWith('file_') || type.startsWith('csv_') || type.startsWith('pdf_') || type.startsWith('ftp_')) return 'files';
  if (type.startsWith('transform_') || type.startsWith('json_') || type.startsWith('xml_') || type.startsWith('code_')) return 'transform';
  if (type.startsWith('logic_') || type.startsWith('error_'))                                      return 'logic';
  if (type.startsWith('salesforce_') || type.startsWith('hubspot_') || type.startsWith('airtable_') || type.startsWith('notion_')) return 'crm';
  if (type.startsWith('stripe_') || type.startsWith('paypal_'))                                    return 'payments';
  if (type.startsWith('google_analytics') || type.startsWith('mixpanel_') || type.startsWith('segment_')) return 'analytics';
  return 'utilities';
}

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status       = nodeStatuses[id] as string | undefined;
  const category     = getCategoryFromType(data.type || '');
  const accent       = categoryColor[category] || '#64748b';
  const { deleteElements } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div
      className={`group relative flex w-[230px] overflow-hidden rounded-xl border bg-surface-card transition-all duration-150 ${
        selected
          ? 'border-brand-500/60 shadow-[0_0_0_2px_rgba(var(--brand-500-rgb),0.15),0_8px_24px_rgba(0,0,0,0.15)]'
          : status && statusRing[status]
          ? statusRing[status]
          : 'border-surface-border hover:border-surface-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
      } ${dragging ? 'scale-[1.02] shadow-[0_12px_32px_rgba(0,0,0,0.18)]' : ''}`}
    >
      {/* ── Delete button ─────────────────────────────────────────────── */}
      <button
        onClick={handleDelete}
        className="absolute right-1.5 top-1.5 z-20 hidden h-5 w-5 items-center justify-center rounded-md text-foreground-muted/50 transition hover:bg-red-500/15 hover:text-red-500 group-hover:flex"
        title="Delete node"
      >
        <X size={11} />
      </button>

      {/* ── INPUT handle ──────────────────────────────────────────────── */}
      <Handle
        type="target"
        id="in"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{
          top: '50%',
          left: -6,
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: `2px solid ${accent}`,
          boxShadow: '0 0 0 2px var(--surface-card)',
          zIndex: 20,
        }}
        className="!border-2 transition-transform group-hover:scale-110"
      />

      {/* ── OUTPUT handle ─────────────────────────────────────────────── */}
      <Handle
        type="source"
        id="out"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{
          top: '50%',
          right: -6,
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: accent,
          border: `2px solid ${accent}`,
          boxShadow: `0 0 0 2px var(--surface-card), 0 0 8px ${accent}55`,
          zIndex: 20,
        }}
        className="transition-transform group-hover:scale-110"
      />

      {/* ── Left coloured icon section ────────────────────────────────── */}
      <div
        className="flex w-[60px] shrink-0 items-center justify-center relative"
        style={{ background: `${accent}18` }}
      >
        <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} />
        <NodeIcon nodeType={data.type || ''} size="md" className="!h-8 !w-8 !rounded-lg" />
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3">
        <div
          className="truncate text-[13px] font-semibold leading-snug text-foreground pr-4"
          title={data.label}
        >
          {data.label}
        </div>

        {summaryMap[data.type || ''] && (
          <div className="mt-[3px] truncate text-[10.5px] leading-snug text-foreground-muted">
            {summaryMap[data.type || '']}
          </div>
        )}

        {/* Status badge */}
        {status && statusBadge[status] && (
          <div className={`mt-1.5 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 ${statusBadge[status].bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[status].dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-semibold leading-none ${statusBadge[status].text}`}>
              {statusBadge[status].label}
            </span>
          </div>
        )}
      </div>

      {/* ── Running pulse ─────────────────────────────────────────────── */}
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

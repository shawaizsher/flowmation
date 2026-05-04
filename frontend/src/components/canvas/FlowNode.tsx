import { memo, useMemo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

// Build a type → short summary lookup once
const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) {
  summaryMap[n.type] = n.description;
}

const statusColors: Record<string, string> = {
  running: 'border-yellow-400 shadow-yellow-400/20 shadow-lg',
  success: 'border-green-400 shadow-green-400/20 shadow-lg',
  failed: 'border-red-400 shadow-red-400/20 shadow-lg',
  skipped: 'border-gray-500',
};

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  running: { bg: 'bg-yellow-400/20', text: 'text-yellow-400', label: '● Running' },
  success: { bg: 'bg-green-400/20', text: 'text-green-400', label: '✓ Done' },
  failed: { bg: 'bg-red-400/20', text: 'text-red-400', label: '✗ Failed' },
  skipped: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '○ Skipped' },
};

// Category-specific top-bar accent colors
const categoryAccent: Record<string, string> = {
  triggers:  'from-yellow-400 to-amber-500',
  google:    'from-blue-400 to-blue-600',
  ai:        'from-rose-400 to-red-600',
  social:    'from-pink-400 to-rose-500',
  messaging: 'from-green-400 to-emerald-500',
  databases: 'from-orange-400 to-orange-600',
  cloud:     'from-cyan-400 to-sky-500',
  http:      'from-indigo-400 to-indigo-600',
  files:     'from-amber-400 to-yellow-600',
  transform: 'from-teal-400 to-teal-600',
  logic:     'from-slate-400 to-slate-500',
  crm:       'from-emerald-400 to-green-600',
  payments:  'from-lime-400 to-green-500',
  analytics: 'from-rose-400 to-pink-600',
  utilities: 'from-gray-400 to-gray-500',
};

function getCategoryFromType(type: string): string {
  if (type.startsWith('trigger_')) return 'triggers';
  if (type.startsWith('google_') || type.startsWith('youtube_')) return 'google';
  if (type.startsWith('openai_') || type.startsWith('anthropic_') || type.startsWith('huggingface_') || type.startsWith('ai_') || type.startsWith('whisper_')) return 'ai';
  if (type.startsWith('twitter_') || type.startsWith('instagram_') || type.startsWith('linkedin_') || type.startsWith('reddit_')) return 'social';
  if (type.startsWith('slack_') || type.startsWith('discord_') || type.startsWith('telegram_') || type.startsWith('whatsapp_') || type.startsWith('email_') || type.startsWith('twilio_')) return 'messaging';
  if (type.startsWith('postgres_') || type.startsWith('mysql_') || type.startsWith('mongodb_') || type.startsWith('redis_') || type.startsWith('firebase_') || type.startsWith('supabase_')) return 'databases';
  if (type.startsWith('aws_') || type.startsWith('github_') || type.startsWith('docker_') || type.startsWith('vercel_')) return 'cloud';
  if (type.startsWith('http_') || type.startsWith('graphql_') || type.startsWith('rest_') || type.startsWith('soap_')) return 'http';
  if (type.startsWith('file_') || type.startsWith('csv_') || type.startsWith('pdf_') || type.startsWith('ftp_')) return 'files';
  if (type.startsWith('transform_') || type.startsWith('json_') || type.startsWith('xml_') || type.startsWith('code_')) return 'transform';
  if (type.startsWith('logic_') || type.startsWith('error_')) return 'logic';
  if (type.startsWith('salesforce_') || type.startsWith('hubspot_') || type.startsWith('airtable_') || type.startsWith('notion_')) return 'crm';
  if (type.startsWith('stripe_') || type.startsWith('paypal_')) return 'payments';
  if (type.startsWith('google_analytics') || type.startsWith('mixpanel_') || type.startsWith('segment_')) return 'analytics';
  if (type.startsWith('util_')) return 'utilities';
  return 'utilities';
}

function FlowNode({ data, selected, id, isConnectable }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const category = getCategoryFromType(data.type || '');
  const accent = categoryAccent[category] || 'from-brand-400 to-brand-600';
  const summary = summaryMap[data.type || ''] || '';
  const { deleteElements } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div
      className={`group relative min-w-[200px] max-w-[260px] rounded-xl border-2 bg-surface-card overflow-visible transition-all duration-150 ${
        selected
          ? 'border-brand-500 shadow-xl shadow-brand-500/25 scale-[1.02]'
          : status && statusColors[status]
          ? statusColors[status]
          : 'border-[#1e2d42] hover:border-[#3a5070] hover:shadow-lg hover:shadow-black/20'
      }`}
    >
      {/* Delete button — visible on hover */}
      <button
        onClick={handleDelete}
        className="absolute right-1.5 top-1.5 z-10 hidden rounded-md p-1 text-foreground-muted/60 hover:bg-red-500/20 hover:text-red-400 transition group-hover:flex items-center justify-center"
        title="Delete node"
      >
        <X size={13} />
      </button>

      {/* Category accent bar */}
      <div className={`h-[4px] w-full bg-gradient-to-r ${accent} rounded-t-[10px]`} />

      {/* Input connector */}
      <Handle
        type="target"
        id="in"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{
          background: 'var(--surface-card)',
          borderColor: 'rgb(var(--brand-500-rgb))',
        }}
        className="!h-4 !w-4 !rounded-full !border-2 !shadow-[0_0_0_3px_rgba(246,48,73,0.2)] !left-0 !z-20 transition-all group-hover:!shadow-[0_0_0_5px_rgba(246,48,73,0.25)]"
      />

      {/* Output connector */}
      <Handle
        type="source"
        id="out"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{
          background: 'var(--surface-card)',
          borderColor: 'rgb(var(--brand-500-rgb))',
        }}
        className="!h-4 !w-4 !rounded-full !border-2 !shadow-[0_0_0_3px_rgba(246,48,73,0.2)] !right-0 !z-20 transition-all group-hover:!shadow-[0_0_0_5px_rgba(246,48,73,0.25)]"
      />

      {/* Node content */}
      <div className="flex items-center gap-3 px-3.5 py-3.5">
        <NodeIcon nodeType={data.type || ''} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground leading-tight" title={data.label}>
            {data.label}
          </div>
          {summary ? (
            <div className="truncate text-[11px] font-medium text-foreground-muted mt-0.5">{summary}</div>
          ) : (
            <div className="truncate text-[11px] text-foreground-muted/60 mt-0.5">{data.type}</div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {status && statusBadge[status] && (
        <div className={`mx-3 mb-3 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 ${statusBadge[status].bg}`}>
          <span className={`text-xs font-bold tracking-wide ${statusBadge[status].text}`}>
            {statusBadge[status].label}
          </span>
        </div>
      )}

      {/* Running pulse */}
      {status === 'running' && (
        <div className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-60" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-yellow-400" />
        </div>
      )}

    </div>
  );
}

export default memo(FlowNode);

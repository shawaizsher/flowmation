import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X } from 'lucide-react';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) {
  summaryMap[n.type] = n.description;
}

const statusColors: Record<string, string> = {
  running: 'border-yellow-400/80 shadow-[0_0_0_1px_rgba(250,204,21,0.18)]',
  success: 'border-emerald-400/80 shadow-[0_0_0_1px_rgba(52,211,153,0.16)]',
  failed: 'border-red-400/80 shadow-[0_0_0_1px_rgba(248,113,113,0.18)]',
  skipped: 'border-slate-500',
};

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  running: { bg: 'bg-yellow-400/10', text: 'text-yellow-300', label: 'Running' },
  success: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', label: 'Done' },
  failed: { bg: 'bg-red-400/10', text: 'text-red-300', label: 'Failed' },
  skipped: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Skipped' },
};

const categoryAccent: Record<string, string> = {
  triggers: 'from-yellow-400 to-amber-500',
  google: 'from-blue-400 to-blue-600',
  ai: 'from-rose-400 to-red-600',
  social: 'from-pink-400 to-rose-500',
  messaging: 'from-green-400 to-emerald-500',
  databases: 'from-orange-400 to-orange-600',
  cloud: 'from-cyan-400 to-sky-500',
  http: 'from-indigo-400 to-indigo-600',
  files: 'from-amber-400 to-yellow-600',
  transform: 'from-teal-400 to-teal-600',
  logic: 'from-slate-400 to-slate-500',
  crm: 'from-emerald-400 to-green-600',
  payments: 'from-lime-400 to-green-500',
  analytics: 'from-rose-400 to-pink-600',
  utilities: 'from-gray-400 to-gray-500',
};

const categoryHandleColor: Record<string, string> = {
  triggers: '#facc15',
  google: '#60a5fa',
  ai: '#fb7185',
  social: '#f472b6',
  messaging: '#34d399',
  databases: '#fb923c',
  cloud: '#22d3ee',
  http: '#818cf8',
  files: '#f59e0b',
  transform: '#2dd4bf',
  logic: '#94a3b8',
  crm: '#34d399',
  payments: '#84cc16',
  analytics: '#fb7185',
  utilities: '#94a3b8',
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

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const category = getCategoryFromType(data.type || '');
  const accent = categoryAccent[category] || 'from-brand-400 to-brand-600';
  const handleColor = categoryHandleColor[category] || '#34d399';
  const summary = summaryMap[data.type || ''] || '';
  const { deleteElements } = useReactFlow();

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div
      className={`group relative h-[76px] w-[226px] overflow-visible rounded-md border bg-[#0f172a] transition-[border-color,box-shadow,transform,background-color] duration-150 ${
        selected
          ? 'border-emerald-400/90 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_10px_24px_rgba(0,0,0,0.28)]'
          : status && statusColors[status]
          ? statusColors[status]
          : 'border-slate-700/80 hover:border-slate-500 hover:shadow-[0_0_0_1px_rgba(148,163,184,0.1)]'
      } ${dragging ? 'scale-[1.015] shadow-[0_12px_28px_rgba(0,0,0,0.32)]' : ''}`}
    >
      <button
        onClick={handleDelete}
        className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-sm text-slate-500 transition hover:bg-red-500/15 hover:text-red-300 group-hover:flex"
        title="Delete node"
      >
        <X size={12} />
      </button>

      <div className={`h-[3px] w-full rounded-t-md bg-gradient-to-r ${accent}`} />

      <Handle
        type="target"
        id="in"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{
          background: '#020617',
          borderColor: handleColor,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 0 2px rgba(15, 23, 42, 0.95), 0 0 8px ${handleColor}40`,
        }}
        className="!left-0 !z-20 !h-2.5 !w-2.5 !rounded-full !border transition-all group-hover:!scale-110"
      />

      <Handle
        type="source"
        id="out"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{
          background: handleColor,
          borderColor: handleColor,
          top: '50%',
          transform: 'translate(50%, -50%)',
          boxShadow: `0 0 0 2px rgba(15, 23, 42, 0.95), 0 0 8px ${handleColor}40`,
        }}
        className="!right-0 !z-20 !h-2.5 !w-2.5 !rounded-full !border transition-all group-hover:!scale-110"
      />

      <div className="flex h-[73px] items-center gap-2.5 px-3">
        <NodeIcon nodeType={data.type || ''} size="sm" className="!h-8 !w-8 !rounded-md" />
        <div className="min-w-0 flex-1 pr-4">
          <div className="truncate text-[13px] font-bold leading-4 text-slate-100" title={data.label}>
            {data.label}
          </div>
          {summary ? (
            <div className="mt-1 truncate text-[11px] font-medium leading-3 text-slate-500" title={summary}>
              {data.type}
            </div>
          ) : (
            <div className="mt-1 truncate text-[11px] leading-3 text-slate-500">{data.type}</div>
          )}
        </div>
      </div>

      {status && statusBadge[status] && (
        <div className={`absolute bottom-1 right-1 rounded-sm px-1.5 py-0.5 ${statusBadge[status].bg}`}>
          <span className={`text-[10px] font-semibold leading-none ${statusBadge[status].text}`}>
            {statusBadge[status].label}
          </span>
        </div>
      )}

      {status === 'running' && (
        <div className="absolute -right-1 -top-1 h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
        </div>
      )}
    </div>
  );
}

export default memo(FlowNode);

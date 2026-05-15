import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import {
  X,
  Copy,
  Play,
  Bug,
  Plus,
  Cpu,
  Database,
  Braces,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

// ── Lookup maps ──────────────────────────────────────────────────────────────

const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) summaryMap[n.type] = n.description;

// ── Node category classification ─────────────────────────────────────────────

const AI_TYPES = new Set([
  'openai_chat', 'openai_image', 'openai_embeddings', 'openai_tts',
  'anthropic_chat', 'gemini_chat', 'gemini_vision', 'mistral_chat',
  'perplexity_search', 'huggingface_inference', 'groq_chat', 'deepseek_chat',
  'ollama_chat', 'replicate_run', 'langchain_chain', 'ai_text_classifier',
  'ai_summarizer', 'whisper_transcribe', 'elevenlabs_tts', 'cohere_generate',
  'cohere_embed', 'stability_generate',
]);

const LOGIC_TYPES = new Set([
  'logic_if', 'logic_switch', 'logic_loop', 'logic_delay', 'logic_retry',
  'logic_parallel', 'error_handler', 'transform_map', 'transform_filter',
  'transform_aggregate', 'transform_merge', 'json_parse', 'xml_parse',
  'code_javascript', 'code_python',
]);

const DB_TYPES = new Set([
  'postgres_query', 'mysql_query', 'mongodb_find', 'redis_command',
  'firebase_read', 'supabase_query', 'elasticsearch_query', 'dynamodb_query',
  'pinecone_upsert', 'pinecone_query', 'qdrant_search', 'weaviate_query', 'chroma_query',
]);

const COMM_TYPES = new Set([
  'slack_message', 'discord_message', 'telegram_send', 'whatsapp_send',
  'email_send', 'twilio_sms', 'teams_message', 'sendgrid_email', 'mailgun_send',
  'twitter_post', 'twitter_search', 'instagram_post', 'linkedin_post',
  'reddit_post', 'facebook_post', 'tiktok_post', 'youtube_upload',
  'mailchimp_add_member', 'mailchimp_send_campaign',
]);

type NodeVariant = 'trigger' | 'ai' | 'logic' | 'database' | 'communication' | 'integration';

function getNodeVariant(nodeType: string): NodeVariant {
  if (nodeType.startsWith('trigger_')) return 'trigger';
  if (AI_TYPES.has(nodeType)) return 'ai';
  if (LOGIC_TYPES.has(nodeType)) return 'logic';
  if (DB_TYPES.has(nodeType)) return 'database';
  if (COMM_TYPES.has(nodeType)) return 'communication';
  return 'integration';
}

// ── Variant visual config ────────────────────────────────────────────────────

interface VariantConfig {
  accentColor: string;
  idleGlow: string;
  selectedGlow: string;
  badgeText: string;
  badgeClass: string;
  headerGradient: string;
  footerBorder: string;
}

const VARIANT_CONFIG: Record<NodeVariant, VariantConfig> = {
  trigger: {
    accentColor: '#F59E0B',
    idleGlow: '0 0 0 1px rgba(245,158,11,0.18)',
    selectedGlow: '0 0 0 1.5px rgba(245,158,11,0.7), 0 0 24px rgba(245,158,11,0.2)',
    badgeText: 'Trigger',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    headerGradient: 'rgba(245,158,11,0.06)',
    footerBorder: 'rgba(245,158,11,0.12)',
  },
  ai: {
    accentColor: '#A78BFA',
    idleGlow: '0 0 0 1px rgba(139,92,246,0.2)',
    selectedGlow: '0 0 0 1.5px rgba(139,92,246,0.75), 0 0 28px rgba(139,92,246,0.22)',
    badgeText: 'AI',
    badgeClass: 'bg-violet-500/10 text-violet-400 border border-violet-500/22',
    headerGradient: 'rgba(139,92,246,0.07)',
    footerBorder: 'rgba(139,92,246,0.15)',
  },
  logic: {
    accentColor: '#94A3B8',
    idleGlow: '0 0 0 1px rgba(100,116,139,0.18)',
    selectedGlow: '0 0 0 1.5px rgba(100,116,139,0.6), 0 0 20px rgba(100,116,139,0.14)',
    badgeText: 'Logic',
    badgeClass: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    headerGradient: 'rgba(100,116,139,0.05)',
    footerBorder: 'rgba(100,116,139,0.12)',
  },
  database: {
    accentColor: '#60A5FA',
    idleGlow: '0 0 0 1px rgba(59,130,246,0.18)',
    selectedGlow: '0 0 0 1.5px rgba(59,130,246,0.7), 0 0 24px rgba(59,130,246,0.2)',
    badgeText: 'Database',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    headerGradient: 'rgba(59,130,246,0.06)',
    footerBorder: 'rgba(59,130,246,0.12)',
  },
  communication: {
    accentColor: '#34D399',
    idleGlow: '0 0 0 1px rgba(16,185,129,0.18)',
    selectedGlow: '0 0 0 1.5px rgba(16,185,129,0.7), 0 0 24px rgba(16,185,129,0.2)',
    badgeText: 'Comm',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    headerGradient: 'rgba(16,185,129,0.06)',
    footerBorder: 'rgba(16,185,129,0.12)',
  },
  integration: {
    accentColor: '#818CF8',
    idleGlow: '0 0 0 1px rgba(99,102,241,0.16)',
    selectedGlow: '0 0 0 1.5px rgba(99,102,241,0.65), 0 0 22px rgba(99,102,241,0.18)',
    badgeText: 'Integration',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/18',
    headerGradient: 'rgba(99,102,241,0.05)',
    footerBorder: 'rgba(99,102,241,0.12)',
  },
};

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_BORDER: Record<string, string> = {
  running: '#3B82F6',
  success: '#10B981',
  failed:  '#EF4444',
  skipped: '#475569',
};

const STATUS_GLOW: Record<string, string> = {
  running: '0 0 0 1.5px rgba(59,130,246,0.45), 0 0 24px rgba(59,130,246,0.22)',
  success: '0 0 0 1px rgba(16,185,129,0.4), 0 0 18px rgba(16,185,129,0.15)',
  failed:  '0 0 0 1.5px rgba(239,68,68,0.45), 0 0 22px rgba(239,68,68,0.2)',
  skipped: '0 0 0 1px rgba(71,85,105,0.3)',
};

// ── Config preview helpers ───────────────────────────────────────────────────

const SKIP_KEYS = new Set([
  'credentialId', 'id', 'nodeId', 'workspaceId', 'workflowId',
  'memory', 'enableMemory', 'conversationHistory', 'outputParser', 'parser', 'parseJson', 'tools',
]);

function getConfigPreview(config: Record<string, any>): Array<{ key: string; value: string }> {
  if (!config) return [];
  const results: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(config)) {
    if (SKIP_KEYS.has(key)) continue;
    if (!value && value !== 0 && value !== false) continue;

    let displayValue = '';
    if (typeof value === 'boolean') {
      displayValue = value ? 'Enabled' : 'Disabled';
    } else if (typeof value === 'string') {
      displayValue = value.length > 32 ? value.substring(0, 32) + '…' : value;
    } else if (typeof value === 'number') {
      displayValue = String(value);
    } else if (Array.isArray(value) && value.length > 0) {
      displayValue = `${value.length} item${value.length !== 1 ? 's' : ''}`;
    } else {
      continue;
    }

    const displayKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

    results.push({ key: displayKey, value: displayValue });
    if (results.length >= 2) break;
  }

  return results;
}

interface AICapabilities {
  model?: string;
  hasMemory: boolean;
  hasParser: boolean;
  toolCount: number;
}

function getAICapabilities(config: Record<string, any>): AICapabilities {
  return {
    model: config?.model || config?.modelId || undefined,
    hasMemory: !!(config?.memory || config?.enableMemory || config?.conversationHistory),
    hasParser: !!(config?.outputParser || config?.parser || config?.parseJson),
    toolCount: Array.isArray(config?.tools) ? config.tools.length : 0,
  };
}

// ── Handle component ─────────────────────────────────────────────────────────

function NodeHandle({
  type,
  position,
  id: handleId,
  isConnectable,
  isHovered,
  accentColor,
  nodeId: _nodeId,
}: {
  type: 'source' | 'target';
  position: typeof Position.Left | typeof Position.Right;
  id: string;
  isConnectable: boolean;
  isHovered: boolean;
  accentColor: string;
  nodeId: string;
}) {
  const isLeft = position === Position.Left;
  const offset = isLeft ? { left: -7 } : { right: -7 };

  return (
    <Handle
      type={type}
      id={handleId}
      position={position}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        ...offset,
        transform: 'translateY(-50%)',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: isHovered ? accentColor : '#131929',
        border: `2px solid ${isHovered ? accentColor : 'rgba(255,255,255,0.12)'}`,
        boxShadow: isHovered ? `0 0 0 3px ${accentColor}22, 0 0 10px ${accentColor}55` : '0 1px 4px rgba(0,0,0,0.5)',
        transition: 'all 0.18s ease',
        zIndex: 20,
      }}
    />
  );
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickActionBtn({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg transition-all duration-100 ${
        danger
          ? 'text-red-400/70 hover:bg-red-500/12 hover:text-red-400'
          : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'
      }`}
    >
      {icon}
    </button>
  );
}

// ── Main FlowNode component ───────────────────────────────────────────────────

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const { deleteElements } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const nodeType: string = data.type || '';
  const variant = getNodeVariant(nodeType);
  const vcfg = VARIANT_CONFIG[variant];
  const isAI = variant === 'ai';

  const configPreview = getConfigPreview(data.config || {});
  const aiCaps: AICapabilities | null = isAI ? getAICapabilities(data.config || {}) : null;
  const hasAIFooter = isAI && aiCaps && (aiCaps.model || aiCaps.hasMemory || aiCaps.hasParser || aiCaps.toolCount > 0);
  const hasBodyContent = configPreview.length > 0;

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
    },
    [id, deleteElements]
  );

  // Compute card border + shadow
  let cardBorder = 'rgba(255,255,255,0.07)';
  let cardShadow = '0 2px 12px rgba(0,0,0,0.35)';

  if (status && STATUS_BORDER[status]) {
    cardBorder = STATUS_BORDER[status];
    cardShadow = STATUS_GLOW[status] + ', 0 4px 20px rgba(0,0,0,0.4)';
  } else if (selected) {
    cardBorder = vcfg.accentColor;
    cardShadow = vcfg.selectedGlow + ', 0 6px 24px rgba(0,0,0,0.45)';
  } else if (isHovered && !dragging) {
    cardBorder = 'rgba(255,255,255,0.13)';
    cardShadow = '0 0 0 1px rgba(255,255,255,0.07), 0 8px 28px rgba(0,0,0,0.45)';
  } else {
    cardShadow = vcfg.idleGlow + ', 0 2px 12px rgba(0,0,0,0.35)';
  }

  return (
    <div
      className="relative overflow-visible"
      style={{ width: 264 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Input handle ── */}
      <NodeHandle
        type="target"
        id="in"
        position={Position.Left}
        isConnectable={isConnectable}
        isHovered={isHovered && !dragging}
        accentColor={vcfg.accentColor}
        nodeId={id}
      />

      {/* ── Main card ── */}
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border transition-shadow duration-200 ${
          status === 'failed' ? 'animate-node-shake' : ''
        } ${status === 'running' ? 'animate-node-running' : ''} ${
          dragging ? 'scale-[1.015]' : ''
        }`}
        style={{
          backgroundColor: 'rgba(13, 18, 30, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderColor: cardBorder,
          boxShadow: cardShadow,
          transition: 'border-color 0.2s ease, box-shadow 0.25s ease, transform 0.12s ease',
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
          style={{
            backgroundColor: vcfg.accentColor,
            opacity: selected || (status && status !== 'skipped') ? 1 : 0.45,
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* ── Header ── */}
        <div
          className="flex items-start gap-3 pl-5 pr-3.5 pt-3.5 pb-3"
          style={{
            background: (isHovered || selected)
              ? `linear-gradient(135deg, ${vcfg.headerGradient} 0%, transparent 65%)`
              : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            <NodeIcon nodeType={nodeType} size="md" />
          </div>

          {/* Text content */}
          <div className="min-w-0 flex-1 min-h-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-semibold leading-tight text-white/90"
                  title={data.label}
                >
                  {data.label}
                </div>
                {summaryMap[nodeType] && (
                  <div
                    className="mt-[3px] truncate text-[10.5px] leading-snug text-white/38"
                    title={summaryMap[nodeType]}
                  >
                    {summaryMap[nodeType]}
                  </div>
                )}
              </div>

              {/* Type badge */}
              <span
                className={`mt-0.5 shrink-0 rounded-md px-[7px] py-[3px] text-[8.5px] font-bold uppercase tracking-wide ${vcfg.badgeClass}`}
              >
                {vcfg.badgeText}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body — config preview ── */}
        {hasBodyContent && (
          <>
            <div className="mx-4 border-t border-white/[0.055]" />
            <div className="pl-5 pr-3.5 py-2.5 space-y-[5px]">
              {configPreview.map(({ key, value }) => (
                <div key={key} className="flex items-center gap-1.5 text-[11px]">
                  <span className="capitalize text-white/28 truncate max-w-[72px] shrink-0">{key}</span>
                  <ChevronRight size={8} className="text-white/18 shrink-0" />
                  <span className="font-medium text-white/58 truncate flex-1">{value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── AI Capabilities footer ── */}
        {hasAIFooter && (
          <>
            <div
              className="mx-4 border-t"
              style={{ borderColor: vcfg.footerBorder }}
            />
            <div className="pl-5 pr-3.5 py-2.5 pb-3 space-y-[5px]">
              {aiCaps!.model && (
                <div className="flex items-center gap-1.5 text-[10.5px]">
                  <Cpu size={9} className="text-violet-400/55 shrink-0" />
                  <span className="text-white/28 shrink-0">Model</span>
                  <span className="mx-0.5 text-white/16">·</span>
                  <span className="font-medium text-violet-300/65 truncate">{aiCaps!.model}</span>
                </div>
              )}
              {aiCaps!.hasMemory && (
                <div className="flex items-center gap-1.5 text-[10.5px]">
                  <Database size={9} className="text-violet-400/55 shrink-0" />
                  <span className="text-violet-300/55">Memory enabled</span>
                </div>
              )}
              {aiCaps!.hasParser && (
                <div className="flex items-center gap-1.5 text-[10.5px]">
                  <Braces size={9} className="text-violet-400/55 shrink-0" />
                  <span className="text-violet-300/55">Output parser</span>
                </div>
              )}
              {aiCaps!.toolCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10.5px]">
                  <Layers size={9} className="text-violet-400/55 shrink-0" />
                  <span className="text-violet-300/55">
                    {aiCaps!.toolCount} tool{aiCaps!.toolCount !== 1 ? 's' : ''} attached
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Status indicator strip ── */}
        {status && (
          <div
            className="h-[2px] w-full shrink-0"
            style={{
              backgroundColor: STATUS_BORDER[status] || 'transparent',
              opacity: status === 'running' ? undefined : 0.65,
            }}
          />
        )}
      </div>

      {/* ── Running pulse ring ── */}
      {status === 'running' && (
        <div className="absolute -inset-[3px] rounded-[19px] pointer-events-none z-[-1]">
          <div
            className="absolute inset-0 rounded-[19px] border-2 border-blue-400/25 animate-ping"
            style={{ animationDuration: '1.8s' }}
          />
        </div>
      )}

      {/* ── Status badge pill (below card) ── */}
      {status && status !== 'skipped' && (
        <div className="absolute -bottom-[11px] left-5 z-20">
          <div
            className={`flex items-center gap-1 rounded-full px-[7px] py-[2px] text-[8.5px] font-bold uppercase tracking-wider border ${
              status === 'running'
                ? 'bg-blue-500/12 border-blue-500/22 text-blue-400'
                : status === 'success'
                ? 'bg-emerald-500/12 border-emerald-500/22 text-emerald-400'
                : 'bg-red-500/12 border-red-500/22 text-red-400'
            }`}
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                status === 'running'
                  ? 'bg-blue-400 animate-pulse'
                  : status === 'success'
                  ? 'bg-emerald-400'
                  : 'bg-red-400'
              }`}
            />
            {status}
          </div>
        </div>
      )}

      {/* ── Output handle ── */}
      <NodeHandle
        type="source"
        id="out"
        position={Position.Right}
        isConnectable={isConnectable}
        isHovered={isHovered && !dragging}
        accentColor={vcfg.accentColor}
        nodeId={id}
      />

      {/* ── Hover quick-action toolbar (above node) ── */}
      <AnimatePresence>
        {isHovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute -top-[42px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-[2px] rounded-[11px] border border-white/[0.07] bg-[#0c1120]/95 p-[4px] shadow-2xl backdrop-blur-md"
            onMouseEnter={() => setIsHovered(true)}
          >
            <QuickActionBtn
              icon={<Play size={11} />}
              label="Run node"
              onClick={(e) => e.stopPropagation()}
            />
            <QuickActionBtn
              icon={<Copy size={11} />}
              label="Duplicate"
              onClick={(e) => e.stopPropagation()}
            />
            <QuickActionBtn
              icon={<Bug size={11} />}
              label="Debug"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mx-[2px] h-[16px] w-px bg-white/[0.07]" />
            <QuickActionBtn
              icon={<X size={11} />}
              label="Delete"
              onClick={handleDelete}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick-add connected node button ── */}
      <AnimatePresence>
        {isHovered && !dragging && (
          <motion.button
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.11, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('flowa:node-quick-add', { detail: { sourceNodeId: id } })
              );
            }}
            className="absolute top-1/2 -translate-y-1/2 z-30 flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/[0.1] bg-[#0c1120]/90 text-white/45 shadow-xl backdrop-blur-sm transition-colors hover:border-white/22 hover:text-white/85"
            style={{ right: -42 }}
            title="Add connected node"
          >
            <Plus size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(FlowNode);

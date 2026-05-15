import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X, Copy, Play, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

// ── Lookup map ────────────────────────────────────────────────────────────────

const summaryMap: Record<string, string> = {};
for (const n of nodeCatalog) summaryMap[n.type] = n.description;

// ── Node category classification ──────────────────────────────────────────────

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

// ── Variant config (only what's needed for icon-box layout) ───────────────────

interface VariantConfig {
  accentColor: string;
  idleBorder: string;
  idleShadow: string;
  hoverBorder: string;
  selectedShadow: string;
  dotColor: string;
}

const VARIANT_CONFIG: Record<NodeVariant, VariantConfig> = {
  trigger: {
    accentColor: '#F59E0B',
    idleBorder: 'rgba(245,158,11,0.2)',
    idleShadow: '0 0 0 1px rgba(245,158,11,0.12), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(245,158,11,0.45)',
    selectedShadow: '0 0 0 2px rgba(245,158,11,0.6), 0 0 28px rgba(245,158,11,0.2)',
    dotColor: '#F59E0B',
  },
  ai: {
    accentColor: '#A78BFA',
    idleBorder: 'rgba(139,92,246,0.22)',
    idleShadow: '0 0 0 1px rgba(139,92,246,0.14), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(139,92,246,0.5)',
    selectedShadow: '0 0 0 2px rgba(139,92,246,0.65), 0 0 30px rgba(139,92,246,0.22)',
    dotColor: '#A78BFA',
  },
  logic: {
    accentColor: '#94A3B8',
    idleBorder: 'rgba(100,116,139,0.2)',
    idleShadow: '0 0 0 1px rgba(100,116,139,0.12), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(100,116,139,0.4)',
    selectedShadow: '0 0 0 2px rgba(100,116,139,0.55), 0 0 22px rgba(100,116,139,0.16)',
    dotColor: '#94A3B8',
  },
  database: {
    accentColor: '#60A5FA',
    idleBorder: 'rgba(59,130,246,0.22)',
    idleShadow: '0 0 0 1px rgba(59,130,246,0.14), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(59,130,246,0.48)',
    selectedShadow: '0 0 0 2px rgba(59,130,246,0.62), 0 0 28px rgba(59,130,246,0.2)',
    dotColor: '#60A5FA',
  },
  communication: {
    accentColor: '#34D399',
    idleBorder: 'rgba(16,185,129,0.22)',
    idleShadow: '0 0 0 1px rgba(16,185,129,0.14), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(16,185,129,0.48)',
    selectedShadow: '0 0 0 2px rgba(16,185,129,0.62), 0 0 28px rgba(16,185,129,0.2)',
    dotColor: '#34D399',
  },
  integration: {
    accentColor: '#818CF8',
    idleBorder: 'rgba(99,102,241,0.18)',
    idleShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.3)',
    hoverBorder: 'rgba(99,102,241,0.42)',
    selectedShadow: '0 0 0 2px rgba(99,102,241,0.58), 0 0 26px rgba(99,102,241,0.18)',
    dotColor: '#818CF8',
  },
};

// ── Handle sub-component ──────────────────────────────────────────────────────

interface NodeHandleProps {
  type: 'source' | 'target';
  position: typeof Position.Left | typeof Position.Right;
  id: string;
  isConnectable: boolean;
  isHovered: boolean;
  accentColor: string;
}

function NodeHandle({ type, position, id: handleId, isConnectable, isHovered, accentColor }: NodeHandleProps) {
  const side = position === Position.Left ? { left: -6 } : { right: -6 };
  return (
    <Handle
      type={type}
      id={handleId}
      position={position}
      isConnectable={isConnectable}
      style={{
        top: '50%',
        ...side,
        transform: 'translateY(-50%)',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: isHovered ? accentColor : 'rgba(11, 16, 27, 0.95)',
        border: `2px solid ${isHovered ? accentColor : 'rgba(255,255,255,0.14)'}`,
        boxShadow: isHovered ? `0 0 10px ${accentColor}70, 0 0 0 3px ${accentColor}20` : '0 1px 4px rgba(0,0,0,0.5)',
        transition: 'all 0.16s ease',
        zIndex: 20,
      }}
    />
  );
}

// ── Quick-action button ───────────────────────────────────────────────────────

function ActionBtn({
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
      className={`flex h-[24px] w-[24px] items-center justify-center rounded-lg transition-all duration-100 ${
        danger
          ? 'text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
          : 'text-white/35 hover:bg-white/[0.06] hover:text-white/75'
      }`}
    >
      {icon}
    </button>
  );
}

// ── Status dot (bottom-right of icon box) ─────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-blue-400',
    success: 'bg-emerald-400',
    failed:  'bg-red-400',
    skipped: 'bg-slate-500',
  };
  return (
    <div
      className={`absolute bottom-[7px] right-[7px] h-[8px] w-[8px] rounded-full ${colors[status] || 'bg-slate-500'} ${
        status === 'running' ? 'animate-pulse' : ''
      } z-10`}
      style={{
        boxShadow:
          status === 'running' ? '0 0 6px rgba(96,165,250,0.7)' :
          status === 'success' ? '0 0 5px rgba(52,211,153,0.6)' :
          status === 'failed'  ? '0 0 6px rgba(239,68,68,0.7)' : 'none',
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BOX_SIZE = 88; // icon box square dimension in px
const CONTAINER_W = 92; // outer container width (provides slight overflow space)

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const { deleteElements } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const nodeType: string = data.type || '';
  const variant = getNodeVariant(nodeType);
  const vcfg = VARIANT_CONFIG[variant];

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
    },
    [id, deleteElements]
  );

  // ── Box border + shadow based on state ──
  let borderColor = vcfg.idleBorder;
  let boxShadow = vcfg.idleShadow;

  if (status === 'running') {
    borderColor = '#3B82F6';
    boxShadow = '0 0 0 1.5px rgba(59,130,246,0.5), 0 0 24px rgba(59,130,246,0.22), 0 4px 16px rgba(0,0,0,0.35)';
  } else if (status === 'success') {
    borderColor = '#10B981';
    boxShadow = '0 0 0 1.5px rgba(16,185,129,0.5), 0 0 18px rgba(16,185,129,0.18), 0 4px 16px rgba(0,0,0,0.35)';
  } else if (status === 'failed') {
    borderColor = '#EF4444';
    boxShadow = '0 0 0 1.5px rgba(239,68,68,0.55), 0 0 22px rgba(239,68,68,0.22), 0 4px 16px rgba(0,0,0,0.35)';
  } else if (selected) {
    borderColor = vcfg.accentColor;
    boxShadow = vcfg.selectedShadow;
  } else if (isHovered && !dragging) {
    borderColor = vcfg.hoverBorder;
    boxShadow = `0 0 0 1px ${vcfg.hoverBorder}, 0 8px 28px rgba(0,0,0,0.4)`;
  }

  return (
    <div
      className="relative flex flex-col items-center overflow-visible"
      style={{ width: CONTAINER_W }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Icon Box ── */}
      <div
        className={`relative flex items-center justify-center rounded-2xl border overflow-visible ${
          status === 'running' ? 'animate-node-running' : ''
        } ${status === 'failed' ? 'animate-node-shake' : ''} ${
          dragging ? 'scale-[1.04]' : ''
        }`}
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          backgroundColor: 'rgba(11, 16, 27, 0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderColor,
          boxShadow,
          transition: 'border-color 0.2s ease, box-shadow 0.25s ease, transform 0.12s ease',
        }}
      >
        {/* Input handle (left center of box) */}
        <NodeHandle
          type="target"
          id="in"
          position={Position.Left}
          isConnectable={isConnectable}
          isHovered={isHovered && !dragging}
          accentColor={vcfg.accentColor}
        />

        {/* Category accent dot — top-right corner */}
        <div
          className="absolute top-[8px] right-[8px] h-[6px] w-[6px] rounded-full"
          style={{
            backgroundColor: vcfg.dotColor,
            opacity: selected || (status && status !== 'skipped') ? 0.9 : 0.38,
            boxShadow: (isHovered || selected) ? `0 0 6px ${vcfg.dotColor}80` : 'none',
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
          }}
        />

        {/* Icon — scaled up inside the box */}
        <div
          className="flex items-center justify-center [&_img]:!w-10 [&_img]:!h-10 [&_img]:!rounded-[4px] [&_svg]:!w-10 [&_svg]:!h-10"
          style={{ color: 'inherit' }}
        >
          <NodeIcon nodeType={nodeType} plain />
        </div>

        {/* Running shimmer overlay */}
        {status === 'running' && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Status dot — bottom-right corner */}
        {status && <StatusDot status={status} />}

        {/* Output handle (right center of box) */}
        <NodeHandle
          type="source"
          id="out"
          position={Position.Right}
          isConnectable={isConnectable}
          isHovered={isHovered && !dragging}
          accentColor={vcfg.accentColor}
        />
      </div>

      {/* Running pulse ring outside box */}
      {status === 'running' && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: (CONTAINER_W - BOX_SIZE) / 2,
            width: BOX_SIZE,
            height: BOX_SIZE,
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl border-2 border-blue-400/20 animate-ping"
            style={{ animationDuration: '2s' }}
          />
        </div>
      )}

      {/* ── Text section (below box) ── */}
      <div className="mt-[9px] flex flex-col items-center" style={{ maxWidth: 116 }}>
        <div
          className="w-full text-center text-[11.5px] font-semibold leading-tight text-foreground truncate"
          title={data.label}
        >
          {data.label}
        </div>
        {summaryMap[nodeType] && (
          <div
            className="mt-[2px] w-full text-center text-[9.5px] leading-snug text-foreground-muted truncate"
            title={summaryMap[nodeType]}
          >
            {summaryMap[nodeType]}
          </div>
        )}
      </div>

      {/* ── Hover quick-action toolbar (above box) ── */}
      <AnimatePresence>
        {isHovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.11, ease: 'easeOut' }}
            className="absolute z-40 flex items-center gap-[2px] rounded-[10px] border border-white/[0.07] bg-[#0a0f1c]/96 px-[4px] py-[3px] shadow-2xl backdrop-blur-md"
            style={{ top: -38, left: '50%', transform: 'translateX(-50%)' }}
            onMouseEnter={() => setIsHovered(true)}
          >
            <ActionBtn icon={<Play size={10} />} label="Run node" onClick={(e) => e.stopPropagation()} />
            <ActionBtn icon={<Copy size={10} />} label="Duplicate" onClick={(e) => e.stopPropagation()} />
            <div className="mx-[2px] h-[14px] w-px bg-white/[0.07]" />
            <ActionBtn icon={<X size={10} />} label="Delete" onClick={handleDelete} danger />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick-add connected node button (right of box) ── */}
      <AnimatePresence>
        {isHovered && !dragging && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('flowa:node-quick-add', { detail: { sourceNodeId: id } })
              );
            }}
            className="absolute z-30 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/[0.1] bg-[#0a0f1c]/92 text-white/40 shadow-xl backdrop-blur-sm hover:border-white/20 hover:text-white/80"
            style={{
              top: BOX_SIZE / 2 - 13,   // vertically centered on box
              right: -(CONTAINER_W - BOX_SIZE) / 2 - 38, // outside right edge
            }}
            title="Add connected node"
          >
            <Plus size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(FlowNode);

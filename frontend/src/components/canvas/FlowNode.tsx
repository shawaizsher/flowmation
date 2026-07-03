import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { X, Copy, Play, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import NodeIcon from './NodeIcon';
import { nodeCatalog } from '../../data/nodeCatalog';

// ── Description lookup ────────────────────────────────────────────────────────

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

// ── Variant config: accent + per-theme border/shadow values ───────────────────

interface ThemeVariants {
  idleBorder: string;
  idleShadow: string;
  hoverBorder: string;
  hoverShadow: string;
  selectedBorder: string;
  selectedShadow: string;
}

interface VariantConfig {
  accentColor: string;
  dotColor: string;
  dark: ThemeVariants;
  light: ThemeVariants;
}

const VARIANT_CONFIG: Record<NodeVariant, VariantConfig> = {
  trigger: {
    accentColor: '#F59E0B', dotColor: '#F59E0B',
    dark: {
      idleBorder:      'rgba(245,158,11,0.22)',
      idleShadow:      '0 0 0 1px rgba(245,158,11,0.12), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(245,158,11,0.5)',
      hoverShadow:     '0 0 0 1px rgba(245,158,11,0.4), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#F59E0B',
      selectedShadow:  '0 0 0 2px rgba(245,158,11,0.65), 0 0 28px rgba(245,158,11,0.22)',
    },
    light: {
      idleBorder:      'rgba(245,158,11,0.38)',
      idleShadow:      '0 0 0 1px rgba(245,158,11,0.22), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(245,158,11,0.75)',
      hoverShadow:     '0 0 0 1px rgba(245,158,11,0.6), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#D97706',
      selectedShadow:  '0 0 0 2px rgba(217,119,6,0.75), 0 4px 12px rgba(217,119,6,0.15)',
    },
  },
  ai: {
    accentColor: '#A78BFA', dotColor: '#A78BFA',
    dark: {
      idleBorder:      'rgba(139,92,246,0.24)',
      idleShadow:      '0 0 0 1px rgba(139,92,246,0.14), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(139,92,246,0.55)',
      hoverShadow:     '0 0 0 1px rgba(139,92,246,0.44), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#A78BFA',
      selectedShadow:  '0 0 0 2px rgba(139,92,246,0.7), 0 0 30px rgba(139,92,246,0.24)',
    },
    light: {
      idleBorder:      'rgba(109,40,217,0.3)',
      idleShadow:      '0 0 0 1px rgba(109,40,217,0.18), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(109,40,217,0.68)',
      hoverShadow:     '0 0 0 1px rgba(109,40,217,0.55), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#7C3AED',
      selectedShadow:  '0 0 0 2px rgba(124,58,237,0.72), 0 4px 12px rgba(124,58,237,0.15)',
    },
  },
  logic: {
    accentColor: '#94A3B8', dotColor: '#94A3B8',
    dark: {
      idleBorder:      'rgba(100,116,139,0.22)',
      idleShadow:      '0 0 0 1px rgba(100,116,139,0.12), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(100,116,139,0.45)',
      hoverShadow:     '0 0 0 1px rgba(100,116,139,0.35), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#94A3B8',
      selectedShadow:  '0 0 0 2px rgba(100,116,139,0.6), 0 0 22px rgba(100,116,139,0.18)',
    },
    light: {
      idleBorder:      'rgba(71,85,105,0.22)',
      idleShadow:      '0 0 0 1px rgba(71,85,105,0.14), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(71,85,105,0.5)',
      hoverShadow:     '0 0 0 1px rgba(71,85,105,0.38), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#475569',
      selectedShadow:  '0 0 0 2px rgba(71,85,105,0.65), 0 4px 12px rgba(0,0,0,0.1)',
    },
  },
  database: {
    accentColor: '#60A5FA', dotColor: '#60A5FA',
    dark: {
      idleBorder:      'rgba(59,130,246,0.24)',
      idleShadow:      '0 0 0 1px rgba(59,130,246,0.14), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(59,130,246,0.52)',
      hoverShadow:     '0 0 0 1px rgba(59,130,246,0.42), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#60A5FA',
      selectedShadow:  '0 0 0 2px rgba(59,130,246,0.68), 0 0 28px rgba(59,130,246,0.22)',
    },
    light: {
      idleBorder:      'rgba(29,78,216,0.28)',
      idleShadow:      '0 0 0 1px rgba(29,78,216,0.16), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(29,78,216,0.6)',
      hoverShadow:     '0 0 0 1px rgba(29,78,216,0.48), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#1D4ED8',
      selectedShadow:  '0 0 0 2px rgba(29,78,216,0.7), 0 4px 12px rgba(29,78,216,0.15)',
    },
  },
  communication: {
    accentColor: '#34D399', dotColor: '#34D399',
    dark: {
      idleBorder:      'rgba(16,185,129,0.24)',
      idleShadow:      '0 0 0 1px rgba(16,185,129,0.14), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(16,185,129,0.52)',
      hoverShadow:     '0 0 0 1px rgba(16,185,129,0.42), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#34D399',
      selectedShadow:  '0 0 0 2px rgba(16,185,129,0.68), 0 0 28px rgba(16,185,129,0.22)',
    },
    light: {
      idleBorder:      'rgba(5,150,105,0.28)',
      idleShadow:      '0 0 0 1px rgba(5,150,105,0.16), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(5,150,105,0.62)',
      hoverShadow:     '0 0 0 1px rgba(5,150,105,0.5), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#059669',
      selectedShadow:  '0 0 0 2px rgba(5,150,105,0.72), 0 4px 12px rgba(5,150,105,0.15)',
    },
  },
  integration: {
    accentColor: '#818CF8', dotColor: '#818CF8',
    dark: {
      idleBorder:      'rgba(99,102,241,0.2)',
      idleShadow:      '0 0 0 1px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.32)',
      hoverBorder:     'rgba(99,102,241,0.46)',
      hoverShadow:     '0 0 0 1px rgba(99,102,241,0.36), 0 8px 28px rgba(0,0,0,0.42)',
      selectedBorder:  '#818CF8',
      selectedShadow:  '0 0 0 2px rgba(99,102,241,0.62), 0 0 26px rgba(99,102,241,0.2)',
    },
    light: {
      idleBorder:      'rgba(67,56,202,0.24)',
      idleShadow:      '0 0 0 1px rgba(67,56,202,0.14), 0 1px 4px rgba(0,0,0,0.06)',
      hoverBorder:     'rgba(67,56,202,0.56)',
      hoverShadow:     '0 0 0 1px rgba(67,56,202,0.44), 0 4px 14px rgba(0,0,0,0.1)',
      selectedBorder:  '#4338CA',
      selectedShadow:  '0 0 0 2px rgba(67,56,202,0.7), 0 4px 12px rgba(67,56,202,0.14)',
    },
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
        background: isHovered ? accentColor : 'var(--node-handle-idle-bg)',
        border: `2px solid ${isHovered ? accentColor : 'var(--node-handle-idle-border)'}`,
        boxShadow: isHovered
          ? `0 0 10px ${accentColor}70, 0 0 0 3px ${accentColor}22`
          : '0 1px 3px rgba(0,0,0,0.18)',
        transition: 'all 0.16s ease',
        zIndex: 20,
      }}
    />
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colorClass = {
    running: 'bg-blue-400',
    success: 'bg-emerald-500',
    failed:  'bg-red-500',
    skipped: 'bg-slate-400',
  }[status] ?? 'bg-slate-400';

  const glowStyle = {
    running: '0 0 6px rgba(96,165,250,0.75)',
    success: '0 0 5px rgba(16,185,129,0.7)',
    failed:  '0 0 6px rgba(239,68,68,0.75)',
  }[status] ?? 'none';

  return (
    <div
      className={`absolute bottom-[7px] right-[7px] h-[8px] w-[8px] rounded-full z-10 ${colorClass} ${
        status === 'running' ? 'animate-pulse' : ''
      }`}
      style={{ boxShadow: glowStyle }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BOX_SIZE = 88;
const CONTAINER_W = 92;

function FlowNode({ data, selected, id, isConnectable, dragging }: NodeProps) {
  const nodeStatuses = useStore((s) => s.nodeStatuses);
  const status = nodeStatuses[id] as string | undefined;
  const { deleteElements, addNodes, getNode } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isHovered, setIsHovered] = useState(false);

  const nodeType: string = data.type || '';
  const variant = getNodeVariant(nodeType);
  const cfg = VARIANT_CONFIG[variant];
  const vc = isDark ? cfg.dark : cfg.light;

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
    },
    [id, deleteElements]
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const source = getNode(id);
      if (!source) return;
      addNodes({
        id: `${nodeType}-copy-${Date.now()}`,
        type: 'flowNode',
        position: { x: source.position.x + 40, y: source.position.y + 80 },
        data: { ...source.data },
      });
    },
    [id, nodeType, getNode, addNodes]
  );

  const handleRunNode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('fluxion:node-run', { detail: { nodeId: id } }));
    },
    [id]
  );

  // ── Compute box border + shadow ──
  let borderColor = vc.idleBorder;
  let boxShadow   = vc.idleShadow;

  if (status === 'running') {
    borderColor = '#3B82F6';
    boxShadow   = `0 0 0 1.5px rgba(59,130,246,0.55), 0 0 24px rgba(59,130,246,0.22), ${isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.08)'}`;
  } else if (status === 'success') {
    borderColor = '#10B981';
    boxShadow   = `0 0 0 1.5px rgba(16,185,129,0.55), 0 0 18px rgba(16,185,129,0.18), ${isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.08)'}`;
  } else if (status === 'failed') {
    borderColor = '#EF4444';
    boxShadow   = `0 0 0 1.5px rgba(239,68,68,0.6), 0 0 22px rgba(239,68,68,0.22), ${isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.08)'}`;
  } else if (status === 'disconnected') {
    borderColor = '#F59E0B';
    boxShadow   = `0 0 0 1.5px rgba(245,158,11,0.6), 0 0 18px rgba(245,158,11,0.18), ${isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.08)'}`;
  } else if (selected) {
    borderColor = vc.selectedBorder;
    boxShadow   = vc.selectedShadow;
  } else if (isHovered && !dragging) {
    borderColor = vc.hoverBorder;
    boxShadow   = vc.hoverShadow;
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
          background: 'var(--node-box-bg)',
          backdropFilter: 'var(--node-backdrop-blur)',
          WebkitBackdropFilter: 'var(--node-backdrop-blur)',
          borderColor,
          boxShadow,
          transition: 'border-color 0.2s ease, box-shadow 0.25s ease, transform 0.12s ease',
        }}
      >
        {/* Input handle */}
        <NodeHandle
          type="target" id="in" position={Position.Left}
          isConnectable={isConnectable}
          isHovered={isHovered && !dragging}
          accentColor={cfg.accentColor}
        />

        {/* Category accent dot — top-right */}
        <div
          className="absolute top-[8px] right-[8px] h-[6px] w-[6px] rounded-full pointer-events-none"
          style={{
            backgroundColor: cfg.dotColor,
            opacity: selected || (status && status !== 'skipped') ? 0.9 : isDark ? 0.38 : 0.55,
            boxShadow: (isHovered || selected) ? `0 0 6px ${cfg.dotColor}90` : 'none',
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
          }}
        />

        {/* Icon */}
        <div className="flex items-center justify-center [&_img]:!w-10 [&_img]:!h-10 [&_img]:!rounded-[4px] [&_svg]:!w-10 [&_svg]:!h-10">
          <NodeIcon nodeType={nodeType} plain />
        </div>

        {/* Running tint overlay */}
        {status === 'running' && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, transparent 70%)' }}
          />
        )}

        {/* Disconnected warning badge */}
        {status === 'disconnected' && (
          <div
            className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full pointer-events-none"
            style={{ background: '#F59E0B', boxShadow: '0 0 6px rgba(245,158,11,0.6)' }}
            title="Node is disconnected from the workflow"
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#000', lineHeight: 1 }}>!</span>
          </div>
        )}

        {/* Status dot */}
        {status && <StatusDot status={status} />}

        {/* Output handle */}
        <NodeHandle
          type="source" id="out" position={Position.Right}
          isConnectable={isConnectable}
          isHovered={isHovered && !dragging}
          accentColor={cfg.accentColor}
        />
      </div>

      {/* Running pulse ring */}
      {status === 'running' && (
        <div
          className="absolute pointer-events-none"
          style={{ top: 0, left: (CONTAINER_W - BOX_SIZE) / 2, width: BOX_SIZE, height: BOX_SIZE }}
        >
          <div
            className="absolute inset-0 rounded-2xl border-2 border-blue-400/20 animate-ping"
            style={{ animationDuration: '2s' }}
          />
        </div>
      )}

      {/* ── Text section below box ── */}
      <div className="mt-[9px] flex flex-col items-center" style={{ maxWidth: 116 }}>
        <div
          className="w-full text-center text-[11.5px] font-semibold leading-tight text-slate-800 dark:text-slate-100 truncate"
          title={data.label}
        >
          {data.label}
        </div>
        {summaryMap[nodeType] && (
          <div
            className="mt-[2px] w-full text-center text-[9.5px] leading-snug text-slate-400 dark:text-slate-500 truncate"
            title={summaryMap[nodeType]}
          >
            {summaryMap[nodeType]}
          </div>
        )}
      </div>

      {/* ── Hover toolbar (above box) ── */}
      <AnimatePresence>
        {isHovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.11, ease: 'easeOut' }}
            className="absolute z-40 flex items-center gap-[2px] rounded-[10px] border px-[4px] py-[3px] shadow-xl backdrop-blur-md"
            style={{
              top: -38,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--node-toolbar-bg)',
              borderColor: 'var(--node-toolbar-border)',
            }}
            onMouseEnter={() => setIsHovered(true)}
          >
            <ToolbarBtn icon={<Play size={10} />} label="Run node"  onClick={handleRunNode} />
            <ToolbarBtn icon={<Copy size={10} />} label="Duplicate" onClick={handleDuplicate} />
            <div className="mx-[2px] h-[14px] w-px" style={{ background: 'var(--node-separator)' }} />
            <ToolbarBtn icon={<X size={10} />} label="Delete" onClick={handleDelete} danger />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick-add button (right of box) — focuses the left palette ── */}
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
              window.dispatchEvent(new CustomEvent('fluxion:focus-palette', { detail: { sourceNodeId: id } }));
            }}
            className="absolute z-30 flex h-[26px] w-[26px] items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-colors"
            style={{
              top: BOX_SIZE / 2 - 13,
              right: -(CONTAINER_W - BOX_SIZE) / 2 - 38,
              background: 'var(--node-quickadd-bg)',
              border: `1px solid var(--node-quickadd-border)`,
              color: 'var(--node-quickadd-icon)',
            }}
            title="Add next node — opens palette"
          >
            <Plus size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolbarBtn({
  icon, label, onClick, danger = false,
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
          ? 'text-red-400/60 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400'
          : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-white/80'
      }`}
      style={{ color: danger ? undefined : 'var(--node-toolbar-icon)' }}
    >
      {icon}
    </button>
  );
}

export default memo(FlowNode);

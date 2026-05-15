// NodeIcon — real brand favicons for service nodes, Lucide for generic/utility nodes
import { type ReactNode } from 'react';

import {
  Webhook,
  Clock,
  Mail,
  MousePointerClick,
  FileText,
  FileUp,
  FileDown,
  Filter,
  GitMerge,
  GitBranch,
  RotateCcw,
  Zap,
  Timer,
  Shield,
  Hash,
  Dice1,
  Type,
  Globe,
  Send,
  BarChart3,
  Repeat,
  ArrowRightLeft,
  Lock,
  Calendar,
  Shuffle,
  MessageSquare,
  SlidersHorizontal,
  Braces,
  Newspaper,
  Server,
  Layers,
  BookOpen,
} from 'lucide-react';

interface IconDef {
  icon: ReactNode;
  bg: string;
  fg?: string;
}

const ICON_SIZE = 20;

// Subtle neutral background for all favicon icons
const FAV_BG = 'bg-white/[0.06]';

// Real brand logo via Google favicon service
function fav(domain: string, sizePx = 20): ReactNode {
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      style={{ width: sizePx, height: sizePx }}
      className="object-contain rounded-[3px]"
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
    />
  );
}

// ── Master icon map ──────────────────────────────────────────────────────────

const iconMap: Record<string, IconDef> = {

  // ── Triggers (Lucide — no brand domain) ──────────────────────────────────
  trigger_webhook: { icon: <Webhook size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  trigger_cron:    { icon: <Clock   size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  trigger_email:   { icon: <Mail    size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  trigger_manual:  { icon: <MousePointerClick size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },

  // ── Google Workspace ──────────────────────────────────────────────────────
  google_sheets_read:      { icon: fav('sheets.google.com'),      bg: FAV_BG },
  google_sheets_write:     { icon: fav('sheets.google.com'),      bg: FAV_BG },
  google_gmail_send:       { icon: fav('gmail.com'),              bg: FAV_BG },
  google_gmail_read:       { icon: fav('gmail.com'),              bg: FAV_BG },
  google_drive_upload:     { icon: fav('drive.google.com'),       bg: FAV_BG },
  google_drive_list:       { icon: fav('drive.google.com'),       bg: FAV_BG },
  google_calendar_create:  { icon: fav('calendar.google.com'),    bg: FAV_BG },
  google_translate:        { icon: fav('translate.google.com'),   bg: FAV_BG },
  google_vision:           { icon: fav('cloud.google.com'),       bg: FAV_BG },
  google_maps_geocode:     { icon: fav('maps.google.com'),        bg: FAV_BG },
  youtube_search:          { icon: fav('youtube.com'),            bg: FAV_BG },
  youtube_upload:          { icon: fav('youtube.com'),            bg: FAV_BG },

  // ── AI & ML ───────────────────────────────────────────────────────────────
  openai_chat:           { icon: fav('openai.com'),          bg: FAV_BG },
  openai_image:          { icon: fav('openai.com'),          bg: FAV_BG },
  openai_embeddings:     { icon: fav('openai.com'),          bg: FAV_BG },
  openai_tts:            { icon: fav('openai.com'),          bg: FAV_BG },
  whisper_transcribe:    { icon: fav('openai.com'),          bg: FAV_BG },
  anthropic_chat:        { icon: fav('anthropic.com'),       bg: FAV_BG },
  gemini_chat:           { icon: fav('gemini.google.com'),   bg: FAV_BG },
  gemini_vision:         { icon: fav('gemini.google.com'),   bg: FAV_BG },
  mistral_chat:          { icon: fav('mistral.ai'),          bg: FAV_BG },
  perplexity_search:     { icon: fav('perplexity.ai'),       bg: FAV_BG },
  huggingface_inference: { icon: fav('huggingface.co'),      bg: FAV_BG },
  groq_chat:             { icon: fav('groq.com'),            bg: FAV_BG },
  deepseek_chat:         { icon: fav('deepseek.com'),        bg: FAV_BG },
  ollama_chat:           { icon: fav('ollama.ai'),           bg: FAV_BG },
  elevenlabs_tts:        { icon: fav('elevenlabs.io'),       bg: FAV_BG },
  replicate_run:         { icon: fav('replicate.com'),       bg: FAV_BG },
  langchain_chain:       { icon: fav('langchain.com'),       bg: FAV_BG },
  cohere_generate:       { icon: fav('cohere.com'),          bg: FAV_BG },
  cohere_embed:          { icon: fav('cohere.com'),          bg: FAV_BG },
  stability_generate:    { icon: fav('stability.ai'),        bg: FAV_BG },
  ai_text_classifier:    { icon: <Layers   size={ICON_SIZE} />, bg: 'bg-violet-500/15', fg: 'text-violet-400' },
  ai_summarizer:         { icon: <BookOpen size={ICON_SIZE} />, bg: 'bg-violet-500/15', fg: 'text-violet-400' },

  // ── Vector Databases ──────────────────────────────────────────────────────
  pinecone_upsert: { icon: fav('pinecone.io'),   bg: FAV_BG },
  pinecone_query:  { icon: fav('pinecone.io'),   bg: FAV_BG },
  qdrant_search:   { icon: fav('qdrant.tech'),   bg: FAV_BG },
  weaviate_query:  { icon: fav('weaviate.io'),   bg: FAV_BG },
  chroma_query:    { icon: fav('trychroma.com'), bg: FAV_BG },

  // ── Databases ─────────────────────────────────────────────────────────────
  postgres_query:      { icon: fav('postgresql.org'),     bg: FAV_BG },
  mysql_query:         { icon: fav('mysql.com'),          bg: FAV_BG },
  mongodb_find:        { icon: fav('mongodb.com'),        bg: FAV_BG },
  redis_command:       { icon: fav('redis.io'),           bg: FAV_BG },
  firebase_read:       { icon: fav('firebase.google.com'),bg: FAV_BG },
  supabase_query:      { icon: fav('supabase.com'),       bg: FAV_BG },
  elasticsearch_query: { icon: fav('elastic.co'),         bg: FAV_BG },
  dynamodb_query:      { icon: fav('aws.amazon.com'),     bg: FAV_BG },

  // ── Social Media ─────────────────────────────────────────────────────────
  twitter_post:   { icon: fav('x.com'),          bg: FAV_BG },
  twitter_search: { icon: fav('x.com'),          bg: FAV_BG },
  instagram_post: { icon: fav('instagram.com'),  bg: FAV_BG },
  linkedin_post:  { icon: fav('linkedin.com'),   bg: FAV_BG },
  reddit_post:    { icon: fav('reddit.com'),     bg: FAV_BG },
  facebook_post:  { icon: fav('facebook.com'),   bg: FAV_BG },
  tiktok_post:    { icon: fav('tiktok.com'),     bg: FAV_BG },
  pinterest_pin:  { icon: fav('pinterest.com'),  bg: FAV_BG },
  twitch_send:    { icon: fav('twitch.tv'),      bg: FAV_BG },
  spotify_search: { icon: fav('spotify.com'),    bg: FAV_BG },

  // ── Messaging ─────────────────────────────────────────────────────────────
  slack_message:   { icon: fav('slack.com'),            bg: FAV_BG },
  discord_message: { icon: fav('discord.com'),          bg: FAV_BG },
  telegram_send:   { icon: fav('telegram.org'),         bg: FAV_BG },
  whatsapp_send:   { icon: fav('whatsapp.com'),         bg: FAV_BG },
  email_send:      { icon: <Send size={ICON_SIZE} />,   bg: 'bg-emerald-500/15', fg: 'text-emerald-400' },
  twilio_sms:      { icon: fav('twilio.com'),           bg: FAV_BG },
  teams_message:   { icon: fav('teams.microsoft.com'),  bg: FAV_BG },
  sendgrid_email:  { icon: fav('sendgrid.com'),         bg: FAV_BG },
  mailgun_send:    { icon: fav('mailgun.com'),          bg: FAV_BG },

  // ── Cloud & DevOps ────────────────────────────────────────────────────────
  aws_s3_upload:        { icon: fav('aws.amazon.com'),       bg: FAV_BG },
  aws_lambda_invoke:    { icon: fav('aws.amazon.com'),       bg: FAV_BG },
  github_create_issue:  { icon: fav('github.com'),           bg: FAV_BG },
  github_pr:            { icon: fav('github.com'),           bg: FAV_BG },
  docker_run:           { icon: fav('docker.com'),           bg: FAV_BG },
  vercel_deploy:        { icon: fav('vercel.com'),           bg: FAV_BG },
  gcp_pubsub:           { icon: fav('cloud.google.com'),     bg: FAV_BG },
  gcp_function:         { icon: fav('cloud.google.com'),     bg: FAV_BG },
  azure_function:       { icon: fav('azure.microsoft.com'),  bg: FAV_BG },
  azure_blob:           { icon: fav('azure.microsoft.com'),  bg: FAV_BG },
  cloudflare_worker:    { icon: fav('cloudflare.com'),       bg: FAV_BG },
  digitalocean_droplet: { icon: fav('digitalocean.com'),     bg: FAV_BG },
  netlify_deploy:       { icon: fav('netlify.com'),          bg: FAV_BG },
  railway_deploy:       { icon: fav('railway.app'),          bg: FAV_BG },

  // ── HTTP & APIs ──────────────────────────────────────────────────────────
  http_request:     { icon: <Globe   size={ICON_SIZE} />, bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
  graphql_query:    { icon: fav('graphql.org'),           bg: FAV_BG },
  rest_api_poll:    { icon: <Repeat  size={ICON_SIZE} />, bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
  soap_request:     { icon: <Server  size={ICON_SIZE} />, bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
  webhook_response: { icon: <Webhook size={ICON_SIZE} />, bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
  websocket_send:   { icon: <Globe   size={ICON_SIZE} />, bg: 'bg-indigo-500/15', fg: 'text-indigo-400' },
  typeform_responses:     { icon: fav('typeform.com'),      bg: FAV_BG },
  google_forms_responses: { icon: fav('docs.google.com'),   bg: FAV_BG },

  // ── Files & Storage ───────────────────────────────────────────────────────
  file_read:       { icon: <FileText  size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  file_write:      { icon: <FileUp    size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  csv_parse:       { icon: <BarChart3 size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  pdf_extract:     { icon: <FileDown  size={ICON_SIZE} />, bg: 'bg-red-500/15',   fg: 'text-red-400' },
  ftp_upload:      { icon: <FileUp    size={ICON_SIZE} />, bg: 'bg-amber-500/15', fg: 'text-amber-400' },
  dropbox_upload:  { icon: fav('dropbox.com'),             bg: FAV_BG },
  dropbox_list:    { icon: fav('dropbox.com'),             bg: FAV_BG },
  box_upload:      { icon: fav('box.com'),                 bg: FAV_BG },
  onedrive_upload: { icon: fav('onedrive.live.com'),       bg: FAV_BG },

  // ── Data Transform (Lucide) ───────────────────────────────────────────────
  transform_map:       { icon: <ArrowRightLeft size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  transform_filter:    { icon: <Filter        size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  transform_aggregate: { icon: <BarChart3     size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  transform_merge:     { icon: <GitMerge      size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  json_parse:          { icon: <Braces        size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  xml_parse:           { icon: <Newspaper     size={ICON_SIZE} />, bg: 'bg-teal-500/15', fg: 'text-teal-400' },
  code_javascript:     { icon: fav('developer.mozilla.org'),       bg: FAV_BG },
  code_python:         { icon: fav('python.org'),                  bg: FAV_BG },

  // ── Logic & Flow (Lucide) ─────────────────────────────────────────────────
  logic_if:       { icon: <GitBranch size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  logic_switch:   { icon: <Shuffle   size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  logic_loop:     { icon: <Repeat    size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  logic_delay:    { icon: <Timer     size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  logic_retry:    { icon: <RotateCcw size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  logic_parallel: { icon: <Zap       size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  error_handler:  { icon: <Shield    size={ICON_SIZE} />, bg: 'bg-red-500/15',   fg: 'text-red-400' },

  // ── CRM & Sales ───────────────────────────────────────────────────────────
  salesforce_query:          { icon: fav('salesforce.com'), bg: FAV_BG },
  salesforce_create_record:  { icon: fav('salesforce.com'), bg: FAV_BG },
  hubspot_contact:           { icon: fav('hubspot.com'),    bg: FAV_BG },
  hubspot_get_contacts:      { icon: fav('hubspot.com'),    bg: FAV_BG },
  hubspot_create_deal:       { icon: fav('hubspot.com'),    bg: FAV_BG },
  airtable_list:             { icon: fav('airtable.com'),   bg: FAV_BG },
  airtable_create_record:    { icon: fav('airtable.com'),   bg: FAV_BG },
  notion_query:              { icon: fav('notion.so'),      bg: FAV_BG },
  notion_create_page:        { icon: fav('notion.so'),      bg: FAV_BG },

  // ── Payments ──────────────────────────────────────────────────────────────
  stripe_charge:        { icon: fav('stripe.com'),  bg: FAV_BG },
  stripe_customer:      { icon: fav('stripe.com'),  bg: FAV_BG },
  stripe_subscription:  { icon: fav('stripe.com'),  bg: FAV_BG },
  stripe_webhook:       { icon: fav('stripe.com'),  bg: FAV_BG },
  paypal_payment:       { icon: fav('paypal.com'),  bg: FAV_BG },

  // ── Analytics ─────────────────────────────────────────────────────────────
  google_analytics: { icon: fav('analytics.google.com'), bg: FAV_BG },
  mixpanel_track:   { icon: fav('mixpanel.com'),         bg: FAV_BG },
  segment_track:    { icon: fav('segment.com'),          bg: FAV_BG },

  // ── Project Management ────────────────────────────────────────────────────
  jira_create_issue:   { icon: fav('atlassian.com'), bg: FAV_BG },
  jira_update_issue:   { icon: fav('atlassian.com'), bg: FAV_BG },
  linear_create_issue: { icon: fav('linear.app'),    bg: FAV_BG },
  trello_create_card:  { icon: fav('trello.com'),    bg: FAV_BG },
  asana_create_task:   { icon: fav('asana.com'),     bg: FAV_BG },
  clickup_create_task: { icon: fav('clickup.com'),   bg: FAV_BG },
  todoist_add_task:    { icon: fav('todoist.com'),   bg: FAV_BG },
  monday_create_item:  { icon: fav('monday.com'),    bg: FAV_BG },

  // ── E-Commerce ────────────────────────────────────────────────────────────
  shopify_get_orders:      { icon: fav('shopify.com'),      bg: FAV_BG },
  shopify_create_product:  { icon: fav('shopify.com'),      bg: FAV_BG },
  woocommerce_get_orders:  { icon: fav('woocommerce.com'),  bg: FAV_BG },
  gumroad_get_sales:       { icon: fav('gumroad.com'),      bg: FAV_BG },
  lemonsqueezy_get_orders: { icon: fav('lemonsqueezy.com'), bg: FAV_BG },

  // ── CMS & Website ─────────────────────────────────────────────────────────
  wordpress_create_post:   { icon: fav('wordpress.com'),  bg: FAV_BG },
  webflow_create_item:     { icon: fav('webflow.com'),     bg: FAV_BG },
  contentful_get_entries:  { icon: fav('contentful.com'),  bg: FAV_BG },
  ghost_create_post:       { icon: fav('ghost.org'),       bg: FAV_BG },

  // ── Support & Helpdesk ────────────────────────────────────────────────────
  zendesk_create_ticket:    { icon: fav('zendesk.com'),   bg: FAV_BG },
  zendesk_update_ticket:    { icon: fav('zendesk.com'),   bg: FAV_BG },
  intercom_message:         { icon: fav('intercom.com'),  bg: FAV_BG },
  freshdesk_create_ticket:  { icon: fav('freshdesk.com'), bg: FAV_BG },

  // ── Scheduling & Video ────────────────────────────────────────────────────
  calendly_get_events: { icon: fav('calendly.com'), bg: FAV_BG },
  zoom_create_meeting: { icon: fav('zoom.us'),       bg: FAV_BG },
  loom_get_videos:     { icon: fav('loom.com'),      bg: FAV_BG },
  vimeo_upload:        { icon: fav('vimeo.com'),     bg: FAV_BG },

  // ── Design ────────────────────────────────────────────────────────────────
  figma_get_file:      { icon: fav('figma.com'),  bg: FAV_BG },
  figma_export:        { icon: fav('figma.com'),  bg: FAV_BG },
  canva_create_design: { icon: fav('canva.com'),  bg: FAV_BG },

  // ── Marketing ─────────────────────────────────────────────────────────────
  mailchimp_add_member:      { icon: fav('mailchimp.com'),       bg: FAV_BG },
  mailchimp_send_campaign:   { icon: fav('mailchimp.com'),       bg: FAV_BG },
  convertkit_add_subscriber: { icon: fav('convertkit.com'),      bg: FAV_BG },
  beehiiv_create_post:       { icon: fav('beehiiv.com'),         bg: FAV_BG },
  activecampaign_contact:    { icon: fav('activecampaign.com'),  bg: FAV_BG },

  // ── Utilities (Lucide) ───────────────────────────────────────────────────
  util_logger:       { icon: <MessageSquare    size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_set_variable: { icon: <SlidersHorizontal size={ICON_SIZE} />,bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_crypto_hash:  { icon: <Lock             size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_date_format:  { icon: <Calendar         size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_uuid:         { icon: <Hash             size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_random:       { icon: <Dice1            size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
  util_regex:        { icon: <Type             size={ICON_SIZE} />, bg: 'bg-slate-500/15', fg: 'text-slate-400' },
};

// ── Default fallback ──────────────────────────────────────────────────────────

const defaultIcon: IconDef = {
  icon: <Zap size={ICON_SIZE} />,
  bg: 'bg-brand-500/15',
  fg: 'text-brand-400',
};

// ── Exported component ────────────────────────────────────────────────────────

interface NodeIconProps {
  nodeType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** plain — icon only, no background box (inherits parent colour) */
  plain?: boolean;
}

const sizeClasses = {
  sm: 'h-7 w-7 rounded-lg',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
};


export default function NodeIcon({
  nodeType,
  size = 'md',
  className = '',
  plain = false,
}: NodeIconProps) {
  const def = iconMap[nodeType] || defaultIcon;

  if (plain) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${def.fg || 'text-brand-400'} ${className}`}
        aria-hidden="true"
      >
        {def.icon}
      </span>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${sizeClasses[size]} ${def.bg} ${def.fg || ''} ${className}`}
    >
      {def.icon}
    </div>
  );
}

// Export for external callers that need direct icon lookup
export function getNodeIconDef(nodeType: string): IconDef {
  return iconMap[nodeType] || defaultIcon;
}

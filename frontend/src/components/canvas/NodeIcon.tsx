// ── NodeIcon: maps node types to proper brand/service icons ──
import { type ReactNode } from 'react';

// Brand icons (Simple Icons via react-icons — tree-shakeable)
import {
  SiGoogle,
  SiGmail,
  SiGoogledrive,
  SiGooglecalendar,
  SiGoogletranslate,
  SiGooglemaps,
  SiYoutube,
  SiOpenai,
  SiSlack,
  SiDiscord,
  SiTelegram,
  SiWhatsapp,
  SiGithub,
  SiDocker,
  SiVercel,
  SiPostgresql,
  SiMysql,
  SiMongodb,
  SiRedis,
  SiFirebase,
  SiSupabase,
  SiStripe,
  SiPaypal,
  SiSalesforce,
  SiHubspot,
  SiAirtable,
  SiNotion,
  SiPython,
  SiJavascript,
  SiGraphql,
  SiReddit,
  SiInstagram,
  SiTwilio,
  SiMixpanel,
  // Modern brand icons
  SiGooglegemini,
  SiPerplexity,
  SiOllama,
  SiElevenlabs,
  SiLangchain,
  SiElasticsearch,
  SiTiktok,
  SiFacebook,
  SiPinterest,
  SiSpotify,
  SiTwitch,
  SiMailgun,
  SiSendgrid,
  SiJira,
  SiLinear,
  SiTrello,
  SiAsana,
  SiClickup,
  SiTodoist,
  SiShopify,
  SiWoocommerce,
  SiWordpress,
  SiWebflow,
  SiContentful,
  SiGhost,
  SiZendesk,
  SiIntercom,
  SiCalendly,
  SiZoom,
  SiGooglecloud,
  SiCloudflare,
  SiDigitalocean,
  SiNetlify,
  SiRailway,
  SiDropbox,
  SiBox,
  SiLoom,
  SiVimeo,
  SiFigma,
  SiCanva,
  SiTypeform,
  SiGoogleforms,
  SiGumroad,
  SiLemonsqueezy,
  // Newly available brand icons
  SiAnthropic,
  SiHuggingface,
  SiMistralai,
  SiReplicate,
  SiMailchimp,
  SiMeta,
  SiBrevo,
  SiMailtrap,
  SiReplit,
  // Latest specific service icons
  SiGooglesheets,
  SiGoogleanalytics,
  SiGooglepubsub,
  SiGooglelens,
  SiGooglechat,
  SiGooglemeet,
  SiGoogledocs,
} from 'react-icons/si';
import { FaXTwitter, FaMicrosoft, FaLinkedinIn, FaAws } from 'react-icons/fa6';

// Lucide icons for generic concepts
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
  Code,
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
  Database,
  Activity,
  BarChart3,
  Eye,
  MapPin,
  Repeat,
  ArrowRightLeft,
  Lock,
  Calendar,
  Shuffle,
  MessageSquare,
  Megaphone,
  BookOpen,
  SlidersHorizontal,
  Binary,
  Braces,
  Newspaper,
  Server,
  Layers,
} from 'lucide-react';

interface IconDef {
  icon: ReactNode;
  bg: string;   // Tailwind bg class for the icon box
  fg?: string;   // Tailwind text color (defaults to white)
}

const ICON_SIZE = 18;
const SI_SIZE = 16;

const appFavicon = (domain: string) => (
  <img
    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
    alt=""
    className="h-4 w-4 rounded-sm object-contain"
    loading="lazy"
    referrerPolicy="no-referrer"
    draggable={false}
  />
);

// ── Master mapping from node type → icon rendering ──
const iconMap: Record<string, IconDef> = {
  // Triggers
  trigger_webhook:  { icon: <Webhook size={ICON_SIZE} />,           bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_cron:     { icon: <Clock size={ICON_SIZE} />,             bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_email:    { icon: <Mail size={ICON_SIZE} />,              bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_manual:   { icon: <MousePointerClick size={ICON_SIZE} />, bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },

  // Google
  google_sheets_read:    { icon: <SiGooglesheets size={SI_SIZE} />,    bg: 'bg-[#0F9D58]/20',  fg: 'text-[#0F9D58]' },
  google_sheets_write:   { icon: <SiGooglesheets size={SI_SIZE} />,    bg: 'bg-[#0F9D58]/20',  fg: 'text-[#0F9D58]' },
  google_gmail_send:     { icon: <SiGmail size={SI_SIZE} />,           bg: 'bg-[#EA4335]/20',  fg: 'text-[#EA4335]' },
  google_gmail_read:     { icon: <SiGmail size={SI_SIZE} />,           bg: 'bg-[#EA4335]/20',  fg: 'text-[#EA4335]' },
  google_drive_upload:   { icon: <SiGoogledrive size={SI_SIZE} />,     bg: 'bg-[#4285F4]/20',  fg: 'text-[#4285F4]' },
  google_drive_list:     { icon: <SiGoogledrive size={SI_SIZE} />,     bg: 'bg-[#4285F4]/20',  fg: 'text-[#4285F4]' },
  google_calendar_create:{ icon: <SiGooglecalendar size={SI_SIZE} />,  bg: 'bg-[#4285F4]/20',  fg: 'text-[#4285F4]' },
  google_translate:      { icon: <SiGoogletranslate size={SI_SIZE} />, bg: 'bg-[#4285F4]/20',  fg: 'text-[#4285F4]' },
  google_vision:         { icon: <SiGooglelens size={SI_SIZE} />,      bg: 'bg-[#4285F4]/20',  fg: 'text-[#4285F4]' },
  google_maps_geocode:   { icon: <SiGooglemaps size={SI_SIZE} />,      bg: 'bg-[#34A853]/20',  fg: 'text-[#34A853]' },
  youtube_search:        { icon: <SiYoutube size={SI_SIZE} />,         bg: 'bg-[#FF0000]/20',  fg: 'text-[#FF0000]' },

  // AI & ML
  openai_chat:           { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-[#10A37F]/20',   fg: 'text-[#10A37F]' },
  openai_image:          { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-[#10A37F]/20',   fg: 'text-[#10A37F]' },
  anthropic_chat:        { icon: <SiAnthropic size={SI_SIZE} />,       bg: 'bg-[#D4A27F]/20',   fg: 'text-[#D4A27F]' },
  huggingface_inference: { icon: <SiHuggingface size={SI_SIZE} />,     bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  ai_text_classifier:    { icon: <Layers size={ICON_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  ai_summarizer:         { icon: <BookOpen size={ICON_SIZE} />,        bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  whisper_transcribe:    { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-[#10A37F]/20',   fg: 'text-[#10A37F]' },

  // Social Media
  twitter_post:          { icon: <FaXTwitter size={SI_SIZE} />,        bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  twitter_search:        { icon: <FaXTwitter size={SI_SIZE} />,        bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  instagram_post:        { icon: <SiInstagram size={SI_SIZE} />,       bg: 'bg-[#E4405F]/20',   fg: 'text-[#E4405F]' },
  linkedin_post:         { icon: <FaLinkedinIn size={SI_SIZE} />,      bg: 'bg-[#0A66C2]/20',   fg: 'text-[#0A66C2]' },
  reddit_post:           { icon: <SiReddit size={SI_SIZE} />,          bg: 'bg-[#FF4500]/20',   fg: 'text-[#FF4500]' },

  // Messaging
  slack_message:         { icon: <SiSlack size={SI_SIZE} />,           bg: 'bg-[#4A154B]/20',   fg: 'text-[#611f69]' },
  discord_message:       { icon: <SiDiscord size={SI_SIZE} />,         bg: 'bg-[#5865F2]/20',   fg: 'text-[#5865F2]' },
  telegram_send:         { icon: <SiTelegram size={SI_SIZE} />,        bg: 'bg-[#26A5E4]/20',   fg: 'text-[#26A5E4]' },
  whatsapp_send:         { icon: <SiWhatsapp size={SI_SIZE} />,        bg: 'bg-[#25D366]/20',   fg: 'text-[#25D366]' },
  email_send:            { icon: <Send size={ICON_SIZE} />,            bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  twilio_sms:            { icon: <SiTwilio size={SI_SIZE} />,          bg: 'bg-[#F22F46]/20',   fg: 'text-[#F22F46]' },

  // Databases
  postgres_query:        { icon: <SiPostgresql size={SI_SIZE} />,      bg: 'bg-[#4169E1]/20',   fg: 'text-[#4169E1]' },
  mysql_query:           { icon: <SiMysql size={SI_SIZE} />,           bg: 'bg-[#4479A1]/20',   fg: 'text-[#4479A1]' },
  mongodb_find:          { icon: <SiMongodb size={SI_SIZE} />,         bg: 'bg-[#47A248]/20',   fg: 'text-[#47A248]' },
  redis_command:         { icon: <SiRedis size={SI_SIZE} />,           bg: 'bg-[#DC382D]/20',   fg: 'text-[#DC382D]' },
  firebase_read:         { icon: <SiFirebase size={SI_SIZE} />,        bg: 'bg-[#FFCA28]/20',   fg: 'text-[#FFCA28]' },
  supabase_query:        { icon: <SiSupabase size={SI_SIZE} />,        bg: 'bg-[#3FCF8E]/20',   fg: 'text-[#3FCF8E]' },

  // Cloud & DevOps
  aws_s3_upload:         { icon: <FaAws size={SI_SIZE} />,             bg: 'bg-[#FF9900]/20',   fg: 'text-[#FF9900]' },
  aws_lambda_invoke:     { icon: <FaAws size={SI_SIZE} />,             bg: 'bg-[#FF9900]/20',   fg: 'text-[#FF9900]' },
  github_create_issue:   { icon: <SiGithub size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  github_pr:             { icon: <SiGithub size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  docker_run:            { icon: <SiDocker size={SI_SIZE} />,          bg: 'bg-[#2496ED]/20',   fg: 'text-[#2496ED]' },
  vercel_deploy:         { icon: <SiVercel size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },

  // HTTP & APIs
  http_request:          { icon: <Globe size={ICON_SIZE} />,           bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  graphql_query:         { icon: <SiGraphql size={SI_SIZE} />,         bg: 'bg-pink-500/20',    fg: 'text-pink-400' },
  rest_api_poll:         { icon: <Repeat size={ICON_SIZE} />,          bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  soap_request:          { icon: <Server size={ICON_SIZE} />,          bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },

  // Files & Storage
  file_read:             { icon: <FileText size={ICON_SIZE} />,        bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  file_write:            { icon: <FileUp size={ICON_SIZE} />,          bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  csv_parse:             { icon: <BarChart3 size={ICON_SIZE} />,       bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  pdf_extract:           { icon: <FileDown size={ICON_SIZE} />,        bg: 'bg-red-500/20',     fg: 'text-red-400' },
  ftp_upload:            { icon: <FileUp size={ICON_SIZE} />,          bg: 'bg-amber-500/20',   fg: 'text-amber-400' },

  // Data Transform
  transform_map:         { icon: <ArrowRightLeft size={ICON_SIZE} />,  bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  transform_filter:      { icon: <Filter size={ICON_SIZE} />,          bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  transform_aggregate:   { icon: <BarChart3 size={ICON_SIZE} />,       bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  transform_merge:       { icon: <GitMerge size={ICON_SIZE} />,        bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  json_parse:            { icon: <Braces size={ICON_SIZE} />,          bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  xml_parse:             { icon: <Newspaper size={ICON_SIZE} />,       bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  code_javascript:       { icon: <SiJavascript size={SI_SIZE} />,      bg: 'bg-yellow-400/20',  fg: 'text-yellow-300' },
  code_python:           { icon: <SiPython size={SI_SIZE} />,          bg: 'bg-blue-400/20',    fg: 'text-blue-300' },

  // Logic & Flow
  logic_if:              { icon: <GitBranch size={ICON_SIZE} />,       bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  logic_switch:          { icon: <Shuffle size={ICON_SIZE} />,         bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  logic_loop:            { icon: <Repeat size={ICON_SIZE} />,          bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  logic_delay:           { icon: <Timer size={ICON_SIZE} />,           bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  logic_retry:           { icon: <RotateCcw size={ICON_SIZE} />,       bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  logic_parallel:        { icon: <Zap size={ICON_SIZE} />,             bg: 'bg-slate-500/20',   fg: 'text-slate-400' },
  error_handler:         { icon: <Shield size={ICON_SIZE} />,          bg: 'bg-red-500/20',     fg: 'text-red-400' },

  // CRM & Sales
  salesforce_query:      { icon: <SiSalesforce size={SI_SIZE} />,      bg: 'bg-[#00A1E0]/20',   fg: 'text-[#00A1E0]' },
  hubspot_contact:       { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-[#FF7A59]/20',   fg: 'text-[#FF7A59]' },
  airtable_list:         { icon: <SiAirtable size={SI_SIZE} />,        bg: 'bg-[#18BFFF]/20',   fg: 'text-[#18BFFF]' },
  notion_query:          { icon: <SiNotion size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },

  // Payments
  stripe_charge:         { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-[#635BFF]/20',   fg: 'text-[#635BFF]' },
  stripe_customer:       { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-[#635BFF]/20',   fg: 'text-[#635BFF]' },
  paypal_payment:        { icon: <SiPaypal size={SI_SIZE} />,          bg: 'bg-[#003087]/20',   fg: 'text-[#0070BA]' },

  // Analytics
  google_analytics:      { icon: <SiGoogleanalytics size={SI_SIZE} />, bg: 'bg-[#E37400]/20',   fg: 'text-[#E37400]' },
  mixpanel_track:        { icon: <SiMixpanel size={SI_SIZE} />,        bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  segment_track:         { icon: appFavicon('segment.com'),            bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Utilities
  util_logger:           { icon: <MessageSquare size={ICON_SIZE} />,   bg: 'bg-gray-500/20',    fg: 'text-gray-400' },
  util_set_variable:     { icon: <SlidersHorizontal size={ICON_SIZE} />,bg: 'bg-gray-500/20',   fg: 'text-gray-400' },
  util_crypto_hash:      { icon: <Lock size={ICON_SIZE} />,            bg: 'bg-gray-500/20',    fg: 'text-gray-400' },
  util_date_format:      { icon: <Calendar size={ICON_SIZE} />,        bg: 'bg-gray-500/20',    fg: 'text-gray-400' },
  util_uuid:             { icon: <Hash size={ICON_SIZE} />,            bg: 'bg-gray-500/20',    fg: 'text-gray-400' },
  util_random:           { icon: <Dice1 size={ICON_SIZE} />,           bg: 'bg-gray-500/20',    fg: 'text-gray-400' },
  util_regex:            { icon: <Type size={ICON_SIZE} />,            bg: 'bg-gray-500/20',    fg: 'text-gray-400' },

  // ── NEW NODES ──

  // AI & ML (expanded)
  gemini_chat:           { icon: <SiGooglegemini size={SI_SIZE} />,    bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  gemini_vision:         { icon: <SiGooglegemini size={SI_SIZE} />,    bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  perplexity_search:     { icon: <SiPerplexity size={SI_SIZE} />,      bg: 'bg-cyan-500/20',    fg: 'text-cyan-400' },
  mistral_chat:          { icon: <SiMistralai size={SI_SIZE} />,       bg: 'bg-[#FF7000]/20',   fg: 'text-[#FF7000]' },
  groq_chat:             { icon: appFavicon('groq.com'),               bg: 'bg-white/90',       fg: 'text-slate-900' },
  deepseek_chat:         { icon: appFavicon('deepseek.com'),           bg: 'bg-white/90',       fg: 'text-slate-900' },
  ollama_chat:           { icon: <SiOllama size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  elevenlabs_tts:        { icon: <SiElevenlabs size={SI_SIZE} />,      bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  replicate_run:         { icon: <SiReplicate size={SI_SIZE} />,       bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  openai_embeddings:     { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-[#10A37F]/20',   fg: 'text-[#10A37F]' },
  openai_tts:            { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-[#10A37F]/20',   fg: 'text-[#10A37F]' },
  langchain_chain:       { icon: <SiLangchain size={SI_SIZE} />,       bg: 'bg-green-500/20',   fg: 'text-green-400' },
  stability_generate:    { icon: appFavicon('stability.ai'),           bg: 'bg-white/90',       fg: 'text-slate-900' },
  cohere_generate:       { icon: appFavicon('cohere.com'),             bg: 'bg-white/90',       fg: 'text-slate-900' },
  cohere_embed:          { icon: appFavicon('cohere.com'),             bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Vector Databases
  pinecone_upsert:       { icon: appFavicon('pinecone.io'),            bg: 'bg-white/90',       fg: 'text-slate-900' },
  pinecone_query:        { icon: appFavicon('pinecone.io'),            bg: 'bg-white/90',       fg: 'text-slate-900' },
  qdrant_search:         { icon: appFavicon('qdrant.tech'),            bg: 'bg-white/90',       fg: 'text-slate-900' },
  weaviate_query:        { icon: appFavicon('weaviate.io'),            bg: 'bg-white/90',       fg: 'text-slate-900' },
  chroma_query:          { icon: appFavicon('trychroma.com'),          bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Databases (expanded)
  elasticsearch_query:   { icon: <SiElasticsearch size={SI_SIZE} />,   bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  dynamodb_query:        { icon: <FaAws size={SI_SIZE} />,             bg: 'bg-[#4053D6]/20',   fg: 'text-[#4053D6]' },

  // Social Media (expanded)
  tiktok_post:           { icon: <SiTiktok size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  facebook_post:         { icon: <SiFacebook size={SI_SIZE} />,        bg: 'bg-[#1877F2]/20',   fg: 'text-[#1877F2]' },
  pinterest_pin:         { icon: <SiPinterest size={SI_SIZE} />,       bg: 'bg-[#BD081C]/20',   fg: 'text-[#BD081C]' },
  youtube_upload:        { icon: <SiYoutube size={SI_SIZE} />,         bg: 'bg-[#FF0000]/20',   fg: 'text-[#FF0000]' },
  twitch_send:           { icon: <SiTwitch size={SI_SIZE} />,          bg: 'bg-[#9146FF]/20',   fg: 'text-[#9146FF]' },
  spotify_search:        { icon: <SiSpotify size={SI_SIZE} />,         bg: 'bg-[#1DB954]/20',   fg: 'text-[#1DB954]' },

  // Messaging (expanded)
  teams_message:         { icon: <FaMicrosoft size={SI_SIZE} />,       bg: 'bg-[#6264A7]/20',   fg: 'text-[#5B5FC7]' },
  sendgrid_email:        { icon: <SiSendgrid size={SI_SIZE} />,        bg: 'bg-[#1A82E2]/20',   fg: 'text-[#1A82E2]' },
  mailgun_send:          { icon: <SiMailgun size={SI_SIZE} />,         bg: 'bg-[#F06B66]/20',   fg: 'text-[#F06B66]' },

  // Project Management
  jira_create_issue:     { icon: <SiJira size={SI_SIZE} />,            bg: 'bg-[#0052CC]/20',   fg: 'text-[#0052CC]' },
  jira_update_issue:     { icon: <SiJira size={SI_SIZE} />,            bg: 'bg-[#0052CC]/20',   fg: 'text-[#0052CC]' },
  linear_create_issue:   { icon: <SiLinear size={SI_SIZE} />,          bg: 'bg-[#5E6AD2]/20',   fg: 'text-[#5E6AD2]' },
  trello_create_card:    { icon: <SiTrello size={SI_SIZE} />,          bg: 'bg-[#0052CC]/20',   fg: 'text-[#0052CC]' },
  asana_create_task:     { icon: <SiAsana size={SI_SIZE} />,           bg: 'bg-[#F06A6A]/20',   fg: 'text-[#F06A6A]' },
  clickup_create_task:   { icon: <SiClickup size={SI_SIZE} />,         bg: 'bg-[#7B68EE]/20',   fg: 'text-[#7B68EE]' },
  todoist_add_task:      { icon: <SiTodoist size={SI_SIZE} />,         bg: 'bg-[#E44332]/20',   fg: 'text-[#E44332]' },
  monday_create_item:    { icon: appFavicon('monday.com'),             bg: 'bg-white/90',       fg: 'text-slate-900' },

  // E-Commerce
  shopify_get_orders:    { icon: <SiShopify size={SI_SIZE} />,         bg: 'bg-[#7AB55C]/20',   fg: 'text-[#7AB55C]' },
  shopify_create_product:{ icon: <SiShopify size={SI_SIZE} />,         bg: 'bg-[#7AB55C]/20',   fg: 'text-[#7AB55C]' },
  woocommerce_get_orders:{ icon: <SiWoocommerce size={SI_SIZE} />,     bg: 'bg-[#96588A]/20',   fg: 'text-[#96588A]' },
  gumroad_get_sales:     { icon: <SiGumroad size={SI_SIZE} />,         bg: 'bg-[#FF90E8]/20',   fg: 'text-[#FF90E8]' },
  lemonsqueezy_get_orders:{ icon: <SiLemonsqueezy size={SI_SIZE} />,   bg: 'bg-[#FFC233]/20',   fg: 'text-[#FFC233]' },

  // CMS & Website
  wordpress_create_post: { icon: <SiWordpress size={SI_SIZE} />,       bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  webflow_create_item:   { icon: <SiWebflow size={SI_SIZE} />,         bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  contentful_get_entries: { icon: <SiContentful size={SI_SIZE} />,     bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  ghost_create_post:     { icon: <SiGhost size={SI_SIZE} />,           bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  notion_create_page:    { icon: <SiNotion size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },

  // Support & Helpdesk
  zendesk_create_ticket: { icon: <SiZendesk size={SI_SIZE} />,         bg: 'bg-green-500/20',   fg: 'text-green-400' },
  zendesk_update_ticket: { icon: <SiZendesk size={SI_SIZE} />,         bg: 'bg-green-500/20',   fg: 'text-green-400' },
  intercom_message:      { icon: <SiIntercom size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  freshdesk_create_ticket:{ icon: appFavicon('freshdesk.com'),         bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Scheduling & Video
  calendly_get_events:   { icon: <SiCalendly size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  zoom_create_meeting:   { icon: <SiZoom size={SI_SIZE} />,            bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  loom_get_videos:       { icon: <SiLoom size={SI_SIZE} />,            bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  vimeo_upload:          { icon: <SiVimeo size={SI_SIZE} />,           bg: 'bg-cyan-500/20',    fg: 'text-cyan-400' },

  // Cloud & DevOps (expanded)
  gcp_pubsub:            { icon: <SiGooglepubsub size={SI_SIZE} />,    bg: 'bg-[#4285F4]/20',   fg: 'text-[#4285F4]' },
  gcp_function:          { icon: <SiGooglecloud size={SI_SIZE} />,     bg: 'bg-[#4285F4]/20',   fg: 'text-[#4285F4]' },
  azure_function:        { icon: <FaMicrosoft size={SI_SIZE} />,       bg: 'bg-[#0078D4]/20',   fg: 'text-[#0078D4]' },
  azure_blob:            { icon: <FaMicrosoft size={SI_SIZE} />,       bg: 'bg-[#0078D4]/20',   fg: 'text-[#0078D4]' },
  cloudflare_worker:     { icon: <SiCloudflare size={SI_SIZE} />,      bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  digitalocean_droplet:  { icon: <SiDigitalocean size={SI_SIZE} />,    bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  netlify_deploy:        { icon: <SiNetlify size={SI_SIZE} />,         bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  railway_deploy:        { icon: <SiRailway size={SI_SIZE} />,         bg: 'bg-rose-500/20',  fg: 'text-rose-400' },

  // Files & Storage (expanded)
  dropbox_upload:        { icon: <SiDropbox size={SI_SIZE} />,         bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  dropbox_list:          { icon: <SiDropbox size={SI_SIZE} />,         bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  box_upload:            { icon: <SiBox size={SI_SIZE} />,             bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  onedrive_upload:       { icon: appFavicon('onedrive.live.com'),      bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Marketing
  mailchimp_add_member:  { icon: <SiMailchimp size={SI_SIZE} />,       bg: 'bg-[#FFE01B]/20',   fg: 'text-[#FFE01B]' },
  mailchimp_send_campaign:{ icon: <SiMailchimp size={SI_SIZE} />,      bg: 'bg-[#FFE01B]/20',   fg: 'text-[#FFE01B]' },
  convertkit_add_subscriber:{ icon: appFavicon('convertkit.com'),      bg: 'bg-white/90',       fg: 'text-slate-900' },
  beehiiv_create_post:   { icon: appFavicon('beehiiv.com'),            bg: 'bg-white/90',       fg: 'text-slate-900' },
  activecampaign_contact:{ icon: appFavicon('activecampaign.com'),     bg: 'bg-white/90',       fg: 'text-slate-900' },

  // Design
  figma_get_file:        { icon: <SiFigma size={SI_SIZE} />,           bg: 'bg-[#A259FF]/20',   fg: 'text-[#A259FF]' },
  figma_export:          { icon: <SiFigma size={SI_SIZE} />,           bg: 'bg-[#A259FF]/20',   fg: 'text-[#A259FF]' },
  canva_create_design:   { icon: <SiCanva size={SI_SIZE} />,           bg: 'bg-[#00C4CC]/20',   fg: 'text-[#00C4CC]' },

  // CRM (expanded)
  airtable_create_record:{ icon: <SiAirtable size={SI_SIZE} />,        bg: 'bg-[#18BFFF]/20',   fg: 'text-[#18BFFF]' },
  hubspot_get_contacts:  { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-[#FF7A59]/20',   fg: 'text-[#FF7A59]' },
  hubspot_create_deal:   { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-[#FF7A59]/20',   fg: 'text-[#FF7A59]' },
  salesforce_create_record:{ icon: <SiSalesforce size={SI_SIZE} />,    bg: 'bg-[#00A1E0]/20',   fg: 'text-[#00A1E0]' },

  // HTTP (expanded)
  webhook_response:      { icon: <Webhook size={ICON_SIZE} />,         bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  websocket_send:        { icon: <Globe size={ICON_SIZE} />,           bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  typeform_responses:    { icon: <SiTypeform size={SI_SIZE} />,        bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  google_forms_responses:{ icon: <SiGoogleforms size={SI_SIZE} />,     bg: 'bg-[#7248B9]/20',   fg: 'text-[#7248B9]' },

  // Payments (expanded)
  stripe_subscription:   { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-[#635BFF]/20',   fg: 'text-[#635BFF]' },
  stripe_webhook:        { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-[#635BFF]/20',   fg: 'text-[#635BFF]' },
};

// ── Default fallback icon ──
const defaultIcon: IconDef = {
  icon: <Zap size={ICON_SIZE} />,
  bg: 'bg-brand-500/20',
  fg: 'text-brand-400',
};

// ── Exported component ──
interface NodeIconProps {
  nodeType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 rounded',
  md: 'h-8 w-8 rounded-md',
  lg: 'h-10 w-10 rounded-lg',
};

export default function NodeIcon({ nodeType, size = 'md', className = '' }: NodeIconProps) {
  const def = iconMap[nodeType] || defaultIcon;

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${sizeClasses[size]} ${def.bg} ${def.fg || 'text-white'} ${className}`}
    >
      {def.icon}
    </div>
  );
}

// Also export the lookup so FlowNode can use it
export function getNodeIconDef(nodeType: string): IconDef {
  return iconMap[nodeType] || defaultIcon;
}

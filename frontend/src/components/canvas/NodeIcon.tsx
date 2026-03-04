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
  SiLinkedin,
  SiReddit,
  SiInstagram,
  SiAmazon,
  SiTwilio,
  SiMixpanel,
  // New brand icons
  SiGooglegemini,
  SiPerplexity,
  SiOllama,
  SiElevenlabs,
  SiLangchain,
  SiElasticsearch,
  SiAmazondynamodb,
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
} from 'react-icons/si';
import { FaXTwitter } from 'react-icons/fa6';

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

// ── Master mapping from node type → icon rendering ──
const iconMap: Record<string, IconDef> = {
  // Triggers
  trigger_webhook:  { icon: <Webhook size={ICON_SIZE} />,           bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_cron:     { icon: <Clock size={ICON_SIZE} />,             bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_email:    { icon: <Mail size={ICON_SIZE} />,              bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },
  trigger_manual:   { icon: <MousePointerClick size={ICON_SIZE} />, bg: 'bg-yellow-500/20', fg: 'text-yellow-400' },

  // Google
  google_sheets_read:    { icon: <SiGoogle size={SI_SIZE} />,          bg: 'bg-green-500/20',  fg: 'text-green-400' },
  google_sheets_write:   { icon: <SiGoogle size={SI_SIZE} />,          bg: 'bg-green-500/20',  fg: 'text-green-400' },
  google_gmail_send:     { icon: <SiGmail size={SI_SIZE} />,           bg: 'bg-red-500/20',    fg: 'text-red-400' },
  google_gmail_read:     { icon: <SiGmail size={SI_SIZE} />,           bg: 'bg-red-500/20',    fg: 'text-red-400' },
  google_drive_upload:   { icon: <SiGoogledrive size={SI_SIZE} />,     bg: 'bg-blue-500/20',   fg: 'text-blue-400' },
  google_drive_list:     { icon: <SiGoogledrive size={SI_SIZE} />,     bg: 'bg-blue-500/20',   fg: 'text-blue-400' },
  google_calendar_create:{ icon: <SiGooglecalendar size={SI_SIZE} />,  bg: 'bg-blue-500/20',   fg: 'text-blue-400' },
  google_translate:      { icon: <SiGoogletranslate size={SI_SIZE} />, bg: 'bg-blue-400/20',   fg: 'text-blue-300' },
  google_vision:         { icon: <Eye size={ICON_SIZE} />,             bg: 'bg-blue-500/20',   fg: 'text-blue-400' },
  google_maps_geocode:   { icon: <SiGooglemaps size={SI_SIZE} />,      bg: 'bg-green-500/20',  fg: 'text-green-400' },
  youtube_search:        { icon: <SiYoutube size={SI_SIZE} />,         bg: 'bg-red-600/20',    fg: 'text-red-500' },

  // AI & ML
  openai_chat:           { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  openai_image:          { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  anthropic_chat:        { icon: <Zap size={ICON_SIZE} />,             bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  huggingface_inference: { icon: <Activity size={ICON_SIZE} />,        bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  ai_text_classifier:    { icon: <Layers size={ICON_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  ai_summarizer:         { icon: <BookOpen size={ICON_SIZE} />,        bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  whisper_transcribe:    { icon: <Megaphone size={ICON_SIZE} />,       bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },

  // Social Media
  twitter_post:          { icon: <FaXTwitter size={SI_SIZE} />,        bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  twitter_search:        { icon: <FaXTwitter size={SI_SIZE} />,        bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  instagram_post:        { icon: <SiInstagram size={SI_SIZE} />,       bg: 'bg-pink-500/20',    fg: 'text-pink-400' },
  linkedin_post:         { icon: <SiLinkedin size={SI_SIZE} />,        bg: 'bg-blue-600/20',    fg: 'text-blue-400' },
  reddit_post:           { icon: <SiReddit size={SI_SIZE} />,          bg: 'bg-orange-600/20',  fg: 'text-orange-400' },

  // Messaging
  slack_message:         { icon: <SiSlack size={SI_SIZE} />,           bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  discord_message:       { icon: <SiDiscord size={SI_SIZE} />,         bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  telegram_send:         { icon: <SiTelegram size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  whatsapp_send:         { icon: <SiWhatsapp size={SI_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },
  email_send:            { icon: <Send size={ICON_SIZE} />,            bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  twilio_sms:            { icon: <SiTwilio size={SI_SIZE} />,          bg: 'bg-red-500/20',     fg: 'text-red-400' },

  // Databases
  postgres_query:        { icon: <SiPostgresql size={SI_SIZE} />,      bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  mysql_query:           { icon: <SiMysql size={SI_SIZE} />,           bg: 'bg-blue-600/20',    fg: 'text-blue-400' },
  mongodb_find:          { icon: <SiMongodb size={SI_SIZE} />,         bg: 'bg-green-600/20',   fg: 'text-green-400' },
  redis_command:         { icon: <SiRedis size={SI_SIZE} />,           bg: 'bg-red-600/20',     fg: 'text-red-400' },
  firebase_read:         { icon: <SiFirebase size={SI_SIZE} />,        bg: 'bg-amber-500/20',   fg: 'text-amber-400' },
  supabase_query:        { icon: <SiSupabase size={SI_SIZE} />,        bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },

  // Cloud & DevOps
  aws_s3_upload:         { icon: <SiAmazon size={SI_SIZE} />,       bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  aws_lambda_invoke:     { icon: <SiAmazon size={SI_SIZE} />,       bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  github_create_issue:   { icon: <SiGithub size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  github_pr:             { icon: <SiGithub size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  docker_run:            { icon: <SiDocker size={SI_SIZE} />,          bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
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
  salesforce_query:      { icon: <SiSalesforce size={SI_SIZE} />,      bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  hubspot_contact:       { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  airtable_list:         { icon: <SiAirtable size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  notion_query:          { icon: <SiNotion size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },

  // Payments
  stripe_charge:         { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  stripe_customer:       { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  paypal_payment:        { icon: <SiPaypal size={SI_SIZE} />,          bg: 'bg-blue-500/20',    fg: 'text-blue-400' },

  // Analytics
  google_analytics:      { icon: <SiGoogle size={SI_SIZE} />,          bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  mixpanel_track:        { icon: <SiMixpanel size={SI_SIZE} />,        bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  segment_track:         { icon: <Activity size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },

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
  mistral_chat:          { icon: <Zap size={ICON_SIZE} />,             bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  groq_chat:             { icon: <Zap size={ICON_SIZE} />,             bg: 'bg-orange-600/20',  fg: 'text-orange-500' },
  deepseek_chat:         { icon: <Activity size={ICON_SIZE} />,        bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  ollama_chat:           { icon: <SiOllama size={SI_SIZE} />,          bg: 'bg-gray-500/20',    fg: 'text-gray-300' },
  elevenlabs_tts:        { icon: <SiElevenlabs size={SI_SIZE} />,      bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  replicate_run:         { icon: <Server size={ICON_SIZE} />,          bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  openai_embeddings:     { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  openai_tts:            { icon: <SiOpenai size={SI_SIZE} />,          bg: 'bg-emerald-500/20', fg: 'text-emerald-400' },
  langchain_chain:       { icon: <SiLangchain size={SI_SIZE} />,       bg: 'bg-green-500/20',   fg: 'text-green-400' },
  stability_generate:    { icon: <Layers size={ICON_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  cohere_generate:       { icon: <Activity size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },
  cohere_embed:          { icon: <Activity size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },

  // Vector Databases
  pinecone_upsert:       { icon: <Database size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },
  pinecone_query:        { icon: <Database size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },
  qdrant_search:         { icon: <Database size={ICON_SIZE} />,        bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  weaviate_query:        { icon: <Database size={ICON_SIZE} />,        bg: 'bg-green-500/20',   fg: 'text-green-400' },
  chroma_query:          { icon: <Database size={ICON_SIZE} />,        bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },

  // Databases (expanded)
  elasticsearch_query:   { icon: <SiElasticsearch size={SI_SIZE} />,   bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  dynamodb_query:        { icon: <SiAmazondynamodb size={SI_SIZE} />,   bg: 'bg-blue-500/20',    fg: 'text-blue-400' },

  // Social Media (expanded)
  tiktok_post:           { icon: <SiTiktok size={SI_SIZE} />,          bg: 'bg-pink-500/20',    fg: 'text-pink-400' },
  facebook_post:         { icon: <SiFacebook size={SI_SIZE} />,        bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  pinterest_pin:         { icon: <SiPinterest size={SI_SIZE} />,       bg: 'bg-red-500/20',     fg: 'text-red-400' },
  youtube_upload:        { icon: <SiYoutube size={SI_SIZE} />,         bg: 'bg-red-600/20',     fg: 'text-red-500' },
  twitch_send:           { icon: <SiTwitch size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  spotify_search:        { icon: <SiSpotify size={SI_SIZE} />,         bg: 'bg-green-500/20',   fg: 'text-green-400' },

  // Messaging (expanded)
  teams_message:         { icon: <MessageSquare size={ICON_SIZE} />,   bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  sendgrid_email:        { icon: <SiSendgrid size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  mailgun_send:          { icon: <SiMailgun size={SI_SIZE} />,         bg: 'bg-red-500/20',     fg: 'text-red-400' },

  // Project Management
  jira_create_issue:     { icon: <SiJira size={SI_SIZE} />,            bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  jira_update_issue:     { icon: <SiJira size={SI_SIZE} />,            bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  linear_create_issue:   { icon: <SiLinear size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  trello_create_card:    { icon: <SiTrello size={SI_SIZE} />,          bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  asana_create_task:     { icon: <SiAsana size={SI_SIZE} />,           bg: 'bg-pink-500/20',    fg: 'text-pink-400' },
  clickup_create_task:   { icon: <SiClickup size={SI_SIZE} />,         bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  todoist_add_task:      { icon: <SiTodoist size={SI_SIZE} />,         bg: 'bg-red-500/20',     fg: 'text-red-400' },
  monday_create_item:    { icon: <BarChart3 size={ICON_SIZE} />,       bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },

  // E-Commerce
  shopify_get_orders:    { icon: <SiShopify size={SI_SIZE} />,         bg: 'bg-green-500/20',   fg: 'text-green-400' },
  shopify_create_product:{ icon: <SiShopify size={SI_SIZE} />,         bg: 'bg-green-500/20',   fg: 'text-green-400' },
  woocommerce_get_orders:{ icon: <SiWoocommerce size={SI_SIZE} />,     bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  gumroad_get_sales:     { icon: <SiGumroad size={SI_SIZE} />,         bg: 'bg-pink-500/20',    fg: 'text-pink-400' },
  lemonsqueezy_get_orders:{ icon: <SiLemonsqueezy size={SI_SIZE} />,   bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },

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
  freshdesk_create_ticket:{ icon: <Shield size={ICON_SIZE} />,         bg: 'bg-green-600/20',   fg: 'text-green-500' },

  // Scheduling & Video
  calendly_get_events:   { icon: <SiCalendly size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  zoom_create_meeting:   { icon: <SiZoom size={SI_SIZE} />,            bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  loom_get_videos:       { icon: <SiLoom size={SI_SIZE} />,            bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  vimeo_upload:          { icon: <SiVimeo size={SI_SIZE} />,           bg: 'bg-cyan-500/20',    fg: 'text-cyan-400' },

  // Cloud & DevOps (expanded)
  gcp_pubsub:            { icon: <SiGooglecloud size={SI_SIZE} />,     bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  gcp_function:          { icon: <SiGooglecloud size={SI_SIZE} />,     bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  azure_function:        { icon: <Server size={ICON_SIZE} />,          bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  azure_blob:            { icon: <Server size={ICON_SIZE} />,          bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  cloudflare_worker:     { icon: <SiCloudflare size={SI_SIZE} />,      bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  digitalocean_droplet:  { icon: <SiDigitalocean size={SI_SIZE} />,    bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  netlify_deploy:        { icon: <SiNetlify size={SI_SIZE} />,         bg: 'bg-teal-500/20',    fg: 'text-teal-400' },
  railway_deploy:        { icon: <SiRailway size={SI_SIZE} />,         bg: 'bg-rose-500/20',  fg: 'text-rose-400' },

  // Files & Storage (expanded)
  dropbox_upload:        { icon: <SiDropbox size={SI_SIZE} />,         bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  dropbox_list:          { icon: <SiDropbox size={SI_SIZE} />,         bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  box_upload:            { icon: <SiBox size={SI_SIZE} />,             bg: 'bg-blue-600/20',    fg: 'text-blue-500' },
  onedrive_upload:       { icon: <FileUp size={ICON_SIZE} />,          bg: 'bg-blue-500/20',    fg: 'text-blue-400' },

  // Marketing
  mailchimp_add_member:  { icon: <Send size={ICON_SIZE} />,            bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  mailchimp_send_campaign:{ icon: <Send size={ICON_SIZE} />,           bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  convertkit_add_subscriber:{ icon: <Mail size={ICON_SIZE} />,         bg: 'bg-red-500/20',     fg: 'text-red-400' },
  beehiiv_create_post:   { icon: <Megaphone size={ICON_SIZE} />,       bg: 'bg-yellow-500/20',  fg: 'text-yellow-400' },
  activecampaign_contact:{ icon: <Send size={ICON_SIZE} />,            bg: 'bg-blue-500/20',    fg: 'text-blue-400' },

  // Design
  figma_get_file:        { icon: <SiFigma size={SI_SIZE} />,           bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  figma_export:          { icon: <SiFigma size={SI_SIZE} />,           bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  canva_create_design:   { icon: <SiCanva size={SI_SIZE} />,           bg: 'bg-cyan-500/20',    fg: 'text-cyan-400' },

  // CRM (expanded)
  airtable_create_record:{ icon: <SiAirtable size={SI_SIZE} />,        bg: 'bg-blue-500/20',    fg: 'text-blue-400' },
  hubspot_get_contacts:  { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  hubspot_create_deal:   { icon: <SiHubspot size={SI_SIZE} />,         bg: 'bg-orange-500/20',  fg: 'text-orange-400' },
  salesforce_create_record:{ icon: <SiSalesforce size={SI_SIZE} />,    bg: 'bg-blue-500/20',    fg: 'text-blue-400' },

  // HTTP (expanded)
  webhook_response:      { icon: <Webhook size={ICON_SIZE} />,         bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  websocket_send:        { icon: <Globe size={ICON_SIZE} />,           bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  typeform_responses:    { icon: <SiTypeform size={SI_SIZE} />,        bg: 'bg-indigo-500/20',  fg: 'text-indigo-400' },
  google_forms_responses:{ icon: <SiGoogleforms size={SI_SIZE} />,     bg: 'bg-rose-500/20',  fg: 'text-rose-400' },

  // Payments (expanded)
  stripe_subscription:   { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
  stripe_webhook:        { icon: <SiStripe size={SI_SIZE} />,          bg: 'bg-rose-500/20',  fg: 'text-rose-400' },
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
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
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

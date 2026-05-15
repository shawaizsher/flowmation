import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ────────── Types ────────── */
export type CredentialAuthType = 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'connection_string';

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
}

export interface ServiceDefinition {
  serviceId: string;
  label: string;
  description: string;
  icon: string;           // node type for NodeIcon
  authType: CredentialAuthType;
  fields: CredentialField[];
  /** node type prefixes that use this service, e.g. ['google_', 'openai_'] */
  nodeTypePrefixes: string[];
}

export interface SavedCredential {
  id: string;
  serviceId: string;
  name: string;         // user-friendly label e.g. "My Google Account"
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/* ────────── Service definitions ────────── */
export const serviceDefinitions: ServiceDefinition[] = [
  {
    serviceId: 'google',
    label: 'Google',
    description: 'Google Sheets, Gmail, Drive, Calendar, Translate, Vision, Maps',
    icon: 'google_sheets_read',
    authType: 'oauth2',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'your-client-id.apps.googleusercontent.com', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: '1//0...' },
      { key: 'api_key', label: 'API Key (optional)', type: 'password', placeholder: 'AIza...' },
    ],
    nodeTypePrefixes: ['google_'],
  },
  {
    serviceId: 'openai',
    label: 'OpenAI',
    description: 'GPT Chat, Image Generation, Embeddings, Whisper',
    icon: 'openai_chat',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      { key: 'organization', label: 'Organization ID', type: 'text', placeholder: 'org-...' },
    ],
    nodeTypePrefixes: ['openai_'],
  },
  {
    serviceId: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Claude AI models',
    icon: 'anthropic_claude',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
    ],
    nodeTypePrefixes: ['anthropic_', 'ai_classify', 'ai_summarize', 'ai_'],
  },
  {
    serviceId: 'huggingface',
    label: 'Hugging Face',
    description: 'HF Inference, models, datasets',
    icon: 'huggingface_inference',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'Access Token', type: 'password', placeholder: 'hf_...', required: true },
    ],
    nodeTypePrefixes: ['huggingface_'],
  },
  {
    serviceId: 'slack',
    label: 'Slack',
    description: 'Send messages through Slack incoming webhooks',
    icon: 'slack_message',
    authType: 'bearer',
    fields: [
      { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/...', required: true },
      { key: 'bot_token', label: 'Bot Token (optional)', type: 'password', placeholder: 'xoxb-...' },
      { key: 'signing_secret', label: 'Signing Secret', type: 'password', placeholder: '' },
    ],
    nodeTypePrefixes: ['slack_'],
  },
  {
    serviceId: 'discord',
    label: 'Discord',
    description: 'Send messages, manage servers',
    icon: 'discord_message',
    authType: 'bearer',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '', required: true },
    ],
    nodeTypePrefixes: ['discord_'],
  },
  {
    serviceId: 'telegram',
    label: 'Telegram',
    description: 'Send messages, manage bots',
    icon: 'telegram_send',
    authType: 'api_key',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...', required: true },
    ],
    nodeTypePrefixes: ['telegram_'],
  },
  {
    serviceId: 'whatsapp',
    label: 'WhatsApp',
    description: 'WhatsApp Business API messaging',
    icon: 'whatsapp_send',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
    ],
    nodeTypePrefixes: ['whatsapp_'],
  },
  {
    serviceId: 'twilio',
    label: 'Twilio',
    description: 'SMS, voice, WhatsApp via Twilio',
    icon: 'twilio_sms',
    authType: 'api_key',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', type: 'text', placeholder: '+1234567890' },
    ],
    nodeTypePrefixes: ['twilio_'],
  },
  {
    serviceId: 'sendgrid',
    label: 'SendGrid',
    description: 'Email delivery service',
    icon: 'sendgrid_email',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...', required: true },
    ],
    nodeTypePrefixes: ['sendgrid_'],
  },
  {
    serviceId: 'twitter',
    label: 'X (Twitter)',
    description: 'Post tweets, search Twitter',
    icon: 'twitter_post',
    authType: 'oauth2',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'access_secret', label: 'Access Token Secret', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['twitter_'],
  },
  {
    serviceId: 'github',
    label: 'GitHub',
    description: 'Create issues, manage repos, webhooks',
    icon: 'github_create_issue',
    authType: 'bearer',
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true },
    ],
    nodeTypePrefixes: ['github_'],
  },
  {
    serviceId: 'postgres',
    label: 'PostgreSQL',
    description: 'Run SQL queries on PostgreSQL',
    icon: 'postgres_query',
    authType: 'connection_string',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'text', placeholder: '5432' },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'ssl', label: 'SSL Mode', type: 'text', placeholder: 'require' },
    ],
    nodeTypePrefixes: ['postgres_'],
  },
  {
    serviceId: 'mysql',
    label: 'MySQL',
    description: 'Run SQL queries on MySQL',
    icon: 'mysql_query',
    authType: 'connection_string',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'text', placeholder: '3306' },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['mysql_'],
  },
  {
    serviceId: 'mongodb',
    label: 'MongoDB',
    description: 'Query, insert, aggregate MongoDB collections',
    icon: 'mongodb_find',
    authType: 'connection_string',
    fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password', placeholder: 'mongodb+srv://...', required: true },
      { key: 'database', label: 'Database', type: 'text', required: true },
    ],
    nodeTypePrefixes: ['mongodb_'],
  },
  {
    serviceId: 'redis',
    label: 'Redis',
    description: 'Get, set, and manage Redis keys',
    icon: 'redis_get',
    authType: 'connection_string',
    fields: [
      { key: 'url', label: 'Connection URL', type: 'password', placeholder: 'redis://localhost:6379', required: true },
      { key: 'password', label: 'Password', type: 'password' },
    ],
    nodeTypePrefixes: ['redis_'],
  },
  {
    serviceId: 'aws',
    label: 'Amazon Web Services',
    description: 'S3, Lambda, and other AWS services',
    icon: 'aws_s3_upload',
    authType: 'api_key',
    fields: [
      { key: 'access_key_id', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...', required: true },
      { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    nodeTypePrefixes: ['aws_'],
  },
  {
    serviceId: 'stripe',
    label: 'Stripe',
    description: 'Create charges, customers, subscriptions',
    icon: 'stripe_charge',
    authType: 'api_key',
    fields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', required: true },
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    nodeTypePrefixes: ['stripe_'],
  },
  {
    serviceId: 'hubspot',
    label: 'HubSpot',
    description: 'CRM contacts, deals, companies',
    icon: 'hubspot_create',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['hubspot_'],
  },
  {
    serviceId: 'salesforce',
    label: 'Salesforce',
    description: 'CRM records, leads, opportunities',
    icon: 'salesforce_query',
    authType: 'oauth2',
    fields: [
      { key: 'instance_url', label: 'Instance URL', type: 'url', placeholder: 'https://yourorg.salesforce.com', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password' },
    ],
    nodeTypePrefixes: ['salesforce_'],
  },
  {
    serviceId: 'mailchimp',
    label: 'Mailchimp',
    description: 'Email campaigns and subscriber lists',
    icon: 'mailchimp_add',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '....-us21', required: true },
      { key: 'server_prefix', label: 'Server Prefix', type: 'text', placeholder: 'us21' },
    ],
    nodeTypePrefixes: ['mailchimp_'],
  },
  {
    serviceId: 'ga4',
    label: 'Google Analytics',
    description: 'Query GA4 analytics data',
    icon: 'ga4_report',
    authType: 'api_key',
    fields: [
      { key: 'property_id', label: 'Property ID', type: 'text', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['ga4_'],
  },

  // ────────── NEW SERVICE CREDENTIALS ──────────

  {
    serviceId: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini Chat, Vision, and multimodal AI',
    icon: 'gemini_chat',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIza...', required: true },
    ],
    nodeTypePrefixes: ['gemini_'],
  },
  {
    serviceId: 'perplexity',
    label: 'Perplexity AI',
    description: 'AI-powered search with citations',
    icon: 'perplexity_search',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'pplx-...', required: true },
    ],
    nodeTypePrefixes: ['perplexity_'],
  },
  {
    serviceId: 'mistral',
    label: 'Mistral AI',
    description: 'Mistral open-weight and proprietary models',
    icon: 'mistral_chat',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['mistral_'],
  },
  {
    serviceId: 'groq',
    label: 'Groq',
    description: 'Ultra-fast LLM inference',
    icon: 'groq_chat',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'gsk_...', required: true },
    ],
    nodeTypePrefixes: ['groq_'],
  },
  {
    serviceId: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek reasoning and chat models',
    icon: 'deepseek_chat',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://api.deepseek.com' },
    ],
    nodeTypePrefixes: ['deepseek_'],
  },
  {
    serviceId: 'cohere',
    label: 'Cohere',
    description: 'Generate text and embeddings with Cohere',
    icon: 'cohere_generate',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['cohere_'],
  },
  {
    serviceId: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Realistic text-to-speech AI',
    icon: 'elevenlabs_tts',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['elevenlabs_'],
  },
  {
    serviceId: 'replicate',
    label: 'Replicate',
    description: 'Run ML models via API',
    icon: 'replicate_run',
    authType: 'api_key',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'r8_...', required: true },
    ],
    nodeTypePrefixes: ['replicate_'],
  },
  {
    serviceId: 'stability',
    label: 'Stability AI',
    description: 'Stable Diffusion image generation',
    icon: 'stability_generate',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
    ],
    nodeTypePrefixes: ['stability_'],
  },
  {
    serviceId: 'pinecone',
    label: 'Pinecone',
    description: 'Vector database for AI applications',
    icon: 'pinecone_query',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'text', placeholder: 'us-east-1-aws' },
    ],
    nodeTypePrefixes: ['pinecone_'],
  },
  {
    serviceId: 'jira',
    label: 'Jira',
    description: 'Project management and issue tracking',
    icon: 'jira_create_issue',
    authType: 'basic',
    fields: [
      { key: 'domain', label: 'Domain', type: 'url', placeholder: 'https://yourorg.atlassian.net', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['jira_'],
  },
  {
    serviceId: 'linear',
    label: 'Linear',
    description: 'Modern issue tracking',
    icon: 'linear_create_issue',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'lin_api_...', required: true },
    ],
    nodeTypePrefixes: ['linear_'],
  },
  {
    serviceId: 'trello',
    label: 'Trello',
    description: 'Board and card management',
    icon: 'trello_create_card',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['trello_'],
  },
  {
    serviceId: 'asana',
    label: 'Asana',
    description: 'Task and project management',
    icon: 'asana_create_task',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['asana_'],
  },
  {
    serviceId: 'clickup',
    label: 'ClickUp',
    description: 'All-in-one productivity platform',
    icon: 'clickup_create_task',
    authType: 'api_key',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'pk_...', required: true },
    ],
    nodeTypePrefixes: ['clickup_'],
  },
  {
    serviceId: 'todoist',
    label: 'Todoist',
    description: 'Task management',
    icon: 'todoist_add_task',
    authType: 'bearer',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['todoist_'],
  },
  {
    serviceId: 'shopify',
    label: 'Shopify',
    description: 'E-commerce platform',
    icon: 'shopify_get_orders',
    authType: 'api_key',
    fields: [
      { key: 'shop_domain', label: 'Shop Domain', type: 'text', placeholder: 'your-store.myshopify.com', required: true },
      { key: 'access_token', label: 'Admin Access Token', type: 'password', placeholder: 'shpat_...', required: true },
    ],
    nodeTypePrefixes: ['shopify_'],
  },
  {
    serviceId: 'woocommerce',
    label: 'WooCommerce',
    description: 'WordPress e-commerce',
    icon: 'woocommerce_get_orders',
    authType: 'api_key',
    fields: [
      { key: 'site_url', label: 'Site URL', type: 'url', placeholder: 'https://example.com', required: true },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['woocommerce_'],
  },
  {
    serviceId: 'wordpress',
    label: 'WordPress',
    description: 'WordPress REST API',
    icon: 'wordpress_create_post',
    authType: 'basic',
    fields: [
      { key: 'site_url', label: 'Site URL', type: 'url', placeholder: 'https://example.com', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'app_password', label: 'App Password', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['wordpress_'],
  },
  {
    serviceId: 'webflow',
    label: 'Webflow',
    description: 'Webflow CMS and site builder',
    icon: 'webflow_create_item',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'API Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['webflow_'],
  },
  {
    serviceId: 'contentful',
    label: 'Contentful',
    description: 'Headless CMS',
    icon: 'contentful_get_entries',
    authType: 'api_key',
    fields: [
      { key: 'space_id', label: 'Space ID', type: 'text', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'text', placeholder: 'master' },
    ],
    nodeTypePrefixes: ['contentful_'],
  },
  {
    serviceId: 'ghost',
    label: 'Ghost',
    description: 'Ghost blogging platform',
    icon: 'ghost_create_post',
    authType: 'api_key',
    fields: [
      { key: 'url', label: 'Ghost URL', type: 'url', placeholder: 'https://your-blog.ghost.io', required: true },
      { key: 'admin_api_key', label: 'Admin API Key', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['ghost_'],
  },
  {
    serviceId: 'notion',
    label: 'Notion',
    description: 'Notion workspace and databases',
    icon: 'notion_query',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'Integration Token', type: 'password', placeholder: 'secret_...', required: true },
    ],
    nodeTypePrefixes: ['notion_'],
  },
  {
    serviceId: 'zendesk',
    label: 'Zendesk',
    description: 'Customer support and helpdesk',
    icon: 'zendesk_create_ticket',
    authType: 'api_key',
    fields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', placeholder: 'yourcompany', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['zendesk_'],
  },
  {
    serviceId: 'intercom',
    label: 'Intercom',
    description: 'Customer messaging platform',
    icon: 'intercom_message',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['intercom_'],
  },
  {
    serviceId: 'calendly',
    label: 'Calendly',
    description: 'Scheduling and event management',
    icon: 'calendly_get_events',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['calendly_'],
  },
  {
    serviceId: 'zoom',
    label: 'Zoom',
    description: 'Video meetings and webinars',
    icon: 'zoom_create_meeting',
    authType: 'oauth2',
    fields: [
      { key: 'account_id', label: 'Account ID', type: 'text', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['zoom_'],
  },
  {
    serviceId: 'cloudflare',
    label: 'Cloudflare',
    description: 'CDN, DNS, and Workers',
    icon: 'cloudflare_worker',
    authType: 'api_key',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text' },
    ],
    nodeTypePrefixes: ['cloudflare_'],
  },
  {
    serviceId: 'digitalocean',
    label: 'DigitalOcean',
    description: 'Cloud infrastructure',
    icon: 'digitalocean_droplet',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'API Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['digitalocean_'],
  },
  {
    serviceId: 'gcp',
    label: 'Google Cloud Platform',
    description: 'GCP Pub/Sub, Functions, and more',
    icon: 'gcp_pubsub',
    authType: 'api_key',
    fields: [
      { key: 'project_id', label: 'Project ID', type: 'text', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['gcp_'],
  },
  {
    serviceId: 'dropbox',
    label: 'Dropbox',
    description: 'Cloud file storage',
    icon: 'dropbox_upload',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['dropbox_'],
  },
  {
    serviceId: 'figma',
    label: 'Figma',
    description: 'Design files and components',
    icon: 'figma_get_file',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['figma_'],
  },
  {
    serviceId: 'tiktok',
    label: 'TikTok',
    description: 'TikTok for Business API',
    icon: 'tiktok_post',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['tiktok_'],
  },
  {
    serviceId: 'facebook',
    label: 'Facebook',
    description: 'Facebook Pages and Graph API',
    icon: 'facebook_post',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Page Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['facebook_'],
  },
  {
    serviceId: 'pinterest',
    label: 'Pinterest',
    description: 'Pinterest Ads and Pins API',
    icon: 'pinterest_pin',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['pinterest_'],
  },
  {
    serviceId: 'spotify',
    label: 'Spotify',
    description: 'Spotify Web API',
    icon: 'spotify_search',
    authType: 'oauth2',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    ],
    nodeTypePrefixes: ['spotify_'],
  },
  {
    serviceId: 'airtable',
    label: 'Airtable',
    description: 'Airtable bases and records',
    icon: 'airtable_list',
    authType: 'bearer',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', placeholder: 'pat...', required: true },
    ],
    nodeTypePrefixes: ['airtable_'],
  },
];

/* ────────── Helper: find service for a node type ────────── */
export function getServiceForNodeType(nodeType: string): ServiceDefinition | undefined {
  return serviceDefinitions.find((s) =>
    s.nodeTypePrefixes.some((prefix) => nodeType.startsWith(prefix))
  );
}

/* ────────── Credential Store ────────── */
interface CredentialState {
  credentials: SavedCredential[];
  addCredential: (cred: Omit<SavedCredential, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCredential: (id: string, updates: Partial<Pick<SavedCredential, 'name' | 'values'>>) => void;
  removeCredential: (id: string) => void;
  getCredentialsForService: (serviceId: string) => SavedCredential[];
  getCredentialById: (id: string) => SavedCredential | undefined;
}

export const useCredentialStore = create<CredentialState>()(
  persist(
    (set, get) => ({
      credentials: [],

      addCredential: (cred) => {
        const id = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();
        const newCred: SavedCredential = { ...cred, id, createdAt: now, updatedAt: now };
        set((state) => ({ credentials: [...state.credentials, newCred] }));
        return id;
      },

      updateCredential: (id, updates) => {
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      removeCredential: (id) => {
        set((state) => ({
          credentials: state.credentials.filter((c) => c.id !== id),
        }));
      },

      getCredentialsForService: (serviceId) => {
        return get().credentials.filter((c) => c.serviceId === serviceId);
      },

      getCredentialById: (id) => {
        return get().credentials.find((c) => c.id === id);
      },
    }),
    {
      name: 'flowa-credentials',
      // Never persist raw secrets to localStorage in production — this is a demo store.
      // In production you'd encrypt or use a backend vault.
    }
  )
);

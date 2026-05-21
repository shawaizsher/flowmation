// ── Comprehensive Node Catalog ──
// Each node represents an integration, trigger, or utility that can be placed on the canvas.

export interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  color: string;            // Tailwind color class for category badge
  configSchema: Record<string, ConfigField>;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'json' | 'dynamic_headers';
  label: string;
  default?: any;
  placeholder?: string;
  options?: string[];        // For select type
  required?: boolean;
}

// ─────────────────────────────────────────
//  CATEGORY DEFINITIONS
// ─────────────────────────────────────────

export const categoryMeta: Record<string, { label: string; icon: string; color: string }> = {
  triggers:    { label: 'Triggers',            icon: '⚡', color: 'text-yellow-400' },
  google:      { label: 'Google',              icon: '🔍', color: 'text-blue-400' },
  ai:          { label: 'AI & ML',             icon: '🧠', color: 'text-rose-400' },
  social:      { label: 'Social Media',        icon: '📱', color: 'text-pink-400' },
  messaging:   { label: 'Messaging',           icon: '💬', color: 'text-green-400' },
  databases:   { label: 'Databases',           icon: '🗄️', color: 'text-orange-400' },
  vectordb:    { label: 'Vector Databases',    icon: '🔮', color: 'text-rose-400' },
  cloud:       { label: 'Cloud & DevOps',      icon: '☁️', color: 'text-cyan-400' },
  http:        { label: 'HTTP & APIs',         icon: '🌐', color: 'text-indigo-400' },
  files:       { label: 'Files & Storage',     icon: '📁', color: 'text-amber-400' },
  transform:   { label: 'Data Transform',      icon: '🔄', color: 'text-teal-400' },
  logic:       { label: 'Logic & Flow',        icon: '🔀', color: 'text-slate-400' },
  crm:         { label: 'CRM & Sales',         icon: '💼', color: 'text-emerald-400' },
  productivity:{ label: 'Project Management',  icon: '📋', color: 'text-sky-400' },
  ecommerce:   { label: 'E-Commerce',          icon: '🛒', color: 'text-fuchsia-400' },
  cms:         { label: 'CMS & Website',       icon: '🌍', color: 'text-rose-400' },
  support:     { label: 'Support & Helpdesk',  icon: '🎧', color: 'text-pink-400' },
  scheduling:  { label: 'Scheduling & Video',  icon: '📅', color: 'text-sky-400' },
  marketing:   { label: 'Marketing',           icon: '📣', color: 'text-rose-400' },
  payments:    { label: 'Payments',            icon: '💳', color: 'text-lime-400' },
  analytics:   { label: 'Analytics',           icon: '📊', color: 'text-rose-400' },
  design:      { label: 'Design',             icon: '🎨', color: 'text-fuchsia-400' },
  utilities:   { label: 'Utilities',           icon: '🛠️', color: 'text-gray-400' },
};

// ─────────────────────────────────────────
//  NODE DEFINITIONS
// ─────────────────────────────────────────

export const nodeCatalog: NodeDefinition[] = [

  // ━━━ TRIGGERS ━━━
  {
    type: 'trigger_webhook',
    label: 'Webhook Trigger',
    description: 'Starts workflow when a webhook is received',
    category: 'triggers',
    icon: '🔗',
    color: 'text-yellow-400',
    configSchema: {
      method: { type: 'select', label: 'Method', default: 'POST', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      path: { type: 'string', label: 'Path', default: '/webhook', placeholder: '/my-hook' },
    },
  },
  {
    type: 'trigger_cron',
    label: 'Schedule (Cron)',
    description: 'Trigger on a recurring schedule',
    category: 'triggers',
    icon: '⏰',
    color: 'text-yellow-400',
    configSchema: {
      expression: { type: 'string', label: 'Cron Expression', default: '0 */5 * * *', placeholder: '0 */5 * * *' },
      timezone: { type: 'string', label: 'Timezone', default: 'UTC' },
    },
  },
  {
    type: 'trigger_email',
    label: 'Email Trigger',
    description: 'Trigger when a new email arrives',
    category: 'triggers',
    icon: '📩',
    color: 'text-yellow-400',
    configSchema: {
      mailbox: { type: 'string', label: 'Mailbox', default: 'INBOX' },
      filter: { type: 'string', label: 'Subject Filter', default: '', placeholder: 'Invoice*' },
    },
  },
  {
    type: 'trigger_manual',
    label: 'Manual Trigger',
    description: 'Start workflow manually with a button click',
    category: 'triggers',
    icon: '👆',
    color: 'text-yellow-400',
    configSchema: {},
  },

  // ━━━ GOOGLE ━━━
  {
    type: 'google_sheets_read',
    label: 'Google Sheets – Read',
    description: 'Read rows from a Google Spreadsheet',
    category: 'google',
    icon: '📊',
    color: 'text-green-500',
    configSchema: {
      spreadsheetId: { type: 'string', label: 'Spreadsheet ID', default: '', required: true },
      range: { type: 'string', label: 'Range', default: 'Sheet1!A1:Z100', placeholder: 'Sheet1!A1:Z100' },
    },
  },
  {
    type: 'google_sheets_write',
    label: 'Google Sheets – Write',
    description: 'Append or update rows in Google Sheets',
    category: 'google',
    icon: '📝',
    color: 'text-green-500',
    configSchema: {
      spreadsheetId: { type: 'string', label: 'Spreadsheet ID', default: '', required: true },
      range: { type: 'string', label: 'Range', default: 'Sheet1!A1', placeholder: 'Sheet1!A1' },
      mode: { type: 'select', label: 'Mode', default: 'append', options: ['append', 'update', 'overwrite'] },
      data: { type: 'json', label: 'Data (JSON)', default: '[]' },
    },
  },
  {
    type: 'google_gmail_send',
    label: 'Gmail – Send Email',
    description: 'Send an email via Gmail API',
    category: 'google',
    icon: '✉️',
    color: 'text-red-500',
    configSchema: {
      to: { type: 'string', label: 'To', default: '', placeholder: 'user@example.com' },
      subject: { type: 'string', label: 'Subject', default: '' },
      body: { type: 'code', label: 'Body (HTML)', default: '<p>Hello!</p>' },
    },
  },
  {
    type: 'google_gmail_read',
    label: 'Gmail – Read Emails',
    description: 'Read emails from Gmail inbox',
    category: 'google',
    icon: '📬',
    color: 'text-red-500',
    configSchema: {
      query: { type: 'string', label: 'Search Query', default: 'is:unread', placeholder: 'is:unread from:boss' },
      maxResults: { type: 'number', label: 'Max Results', default: 10 },
    },
  },
  {
    type: 'google_drive_upload',
    label: 'Google Drive – Upload',
    description: 'Upload a file to Google Drive',
    category: 'google',
    icon: '📤',
    color: 'text-blue-400',
    configSchema: {
      folderId: { type: 'string', label: 'Folder ID', default: '' },
      fileName: { type: 'string', label: 'File Name', default: 'output.pdf' },
    },
  },
  {
    type: 'google_drive_list',
    label: 'Google Drive – List Files',
    description: 'List files in a Google Drive folder',
    category: 'google',
    icon: '📂',
    color: 'text-blue-400',
    configSchema: {
      folderId: { type: 'string', label: 'Folder ID', default: 'root' },
      query: { type: 'string', label: 'Search Query', default: '' },
    },
  },
  {
    type: 'google_calendar_create',
    label: 'Google Calendar – Create Event',
    description: 'Create a new calendar event',
    category: 'google',
    icon: '📅',
    color: 'text-blue-500',
    configSchema: {
      summary: { type: 'string', label: 'Title', default: '', required: true },
      startTime: { type: 'string', label: 'Start (ISO)', default: '', placeholder: '2026-01-01T10:00:00Z' },
      endTime: { type: 'string', label: 'End (ISO)', default: '', placeholder: '2026-01-01T11:00:00Z' },
      attendees: { type: 'string', label: 'Attendees (comma-sep)', default: '' },
    },
  },
  {
    type: 'google_translate',
    label: 'Google Translate',
    description: 'Translate text between languages',
    category: 'google',
    icon: '🌍',
    color: 'text-blue-300',
    configSchema: {
      text: { type: 'string', label: 'Text', default: '' },
      from: { type: 'string', label: 'From Language', default: 'auto' },
      to: { type: 'string', label: 'To Language', default: 'en' },
    },
  },
  {
    type: 'google_vision',
    label: 'Google Vision AI',
    description: 'Analyze images with Google Cloud Vision',
    category: 'google',
    icon: '👁️',
    color: 'text-blue-400',
    configSchema: {
      imageUrl: { type: 'string', label: 'Image URL', default: '' },
      features: { type: 'select', label: 'Feature', default: 'LABEL_DETECTION', options: ['LABEL_DETECTION', 'TEXT_DETECTION', 'FACE_DETECTION', 'OBJECT_LOCALIZATION', 'SAFE_SEARCH'] },
    },
  },
  {
    type: 'google_maps_geocode',
    label: 'Google Maps – Geocode',
    description: 'Convert address to coordinates',
    category: 'google',
    icon: '📍',
    color: 'text-green-400',
    configSchema: {
      address: { type: 'string', label: 'Address', default: '', placeholder: '1600 Amphitheatre Parkway' },
    },
  },
  {
    type: 'youtube_search',
    label: 'YouTube – Search',
    description: 'Search YouTube videos',
    category: 'google',
    icon: '▶️',
    color: 'text-red-500',
    configSchema: {
      query: { type: 'string', label: 'Search Query', default: '' },
      maxResults: { type: 'number', label: 'Max Results', default: 5 },
    },
  },

  // ━━━ AI & ML ━━━
  {
    type: 'openai_chat',
    label: 'OpenAI – Chat Completion',
    description: 'Generate text with GPT models',
    category: 'ai',
    icon: '🤖',
    color: 'text-emerald-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'gpt-4', options: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'] },
      prompt: { type: 'code', label: 'System Prompt', default: 'You are a helpful assistant.' },
      userMessage: { type: 'code', label: 'User Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
      maxTokens: { type: 'number', label: 'Max Tokens', default: 1024 },
    },
  },
  {
    type: 'openai_image',
    label: 'OpenAI – DALL·E',
    description: 'Generate images with DALL·E',
    category: 'ai',
    icon: '🎨',
    color: 'text-emerald-400',
    configSchema: {
      prompt: { type: 'code', label: 'Image Prompt', default: '' },
      size: { type: 'select', label: 'Size', default: '1024x1024', options: ['256x256', '512x512', '1024x1024', '1792x1024'] },
      model: { type: 'select', label: 'Model', default: 'dall-e-3', options: ['dall-e-2', 'dall-e-3'] },
    },
  },
  {
    type: 'anthropic_chat',
    label: 'Anthropic – Claude',
    description: 'Generate text with Claude models',
    category: 'ai',
    icon: '🧬',
    color: 'text-orange-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'claude-sonnet-4-20250514', options: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-haiku-20240307'] },
      systemPrompt: { type: 'code', label: 'System Prompt', default: '' },
      message: { type: 'code', label: 'Message', default: '' },
      maxTokens: { type: 'number', label: 'Max Tokens', default: 1024 },
    },
  },
  {
    type: 'huggingface_inference',
    label: 'Hugging Face – Inference',
    description: 'Run ML models via Hugging Face API',
    category: 'ai',
    icon: '🤗',
    color: 'text-yellow-500',
    configSchema: {
      model: { type: 'string', label: 'Model ID', default: 'facebook/bart-large-mnli', placeholder: 'org/model-name' },
      inputs: { type: 'code', label: 'Input', default: '' },
    },
  },
  {
    type: 'ai_text_classifier',
    label: 'Text Classifier',
    description: 'Classify text into categories using AI',
    category: 'ai',
    icon: '🏷️',
    color: 'text-rose-400',
    configSchema: {
      text: { type: 'string', label: 'Text Input', default: '' },
      categories: { type: 'string', label: 'Categories (comma-sep)', default: 'positive,negative,neutral' },
    },
  },
  {
    type: 'ai_summarizer',
    label: 'Text Summarizer',
    description: 'Summarize long text with AI',
    category: 'ai',
    icon: '📋',
    color: 'text-rose-400',
    configSchema: {
      text: { type: 'code', label: 'Text to Summarize', default: '' },
      maxLength: { type: 'number', label: 'Max Length (words)', default: 100 },
    },
  },
  {
    type: 'whisper_transcribe',
    label: 'Whisper – Transcribe Audio',
    description: 'Transcribe audio to text using OpenAI Whisper',
    category: 'ai',
    icon: '🎤',
    color: 'text-emerald-400',
    configSchema: {
      audioUrl: { type: 'string', label: 'Audio URL', default: '' },
      language: { type: 'string', label: 'Language', default: 'en' },
    },
  },

  // ━━━ SOCIAL MEDIA ━━━
  {
    type: 'twitter_post',
    label: 'X (Twitter) – Post',
    description: 'Post a tweet to X/Twitter',
    category: 'social',
    icon: '🐦',
    color: 'text-blue-400',
    configSchema: {
      text: { type: 'code', label: 'Tweet Text', default: '' },
    },
  },
  {
    type: 'twitter_search',
    label: 'X (Twitter) – Search',
    description: 'Search tweets on X/Twitter',
    category: 'social',
    icon: '🔎',
    color: 'text-blue-400',
    configSchema: {
      query: { type: 'string', label: 'Search Query', default: '' },
      count: { type: 'number', label: 'Count', default: 10 },
    },
  },
  {
    type: 'instagram_post',
    label: 'Instagram – Post',
    description: 'Publish a post to Instagram',
    category: 'social',
    icon: '📸',
    color: 'text-pink-500',
    configSchema: {
      imageUrl: { type: 'string', label: 'Image URL', default: '' },
      caption: { type: 'code', label: 'Caption', default: '' },
    },
  },
  {
    type: 'linkedin_post',
    label: 'LinkedIn – Post',
    description: 'Share a post on LinkedIn',
    category: 'social',
    icon: '💼',
    color: 'text-blue-600',
    configSchema: {
      text: { type: 'code', label: 'Post Text', default: '' },
      visibility: { type: 'select', label: 'Visibility', default: 'public', options: ['public', 'connections'] },
    },
  },
  {
    type: 'reddit_post',
    label: 'Reddit – Submit Post',
    description: 'Submit a post to a subreddit',
    category: 'social',
    icon: '🔴',
    color: 'text-orange-500',
    configSchema: {
      subreddit: { type: 'string', label: 'Subreddit', default: '', placeholder: 'AskReddit' },
      title: { type: 'string', label: 'Title', default: '' },
      body: { type: 'code', label: 'Body', default: '' },
    },
  },

  // ━━━ MESSAGING ━━━
  {
    type: 'slack_message',
    label: 'Slack – Send Message',
    description: 'Send a message to a Slack channel',
    category: 'messaging',
    icon: '💬',
    color: 'text-rose-400',
    configSchema: {
      channel: { type: 'string', label: 'Channel', default: '#general' },
      text: { type: 'code', label: 'Message', default: '' },
    },
  },
  {
    type: 'discord_message',
    label: 'Discord – Send Message',
    description: 'Send a message via Discord webhook',
    category: 'messaging',
    icon: '🎮',
    color: 'text-indigo-400',
    configSchema: {
      webhookUrl: { type: 'string', label: 'Webhook URL', default: '', required: true },
      content: { type: 'code', label: 'Message', default: '' },
      username: { type: 'string', label: 'Username Override', default: 'Flowa Bot' },
    },
  },
  {
    type: 'telegram_send',
    label: 'Telegram – Send Message',
    description: 'Send a message via Telegram Bot',
    category: 'messaging',
    icon: '✈️',
    color: 'text-blue-400',
    configSchema: {
      botToken: { type: 'string', label: 'Bot Token', default: '' },
      chatId: { type: 'string', label: 'Chat ID', default: '' },
      text: { type: 'code', label: 'Message', default: '' },
    },
  },
  {
    type: 'whatsapp_send',
    label: 'WhatsApp – Send Message',
    description: 'Send a message via WhatsApp Business API',
    category: 'messaging',
    icon: '📱',
    color: 'text-green-500',
    configSchema: {
      to: { type: 'string', label: 'Phone Number', default: '', placeholder: '+1234567890' },
      message: { type: 'code', label: 'Message', default: '' },
    },
  },
  {
    type: 'email_send',
    label: 'SMTP – Send Email',
    description: 'Send email via SMTP server',
    category: 'messaging',
    icon: '📧',
    color: 'text-amber-400',
    configSchema: {
      host: { type: 'string', label: 'SMTP Host', default: 'smtp.gmail.com' },
      port: { type: 'number', label: 'Port', default: 587 },
      to: { type: 'string', label: 'To', default: '' },
      subject: { type: 'string', label: 'Subject', default: '' },
      body: { type: 'code', label: 'Body (HTML)', default: '' },
    },
  },
  {
    type: 'twilio_sms',
    label: 'Twilio – Send SMS',
    description: 'Send an SMS message via Twilio',
    category: 'messaging',
    icon: '📲',
    color: 'text-red-400',
    configSchema: {
      to: { type: 'string', label: 'To (E.164)', default: '', placeholder: '+923001234567', required: true },
      from: { type: 'string', label: 'From (your Twilio number)', default: '', placeholder: '+14155238886', required: true },
      message: { type: 'code', label: 'Message', default: '' },
    },
  },
  {
    type: 'twilio_whatsapp',
    label: 'Twilio – Send WhatsApp',
    description: 'Send a WhatsApp message via Twilio',
    category: 'messaging',
    icon: '🟢',
    color: 'text-green-400',
    configSchema: {
      to: { type: 'string', label: 'To', default: '', placeholder: 'whatsapp:+923001234567', required: true },
      from: { type: 'string', label: 'From (sandbox or business)', default: 'whatsapp:+14155238886', placeholder: 'whatsapp:+14155238886', required: true },
      message: { type: 'code', label: 'Message', default: '' },
    },
  },

  // ━━━ DATABASES ━━━
  {
    type: 'postgres_query',
    label: 'PostgreSQL – Query',
    description: 'Execute SQL query on PostgreSQL',
    category: 'databases',
    icon: '🐘',
    color: 'text-blue-400',
    configSchema: {
      connectionString: { type: 'string', label: 'Connection String', default: '', placeholder: 'postgresql://user:pass@host/db' },
      query: { type: 'code', label: 'SQL Query', default: 'SELECT * FROM users LIMIT 10;' },
    },
  },
  {
    type: 'mysql_query',
    label: 'MySQL – Query',
    description: 'Execute SQL query on MySQL',
    category: 'databases',
    icon: '🐬',
    color: 'text-blue-500',
    configSchema: {
      host: { type: 'string', label: 'Host', default: 'localhost' },
      database: { type: 'string', label: 'Database', default: '' },
      query: { type: 'code', label: 'SQL Query', default: '' },
    },
  },
  {
    type: 'mongodb_find',
    label: 'MongoDB – Find',
    description: 'Query documents from MongoDB',
    category: 'databases',
    icon: '🍃',
    color: 'text-green-500',
    configSchema: {
      uri: { type: 'string', label: 'Connection URI', default: '', placeholder: 'mongodb://...' },
      collection: { type: 'string', label: 'Collection', default: '' },
      filter: { type: 'json', label: 'Filter (JSON)', default: '{}' },
    },
  },
  {
    type: 'redis_command',
    label: 'Redis – Command',
    description: 'Execute a Redis command',
    category: 'databases',
    icon: '⚡',
    color: 'text-red-500',
    configSchema: {
      url: { type: 'string', label: 'Redis URL', default: 'redis://localhost:6379' },
      command: { type: 'string', label: 'Command', default: 'GET', placeholder: 'GET / SET / HGET ...' },
      args: { type: 'string', label: 'Args (comma-sep)', default: '' },
    },
  },
  {
    type: 'firebase_read',
    label: 'Firebase – Read',
    description: 'Read data from Firebase Realtime DB',
    category: 'databases',
    icon: '🔥',
    color: 'text-amber-500',
    configSchema: {
      path: { type: 'string', label: 'Path', default: '/users', placeholder: '/collection/document' },
    },
  },
  {
    type: 'supabase_query',
    label: 'Supabase – Query',
    description: 'Query data from Supabase',
    category: 'databases',
    icon: '⚡',
    color: 'text-emerald-400',
    configSchema: {
      table: { type: 'string', label: 'Table', default: '' },
      select: { type: 'string', label: 'Select Columns', default: '*' },
      filter: { type: 'json', label: 'Filters (JSON)', default: '{}' },
    },
  },

  // ━━━ CLOUD & DEVOPS ━━━
  {
    type: 'aws_s3_upload',
    label: 'AWS S3 – Upload',
    description: 'Upload file to Amazon S3',
    category: 'cloud',
    icon: '☁️',
    color: 'text-orange-400',
    configSchema: {
      bucket: { type: 'string', label: 'Bucket', default: '' },
      key: { type: 'string', label: 'Object Key', default: '' },
      region: { type: 'string', label: 'Region', default: 'us-east-1' },
    },
  },
  {
    type: 'aws_lambda_invoke',
    label: 'AWS Lambda – Invoke',
    description: 'Invoke an AWS Lambda function',
    category: 'cloud',
    icon: 'λ',
    color: 'text-orange-400',
    configSchema: {
      functionName: { type: 'string', label: 'Function Name', default: '' },
      payload: { type: 'json', label: 'Payload', default: '{}' },
      region: { type: 'string', label: 'Region', default: 'us-east-1' },
    },
  },
  {
    type: 'github_create_issue',
    label: 'GitHub – Create Issue',
    description: 'Create an issue on a GitHub repo',
    category: 'cloud',
    icon: '🐙',
    color: 'text-gray-300',
    configSchema: {
      owner: { type: 'string', label: 'Owner', default: '' },
      repo: { type: 'string', label: 'Repo', default: '' },
      title: { type: 'string', label: 'Title', default: '' },
      body: { type: 'code', label: 'Body', default: '' },
    },
  },
  {
    type: 'github_pr',
    label: 'GitHub – List PRs',
    description: 'List pull requests from a GitHub repo',
    category: 'cloud',
    icon: '🔃',
    color: 'text-gray-300',
    configSchema: {
      owner: { type: 'string', label: 'Owner', default: '' },
      repo: { type: 'string', label: 'Repo', default: '' },
      state: { type: 'select', label: 'State', default: 'open', options: ['open', 'closed', 'all'] },
    },
  },
  {
    type: 'docker_run',
    label: 'Docker – Run Container',
    description: 'Run a Docker container',
    category: 'cloud',
    icon: '🐳',
    color: 'text-blue-400',
    configSchema: {
      image: { type: 'string', label: 'Image', default: '', placeholder: 'node:18-alpine' },
      command: { type: 'string', label: 'Command', default: '' },
      env: { type: 'json', label: 'Env Vars (JSON)', default: '{}' },
    },
  },
  {
    type: 'vercel_deploy',
    label: 'Vercel – Trigger Deploy',
    description: 'Trigger a deployment on Vercel',
    category: 'cloud',
    icon: '▲',
    color: 'text-white',
    configSchema: {
      hookUrl: { type: 'string', label: 'Deploy Hook URL', default: '' },
    },
  },

  // ━━━ HTTP & APIS ━━━
  {
    type: 'http_request',
    label: 'HTTP Request',
    description: 'Make any HTTP request with full auth, headers, body & options',
    category: 'http',
    icon: '🌐',
    color: 'text-indigo-400',
    configSchema: {
      method: { type: 'select', label: 'Method', default: 'GET', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'] },
      url: { type: 'string', label: 'URL', default: '', placeholder: 'https://api.example.com/data', required: true },
      parameters: { type: 'json', label: 'Query Parameters (JSON)', default: '{}', placeholder: '{"page": 1, "limit": 20}' },
      headers: { type: 'json', label: 'Headers (JSON)', default: '{}', placeholder: '{"Content-Type": "application/json"}' },
      dynamicHeaders: { type: 'json', label: 'Dynamic Headers (key/value pairs)', default: '[]' },
      body: { type: 'code', label: 'Body', default: '', placeholder: '{"key": "value"}' },
      bodyType: { type: 'select', label: 'Body Type', default: 'auto', options: ['auto', 'json', 'form', 'raw', 'xml'] },
      authType: { type: 'select', label: 'Auth Type', default: 'none', options: ['none', 'basic', 'bearer', 'api_key', 'oauth2', 'custom'] },
      basicAuthUsername: { type: 'string', label: 'Username', default: '' },
      basicAuthPassword: { type: 'string', label: 'Password', default: '' },
      bearerToken: { type: 'string', label: 'Bearer Token', default: '' },
      apiKeyName: { type: 'string', label: 'API Key Name', default: '', placeholder: 'X-API-Key' },
      apiKeyValue: { type: 'string', label: 'API Key Value', default: '' },
      timeout: { type: 'number', label: 'Timeout (seconds)', default: 30 },
      followRedirects: { type: 'boolean', label: 'Follow Redirects', default: true },
      maxRedirects: { type: 'number', label: 'Max Redirects', default: 5 },
      responseType: { type: 'select', label: 'Response Type', default: 'auto', options: ['auto', 'json', 'text', 'arraybuffer', 'blob', 'stream'] },
      returnFullResponse: { type: 'boolean', label: 'Return Full Response', default: false },
      verifySSL: { type: 'boolean', label: 'Verify SSL Certificate', default: true },
      useProxy: { type: 'boolean', label: 'Use Proxy', default: false },
      proxyUrl: { type: 'string', label: 'Proxy URL', default: '', placeholder: 'http://proxy.example.com:8080' },
    },
  },
  {
    type: 'graphql_query',
    label: 'GraphQL Query',
    description: 'Execute a GraphQL query or mutation',
    category: 'http',
    icon: '◼️',
    color: 'text-pink-400',
    configSchema: {
      endpoint: { type: 'string', label: 'Endpoint URL', default: '' },
      query: { type: 'code', label: 'Query', default: 'query { ... }' },
      variables: { type: 'json', label: 'Variables', default: '{}' },
    },
  },
  {
    type: 'rest_api_poll',
    label: 'REST API – Poll',
    description: 'Periodically poll a REST endpoint',
    category: 'http',
    icon: '🔄',
    color: 'text-indigo-400',
    configSchema: {
      url: { type: 'string', label: 'URL', default: '' },
      interval: { type: 'number', label: 'Interval (seconds)', default: 60 },
      method: { type: 'select', label: 'Method', default: 'GET', options: ['GET', 'POST'] },
    },
  },
  {
    type: 'soap_request',
    label: 'SOAP Request',
    description: 'Make a SOAP/XML web service call',
    category: 'http',
    icon: '📦',
    color: 'text-indigo-400',
    configSchema: {
      wsdlUrl: { type: 'string', label: 'WSDL URL', default: '' },
      operation: { type: 'string', label: 'Operation', default: '' },
      body: { type: 'code', label: 'XML Body', default: '' },
    },
  },

  // ━━━ FILES & STORAGE ━━━
  {
    type: 'file_read',
    label: 'Read File',
    description: 'Read contents of a local file',
    category: 'files',
    icon: '📖',
    color: 'text-amber-400',
    configSchema: {
      path: { type: 'string', label: 'File Path', default: '' },
      encoding: { type: 'select', label: 'Encoding', default: 'utf-8', options: ['utf-8', 'base64', 'binary'] },
    },
  },
  {
    type: 'file_write',
    label: 'Write File',
    description: 'Write contents to a file',
    category: 'files',
    icon: '✍️',
    color: 'text-amber-400',
    configSchema: {
      path: { type: 'string', label: 'File Path', default: '' },
      content: { type: 'code', label: 'Content', default: '' },
      mode: { type: 'select', label: 'Mode', default: 'overwrite', options: ['overwrite', 'append'] },
    },
  },
  {
    type: 'csv_parse',
    label: 'CSV Parser',
    description: 'Parse CSV text into JSON objects',
    category: 'files',
    icon: '📑',
    color: 'text-amber-400',
    configSchema: {
      delimiter: { type: 'string', label: 'Delimiter', default: ',' },
      hasHeader: { type: 'boolean', label: 'Has Header Row', default: true },
    },
  },
  {
    type: 'pdf_extract',
    label: 'PDF – Extract Text',
    description: 'Extract text content from a PDF file',
    category: 'files',
    icon: '📄',
    color: 'text-red-400',
    configSchema: {
      fileUrl: { type: 'string', label: 'PDF URL', default: '' },
      pages: { type: 'string', label: 'Pages (e.g. 1-5)', default: 'all' },
    },
  },
  {
    type: 'ftp_upload',
    label: 'FTP – Upload',
    description: 'Upload file to FTP/SFTP server',
    category: 'files',
    icon: '📡',
    color: 'text-amber-400',
    configSchema: {
      host: { type: 'string', label: 'Host', default: '' },
      port: { type: 'number', label: 'Port', default: 22 },
      remotePath: { type: 'string', label: 'Remote Path', default: '/' },
    },
  },

  // ━━━ DATA TRANSFORM ━━━
  {
    type: 'transform_map',
    label: 'Map / Transform',
    description: 'Transform data using a mapping expression',
    category: 'transform',
    icon: '🔄',
    color: 'text-teal-400',
    configSchema: {
      expression: { type: 'code', label: 'JS Expression', default: 'return data.map(item => item);' },
    },
  },
  {
    type: 'transform_filter',
    label: 'Filter',
    description: 'Filter data based on a condition',
    category: 'transform',
    icon: '🔍',
    color: 'text-teal-400',
    configSchema: {
      condition: { type: 'code', label: 'Condition (JS)', default: 'return item.active === true;' },
    },
  },
  {
    type: 'transform_aggregate',
    label: 'Aggregate',
    description: 'Aggregate data (sum, count, avg, etc.)',
    category: 'transform',
    icon: '📊',
    color: 'text-teal-400',
    configSchema: {
      operation: { type: 'select', label: 'Operation', default: 'count', options: ['count', 'sum', 'avg', 'min', 'max', 'group'] },
      field: { type: 'string', label: 'Field', default: '' },
    },
  },
  {
    type: 'transform_merge',
    label: 'Merge / Join',
    description: 'Merge two data streams together',
    category: 'transform',
    icon: '🔗',
    color: 'text-teal-400',
    configSchema: {
      joinKey: { type: 'string', label: 'Join Key', default: 'id' },
      strategy: { type: 'select', label: 'Strategy', default: 'inner', options: ['inner', 'left', 'right', 'outer'] },
    },
  },
  {
    type: 'json_parse',
    label: 'JSON Parse',
    description: 'Parse JSON string into an object',
    category: 'transform',
    icon: '{ }',
    color: 'text-teal-400',
    configSchema: {
      path: { type: 'string', label: 'JSON Path', default: '$.data', placeholder: '$.results[0].name' },
    },
  },
  {
    type: 'xml_parse',
    label: 'XML Parse',
    description: 'Parse XML into JSON',
    category: 'transform',
    icon: '📰',
    color: 'text-teal-400',
    configSchema: {},
  },
  {
    type: 'code_javascript',
    label: 'JavaScript Code',
    description: 'Run custom JavaScript code',
    category: 'transform',
    icon: '🟨',
    color: 'text-yellow-300',
    configSchema: {
      code: { type: 'code', label: 'Code', default: '// Access input via `data`\nreturn data;' },
    },
  },
  {
    type: 'code_python',
    label: 'Python Code',
    description: 'Run custom Python code',
    category: 'transform',
    icon: '🐍',
    color: 'text-blue-300',
    configSchema: {
      code: { type: 'code', label: 'Code', default: '# Access input via `data`\nresult = data' },
    },
  },

  // ━━━ LOGIC & FLOW ━━━
  {
    type: 'logic_if',
    label: 'If / Condition',
    description: 'Branch based on a condition',
    category: 'logic',
    icon: '🔀',
    color: 'text-slate-400',
    configSchema: {
      condition: { type: 'code', label: 'Condition (JS)', default: 'return data.value > 10;' },
    },
  },
  {
    type: 'logic_switch',
    label: 'Switch / Router',
    description: 'Route to different branches based on value',
    category: 'logic',
    icon: '🔃',
    color: 'text-slate-400',
    configSchema: {
      field: { type: 'string', label: 'Field', default: 'status' },
      cases: { type: 'json', label: 'Cases (JSON)', default: '{"active": "branch1", "inactive": "branch2"}' },
    },
  },
  {
    type: 'logic_loop',
    label: 'Loop / For Each',
    description: 'Iterate over a list of items',
    category: 'logic',
    icon: '🔁',
    color: 'text-slate-400',
    configSchema: {
      field: { type: 'string', label: 'Array Field', default: 'items' },
    },
  },
  {
    type: 'logic_delay',
    label: 'Delay / Wait',
    description: 'Pause execution for a specified time',
    category: 'logic',
    icon: '⏳',
    color: 'text-slate-400',
    configSchema: {
      duration: { type: 'number', label: 'Duration (ms)', default: 1000 },
    },
  },
  {
    type: 'logic_retry',
    label: 'Retry',
    description: 'Retry a failed operation',
    category: 'logic',
    icon: '🔄',
    color: 'text-slate-400',
    configSchema: {
      maxRetries: { type: 'number', label: 'Max Retries', default: 3 },
      delay: { type: 'number', label: 'Retry Delay (ms)', default: 1000 },
      backoff: { type: 'select', label: 'Backoff', default: 'exponential', options: ['fixed', 'linear', 'exponential'] },
    },
  },
  {
    type: 'logic_parallel',
    label: 'Parallel',
    description: 'Run multiple branches in parallel',
    category: 'logic',
    icon: '⚡',
    color: 'text-slate-400',
    configSchema: {
      concurrency: { type: 'number', label: 'Max Concurrency', default: 5 },
    },
  },
  {
    type: 'error_handler',
    label: 'Error Handler',
    description: 'Catch and handle errors in the workflow',
    category: 'logic',
    icon: '🛡️',
    color: 'text-red-400',
    configSchema: {
      action: { type: 'select', label: 'On Error', default: 'continue', options: ['continue', 'stop', 'retry', 'fallback'] },
      fallback: { type: 'code', label: 'Fallback Value', default: 'null' },
    },
  },

  // ━━━ CRM & SALES ━━━
  {
    type: 'salesforce_query',
    label: 'Salesforce – SOQL Query',
    description: 'Query Salesforce records with SOQL',
    category: 'crm',
    icon: '☁️',
    color: 'text-blue-500',
    configSchema: {
      query: { type: 'code', label: 'SOQL Query', default: 'SELECT Id, Name FROM Account LIMIT 10' },
    },
  },
  {
    type: 'hubspot_contact',
    label: 'HubSpot – Create Contact',
    description: 'Create or update a HubSpot contact',
    category: 'crm',
    icon: '🟠',
    color: 'text-orange-400',
    configSchema: {
      action: { type: 'select', label: 'Action', default: 'upsert', options: ['upsert', 'create', 'update', 'get'] },
      email: { type: 'string', label: 'Email', default: '' },
      firstName: { type: 'string', label: 'First Name', default: '' },
      lastName: { type: 'string', label: 'Last Name', default: '' },
      contactId: { type: 'string', label: 'Contact ID', default: '' },
      properties: { type: 'json', label: 'Extra Properties', default: '{}' },
      returnProperties: { type: 'string', label: 'Return Properties', default: 'email,firstname,lastname,phone,company,website,lifecyclestage' },
    },
  },
  {
    type: 'airtable_list',
    label: 'Airtable – List Records',
    description: 'List records from an Airtable base',
    category: 'crm',
    icon: '📋',
    color: 'text-blue-400',
    configSchema: {
      baseId: { type: 'string', label: 'Base ID', default: '' },
      table: { type: 'string', label: 'Table Name', default: '' },
      view: { type: 'string', label: 'View', default: 'Grid view' },
    },
  },
  {
    type: 'notion_query',
    label: 'Notion – Query Database',
    description: 'Query pages from a Notion database',
    category: 'crm',
    icon: '📓',
    color: 'text-gray-300',
    configSchema: {
      databaseId: { type: 'string', label: 'Database ID', default: '' },
      filter: { type: 'json', label: 'Filter (JSON)', default: '{}' },
    },
  },

  // ━━━ PAYMENTS ━━━
  {
    type: 'stripe_charge',
    label: 'Stripe – Create Charge',
    description: 'Create a payment charge via Stripe',
    category: 'payments',
    icon: '💳',
    color: 'text-rose-400',
    configSchema: {
      amount: { type: 'number', label: 'Amount (cents)', default: 0 },
      currency: { type: 'string', label: 'Currency', default: 'usd' },
      customerId: { type: 'string', label: 'Customer ID', default: '' },
    },
  },
  {
    type: 'stripe_customer',
    label: 'Stripe – Get Customer',
    description: 'Retrieve a Stripe customer',
    category: 'payments',
    icon: '👤',
    color: 'text-rose-400',
    configSchema: {
      customerId: { type: 'string', label: 'Customer ID', default: '' },
    },
  },
  {
    type: 'paypal_payment',
    label: 'PayPal – Create Payment',
    description: 'Create a payment via PayPal',
    category: 'payments',
    icon: '💰',
    color: 'text-blue-500',
    configSchema: {
      amount: { type: 'number', label: 'Amount', default: 0 },
      currency: { type: 'string', label: 'Currency', default: 'USD' },
      description: { type: 'string', label: 'Description', default: '' },
    },
  },

  // ━━━ ANALYTICS ━━━
  {
    type: 'google_analytics',
    label: 'Google Analytics – Report',
    description: 'Fetch reports from Google Analytics',
    category: 'analytics',
    icon: '📈',
    color: 'text-yellow-400',
    configSchema: {
      propertyId: { type: 'string', label: 'Property ID', default: '' },
      startDate: { type: 'string', label: 'Start Date', default: '7daysAgo' },
      endDate: { type: 'string', label: 'End Date', default: 'today' },
      metrics: { type: 'string', label: 'Metrics', default: 'sessions,pageviews' },
    },
  },
  {
    type: 'mixpanel_track',
    label: 'Mixpanel – Track Event',
    description: 'Send tracking event to Mixpanel',
    category: 'analytics',
    icon: '📊',
    color: 'text-rose-500',
    configSchema: {
      event: { type: 'string', label: 'Event Name', default: '' },
      properties: { type: 'json', label: 'Properties', default: '{}' },
    },
  },
  {
    type: 'segment_track',
    label: 'Segment – Track',
    description: 'Send events to Segment',
    category: 'analytics',
    icon: '📡',
    color: 'text-green-400',
    configSchema: {
      event: { type: 'string', label: 'Event Name', default: '' },
      userId: { type: 'string', label: 'User ID', default: '' },
      properties: { type: 'json', label: 'Properties', default: '{}' },
    },
  },

  // ━━━ UTILITIES ━━━
  {
    type: 'util_logger',
    label: 'Logger',
    description: 'Log data to the execution output',
    category: 'utilities',
    icon: '📝',
    color: 'text-gray-400',
    configSchema: {
      level: { type: 'select', label: 'Level', default: 'info', options: ['debug', 'info', 'warn', 'error'] },
      message: { type: 'string', label: 'Message', default: '' },
    },
  },
  {
    type: 'util_set_variable',
    label: 'Set Variable',
    description: 'Store a value in a workflow variable',
    category: 'utilities',
    icon: '📌',
    color: 'text-gray-400',
    configSchema: {
      name: { type: 'string', label: 'Variable Name', default: '' },
      value: { type: 'string', label: 'Value', default: '' },
    },
  },
  {
    type: 'util_crypto_hash',
    label: 'Hash / Encrypt',
    description: 'Hash or encrypt data',
    category: 'utilities',
    icon: '🔒',
    color: 'text-gray-400',
    configSchema: {
      algorithm: { type: 'select', label: 'Algorithm', default: 'sha256', options: ['md5', 'sha1', 'sha256', 'sha512', 'bcrypt'] },
      input: { type: 'string', label: 'Input', default: '' },
    },
  },
  {
    type: 'util_date_format',
    label: 'Date Formatter',
    description: 'Format or parse dates',
    category: 'utilities',
    icon: '📆',
    color: 'text-gray-400',
    configSchema: {
      input: { type: 'string', label: 'Date Input', default: 'now', placeholder: 'now / ISO string' },
      format: { type: 'string', label: 'Output Format', default: 'YYYY-MM-DD HH:mm:ss' },
      timezone: { type: 'string', label: 'Timezone', default: 'UTC' },
    },
  },
  {
    type: 'util_uuid',
    label: 'Generate UUID',
    description: 'Generate a unique identifier',
    category: 'utilities',
    icon: '🆔',
    color: 'text-gray-400',
    configSchema: {
      version: { type: 'select', label: 'Version', default: 'v4', options: ['v1', 'v4'] },
    },
  },
  {
    type: 'util_random',
    label: 'Random Number',
    description: 'Generate a random number',
    category: 'utilities',
    icon: '🎲',
    color: 'text-gray-400',
    configSchema: {
      min: { type: 'number', label: 'Min', default: 0 },
      max: { type: 'number', label: 'Max', default: 100 },
    },
  },
  {
    type: 'util_regex',
    label: 'Regex Match',
    description: 'Match or extract text using regex',
    category: 'utilities',
    icon: '🔤',
    color: 'text-gray-400',
    configSchema: {
      pattern: { type: 'string', label: 'Pattern', default: '' },
      flags: { type: 'string', label: 'Flags', default: 'gi' },
      input: { type: 'string', label: 'Input', default: '' },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  NEW NODES — EXPANDED INTEGRATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━ AI & ML (expanded) ━━━
  {
    type: 'gemini_chat',
    label: 'Google Gemini – Chat',
    description: 'Generate text with Google Gemini models',
    category: 'ai',
    icon: '✨',
    color: 'text-blue-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'gemini-2.0-flash', options: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
      systemPrompt: { type: 'code', label: 'System Prompt', default: '' },
      message: { type: 'code', label: 'User Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
      maxTokens: { type: 'number', label: 'Max Output Tokens', default: 2048 },
    },
  },
  {
    type: 'gemini_vision',
    label: 'Google Gemini – Vision',
    description: 'Analyze images with Google Gemini Vision',
    category: 'ai',
    icon: '👁️',
    color: 'text-blue-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'gemini-2.0-flash', options: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
      imageUrl: { type: 'string', label: 'Image URL', default: '' },
      prompt: { type: 'code', label: 'Prompt', default: 'Describe this image in detail.' },
    },
  },
  {
    type: 'perplexity_search',
    label: 'Perplexity AI – Search',
    description: 'AI-powered web search with citations via Perplexity',
    category: 'ai',
    icon: '🔎',
    color: 'text-cyan-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'sonar', options: ['sonar', 'sonar-pro', 'sonar-reasoning'] },
      query: { type: 'code', label: 'Query', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.2 },
    },
  },
  {
    type: 'mistral_chat',
    label: 'Mistral AI – Chat',
    description: 'Generate text with Mistral AI models',
    category: 'ai',
    icon: '🌀',
    color: 'text-orange-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'mistral-large-latest', options: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mixtral-8x22b', 'open-mistral-7b', 'codestral-latest'] },
      systemPrompt: { type: 'code', label: 'System Prompt', default: '' },
      message: { type: 'code', label: 'Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
      maxTokens: { type: 'number', label: 'Max Tokens', default: 1024 },
    },
  },
  {
    type: 'groq_chat',
    label: 'Groq – Chat',
    description: 'Ultra-fast LLM inference via Groq',
    category: 'ai',
    icon: '⚡',
    color: 'text-orange-500',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'llama-3.3-70b-versatile', options: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
      systemPrompt: { type: 'code', label: 'System Prompt', default: '' },
      message: { type: 'code', label: 'Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
      maxTokens: { type: 'number', label: 'Max Tokens', default: 1024 },
    },
  },
  {
    type: 'deepseek_chat',
    label: 'DeepSeek – Chat',
    description: 'Chat with DeepSeek reasoning models',
    category: 'ai',
    icon: '🐋',
    color: 'text-blue-500',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'deepseek-chat', options: ['deepseek-chat', 'deepseek-reasoner'] },
      systemPrompt: { type: 'code', label: 'System Prompt', default: '' },
      message: { type: 'code', label: 'Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
      maxTokens: { type: 'number', label: 'Max Tokens', default: 2048 },
    },
  },
  {
    type: 'ollama_chat',
    label: 'Ollama – Local LLM',
    description: 'Run local LLMs via Ollama',
    category: 'ai',
    icon: '🦙',
    color: 'text-gray-300',
    configSchema: {
      baseUrl: { type: 'string', label: 'Ollama URL', default: 'http://localhost:11434' },
      model: { type: 'string', label: 'Model', default: 'llama3', placeholder: 'llama3 / mistral / phi3' },
      prompt: { type: 'code', label: 'Prompt', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.7 },
    },
  },
  {
    type: 'elevenlabs_tts',
    label: 'ElevenLabs – Text to Speech',
    description: 'Convert text to realistic speech with ElevenLabs',
    category: 'ai',
    icon: '🔊',
    color: 'text-emerald-400',
    configSchema: {
      voiceId: { type: 'string', label: 'Voice ID', default: '', placeholder: 'pNInz6obpgDQGcFmaJgB' },
      text: { type: 'code', label: 'Text', default: '' },
      model: { type: 'select', label: 'Model', default: 'eleven_multilingual_v2', options: ['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_monolingual_v1'] },
      stability: { type: 'number', label: 'Stability', default: 0.5 },
      similarity: { type: 'number', label: 'Similarity Boost', default: 0.75 },
    },
  },
  {
    type: 'replicate_run',
    label: 'Replicate – Run Model',
    description: 'Run any ML model on Replicate',
    category: 'ai',
    icon: '🧪',
    color: 'text-blue-400',
    configSchema: {
      model: { type: 'string', label: 'Model', default: '', placeholder: 'stability-ai/sdxl:latest' },
      input: { type: 'json', label: 'Input (JSON)', default: '{}' },
    },
  },
  {
    type: 'openai_embeddings',
    label: 'OpenAI – Embeddings',
    description: 'Generate text embeddings with OpenAI',
    category: 'ai',
    icon: '📐',
    color: 'text-emerald-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'text-embedding-3-small', options: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'] },
      input: { type: 'code', label: 'Input Text', default: '' },
    },
  },
  {
    type: 'openai_tts',
    label: 'OpenAI – Text to Speech',
    description: 'Generate speech from text with OpenAI TTS',
    category: 'ai',
    icon: '🗣️',
    color: 'text-emerald-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'tts-1', options: ['tts-1', 'tts-1-hd'] },
      voice: { type: 'select', label: 'Voice', default: 'alloy', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
      input: { type: 'code', label: 'Text', default: '' },
    },
  },
  {
    type: 'langchain_chain',
    label: 'LangChain – Chain',
    description: 'Run a LangChain chain or agent',
    category: 'ai',
    icon: '🔗',
    color: 'text-green-400',
    configSchema: {
      chainType: { type: 'select', label: 'Chain Type', default: 'llm', options: ['llm', 'sequential', 'router', 'retrieval_qa', 'summarize'] },
      config: { type: 'json', label: 'Chain Config (JSON)', default: '{}' },
    },
  },
  {
    type: 'stability_generate',
    label: 'Stability AI – Image',
    description: 'Generate images with Stable Diffusion via Stability AI',
    category: 'ai',
    icon: '🎨',
    color: 'text-rose-400',
    configSchema: {
      prompt: { type: 'code', label: 'Prompt', default: '' },
      negativePrompt: { type: 'code', label: 'Negative Prompt', default: '' },
      width: { type: 'number', label: 'Width', default: 1024 },
      height: { type: 'number', label: 'Height', default: 1024 },
      steps: { type: 'number', label: 'Steps', default: 30 },
      cfgScale: { type: 'number', label: 'CFG Scale', default: 7 },
    },
  },
  {
    type: 'cohere_generate',
    label: 'Cohere – Generate',
    description: 'Generate text with Cohere Command models',
    category: 'ai',
    icon: '🧬',
    color: 'text-green-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'command-r-plus', options: ['command-r-plus', 'command-r', 'command', 'command-light'] },
      message: { type: 'code', label: 'Message', default: '' },
      temperature: { type: 'number', label: 'Temperature', default: 0.3 },
    },
  },
  {
    type: 'cohere_embed',
    label: 'Cohere – Embed',
    description: 'Generate embeddings with Cohere Embed models',
    category: 'ai',
    icon: '📊',
    color: 'text-green-400',
    configSchema: {
      model: { type: 'select', label: 'Model', default: 'embed-english-v3.0', options: ['embed-english-v3.0', 'embed-multilingual-v3.0', 'embed-english-light-v3.0'] },
      texts: { type: 'json', label: 'Texts (JSON array)', default: '["hello world"]' },
      inputType: { type: 'select', label: 'Input Type', default: 'search_document', options: ['search_document', 'search_query', 'classification', 'clustering'] },
    },
  },

  // ━━━ VECTOR DATABASES ━━━
  {
    type: 'pinecone_upsert',
    label: 'Pinecone – Upsert',
    description: 'Upsert vectors into a Pinecone index',
    category: 'vectordb',
    icon: '🌲',
    color: 'text-green-400',
    configSchema: {
      indexName: { type: 'string', label: 'Index Name', default: '' },
      namespace: { type: 'string', label: 'Namespace', default: '' },
      vectors: { type: 'json', label: 'Vectors (JSON)', default: '[]' },
    },
  },
  {
    type: 'pinecone_query',
    label: 'Pinecone – Query',
    description: 'Query vectors from a Pinecone index',
    category: 'vectordb',
    icon: '🌲',
    color: 'text-green-400',
    configSchema: {
      indexName: { type: 'string', label: 'Index Name', default: '' },
      namespace: { type: 'string', label: 'Namespace', default: '' },
      vector: { type: 'json', label: 'Query Vector (JSON)', default: '[]' },
      topK: { type: 'number', label: 'Top K', default: 10 },
    },
  },
  {
    type: 'qdrant_search',
    label: 'Qdrant – Search',
    description: 'Search vectors in Qdrant',
    category: 'vectordb',
    icon: '🔷',
    color: 'text-rose-400',
    configSchema: {
      url: { type: 'string', label: 'Qdrant URL', default: 'http://localhost:6333' },
      collection: { type: 'string', label: 'Collection', default: '' },
      vector: { type: 'json', label: 'Query Vector (JSON)', default: '[]' },
      limit: { type: 'number', label: 'Limit', default: 10 },
    },
  },
  {
    type: 'weaviate_query',
    label: 'Weaviate – Query',
    description: 'Query Weaviate vector database',
    category: 'vectordb',
    icon: '🟢',
    color: 'text-green-400',
    configSchema: {
      url: { type: 'string', label: 'Weaviate URL', default: 'http://localhost:8080' },
      className: { type: 'string', label: 'Class Name', default: '' },
      query: { type: 'code', label: 'GraphQL Query', default: '' },
      limit: { type: 'number', label: 'Limit', default: 10 },
    },
  },
  {
    type: 'chroma_query',
    label: 'ChromaDB – Query',
    description: 'Query embeddings from ChromaDB',
    category: 'vectordb',
    icon: '🎨',
    color: 'text-yellow-400',
    configSchema: {
      url: { type: 'string', label: 'Chroma URL', default: 'http://localhost:8000' },
      collection: { type: 'string', label: 'Collection', default: '' },
      queryTexts: { type: 'json', label: 'Query Texts (JSON)', default: '["search text"]' },
      nResults: { type: 'number', label: 'N Results', default: 10 },
    },
  },

  // ━━━ DATABASES (expanded) ━━━
  {
    type: 'elasticsearch_query',
    label: 'Elasticsearch – Query',
    description: 'Search and query Elasticsearch indices',
    category: 'databases',
    icon: '🔍',
    color: 'text-yellow-400',
    configSchema: {
      url: { type: 'string', label: 'ES URL', default: 'http://localhost:9200' },
      index: { type: 'string', label: 'Index', default: '' },
      query: { type: 'json', label: 'Query (JSON)', default: '{"match_all": {}}' },
    },
  },
  {
    type: 'dynamodb_query',
    label: 'DynamoDB – Query',
    description: 'Query items from AWS DynamoDB',
    category: 'databases',
    icon: '📦',
    color: 'text-blue-400',
    configSchema: {
      tableName: { type: 'string', label: 'Table Name', default: '' },
      keyCondition: { type: 'json', label: 'Key Condition (JSON)', default: '{}' },
      region: { type: 'string', label: 'Region', default: 'us-east-1' },
    },
  },

  // ━━━ SOCIAL MEDIA (expanded) ━━━
  {
    type: 'tiktok_post',
    label: 'TikTok – Post Video',
    description: 'Upload a video to TikTok',
    category: 'social',
    icon: '🎵',
    color: 'text-pink-400',
    configSchema: {
      videoUrl: { type: 'string', label: 'Video URL', default: '' },
      caption: { type: 'code', label: 'Caption', default: '' },
      privacy: { type: 'select', label: 'Privacy', default: 'public', options: ['public', 'friends', 'private'] },
    },
  },
  {
    type: 'facebook_post',
    label: 'Facebook – Post',
    description: 'Create a post on a Facebook page',
    category: 'social',
    icon: '📘',
    color: 'text-blue-500',
    configSchema: {
      pageId: { type: 'string', label: 'Page ID', default: '' },
      message: { type: 'code', label: 'Message', default: '' },
      link: { type: 'string', label: 'Link URL', default: '' },
    },
  },
  {
    type: 'pinterest_pin',
    label: 'Pinterest – Create Pin',
    description: 'Create a pin on Pinterest',
    category: 'social',
    icon: '📌',
    color: 'text-red-500',
    configSchema: {
      boardId: { type: 'string', label: 'Board ID', default: '' },
      title: { type: 'string', label: 'Title', default: '' },
      description: { type: 'string', label: 'Description', default: '' },
      imageUrl: { type: 'string', label: 'Image URL', default: '' },
      link: { type: 'string', label: 'Destination Link', default: '' },
    },
  },
  {
    type: 'youtube_upload',
    label: 'YouTube – Upload Video',
    description: 'Upload a video to YouTube',
    category: 'google',
    icon: '🎬',
    color: 'text-red-500',
    configSchema: {
      title: { type: 'string', label: 'Title', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      tags: { type: 'string', label: 'Tags (comma-sep)', default: '' },
      privacy: { type: 'select', label: 'Privacy', default: 'private', options: ['public', 'unlisted', 'private'] },
      videoUrl: { type: 'string', label: 'Video File URL', default: '' },
    },
  },
  {
    type: 'twitch_send',
    label: 'Twitch – Send Chat',
    description: 'Send a message to a Twitch channel chat',
    category: 'social',
    icon: '🟣',
    color: 'text-rose-400',
    configSchema: {
      channel: { type: 'string', label: 'Channel', default: '' },
      message: { type: 'string', label: 'Message', default: '' },
    },
  },
  {
    type: 'spotify_search',
    label: 'Spotify – Search',
    description: 'Search tracks, albums, or artists on Spotify',
    category: 'social',
    icon: '🎧',
    color: 'text-green-500',
    configSchema: {
      query: { type: 'string', label: 'Search Query', default: '' },
      type: { type: 'select', label: 'Type', default: 'track', options: ['track', 'album', 'artist', 'playlist'] },
      limit: { type: 'number', label: 'Limit', default: 10 },
    },
  },

  // ━━━ MESSAGING (expanded) ━━━
  {
    type: 'teams_message',
    label: 'Microsoft Teams – Message',
    description: 'Send a message to a Microsoft Teams channel',
    category: 'messaging',
    icon: '💜',
    color: 'text-rose-400',
    configSchema: {
      webhookUrl: { type: 'string', label: 'Webhook URL', default: '', required: true },
      text: { type: 'code', label: 'Message', default: '' },
      title: { type: 'string', label: 'Title (optional)', default: '' },
    },
  },
  {
    type: 'sendgrid_email',
    label: 'SendGrid – Send Email',
    description: 'Send transactional email via SendGrid',
    category: 'messaging',
    icon: '📧',
    color: 'text-blue-400',
    configSchema: {
      to: { type: 'string', label: 'To', default: '', placeholder: 'user@example.com' },
      from: { type: 'string', label: 'From', default: '', placeholder: 'noreply@example.com' },
      subject: { type: 'string', label: 'Subject', default: '' },
      body: { type: 'code', label: 'Body (HTML)', default: '' },
      templateId: { type: 'string', label: 'Template ID (optional)', default: '' },
    },
  },
  {
    type: 'mailgun_send',
    label: 'Mailgun – Send Email',
    description: 'Send email via Mailgun API',
    category: 'messaging',
    icon: '📨',
    color: 'text-red-400',
    configSchema: {
      domain: { type: 'string', label: 'Domain', default: '' },
      to: { type: 'string', label: 'To', default: '' },
      from: { type: 'string', label: 'From', default: '' },
      subject: { type: 'string', label: 'Subject', default: '' },
      body: { type: 'code', label: 'Body (HTML)', default: '' },
    },
  },

  // ━━━ PROJECT MANAGEMENT ━━━
  {
    type: 'jira_create_issue',
    label: 'Jira – Create Issue',
    description: 'Create an issue in Jira',
    category: 'productivity',
    icon: '📋',
    color: 'text-blue-500',
    configSchema: {
      projectKey: { type: 'string', label: 'Project Key', default: '', placeholder: 'PROJ' },
      issueType: { type: 'select', label: 'Issue Type', default: 'Task', options: ['Task', 'Bug', 'Story', 'Epic', 'Sub-task'] },
      summary: { type: 'string', label: 'Summary', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      priority: { type: 'select', label: 'Priority', default: 'Medium', options: ['Highest', 'High', 'Medium', 'Low', 'Lowest'] },
      assignee: { type: 'string', label: 'Assignee', default: '' },
    },
  },
  {
    type: 'jira_update_issue',
    label: 'Jira – Update Issue',
    description: 'Update an existing Jira issue',
    category: 'productivity',
    icon: '📋',
    color: 'text-blue-500',
    configSchema: {
      issueKey: { type: 'string', label: 'Issue Key', default: '', placeholder: 'PROJ-123' },
      status: { type: 'string', label: 'Status', default: '' },
      fields: { type: 'json', label: 'Fields (JSON)', default: '{}' },
    },
  },
  {
    type: 'linear_create_issue',
    label: 'Linear – Create Issue',
    description: 'Create an issue in Linear',
    category: 'productivity',
    icon: '📐',
    color: 'text-rose-400',
    configSchema: {
      teamId: { type: 'string', label: 'Team ID', default: '' },
      title: { type: 'string', label: 'Title', default: '' },
      description: { type: 'code', label: 'Description (Markdown)', default: '' },
      priority: { type: 'select', label: 'Priority', default: '3', options: ['0', '1', '2', '3', '4'] },
      labelIds: { type: 'string', label: 'Label IDs (comma-sep)', default: '' },
    },
  },
  {
    type: 'trello_create_card',
    label: 'Trello – Create Card',
    description: 'Create a card on a Trello board',
    category: 'productivity',
    icon: '📇',
    color: 'text-blue-400',
    configSchema: {
      listId: { type: 'string', label: 'List ID', default: '' },
      name: { type: 'string', label: 'Card Name', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      dueDate: { type: 'string', label: 'Due Date (ISO)', default: '' },
    },
  },
  {
    type: 'asana_create_task',
    label: 'Asana – Create Task',
    description: 'Create a task in Asana',
    category: 'productivity',
    icon: '🎯',
    color: 'text-pink-400',
    configSchema: {
      projectId: { type: 'string', label: 'Project ID', default: '' },
      name: { type: 'string', label: 'Task Name', default: '' },
      notes: { type: 'code', label: 'Notes', default: '' },
      dueOn: { type: 'string', label: 'Due Date (YYYY-MM-DD)', default: '' },
      assignee: { type: 'string', label: 'Assignee Email', default: '' },
    },
  },
  {
    type: 'clickup_create_task',
    label: 'ClickUp – Create Task',
    description: 'Create a task in ClickUp',
    category: 'productivity',
    icon: '✅',
    color: 'text-rose-400',
    configSchema: {
      listId: { type: 'string', label: 'List ID', default: '' },
      name: { type: 'string', label: 'Task Name', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      priority: { type: 'select', label: 'Priority', default: '3', options: ['1', '2', '3', '4'] },
      assignees: { type: 'string', label: 'Assignee IDs (comma-sep)', default: '' },
    },
  },
  {
    type: 'todoist_add_task',
    label: 'Todoist – Add Task',
    description: 'Create a task in Todoist',
    category: 'productivity',
    icon: '☑️',
    color: 'text-red-400',
    configSchema: {
      content: { type: 'string', label: 'Task Content', default: '' },
      projectId: { type: 'string', label: 'Project ID', default: '' },
      priority: { type: 'select', label: 'Priority', default: '1', options: ['1', '2', '3', '4'] },
      dueString: { type: 'string', label: 'Due Date', default: '', placeholder: 'tomorrow at 5pm' },
    },
  },
  {
    type: 'monday_create_item',
    label: 'Monday.com – Create Item',
    description: 'Create an item on Monday.com board',
    category: 'productivity',
    icon: '📊',
    color: 'text-yellow-400',
    configSchema: {
      boardId: { type: 'string', label: 'Board ID', default: '' },
      groupId: { type: 'string', label: 'Group ID', default: '' },
      itemName: { type: 'string', label: 'Item Name', default: '' },
      columnValues: { type: 'json', label: 'Column Values (JSON)', default: '{}' },
    },
  },

  // ━━━ E-COMMERCE ━━━
  {
    type: 'shopify_get_orders',
    label: 'Shopify – Get Orders',
    description: 'Retrieve orders from Shopify store',
    category: 'ecommerce',
    icon: '🛍️',
    color: 'text-green-400',
    configSchema: {
      status: { type: 'select', label: 'Status', default: 'any', options: ['any', 'open', 'closed', 'cancelled'] },
      limit: { type: 'number', label: 'Limit', default: 50 },
      createdAtMin: { type: 'string', label: 'Created After (ISO)', default: '' },
    },
  },
  {
    type: 'shopify_create_product',
    label: 'Shopify – Create Product',
    description: 'Create a product in Shopify',
    category: 'ecommerce',
    icon: '🛍️',
    color: 'text-green-400',
    configSchema: {
      title: { type: 'string', label: 'Title', default: '' },
      description: { type: 'code', label: 'Description (HTML)', default: '' },
      price: { type: 'string', label: 'Price', default: '0.00' },
      vendor: { type: 'string', label: 'Vendor', default: '' },
      productType: { type: 'string', label: 'Product Type', default: '' },
    },
  },
  {
    type: 'woocommerce_get_orders',
    label: 'WooCommerce – Get Orders',
    description: 'Retrieve orders from WooCommerce',
    category: 'ecommerce',
    icon: '🛒',
    color: 'text-rose-400',
    configSchema: {
      status: { type: 'select', label: 'Status', default: 'any', options: ['any', 'pending', 'processing', 'completed', 'cancelled', 'refunded'] },
      perPage: { type: 'number', label: 'Per Page', default: 25 },
    },
  },
  {
    type: 'gumroad_get_sales',
    label: 'Gumroad – Get Sales',
    description: 'Retrieve sales data from Gumroad',
    category: 'ecommerce',
    icon: '💰',
    color: 'text-pink-400',
    configSchema: {
      productId: { type: 'string', label: 'Product ID (optional)', default: '' },
      after: { type: 'string', label: 'After Date (ISO)', default: '' },
    },
  },
  {
    type: 'lemonsqueezy_get_orders',
    label: 'Lemon Squeezy – Orders',
    description: 'Retrieve orders from Lemon Squeezy',
    category: 'ecommerce',
    icon: '🍋',
    color: 'text-yellow-400',
    configSchema: {
      storeId: { type: 'string', label: 'Store ID', default: '' },
      status: { type: 'select', label: 'Status', default: 'all', options: ['all', 'paid', 'refunded'] },
    },
  },

  // ━━━ CMS & WEBSITE ━━━
  {
    type: 'wordpress_create_post',
    label: 'WordPress – Create Post',
    description: 'Create a post on WordPress',
    category: 'cms',
    icon: '📝',
    color: 'text-blue-400',
    configSchema: {
      siteUrl: { type: 'string', label: 'Site URL', default: '', placeholder: 'https://example.com' },
      title: { type: 'string', label: 'Title', default: '' },
      content: { type: 'code', label: 'Content (HTML)', default: '' },
      status: { type: 'select', label: 'Status', default: 'draft', options: ['draft', 'publish', 'pending', 'private'] },
      categories: { type: 'string', label: 'Category IDs (comma-sep)', default: '' },
    },
  },
  {
    type: 'webflow_create_item',
    label: 'Webflow – Create CMS Item',
    description: 'Create a CMS item in Webflow',
    category: 'cms',
    icon: '🌐',
    color: 'text-blue-500',
    configSchema: {
      collectionId: { type: 'string', label: 'Collection ID', default: '' },
      fields: { type: 'json', label: 'Fields (JSON)', default: '{}' },
      live: { type: 'boolean', label: 'Publish Live', default: false },
    },
  },
  {
    type: 'contentful_get_entries',
    label: 'Contentful – Get Entries',
    description: 'Fetch entries from Contentful CMS',
    category: 'cms',
    icon: '📄',
    color: 'text-blue-400',
    configSchema: {
      spaceId: { type: 'string', label: 'Space ID', default: '' },
      contentType: { type: 'string', label: 'Content Type', default: '' },
      limit: { type: 'number', label: 'Limit', default: 100 },
      query: { type: 'json', label: 'Query Params (JSON)', default: '{}' },
    },
  },
  {
    type: 'ghost_create_post',
    label: 'Ghost – Create Post',
    description: 'Create a post on Ghost blog',
    category: 'cms',
    icon: '👻',
    color: 'text-gray-300',
    configSchema: {
      title: { type: 'string', label: 'Title', default: '' },
      html: { type: 'code', label: 'Content (HTML)', default: '' },
      status: { type: 'select', label: 'Status', default: 'draft', options: ['draft', 'published', 'scheduled'] },
      tags: { type: 'string', label: 'Tags (comma-sep)', default: '' },
    },
  },
  {
    type: 'notion_create_page',
    label: 'Notion – Create Page',
    description: 'Create a page in a Notion database',
    category: 'cms',
    icon: '📓',
    color: 'text-gray-300',
    configSchema: {
      databaseId: { type: 'string', label: 'Database ID', default: '' },
      properties: { type: 'json', label: 'Properties (JSON)', default: '{}' },
      content: { type: 'code', label: 'Page Content (Markdown)', default: '' },
    },
  },

  // ━━━ SUPPORT & HELPDESK ━━━
  {
    type: 'zendesk_create_ticket',
    label: 'Zendesk – Create Ticket',
    description: 'Create a support ticket in Zendesk',
    category: 'support',
    icon: '🎫',
    color: 'text-green-400',
    configSchema: {
      subject: { type: 'string', label: 'Subject', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      priority: { type: 'select', label: 'Priority', default: 'normal', options: ['low', 'normal', 'high', 'urgent'] },
      type: { type: 'select', label: 'Type', default: 'problem', options: ['problem', 'incident', 'question', 'task'] },
      requesterEmail: { type: 'string', label: 'Requester Email', default: '' },
    },
  },
  {
    type: 'zendesk_update_ticket',
    label: 'Zendesk – Update Ticket',
    description: 'Update an existing Zendesk ticket',
    category: 'support',
    icon: '🎫',
    color: 'text-green-400',
    configSchema: {
      ticketId: { type: 'string', label: 'Ticket ID', default: '' },
      status: { type: 'select', label: 'Status', default: 'open', options: ['new', 'open', 'pending', 'hold', 'solved', 'closed'] },
      comment: { type: 'code', label: 'Comment', default: '' },
    },
  },
  {
    type: 'intercom_message',
    label: 'Intercom – Send Message',
    description: 'Send a message via Intercom',
    category: 'support',
    icon: '💬',
    color: 'text-blue-400',
    configSchema: {
      userId: { type: 'string', label: 'User ID', default: '' },
      messageType: { type: 'select', label: 'Type', default: 'inapp', options: ['inapp', 'email'] },
      body: { type: 'code', label: 'Message Body', default: '' },
    },
  },
  {
    type: 'freshdesk_create_ticket',
    label: 'Freshdesk – Create Ticket',
    description: 'Create a ticket in Freshdesk',
    category: 'support',
    icon: '🎫',
    color: 'text-green-500',
    configSchema: {
      subject: { type: 'string', label: 'Subject', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      priority: { type: 'select', label: 'Priority', default: '1', options: ['1', '2', '3', '4'] },
      email: { type: 'string', label: 'Requester Email', default: '' },
    },
  },

  // ━━━ SCHEDULING & VIDEO ━━━
  {
    type: 'calendly_get_events',
    label: 'Calendly – Get Events',
    description: 'Retrieve scheduled events from Calendly',
    category: 'scheduling',
    icon: '📅',
    color: 'text-blue-400',
    configSchema: {
      minStartTime: { type: 'string', label: 'Min Start Time (ISO)', default: '' },
      maxStartTime: { type: 'string', label: 'Max Start Time (ISO)', default: '' },
      count: { type: 'number', label: 'Count', default: 20 },
    },
  },
  {
    type: 'zoom_create_meeting',
    label: 'Zoom – Create Meeting',
    description: 'Create a Zoom meeting',
    category: 'scheduling',
    icon: '📹',
    color: 'text-blue-500',
    configSchema: {
      topic: { type: 'string', label: 'Topic', default: '' },
      type: { type: 'select', label: 'Type', default: '2', options: ['1', '2', '3', '8'] },
      startTime: { type: 'string', label: 'Start Time (ISO)', default: '' },
      duration: { type: 'number', label: 'Duration (min)', default: 60 },
      password: { type: 'string', label: 'Password', default: '' },
    },
  },
  {
    type: 'loom_get_videos',
    label: 'Loom – Get Videos',
    description: 'Retrieve videos from Loom workspace',
    category: 'scheduling',
    icon: '🎥',
    color: 'text-rose-400',
    configSchema: {
      limit: { type: 'number', label: 'Limit', default: 25 },
    },
  },
  {
    type: 'vimeo_upload',
    label: 'Vimeo – Upload Video',
    description: 'Upload a video to Vimeo',
    category: 'scheduling',
    icon: '🎞️',
    color: 'text-cyan-400',
    configSchema: {
      name: { type: 'string', label: 'Video Name', default: '' },
      description: { type: 'code', label: 'Description', default: '' },
      fileUrl: { type: 'string', label: 'File URL', default: '' },
      privacy: { type: 'select', label: 'Privacy', default: 'nobody', options: ['anybody', 'nobody', 'password', 'users'] },
    },
  },

  // ━━━ CLOUD & DEVOPS (expanded) ━━━
  {
    type: 'gcp_pubsub',
    label: 'Google Cloud – Pub/Sub',
    description: 'Publish messages to Google Cloud Pub/Sub',
    category: 'cloud',
    icon: '📡',
    color: 'text-blue-400',
    configSchema: {
      projectId: { type: 'string', label: 'Project ID', default: '' },
      topic: { type: 'string', label: 'Topic', default: '' },
      message: { type: 'json', label: 'Message (JSON)', default: '{}' },
    },
  },
  {
    type: 'gcp_function',
    label: 'Google Cloud – Function',
    description: 'Invoke a Google Cloud Function',
    category: 'cloud',
    icon: '⚡',
    color: 'text-blue-400',
    configSchema: {
      functionUrl: { type: 'string', label: 'Function URL', default: '' },
      payload: { type: 'json', label: 'Payload (JSON)', default: '{}' },
    },
  },
  {
    type: 'azure_function',
    label: 'Azure – Function',
    description: 'Invoke an Azure Function',
    category: 'cloud',
    icon: '⚡',
    color: 'text-blue-500',
    configSchema: {
      functionUrl: { type: 'string', label: 'Function URL', default: '' },
      functionKey: { type: 'string', label: 'Function Key', default: '' },
      payload: { type: 'json', label: 'Payload (JSON)', default: '{}' },
    },
  },
  {
    type: 'azure_blob',
    label: 'Azure – Blob Storage',
    description: 'Upload or download from Azure Blob Storage',
    category: 'cloud',
    icon: '📦',
    color: 'text-blue-500',
    configSchema: {
      container: { type: 'string', label: 'Container', default: '' },
      blobName: { type: 'string', label: 'Blob Name', default: '' },
      action: { type: 'select', label: 'Action', default: 'upload', options: ['upload', 'download', 'list', 'delete'] },
    },
  },
  {
    type: 'cloudflare_worker',
    label: 'Cloudflare – Worker',
    description: 'Deploy or invoke a Cloudflare Worker',
    category: 'cloud',
    icon: '🔥',
    color: 'text-orange-400',
    configSchema: {
      workerUrl: { type: 'string', label: 'Worker URL', default: '' },
      method: { type: 'select', label: 'Method', default: 'POST', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      body: { type: 'json', label: 'Body (JSON)', default: '{}' },
    },
  },
  {
    type: 'digitalocean_droplet',
    label: 'DigitalOcean – Droplet',
    description: 'Manage DigitalOcean Droplets',
    category: 'cloud',
    icon: '💧',
    color: 'text-blue-400',
    configSchema: {
      action: { type: 'select', label: 'Action', default: 'list', options: ['list', 'create', 'delete', 'power_on', 'power_off'] },
      name: { type: 'string', label: 'Name', default: '' },
      region: { type: 'string', label: 'Region', default: 'nyc1' },
      size: { type: 'string', label: 'Size', default: 's-1vcpu-1gb' },
      image: { type: 'string', label: 'Image', default: 'ubuntu-22-04-x64' },
    },
  },
  {
    type: 'netlify_deploy',
    label: 'Netlify – Deploy',
    description: 'Trigger a Netlify deploy via build hook',
    category: 'cloud',
    icon: '🚀',
    color: 'text-teal-400',
    configSchema: {
      buildHookUrl: { type: 'string', label: 'Build Hook URL', default: '' },
    },
  },
  {
    type: 'railway_deploy',
    label: 'Railway – Deploy',
    description: 'Deploy a service on Railway',
    category: 'cloud',
    icon: '🚂',
    color: 'text-rose-400',
    configSchema: {
      serviceId: { type: 'string', label: 'Service ID', default: '' },
      environmentId: { type: 'string', label: 'Environment ID', default: '' },
    },
  },

  // ━━━ FILES & STORAGE (expanded) ━━━
  {
    type: 'dropbox_upload',
    label: 'Dropbox – Upload',
    description: 'Upload a file to Dropbox',
    category: 'files',
    icon: '📦',
    color: 'text-blue-400',
    configSchema: {
      path: { type: 'string', label: 'Dropbox Path', default: '', placeholder: '/folder/file.pdf' },
      mode: { type: 'select', label: 'Mode', default: 'add', options: ['add', 'overwrite'] },
    },
  },
  {
    type: 'dropbox_list',
    label: 'Dropbox – List Files',
    description: 'List files in a Dropbox folder',
    category: 'files',
    icon: '📂',
    color: 'text-blue-400',
    configSchema: {
      path: { type: 'string', label: 'Folder Path', default: '/' },
      recursive: { type: 'boolean', label: 'Recursive', default: false },
    },
  },
  {
    type: 'box_upload',
    label: 'Box – Upload',
    description: 'Upload a file to Box',
    category: 'files',
    icon: '📤',
    color: 'text-blue-500',
    configSchema: {
      folderId: { type: 'string', label: 'Folder ID', default: '0' },
      fileName: { type: 'string', label: 'File Name', default: '' },
    },
  },
  {
    type: 'onedrive_upload',
    label: 'OneDrive – Upload',
    description: 'Upload a file to OneDrive',
    category: 'files',
    icon: '☁️',
    color: 'text-blue-500',
    configSchema: {
      path: { type: 'string', label: 'File Path', default: '', placeholder: '/Documents/file.pdf' },
    },
  },

  // ━━━ MARKETING ━━━
  {
    type: 'mailchimp_add_member',
    label: 'Mailchimp – Add Member',
    description: 'Add a subscriber to a Mailchimp list',
    category: 'marketing',
    icon: '🐒',
    color: 'text-yellow-400',
    configSchema: {
      listId: { type: 'string', label: 'List ID', default: '' },
      email: { type: 'string', label: 'Email', default: '' },
      firstName: { type: 'string', label: 'First Name', default: '' },
      lastName: { type: 'string', label: 'Last Name', default: '' },
      status: { type: 'select', label: 'Status', default: 'subscribed', options: ['subscribed', 'pending', 'unsubscribed'] },
    },
  },
  {
    type: 'mailchimp_send_campaign',
    label: 'Mailchimp – Send Campaign',
    description: 'Send an email campaign via Mailchimp',
    category: 'marketing',
    icon: '📬',
    color: 'text-yellow-400',
    configSchema: {
      campaignId: { type: 'string', label: 'Campaign ID', default: '' },
    },
  },
  {
    type: 'convertkit_add_subscriber',
    label: 'ConvertKit – Add Subscriber',
    description: 'Add a subscriber to ConvertKit',
    category: 'marketing',
    icon: '✉️',
    color: 'text-red-400',
    configSchema: {
      email: { type: 'string', label: 'Email', default: '' },
      firstName: { type: 'string', label: 'First Name', default: '' },
      formId: { type: 'string', label: 'Form ID', default: '' },
      tags: { type: 'string', label: 'Tag IDs (comma-sep)', default: '' },
    },
  },
  {
    type: 'beehiiv_create_post',
    label: 'Beehiiv – Create Post',
    description: 'Create a newsletter post on Beehiiv',
    category: 'marketing',
    icon: '🐝',
    color: 'text-yellow-400',
    configSchema: {
      publicationId: { type: 'string', label: 'Publication ID', default: '' },
      title: { type: 'string', label: 'Title', default: '' },
      content: { type: 'code', label: 'Content (HTML)', default: '' },
      status: { type: 'select', label: 'Status', default: 'draft', options: ['draft', 'confirmed'] },
    },
  },
  {
    type: 'activecampaign_contact',
    label: 'ActiveCampaign – Create Contact',
    description: 'Create or update a contact in ActiveCampaign',
    category: 'marketing',
    icon: '📧',
    color: 'text-blue-400',
    configSchema: {
      email: { type: 'string', label: 'Email', default: '' },
      firstName: { type: 'string', label: 'First Name', default: '' },
      lastName: { type: 'string', label: 'Last Name', default: '' },
      listId: { type: 'string', label: 'List ID', default: '' },
    },
  },

  // ━━━ DESIGN ━━━
  {
    type: 'figma_get_file',
    label: 'Figma – Get File',
    description: 'Retrieve a Figma file or component data',
    category: 'design',
    icon: '🎨',
    color: 'text-rose-400',
    configSchema: {
      fileKey: { type: 'string', label: 'File Key', default: '' },
      nodeIds: { type: 'string', label: 'Node IDs (comma-sep)', default: '' },
    },
  },
  {
    type: 'figma_export',
    label: 'Figma – Export Image',
    description: 'Export images from a Figma file',
    category: 'design',
    icon: '🖼️',
    color: 'text-rose-400',
    configSchema: {
      fileKey: { type: 'string', label: 'File Key', default: '' },
      nodeIds: { type: 'string', label: 'Node IDs', default: '' },
      format: { type: 'select', label: 'Format', default: 'png', options: ['png', 'jpg', 'svg', 'pdf'] },
      scale: { type: 'number', label: 'Scale', default: 2 },
    },
  },
  {
    type: 'canva_create_design',
    label: 'Canva – Create Design',
    description: 'Create a design in Canva',
    category: 'design',
    icon: '🎨',
    color: 'text-cyan-400',
    configSchema: {
      designType: { type: 'select', label: 'Design Type', default: 'presentation', options: ['presentation', 'social_media', 'poster', 'document', 'video'] },
      title: { type: 'string', label: 'Title', default: '' },
    },
  },

  // ━━━ CRM (expanded) ━━━
  {
    type: 'airtable_create_record',
    label: 'Airtable – Create Record',
    description: 'Create a record in Airtable',
    category: 'crm',
    icon: '📋',
    color: 'text-blue-400',
    configSchema: {
      baseId: { type: 'string', label: 'Base ID', default: '' },
      table: { type: 'string', label: 'Table Name', default: '' },
      fields: { type: 'json', label: 'Fields (JSON)', default: '{}' },
    },
  },
  {
    type: 'hubspot_get_contacts',
    label: 'HubSpot – Get Contacts',
    description: 'Retrieve contacts from HubSpot CRM',
    category: 'crm',
    icon: '🟠',
    color: 'text-orange-400',
    configSchema: {
      limit: { type: 'number', label: 'Limit', default: 100 },
      properties: { type: 'string', label: 'Properties (comma-sep)', default: 'email,firstname,lastname' },
    },
  },
  {
    type: 'hubspot_create_deal',
    label: 'HubSpot – Create Deal',
    description: 'Create a deal in HubSpot CRM',
    category: 'crm',
    icon: '💰',
    color: 'text-orange-400',
    configSchema: {
      dealName: { type: 'string', label: 'Deal Name', default: '' },
      amount: { type: 'number', label: 'Amount', default: 0 },
      pipeline: { type: 'string', label: 'Pipeline ID', default: '' },
      stage: { type: 'string', label: 'Stage ID', default: '' },
    },
  },
  {
    type: 'salesforce_create_record',
    label: 'Salesforce – Create Record',
    description: 'Create a record in Salesforce',
    category: 'crm',
    icon: '☁️',
    color: 'text-blue-500',
    configSchema: {
      objectType: { type: 'select', label: 'Object Type', default: 'Contact', options: ['Contact', 'Lead', 'Account', 'Opportunity', 'Case', 'Task'] },
      fields: { type: 'json', label: 'Fields (JSON)', default: '{}' },
    },
  },

  // ━━━ HTTP (expanded) ━━━
  {
    type: 'webhook_response',
    label: 'Webhook Response',
    description: 'Send a response back to a webhook caller',
    category: 'http',
    icon: '↩️',
    color: 'text-indigo-400',
    configSchema: {
      statusCode: { type: 'number', label: 'Status Code', default: 200 },
      headers: { type: 'json', label: 'Headers (JSON)', default: '{}' },
      body: { type: 'code', label: 'Response Body', default: '{"success": true}' },
    },
  },
  {
    type: 'websocket_send',
    label: 'WebSocket – Send',
    description: 'Send a message over WebSocket',
    category: 'http',
    icon: '🔌',
    color: 'text-indigo-400',
    configSchema: {
      url: { type: 'string', label: 'WebSocket URL', default: '', placeholder: 'wss://...' },
      message: { type: 'code', label: 'Message', default: '' },
    },
  },

  // ━━━ FORMS & SURVEYS ━━━
  {
    type: 'typeform_responses',
    label: 'Typeform – Get Responses',
    description: 'Retrieve form responses from Typeform',
    category: 'http',
    icon: '📝',
    color: 'text-indigo-400',
    configSchema: {
      formId: { type: 'string', label: 'Form ID', default: '' },
      pageSize: { type: 'number', label: 'Page Size', default: 25 },
      since: { type: 'string', label: 'Since (ISO)', default: '' },
    },
  },
  {
    type: 'google_forms_responses',
    label: 'Google Forms – Responses',
    description: 'Retrieve responses from Google Forms',
    category: 'google',
    icon: '📋',
    color: 'text-rose-400',
    configSchema: {
      formId: { type: 'string', label: 'Form ID', default: '' },
    },
  },

  // ━━━ PAYMENTS (expanded) ━━━
  {
    type: 'stripe_subscription',
    label: 'Stripe – Create Subscription',
    description: 'Create a subscription in Stripe',
    category: 'payments',
    icon: '🔄',
    color: 'text-rose-400',
    configSchema: {
      customerId: { type: 'string', label: 'Customer ID', default: '' },
      priceId: { type: 'string', label: 'Price ID', default: '' },
    },
  },
  {
    type: 'stripe_webhook',
    label: 'Stripe – Webhook Handler',
    description: 'Process Stripe webhook events',
    category: 'payments',
    icon: '🔔',
    color: 'text-rose-400',
    configSchema: {
      events: { type: 'string', label: 'Event Types (comma-sep)', default: 'checkout.session.completed,invoice.paid' },
    },
  },

];

// ── Grouped by category (for palette rendering) ──
export function getGroupedCatalog(): Record<string, NodeDefinition[]> {
  const grouped: Record<string, NodeDefinition[]> = {};
  for (const node of nodeCatalog) {
    if (!grouped[node.category]) grouped[node.category] = [];
    grouped[node.category].push(node);
  }
  return grouped;
}

// ── Search/filter helper ──
export function searchNodes(query: string): Record<string, NodeDefinition[]> {
  if (!query.trim()) return getGroupedCatalog();
  const q = query.toLowerCase();
  const results: Record<string, NodeDefinition[]> = {};
  for (const node of nodeCatalog) {
    if (
      node.label.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      node.type.toLowerCase().includes(q) ||
      node.category.toLowerCase().includes(q)
    ) {
      if (!results[node.category]) results[node.category] = [];
      results[node.category].push(node);
    }
  }
  return results;
}

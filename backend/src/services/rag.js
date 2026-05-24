const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const VECTOR_STORE_PATH = path.join(__dirname, '../../rag_store.json');
const TRAINING_WORKFLOWS_PATH = path.join(__dirname, '../../../training/data/workflows/seed_workflows.jsonl');
const DEFAULT_MODEL = process.env.RAG_MODEL || 'llama-3.1-8b-instant';
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'i', 'in', 'into', 'is', 'it', 'me', 'my', 'of', 'on', 'or',
  'that', 'the', 'then', 'this', 'to', 'with', 'you', 'your'
]);

// Synonyms for query expansion — maps query term → additional terms to inject
const SYNONYMS = {
  email:    ['gmail', 'smtp', 'sendgrid', 'email_send', 'send_email', 'google_gmail'],
  sms:      ['twilio', 'text', 'message', 'twilio_sms'],
  slack:    ['notify', 'channel', 'slack_send', 'slack_message'],
  webhook:  ['http', 'endpoint', 'trigger_webhook', 'rest'],
  schedule: ['cron', 'timer', 'trigger_cron', 'interval', 'daily', 'hourly', 'scheduled'],
  database: ['postgres', 'mysql', 'supabase', 'mongodb', 'db', 'query'],
  ai:       ['openai', 'claude', 'gpt', 'llm', 'anthropic', 'groq', 'openai_chat', 'anthropic_chat'],
  translate:['google_translate', 'language', 'translation'],
  image:    ['dalle', 'vision', 'openai_image', 'openai_dalle'],
  notify:   ['slack', 'email', 'sms', 'discord', 'telegram'],
  file:     ['s3', 'drive', 'upload', 'google_drive', 'aws_s3'],
  sheets:   ['google_sheets', 'spreadsheet', 'csv'],
  twitter:  ['tweet', 'x_post', 'social'],
  discord:  ['discord_send', 'discord_message', 'chat'],
  http:     ['rest', 'api', 'request', 'http_request', 'rest_get', 'rest_post'],
};

function tokenize(text) {
  return String(text || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // split camelCase: webhookTrigger → webhook Trigger
    .toLowerCase()
    .replace(/[_\-]/g, ' ')               // split snake_case and kebab-case
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function expandQuery(terms) {
  const expanded = new Set(terms);
  for (const term of terms) {
    if (SYNONYMS[term]) SYNONYMS[term].forEach((s) => expanded.add(s));
  }
  return [...expanded];
}

function importantTerms(text) {
  const base = tokenize(text).filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  return expandQuery(base);
}

// BM25 parameters
const BM25_K1 = 1.5;
const BM25_B  = 0.75;

function buildBm25Index(texts) {
  const tokenized = texts.map((text) => tokenize(text));
  const N = tokenized.length || 1;

  // document frequency and average doc length
  const df = {};
  let totalLen = 0;
  tokenized.forEach((tokens) => {
    totalLen += tokens.length;
    new Set(tokens).forEach((term) => { df[term] = (df[term] || 0) + 1; });
  });
  const avgdl = totalLen / N || 1;

  // pre-compute BM25 score vectors (one sparse map per doc)
  const vecs = tokenized.map((tokens) => {
    const tf = {};
    tokens.forEach((term) => { tf[term] = (tf[term] || 0) + 1; });
    const dl = tokens.length;
    const vec = {};
    Object.entries(tf).forEach(([term, freq]) => {
      const idf = Math.log((N - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5) + 1);
      const numerator = freq * (BM25_K1 + 1);
      const denominator = freq + BM25_K1 * (1 - BM25_B + BM25_B * dl / avgdl);
      vec[term] = idf * (numerator / denominator);
    });
    return vec;
  });

  return { vecs, df, N, avgdl };
}

function bm25Score(queryTerms, docVec) {
  let score = 0;
  for (const term of queryTerms) {
    if (docVec[term]) score += docVec[term];
  }
  return score;
}

function getDocSearchText(doc) {
  const meta = doc.metadata || {};
  return [
    doc.title,
    doc.text,
    meta.nodeType,
    meta.category,
    Array.isArray(meta.tags) ? meta.tags.join(' ') : ''
  ].filter(Boolean).join('\n');
}

function lexicalScore(queryTerms, doc) {
  const haystack = getDocSearchText(doc).toLowerCase();
  if (!queryTerms.length) return 0;
  let score = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) score += term.includes('_') ? 0.18 : 0.08;
    if (doc.metadata?.nodeType && String(doc.metadata.nodeType).toLowerCase() === term) score += 0.35;
  }
  return Math.min(score, 1);
}

function intentBoost(queryText, doc) {
  const text = queryText.toLowerCase();
  const meta = doc.metadata || {};
  let boost = 0;

  if (meta.type === 'example' && /(build|create|generate|workflow|automate)/.test(text)) boost += 0.18;
  if (meta.type === 'pattern' && /(how|pattern|connect|route|after|when)/.test(text)) boost += 0.12;
  if (meta.type === 'node' && /(node|field|config|credential|integration)/.test(text)) boost += 0.1;
  if (meta.type === 'syntax' && /(\{\{|variable|expression|map|reference)/.test(text)) boost += 0.16;
  if (meta.type === 'platform' && /(credential|trigger|deploy|self-host|selfhost|docker)/.test(text)) boost += 0.12;

  return boost;
}

function loadStore() {
  if (!fs.existsSync(VECTOR_STORE_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStore(docs) {
  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(docs, null, 2), 'utf-8');
}

function retrieve(queryText, docs, topK = 8) {
  if (!docs.length) return [];
  const queryTerms = importantTerms(queryText);
  const allTexts = docs.map(getDocSearchText);
  const { vecs } = buildBm25Index(allTexts);

  const rawScores = docs.map((doc, index) => {
    const bm25 = bm25Score(queryTerms, vecs[index]);
    const lexical = lexicalScore(queryTerms, doc);
    const boost = intentBoost(queryText, doc);
    return { bm25, lexical, boost };
  });

  // Normalize BM25 scores to [0,1] before combining
  const maxBm25 = Math.max(...rawScores.map((s) => s.bm25), 1);

  return docs
    .map((doc, index) => {
      const { bm25, lexical, boost } = rawScores[index];
      const semantic = bm25 / maxBm25;
      const score = (semantic * 0.60) + (lexical * 0.25) + boost;
      return { ...doc, score: Number(score.toFixed(5)), scores: { semantic, lexical, boost } };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function ingest(documents, { reset = true } = {}) {
  const cleanDocs = documents.map((doc) => ({
    id: doc.id,
    title: doc.title || doc.id,
    text: doc.text,
    metadata: doc.metadata || {}
  }));

  if (reset) {
    saveStore(cleanDocs);
    logger.info(`[RAG] Rebuilt knowledge base. Total: ${cleanDocs.length}`);
    return cleanDocs.length;
  }

  const store = loadStore();
  const byId = new Map(store.map((doc) => [doc.id, doc]));
  cleanDocs.forEach((doc) => byId.set(doc.id, doc));
  const merged = [...byId.values()];
  saveStore(merged);
  logger.info(`[RAG] Upserted knowledge base. Total: ${merged.length}`);
  return merged.length;
}

function summarizeConfigSchema(schema = {}) {
  return Object.entries(schema).map(([key, field]) => ({
    key,
    type: field.type || 'string',
    required: Boolean(field.required),
    label: field.label || key,
    options: field.options || undefined,
    default: field.default
  }));
}

function buildKnowledgeBase() {
  const registry = require('../nodes/registry');
  const docs = [];
  const all = registry.getAll();

  for (const [type, node] of Object.entries(all)) {
    const fields = summarizeConfigSchema(node.configSchema);
    docs.push({
      id: `node:${type}`,
      title: `${node.label || type} node`,
      text: [
        `Node: ${node.label || type}`,
        `Type: ${type}`,
        `Category: ${node.category || 'uncategorized'}`,
        `Description: ${node.description || 'No description provided.'}`,
        `Inputs: ${JSON.stringify(node.inputs || [])}`,
        `Outputs: ${JSON.stringify(node.outputs || [])}`,
        `Config schema: ${JSON.stringify(fields)}`
      ].join('\n'),
      metadata: {
        type: 'node',
        nodeType: type,
        category: node.category || 'uncategorized',
        tags: [type, node.label, node.category].filter(Boolean)
      }
    });
  }

  docs.push(...buildPatternDocs(), ...buildTrainingExampleDocs(), ...buildPlatformDocs());
  return docs;
}

function buildPatternDocs() {
  const patterns = [
    // ── Messaging ──────────────────────────────────────────────────────────
    ['webhook_sms',
      'Receive a webhook and send an SMS. Nodes: trigger_webhook → twilio_sms. ' +
      'Config: set twilio_sms.to={{trigger.body.phone}}, message={{trigger.body.message}}. ' +
      'Requires Twilio credentials (accountSid, authToken, fromNumber).',
      ['webhook', 'twilio', 'sms', 'text', 'message']],

    ['webhook_email',
      'Receive a webhook and send an email. Nodes: trigger_webhook → email_send. ' +
      'Config: to={{trigger.body.email}}, subject={{trigger.body.subject}}, body={{trigger.body.message}}. ' +
      'Use sendEmail or google_gmail_send node.',
      ['webhook', 'email', 'send', 'gmail', 'smtp']],

    ['webhook_slack',
      'Post a Slack notification when a webhook fires. Nodes: trigger_webhook → slack_send. ' +
      'Config: channel="#alerts", text="New event: {{trigger.body.message}}". ' +
      'Requires Slack Bot Token credential.',
      ['webhook', 'slack', 'notify', 'channel', 'alert']],

    ['webhook_discord',
      'Post a Discord message when a webhook fires. Nodes: trigger_webhook → discord_send. ' +
      'Config: webhookUrl from Discord server settings, content={{trigger.body.message}}.',
      ['webhook', 'discord', 'notify', 'message']],

    ['webhook_telegram',
      'Send a Telegram message when a webhook fires. Nodes: trigger_webhook → telegram_send. ' +
      'Config: chatId={{trigger.body.chatId}}, text={{trigger.body.message}}. Requires BOT_TOKEN.',
      ['webhook', 'telegram', 'notify', 'message']],

    // ── Scheduling ─────────────────────────────────────────────────────────
    ['schedule_api',
      'Call an external API on a schedule. Nodes: trigger_cron → http_request. ' +
      'Config: cron="0 9 * * *" for daily at 9am. Set http_request.url and method.',
      ['cron', 'schedule', 'api', 'http', 'interval']],

    ['schedule_email_report',
      'Send a daily email report. Nodes: trigger_cron → http_request (fetch data) → email_send. ' +
      'Config: cron="0 8 * * 1-5" for weekdays 8am. Format the body with {{http_request.body}}.',
      ['cron', 'schedule', 'email', 'report', 'daily']],

    ['schedule_db_export',
      'Export database records on a schedule. Nodes: trigger_cron → postgres_query → email_send or file_write. ' +
      'Config: query="SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'1 day\'".',
      ['cron', 'schedule', 'database', 'postgres', 'export']],

    // ── AI / LLM ───────────────────────────────────────────────────────────
    ['ai_classify_route',
      'Classify text with AI and branch on the result. Nodes: trigger_webhook → ai_text_classifier → logic_if. ' +
      'Connect the true branch to one action and false to another. ' +
      'Config: ai_text_classifier.categories=["urgent","normal"], logic_if checks {{ai_text_classifier.label}}.',
      ['ai', 'classify', 'route', 'branch', 'logic', 'conditional']],

    ['gpt_webhook',
      'AI chatbot that responds to webhook requests. Nodes: trigger_webhook → openai_chat → respond_webhook. ' +
      'Config: openai_chat.prompt={{trigger.body.message}}, model="gpt-4o". ' +
      'Use anthropic_chat for Claude instead.',
      ['ai', 'openai', 'chatbot', 'webhook', 'response', 'gpt']],

    ['ai_summarize_email',
      'Summarize content with AI then email the result. Nodes: trigger_webhook → ai_summarize → email_send. ' +
      'Config: ai_summarize.text={{trigger.body.content}}, email body={{ai_summarize.summary}}.',
      ['ai', 'summarize', 'email', 'summary']],

    ['ai_image_generate',
      'Generate an image with DALL-E from a prompt. Nodes: trigger_webhook → openai_dalle → respond_webhook. ' +
      'Config: openai_dalle.prompt={{trigger.body.prompt}}, size="1024x1024". ' +
      'Returns imageUrl in the response.',
      ['ai', 'dalle', 'image', 'generate', 'openai']],

    ['ai_translate',
      'Translate text using Google Translate. Nodes: trigger_webhook → google_translate → respond_webhook. ' +
      'Config: text={{trigger.body.text}}, target="es" for Spanish.',
      ['translate', 'google', 'language', 'ai']],

    // ── CRM / Sales ────────────────────────────────────────────────────────
    ['hubspot_lead',
      'Capture a CRM lead then notify Slack. Nodes: trigger_webhook → hubspot_contact → slack_send. ' +
      'Config: hubspot_contact.email={{trigger.body.email}}, firstname={{trigger.body.name}}. ' +
      'Slack message: "New lead: {{trigger.body.name}}".',
      ['crm', 'hubspot', 'lead', 'slack', 'sales']],

    ['stripe_hubspot_slack',
      'On new Stripe payment, create HubSpot deal and notify Slack. ' +
      'Nodes: trigger_webhook → stripe_charge (verify) → hubspot_create_deal → slack_send. ' +
      'Map trigger.body.amount and customer email from Stripe payload.',
      ['stripe', 'payment', 'hubspot', 'deal', 'slack', 'crm']],

    // ── Monitoring ─────────────────────────────────────────────────────────
    ['monitor_site',
      'Monitor a website and alert on downtime. Nodes: trigger_cron → http_request → logic_if → slack_send. ' +
      'Config: cron="*/5 * * * *", logic_if condition: {{http_request.statusCode}} != 200, ' +
      'slack channel="#ops-alerts".',
      ['monitoring', 'uptime', 'http', 'slack', 'alert', 'cron']],

    ['monitor_db_threshold',
      'Alert when a database metric exceeds a threshold. Nodes: trigger_cron → postgres_query → logic_if → slack_send. ' +
      'Config: query counts records; logic_if checks {{postgres_query.rows[0].count}} > 1000.',
      ['monitoring', 'database', 'postgres', 'threshold', 'alert', 'slack']],

    // ── Data Processing ────────────────────────────────────────────────────
    ['loop_email_list',
      'Loop over a list and send personalised emails. Nodes: trigger_webhook → loop_for_each → email_send. ' +
      'Config: loop_for_each.items={{trigger.body.contacts}}, email to={{$json.email}}, body="Hi {{$json.name}}".',
      ['loop', 'email', 'list', 'personalise', 'batch']],

    ['sheets_to_slack',
      'Read a Google Sheet and post a summary to Slack. Nodes: trigger_cron → google_sheets_read → ai_summarize → slack_send. ' +
      'Config: sheets_read.spreadsheetId and range="Sheet1!A1:Z100".',
      ['sheets', 'google', 'slack', 'report', 'summarize']],

    ['csv_parse_email',
      'Parse a CSV payload and process each row. Nodes: trigger_webhook → csv_parse → loop_for_each → email_send. ' +
      'Config: csv_parse.data={{trigger.body.csv}}, loop items={{csv_parse.rows}}.',
      ['csv', 'parse', 'loop', 'email', 'rows']],

    // ── Dev / Cloud ────────────────────────────────────────────────────────
    ['github_issue_slack',
      'Create a GitHub issue and notify Slack. Nodes: trigger_webhook → github_issue → slack_send. ' +
      'Config: github_issue.title={{trigger.body.title}}, repo="owner/repo". ' +
      'Slack: "Issue created: {{github_issue.html_url}}".',
      ['github', 'issue', 'slack', 'devops']],

    ['s3_upload_notify',
      'Upload a file to S3 and notify via Slack. Nodes: trigger_webhook → aws_s3_upload → slack_send. ' +
      'Config: s3.bucket, s3.key={{trigger.body.filename}}, s3.body={{trigger.body.content}}.',
      ['s3', 'aws', 'upload', 'file', 'slack', 'storage']],

    ['vercel_deploy',
      'Trigger a Vercel deployment on webhook. Nodes: trigger_webhook → vercel_deploy → slack_send. ' +
      'Config: vercel_deploy.projectId, teamId. Notify Slack on completion.',
      ['vercel', 'deploy', 'ci', 'webhook', 'slack']],

    // ── Error Handling ─────────────────────────────────────────────────────
    ['error_handler',
      'Catch errors and alert the team. Add an error_handler node connected from any risky node. ' +
      'Config: error_handler.onError → slack_send with message="Workflow failed: {{error.message}}". ' +
      'Also use logic_retry for transient HTTP failures.',
      ['errors', 'retry', 'error_handler', 'alert', 'resilience']],

    ['conditional_branch',
      'Branch workflow based on a condition. Nodes: trigger_webhook → logic_if → (true branch) action1 / (false branch) action2. ' +
      'Config: logic_if.condition="{{trigger.body.status}} === \'active\'". ' +
      'Use logic_switch for more than two branches.',
      ['condition', 'branch', 'if', 'logic', 'route', 'switch']],
  ];

  return patterns.map(([id, text, tags]) => ({
    id: `pattern:${id}`,
    title: `Workflow pattern: ${id.replace(/_/g, ' ')}`,
    text,
    metadata: { type: 'pattern', tags }
  }));
}

function buildPlatformDocs() {
  return [
    {
      id: 'syntax:variables',
      title: 'Variable syntax and data mapping',
      text:
        'Variable expressions use double curly braces: {{expression}}.\n' +
        '- Webhook input: {{trigger.body.fieldName}} or {{trigger.headers.Authorization}}\n' +
        '- Current node input: {{$json.field}} or {{$json.nested.field}}\n' +
        '- Previous node output: {{NodeLabel.outputField}} or {{$node["Node Label"].json.field}}\n' +
        '- Loop item: {{$json.email}} inside a loop_for_each\n' +
        '- Query params: {{trigger.query.page}}\n' +
        '- Environment: use stored credentials, not raw secrets in config.',
      metadata: { type: 'syntax', tags: ['variables', 'mapping', 'expressions', 'template'] }
    },
    {
      id: 'syntax:workflow_json',
      title: 'Workflow JSON contract',
      text:
        'Every generated workflow must be a JSON object with two arrays: nodes and edges.\n' +
        'Node shape: {"id":"n1","type":"trigger_webhook","label":"Webhook Trigger","config":{}}\n' +
        'Edge shape: {"id":"e1","source":"n1","target":"n2"}\n' +
        'Rules:\n' +
        '- Node ids must be unique strings (n1, n2, …).\n' +
        '- Every edge source and target must reference an existing node id.\n' +
        '- Workflows must start with a trigger node (trigger_webhook, trigger_cron, trigger_manual).\n' +
        '- Config values should use {{variable}} syntax for dynamic fields.\n' +
        '- Position is optional: {x: 250, y: 100} for React Flow layout.',
      metadata: { type: 'syntax', tags: ['json', 'workflow', 'contract', 'validation', 'nodes', 'edges'] }
    },
    {
      id: 'syntax:config_fields',
      title: 'Common node config fields',
      text:
        'Common config patterns across node types:\n' +
        '- HTTP nodes: url, method (GET/POST/PUT/DELETE), headers, body\n' +
        '- Email nodes: to, subject, body (html or text), from\n' +
        '- Slack nodes: channel ("#general"), text, attachments\n' +
        '- Database nodes: query (SQL string), params (array of values)\n' +
        '- Loop node: items (array expression like {{trigger.body.list}})\n' +
        '- AI nodes: prompt or messages, model, temperature, maxTokens\n' +
        '- Cron node: cron expression like "0 9 * * 1-5" = weekdays 9am\n' +
        '- Condition node: condition (JS-style expression), operator (equals, contains, gt, lt)',
      metadata: { type: 'syntax', tags: ['config', 'fields', 'http', 'email', 'database', 'cron'] }
    },
    {
      id: 'platform:credentials',
      title: 'Credentials and secrets management',
      text:
        'Credentials are stored in the Credentials Manager (never hardcode secrets in config).\n' +
        'Supported credential types: OpenAI, Anthropic, Groq, Slack, HubSpot, Twilio, Stripe, ' +
        'GitHub, AWS (S3, Lambda), Google (Gmail, Sheets, Drive, Calendar, Translate, Maps), ' +
        'Telegram, Discord, Twitter/X, LinkedIn, Airtable, Notion, Salesforce, Supabase, MongoDB.\n' +
        'In node config, reference credentials by name using the credential selector field.',
      metadata: { type: 'platform', tags: ['credentials', 'secrets', 'api_key', 'oauth'] }
    },
    {
      id: 'platform:triggers',
      title: 'Trigger nodes',
      text:
        'Every workflow must start with a trigger node. Available triggers:\n' +
        '- trigger_webhook: fires when an HTTP POST/GET request hits the workflow URL. Payload in {{trigger.body}}, headers in {{trigger.headers}}.\n' +
        '- trigger_cron: fires on a schedule. Config: cron="0 9 * * *" (daily 9am), timezone="UTC".\n' +
        '- trigger_manual: fires when the user clicks "Run" in the UI. Useful for testing.\n' +
        '- trigger_email: fires when an email arrives (IMAP polling). Config: folder="INBOX", filter by subject.\n' +
        'Only one trigger per workflow is typical; use logic_if to branch on payload fields.',
      metadata: { type: 'platform', tags: ['triggers', 'webhook', 'cron', 'schedule', 'manual', 'email'] }
    },
    {
      id: 'platform:node_categories',
      title: 'Node categories overview',
      text:
        'Flowa nodes are grouped by category:\n' +
        '- Triggers: trigger_webhook, trigger_cron, trigger_manual, trigger_email\n' +
        '- HTTP/API: http_request, rest_get, rest_post, respond_webhook, graphql_query\n' +
        '- Messaging: email_send, slack_send, discord_send, telegram_send, twilio_sms, whatsapp_send\n' +
        '- AI/ML: openai_chat, anthropic_chat, ai_classify, ai_summarize, openai_dalle, whisper, google_translate, google_vision, huggingface\n' +
        '- Data transform: transform_set, json_parse, csv_parse, transform_split, transform_merge, transform_filter, transform_map\n' +
        '- Logic/Control: logic_if, logic_switch, loop_for_each, logic_delay, logic_retry, logic_parallel\n' +
        '- Database: postgres_query, mysql_query, supabase_query, mongodb_find, redis_command, firebase_read\n' +
        '- Cloud/Storage: aws_s3_upload, aws_lambda_invoke, google_drive_upload, file_read, file_write\n' +
        '- CRM/Productivity: hubspot_contact, hubspot_create_deal, airtable, notion, salesforce_query\n' +
        '- Social/Marketing: twitter_post, instagram_post, linkedin_post, reddit_post, mixpanel_track, segment_track\n' +
        '- Finance: stripe_charge, stripe_customer, paypal_payment\n' +
        '- Dev/CI: github_issue, github_pr, vercel_deploy\n' +
        '- Utility: code_execute, math_operation, date_time, wait_approval, console_log, error_handler',
      metadata: { type: 'platform', tags: ['categories', 'nodes', 'overview', 'all'] }
    },
  ];
}

function buildTrainingExampleDocs() {
  if (!fs.existsSync(TRAINING_WORKFLOWS_PATH)) return [];

  const docs = [];
  const lines = fs.readFileSync(TRAINING_WORKFLOWS_PATH, 'utf-8').split(/\r?\n/).filter(Boolean);
  lines.forEach((line, index) => {
    try {
      const record = JSON.parse(line);
      const turns = Array.isArray(record.conversations) ? record.conversations : [];
      const user = turns.find((turn) => turn.role === 'user')?.content || '';
      const assistant = [...turns].reverse().find((turn) => turn.role === 'assistant')?.content || '';
      if (!user || !assistant) return;
      docs.push({
        id: `example:${index + 1}`,
        title: `Example workflow: ${user.slice(0, 80)}`,
        text: `User request: ${user}\nValid workflow JSON example:\n${assistant}`,
        metadata: {
          type: 'example',
          tags: importantTerms(user).slice(0, 12)
        }
      });
    } catch (err) {
      logger.warn(`[RAG] Skipping malformed training example ${index + 1}: ${err.message}`);
    }
  });
  return docs;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function normalizeWorkflow(workflow) {
  const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const edges = Array.isArray(workflow?.edges) ? workflow.edges : [];

  return {
    nodes: nodes.map((node, index) => {
      const type = node.type || node.data?.type || 'unknown';
      const label = node.label || node.data?.label || type;
      const config = node.config || node.data?.config || {};
      return {
        id: String(node.id || `n${index + 1}`),
        type,
        position: node.position || { x: 80 + (index % 3) * 280, y: 120 + Math.floor(index / 3) * 180 },
        data: {
          ...(node.data || {}),
          label,
          type,
          config
        }
      };
    }),
    edges: edges.map((edge, index) => ({
      id: String(edge.id || `e${index + 1}`),
      source: String(edge.source || ''),
      target: String(edge.target || ''),
      label: edge.label,
      data: edge.data || (edge.label ? { label: edge.label } : undefined)
    })).filter((edge) => edge.source && edge.target)
  };
}

function validateWorkflow(workflow) {
  const registry = require('../nodes/registry');
  const normalized = normalizeWorkflow(workflow);
  const warnings = [];
  const errors = [];
  const nodeIds = new Set(normalized.nodes.map((node) => node.id));

  if (normalized.nodes.length === 0) errors.push('Workflow must include at least one node.');
  if (!Array.isArray(workflow?.edges)) errors.push('Workflow must include an edges array.');

  normalized.nodes.forEach((node) => {
    const nodeType = node.data?.type || node.type;
    if (!registry.get(nodeType)) {
      warnings.push(`Node type "${nodeType}" is not implemented in the backend registry yet.`);
    }

    const schema = registry.get(nodeType)?.configSchema || {};
    Object.entries(schema).forEach(([key, field]) => {
      if (field.required && (node.data.config[key] === undefined || node.data.config[key] === '')) {
        warnings.push(`Node "${node.data.label}" is missing required config "${key}".`);
      }
    });
  });

  normalized.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source)) errors.push(`Edge "${edge.id}" has unknown source "${edge.source}".`);
    if (!nodeIds.has(edge.target)) errors.push(`Edge "${edge.id}" has unknown target "${edge.target}".`);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    workflow: normalized
  };
}

async function repairWorkflow({ userMessage, response, validation, context }) {
  if (validation.valid && validation.warnings.length === 0) return null;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.1,
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `Repair the workflow JSON so it satisfies Flowa's contract. Return ONLY JSON with nodes and edges.

Rules:
- Node shape: {"id":"n1","type":"trigger_webhook","label":"Label","config":{}}
- Edge shape: {"source":"n1","target":"n2"}
- Every edge source and target must exist.
- Prefer node types shown in the context.
- Keep the user's intent.

Context:
${context}`
      },
      {
        role: 'user',
        content: `Original request: ${userMessage}

Invalid response:
${response}

Validation:
${JSON.stringify({ errors: validation.errors, warnings: validation.warnings }, null, 2)}`
      }
    ]
  });

  return completion.choices[0].message.content;
}

function buildSystemPrompt(mode, context) {
  if (mode === 'workflow') {
    return `You are Flowa's workflow builder. Generate automation workflows using only the retrieved context.

Return ONLY valid JSON. No markdown, no explanation.

Required JSON:
{"nodes":[{"id":"n1","type":"node_type","label":"Label","config":{}}],"edges":[{"source":"n1","target":"n2"}]}

Rules:
- Use exact node types from the context whenever possible.
- Include useful config defaults and variable mappings.
- Use {{trigger.body.field}} for webhook payloads.
- Use {{$json.field}} for current input when looping or transforming.
- Every edge source and target must reference an existing node id.
- Prefer simple workflows that can execute in Flowa.

Retrieved context:
${context}`;
  }

  return `You are Flowa's RAG assistant. Answer using the retrieved context about Flowa nodes, patterns, syntax, and platform behavior.

Be practical and concise. Mention exact node types and config fields when useful. If a node may not be implemented, say so.

Retrieved context:
${context}`;
}

async function query(userMessage, conversationHistory = [], mode = 'chat') {
  const store = loadStore();
  if (store.length === 0) throw new Error('RAG store is empty - run /api/rag/ingest first');

  const topDocs = retrieve(userMessage, store, mode === 'workflow' ? 10 : 8);
  const context = topDocs.map((doc) => `[${doc.id} | score ${doc.score}]\n${doc.text}`).join('\n\n---\n\n');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(mode, context) },
      ...conversationHistory.slice(-6),
      { role: 'user', content: userMessage }
    ],
    temperature: mode === 'workflow' ? 0.18 : 0.55,
    max_tokens: mode === 'workflow' ? 2048 : 1024,
  });

  const response = completion.choices[0].message.content;
  const result = {
    response,
    sources: topDocs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      score: doc.score,
      metadata: doc.metadata
    })),
    model: `${DEFAULT_MODEL} (Groq)`,
    mode
  };

  if (mode === 'workflow') {
    const parsed = extractJsonObject(response);
    let validation = validateWorkflow(parsed);
    let repaired = false;

    if (!validation.valid) {
      const repairedResponse = await repairWorkflow({ userMessage, response, validation, context });
      const repairedJson = extractJsonObject(repairedResponse);
      const repairedValidation = validateWorkflow(repairedJson);
      if (repairedValidation.valid) {
        validation = repairedValidation;
        result.response = repairedResponse;
        repaired = true;
      }
    }

    result.workflow = validation.workflow;
    result.validation = {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      repaired
    };
  }

  return result;
}

module.exports = {
  ingest,
  buildKnowledgeBase,
  query,
  loadStore,
  retrieve,
  validateWorkflow,
  extractJsonObject
};

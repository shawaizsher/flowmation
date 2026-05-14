'use strict';
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════
//  Flowa Intelligence Service  —  v2
//  All features are implemented with classical CS algorithms — no LLM APIs.
//
//  Algorithms used:
//    • Keyword-frequency scoring   — generateWorkflow / template matching
//    • Synonym normalization        — validateWorkflowPrompt
//    • Confidence scoring           — validateWorkflowPrompt (3-tier)
//    • DFS (Depth-First Search)    — suggestNodes
//    • A* (h=0 → Dijkstra)         — documentWorkflow
//    • Rule-based pattern matching — explainError, debugNode
//    • Intent classification        — workflowChat (keyword-scored)
// ════════════════════════════════════════════════════════════════════════════


// ── Node catalog ──────────────────────────────────────────────────────────
const NODE_INDEX = [
  // Triggers
  { type: 'trigger_webhook',       cat: 'TRIGGERS',     kw: 'webhook http receive trigger incoming request',            desc: 'Start workflow on incoming HTTP webhook' },
  { type: 'trigger_cron',          cat: 'TRIGGERS',     kw: 'schedule cron recurring timer interval daily weekly',     desc: 'Trigger on a recurring schedule' },
  { type: 'trigger_email',         cat: 'TRIGGERS',     kw: 'email receive inbox trigger imap',                        desc: 'Trigger when a new email arrives' },
  { type: 'trigger_manual',        cat: 'TRIGGERS',     kw: 'manual button click start trigger test',                  desc: 'Start workflow manually' },
  // Google
  { type: 'google_sheets_read',    cat: 'GOOGLE',       kw: 'google sheets read spreadsheet rows data',                desc: 'Read rows from Google Sheets' },
  { type: 'google_sheets_write',   cat: 'GOOGLE',       kw: 'google sheets write append update row spreadsheet',       desc: 'Write or append rows to Google Sheets' },
  { type: 'google_gmail_send',     cat: 'GOOGLE',       kw: 'gmail send email google mail',                            desc: 'Send email via Gmail' },
  { type: 'google_gmail_read',     cat: 'GOOGLE',       kw: 'gmail read email google mail inbox',                      desc: 'Read emails from Gmail' },
  { type: 'google_drive_upload',   cat: 'GOOGLE',       kw: 'google drive upload file store',                          desc: 'Upload file to Google Drive' },
  { type: 'google_calendar_create',cat: 'GOOGLE',       kw: 'google calendar create event meeting schedule',           desc: 'Create calendar event in Google Calendar' },
  { type: 'google_translate',      cat: 'GOOGLE',       kw: 'google translate language text',                          desc: 'Translate text using Google Translate' },
  // AI/ML
  { type: 'openai_chat',           cat: 'AI_ML',        kw: 'openai gpt chat completion llm ai prompt generate text',  desc: 'Chat completion with OpenAI GPT models' },
  { type: 'anthropic_chat',        cat: 'AI_ML',        kw: 'anthropic claude chat completion llm ai prompt',          desc: 'Chat completion with Claude' },
  { type: 'ai_classify',           cat: 'AI_ML',        kw: 'classify categorize label ai sentiment analysis',         desc: 'Classify or categorize text with AI' },
  { type: 'ai_summarize',          cat: 'AI_ML',        kw: 'summarize summary text ai shorten abstract',              desc: 'Summarize text with AI' },
  // Messaging
  { type: 'slack_send',            cat: 'MESSAGING',    kw: 'slack send message channel notify alert',                 desc: 'Send a message to a Slack channel' },
  { type: 'discord_send',          cat: 'MESSAGING',    kw: 'discord send message channel bot notify',                 desc: 'Send a message to Discord' },
  { type: 'telegram_send',         cat: 'MESSAGING',    kw: 'telegram send message bot notify',                        desc: 'Send a message via Telegram bot' },
  { type: 'email_send',            cat: 'MESSAGING',    kw: 'email send smtp notify alert message',                    desc: 'Send an email via SMTP' },
  { type: 'twilio_sms',            cat: 'MESSAGING',    kw: 'twilio sms text message phone notify',                    desc: 'Send SMS via Twilio' },
  // Databases
  { type: 'postgres_query',        cat: 'DATABASES',    kw: 'postgres postgresql sql database query select',           desc: 'Run a SQL query on PostgreSQL' },
  { type: 'postgres_insert',       cat: 'DATABASES',    kw: 'postgres postgresql sql insert write database',           desc: 'Insert rows into PostgreSQL' },
  { type: 'mysql_query',           cat: 'DATABASES',    kw: 'mysql sql database query select',                         desc: 'Run a SQL query on MySQL' },
  { type: 'mongodb_find',          cat: 'DATABASES',    kw: 'mongodb nosql find query document collection',            desc: 'Query documents in MongoDB' },
  { type: 'mongodb_insert',        cat: 'DATABASES',    kw: 'mongodb nosql insert document collection',                desc: 'Insert documents into MongoDB' },
  { type: 'redis_get',             cat: 'DATABASES',    kw: 'redis cache get key value store read',                    desc: 'Get a value from Redis' },
  { type: 'redis_set',             cat: 'DATABASES',    kw: 'redis cache set key value store write',                   desc: 'Set a value in Redis' },
  // Cloud
  { type: 'aws_s3_upload',         cat: 'CLOUD',        kw: 'aws s3 upload file storage bucket amazon',                desc: 'Upload file to AWS S3' },
  { type: 'aws_s3_read',           cat: 'CLOUD',        kw: 'aws s3 read download file storage bucket amazon',         desc: 'Read file from AWS S3' },
  { type: 'github_create_pr',      cat: 'CLOUD',        kw: 'github pull request create code repository',              desc: 'Create a GitHub pull request' },
  { type: 'github_commit',         cat: 'CLOUD',        kw: 'github commit push code repository git',                  desc: 'Commit to a GitHub repository' },
  // HTTP
  { type: 'http_request',          cat: 'HTTP',         kw: 'http request api call get post put delete rest',          desc: 'Make an HTTP request to any URL' },
  { type: 'rest_get',              cat: 'HTTP',         kw: 'rest get api http fetch read',                             desc: 'HTTP GET request' },
  { type: 'rest_post',             cat: 'HTTP',         kw: 'rest post api http send create',                           desc: 'HTTP POST request' },
  // Files
  { type: 'csv_parse',             cat: 'FILES',        kw: 'csv parse read comma separated spreadsheet',              desc: 'Parse CSV data' },
  { type: 'pdf_extract',           cat: 'FILES',        kw: 'pdf extract text parse read document',                    desc: 'Extract text from a PDF' },
  // Transform
  { type: 'transform_set',         cat: 'TRANSFORM',    kw: 'set variable value transform map field',                  desc: 'Set or map data fields' },
  { type: 'json_parse',            cat: 'TRANSFORM',    kw: 'json parse string object convert',                        desc: 'Parse a JSON string' },
  { type: 'code_execute',          cat: 'TRANSFORM',    kw: 'code run execute javascript python custom logic',         desc: 'Run custom code' },
  { type: 'transform_filter',      cat: 'TRANSFORM',    kw: 'filter array data remove where condition',                desc: 'Filter array items by condition' },
  { type: 'transform_split',       cat: 'TRANSFORM',    kw: 'split array divide chunk items',                          desc: 'Split array into batches' },
  { type: 'transform_merge',       cat: 'TRANSFORM',    kw: 'merge combine join objects arrays data',                  desc: 'Merge multiple data objects' },
  // Logic
  { type: 'logic_if',              cat: 'LOGIC',        kw: 'if condition branch decision yes no',                     desc: 'Branch on a condition' },
  { type: 'logic_switch',          cat: 'LOGIC',        kw: 'switch case condition multiple branch route',             desc: 'Route to multiple branches' },
  { type: 'error_handler',         cat: 'LOGIC',        kw: 'error handle catch failure retry',                        desc: 'Handle errors gracefully' },
  { type: 'delay',                 cat: 'LOGIC',        kw: 'delay wait pause sleep timeout',                          desc: 'Pause execution for a duration' },
  { type: 'loop_for_each',         cat: 'LOGIC',        kw: 'loop foreach iterate each item array repeat',             desc: 'Iterate over each item in an array' },
  // CRM
  { type: 'hubspot_contact',       cat: 'CRM',          kw: 'hubspot crm contact lead create update',                  desc: 'Create or update HubSpot contact' },
  { type: 'notion_page',           cat: 'CRM',          kw: 'notion create page document note',                        desc: 'Create a Notion page' },
  // Productivity
  { type: 'jira_create',           cat: 'PRODUCTIVITY', kw: 'jira ticket issue create project management',             desc: 'Create a Jira issue' },
  // Payments
  { type: 'stripe_payment_intent', cat: 'PAYMENTS',     kw: 'stripe payment charge create intent',                     desc: 'Create a Stripe payment intent' },
  // Utilities
  { type: 'console_log',           cat: 'UTILITIES',    kw: 'log debug print output console',                          desc: 'Log a value for debugging' },
  { type: 'date_time',             cat: 'UTILITIES',    kw: 'date time format now current timestamp',                   desc: 'Get or format date/time' },
  { type: 'math_operation',        cat: 'UTILITIES',    kw: 'math calculate arithmetic add multiply',                   desc: 'Perform a math operation' },
  { type: 'wait_approval',         cat: 'UTILITIES',    kw: 'wait approval human review pause manual',                  desc: 'Pause and wait for human approval' },
];

// ── Keyword retrieval ─────────────────────────────────────────────────────
function retrieveNodes(query, topN = 22) {
  const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (tokens.length === 0) return NODE_INDEX.slice(0, topN);

  const scored = NODE_INDEX.map(node => {
    const haystack = `${node.type} ${node.cat} ${node.kw} ${node.desc}`.toLowerCase();
    const score = tokens.reduce((s, t) => s + (haystack.match(new RegExp(t, 'g')) || []).length, 0);
    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN).map(s => s.node);

  if (!top.some(n => n.cat === 'TRIGGERS')) top.push(NODE_INDEX.find(n => n.type === 'trigger_manual'));
  if (!top.some(n => n.cat === 'LOGIC'))    top.push(NODE_INDEX.find(n => n.type === 'logic_if'));

  return top;
}


// ════════════════════════════════════════════════════════════════════════════
//  PART 1 — SAFETY & SYNONYM CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// Keywords that indicate harmful/unsafe automation requests
const SAFETY_KEYWORDS = [
  'hack', 'crack', 'steal credentials', 'phish', 'phishing',
  'spam emails', 'bulk spam', 'mass spam', 'ddos', 'denial of service',
  'exploit', 'malware', 'ransomware', 'brute force', 'bruteforce',
  'credential dump', 'password dump', 'bypass login', 'bypass auth',
  'sql injection', 'drop all tables', 'delete all records', 'wipe database',
  'mass delete', 'scrape without permission',
];

// Synonym map: maps synonymous phrases → canonical term used in detection
const SYNONYM_MAP = {
  notify:      ['alert me', 'inform me', 'ping me', 'send notification', 'push notification', 'send alert', 'send me an alert'],
  email:       ['gmail', 'send mail', 'smtp mail', 'sendgrid', 'mailgun', 'outmail', 'via email', 'by email'],
  database:    ['save to db', 'store in db', 'insert into db', 'write to db', 'mongodb', 'mongo db', 'save in database'],
  crm:         ['save lead', 'add lead', 'capture lead', 'sales contact', 'customer record', 'new contact'],
  schedule:    ['every day', 'every morning', 'each day', 'once a day', 'once a week', 'once a month', 'every week', 'every hour'],
  slack:       ['team channel', 'slack channel', 'workspace message', 'slack workspace'],
  webhook:     ['api trigger', 'http trigger', 'api call received', 'form submitted', 'on form submit'],
  spreadsheet: ['google sheets', 'google sheet', 'excel file', 'airtable base'],
};

// Integration and trigger/action term lists (expanded)
const INTEGRATION_TERMS = [
  'airtable', 'api', 'asana', 'calendar', 'crm', 'database', 'db', 'discord',
  'email', 'file', 'gmail', 'github', 'google', 'hubspot', 'jira', 'mail',
  'mongodb', 'notion', 'postgres', 'redis', 'salesforce', 'sheet', 'sheets',
  'slack', 'spreadsheet', 'stripe', 'telegram', 'trello', 'twilio', 'webhook',
  'http', 'rest', 'sql', 'lead', 'contact', 'schedule', 'notify', 'sms',
  'discord', 'csv', 'pdf', 's3', 'aws', 'github', 'jira', 'notion', 'shopify',
];

const TRIGGER_TERMS = [
  'after', 'daily', 'every', 'hourly', 'new', 'on', 'once', 'received',
  'recurring', 'schedule', 'succeeds', 'trigger', 'updated', 'webhook',
  'weekly', 'when', 'whenever', 'submitted', 'arrives', 'morning', 'monthly',
];

const ACTION_TERMS = [
  'add', 'append', 'call', 'classify', 'create', 'delay', 'filter',
  'generate', 'insert', 'notify', 'post', 'route', 'save', 'send',
  'summarize', 'sync', 'update', 'write', 'store', 'log', 'alert',
  'email', 'message', 'process', 'extract', 'transform', 'fetch', 'read',
  'forward', 'push', 'deliver', 'record', 'archive', 'export', 'import',
];


// ════════════════════════════════════════════════════════════════════════════
//  CORE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function makeEdge(id, source, target) {
  return { id, source, target, type: 'smoothstep', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } };
}

function makeNode(id, x, y, label, type, config = {}) {
  return { id, type: 'flowNode', position: { x, y }, data: { label, type, icon: '🔗', config } };
}

class WorkflowValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkflowValidationError';
    this.statusCode = 400;
  }
}

function tokenizePrompt(prompt) {
  return String(prompt || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term));
}

// Expand common synonyms so detection is more robust
function normalizeSynonyms(text) {
  let normalized = text.toLowerCase();
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const syn of synonyms) {
      const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (normalized.includes(syn)) {
        normalized = normalized.replace(new RegExp(escaped, 'g'), canonical);
      }
    }
  }
  return normalized;
}


// ════════════════════════════════════════════════════════════════════════════
//  PART 3 — SMARTER INTENT DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectWorkflowIntent(text) {
  const t = text.toLowerCase();

  if (/email.{0,20}slack|slack.{0,20}email/.test(t))           return 'email_to_slack_notification';
  if (/webhook.{0,20}email|email.{0,20}webhook/.test(t))       return 'webhook_email';
  if (/(payment|stripe|checkout).{0,30}(email|notify|invoice)/.test(t)) return 'payment_notification';
  if (/(form|lead|signup).{0,30}(crm|hubspot|contact|salesforce)/.test(t)) return 'lead_capture_crm';
  if (/(report|summary|digest).{0,30}(daily|weekly|schedule|cron)/.test(t)) return 'scheduled_report';
  if (/(github|deploy|build|ci).{0,30}(slack|notify|alert)/.test(t)) return 'ci_cd_notification';
  if (/(sheet|spreadsheet).{0,30}(database|db|sync|insert)/.test(t)) return 'sheet_database_sync';
  if (/email.{0,20}summar|summar.{0,20}email/.test(t))         return 'email_summarization';
  if (/(new\s+email|email\s+arrives?|email\s+received)/.test(t)) return 'email_trigger';
  if (/(slack.{0,20}notify|notify.{0,20}slack|send.{0,20}slack)/.test(t)) return 'slack_notification';
  if (/(schedule|cron|daily|weekly|hourly|monthly)/.test(t))   return 'scheduled_automation';
  if (/(webhook|http\s+trigger|api\s+trigger)/.test(t))        return 'webhook_automation';
  if (/(lead|contact|crm|hubspot)/.test(t))                    return 'crm_automation';
  if (/(file|csv|pdf|upload|parse)/.test(t))                   return 'file_processing';
  if (/(stripe|payment|invoice|checkout)/.test(t))             return 'payment_automation';
  if (/(github|git|commit|deploy|build)/.test(t))              return 'devops_automation';

  return 'custom_automation';
}


// ════════════════════════════════════════════════════════════════════════════
//  PART 4 — CLARIFICATION QUESTIONS
// ════════════════════════════════════════════════════════════════════════════

function generateClarificationQuestion(text, missingParts) {
  const t = text.toLowerCase();

  if (missingParts.includes('trigger')) {
    if (/(notification|notify|alert)/.test(t)) {
      return {
        question: 'What should trigger the notification?',
        options: ['New email received', 'Webhook / API call', 'Daily schedule', 'Form submission', 'Payment received'],
      };
    }
    if (/(report|summary|digest|analytics)/.test(t)) {
      return {
        question: 'When should the report be generated?',
        options: ['Daily at 9 AM', 'Weekly on Mondays', 'Monthly on the 1st', 'On-demand via webhook'],
      };
    }
    if (/(save|store|insert|database|crm|lead|contact)/.test(t)) {
      return {
        question: 'What should trigger this save action?',
        options: ['Form submission', 'Webhook / API call', 'New email', 'Scheduled import'],
      };
    }
    if (/email/.test(t)) {
      return {
        question: 'What should trigger the email?',
        options: ['Webhook / API call', 'New form submission', 'Payment received', 'Daily schedule'],
      };
    }
    if (/(slack|discord|telegram|sms)/.test(t)) {
      return {
        question: 'What should trigger the message?',
        options: ['Webhook / API call', 'New email received', 'Payment received', 'Form submission', 'Daily schedule'],
      };
    }
    return {
      question: 'What should trigger this automation?',
      options: ['New email received', 'Webhook / API call', 'Recurring schedule', 'Form submission', 'Payment received'],
    };
  }

  if (missingParts.includes('action') || missingParts.includes('integration')) {
    if (/(lead|contact|prospect|customer)/.test(t)) {
      return {
        question: 'Where would you like to save the leads or contacts?',
        options: ['HubSpot CRM', 'PostgreSQL Database', 'Google Sheets', 'Notion', 'Airtable'],
      };
    }
    if (/(notify|notification|alert)/.test(t)) {
      return {
        question: 'Where should the notification be sent?',
        options: ['Slack channel', 'Email (SMTP)', 'Discord', 'Telegram bot', 'SMS via Twilio'],
      };
    }
    if (/(report|data|result|analytics|summary)/.test(t)) {
      return {
        question: 'Where should the report be delivered?',
        options: ['Email', 'Slack channel', 'Google Sheets', 'Notion page'],
      };
    }
    if (/email/.test(t)) {
      return {
        question: 'What action should happen with the email?',
        options: ['Send a Slack notification', 'Summarize it with AI', 'Save to database', 'Forward as email'],
      };
    }
    if (/(data|record|row)/.test(t)) {
      return {
        question: 'Where should the data be saved?',
        options: ['PostgreSQL database', 'Google Sheets', 'MongoDB', 'Airtable', 'Notion'],
      };
    }
  }

  return {
    question: 'Could you describe your automation in more detail?',
    options: [
      'What triggers it? (email, schedule, webhook…)',
      'What should it do? (send, save, notify…)',
      'Which services? (Slack, Gmail, database…)',
    ],
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  PART 1+2 — INPUT VALIDATION WITH CONFIDENCE SCORING
// ════════════════════════════════════════════════════════════════════════════

/**
 * validateWorkflowPrompt(prompt)
 *
 * Returns a structured validation result instead of throwing.
 * Three confidence tiers:
 *   LOW    → reject, show examples
 *   MEDIUM → ask clarification question
 *   HIGH   → generate workflow
 */
function validateWorkflowPrompt(prompt) {
  const text    = String(prompt || '').trim();
  const lower   = text.toLowerCase();
  const normalized = normalizeSynonyms(lower);

  // ── Safety check first ──────────────────────────────────────────────────
  const unsafeMatch = SAFETY_KEYWORDS.find(kw => lower.includes(kw));
  if (unsafeMatch) {
    return {
      valid:            false,
      confidence:       'low',
      reason:           'Request involves potentially unsafe operations',
      normalizedPrompt: text,
      detectedIntent:   null,
    };
  }

  const tokens        = tokenizePrompt(text);
  const alphaCount    = (text.match(/[a-z]/gi) || []).length;
  const uniqueLetters = new Set((lower.match(/[a-z]/g) || [])).size;

  // ── Hard rejections (LOW confidence) ───────────────────────────────────
  const MEANINGLESS = new Set([
    'automation', 'workflow', 'make workflow', 'create workflow', 'build workflow',
    'automate', 'test', 'qwerty', 'asdf', 'random', 'something', 'whatever',
    'make something', 'build something', 'do something', 'make', 'build', 'create',
    'run', 'start', 'go', 'help',
  ]);

  const greetingOnly       = /^(hi|hello|hey|yo|thanks|thank you|test|ok|okay|sure|yes|no|maybe|please|help|sup|howdy)$/i.test(text.trim());
  const tooShort           = text.length < 8;
  const onlyNumbers        = /^\d+$/.test(text.trim());
  const keyboardMash       = tokens.length <= 2 && uniqueLetters >= 5 && !/[aeiou]/i.test(text) && alphaCount > 3;
  const noAlpha            = alphaCount < 3;
  const genericOnly        = MEANINGLESS.has(text.trim().toLowerCase());
  const noMeaningfulWords  = tokens.length <= 2 && !hasAny(normalized, [...TRIGGER_TERMS, ...ACTION_TERMS, ...INTEGRATION_TERMS]);

  if (greetingOnly || tooShort || onlyNumbers || keyboardMash || noAlpha || genericOnly || noMeaningfulWords) {
    return {
      valid:            false,
      confidence:       'low',
      reason:           'Input is too vague or not related to automation',
      normalizedPrompt: text,
      detectedIntent:   null,
      suggestedClarification: [
        'When I receive an email, send a Slack message',
        'Every day at 9 AM generate a sales report and email it',
        'When a form is submitted, create a HubSpot lead and send a welcome email',
        'When a Stripe payment is received, send an invoice email and log to database',
      ],
    };
  }

  // ── Detect presence of semantic categories ──────────────────────────────
  const detectedIntent = detectWorkflowIntent(normalized);
  const hasTrigger     = hasAny(normalized, TRIGGER_TERMS) || /^(daily|weekly|hourly|monthly|morning)/.test(normalized);
  const hasAction      = hasAny(normalized, ACTION_TERMS);
  const hasIntegration = hasAny(normalized, INTEGRATION_TERMS);

  // ── HIGH confidence: clear recognizable automation patterns ─────────────
  const HIGH_CONFIDENCE_PATTERNS = [
    /daily\s+(email|report|summary|digest|notification)/,
    /weekly\s+(email|report|summary|digest|notification)/,
    /send\s+(email|slack|notification|message|alert)\s+(when|after|if|on|once)/,
    /when\s+.{3,}\s+(received|submitted|arrives?|created?|triggered?).{0,40}send/,
    /when\s+.{3,}\s+(received|submitted|arrives?|created?|triggered?).{0,40}(save|store|insert)/,
    /(payment|order|form|webhook).{0,30}(received|submitted).{0,40}(send|notify|email|slack|create)/,
    /every\s+(day|morning|week|hour|month).{0,40}(report|email|send|generate|sync|notify)/,
    /(new\s+email|email\s+arrives?|email\s+received).{0,40}(send|notify|slack|summarize|forward)/,
    /(github|ci|build|deploy).{0,30}(slack|notify|email|alert)/,
    /(stripe|payment|checkout).{0,30}(email|invoice|notify|slack|log|save)/,
    /(hubspot|crm|lead|contact|salesforce).{0,30}(create|add|save|notify|email|welcome)/,
    /(form|signup|registration).{0,30}(submitted|received).{0,40}(email|slack|crm|notify|save)/,
    /(webhook|http\s+trigger|api).{0,30}(email|slack|database|db|save|notify|create)/,
    /(csv|file|pdf|upload).{0,30}(parse|process|extract|save|insert|database)/,
  ];

  if (hasTrigger && hasAction && hasIntegration) {
    return {
      valid:            true,
      confidence:       'high',
      reason:           'Clear automation intent with trigger, action, and integration',
      normalizedPrompt: text,
      detectedIntent,
    };
  }

  if (HIGH_CONFIDENCE_PATTERNS.some(p => p.test(normalized))) {
    return {
      valid:            true,
      confidence:       'high',
      reason:           'Recognised common automation pattern',
      normalizedPrompt: text,
      detectedIntent,
    };
  }

  // ── MEDIUM confidence: partial intent — ask clarification ───────────────
  const hasPartialShape = (hasTrigger || hasAction) && (hasIntegration || tokens.length >= 4);

  if (hasPartialShape) {
    const missingParts = [];
    if (!hasTrigger)                    missingParts.push('trigger');
    if (!hasAction && !hasIntegration)  missingParts.push('action');

    return {
      valid:            false,
      confidence:       'medium',
      reason:           missingParts.length
        ? `Partially understood — missing: ${missingParts.join(' and ')}`
        : 'Partially understood — ambiguous details',
      normalizedPrompt: text,
      detectedIntent,
      suggestedClarification: missingParts,
    };
  }

  // ── LOW confidence fallback ─────────────────────────────────────────────
  return {
    valid:            false,
    confidence:       'low',
    reason:           'Cannot determine clear automation intent',
    normalizedPrompt: text,
    detectedIntent:   null,
    suggestedClarification: [
      'When I receive an email, send a Slack message',
      'Every day at 9 AM generate a sales report and email it',
      'When a form is submitted, create a HubSpot lead',
    ],
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  PART 6 — WORKFLOW QUALITY IMPROVEMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * optimizeWorkflowGraph(nodes, edges)
 *
 * Cleans up generated graphs:
 *  1. Deduplicate singleton-type trigger nodes
 *  2. Remove edges pointing to removed nodes
 *  3. Ensure at least one trigger exists
 *  4. Remove simple A→B→A back-edges (unintentional loops)
 */
function optimizeWorkflowGraph(nodes, edges) {
  // Deduplicate trigger nodes (only one of each trigger type)
  const singletonTriggers = new Set(['trigger_webhook', 'trigger_cron', 'trigger_email', 'trigger_manual']);
  const seenTypes = new Set();
  const deduped = nodes.filter(n => {
    const type = n.data?.type || '';
    if (singletonTriggers.has(type)) {
      if (seenTypes.has(type)) return false;
    }
    seenTypes.add(type);
    return true;
  });

  // Drop edges pointing to removed nodes
  const nodeIds = new Set(deduped.map(n => n.id));
  let validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  // Ensure a trigger exists
  const hasTrigger = deduped.some(n => (n.data?.type || '').includes('trigger'));
  if (!hasTrigger && deduped.length > 0) {
    const trigger = makeNode('n-auto-trigger', 100, 220, 'Manual Trigger', 'trigger_manual', {});
    const firstId = deduped[0].id;
    deduped.unshift(trigger);
    validEdges.unshift(makeEdge('e-auto-trigger', 'n-auto-trigger', firstId));
  }

  // Remove direct back-edges (A→B and B→A simultaneously → remove B→A)
  const forwardPairs = new Set(validEdges.map(e => `${e.source}→${e.target}`));
  validEdges = validEdges.filter(e => {
    const reverseKey = `${e.target}→${e.source}`;
    return !forwardPairs.has(reverseKey) || e.source < e.target;
  });

  return { nodes: deduped, edges: validEdges };
}

/**
 * buildWorkflowSummary(prompt, nodes)
 *
 * Generates a human-readable one-liner describing what the workflow does.
 */
function buildWorkflowSummary(prompt, nodes) {
  const trigger = nodes.find(n => (n.data?.type || '').includes('trigger'));
  const actions = nodes.filter(n => {
    const t = n.data?.type || '';
    return !t.includes('trigger') && t !== 'transform_set' && t !== 'console_log';
  });

  const triggerLabel = trigger?.data?.label || 'A trigger event';
  const actionLabels = actions.map(n => n.data?.label || n.data?.type).filter(Boolean);

  if (actionLabels.length === 0) return `${triggerLabel} starts the workflow.`;
  if (actionLabels.length === 1) return `${triggerLabel} → ${actionLabels[0]}.`;
  const last = actionLabels[actionLabels.length - 1];
  const rest = actionLabels.slice(0, -1).join(' → ');
  return `${triggerLabel} → ${rest} → ${last}.`;
}

/**
 * buildWorkflowExplanation(nodes)
 *
 * Returns an array of plain-English descriptions for each node.
 */
function buildWorkflowExplanation(nodes) {
  return nodes.map(n => {
    const type  = n.data?.type || '';
    const label = n.data?.label || type;
    const entry = NODE_INDEX.find(ni => ni.type === type);
    return `${label}: ${entry ? entry.desc : 'Workflow step'}`;
  });
}


// ════════════════════════════════════════════════════════════════════════════
//  WORKFLOW BUILDER  (internal — called after validation passes)
// ════════════════════════════════════════════════════════════════════════════

function inferTrigger(prompt) {
  const lower = prompt.toLowerCase();

  if (/(every|daily|morning|weekly|hourly|schedule|cron)/.test(lower)) {
    let expression = '0 9 * * *';
    if (/hourly|every hour/.test(lower))  expression = '0 * * * *';
    if (/weekly|every week/.test(lower))  expression = '0 9 * * 1';
    if (/monthly|every month/.test(lower)) expression = '0 9 1 * *';
    if (/morning/.test(lower))            expression = '0 8 * * *';
    return makeNode('n1', 100, 220, 'Schedule Trigger', 'trigger_cron', { expression });
  }

  if (/(gmail|email|mail|inbox|unread).*(new|received|arrives)|new .*?(gmail|email|mail)/.test(lower)) {
    return makeNode('n1', 100, 220, 'New Email Trigger', 'trigger_email', {
      mailbox: 'INBOX',
      unreadOnly: lower.includes('unread'),
    });
  }

  if (/stripe|payment|checkout/.test(lower)) {
    return makeNode('n1', 100, 220, 'Stripe Event Webhook', 'trigger_webhook', {
      event: lower.includes('succeed') ? 'payment_intent.succeeded' : 'stripe.event',
    });
  }

  if (/hubspot|lead|crm|form|submission|contact/.test(lower)) {
    return makeNode('n1', 100, 220, 'Lead Capture Trigger', 'trigger_webhook', {
      source: lower.includes('hubspot') ? 'HubSpot' : 'Form or CRM webhook',
    });
  }

  if (/github|pull request|commit|deployment|build/.test(lower)) {
    return makeNode('n1', 100, 220, 'GitHub Webhook', 'trigger_webhook', { source: 'GitHub' });
  }

  return makeNode('n1', 100, 220, 'Webhook Trigger', 'trigger_webhook', {});
}

function actionNodeFor(prompt, action, id, x, y) {
  const lower = prompt.toLowerCase();

  switch (action) {
    case 'classify':
      return makeNode(id, x, y, 'Classify with AI', 'ai_classify', {
        input: '{{input}}',
        labels: lower.includes('sentiment') ? ['positive', 'neutral', 'negative'] : [],
      });
    case 'summarize':
      return makeNode(id, x, y, 'Summarize with AI', 'ai_summarize', { input: '{{input}}' });
    case 'gmail_read':
      return makeNode(id, x, y, 'Read Gmail Emails', 'google_gmail_read', {
        mailbox: 'INBOX',
        unreadOnly: lower.includes('unread'),
      });
    case 'slack':
      return makeNode(id, x, y, 'Send Slack Message', 'slack_send', { channel: '#general', message: '{{message}}' });
    case 'discord':
      return makeNode(id, x, y, 'Send Discord Message', 'discord_send', { channel: '', message: '{{message}}' });
    case 'email':
      return makeNode(id, x, y, 'Send Email', 'email_send', { to: '', subject: 'Workflow notification', body: '{{message}}' });
    case 'gmail':
      return makeNode(id, x, y, 'Send Gmail Email', 'google_gmail_send', { to: '', subject: 'Workflow notification', body: '{{message}}' });
    case 'airtable':
      return makeNode(id, x, y, 'Update Airtable', 'http_request', {
        method: 'PATCH',
        url: 'https://api.airtable.com/v0/{baseId}/{tableName}',
        body: '{{data}}',
      });
    case 'sheet':
      return makeNode(id, x, y, 'Update Google Sheets', 'google_sheets_write', { spreadsheetId: '', range: '', values: '{{data}}' });
    case 'database':
      return makeNode(id, x, y, 'Insert Database Record', 'postgres_insert', { table: '', data: '{{data}}' });
    case 'hubspot':
      return makeNode(id, x, y, 'Create HubSpot Contact', 'hubspot_contact', { email: '{{email}}', name: '{{name}}' });
    case 'jira':
      return makeNode(id, x, y, 'Create Jira Issue', 'jira_create', { project: '', summary: '{{summary}}' });
    case 'notion':
      return makeNode(id, x, y, 'Create Notion Page', 'notion_page', { title: '{{title}}', content: '{{content}}' });
    case 'http':
      return makeNode(id, x, y, 'Call External API', 'http_request', { method: 'POST', url: '', body: '{{data}}' });
    case 'delay':
      return makeNode(id, x, y, 'Delay', 'delay', {
        duration: lower.match(/(\d+)\s*(minute|minutes|min|hour|hours|day|days)/)?.[0] || '5 minutes',
      });
    case 'telegram':
      return makeNode(id, x, y, 'Send Telegram Message', 'telegram_send', { chatId: '', message: '{{message}}' });
    case 'sms':
      return makeNode(id, x, y, 'Send SMS', 'twilio_sms', { to: '', message: '{{message}}' });
    default:
      return makeNode(id, x, y, 'Prepare Data', 'transform_set', { mapping: '{}' });
  }
}

function inferActions(prompt) {
  const lower = prompt.toLowerCase();
  const actions = [];

  if (/(gmail|email|mail).*(read|unread|inbox|summar)|(?:read|unread|inbox|summar).*?(gmail|email|mail)/.test(lower)) actions.push('gmail_read');
  if (/classif|categor|sentiment|label/.test(lower))   actions.push('classify');
  if (/summar/.test(lower))                              actions.push('summarize');
  if (/delay|wait|pause/.test(lower))                   actions.push('delay');
  if (/hubspot/.test(lower))                             actions.push('hubspot');
  if (/airtable/.test(lower))                            actions.push('airtable');
  if (/spreadsheet|google\s+sheet|sheets/.test(lower))  actions.push('sheet');
  if (/database|postgres|sql|store|save|insert/.test(lower)) actions.push('database');
  if (/jira|ticket|issue/.test(lower))                  actions.push('jira');
  if (/notion/.test(lower))                              actions.push('notion');
  if (/telegram/.test(lower))                            actions.push('telegram');
  if (/sms|twilio|text\s+message/.test(lower))           actions.push('sms');
  if (/api|http|webhook\s+response|call/.test(lower) && !lower.includes('webhook is received')) actions.push('http');
  if (/send.*gmail|gmail.*send.*(email|mail)/.test(lower)) actions.push('gmail');
  else if (/(send|notify|alert).*\b(email|mail)\b|\b(email|mail)\b.*(send|notify|alert)/.test(lower)) actions.push('email');
  if (/slack/.test(lower))   actions.push('slack');
  if (/discord/.test(lower)) actions.push('discord');

  return [...new Set(actions)];
}

function inferCondition(prompt) {
  const lower = prompt.toLowerCase();
  if (/\bif\b|only if|when .* negative|unless|where|filter/.test(lower)) {
    let condition = '{{condition}}';
    if (/negative/.test(lower))                          condition = '{{classification}} === "negative"';
    if (/payment.*succeed|succeeded|success/.test(lower)) condition = '{{payment.status}} === "succeeded"';
    if (/high[- ]?value|qualified|hot lead/.test(lower)) condition = '{{lead.score}} >= 80';
    return { label: 'Check Condition', condition };
  }
  return null;
}

// Internal workflow builder — validation happens upstream in generateWorkflow()
function buildAutomationWorkflow(prompt) {
  const nodes = [inferTrigger(prompt)];
  const edges = [];
  let previousId = 'n1';
  let nextIndex  = 2;
  let x          = 390;

  const actions = inferActions(prompt);
  if (actions.length === 0) {
    throw new WorkflowValidationError(
      'Please include at least one action such as: send, update, create, summarize, classify, or notify.'
    );
  }

  // Source/read nodes first
  const sourceActions = actions.filter(a => a === 'gmail_read');
  for (const action of sourceActions) {
    const id = `n${nextIndex++}`;
    nodes.push(actionNodeFor(prompt, action, id, x, 220));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  // Transform node when output actions are present
  const needsTransform = actions.some(a =>
    ['slack', 'discord', 'email', 'gmail', 'sheet', 'database', 'hubspot',
     'jira', 'notion', 'http', 'airtable', 'telegram', 'sms'].includes(a)
  );
  if (needsTransform) {
    const id = `n${nextIndex++}`;
    nodes.push(makeNode(id, x, 220, 'Prepare Data', 'transform_set', { mapping: '{}' }));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  // Analysis/processing nodes
  const analysisActions = actions.filter(a => ['classify', 'summarize', 'delay'].includes(a));
  for (const action of analysisActions) {
    const id = `n${nextIndex++}`;
    nodes.push(actionNodeFor(prompt, action, id, x, 220));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  // Optional condition branch
  const condition = inferCondition(prompt);
  if (condition) {
    const id = `n${nextIndex++}`;
    nodes.push(makeNode(id, x, 220, condition.label, 'logic_if', { condition: condition.condition }));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  // Output/destination nodes
  const outputActions = actions.filter(a => !['gmail_read', 'classify', 'summarize', 'delay'].includes(a));
  for (const [i, action] of outputActions.entries()) {
    const id = `n${nextIndex++}`;
    const y  = condition && outputActions.length > 1 ? 120 + (i * 180) : 220;
    nodes.push(actionNodeFor(prompt, action, id, x, y));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
  }

  return {
    name: 'Generated Automation Workflow',
    description: `Generated from: ${prompt}`,
    graph: { nodes, edges },
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  WORKFLOW TEMPLATES  (used by workflowChat "generate" fallback)
// ════════════════════════════════════════════════════════════════════════════

const WORKFLOW_TEMPLATES = [
  {
    name: 'Email Automation',
    keywords: ['email', 'mail', 'smtp', 'send', 'notify', 'notification', 'alert', 'message', 'inbox'],
    description: 'Trigger on webhook, transform payload, then send an email notification.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Webhook Trigger', 'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Transform Data',  'transform_set',   { mapping: '{}' }),
        makeNode('n3', 700, 200, 'Send Email',       'email_send',      { to: '', subject: 'Notification', body: '{{data}}' }),
        makeNode('n4', 700, 380, 'Error Handler',    'error_handler',   { retries: 2 }),
      ],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n3', 'n4')],
    },
  },
  {
    name: 'Slack Notification',
    keywords: ['slack', 'channel', 'message', 'notify', 'alert', 'team', 'chat', 'notification'],
    description: 'Trigger on webhook, format a message, post it to a Slack channel.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Webhook Trigger', 'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Format Message',  'transform_set',   { mapping: '{}' }),
        makeNode('n3', 700, 200, 'Send to Slack',   'slack_send',      { channel: '#general', message: '{{message}}' }),
      ],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3')],
    },
  },
  {
    name: 'Scheduled Data Pipeline',
    keywords: ['schedule', 'cron', 'daily', 'weekly', 'recurring', 'pipeline', 'sync', 'fetch', 'api', 'database', 'db', 'store', 'save'],
    description: 'Cron-triggered pipeline: fetch data via HTTP, transform it, insert into database.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Cron Trigger',   'trigger_cron',    { expression: '0 9 * * *' }),
        makeNode('n2', 400, 200, 'Fetch Data',      'http_request',    { method: 'GET', url: '' }),
        makeNode('n3', 700, 200, 'Parse Response',  'json_parse',      {}),
        makeNode('n4', 700, 380, 'Filter Records',  'transform_filter',{ condition: '' }),
        makeNode('n5', 1000, 280,'Insert to DB',    'postgres_insert', { table: '', data: '{{records}}' }),
        makeNode('n6', 1000, 440,'Log Result',       'console_log',     { message: 'Pipeline complete' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n3', 'n4'),
        makeEdge('e4', 'n4', 'n5'), makeEdge('e5', 'n5', 'n6'),
      ],
    },
  },
  {
    name: 'E-commerce Order Processing',
    keywords: ['order', 'purchase', 'ecommerce', 'shop', 'shopify', 'woocommerce', 'payment', 'stripe', 'checkout', 'customer', 'inventory'],
    description: 'On new order webhook: validate, send confirmation email, and log to database.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Order Webhook',     'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Validate Order',    'logic_if',        { condition: '{{order.total}} > 0' }),
        makeNode('n3', 700, 100, 'Send Confirmation', 'email_send',      { to: '{{order.email}}', subject: 'Order Confirmed', body: 'Thank you!' }),
        makeNode('n4', 700, 300, 'Log to Database',   'postgres_insert', { table: 'orders', data: '{{order}}' }),
        makeNode('n5', 1000, 200,'Send Slack Alert',  'slack_send',      { channel: '#orders', message: 'New order: {{order.id}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n2', 'n4'),
        makeEdge('e4', 'n3', 'n5'), makeEdge('e5', 'n4', 'n5'),
      ],
    },
  },
  {
    name: 'Lead Capture & CRM',
    keywords: ['lead', 'crm', 'contact', 'hubspot', 'salesforce', 'form', 'signup', 'subscribe', 'register', 'user'],
    description: 'Capture form submission, create CRM contact, send welcome email.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Form Webhook',   'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Extract Fields', 'transform_set',   { mapping: '{}' }),
        makeNode('n3', 700, 100, 'Create Contact', 'hubspot_contact', { email: '{{email}}', name: '{{name}}' }),
        makeNode('n4', 700, 300, 'Welcome Email',  'email_send',      { to: '{{email}}', subject: 'Welcome!', body: 'Hi {{name}}' }),
      ],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n2', 'n4')],
    },
  },
  {
    name: 'GitHub CI Notification',
    keywords: ['github', 'git', 'ci', 'deploy', 'build', 'commit', 'pull', 'pr', 'release', 'devops', 'pipeline', 'code'],
    description: 'On GitHub webhook, check status, notify Slack on failure or success.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'GitHub Webhook', 'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Check Status',   'logic_if',        { condition: '{{status}} === "success"' }),
        makeNode('n3', 700, 100, 'Notify Success', 'slack_send',      { channel: '#deploys', message: '✅ Build passed: {{ref}}' }),
        makeNode('n4', 700, 300, 'Notify Failure', 'slack_send',      { channel: '#deploys', message: '❌ Build failed: {{ref}}' }),
        makeNode('n5', 700, 440, 'Log Error',       'console_log',     { message: '{{error}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n2', 'n4'), makeEdge('e4', 'n4', 'n5'),
      ],
    },
  },
  {
    name: 'Report Generation',
    keywords: ['report', 'summary', 'weekly', 'daily', 'monthly', 'digest', 'analytics', 'stats', 'metrics', 'google sheets', 'spreadsheet'],
    description: 'Scheduled report: query database, merge results, email a summary.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Schedule Trigger', 'trigger_cron',    { expression: '0 8 * * 1' }),
        makeNode('n2', 400, 200, 'Query Database',   'postgres_query',  { query: "SELECT * FROM metrics WHERE date >= NOW() - INTERVAL '7 days'" }),
        makeNode('n3', 700, 200, 'Merge Results',    'transform_merge', {}),
        makeNode('n4', 1000, 200,'Email Report',      'email_send',      { to: '', subject: 'Weekly Report', body: '{{report}}' }),
      ],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n3', 'n4')],
    },
  },
  {
    name: 'File Processing Pipeline',
    keywords: ['file', 'csv', 'pdf', 'upload', 'parse', 'process', 'extract', 'document', 'data', 'import'],
    description: 'Webhook triggers file fetch, parses CSV/PDF, stores results in database.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Upload Webhook', 'trigger_webhook',  {}),
        makeNode('n2', 400, 200, 'Fetch File',      'http_request',    { method: 'GET', url: '{{file_url}}' }),
        makeNode('n3', 700, 200, 'Parse CSV',       'csv_parse',       {}),
        makeNode('n4', 1000, 200,'Filter Rows',      'transform_filter',{ condition: '' }),
        makeNode('n5', 1300, 200,'Insert Records',  'postgres_insert', { table: 'imports', data: '{{rows}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n3', 'n4'), makeEdge('e4', 'n4', 'n5'),
      ],
    },
  },
];

function scoreTemplate(template, promptTokens) {
  return template.keywords.reduce((score, kw) => {
    return score + (promptTokens.includes(kw) ? 2 : 0) +
      promptTokens.filter(t => kw.includes(t) || t.includes(kw)).length;
  }, 0);
}

function matchTemplate(prompt) {
  const tokens = prompt.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  let best = null;
  let bestScore = 0;

  for (const tpl of WORKFLOW_TEMPLATES) {
    const s = scoreTemplate(tpl, tokens);
    if (s > bestScore) { bestScore = s; best = tpl; }
  }

  if (best && bestScore >= 2) return best;

  const topNode = retrieveNodes(prompt, 5).find(n => !n.cat.includes('TRIGGERS')) || { type: 'console_log', desc: 'Log output' };
  return {
    name: 'Custom Workflow',
    description: prompt,
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Manual Trigger', 'trigger_manual', {}),
        makeNode('n2', 400, 200, 'Transform Data',  'transform_set',  { mapping: '{}' }),
        makeNode('n3', 700, 200, topNode.desc,       topNode.type,     {}),
      ],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3')],
    },
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  GRAPH UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function buildAdjacencyList(nodes, edges) {
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
  }
  return adj;
}

function analyzeGraphDFS(nodes, edges) {
  const adj     = buildAdjacencyList(nodes, edges);
  const visited = new Set();
  const depth   = {};

  function dfs(id, d) {
    if (visited.has(id)) return;
    visited.add(id);
    depth[id] = d;
    for (const next of (adj[id] || [])) dfs(next, d + 1);
  }

  const triggers = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  const starts   = triggers.length
    ? triggers
    : nodes.filter(n => !edges.some(e => e.target === n.id));

  for (const s of starts) dfs(s.id, 0);

  const maxDepth    = Object.values(depth).reduce((m, v) => Math.max(m, v), 0);
  const unreachable = nodes.filter(n => !visited.has(n.id)).map(n => n.id);

  return { visited, depth, maxDepth, unreachable };
}

function aStarShortestPath(nodes, edges) {
  if (!nodes.length) return [];

  const adj     = buildAdjacencyList(nodes, edges);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const triggers  = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  const startId   = (triggers[0] || nodes[0]).id;
  const terminals = new Set(nodes.filter(n => !(adj[n.id] || []).length).map(n => n.id));

  const g = {};
  nodes.forEach(n => { g[n.id] = Infinity; });
  g[startId] = 0;

  const openSet = new Set([startId]);
  const parent  = { [startId]: null };
  const closed  = new Set();

  while (openSet.size > 0) {
    let curr = null;
    let minF  = Infinity;
    for (const id of openSet) {
      if (g[id] < minF) { minF = g[id]; curr = id; }
    }

    openSet.delete(curr);
    closed.add(curr);

    if (terminals.has(curr)) {
      const path = [];
      let c = curr;
      while (c !== null) { path.unshift(nodeMap[c]); c = parent[c]; }
      return path;
    }

    for (const next of (adj[curr] || [])) {
      if (closed.has(next)) continue;
      const tentativeG = g[curr] + 1;
      if (tentativeG < g[next]) {
        g[next]      = tentativeG;
        parent[next] = curr;
        openSet.add(next);
      }
    }
  }

  const { visited, depth } = analyzeGraphDFS(nodes, edges);
  return [...visited]
    .map(id => ({ id, d: depth[id] || 0 }))
    .sort((a, b) => a.d - b.d)
    .map(({ id }) => nodeMap[id])
    .filter(Boolean);
}


// ════════════════════════════════════════════════════════════════════════════
//  ERROR RULE TABLES
// ════════════════════════════════════════════════════════════════════════════

const NODE_ERROR_RULES = {
  http_request: [
    { patterns: ['ECONNREFUSED', 'ENOTFOUND', 'getaddrinfo'],
      diagnosis:  'The target URL is unreachable.',
      root_cause: 'Connection refused or DNS resolution failed.',
      fix:        { url: 'Verify the URL is correct and the server is running.' },
      prevention: 'Add an Error Handler node after HTTP nodes for network failures.' },
    { patterns: ['401', 'Unauthorized', 'Authentication'],
      diagnosis:  'Authentication failed.',
      root_cause: 'Missing or invalid credentials/API key in the request headers.',
      fix:        { headers: 'Add Authorization header with a valid token.' },
      prevention: 'Store credentials in the Credentials Manager and reference them by name.' },
    { patterns: ['403', 'Forbidden'],
      diagnosis:  'Access denied by the server.',
      root_cause: 'The API key or token does not have permission for this endpoint.',
      fix:        { headers: 'Use a token with the required scope/permission.' },
      prevention: 'Check the API documentation for required OAuth scopes.' },
    { patterns: ['404', 'Not Found'],
      diagnosis:  'Endpoint not found.',
      root_cause: 'The URL path or resource ID does not exist.',
      fix:        { url: 'Double-check the URL path and any dynamic IDs in the request.' },
      prevention: 'Log the full URL before sending to catch typos early.' },
    { patterns: ['429', 'Too Many Requests', 'rate limit'],
      diagnosis:  'Rate limit exceeded.',
      root_cause: 'Too many requests sent to the API in a short window.',
      fix:        { retry: 'Add a Delay node before this node and retry after backoff.' },
      prevention: 'Add a Delay node and use exponential back-off for retry logic.' },
    { patterns: ['500', '502', '503', 'Internal Server Error', 'Bad Gateway'],
      diagnosis:  'The remote server returned an error.',
      root_cause: 'Server-side issue — the API itself is failing.',
      fix:        { retry: 'Retry after a short delay; if persistent, contact the API provider.' },
      prevention: 'Wrap with an Error Handler node and alert your team via Slack.' },
    { patterns: ['timeout', 'ETIMEDOUT', 'ESOCKETTIMEDOUT'],
      diagnosis:  'Request timed out.',
      root_cause: 'The server did not respond in time.',
      fix:        { timeout: 'Increase the request timeout or try a lighter endpoint.' },
      prevention: 'Set a reasonable timeout and add a fallback path using a Logic If node.' },
  ],
  postgres: [
    { patterns: ['syntax error', 'SyntaxError'],
      diagnosis:  'SQL syntax error in the query.',
      root_cause: 'The SQL statement has a syntax mistake.',
      fix:        { query: 'Review the query for missing commas, quotes, or keywords.' },
      prevention: 'Test queries in a database client before pasting them into the node.' },
    { patterns: ['relation does not exist', 'table not found'],
      diagnosis:  'The table or view referenced in the query does not exist.',
      root_cause: 'Wrong table name or missing migration.',
      fix:        { query: 'Check the table name matches exactly (case-sensitive in PostgreSQL).' },
      prevention: 'Run migrations before deploying workflows that reference new tables.' },
    { patterns: ['column', 'does not exist'],
      diagnosis:  'A referenced column does not exist.',
      root_cause: 'Column name mismatch or schema change.',
      fix:        { query: 'Check column names against the actual table schema.' },
      prevention: 'Version your schema changes alongside your workflow changes.' },
    { patterns: ['connection refused', 'ECONNREFUSED', 'ENOTFOUND'],
      diagnosis:  'Cannot connect to the PostgreSQL server.',
      root_cause: 'Wrong host/port or server is not running.',
      fix:        { connection: 'Check the database host, port, and credentials in the node config.' },
      prevention: 'Store DB credentials in the Credentials Manager, not inline in config.' },
    { patterns: ['duplicate key', 'unique constraint'],
      diagnosis:  'Duplicate key violation.',
      root_cause: 'Attempting to insert a record that already exists.',
      fix:        { query: 'Use INSERT ... ON CONFLICT DO NOTHING or UPDATE instead of INSERT.' },
      prevention: 'Add a database lookup step before inserting to check for existing records.' },
  ],
  transform: [
    { patterns: ['Cannot read', 'undefined', 'null', 'TypeError'],
      diagnosis:  'A referenced field is missing or null in the input data.',
      root_cause: 'The expected field does not exist in the incoming data.',
      fix:        { mapping: 'Add a null check or use a default value in your mapping expression.' },
      prevention: 'Use a Logic If node to validate required fields before transformation.' },
    { patterns: ['JSON', 'parse', 'Unexpected token'],
      diagnosis:  'Failed to parse JSON.',
      root_cause: 'The input is not valid JSON.',
      fix:        { input: 'Ensure the upstream node outputs valid JSON, or add a JSON Parse step.' },
      prevention: 'Log the raw output of the previous node to inspect the actual format.' },
  ],
  logic_if: [
    { patterns: ['ReferenceError', 'is not defined'],
      diagnosis:  'A variable used in the condition expression is not defined.',
      root_cause: 'The variable name does not match the actual data field.',
      fix:        { condition: 'Check the field name in the input data and update the condition.' },
      prevention: 'Add a console_log node before the condition to inspect available fields.' },
    { patterns: ['SyntaxError'],
      diagnosis:  'The condition expression has a syntax error.',
      root_cause: 'Invalid JavaScript expression in the condition field.',
      fix:        { condition: 'Use simple comparisons like {{value}} === "x" or {{count}} > 0.' },
      prevention: 'Test conditions in the browser console with sample data before saving.' },
  ],
  email_send: [
    { patterns: ['ECONNREFUSED', 'ENOTFOUND', 'SMTP'],
      diagnosis:  'Cannot connect to the SMTP server.',
      root_cause: 'Wrong SMTP host, port, or the server is not accessible.',
      fix:        { host: 'Verify SMTP host and port. Common ports: 587 (TLS) or 465 (SSL).' },
      prevention: 'Store SMTP credentials in the Credentials Manager.' },
    { patterns: ['invalid login', 'Authentication', '535'],
      diagnosis:  'SMTP authentication failed.',
      root_cause: 'Incorrect username or password for the email account.',
      fix:        { credentials: 'Re-enter the correct email credentials in the Credentials Manager.' },
      prevention: 'Use an app-specific password if 2FA is enabled on the account.' },
    { patterns: ['Invalid address', 'recipient'],
      diagnosis:  'Invalid recipient email address.',
      root_cause: 'The "to" field contains a malformed email address.',
      fix:        { to: 'Validate the recipient address format before sending.' },
      prevention: 'Add an email format validation step using a Logic If node.' },
  ],
  slack: [
    { patterns: ['invalid_token', 'not_authed', '401'],
      diagnosis:  'Invalid Slack token.',
      root_cause: 'The Slack API token is missing, expired, or revoked.',
      fix:        { token: 'Re-create the Slack app token and update it in the Credentials Manager.' },
      prevention: 'Use Slack Bot tokens (xoxb-) rather than legacy tokens.' },
    { patterns: ['channel_not_found'],
      diagnosis:  'Slack channel not found.',
      root_cause: 'The channel name or ID is incorrect, or the bot is not a member.',
      fix:        { channel: 'Invite the bot to the channel and verify the channel name.' },
      prevention: 'Use channel IDs (C0123456) instead of names to avoid renaming issues.' },
  ],
};

function getRulesForNodeType(nodeType) {
  if (!nodeType) return [];
  const t = nodeType.toLowerCase();
  if (t.includes('http') || t.includes('rest') || t.includes('graphql')) return NODE_ERROR_RULES.http_request;
  if (t.includes('postgres') || t.includes('mysql') || t.includes('mongo'))  return NODE_ERROR_RULES.postgres;
  if (t.includes('transform') || t.includes('json') || t.includes('code'))   return NODE_ERROR_RULES.transform;
  if (t.includes('logic') || t.includes('if') || t.includes('switch'))        return NODE_ERROR_RULES.logic_if;
  if (t.includes('email') || t.includes('smtp'))                               return NODE_ERROR_RULES.email_send;
  if (t.includes('slack'))                                                      return NODE_ERROR_RULES.slack;
  return [];
}

function matchErrorRule(rules, errorMsg) {
  if (!errorMsg) return null;
  for (const rule of rules) {
    if (rule.patterns.some(p => errorMsg.includes(p))) return rule;
  }
  return null;
}


// ════════════════════════════════════════════════════════════════════════════
//  CHAT INTENT SYSTEM  (used by workflowChat)
// ════════════════════════════════════════════════════════════════════════════

const CHAT_INTENTS = [
  { name: 'generate',    weight: 3, keywords: ['build', 'create', 'make', 'generate', 'set up', 'start', 'automate', 'workflow for', 'new workflow'] },
  { name: 'add_node',    weight: 2, keywords: ['add', 'insert', 'put', 'place', 'new node', 'append'] },
  { name: 'remove_node', weight: 2, keywords: ['remove', 'delete', 'drop', 'get rid', 'eliminate'] },
  { name: 'connect',     weight: 2, keywords: ['connect', 'link', 'wire', 'join', 'attach', 'edge between'] },
  { name: 'explain',     weight: 1, keywords: ['what is', 'what does', 'explain', 'how does', 'describe', 'tell me'] },
  { name: 'help',        weight: 1, keywords: ['help', 'what can you', 'capabilities', 'commands', 'how to'] },
  { name: 'clear',       weight: 3, keywords: ['clear', 'reset', 'start over', 'empty', 'wipe', 'start fresh'] },
];

// Renamed from detectIntent to avoid collision with detectWorkflowIntent
function detectChatIntent(message) {
  const lower = message.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const intent of CHAT_INTENTS) {
    const hits  = intent.keywords.filter(k => lower.includes(k)).length;
    const score = hits * intent.weight;
    if (score > bestScore) { bestScore = score; best = intent.name; }
  }
  return bestScore > 0 ? best : 'unknown';
}

function extractNodeType(message) {
  const top = retrieveNodes(message, 3);
  return top.length ? top[0].type : 'console_log';
}

const CHAT_HELP_TEXT =
  'I can help you build and modify workflow automations. Try:\n' +
  '• "When a webhook is received, send a Slack message"\n' +
  '• "Every day generate a sales report and email it"\n' +
  '• "Add an email node"\n' +
  '• "Remove the transform node"\n' +
  '• "Clear the canvas"\n\n' +
  'Be specific about what triggers the workflow and what it should do.';


// ════════════════════════════════════════════════════════════════════════════
//  APPLY WORKFLOW TOOL
// ════════════════════════════════════════════════════════════════════════════

function applyWorkflowTool(workflow, toolName, input) {
  const nodes = [...workflow.nodes];
  const edges = [...workflow.edges];

  switch (toolName) {
    case 'set_workflow':
      return {
        nodes: (input.nodes || []).map(n => ({
          ...n,
          type: 'flowNode',
          data: { ...(n.data || {}), type: n.data?.type || n.type || 'unknown', icon: n.data?.icon || '🔗', config: n.data?.config || {} },
        })),
        edges: (input.edges || []).map(e => ({
          ...e, type: e.type || 'smoothstep', animated: e.animated !== undefined ? e.animated : true,
          style: e.style || { stroke: '#64748b', strokeWidth: 2 },
        })),
      };

    case 'add_node':
      return {
        nodes: [...nodes, {
          id: input.id,
          type: 'flowNode',
          position: input.position,
          data: { label: input.label, type: input.nodeType, icon: '🔗', config: input.config || {} },
        }],
        edges,
      };

    case 'update_node':
      return {
        nodes: nodes.map(n => n.id !== input.id ? n : {
          ...n,
          data: { ...n.data, ...(input.label ? { label: input.label } : {}), config: { ...(n.data?.config || {}), ...(input.config || {}) } },
        }),
        edges,
      };

    case 'remove_node':
      return {
        nodes: nodes.filter(n => n.id !== input.id),
        edges: edges.filter(e => e.source !== input.id && e.target !== input.id),
      };

    case 'add_edge': {
      if (edges.some(e => e.source === input.source && e.target === input.target)) return { nodes, edges };
      return {
        nodes,
        edges: [...edges, {
          id: `edge-${input.source}-${input.target}`,
          source: input.source,
          target: input.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }],
      };
    }

    case 'remove_edge':
      return { nodes, edges: edges.filter(e => e.id !== input.id) };

    default:
      return { nodes, edges };
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC SERVICE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * generateWorkflow(prompt)
 *
 * Returns a structured response — never throws.
 * Response types:
 *   { success: true,  type: 'workflow_generated', confidence, summary, detectedIntent, workflowExplanation, graph, ... }
 *   { success: false, type: 'invalid_input',       error, suggestions }
 *   { success: false, type: 'unsafe_request',      error }
 *   { success: false, type: 'clarification_needed', confidence, question, options, detectedIntent }
 */
async function generateWorkflow(prompt) {
  // ── Step 1: Validate ────────────────────────────────────────────────────
  const validation = validateWorkflowPrompt(prompt);

  // Safety rejection
  if (!validation.valid && validation.reason.includes('unsafe')) {
    return {
      success:  false,
      type:     'unsafe_request',
      error:    'This request involves potentially harmful operations and cannot be processed.',
      graph:    null,
      nodes:    [],
      edges:    [],
    };
  }

  // LOW confidence — outright reject
  if (!validation.valid && validation.confidence === 'low') {
    return {
      success:     false,
      type:        'invalid_input',
      error:       'Invalid input. Please describe a real automation workflow in plain English.',
      suggestions: validation.suggestedClarification || [
        'When I receive an email, send a Slack message',
        'Every day generate a report and email it',
        'When a form is submitted, create a CRM lead',
      ],
      graph:  null,
      nodes:  [],
      edges:  [],
    };
  }

  // MEDIUM confidence — ask for clarification
  if (!validation.valid && validation.confidence === 'medium') {
    const clarification = generateClarificationQuestion(
      prompt,
      Array.isArray(validation.suggestedClarification) ? validation.suggestedClarification : []
    );
    return {
      success:        false,
      type:           'clarification_needed',
      confidence:     'medium',
      detectedIntent: validation.detectedIntent,
      question:       clarification.question,
      options:        clarification.options,
      graph:          null,
      nodes:          [],
      edges:          [],
    };
  }

  // ── Step 2: Build workflow (HIGH confidence) ────────────────────────────
  try {
    const tpl = buildAutomationWorkflow(prompt);

    // ── Step 3: Optimize graph quality ─────────────────────────────────────
    const { nodes, edges } = optimizeWorkflowGraph(tpl.graph.nodes, tpl.graph.edges);

    // ── Step 4: Build human-readable output ────────────────────────────────
    const summary             = buildWorkflowSummary(prompt, nodes);
    const workflowExplanation = buildWorkflowExplanation(nodes);

    logger.info(`[intelligence] generateWorkflow: "${tpl.name}" (${nodes.length} nodes, confidence: ${validation.confidence})`);

    return {
      success:             true,
      type:                'workflow_generated',
      confidence:          validation.confidence,
      summary,
      detectedIntent:      validation.detectedIntent,
      workflowExplanation,
      graph:               { nodes, edges },
      description:         tpl.description || prompt,
      model:               'deterministic-workflow-generator',
      tokensUsed:          0,
    };
  } catch (err) {
    // buildAutomationWorkflow threw (e.g., no actions found) — ask for clarification
    if (err instanceof WorkflowValidationError) {
      const clarification = generateClarificationQuestion(prompt, ['action']);
      return {
        success:        false,
        type:           'clarification_needed',
        confidence:     'medium',
        detectedIntent: validation.detectedIntent,
        question:       clarification.question,
        options:        clarification.options,
        graph:          null,
        nodes:          [],
        edges:          [],
      };
    }

    // Unexpected error — safe fallback
    logger.error('[intelligence] generateWorkflow unexpected error:', err);
    const fallbackNodes = [
      makeNode('n1', 100, 200, 'Manual Trigger', 'trigger_manual', {}),
      makeNode('n2', 400, 200, 'Log Output',      'console_log',   { message: `Workflow: ${prompt}` }),
    ];
    const fallbackEdges = [makeEdge('e1', 'n1', 'n2')];
    return {
      success:             true,
      type:                'workflow_generated',
      confidence:          'low',
      summary:             'A simple manual workflow was created as a starting point.',
      detectedIntent:      'custom_automation',
      workflowExplanation: ['Manual Trigger: Start workflow manually', 'Log Output: Log a value for debugging'],
      graph:               { nodes: fallbackNodes, edges: fallbackEdges },
      description:         prompt,
      model:               'fallback',
      tokensUsed:          0,
    };
  }
}

/**
 * explainError — rule-based pattern matching on error + node type.
 */
async function explainError(execution, failedLogs) {
  try {
    if (!failedLogs.length) {
      return {
        summary:    execution.error || 'Execution failed with no node-level detail.',
        root_cause: 'Unknown — no failed node logs were recorded.',
        suggestions: ['Check the workflow trigger configuration.', 'Inspect the execution logs for more detail.'],
      };
    }

    const first    = failedLogs[0];
    const nodeType = first.node_type || '';
    const errorMsg = first.error    || '';
    const rules    = getRulesForNodeType(nodeType);
    const matched  = matchErrorRule(rules, errorMsg);

    if (matched) {
      return {
        summary:    `${first.node_label || nodeType} failed: ${matched.diagnosis}`,
        root_cause: matched.root_cause,
        suggestions: [
          Object.values(matched.fix)[0],
          matched.prevention,
          `Check node "${first.node_label}" configuration in the editor.`,
        ],
      };
    }

    const suggestions = failedLogs.slice(0, 3).map(l =>
      `Node "${l.node_label}" (${l.node_type}): ${l.error || 'unknown error'}`
    );
    suggestions.push('Open the editor, click the failed node, and review its config.');

    return {
      summary:    `Execution failed at "${first.node_label}" with: ${errorMsg || 'unknown error'}`,
      root_cause: errorMsg || 'See node-level error above.',
      suggestions,
    };
  } catch (err) {
    logger.error('[intelligence] explainError error:', err);
    return {
      summary:    execution.error || 'Execution failed.',
      root_cause: failedLogs[0]?.error || 'Unknown error.',
      suggestions: ['Check the failed node configuration.', 'Verify input data format.'],
    };
  }
}

/**
 * debugNode — rule-based lookup table keyed by node type + error pattern.
 */
async function debugNode({ nodeType, nodeLabel, config, error, input, configSchema }) {
  try {
    const rules   = getRulesForNodeType(nodeType || '');
    const matched = matchErrorRule(rules, error || '');

    if (matched) {
      return {
        diagnosis:  matched.diagnosis,
        root_cause: matched.root_cause,
        fix:        matched.fix,
        explanation:`${matched.diagnosis} ${matched.root_cause}`,
        prevention: matched.prevention,
        model:      'rule-engine',
        tokensUsed: 0,
      };
    }

    const category = getRulesForNodeType(nodeType || '').length ? nodeType : 'this node type';
    return {
      diagnosis:  `"${nodeLabel || nodeType}" failed with: ${error || 'an unknown error'}`,
      root_cause: error || 'Could not determine root cause automatically.',
      fix:        { config: 'Review all required fields in the node configuration panel.' },
      explanation:`No specific rule matched for ${category}. The error message is: "${error}".`,
      prevention: 'Add an Error Handler node after this node to catch future failures gracefully.',
      model:      'rule-engine',
      tokensUsed: 0,
    };
  } catch (err) {
    logger.error('[intelligence] debugNode error:', err);
    return {
      diagnosis:  `Node "${nodeLabel}" (${nodeType}) failed.`,
      root_cause: error || 'Unknown',
      fix:        {},
      explanation:'Could not auto-diagnose. Check the error message and node config.',
      prevention: 'Ensure all required fields are properly configured.',
      model:      'fallback',
      tokensUsed: 0,
    };
  }
}

/**
 * suggestNodes — DFS-based structural analysis with improvement rules.
 */
async function suggestNodes(graph) {
  try {
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    if (nodes.length < 2) {
      return [
        { type: 'transform_set', reason: 'Add a Transform node to map incoming data to the format you need.' },
        { type: 'error_handler', reason: 'Add an Error Handler to catch failures gracefully.' },
      ];
    }

    const types              = nodes.map(n => (n.data?.type || n.type || '').toLowerCase());
    const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);
    const suggestions        = [];

    if (!types.some(t => t === 'error_handler')) {
      suggestions.push({ type: 'error_handler', reason: 'No error handling detected — add one to catch failures and retry gracefully.' });
    }

    const hasHttp      = types.some(t => t.includes('http') || t.startsWith('rest_'));
    const hasTransform = types.some(t => t.includes('transform') || t === 'json_parse');
    if (hasHttp && !hasTransform) {
      suggestions.push({ type: 'transform_set', reason: 'HTTP responses often need field mapping before the next step — add a Transform node.' });
    }

    const hasBranch = types.some(t => t === 'logic_if' || t === 'logic_switch');
    if (maxDepth > 4 && !hasBranch) {
      suggestions.push({ type: 'logic_if', reason: `Chain is ${maxDepth} steps deep with no branching — add a Logic If node to handle edge cases.` });
    }

    if (!types.some(t => t === 'console_log') && nodes.length > 3) {
      suggestions.push({ type: 'console_log', reason: 'No logging nodes found — add one to track execution state and simplify debugging.' });
    }

    if (unreachable.length > 0) {
      const label = nodes.find(n => n.id === unreachable[0])?.data?.label || unreachable[0];
      suggestions.push({ type: 'error_handler', reason: `Node "${label}" is disconnected from the trigger — connect or remove it.` });
    }

    return suggestions.slice(0, 3).length
      ? suggestions.slice(0, 3)
      : [
          { type: 'delay',       reason: 'Add a Delay node to throttle execution and avoid hitting rate limits.' },
          { type: 'console_log', reason: 'Add logging to monitor output at each stage.' },
        ];
  } catch (err) {
    logger.error('[intelligence] suggestNodes error:', err);
    return [
      { type: 'error_handler', reason: 'Add error handling for reliability.' },
      { type: 'console_log',   reason: 'Add logging for debugging.' },
    ];
  }
}

/**
 * documentWorkflow — A* shortest-path ordering for step documentation.
 */
async function documentWorkflow(workflow) {
  try {
    const graphData = typeof workflow.graph === 'string'
      ? JSON.parse(workflow.graph)
      : (workflow.graph || { nodes: [], edges: [] });

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    const path  = aStarShortestPath(nodes, edges);
    const steps = path.map((n, i) => ({
      node:        n?.data?.label || n?.id || `Step ${i + 1}`,
      description: n?.data?.type
        ? `${n.data.type} — ${NODE_INDEX.find(ni => ni.type === n.data.type)?.desc || 'workflow step'}`
        : 'Workflow step',
    }));

    const triggerNode   = nodes.find(n => (n.data?.type || n.type || '').includes('trigger'));
    const terminalNodes = nodes.filter(n => !edges.some(e => e.source === n.id));

    const inputs  = triggerNode
      ? [`Triggered by: ${triggerNode.data?.type || 'trigger'} — ${triggerNode.data?.label || ''}`]
      : ['Manual or external trigger'];

    const outputs = terminalNodes.length
      ? terminalNodes.map(n => n.data?.label || n.data?.type || 'Output')
      : ['Workflow output'];

    return {
      title:       workflow.name || 'Untitled Workflow',
      description: workflow.description || `Automation workflow with ${nodes.length} nodes and ${edges.length} connections.`,
      steps,
      inputs,
      outputs,
    };
  } catch (err) {
    logger.error('[intelligence] documentWorkflow error:', err);
    return {
      title:       workflow.name || 'Untitled Workflow',
      description: workflow.description || '',
      steps:       [],
      inputs:      [],
      outputs:     [],
    };
  }
}

/**
 * workflowChat — conversational AI assistant with intent classification.
 *
 * Intent: generate → validates prompt first, then builds or asks clarification
 * Intent: add_node / remove_node / connect / clear / explain / help → direct graph ops
 */
async function workflowChat({ message, history, workflow }) {
  try {
    const intent = detectChatIntent(message);
    const nodes  = workflow?.nodes || [];
    const edges  = workflow?.edges || [];
    let updatedWorkflow = null;
    let reply           = '';

    switch (intent) {
      // ── GENERATE ───────────────────────────────────────────────────────
      case 'generate': {
        const validation = validateWorkflowPrompt(message);

        // Safety check
        if (!validation.valid && validation.reason.includes('unsafe')) {
          reply = 'I cannot help with that request — it involves potentially harmful operations.';
          break;
        }

        // LOW confidence
        if (!validation.valid && validation.confidence === 'low') {
          const examples = (validation.suggestedClarification || []).slice(0, 3);
          reply = [
            'I need a clearer description of what you want to automate. Here are some examples:',
            ...examples.map(e => `  • ${e}`),
          ].join('\n');
          break;
        }

        // MEDIUM confidence — ask clarification
        if (!validation.valid && validation.confidence === 'medium') {
          const clarification = generateClarificationQuestion(
            message,
            Array.isArray(validation.suggestedClarification) ? validation.suggestedClarification : []
          );
          reply = `${clarification.question}\n\n${clarification.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
          break;
        }

        // HIGH confidence — build the smart workflow
        try {
          const tpl      = buildAutomationWorkflow(message);
          const optimized = optimizeWorkflowGraph(tpl.graph.nodes, tpl.graph.edges);
          updatedWorkflow  = applyWorkflowTool({ nodes, edges }, 'set_workflow', optimized);
          const summary    = buildWorkflowSummary(message, optimized.nodes);
          reply = `Workflow created: ${summary}\n\nI built "${tpl.name}" with ${optimized.nodes.length} nodes. Click any node on the canvas to configure it.`;
        } catch {
          // Fallback to template matching
          const tpl   = matchTemplate(message);
          updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', tpl.graph);
          reply = `Built a "${tpl.name}" workflow — ${tpl.description}`;
        }
        break;
      }

      // ── CLEAR ──────────────────────────────────────────────────────────
      case 'clear': {
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', { nodes: [], edges: [] });
        reply = 'Canvas cleared. Ready for a fresh start — what would you like to build?';
        break;
      }

      // ── ADD NODE ───────────────────────────────────────────────────────
      case 'add_node': {
        const nodeType = extractNodeType(message);
        const nodeDef  = NODE_INDEX.find(n => n.type === nodeType);
        const id       = `${nodeType}-${Date.now()}`;
        const lastX    = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'add_node', {
          id,
          nodeType,
          label:    nodeDef?.desc || nodeType,
          position: { x: lastX + 280, y: 200 },
          config:   {},
        });
        reply = `Added a "${nodeDef?.desc || nodeType}" node to the canvas.`;
        break;
      }

      // ── REMOVE NODE ────────────────────────────────────────────────────
      case 'remove_node': {
        const candidate = nodes.find(n => {
          const label = (n.data?.label || '').toLowerCase();
          const type  = (n.data?.type  || '').toLowerCase();
          return message.toLowerCase().split(/\W+/).some(w => w.length > 2 && (label.includes(w) || type.includes(w)));
        });
        if (candidate) {
          updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'remove_node', { id: candidate.id });
          reply = `Removed the "${candidate.data?.label}" node.`;
        } else {
          reply = `I couldn't find a matching node. Try something like "remove the transform node" or "delete the email step".`;
        }
        break;
      }

      // ── CONNECT ────────────────────────────────────────────────────────
      case 'connect': {
        if (nodes.length >= 2) {
          const source = nodes[nodes.length - 2];
          const target = nodes[nodes.length - 1];
          updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'add_edge', { source: source.id, target: target.id });
          reply = `Connected "${source.data?.label}" → "${target.data?.label}".`;
        } else {
          reply = `You need at least two nodes on the canvas to connect. Add some nodes first.`;
        }
        break;
      }

      // ── EXPLAIN ────────────────────────────────────────────────────────
      case 'explain': {
        if (!nodes.length) {
          reply = 'The canvas is empty. Describe what you want to automate and I\'ll build it.';
          break;
        }
        const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);
        const types = [...new Set(nodes.map(n => n.data?.type || n.type))];
        reply = `Your workflow has ${nodes.length} node${nodes.length !== 1 ? 's' : ''} and ${edges.length} connection${edges.length !== 1 ? 's' : ''}, `
          + `spanning ${maxDepth + 1} step${maxDepth > 0 ? 's' : ''}. `
          + `Node types: ${types.join(', ')}.`
          + (unreachable.length ? ` ⚠️ ${unreachable.length} node(s) are disconnected.` : ' All nodes are connected.');
        break;
      }

      // ── HELP ───────────────────────────────────────────────────────────
      case 'help':
        reply = CHAT_HELP_TEXT;
        break;

      default:
        reply = `I didn't quite understand that. ${CHAT_HELP_TEXT}`;
        break;
    }

    return {
      reply,
      toolCalls:       updatedWorkflow ? [{ name: intent }] : [],
      updatedWorkflow,
    };
  } catch (err) {
    logger.error('[intelligence] workflowChat error:', err);
    return {
      reply:           'Something went wrong. Please try again.',
      toolCalls:       [],
      updatedWorkflow: null,
    };
  }
}


module.exports = {
  generateWorkflow,
  explainError,
  debugNode,
  suggestNodes,
  documentWorkflow,
  workflowChat,
  validateWorkflowPrompt,
};

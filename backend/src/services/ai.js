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
  // Extended action verbs — cover common automation phrasing
  'upload', 'edit', 'delete', 'remove', 'move', 'copy', 'merge', 'parse',
  'monitor', 'manage', 'check', 'watch', 'convert', 'share', 'assign',
  'approve', 'review', 'submit', 'download', 'backup', 'restore', 'scan',
  'tag', 'label', 'schedule', 'trigger', 'run', 'execute', 'start', 'stop',
  'search', 'find', 'track', 'report', 'collect', 'aggregate', 'publish',
  'draft', 'send out', 'set up', 'configure', 'deploy', 'build',
];

// Automation domain nouns — indicate a clear automation target even without a named service
const AUTOMATION_NOUNS = [
  'report', 'invoice', 'document', 'team', 'task', 'ticket', 'event',
  'data', 'entry', 'item', 'order', 'payment', 'form', 'submission',
  'user', 'product', 'backup', 'content', 'post', 'page', 'image',
  'row', 'column', 'request', 'response', 'transaction', 'appointment',
  'meeting', 'reminder', 'record', 'account', 'subscription', 'receipt',
  'template', 'summary', 'digest', 'alert', 'log', 'file', 'folder',
  'asset', 'contract', 'proposal', 'quote', 'feedback', 'review', 'survey',
  'customer', 'member', 'employee', 'vendor', 'partner', 'client', 'ticket',
  'issue', 'bug', 'feature', 'release', 'build', 'pipeline', 'workflow',
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
//  PART 4 — CLARIFICATION QUESTIONS & MEDIUM SUGGESTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * getMediumSuggestions(text, detectedIntent)
 * Returns 4 complete, ready-to-run example prompts for a MEDIUM-confidence input.
 */
function getMediumSuggestions(text, detectedIntent) {
  const t = text.toLowerCase();

  if (/(edit|document|doc|pdf|csv|file|upload|process\s+file)/.test(t)) {
    return [
      'When a document is uploaded via webhook, extract text and save it to the database',
      'Every day, fetch PDF attachments from Gmail, extract content and email a summary',
      'When a file is uploaded, parse the CSV rows and sync them to Google Sheets',
      'When a Google Drive file is updated, notify the team via Slack',
    ];
  }
  if (/(report|summary|digest|analytics|stats|metric)/.test(t)) {
    return [
      'Every day at 9 AM, query the database and email a sales report to the team',
      'Every Monday morning, compile weekly metrics and post a digest to Slack',
      'When a webhook is received, generate a report and email it immediately',
      'Monthly, export data from Google Sheets and send a PDF report via email',
    ];
  }
  if (/(notify|notification|alert|team)/.test(t)) {
    return [
      'When a new email arrives, send a Slack notification to the team channel',
      'When a payment is received, alert the team via Slack and log to database',
      'When a form is submitted, notify the team on Discord',
      'Every morning, send a daily digest alert to the team Slack channel',
    ];
  }
  if (/(upload|file)/.test(t)) {
    return [
      'When a file is uploaded via webhook, parse it and insert rows into the database',
      'When a PDF is uploaded, extract text, summarize with AI, and email the result',
      'When a CSV is uploaded, validate rows and sync to Google Sheets',
      'When a file is uploaded to S3, notify the team on Slack',
    ];
  }
  if (/(lead|crm|contact|prospect|customer|signup|register)/.test(t)) {
    return [
      'When a form is submitted, save the lead to HubSpot and send a welcome email',
      'When a webhook brings lead data, insert into database and notify the sales team on Slack',
      'When a new lead arrives, add to Google Sheets and send an email notification',
      'When a payment is made, save the customer as a CRM contact and send a receipt email',
    ];
  }
  if (/(invoice|billing|payment|charge|receipt)/.test(t)) {
    return [
      'When a Stripe payment is received, generate an invoice and email it to the customer',
      'When a form is submitted, process the invoice and save it to the database',
      'Every day, fetch pending invoices and send them via email in bulk',
      'When a webhook is received, validate payment and notify the accounting team on Slack',
    ];
  }
  if (/(save|store|insert|database|db)/.test(t)) {
    return [
      'When a form is submitted, save the data to PostgreSQL and email a confirmation',
      'When a webhook is received, extract fields and insert a row into Google Sheets',
      'Every day, export CRM records and save them to the database',
      'When a payment is made, save the transaction record and notify via Slack',
    ];
  }
  if (/(email|gmail|inbox|mail)/.test(t)) {
    return [
      'When a new email arrives, summarize it with AI and post the summary to Slack',
      'Every day, fetch unread emails and save important ones to a Google Sheet',
      'When an email is received, classify its sentiment and route it based on the result',
      'When a webhook triggers, compose and send a personalised email via Gmail',
    ];
  }
  if (/(slack|discord|telegram|sms|message)/.test(t)) {
    return [
      'When a webhook is received, send a formatted Slack message to the #general channel',
      'When a new email arrives, forward a Slack notification to the team',
      'Every morning, post a daily briefing to the Slack channel',
      'When a payment is received, send an SMS alert via Twilio',
    ];
  }
  if (/(github|deploy|build|ci|devops)/.test(t)) {
    return [
      'When a GitHub build fails, send a Slack alert to the dev team',
      'When a pull request is merged, trigger a deployment and notify via email',
      'Every day, fetch CI build stats and post a summary to Slack',
      'When a new GitHub commit is pushed, run tests and log the result',
    ];
  }
  // Generic fallback
  return [
    'When a webhook is received, process the data and send a Slack notification',
    'Every day at 9 AM, fetch data from an API and save it to the database',
    'When a form is submitted, create a CRM lead and send a welcome email',
    'When an email arrives, summarize it with AI and forward key points to Slack',
  ];
}

/**
 * generateClarificationQuestion(text, missingParts)
 * Returns { question, options, suggestions } for a MEDIUM-confidence prompt.
 *   question  — what to ask the user
 *   options   — short quick-select chips that answer the question
 *   suggestions — complete ready-to-run example prompts
 */
function generateClarificationQuestion(text, missingParts) {
  const t = text.toLowerCase();
  const intent = detectWorkflowIntent(t);
  const suggestions = getMediumSuggestions(t, intent);

  if (missingParts.includes('trigger')) {
    if (/(notification|notify|alert)/.test(t)) {
      return {
        question: 'What should trigger the notification?',
        options: ['New email received', 'Webhook / API call', 'Daily schedule', 'Form submission', 'Payment received'],
        suggestions,
      };
    }
    if (/(report|summary|digest|analytics)/.test(t)) {
      return {
        question: 'When should the report be generated?',
        options: ['Daily at 9 AM', 'Weekly on Mondays', 'Monthly on the 1st', 'On-demand via webhook'],
        suggestions,
      };
    }
    if (/(save|store|insert|database|crm|lead|contact)/.test(t)) {
      return {
        question: 'What should trigger this save action?',
        options: ['Form submission', 'Webhook / API call', 'New email', 'Scheduled import'],
        suggestions,
      };
    }
    if (/email/.test(t)) {
      return {
        question: 'What should trigger the email?',
        options: ['Webhook / API call', 'New form submission', 'Payment received', 'Daily schedule'],
        suggestions,
      };
    }
    if (/(edit|document|file|upload)/.test(t)) {
      return {
        question: 'How should the document workflow be triggered?',
        options: ['When document is uploaded', 'Daily schedule', 'Webhook / API call', 'Manual start'],
        suggestions,
      };
    }
    if (/(slack|discord|telegram|sms)/.test(t)) {
      return {
        question: 'What should trigger the message?',
        options: ['Webhook / API call', 'New email received', 'Payment received', 'Form submission', 'Daily schedule'],
        suggestions,
      };
    }
    return {
      question: 'What should trigger this automation?',
      options: ['New email received', 'Webhook / API call', 'Recurring schedule', 'Form submission', 'Payment received'],
      suggestions,
    };
  }

  if (missingParts.includes('action') || missingParts.includes('integration')) {
    if (/(lead|contact|prospect|customer)/.test(t)) {
      return {
        question: 'Where would you like to save the leads or contacts?',
        options: ['HubSpot CRM', 'PostgreSQL Database', 'Google Sheets', 'Notion', 'Airtable'],
        suggestions,
      };
    }
    if (/(notify|notification|alert)/.test(t)) {
      return {
        question: 'Where should the notification be sent?',
        options: ['Slack channel', 'Email (SMTP)', 'Discord', 'Telegram bot', 'SMS via Twilio'],
        suggestions,
      };
    }
    if (/(report|data|result|analytics|summary)/.test(t)) {
      return {
        question: 'Where should the report be delivered?',
        options: ['Email', 'Slack channel', 'Google Sheets', 'Notion page'],
        suggestions,
      };
    }
    if (/email/.test(t)) {
      return {
        question: 'What action should happen with the email?',
        options: ['Send a Slack notification', 'Summarize it with AI', 'Save to database', 'Forward as email'],
        suggestions,
      };
    }
    if (/(data|record|row|document|file)/.test(t)) {
      return {
        question: 'Where should the data or file be stored?',
        options: ['PostgreSQL database', 'Google Sheets', 'AWS S3', 'Airtable', 'Notion'],
        suggestions,
      };
    }
    if (/(invoice|payment|billing)/.test(t)) {
      return {
        question: 'What should happen after the invoice or payment is processed?',
        options: ['Email the customer', 'Save to database', 'Notify team on Slack', 'Log to Google Sheets'],
        suggestions,
      };
    }
  }

  return {
    question: 'Could you tell me more about this automation?',
    options: [
      'What triggers it? (email, schedule, webhook…)',
      'What should it do? (send, save, notify…)',
      'Which services? (Slack, Gmail, database…)',
    ],
    suggestions,
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
  // Standalone words/phrases with no automation meaning — no verb+noun context possible
  const MEANINGLESS = new Set([
    'automation', 'workflow', 'make workflow', 'create workflow', 'build workflow',
    'automate', 'test', 'qwerty', 'asdf', 'random', 'something', 'whatever',
    'make something', 'build something', 'do something', 'make', 'go', 'help',
    // Note: single action verbs like 'create', 'build', 'run', 'start' are NOT
    // listed here so that "build report", "run workflow", etc. can reach MEDIUM.
    // They are caught by hasPartialShape requiring a paired noun/integration.
  ]);

  const greetingOnly       = /^(hi|hello|hey|yo|thanks|thank you|test|ok|okay|sure|yes|no|maybe|please|help|sup|howdy)$/i.test(text.trim());
  const tooShort           = text.length < 8;
  const onlyNumbers        = /^\d+$/.test(text.trim());
  const keyboardMash       = tokens.length <= 2 && uniqueLetters >= 5 && !/[aeiou]/i.test(text) && alphaCount > 3;
  const noAlpha            = alphaCount < 3;
  const genericOnly        = MEANINGLESS.has(text.trim().toLowerCase());
  // Guard: short prompt with zero meaningful words across ALL term lists (including nouns)
  const noMeaningfulWords  = tokens.length <= 2 && !hasAny(normalized, [
    ...TRIGGER_TERMS, ...ACTION_TERMS, ...INTEGRATION_TERMS, ...AUTOMATION_NOUNS,
  ]);

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
  const detectedIntent    = detectWorkflowIntent(normalized);
  const hasTrigger        = hasAny(normalized, TRIGGER_TERMS) || /^(daily|weekly|hourly|monthly|morning)/.test(normalized);
  const hasAction         = hasAny(normalized, ACTION_TERMS);
  const hasIntegration    = hasAny(normalized, INTEGRATION_TERMS);
  const hasAutomationNoun = hasAny(normalized, AUTOMATION_NOUNS);

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

  // ── MEDIUM confidence: meaningful but incomplete prompt ─────────────────
  // Any prompt that passes the hard rejections AND contains at least one
  // meaningful signal (action verb, trigger term, named service, or domain
  // noun) alongside at least one other word qualifies as MEDIUM.
  //
  // This guarantees that "editing document", "send report", "save leads",
  // "notify team", "upload file", "process invoice", "generate workflow for
  // editing document" etc. all reach MEDIUM and get a best-guess workflow.
  //
  // MEDIUM is valid: true — a workflow IS generated, and clarification data
  // is attached so the user can refine it further.
  const hasMeaningfulSignal = hasAction || hasTrigger || hasIntegration || hasAutomationNoun;
  const hasPartialShape     = hasMeaningfulSignal && tokens.length >= 2;

  if (hasPartialShape) {
    const missingParts = [];
    if (!hasTrigger)                    missingParts.push('trigger');
    if (!hasAction && !hasIntegration)  missingParts.push('action');

    const clarificationData = generateClarificationQuestion(text, missingParts);

    return {
      valid:              true,   // valid — we WILL generate a workflow
      confidence:         'medium',
      needsClarification: true,   // but we need more info to make it perfect
      reason:             missingParts.length
        ? `Partially understood — missing: ${missingParts.join(' and ')}`
        : 'Partially understood — ambiguous details',
      normalizedPrompt:   text,
      detectedIntent,
      clarification:      clarificationData.question,
      clarificationOptions: clarificationData.options,
      suggestions:        clarificationData.suggestions,
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
//  ENHANCED CHAT INTENT SYSTEM
// ════════════════════════════════════════════════════════════════════════════

const ENHANCED_CHAT_INTENTS = [
  { name: 'generate', weight: 3, keywords: [
    'build', 'create', 'make', 'generate', 'set up', 'automate', 'workflow for',
    'new workflow', 'i want to', 'help me build', 'help me create', 'i need a workflow',
  ]},
  { name: 'edit', weight: 4, keywords: [
    'add a', 'add an', 'add delay', 'add slack', 'add email', 'add error', 'add logging',
    'add ai', 'add notification', 'add retry', 'add filter', 'add condition',
    'insert', 'replace', 'swap', 'change it to', 'change trigger', 'remove the', 'delete the',
    'add error handling', 'add retry logic', 'add a node', 'put a', 'insert a',
  ]},
  { name: 'config', weight: 4, keywords: [
    'set delay', 'change delay', 'change email subject', 'set email subject',
    'change channel', 'set channel', 'rename node', 'rename it', 'change subject',
    'set schedule', 'change schedule', 'configure', 'set to', 'change the',
    'update config', 'set recipient', 'change recipient', 'set message',
  ]},
  { name: 'debug', weight: 3, keywords: [
    'fix', 'debug', 'issue', 'problem', 'error', 'broken', 'not working', 'failing',
    'check for issues', 'what is wrong', 'find issues', 'diagnose', 'why is',
    'find problems', 'detect issues',
  ]},
  { name: 'health', weight: 3, keywords: [
    'health', 'score', 'analyze', 'audit', 'review workflow', 'how good', 'quality',
    'reliability', 'workflow score', 'rate my workflow', 'workflow analysis',
  ]},
  { name: 'simulate', weight: 3, keywords: [
    'simulate', 'preview', 'show flow', 'trace', 'execution flow',
    'what happens when', 'run preview', 'show execution', 'walk through',
    'show me the steps', 'execution path',
  ]},
  { name: 'explain', weight: 2, keywords: [
    'explain', 'what does', 'how does', 'describe', 'what is this', 'tell me about',
    'walk me through', 'show me how', 'what is my workflow', 'summarize workflow',
  ]},
  { name: 'improve', weight: 2, keywords: [
    'improve', 'optimize', 'better', 'suggestion', 'recommend', 'enhance',
    'how can i improve', 'what should i add', 'make it better', 'best practices',
  ]},
  { name: 'clear', weight: 3, keywords: [
    'clear', 'reset', 'start over', 'empty canvas', 'wipe', 'start fresh', 'delete all',
  ]},
  { name: 'help', weight: 1, keywords: [
    'help', 'what can you do', 'capabilities', 'commands', 'how to use', 'what are you',
  ]},
];

function detectChatIntent(message) {
  const lower = message.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const intent of ENHANCED_CHAT_INTENTS) {
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


// ════════════════════════════════════════════════════════════════════════════
//  NODE TYPE RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

const NODE_TYPE_MAP = {
  // Triggers
  webhook: 'trigger_webhook', 'http trigger': 'trigger_webhook', 'api trigger': 'trigger_webhook',
  schedule: 'trigger_cron', cron: 'trigger_cron', daily: 'trigger_cron', weekly: 'trigger_cron',
  'email trigger': 'trigger_email', 'new email': 'trigger_email',
  manual: 'trigger_manual',
  // Messaging
  slack: 'slack_send', discord: 'discord_send', telegram: 'telegram_send',
  sms: 'twilio_sms', twilio: 'twilio_sms',
  email: 'email_send', mail: 'email_send', smtp: 'email_send',
  gmail: 'google_gmail_send',
  // Databases
  database: 'postgres_insert', db: 'postgres_insert', postgres: 'postgres_insert', sql: 'postgres_query',
  mongodb: 'mongodb_insert', mongo: 'mongodb_insert', redis: 'redis_set',
  // Google
  sheets: 'google_sheets_write', spreadsheet: 'google_sheets_write',
  'google sheets': 'google_sheets_write', drive: 'google_drive_upload',
  // Logic
  delay: 'delay', wait: 'delay', pause: 'delay',
  condition: 'logic_if', 'if condition': 'logic_if', branch: 'logic_if', filter: 'transform_filter',
  'error handler': 'error_handler', 'error handling': 'error_handler', retry: 'error_handler',
  loop: 'loop_for_each', foreach: 'loop_for_each',
  // Transform
  transform: 'transform_set', map: 'transform_set', merge: 'transform_merge',
  json: 'json_parse', parse: 'json_parse',
  // AI
  summarize: 'ai_summarize', summary: 'ai_summarize', 'ai summary': 'ai_summarize',
  classify: 'ai_classify', sentiment: 'ai_classify',
  openai: 'openai_chat', 'gpt': 'openai_chat', claude: 'anthropic_chat',
  // CRM
  hubspot: 'hubspot_contact', crm: 'hubspot_contact', lead: 'hubspot_contact',
  notion: 'notion_page',
  jira: 'jira_create', ticket: 'jira_create',
  // HTTP
  http: 'http_request', api: 'http_request', rest: 'rest_get',
  // Files
  csv: 'csv_parse', pdf: 'pdf_extract',
  // Cloud
  s3: 'aws_s3_upload', aws: 'aws_s3_upload',
  github: 'github_create_pr',
  // Payments
  stripe: 'stripe_payment_intent', payment: 'stripe_payment_intent',
  // Utilities
  log: 'console_log', logging: 'console_log', debug: 'console_log',
  approval: 'wait_approval', approve: 'wait_approval',
  code: 'code_execute', script: 'code_execute',
};

function inferNodeTypeFromText(text) {
  const t = text.toLowerCase().trim();
  for (const [key, type] of Object.entries(NODE_TYPE_MAP)) {
    if (t.includes(key)) return type;
  }
  const top = retrieveNodes(text, 3).filter(n => !n.cat.includes('TRIGGERS'));
  return top[0]?.type || 'transform_set';
}

function getLabelForNodeType(type) {
  const node = NODE_INDEX.find(n => n.type === type);
  if (node) return node.desc;
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function findNodeByHint(nodes, hint) {
  if (!hint) return null;
  const h = hint.toLowerCase().replace(/\s+node\s*$/, '').trim();
  return nodes.find(n => {
    const label = (n.data?.label || '').toLowerCase();
    const type  = (n.data?.type  || '').toLowerCase();
    return label.includes(h) || type.includes(h) ||
      h.split(' ').some(word => word.length > 2 && (label.includes(word) || type.includes(word)));
  }) || null;
}


// ════════════════════════════════════════════════════════════════════════════
//  WORKFLOW HEALTH ANALYSIS
// ════════════════════════════════════════════════════════════════════════════

function analyzeWorkflowHealth(nodes, edges) {
  if (!nodes.length) {
    return { score: 0, grade: 'F', issues: [{ type: 'error', msg: 'Workflow is empty — add nodes to get started' }], tips: [] };
  }

  let score = 100;
  const issues = [];
  const tips   = [];
  const types  = nodes.map(n => (n.data?.type || '').toLowerCase());
  const { unreachable, maxDepth } = analyzeGraphDFS(nodes, edges);

  // No trigger
  if (!types.some(t => t.includes('trigger'))) {
    score -= 25;
    issues.push({ type: 'error', msg: 'No trigger node — the workflow cannot start automatically' });
  }

  // Only one node
  if (nodes.length === 1) {
    score -= 15;
    issues.push({ type: 'warning', msg: 'Only one node — no action is connected after the trigger' });
  }

  // Disconnected nodes
  if (unreachable.length > 0) {
    score -= unreachable.length * 12;
    const label = nodes.find(n => n.id === unreachable[0])?.data?.label || unreachable[0];
    issues.push({ type: 'error', msg: `${unreachable.length} disconnected node(s) — starting with "${label}"` });
  }

  // No error handling
  if (!types.some(t => t === 'error_handler') && nodes.length > 2) {
    score -= 10;
    tips.push('Add an Error Handler node to catch and retry failed steps');
  }

  // No logging
  if (!types.some(t => t === 'console_log') && nodes.length > 3) {
    score -= 5;
    tips.push('Add a Log node to monitor execution state for debugging');
  }

  // HTTP without transform
  const hasHttp = types.some(t => t.includes('http') || t.startsWith('rest_'));
  const hasTransform = types.some(t => t.includes('transform') || t === 'json_parse');
  if (hasHttp && !hasTransform) {
    score -= 5;
    tips.push('HTTP responses need a Transform node to map fields before next steps');
  }

  // Deep chain without branching
  if (maxDepth > 5 && !types.some(t => t === 'logic_if' || t === 'logic_switch')) {
    score -= 5;
    tips.push('Long linear chains benefit from a Logic If node to handle edge cases');
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return { score, grade, issues, tips };
}


// ════════════════════════════════════════════════════════════════════════════
//  WORKFLOW SIMULATION
// ════════════════════════════════════════════════════════════════════════════

function simulateWorkflowExecution(nodes, edges) {
  if (!nodes.length) return ['No nodes in workflow — add nodes to simulate'];
  const path = aStarShortestPath(nodes, edges);
  if (!path.length) return ['No executable path found'];
  return path.map((node, i) => {
    const label = node.data?.label || node.data?.type || `Step ${i + 1}`;
    return i === 0 ? `▶ ${label}` : `  ↓ ${label}`;
  });
}


// ════════════════════════════════════════════════════════════════════════════
//  WORKFLOW EDITOR (natural language → graph mutations)
// ════════════════════════════════════════════════════════════════════════════

function editWorkflowByInstruction(message, nodes, edges) {
  const lower = message.toLowerCase();
  let newNodes = [...nodes];
  let newEdges = [...edges];
  const changes = [];

  const ts = () => Date.now() + Math.random();

  // ── ADD AT END ───────────────────────────────────────────────────────────
  const atEndMatch = lower.match(/add\s+(?:a\s+|an\s+)?(.+?)\s+(?:node\s+)?(?:at the end|to the end|at the bottom|to the workflow)\s*$/);
  if (atEndMatch) {
    const nodeType = inferNodeTypeFromText(atEndMatch[1]);
    const label    = getLabelForNodeType(nodeType);
    const id       = `${nodeType}-${ts()}`;
    const lastX    = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
    const terminal = nodes.find(n => !edges.some(e => e.source === n.id));
    newNodes = [...newNodes, makeNode(id, lastX + 290, 220, label, nodeType, {})];
    if (terminal) newEdges = [...newEdges, makeEdge(`e-${id}`, terminal.id, id)];
    changes.push(`Added "${label}" at the end`);
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── ADD AFTER ────────────────────────────────────────────────────────────
  const addAfterMatch = lower.match(/add\s+(?:a\s+|an\s+)?(.+?)\s+(?:node\s+)?after\s+(?:the\s+)?(.+?)(?:\s+node)?\s*$/);
  if (addAfterMatch) {
    const nodeType   = inferNodeTypeFromText(addAfterMatch[1]);
    const label      = getLabelForNodeType(nodeType);
    const id         = `${nodeType}-${ts()}`;
    const targetNode = findNodeByHint(nodes, addAfterMatch[2]);
    if (targetNode) {
      const fromTarget = newEdges.filter(e => e.source === targetNode.id);
      newNodes = [...newNodes, makeNode(id, targetNode.position.x + 290, targetNode.position.y, label, nodeType, {})];
      newEdges = [
        ...newEdges.filter(e => e.source !== targetNode.id),
        makeEdge(`e-${id}-in`, targetNode.id, id),
        ...fromTarget.map(e => makeEdge(`e-${id}-out-${e.target}`, id, e.target)),
      ];
      changes.push(`Inserted "${label}" after "${targetNode.data?.label}"`);
    } else {
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      newNodes = [...newNodes, makeNode(id, lastX + 290, 220, label, nodeType, {})];
      changes.push(`Added "${label}" to the workflow`);
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── ADD BEFORE ───────────────────────────────────────────────────────────
  const addBeforeMatch = lower.match(/add\s+(?:a\s+|an\s+)?(.+?)\s+(?:node\s+)?before\s+(?:the\s+)?(.+?)(?:\s+node)?\s*$/);
  if (addBeforeMatch) {
    const nodeType   = inferNodeTypeFromText(addBeforeMatch[1]);
    const label      = getLabelForNodeType(nodeType);
    const id         = `${nodeType}-${ts()}`;
    const targetNode = findNodeByHint(nodes, addBeforeMatch[2]);
    if (targetNode) {
      const toTarget = newEdges.filter(e => e.target === targetNode.id);
      newNodes = [...newNodes, makeNode(id, targetNode.position.x - 290, targetNode.position.y, label, nodeType, {})];
      newEdges = [
        ...newEdges.filter(e => e.target !== targetNode.id),
        makeEdge(`e-${id}-out`, id, targetNode.id),
        ...toTarget.map(e => makeEdge(`e-${id}-in-${e.source}`, e.source, id)),
      ];
      changes.push(`Inserted "${label}" before "${targetNode.data?.label}"`);
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── REPLACE ──────────────────────────────────────────────────────────────
  const replaceMatch = lower.match(/replace\s+(?:the\s+)?(.+?)\s+(?:node\s+)?with\s+(?:a\s+|an\s+)?(.+?)(?:\s+node)?\s*$/);
  if (replaceMatch) {
    const targetNode = findNodeByHint(nodes, replaceMatch[1]);
    const nodeType   = inferNodeTypeFromText(replaceMatch[2]);
    const label      = getLabelForNodeType(nodeType);
    if (targetNode) {
      newNodes = newNodes.map(n =>
        n.id === targetNode.id ? { ...n, data: { ...n.data, label, type: nodeType, config: {} } } : n
      );
      changes.push(`Replaced "${targetNode.data?.label}" with "${label}"`);
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── ADD ERROR HANDLING ───────────────────────────────────────────────────
  if (/add\s+error\s+(?:handling|handler)|add\s+retry(?:\s+logic)?/.test(lower)) {
    if (!nodes.some(n => n.data?.type === 'error_handler')) {
      const id      = `error_handler-${ts()}`;
      const lastX   = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      const lastY   = 420;
      const terminal = nodes.find(n => !edges.some(e => e.source === n.id));
      newNodes = [...newNodes, makeNode(id, lastX, lastY, 'Error Handler', 'error_handler', { retries: 2 })];
      if (terminal) newEdges = [...newEdges, makeEdge(`e-${id}`, terminal.id, id)];
      changes.push('Added Error Handler node with auto-retry');
    } else {
      changes.push('Error Handler already exists in the workflow');
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── ADD AI SUMMARY ───────────────────────────────────────────────────────
  if (/add\s+(?:ai\s+)?summar(?:y|ize|ization)|add\s+ai\s+step/.test(lower)) {
    const id     = `ai_summarize-${ts()}`;
    const msgNode = nodes.find(n => ['slack_send', 'email_send', 'discord_send', 'google_gmail_send'].includes(n.data?.type));
    if (msgNode) {
      const toMsg = newEdges.filter(e => e.target === msgNode.id);
      newNodes = [...newNodes, makeNode(id, msgNode.position.x - 290, msgNode.position.y, 'Summarize with AI', 'ai_summarize', { input: '{{input}}' })];
      newEdges = [
        ...newEdges.filter(e => e.target !== msgNode.id),
        makeEdge(`e-${id}-out`, id, msgNode.id),
        ...toMsg.map(e => makeEdge(`e-${id}-in-${e.source}`, e.source, id)),
      ];
      changes.push('Inserted AI Summarize before the notification step');
    } else {
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      newNodes = [...newNodes, makeNode(id, lastX + 290, 220, 'Summarize with AI', 'ai_summarize', { input: '{{input}}' })];
      changes.push('Added AI Summarize node');
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── CHANGE TRIGGER FREQUENCY ─────────────────────────────────────────────
  const freqMatch = lower.match(/change\s+(?:it\s+|trigger\s+)?to\s+(daily|weekly|hourly|monthly)/);
  if (freqMatch) {
    const freq  = freqMatch[1];
    const exprs = { daily: '0 9 * * *', weekly: '0 9 * * 1', hourly: '0 * * * *', monthly: '0 9 1 * *' };
    const trig  = nodes.find(n => n.data?.type?.includes('trigger'));
    if (trig) {
      newNodes = newNodes.map(n =>
        n.id === trig.id
          ? { ...n, data: { ...n.data, label: `${freq.charAt(0).toUpperCase() + freq.slice(1)} Schedule`, type: 'trigger_cron', config: { expression: exprs[freq] } } }
          : n
      );
      changes.push(`Changed trigger to ${freq} schedule (${exprs[freq]})`);
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  // ── REMOVE / DELETE node ─────────────────────────────────────────────────
  const removeMatch = lower.match(/(?:remove|delete)\s+(?:the\s+)?(.+?)(?:\s+node)?\s*$/);
  if (removeMatch) {
    const targetNode = findNodeByHint(nodes, removeMatch[1]);
    if (targetNode) {
      newNodes = newNodes.filter(n => n.id !== targetNode.id);
      newEdges = newEdges.filter(e => e.source !== targetNode.id && e.target !== targetNode.id);
      changes.push(`Removed "${targetNode.data?.label}"`);
    }
    return { nodes: newNodes, edges: newEdges, changes };
  }

  return { nodes: newNodes, edges: newEdges, changes };
}


// ════════════════════════════════════════════════════════════════════════════
//  NODE CONFIG UPDATER (natural language → config patches)
// ════════════════════════════════════════════════════════════════════════════

function updateNodeByInstruction(message, nodes, edges) {
  const lower = message.toLowerCase();
  let newNodes = [...nodes];
  const changes = [];

  const findByType = (...typeHints) => nodes.find(n =>
    typeHints.some(h => (n.data?.type || '').includes(h) || (n.data?.label || '').toLowerCase().includes(h))
  ) || null;

  // Delay
  const delayMatch = lower.match(/(?:change|set)\s+delay\s+to\s+(\d+)\s*(second|minute|hour|day)s?/);
  if (delayMatch) {
    const node = findByType('delay');
    if (node) {
      const duration = `${delayMatch[1]} ${delayMatch[2]}${parseInt(delayMatch[1]) > 1 ? 's' : ''}`;
      newNodes = newNodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, config: { ...n.data.config, duration } } } : n);
      changes.push(`Set delay to ${duration}`);
    }
  }

  // Email subject
  const subjectMatch = lower.match(/(?:change|set)\s+(?:email\s+)?subject\s+to\s+["']?(.+?)["']?$/);
  if (subjectMatch) {
    const node = findByType('email', 'gmail');
    if (node) {
      newNodes = newNodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, config: { ...n.data.config, subject: subjectMatch[1] } } } : n);
      changes.push(`Updated email subject to "${subjectMatch[1]}"`);
    }
  }

  // Slack channel
  const channelMatch = lower.match(/(?:change|set)\s+(?:slack\s+)?channel\s+to\s+([#\w-]+)/);
  if (channelMatch) {
    const node = findByType('slack');
    if (node) {
      const channel = channelMatch[1].startsWith('#') ? channelMatch[1] : `#${channelMatch[1]}`;
      newNodes = newNodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, config: { ...n.data.config, channel } } } : n);
      changes.push(`Updated Slack channel to ${channel}`);
    }
  }

  // Schedule expression
  const schedMatch = lower.match(/(?:change|set)\s+schedule\s+to\s+(daily|weekly|hourly|monthly)/);
  if (schedMatch) {
    const node = nodes.find(n => n.data?.type === 'trigger_cron');
    if (node) {
      const exprs = { daily: '0 9 * * *', weekly: '0 9 * * 1', hourly: '0 * * * *', monthly: '0 9 1 * *' };
      newNodes = newNodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, config: { ...n.data.config, expression: exprs[schedMatch[1]] } } } : n);
      changes.push(`Updated schedule to ${schedMatch[1]}`);
    }
  }

  // Rename
  const renameMatch = lower.match(/rename\s+(?:it|the\s+\w+\s+node|node)\s+to\s+["']?(.+?)["']?$/);
  if (renameMatch) {
    const last = nodes[nodes.length - 1];
    if (last) {
      newNodes = newNodes.map(n => n.id === last.id ? { ...n, data: { ...n.data, label: renameMatch[1] } } : n);
      changes.push(`Renamed node to "${renameMatch[1]}"`);
    }
  }

  return { nodes: newNodes, edges, changes };
}


// ════════════════════════════════════════════════════════════════════════════
//  CONTEXTUAL SUGGESTIONS
// ════════════════════════════════════════════════════════════════════════════

function getContextualSuggestions(intent, nodes) {
  const types = nodes.map(n => (n.data?.type || '').toLowerCase());

  if (!nodes.length) {
    return [
      'When email arrives, send a Slack notification',
      'Daily sales report emailed to the team',
      'When form is submitted, create a HubSpot lead',
      'When Stripe payment received, send invoice email',
    ];
  }

  const base = [];
  if (!types.some(t => t === 'error_handler'))                  base.push('Add error handling');
  if (!types.some(t => t === 'console_log') && nodes.length > 2) base.push('Add logging');
  if (!types.some(t => t.includes('ai_')))                      base.push('Add AI summary step');
  base.push('Show workflow health');
  base.push('Simulate execution');

  if (intent === 'health')    return ['Fix issues automatically', 'Add error handling', 'Simulate execution', 'Suggest improvements'];
  if (intent === 'debug')     return ['Add error handler', 'Simulate execution', 'Show health score', 'Fix issues'];
  if (intent === 'simulate')  return ['Analyze workflow health', 'Add error handling', 'Suggest improvements'];
  if (intent === 'improve')   return ['Add error handling', 'Add logging', 'Add AI summary', 'Show health score'];

  return base.slice(0, 4);
}


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
 *
 * Response types:
 *   { success: true,  type: 'workflow_generated', confidence: 'high', ... }
 *   { success: true,  type: 'workflow_generated', confidence: 'medium',
 *                     needsClarification: true, clarification, clarificationOptions, suggestions, ... }
 *   { success: false, type: 'invalid_input',  error, suggestions }
 *   { success: false, type: 'unsafe_request', error }
 *
 * MEDIUM confidence is now valid: true — we always build a best-guess workflow
 * and attach clarification data so the user can refine it.
 */
async function generateWorkflow(prompt) {
  // ── Step 1: Validate ────────────────────────────────────────────────────
  const validation = validateWorkflowPrompt(prompt);

  // Safety rejection (unsafe operations)
  if (!validation.valid && validation.reason.includes('unsafe')) {
    return {
      success: false,
      type:    'unsafe_request',
      error:   'This request involves potentially harmful operations and cannot be processed.',
      graph:   null,
      nodes:   [],
      edges:   [],
    };
  }

  // LOW confidence — truly meaningless input, reject outright
  if (!validation.valid) {
    return {
      success:     false,
      type:        'invalid_input',
      error:       'Please describe a real automation workflow in plain English.',
      suggestions: validation.suggestedClarification || [
        'When I receive an email, send a Slack message',
        'Every day at 9 AM generate a sales report and email it',
        'When a form is submitted, create a HubSpot lead',
      ],
      graph:  null,
      nodes:  [],
      edges:  [],
    };
  }

  // ── Step 2: Build workflow (MEDIUM or HIGH) ─────────────────────────────
  // MEDIUM: valid but incomplete → generate best-guess + attach clarification data
  // HIGH:   complete → generate and return immediately
  try {
    let tpl;
    try {
      tpl = buildAutomationWorkflow(prompt);
    } catch (buildErr) {
      // buildAutomationWorkflow couldn't detect any action nodes (e.g. "editing document")
      // → use template matching which always succeeds
      if (buildErr instanceof WorkflowValidationError) {
        tpl = matchTemplate(prompt);
      } else {
        throw buildErr;
      }
    }

    // ── Step 3: Optimise graph ──────────────────────────────────────────────
    const { nodes, edges } = optimizeWorkflowGraph(tpl.graph.nodes, tpl.graph.edges);

    // ── Step 4: Human-readable output ──────────────────────────────────────
    const summary             = buildWorkflowSummary(prompt, nodes);
    const workflowExplanation = buildWorkflowExplanation(nodes);

    logger.info(`[intelligence] generateWorkflow: "${tpl.name}" (${nodes.length} nodes, confidence: ${validation.confidence})`);

    const result = {
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

    // Attach clarification data for MEDIUM confidence prompts
    if (validation.needsClarification) {
      result.needsClarification    = true;
      result.clarification         = validation.clarification;
      result.clarificationOptions  = validation.clarificationOptions;
      result.suggestions           = validation.suggestions;
    }

    return result;
  } catch (err) {
    // Unexpected error — minimal safe fallback
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
 * workflowChat — Freckles AI copilot.
 *
 * Supports: generate, edit, config, debug, health, simulate, explain,
 *           improve, clear, help, and natural-language graph edits.
 *
 * Returns: { reply, toolCalls, updatedWorkflow, suggestions, messageType, metadata }
 */
async function workflowChat({ message, history, workflow }) {
  try {
    const intent = detectChatIntent(message);
    const nodes  = workflow?.nodes || [];
    const edges  = workflow?.edges || [];
    let updatedWorkflow = null;
    let reply           = '';

    let updatedWorkflow = null;
    let reply           = '';
    let messageType     = 'message';
    let suggestions     = [];
    let metadata        = {};

    switch (intent) {

      // ══════════════════════════════════════════════════════════════════
      // GENERATE — build a new workflow from a natural language description
      // ══════════════════════════════════════════════════════════════════
      case 'generate': {
        const validation = validateWorkflowPrompt(message);

        if (!validation.valid) {
          if (validation.reason.includes('unsafe')) {
            reply = "I can't help with that — it involves potentially harmful operations.";
          } else {
            const examples = (validation.suggestedClarification || []).slice(0, 3);
            reply = "I need a clearer description of what to automate. Here are some ideas:\n"
              + examples.map(e => `  • ${e}`).join('\n');
          }
          suggestions = getContextualSuggestions('generate', nodes);
          break;
        }

        let tpl;
        try { tpl = buildAutomationWorkflow(message); }
        catch { tpl = matchTemplate(message); }

        const optimized = optimizeWorkflowGraph(tpl.graph.nodes, tpl.graph.edges);
        updatedWorkflow  = applyWorkflowTool({ nodes, edges }, 'set_workflow', optimized);
        const summary    = buildWorkflowSummary(message, optimized.nodes);
        const explanation = buildWorkflowExplanation(optimized.nodes);

        messageType = 'workflow_built';
        metadata    = { summary, explanation, confidence: validation.confidence };

        if (validation.needsClarification) {
          reply = `I built a best-guess workflow for you: ${summary}\n\n`
            + `${validation.clarification}\n\n`
            + `You can ask me to refine it, or try one of the suggestions below.`;
        } else {
          reply = `Done! Here's what I built:\n\n${explanation.map(s => `  • ${s}`).join('\n')}\n\nClick any node to configure it.`;
        }
        suggestions = getContextualSuggestions('generate', optimized.nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // EDIT — natural-language graph mutations
      // ══════════════════════════════════════════════════════════════════
      case 'edit': {
        if (!nodes.length) {
          reply = "There's no workflow on the canvas yet. Describe what you want to automate and I'll build it first.";
          suggestions = getContextualSuggestions('generate', nodes);
          break;
        }

        const { nodes: editedNodes, edges: editedEdges, changes } = editWorkflowByInstruction(message, nodes, edges);

        if (changes.length) {
          updatedWorkflow = applyWorkflowTool({ nodes: [], edges: [] }, 'set_workflow', {
            nodes: editedNodes, edges: editedEdges,
          });
          messageType = 'workflow_edited';
          metadata    = { changes };
          reply = `Done! Here's what I changed:\n${changes.map(c => `  ✓ ${c}`).join('\n')}`;
        } else {
          reply = "I understood you want to edit the workflow, but I couldn't identify the exact change. Try:\n"
            + "  • \"Add a delay after the slack node\"\n"
            + "  • \"Replace gmail with outlook\"\n"
            + "  • \"Add error handling\"\n"
            + "  • \"Change trigger to daily\"";
        }
        suggestions = getContextualSuggestions('edit', editedNodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // CONFIG — update individual node settings in plain English
      // ══════════════════════════════════════════════════════════════════
      case 'config': {
        if (!nodes.length) {
          reply = "No workflow to configure yet. Build one first and I'll help you tweak any node.";
          break;
        }

        const { nodes: configNodes, changes: configChanges } = updateNodeByInstruction(message, nodes, edges);

        if (configChanges.length) {
          updatedWorkflow = applyWorkflowTool({ nodes: [], edges: [] }, 'set_workflow', {
            nodes: configNodes, edges,
          });
          messageType = 'workflow_edited';
          metadata    = { changes: configChanges };
          reply = `Updated!\n${configChanges.map(c => `  ✓ ${c}`).join('\n')}`;
        } else {
          reply = "I understand you want to configure a node, but I need more detail. Try:\n"
            + "  • \"Set delay to 5 minutes\"\n"
            + "  • \"Change email subject to 'Order confirmed'\"\n"
            + "  • \"Change Slack channel to #alerts\"\n"
            + "  • \"Rename node to 'Daily Digest'\"";
        }
        suggestions = getContextualSuggestions('edit', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // DEBUG — find workflow issues and suggest fixes
      // ══════════════════════════════════════════════════════════════════
      case 'debug': {
        if (!nodes.length) {
          reply = "The canvas is empty — nothing to debug. Build a workflow first and I'll check it for issues.";
          break;
        }

        const health = analyzeWorkflowHealth(nodes, edges);
        messageType  = 'debug';
        metadata     = { health, issues: health.issues };

        if (!health.issues.length) {
          reply = `No critical issues found! Your workflow scored ${health.score}/100 (Grade: ${health.grade}).\n\n`
            + (health.tips.length
              ? `Improvement tips:\n${health.tips.map(t => `  💡 ${t}`).join('\n')}`
              : 'Looks solid — great work!');
        } else {
          reply = `I found ${health.issues.length} issue${health.issues.length > 1 ? 's' : ''} in your workflow:\n\n`
            + health.issues.map((iss, i) => `  ${i + 1}. ${iss.type === 'error' ? '🔴' : '🟡'} ${iss.msg}`).join('\n');
          if (health.tips.length) {
            reply += `\n\nAlso worth noting:\n${health.tips.map(t => `  💡 ${t}`).join('\n')}`;
          }
        }
        suggestions = getContextualSuggestions('debug', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // HEALTH — workflow quality score
      // ══════════════════════════════════════════════════════════════════
      case 'health': {
        if (!nodes.length) {
          reply = "The canvas is empty — build a workflow first and I'll score it.";
          break;
        }

        const health = analyzeWorkflowHealth(nodes, edges);
        messageType  = 'health';
        metadata     = { health };

        const bar = '█'.repeat(Math.floor(health.score / 10)) + '░'.repeat(10 - Math.floor(health.score / 10));
        reply = `Workflow Health: ${health.score}/100  [${bar}]  Grade: ${health.grade}\n\n`;

        if (health.issues.length) {
          reply += `Issues found:\n${health.issues.map(i => `  ${i.type === 'error' ? '🔴' : '🟡'} ${i.msg}`).join('\n')}\n\n`;
        }
        if (health.tips.length) {
          reply += `Suggestions:\n${health.tips.map(t => `  💡 ${t}`).join('\n')}`;
        }
        if (!health.issues.length && !health.tips.length) {
          reply += 'Excellent! No issues detected.';
        }
        suggestions = getContextualSuggestions('health', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // SIMULATE — trace the execution path step-by-step
      // ══════════════════════════════════════════════════════════════════
      case 'simulate': {
        if (!nodes.length) {
          reply = "Nothing to simulate — build a workflow first.";
          break;
        }

        const steps = simulateWorkflowExecution(nodes, edges);
        messageType = 'simulation';
        metadata    = { simulation: steps };
        reply = `Execution preview:\n\n${steps.join('\n')}`;
        suggestions = getContextualSuggestions('simulate', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // EXPLAIN — describe what the current workflow does
      // ══════════════════════════════════════════════════════════════════
      case 'explain': {
        if (!nodes.length) {
          reply = "The canvas is empty. Tell me what you want to automate and I'll build and explain it.";
          break;
        }

        const explanation = buildWorkflowExplanation(nodes);
        const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);
        const trigger = nodes.find(n => (n.data?.type || '').includes('trigger'));

        reply = `Your workflow has ${nodes.length} node${nodes.length !== 1 ? 's' : ''} across ${maxDepth + 1} step${maxDepth !== 0 ? 's' : ''}:\n\n`
          + explanation.map(s => `  • ${s}`).join('\n');

        if (trigger) reply += `\n\nIt starts when: ${trigger.data?.label || trigger.data?.type}`;
        if (unreachable.length) reply += `\n\n⚠️ ${unreachable.length} node(s) are disconnected — connect or remove them.`;

        suggestions = getContextualSuggestions('explain', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // IMPROVE — smart suggestions for a better workflow
      // ══════════════════════════════════════════════════════════════════
      case 'improve': {
        if (!nodes.length) {
          reply = "Build a workflow first and I'll suggest how to improve it.";
          break;
        }

        const health = analyzeWorkflowHealth(nodes, edges);
        const allTips = [...health.tips];
        const types = nodes.map(n => (n.data?.type || '').toLowerCase());

        if (!types.some(t => t === 'error_handler'))   allTips.push('Add an Error Handler node to catch failures');
        if (!types.some(t => t.includes('ai_')))       allTips.push('Add an AI Summarize step before notifications');
        if (!types.some(t => t === 'console_log'))     allTips.push('Add logging nodes to monitor execution');
        if (!types.some(t => t === 'delay'))           allTips.push('Add a Delay node to avoid rate-limit issues');
        if (!types.some(t => t === 'logic_if'))        allTips.push('Add a condition branch for smarter routing');

        if (allTips.length) {
          reply = `Here are my suggestions to improve your workflow:\n\n`
            + allTips.slice(0, 5).map((t, i) => `  ${i + 1}. 💡 ${t}`).join('\n')
            + '\n\nJust tell me which one to apply and I\'ll do it!';
        } else {
          reply = 'Your workflow is already well-structured! No critical improvements needed.';
        }
        suggestions = allTips.slice(0, 4);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // CLEAR
      // ══════════════════════════════════════════════════════════════════
      case 'clear': {
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', { nodes: [], edges: [] });
        reply = "Canvas cleared! What would you like to build? I can help you create any automation workflow.";
        messageType = 'message';
        suggestions = getContextualSuggestions('generate', []);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // HELP
      // ══════════════════════════════════════════════════════════════════
      case 'help': {
        reply = [
          "I'm Freckles, your AI workflow copilot. Here's what I can do:\n",
          "  🏗  Build workflows   — \"When a form is submitted, create a HubSpot lead\"",
          "  ✏️  Edit workflows    — \"Add a delay after the Slack node\"",
          "  🔧  Configure nodes  — \"Set delay to 5 minutes\" / \"Change channel to #alerts\"",
          "  🔍  Debug issues     — \"Check for issues\" / \"Fix my workflow\"",
          "  📊  Health score     — \"Analyze workflow health\" / \"Rate my workflow\"",
          "  ▶️  Simulate         — \"Show me the execution flow\"",
          "  💡  Suggest ideas    — \"How can I improve this workflow?\"",
          "  📖  Explain          — \"What does my workflow do?\"",
          "\nJust describe what you need in plain English!",
        ].join('\n');
        suggestions = getContextualSuggestions('generate', nodes);
        break;
      }

      // ══════════════════════════════════════════════════════════════════
      // UNKNOWN — try to be helpful rather than give up
      // ══════════════════════════════════════════════════════════════════
      default: {
        // Last resort: check if it looks like a workflow description
        const validation = validateWorkflowPrompt(message);
        if (validation.valid) {
          // Treat as generate
          let tpl;
          try { tpl = buildAutomationWorkflow(message); }
          catch { tpl = matchTemplate(message); }
          const optimized = optimizeWorkflowGraph(tpl.graph.nodes, tpl.graph.edges);
          updatedWorkflow  = applyWorkflowTool({ nodes, edges }, 'set_workflow', optimized);
          const summary    = buildWorkflowSummary(message, optimized.nodes);
          messageType = 'workflow_built';
          reply = `I detected a workflow request. Here's what I built: ${summary}`;
          metadata    = { summary };
        } else {
          reply = "I didn't quite catch that. I can help you:\n"
            + "  • Build a workflow — describe what to automate\n"
            + "  • Edit nodes — \"add a delay after slack\"\n"
            + "  • Debug issues — \"check for problems\"\n"
            + "  • Analyze health — \"show workflow score\"\n"
            + "  • Simulate — \"show execution steps\"\n\n"
            + "Type \"help\" to see all commands.";
        }
        suggestions = getContextualSuggestions(intent, nodes);
        break;
      }
    }

    return {
      reply,
      toolCalls:       updatedWorkflow ? [{ name: intent }] : [],
      updatedWorkflow,
      messageType,
      suggestions,
      metadata,
    };
  } catch (err) {
    logger.error('[intelligence] workflowChat error:', err);
    return {
      reply:           'Something went wrong. Please try again.',
      toolCalls:       [],
      updatedWorkflow: null,
      messageType:     'message',
      suggestions:     [],
      metadata:        {},
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
  analyzeWorkflowHealth,
  simulateWorkflowExecution,
};

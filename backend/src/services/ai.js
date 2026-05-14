'use strict';
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════
//  Flowa Intelligence Service
//  All features are implemented with classical CS algorithms — no LLM APIs.
//
//  Algorithms used:
//    • Keyword-frequency scoring   — generateWorkflow (template matching)
//    • DFS (Depth-First Search)    — suggestNodes (graph structure analysis)
//    • A* (h=0 → Dijkstra)        — documentWorkflow (critical-path tracing)
//    • Rule-based pattern matching — explainError, debugNode
//    • Intent classification       — workflowChat (keyword-scored intents)
// ════════════════════════════════════════════════════════════════════════════


// ── Node catalog (unchanged — already purely algorithmic) ──────────────────
const NODE_INDEX = [
  // Triggers
  { type: 'trigger_webhook',      cat: 'TRIGGERS',     kw: 'webhook http receive trigger incoming request',           desc: 'Start workflow on incoming HTTP webhook' },
  { type: 'trigger_cron',         cat: 'TRIGGERS',     kw: 'schedule cron recurring timer interval daily weekly',    desc: 'Trigger on a recurring schedule' },
  { type: 'trigger_email',        cat: 'TRIGGERS',     kw: 'email receive inbox trigger imap',                       desc: 'Trigger when a new email arrives' },
  { type: 'trigger_manual',       cat: 'TRIGGERS',     kw: 'manual button click start trigger test',                 desc: 'Start workflow manually' },
  // Google
  { type: 'google_sheets_read',   cat: 'GOOGLE',       kw: 'google sheets read spreadsheet rows data',               desc: 'Read rows from Google Sheets' },
  { type: 'google_sheets_write',  cat: 'GOOGLE',       kw: 'google sheets write append update row spreadsheet',      desc: 'Write or append rows to Google Sheets' },
  { type: 'google_gmail_send',    cat: 'GOOGLE',       kw: 'gmail send email google mail',                           desc: 'Send email via Gmail' },
  { type: 'google_gmail_read',    cat: 'GOOGLE',       kw: 'gmail read email google mail inbox',                     desc: 'Read emails from Gmail' },
  { type: 'google_drive_upload',  cat: 'GOOGLE',       kw: 'google drive upload file store',                         desc: 'Upload file to Google Drive' },
  { type: 'google_calendar_create',cat:'GOOGLE',        kw: 'google calendar create event meeting schedule',          desc: 'Create calendar event in Google Calendar' },
  { type: 'google_translate',     cat: 'GOOGLE',       kw: 'google translate language text',                         desc: 'Translate text using Google Translate' },
  // AI/ML (nodes stay in catalog so users can still configure them as workflow steps)
  { type: 'openai_chat',          cat: 'AI_ML',        kw: 'openai gpt chat completion llm ai prompt generate text', desc: 'Chat completion with OpenAI GPT models' },
  { type: 'anthropic_chat',       cat: 'AI_ML',        kw: 'anthropic claude chat completion llm ai prompt',         desc: 'Chat completion with Claude' },
  { type: 'ai_classify',          cat: 'AI_ML',        kw: 'classify categorize label ai sentiment analysis',        desc: 'Classify or categorize text with AI' },
  { type: 'ai_summarize',         cat: 'AI_ML',        kw: 'summarize summary text ai shorten abstract',             desc: 'Summarize text with AI' },
  // Messaging
  { type: 'slack_send',           cat: 'MESSAGING',    kw: 'slack send message channel notify alert',                desc: 'Send a message to a Slack channel' },
  { type: 'discord_send',         cat: 'MESSAGING',    kw: 'discord send message channel bot notify',                desc: 'Send a message to Discord' },
  { type: 'telegram_send',        cat: 'MESSAGING',    kw: 'telegram send message bot notify',                       desc: 'Send a message via Telegram bot' },
  { type: 'email_send',           cat: 'MESSAGING',    kw: 'email send smtp notify alert message',                   desc: 'Send an email via SMTP' },
  { type: 'twilio_sms',           cat: 'MESSAGING',    kw: 'twilio sms text message phone notify',                   desc: 'Send SMS via Twilio' },
  // Databases
  { type: 'postgres_query',       cat: 'DATABASES',    kw: 'postgres postgresql sql database query select',          desc: 'Run a SQL query on PostgreSQL' },
  { type: 'postgres_insert',      cat: 'DATABASES',    kw: 'postgres postgresql sql insert write database',          desc: 'Insert rows into PostgreSQL' },
  { type: 'mysql_query',          cat: 'DATABASES',    kw: 'mysql sql database query select',                        desc: 'Run a SQL query on MySQL' },
  { type: 'mongodb_find',         cat: 'DATABASES',    kw: 'mongodb nosql find query document collection',           desc: 'Query documents in MongoDB' },
  { type: 'mongodb_insert',       cat: 'DATABASES',    kw: 'mongodb nosql insert document collection',               desc: 'Insert documents into MongoDB' },
  { type: 'redis_get',            cat: 'DATABASES',    kw: 'redis cache get key value store read',                   desc: 'Get a value from Redis' },
  { type: 'redis_set',            cat: 'DATABASES',    kw: 'redis cache set key value store write',                  desc: 'Set a value in Redis' },
  // Cloud
  { type: 'aws_s3_upload',        cat: 'CLOUD',        kw: 'aws s3 upload file storage bucket amazon',               desc: 'Upload file to AWS S3' },
  { type: 'aws_s3_read',          cat: 'CLOUD',        kw: 'aws s3 read download file storage bucket amazon',        desc: 'Read file from AWS S3' },
  { type: 'github_create_pr',     cat: 'CLOUD',        kw: 'github pull request create code repository',             desc: 'Create a GitHub pull request' },
  { type: 'github_commit',        cat: 'CLOUD',        kw: 'github commit push code repository git',                 desc: 'Commit to a GitHub repository' },
  // HTTP
  { type: 'http_request',         cat: 'HTTP',         kw: 'http request api call get post put delete rest',         desc: 'Make an HTTP request to any URL' },
  { type: 'rest_get',             cat: 'HTTP',         kw: 'rest get api http fetch read',                           desc: 'HTTP GET request' },
  { type: 'rest_post',            cat: 'HTTP',         kw: 'rest post api http send create',                         desc: 'HTTP POST request' },
  // Files
  { type: 'csv_parse',            cat: 'FILES',        kw: 'csv parse read comma separated spreadsheet',             desc: 'Parse CSV data' },
  { type: 'pdf_extract',          cat: 'FILES',        kw: 'pdf extract text parse read document',                   desc: 'Extract text from a PDF' },
  // Transform
  { type: 'transform_set',        cat: 'TRANSFORM',    kw: 'set variable value transform map field',                 desc: 'Set or map data fields' },
  { type: 'json_parse',           cat: 'TRANSFORM',    kw: 'json parse string object convert',                       desc: 'Parse a JSON string' },
  { type: 'code_execute',         cat: 'TRANSFORM',    kw: 'code run execute javascript python custom logic',        desc: 'Run custom code' },
  { type: 'transform_filter',     cat: 'TRANSFORM',    kw: 'filter array data remove where condition',               desc: 'Filter array items by condition' },
  { type: 'transform_split',      cat: 'TRANSFORM',    kw: 'split array divide chunk items',                         desc: 'Split array into batches' },
  { type: 'transform_merge',      cat: 'TRANSFORM',    kw: 'merge combine join objects arrays data',                 desc: 'Merge multiple data objects' },
  // Logic
  { type: 'logic_if',             cat: 'LOGIC',        kw: 'if condition branch decision yes no',                    desc: 'Branch on a condition' },
  { type: 'logic_switch',         cat: 'LOGIC',        kw: 'switch case condition multiple branch route',            desc: 'Route to multiple branches' },
  { type: 'error_handler',        cat: 'LOGIC',        kw: 'error handle catch failure retry',                       desc: 'Handle errors gracefully' },
  { type: 'delay',                cat: 'LOGIC',        kw: 'delay wait pause sleep timeout',                         desc: 'Pause execution for a duration' },
  { type: 'loop_for_each',        cat: 'LOGIC',        kw: 'loop foreach iterate each item array repeat',            desc: 'Iterate over each item in an array' },
  // CRM
  { type: 'hubspot_contact',      cat: 'CRM',          kw: 'hubspot crm contact lead create update',                 desc: 'Create or update HubSpot contact' },
  { type: 'notion_page',          cat: 'CRM',          kw: 'notion create page document note',                       desc: 'Create a Notion page' },
  // Productivity
  { type: 'jira_create',          cat: 'PRODUCTIVITY', kw: 'jira ticket issue create project management',            desc: 'Create a Jira issue' },
  // Payments
  { type: 'stripe_payment_intent',cat: 'PAYMENTS',     kw: 'stripe payment charge create intent',                    desc: 'Create a Stripe payment intent' },
  // Utilities
  { type: 'console_log',          cat: 'UTILITIES',    kw: 'log debug print output console',                         desc: 'Log a value for debugging' },
  { type: 'date_time',            cat: 'UTILITIES',    kw: 'date time format now current timestamp',                 desc: 'Get or format date/time' },
  { type: 'math_operation',       cat: 'UTILITIES',    kw: 'math calculate arithmetic add multiply',                 desc: 'Perform a math operation' },
  { type: 'wait_approval',        cat: 'UTILITIES',    kw: 'wait approval human review pause manual',                desc: 'Pause and wait for human approval' },
];

// ── Keyword retrieval (unchanged — already purely algorithmic) ─────────────
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
//  WORKFLOW TEMPLATES
//  Used by generateWorkflow() and workflowChat() for the "build/create" intent.
//  Each template has a keyword list scored against the user's prompt.
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

const INVALID_AUTOMATION_MESSAGE = 'Invalid automation request. Please describe the workflow you want to automate in plain English.';

const INTEGRATION_TERMS = [
  'airtable', 'api', 'asana', 'calendar', 'crm', 'database', 'discord', 'email', 'file', 'gmail',
  'github', 'google', 'hubspot', 'jira', 'mail', 'mongodb', 'notion', 'postgres', 'redis', 'salesforce',
  'sheet', 'sheets', 'slack', 'stripe', 'telegram', 'trello', 'twilio', 'webhook', 'zapier',
];

const TRIGGER_TERMS = [
  'after', 'daily', 'every', 'hourly', 'new', 'on', 'once', 'received', 'recurring', 'schedule',
  'succeeds', 'trigger', 'updated', 'webhook', 'weekly', 'when', 'whenever',
];

const ACTION_TERMS = [
  'add', 'append', 'call', 'classify', 'create', 'delay', 'filter', 'generate', 'insert', 'notify',
  'post', 'route', 'save', 'send', 'summarize', 'sync', 'update', 'write',
];

function tokenizePrompt(prompt) {
  return String(prompt || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function validateAutomationPrompt(prompt) {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const tokens = tokenizePrompt(text);
  const alphaCount = (text.match(/[a-z]/gi) || []).length;
  const uniqueLetters = new Set((lower.match(/[a-z]/g) || [])).size;

  const greetingOnly = /^(hi|hello|hey|yo|thanks|thank you)$/i.test(text);
  const mostlySymbolsOrNumbers = alphaCount < 4 || alphaCount / Math.max(text.length, 1) < 0.35;
  const tooShort = tokens.length < 4 && text.length < 24;
  const likelyKeyboardMash = tokens.length <= 2 && uniqueLetters > 4 && !/[aeiou]/i.test(text);
  const hasAutomationShape =
    hasAny(lower, TRIGGER_TERMS) &&
    hasAny(lower, ACTION_TERMS) &&
    (hasAny(lower, INTEGRATION_TERMS) || lower.includes('ai') || lower.includes('automation') || lower.includes('workflow'));

  if (greetingOnly || mostlySymbolsOrNumbers || tooShort || likelyKeyboardMash || !hasAutomationShape) {
    throw new WorkflowValidationError(INVALID_AUTOMATION_MESSAGE);
  }
}

function inferTrigger(prompt) {
  const lower = prompt.toLowerCase();

  if (/(every|daily|morning|weekly|hourly|schedule|cron)/.test(lower)) {
    let expression = '0 9 * * *';
    if (/hourly|every hour/.test(lower)) expression = '0 * * * *';
    if (/weekly|every week/.test(lower)) expression = '0 9 * * 1';
    if (/morning/.test(lower)) expression = '0 8 * * *';
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
  const commonConfig = { sourcePrompt: prompt };

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
        unreadOnly: prompt.toLowerCase().includes('unread'),
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
      return makeNode(id, x, y, 'Update Spreadsheet', 'google_sheets_write', { spreadsheetId: '', range: '', values: '{{data}}' });
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
      return makeNode(id, x, y, 'Delay', 'delay', { duration: lower.match(/(\d+)\s*(minute|minutes|min|hour|hours|day|days)/)?.[0] || '5 minutes' });
    default:
      return makeNode(id, x, y, 'Prepare Data', 'transform_set', commonConfig);
  }
}

function inferActions(prompt) {
  const lower = prompt.toLowerCase();
  const actions = [];

  if (/(gmail|email|mail).*(read|unread|inbox|summar)|(?:read|unread|inbox|summar).*?(gmail|email|mail)/.test(lower)) actions.push('gmail_read');
  if (/classif|categor|sentiment|label/.test(lower)) actions.push('classify');
  if (/summar/.test(lower)) actions.push('summarize');
  if (/delay|wait|pause/.test(lower)) actions.push('delay');
  if (/hubspot/.test(lower)) actions.push('hubspot');
  if (/airtable/.test(lower)) actions.push('airtable');
  if (/spreadsheet|google sheet|sheets/.test(lower)) actions.push('sheet');
  if (/database|postgres|sql|store|save|insert/.test(lower)) actions.push('database');
  if (/jira|ticket|issue/.test(lower)) actions.push('jira');
  if (/notion/.test(lower)) actions.push('notion');
  if (/api|http|webhook response|call/.test(lower) && !lower.includes('webhook is received')) actions.push('http');
  if (/send.*gmail|gmail.*send.*(email|mail)/.test(lower)) actions.push('gmail');
  else if (/(send|notify|alert).*\b(email|mail)\b|\b(email|mail)\b.*(send|notify|alert)/.test(lower)) actions.push('email');
  if (/slack/.test(lower)) actions.push('slack');
  if (/discord/.test(lower)) actions.push('discord');

  return [...new Set(actions)];
}

function inferCondition(prompt) {
  const lower = prompt.toLowerCase();
  if (/\bif\b|only if|when .* negative|unless|where|filter/.test(lower)) {
    let condition = '{{condition}}';
    if (/negative/.test(lower)) condition = '{{classification}} === "negative"';
    if (/payment.*succeed|succeeded|success/.test(lower)) condition = '{{payment.status}} === "succeeded"';
    if (/high[- ]?value|qualified|hot lead/.test(lower)) condition = '{{lead.score}} >= 80';
    return { label: 'Check Condition', condition };
  }
  return null;
}

function buildAutomationWorkflow(prompt) {
  validateAutomationPrompt(prompt);

  const nodes = [inferTrigger(prompt)];
  const edges = [];
  let previousId = 'n1';
  let nextIndex = 2;
  let x = 390;

  const actions = inferActions(prompt);
  if (actions.length === 0) {
    throw new WorkflowValidationError('Please include at least one action, such as send, update, create, summarize, classify, or notify.');
  }

  const sourceActions = actions.filter(action => ['gmail_read'].includes(action));
  for (const action of sourceActions) {
    const id = `n${nextIndex++}`;
    nodes.push(actionNodeFor(prompt, action, id, x, 220));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  const needsTransform = actions.some(action => ['slack', 'discord', 'email', 'gmail', 'sheet', 'database', 'hubspot', 'jira', 'notion', 'http', 'airtable'].includes(action));
  if (needsTransform) {
    const id = `n${nextIndex++}`;
    nodes.push(makeNode(id, x, 220, 'Prepare Data', 'transform_set', { mapping: '{}' }));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  const analysisActions = actions.filter(action => ['classify', 'summarize', 'delay'].includes(action));
  for (const action of analysisActions) {
    const id = `n${nextIndex++}`;
    nodes.push(actionNodeFor(prompt, action, id, x, 220));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  const condition = inferCondition(prompt);
  if (condition) {
    const id = `n${nextIndex++}`;
    nodes.push(makeNode(id, x, 220, condition.label, 'logic_if', { condition: condition.condition }));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
    previousId = id;
    x += 290;
  }

  const outputActions = actions.filter(action => !['gmail_read', 'classify', 'summarize', 'delay'].includes(action));
  for (const [index, action] of outputActions.entries()) {
    const id = `n${nextIndex++}`;
    const y = condition && outputActions.length > 1 ? 120 + (index * 180) : 220;
    nodes.push(actionNodeFor(prompt, action, id, x, y));
    edges.push(makeEdge(`e${edges.length + 1}`, previousId, id));
  }

  return {
    name: 'Generated Automation Workflow',
    description: `Generated from: ${prompt}`,
    graph: { nodes, edges },
  };
}

const WORKFLOW_TEMPLATES = [
  {
    name: 'Email Automation',
    keywords: ['email', 'mail', 'smtp', 'send', 'notify', 'notification', 'alert', 'message', 'inbox'],
    description: 'Trigger on webhook, transform payload, then send an email notification.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Webhook Trigger',  'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Transform Data',   'transform_set',   { mapping: '{}' }),
        makeNode('n3', 700, 200, 'Send Email',        'email_send',      { to: '', subject: 'Notification', body: '{{data}}' }),
        makeNode('n4', 700, 380, 'Error Handler',     'error_handler',   { retries: 2 }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n3', 'n4'),
      ],
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
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
      ],
    },
  },
  {
    name: 'Scheduled Data Pipeline',
    keywords: ['schedule', 'cron', 'daily', 'weekly', 'recurring', 'pipeline', 'sync', 'fetch', 'api', 'database', 'db', 'store', 'save'],
    description: 'Cron-triggered pipeline: fetch data via HTTP, transform it, insert into database.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Cron Trigger',    'trigger_cron',    { expression: '0 9 * * *' }),
        makeNode('n2', 400, 200, 'Fetch Data',       'http_request',    { method: 'GET', url: '' }),
        makeNode('n3', 700, 200, 'Parse Response',   'json_parse',      {}),
        makeNode('n4', 700, 380, 'Filter Records',   'transform_filter',{ condition: '' }),
        makeNode('n5', 1000, 280,'Insert to DB',     'postgres_insert', { table: '', data: '{{records}}' }),
        makeNode('n6', 1000, 440,'Log Result',        'console_log',     { message: 'Pipeline complete' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n3', 'n4'),
        makeEdge('e4', 'n4', 'n5'),
        makeEdge('e5', 'n5', 'n6'),
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
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n2', 'n4'),
        makeEdge('e4', 'n3', 'n5'),
        makeEdge('e5', 'n4', 'n5'),
      ],
    },
  },
  {
    name: 'Lead Capture & CRM',
    keywords: ['lead', 'crm', 'contact', 'hubspot', 'salesforce', 'form', 'signup', 'subscribe', 'register', 'user'],
    description: 'Capture form submission, create CRM contact, send welcome email.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Form Webhook',    'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Extract Fields',  'transform_set',   { mapping: '{}' }),
        makeNode('n3', 700, 100, 'Create Contact',  'hubspot_contact', { email: '{{email}}', name: '{{name}}' }),
        makeNode('n4', 700, 300, 'Welcome Email',   'email_send',      { to: '{{email}}', subject: 'Welcome!', body: 'Hi {{name}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n2', 'n4'),
      ],
    },
  },
  {
    name: 'GitHub CI Notification',
    keywords: ['github', 'git', 'ci', 'deploy', 'build', 'commit', 'pull', 'pr', 'release', 'devops', 'pipeline', 'code'],
    description: 'On GitHub webhook, check status, notify Slack on failure or success.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'GitHub Webhook',  'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Check Status',    'logic_if',        { condition: '{{status}} === "success"' }),
        makeNode('n3', 700, 100, 'Notify Success',  'slack_send',      { channel: '#deploys', message: '✅ Build passed: {{ref}}' }),
        makeNode('n4', 700, 300, 'Notify Failure',  'slack_send',      { channel: '#deploys', message: '❌ Build failed: {{ref}}' }),
        makeNode('n5', 700, 440, 'Log Error',        'console_log',     { message: '{{error}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n2', 'n4'),
        makeEdge('e4', 'n4', 'n5'),
      ],
    },
  },
  {
    name: 'Report Generation',
    keywords: ['report', 'summary', 'weekly', 'daily', 'monthly', 'digest', 'analytics', 'stats', 'metrics', 'google sheets', 'spreadsheet'],
    description: 'Scheduled report: query database, merge results, email a summary.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Schedule Trigger',  'trigger_cron',    { expression: '0 8 * * 1' }),
        makeNode('n2', 400, 200, 'Query Database',    'postgres_query',  { query: 'SELECT * FROM metrics WHERE date >= NOW() - INTERVAL \'7 days\'' }),
        makeNode('n3', 700, 200, 'Merge Results',     'transform_merge', {}),
        makeNode('n4', 1000, 200,'Email Report',       'email_send',      { to: '', subject: 'Weekly Report', body: '{{report}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n3', 'n4'),
      ],
    },
  },
  {
    name: 'File Processing Pipeline',
    keywords: ['file', 'csv', 'pdf', 'upload', 'parse', 'process', 'extract', 'document', 'data', 'import'],
    description: 'Webhook triggers file fetch, parses CSV/PDF, stores results in database.',
    graph: {
      nodes: [
        makeNode('n1', 100, 200, 'Upload Webhook',  'trigger_webhook', {}),
        makeNode('n2', 400, 200, 'Fetch File',       'http_request',   { method: 'GET', url: '{{file_url}}' }),
        makeNode('n3', 700, 200, 'Parse CSV',        'csv_parse',       {}),
        makeNode('n4', 1000, 200,'Filter Rows',       'transform_filter',{ condition: '' }),
        makeNode('n5', 1300, 200,'Insert Records',   'postgres_insert', { table: 'imports', data: '{{rows}}' }),
      ],
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
        makeEdge('e3', 'n3', 'n4'),
        makeEdge('e4', 'n4', 'n5'),
      ],
    },
  },
];

// Score a template against a prompt using token frequency (keyword matching)
function scoreTemplate(template, promptTokens) {
  return template.keywords.reduce((score, kw) => {
    return score + (promptTokens.includes(kw) ? 2 : 0) +
      promptTokens.filter(t => kw.includes(t) || t.includes(kw)).length;
  }, 0);
}

// Pick best-matching template; fall back to a minimal generic workflow
function matchTemplate(prompt) {
  const tokens = prompt.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  let best = null;
  let bestScore = 0;

  for (const tpl of WORKFLOW_TEMPLATES) {
    const s = scoreTemplate(tpl, tokens);
    if (s > bestScore) { bestScore = s; best = tpl; }
  }

  if (best && bestScore >= 2) return best;

  // Generic fallback — uses retrieveNodes to pick a relevant output node
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
      edges: [
        makeEdge('e1', 'n1', 'n2'),
        makeEdge('e2', 'n2', 'n3'),
      ],
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

// ── DFS ───────────────────────────────────────────────────────────────────
// Traverses the workflow graph from all trigger nodes.
// Returns: visited set, per-node depth, and unreachable node ids.
function analyzeGraphDFS(nodes, edges) {
  const adj    = buildAdjacencyList(nodes, edges);
  const visited = new Set();
  const depth   = {};

  function dfs(id, d) {
    if (visited.has(id)) return;
    visited.add(id);
    depth[id] = d;
    for (const next of (adj[id] || [])) dfs(next, d + 1);
  }

  const triggers = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  // If no trigger, start from every node with no incoming edges
  const starts = triggers.length
    ? triggers
    : nodes.filter(n => !edges.some(e => e.target === n.id));

  for (const s of starts) dfs(s.id, 0);

  const maxDepth    = Object.values(depth).reduce((m, v) => Math.max(m, v), 0);
  const unreachable = nodes.filter(n => !visited.has(n.id)).map(n => n.id);

  return { visited, depth, maxDepth, unreachable };
}

// ── A* (h = 0, degrades to Dijkstra / BFS on unit-cost graph) ────────────
// Finds the shortest path from the first trigger to the nearest terminal node.
// Used to produce an ordered step list for documentWorkflow.
function aStarShortestPath(nodes, edges) {
  if (!nodes.length) return [];

  const adj     = buildAdjacencyList(nodes, edges);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const triggers  = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  const startId   = (triggers[0] || nodes[0]).id;
  const terminals = new Set(nodes.filter(n => !(adj[n.id] || []).length).map(n => n.id));

  // g[id] = best known cost (hops) from start
  const g = {};
  nodes.forEach(n => { g[n.id] = Infinity; });
  g[startId] = 0;

  // h(id) = 0  →  admissible null heuristic (A* becomes Dijkstra)
  const h = () => 0;

  // Open set tracked as a plain array (graphs are small, sort cost is negligible)
  const openSet  = new Set([startId]);
  const parent   = { [startId]: null };
  const closed   = new Set();

  while (openSet.size > 0) {
    // Pick node with smallest f = g + h
    let curr = null;
    let minF  = Infinity;
    for (const id of openSet) {
      const f = g[id] + h(id);
      if (f < minF) { minF = f; curr = id; }
    }

    openSet.delete(curr);
    closed.add(curr);

    if (terminals.has(curr)) {
      // Reconstruct path
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

  // No path found — return DFS visitation order as fallback
  const { visited, depth } = analyzeGraphDFS(nodes, edges);
  return [...visited]
    .map(id => ({ id, d: depth[id] || 0 }))
    .sort((a, b) => a.d - b.d)
    .map(({ id }) => nodeMap[id])
    .filter(Boolean);
}


// ════════════════════════════════════════════════════════════════════════════
//  ERROR RULE TABLES
//  Used by explainError() and debugNode().
// ════════════════════════════════════════════════════════════════════════════

// Keyed by node type prefix — each rule has: patterns, diagnosis, fix, prevention
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

// Match nodeType to the relevant rule group
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
//  INTENT PATTERNS  (used by workflowChat)
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

function detectIntent(message) {
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

// Extract the node type most relevant to the message
function extractNodeType(message) {
  const top = retrieveNodes(message, 3);
  return top.length ? top[0].type : 'console_log';
}

// Find an existing node in the workflow by fuzzy label match
function findNodeByLabel(nodes, hint) {
  const h = hint.toLowerCase();
  return nodes.find(n => (n.data?.label || '').toLowerCase().includes(h)) || null;
}

const CHAT_HELP_TEXT =
  'I can help you with your workflow canvas. Try:\n' +
  '• "Build a Slack notification workflow"\n' +
  '• "Add an email node"\n' +
  '• "Remove the transform node"\n' +
  '• "Connect the webhook to the database"\n' +
  '• "Clear the canvas"\n\n' +
  '💡 Advanced conversational AI is coming soon — for now I handle direct commands.';


// ════════════════════════════════════════════════════════════════════════════
//  APPLY WORKFLOW TOOL  (unchanged — purely algorithmic, no LLM)
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
 * Generate a workflow graph from a natural language prompt.
 * Algorithm: keyword-frequency scoring against predefined templates.
 */
async function generateWorkflow(prompt) {
  try {
    const tpl = buildAutomationWorkflow(prompt);
    logger.info(`[intelligence] generateWorkflow built automation graph: "${tpl.name}"`);
    return {
      graph:      tpl.graph,
      description: tpl.description || prompt,
      model:      'deterministic-workflow-generator',
      tokensUsed: 0,
    };
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      throw err;
    }
    logger.error('[intelligence] generateWorkflow error:', err);
    return {
      graph: {
        nodes: [
          makeNode('n1', 100, 200, 'Manual Trigger', 'trigger_manual',  {}),
          makeNode('n2', 400, 200, 'Log Output',      'console_log',     { message: `Workflow: ${prompt}` }),
        ],
        edges: [makeEdge('e1', 'n1', 'n2')],
      },
      description: prompt,
      model:      'fallback',
      tokensUsed: 0,
    };
  }
}

/**
 * Explain a failed workflow execution.
 * Algorithm: rule-based pattern matching on error message + node type.
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

    // Generic: list each failed node
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
 * Diagnose a single failed node and suggest a fix.
 * Algorithm: rule-based lookup table keyed by node type + error pattern.
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

    // No rule matched — give generic advice scoped to the node type
    const category = getRulesForNodeType(nodeType || '').length
      ? nodeType
      : 'this node type';

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
 * Suggest nodes to improve a workflow.
 * Algorithm: DFS-based structural analysis of the workflow graph.
 *
 * Rules applied after DFS:
 *  R1 — No error handler present → suggest error_handler
 *  R2 — HTTP/REST node with no transform → suggest transform_set
 *  R3 — Chain depth > 4 with no branch → suggest logic_if
 *  R4 — No logging in a non-trivial graph → suggest console_log
 *  R5 — Unreachable nodes detected → suggest removing them or adding edges
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

    const types         = nodes.map(n => (n.data?.type || n.type || '').toLowerCase());
    const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);

    const suggestions = [];

    // R1: no error handler
    if (!types.some(t => t === 'error_handler')) {
      suggestions.push({ type: 'error_handler', reason: 'No error handling detected — add one to catch failures and retry gracefully.' });
    }

    // R2: HTTP node with no transform
    const hasHttp      = types.some(t => t.includes('http') || t.startsWith('rest_'));
    const hasTransform = types.some(t => t.includes('transform') || t === 'json_parse');
    if (hasHttp && !hasTransform) {
      suggestions.push({ type: 'transform_set', reason: 'HTTP responses often need field mapping before the next step — add a Transform node.' });
    }

    // R3: deep linear chain without branching
    const hasBranch = types.some(t => t === 'logic_if' || t === 'logic_switch');
    if (maxDepth > 4 && !hasBranch) {
      suggestions.push({ type: 'logic_if', reason: `Chain is ${maxDepth} steps deep with no branching — add a Logic If node to handle edge cases.` });
    }

    // R4: no logging
    if (!types.some(t => t === 'console_log') && nodes.length > 3) {
      suggestions.push({ type: 'console_log', reason: 'No logging nodes found — add one to track execution state and simplify debugging.' });
    }

    // R5: unreachable nodes
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
 * Generate documentation for a workflow.
 * Algorithm: A* shortest path from trigger → terminal to order the steps.
 */
async function documentWorkflow(workflow) {
  try {
    const graphData  = typeof workflow.graph === 'string'
      ? JSON.parse(workflow.graph)
      : (workflow.graph || { nodes: [], edges: [] });

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    // A* gives us a meaningful execution order from trigger to terminal
    const path  = aStarShortestPath(nodes, edges);
    const steps = path.map((n, i) => ({
      node:        n?.data?.label || n?.id || `Step ${i + 1}`,
      description: n?.data?.type
        ? `${n.data.type} — ${NODE_INDEX.find(ni => ni.type === n.data.type)?.desc || 'workflow step'}`
        : 'Workflow step',
    }));

    // Infer inputs/outputs from trigger and terminal node types
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
 * Conversational workflow assistant.
 * Algorithm: intent classification (keyword scoring) + direct graph operations.
 *
 * Intents handled algorithmically:
 *   generate    → template matching (matchTemplate)
 *   add_node    → retrieveNodes picks the best type, applyWorkflowTool adds it
 *   remove_node → fuzzy label search, applyWorkflowTool removes it
 *   connect     → label search for source/target, applyWorkflowTool adds edge
 *   clear       → set_workflow with empty graph
 *   explain     → DFS analysis summary of current workflow
 *   help        → static help text
 *   unknown     → guidance + help text
 *
 * Note: Advanced conversational AI (multi-turn context, LLM) is not active.
 */
async function workflowChat({ message, history, workflow }) {
  try {
    const intent = detectIntent(message);
    const nodes  = workflow?.nodes || [];
    const edges  = workflow?.edges || [];
    let updatedWorkflow = null;
    let reply           = '';

    switch (intent) {
      case 'generate': {
        const tpl = matchTemplate(message);
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', tpl.graph);
        reply = `Built a "${tpl.name}" workflow for you — ${tpl.description}`;
        break;
      }

      case 'clear': {
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', { nodes: [], edges: [] });
        reply = 'Canvas cleared. Ready for a fresh start — what would you like to build?';
        break;
      }

      case 'add_node': {
        const nodeType = extractNodeType(message);
        const nodeDef  = NODE_INDEX.find(n => n.type === nodeType);
        const id       = `${nodeType}-${Date.now()}`;
        const lastX    = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
        const newNode  = {
          id,
          nodeType,
          label:    nodeDef?.desc || nodeType,
          position: { x: lastX + 280, y: 200 },
          config:   {},
        };
        updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'add_node', newNode);
        reply = `Added a "${nodeDef?.desc || nodeType}" node to the canvas.`;
        break;
      }

      case 'remove_node': {
        // Try to find which node the user means from the message text
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

      case 'connect': {
        // Simple heuristic: pick last two nodes if no label hints found
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

      case 'explain': {
        if (!nodes.length) {
          reply = 'The canvas is empty. Tell me what you want to automate and I\'ll build it.';
          break;
        }
        const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);
        const types = [...new Set(nodes.map(n => n.data?.type || n.type))];
        reply = `Your workflow has ${nodes.length} node${nodes.length !== 1 ? 's' : ''} and ${edges.length} connection${edges.length !== 1 ? 's' : ''}, `
          + `reaching ${maxDepth + 1} step${maxDepth > 0 ? 's' : ''} deep. `
          + `Node types: ${types.join(', ')}.`
          + (unreachable.length ? ` ⚠️ ${unreachable.length} node(s) are disconnected.` : ' All nodes are reachable from the trigger.');
        break;
      }

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
      reply:          'Something went wrong. Please try again.',
      toolCalls:      [],
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
};

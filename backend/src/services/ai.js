'use strict';
const logger = require('../utils/logger');

/* ════════════════════════════════════════════════════════════════════════
 *  FLOWA INTELLIGENCE SERVICE
 *  ──────────────────────────────────────────────────────────────────────
 *  Pure-algorithm AI replacement for the workflow automation platform.
 *  No external LLM APIs — every decision uses classical CS / NLP.
 *
 *  Techniques in use:
 *    • Tokenization, stop-word removal, n-grams
 *    • TF-IDF scoring across a node catalog
 *    • Levenshtein-based fuzzy matching for typo tolerance
 *    • Cosine similarity for intent classification
 *    • Synonym expansion via a hand-crafted lexicon
 *    • Entity extraction (triggers, sources, actions, destinations, schedules)
 *    • Compositional workflow synthesis from extracted entities
 *    • DFS for graph reachability / structure analysis / cycle detection
 *    • A*  (h=0 → Dijkstra) for critical-path-based documentation
 *    • Rule-based diagnostic engine for error & node debugging
 *    • Scope-locking off-topic detector
 * ══════════════════════════════════════════════════════════════════════ */


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 1.  NLP UTILITIES                                                    │
 * └──────────────────────────────────────────────────────────────────────┘ */

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','am',
  'have','has','had','do','does','did','will','would','could','should','may','might','can',
  'i','you','we','they','it','this','that','these','those','him','her','them',
  'and','or','but','so','because','if','as','while','although','since','though',
  'to','of','in','on','at','by','with','for','about','into','from','over','under',
  'me','my','mine','our','ours','your','yours','their','theirs','his','hers','its',
  's','t','re','ve','ll','d','m','o',
]);

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(t => t.length > 0);
}
function removeStopWords(tokens) { return tokens.filter(t => !STOP_WORDS.has(t)); }
function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i <= tokens.length - n; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[0][i] = i;
  for (let j = 0; j <= b.length; j++) m[j][0] = j;
  for (let j = 1; j <= b.length; j++) for (let i = 1; i <= a.length; i++) {
    const c = a[i-1] === b[j-1] ? 0 : 1;
    m[j][i] = Math.min(m[j][i-1] + 1, m[j-1][i] + 1, m[j-1][i-1] + c);
  }
  return m[b.length][a.length];
}
function fuzzyMatch(a, b) {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb; normA += va * va; normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

const SYNONYMS = {
  send: ['post','submit','deliver','push','dispatch','fire','transmit'],
  receive: ['get','fetch','pull','retrieve','read','load'],
  notify: ['alert','message','inform','ping','tell','remind','notify'],
  schedule: ['cron','recurring','periodic','timer','interval'],
  webhook: ['http','endpoint','callback','incoming'],
  transform: ['convert','map','parse','modify','format','shape'],
  filter: ['where','condition','exclude','narrow'],
  store: ['save','persist','insert','write','record'],
  classify: ['categorize','label','tag','sort'],
  summarize: ['summary','shorten','abstract','digest'],
  email: ['mail','smtp','gmail'],
  database: ['db','sql','table'],
  spreadsheet: ['sheet','sheets','excel','csv'],
  daily: ['everyday','each day','every day'],
  hourly: ['per hour'],
  fetch: ['retrieve','pull','download','get','check','lookup','look up','request','call','hit'],
  whatsapp: ['wa','whats app'],
  sms: ['text message','text msg'],
  price: ['rate','cost','value','quote','exchange rate'],
};

function expandSynonyms(tokens) {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const [base, syns] of Object.entries(SYNONYMS)) {
      if (t === base) syns.forEach(s => out.add(s));
      else if (syns.includes(t)) { out.add(base); syns.forEach(s => out.add(s)); }
    }
  }
  return [...out];
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 2.  NODE CATALOG with TF-IDF                                         │
 * └──────────────────────────────────────────────────────────────────────┘ */

const NODE_INDEX = [
  { type: 'trigger_webhook', cat: 'TRIGGERS', kw: 'webhook http receive incoming request endpoint callback post', desc: 'Start workflow on incoming HTTP webhook' },
  { type: 'trigger_cron',    cat: 'TRIGGERS', kw: 'schedule cron recurring timer interval daily weekly hourly every', desc: 'Trigger on a recurring schedule' },
  { type: 'trigger_email',   cat: 'TRIGGERS', kw: 'email receive inbox trigger imap incoming mail', desc: 'Trigger when a new email arrives' },
  { type: 'trigger_manual',  cat: 'TRIGGERS', kw: 'manual button click start test run trigger', desc: 'Start workflow manually' },

  { type: 'google_sheets_read',  cat: 'GOOGLE', kw: 'google sheets read spreadsheet rows data table', desc: 'Read rows from Google Sheets' },
  { type: 'google_sheets_write', cat: 'GOOGLE', kw: 'google sheets write append update row spreadsheet', desc: 'Write or append rows to Google Sheets' },
  { type: 'google_gmail_send',   cat: 'GOOGLE', kw: 'gmail send email google mail outbox', desc: 'Send email via Gmail' },
  { type: 'google_gmail_read',   cat: 'GOOGLE', kw: 'gmail read email google mail inbox', desc: 'Read emails from Gmail' },
  { type: 'google_drive_upload', cat: 'GOOGLE', kw: 'google drive upload file store', desc: 'Upload file to Google Drive' },
  { type: 'google_calendar_create', cat: 'GOOGLE', kw: 'google calendar create event meeting schedule', desc: 'Create calendar event' },

  { type: 'openai_chat',     cat: 'AI_ML', kw: 'openai gpt chat completion llm ai prompt generate text', desc: 'Chat completion with OpenAI GPT' },
  { type: 'anthropic_chat',  cat: 'AI_ML', kw: 'anthropic claude chat completion llm ai prompt', desc: 'Chat completion with Claude' },
  { type: 'ai_classify',     cat: 'AI_ML', kw: 'classify categorize label sentiment analysis tag', desc: 'Classify or categorize text' },
  { type: 'ai_summarize',    cat: 'AI_ML', kw: 'summarize summary text shorten abstract digest', desc: 'Summarize text' },

  { type: 'slack_send',      cat: 'MESSAGING', kw: 'slack send message channel notify alert team', desc: 'Send a message to a Slack channel' },
  { type: 'discord_send',    cat: 'MESSAGING', kw: 'discord send message channel bot notify', desc: 'Send a message to Discord' },
  { type: 'telegram_send',   cat: 'MESSAGING', kw: 'telegram send message bot notify', desc: 'Send a message via Telegram' },
  { type: 'email_send',      cat: 'MESSAGING', kw: 'email send smtp notify alert message mail', desc: 'Send an email via SMTP' },
  { type: 'twilio_sms',       cat: 'MESSAGING', kw: 'twilio sms text message phone notify', desc: 'Send SMS via Twilio' },
  { type: 'twilio_whatsapp',  cat: 'MESSAGING', kw: 'twilio whatsapp whatsapp message wa business api send whatsapp via twilio', desc: 'Send WhatsApp message via Twilio' },

  { type: 'postgres_query',  cat: 'DATABASES', kw: 'postgres postgresql sql database query select read', desc: 'Run a SQL query on PostgreSQL' },
  { type: 'postgres_insert', cat: 'DATABASES', kw: 'postgres postgresql sql insert write database store', desc: 'Insert rows into PostgreSQL' },
  { type: 'mysql_query',     cat: 'DATABASES', kw: 'mysql sql database query select', desc: 'Run a SQL query on MySQL' },
  { type: 'mongodb_find',    cat: 'DATABASES', kw: 'mongodb nosql find query document collection', desc: 'Query documents in MongoDB' },
  { type: 'mongodb_insert',  cat: 'DATABASES', kw: 'mongodb nosql insert document collection write store', desc: 'Insert documents into MongoDB' },
  { type: 'redis_get',       cat: 'DATABASES', kw: 'redis cache get key value store read', desc: 'Get a value from Redis' },
  { type: 'redis_set',       cat: 'DATABASES', kw: 'redis cache set key value store write', desc: 'Set a value in Redis' },

  { type: 'aws_s3_upload',   cat: 'CLOUD', kw: 'aws s3 upload file storage bucket amazon', desc: 'Upload file to AWS S3' },
  { type: 'aws_s3_read',     cat: 'CLOUD', kw: 'aws s3 read download file storage bucket', desc: 'Read file from AWS S3' },
  { type: 'github_create_pr',cat: 'CLOUD', kw: 'github pull request create code repository pr', desc: 'Create a GitHub PR' },
  { type: 'github_commit',   cat: 'CLOUD', kw: 'github commit push code repository git', desc: 'Commit to a GitHub repository' },

  { type: 'http_request',    cat: 'HTTP', kw: 'http request api call get post put delete rest fetch', desc: 'Make an HTTP request' },
  { type: 'rest_get',        cat: 'HTTP', kw: 'rest get api http fetch read', desc: 'HTTP GET request' },
  { type: 'rest_post',       cat: 'HTTP', kw: 'rest post api http send create', desc: 'HTTP POST request' },

  { type: 'csv_parse',       cat: 'FILES', kw: 'csv parse read comma separated spreadsheet', desc: 'Parse CSV data' },
  { type: 'pdf_extract',     cat: 'FILES', kw: 'pdf extract text parse read document', desc: 'Extract text from a PDF' },

  { type: 'transform_set',   cat: 'TRANSFORM', kw: 'set variable value transform map field convert format', desc: 'Set or map data fields' },
  { type: 'json_parse',      cat: 'TRANSFORM', kw: 'json parse string object convert', desc: 'Parse a JSON string' },
  { type: 'code_execute',    cat: 'TRANSFORM', kw: 'code run execute javascript python custom logic script', desc: 'Run custom code' },
  { type: 'code_python',     cat: 'TRANSFORM', kw: 'python code run execute script custom logic', desc: 'Run custom Python code' },
  { type: 'code_javascript', cat: 'TRANSFORM', kw: 'javascript js code run execute script custom', desc: 'Run custom JavaScript code' },
  { type: 'transform_filter',cat: 'TRANSFORM', kw: 'filter array data remove where condition only', desc: 'Filter array items' },
  { type: 'transform_split', cat: 'TRANSFORM', kw: 'split array divide chunk items batch', desc: 'Split array into batches' },
  { type: 'transform_merge', cat: 'TRANSFORM', kw: 'merge combine join objects arrays data', desc: 'Merge multiple data objects' },

  { type: 'logic_if',        cat: 'LOGIC', kw: 'if condition branch decision yes no when', desc: 'Branch on a condition' },
  { type: 'logic_switch',    cat: 'LOGIC', kw: 'switch case condition multiple branch route', desc: 'Route to multiple branches' },
  { type: 'error_handler',   cat: 'LOGIC', kw: 'error handle catch failure retry exception', desc: 'Handle errors gracefully' },
  { type: 'delay',           cat: 'LOGIC', kw: 'delay wait pause sleep timeout', desc: 'Pause execution' },
  { type: 'loop_for_each',   cat: 'LOGIC', kw: 'loop foreach iterate each item array repeat', desc: 'Iterate over array items' },

  { type: 'hubspot_contact', cat: 'CRM', kw: 'hubspot crm contact lead create update', desc: 'Create/update HubSpot contact' },
  { type: 'notion_page',     cat: 'CRM', kw: 'notion create page document note', desc: 'Create a Notion page' },
  { type: 'salesforce_query',cat: 'CRM', kw: 'salesforce crm query lead contact account', desc: 'Query Salesforce CRM' },
  { type: 'airtable_create', cat: 'CRM', kw: 'airtable create record database spreadsheet', desc: 'Create a record in Airtable' },

  { type: 'jira_create',     cat: 'PRODUCTIVITY', kw: 'jira ticket issue create project management bug', desc: 'Create a Jira issue' },
  { type: 'trello_card',     cat: 'PRODUCTIVITY', kw: 'trello card board create task project', desc: 'Create a Trello card' },

  { type: 'stripe_payment_intent', cat: 'PAYMENTS', kw: 'stripe payment charge create intent', desc: 'Create a Stripe payment intent' },

  { type: 'console_log',     cat: 'UTILITIES', kw: 'log debug print output console', desc: 'Log a value for debugging' },
  { type: 'date_time',       cat: 'UTILITIES', kw: 'date time format now current timestamp', desc: 'Get or format date/time' },
  { type: 'math_operation',  cat: 'UTILITIES', kw: 'math calculate arithmetic add multiply', desc: 'Perform a math operation' },
  { type: 'wait_approval',   cat: 'UTILITIES', kw: 'wait approval human review pause manual', desc: 'Wait for human approval' },
];

// Pre-compute IDF
const IDF = (() => {
  const N = NODE_INDEX.length;
  const df = {};
  for (const node of NODE_INDEX) {
    const seen = new Set(tokenize(`${node.kw} ${node.desc}`));
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const t in df) idf[t] = Math.log(N / df[t]);
  return idf;
})();

function tfidfVector(text) {
  const tokens = expandSynonyms(removeStopWords(tokenize(text)));
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const vec = {};
  for (const t in tf) vec[t] = tf[t] * (IDF[t] || 1);
  return vec;
}

function retrieveNodes(query, topN = 22) {
  if (!query || !query.trim()) return NODE_INDEX.slice(0, topN);
  const qVec = tfidfVector(query);
  const scored = NODE_INDEX.map(node => ({
    node,
    score: cosineSim(qVec, tfidfVector(`${node.kw} ${node.desc} ${node.type}`)),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN).map(s => s.node);
  if (!top.some(n => n.cat === 'TRIGGERS')) top.push(NODE_INDEX.find(n => n.type === 'trigger_manual'));
  if (!top.some(n => n.cat === 'LOGIC'))    top.push(NODE_INDEX.find(n => n.type === 'logic_if'));
  return top;
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 3.  ENTITY EXTRACTION                                                │
 * └──────────────────────────────────────────────────────────────────────┘ */

const ENTITY_PATTERNS = {
  triggers: {
    webhook: { kw: ['webhook', 'http endpoint', 'incoming request', 'when called', 'post request', 'receive request', 'on request'], score: 3 },
    cron:    { kw: ['schedule', 'cron', 'every day', 'every hour', 'daily', 'weekly', 'monthly', 'hourly', 'at 9', 'at noon', 'each morning', 'every minute', 'every monday'], score: 3 },
    email:   { kw: ['when email arrives', 'new email', 'incoming email', 'on email', 'email received', 'when mail'], score: 3 },
    manual:  { kw: ['manually', 'on demand', 'button', 'click to start', 'manual trigger'], score: 3 },
  },
  sources: {
    gmail:         ['gmail', 'google mail', 'inbox'],
    google_sheets: ['google sheets', 'spreadsheet', 'sheets', 'gsheet'],
    google_drive:  ['google drive'],
    salesforce:    ['salesforce', 'sf crm'],
    hubspot:       ['hubspot'],
    postgres:      ['postgres', 'postgresql', 'sql database', 'database', 'pg', 'db'],
    mysql:         ['mysql'],
    mongodb:       ['mongo', 'mongodb', 'nosql'],
    api:           ['api', 'rest api', 'http api', 'endpoint', 'web service', 'http request', 'http get', 'rest call', 'rest endpoint', 'price api', 'gold api', 'stock api', 'weather api', 'external api', 'third party'],
    s3:            ['s3', 'aws s3', 'amazon s3', 'bucket'],
    github:        ['github', 'pull request', 'commit', 'pr'],
    csv:           ['csv', 'csv file'],
    pdf:           ['pdf', 'pdf file'],
  },
  actions: {
    fetch:    ['fetch', 'get data', 'retrieve', 'read from', 'pull', 'download', 'load', 'query', 'check', 'look up', 'lookup', 'get price', 'get rate', 'get stock', 'request data', 'call api', 'http request', 'get request'],
    send:     ['send', 'post', 'submit', 'deliver', 'dispatch', 'push', 'forward', 'relay'],
    transform:['transform', 'convert', 'map', 'format', 'modify', 'shape', 'reshape', 'reformat'],
    parse:    ['parse', 'extract', 'decode', 'deserialize'],
    filter:   ['filter', 'where', 'only', 'exclude', 'narrow', 'remove', 'drop', 'skip'],
    store:    ['store', 'save', 'insert', 'write', 'persist', 'add to', 'log to', 'append', 'record', 'archive'],
    notify:   ['notify', 'alert', 'inform', 'tell', 'ping', 'message', 'warn', 'remind'],
    classify: ['classify', 'categorize', 'label', 'tag', 'sort by', 'bucket', 'group'],
    summarize:['summarize', 'summary', 'shorten', 'abstract', 'condense', 'digest'],
  },
  destinations: {
    slack:         ['slack'],
    discord:       ['discord'],
    telegram:      ['telegram'],
    email:         ['email', 'mail', 'smtp', 'gmail send', 'send email'],
    whatsapp:      ['whatsapp', 'whats app', 'wa message', 'whatsapp message'],
    sms:           ['sms', 'text message', 'twilio sms', 'twilio text'],
    database:      ['database', 'db', 'postgres', 'mysql', 'mongodb'],
    google_sheets: ['google sheets', 'spreadsheet'],
    file:          ['csv', 'file', 'pdf'],
    jira:          ['jira'],
    hubspot:       ['hubspot'],
    notion:        ['notion'],
    s3:            ['s3', 'bucket'],
    airtable:      ['airtable'],
  },
  schedules: {
    every_minute: { kw: ['every minute', 'each minute', 'per minute', 'every 1 minute'],                                                           cron: '* * * * *',    label: 'every minute' },
    every_5min:   { kw: ['every 5 minutes', 'every five minutes', 'each 5 minutes'],                                                               cron: '*/5 * * * *',  label: 'every 5 minutes' },
    every_15min:  { kw: ['every 15 minutes', 'every fifteen minutes', 'each 15 minutes', 'every quarter hour'],                                    cron: '*/15 * * * *', label: 'every 15 minutes' },
    hourly:       { kw: ['hourly', 'every hour', 'each hour', 'once an hour', 'per hour'],                                                         cron: '0 * * * *',    label: 'every hour' },
    daily_9:      { kw: ['daily', 'every day', 'each morning', 'at 9', 'each day', 'every morning', 'once a day', 'once daily', 'day'],            cron: '0 9 * * *',    label: 'daily at 9am' },
    daily_noon:   { kw: ['at noon', 'midday', 'lunch time', 'at 12pm', '12 pm'],                                                                   cron: '0 12 * * *',   label: 'daily at noon' },
    daily_6pm:    { kw: ['at 6pm', 'evening', 'every evening', 'end of day', 'eod', '6 pm'],                                                       cron: '0 18 * * *',   label: 'daily at 6pm' },
    midnight:     { kw: ['midnight', 'at 12am', 'nightly', 'every night', 'each night', 'at night', 'overnight'],                                  cron: '0 0 * * *',    label: 'every midnight' },
    weekly:       { kw: ['weekly', 'every monday', 'every week', 'once a week', 'each week', 'on monday'],                                         cron: '0 9 * * 1',    label: 'every Monday 9am' },
    monthly:      { kw: ['monthly', 'every month', 'once a month', 'first of the month', 'each month'],                                            cron: '0 9 1 * *',    label: 'first of the month' },
  },
  conditions: ['if', 'when', 'only if', 'unless', 'whenever', 'in case'],
};

function extractEntities(prompt) {
  const lower = (prompt || '').toLowerCase();
  const tokens = tokenize(prompt);
  const expanded = expandSynonyms(tokens);

  const e = { triggers: [], sources: [], actions: [], destinations: [], schedule: null, hasCondition: false, rawPrompt: prompt, tokens: expanded, confidence: 0 };

  for (const [type, info] of Object.entries(ENTITY_PATTERNS.triggers)) {
    for (const kw of info.kw) {
      if (lower.includes(kw)) { e.triggers.push({ type, score: info.score }); e.confidence += info.score; break; }
    }
  }
  for (const [name, kws] of Object.entries(ENTITY_PATTERNS.sources)) {
    for (const kw of kws) if (lower.includes(kw)) { e.sources.push(name); e.confidence += 2; break; }
  }
  for (const [name, kws] of Object.entries(ENTITY_PATTERNS.actions)) {
    for (const kw of kws) if (lower.includes(kw) || expanded.includes(kw)) { e.actions.push(name); e.confidence += 1; break; }
  }
  for (const [name, kws] of Object.entries(ENTITY_PATTERNS.destinations)) {
    for (const kw of kws) if (lower.includes(kw)) { e.destinations.push(name); e.confidence += 2; break; }
  }
  for (const [, info] of Object.entries(ENTITY_PATTERNS.schedules)) {
    for (const kw of info.kw) if (lower.includes(kw)) { e.schedule = { cron: info.cron, label: info.label }; e.confidence += 2; break; }
    if (e.schedule) break;
  }
  e.hasCondition = ENTITY_PATTERNS.conditions.some(c => new RegExp(`\\b${c}\\b`).test(lower));
  e.sources      = [...new Set(e.sources)];
  e.actions      = [...new Set(e.actions)];
  e.destinations = [...new Set(e.destinations)];

  // Co-occurrence overrides: resolve ambiguous service+channel combos
  const hasTwilio    = lower.includes('twilio');
  const hasWhatsApp  = lower.includes('whatsapp') || lower.includes('whats app');
  const hasSendGrid  = lower.includes('sendgrid');
  const hasMailgun   = lower.includes('mailgun');

  if (hasTwilio && hasWhatsApp) {
    // "twilio" alone would match sms; override to whatsapp when both are explicit
    e.destinations = e.destinations.filter(d => d !== 'sms');
    if (!e.destinations.includes('whatsapp')) e.destinations.push('whatsapp');
  } else if (hasTwilio && !hasWhatsApp && !e.destinations.includes('sms')) {
    e.destinations.push('sms');
  }
  if ((hasSendGrid || hasMailgun) && !e.destinations.includes('email')) {
    e.destinations.push('email');
  }

  return e;
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 4.  COMPOSITIONAL WORKFLOW BUILDER                                   │
 * └──────────────────────────────────────────────────────────────────────┘ */

const NODE_SPECS = {
  trigger: {
    webhook: { type: 'trigger_webhook', label: 'Webhook Trigger', config: {} },
    cron:    { type: 'trigger_cron',    label: 'Schedule Trigger', config: { expression: '0 9 * * *' } },
    email:   { type: 'trigger_email',   label: 'Email Trigger', config: {} },
    manual:  { type: 'trigger_manual',  label: 'Manual Trigger', config: {} },
  },
  source: {
    gmail:         { type: 'google_gmail_read',  label: 'Read Gmail',          config: { query: 'is:unread' } },
    google_sheets: { type: 'google_sheets_read', label: 'Read Sheet',          config: { spreadsheetId: '', range: 'A1:Z' } },
    google_drive:  { type: 'google_drive_upload',label: 'Drive',               config: { fileId: '' } },
    salesforce:    { type: 'salesforce_query',   label: 'Query Salesforce',    config: { query: '' } },
    hubspot:       { type: 'hubspot_contact',    label: 'Get HubSpot Contact', config: {} },
    postgres:      { type: 'postgres_query',     label: 'Query Database',      config: { query: 'SELECT * FROM table_name' } },
    mysql:         { type: 'mysql_query',        label: 'Query MySQL',         config: { query: 'SELECT * FROM table_name' } },
    mongodb:       { type: 'mongodb_find',       label: 'Find Documents',      config: { collection: '', query: '{}' } },
    api:           { type: 'http_request',       label: 'API Request',         config: { method: 'GET', url: '' } },
    s3:            { type: 'aws_s3_read',        label: 'Read from S3',        config: { bucket: '', key: '' } },
    github:        { type: 'http_request',       label: 'GitHub API',          config: { method: 'GET', url: 'https://api.github.com/' } },
    csv:           { type: 'csv_parse',          label: 'Parse CSV',           config: {} },
    pdf:           { type: 'pdf_extract',        label: 'Extract from PDF',    config: {} },
  },
  transform: {
    filter:    { type: 'transform_filter', label: 'Filter Items',    config: { condition: '' } },
    transform: { type: 'transform_set',    label: 'Transform Data',  config: { mapping: '{}' } },
    parse:     { type: 'json_parse',       label: 'Parse JSON',      config: {} },
    classify:  { type: 'ai_classify',      label: 'Classify Text',   config: { categories: 'positive,negative,neutral' } },
    summarize: { type: 'ai_summarize',     label: 'Summarize Text',  config: { maxLength: 100 } },
  },
  destination: {
    slack:         { type: 'slack_send',         label: 'Send to Slack',     config: { channel: '#general', message: '{{data}}' } },
    discord:       { type: 'discord_send',       label: 'Send to Discord',   config: { channel: '', message: '{{data}}' } },
    telegram:      { type: 'telegram_send',      label: 'Send to Telegram',  config: { chatId: '', message: '{{data}}' } },
    email:         { type: 'email_send',         label: 'Send Email',        config: { to: '', subject: 'Notification', body: '{{data}}' } },
    whatsapp:      { type: 'twilio_whatsapp',     label: 'Send WhatsApp (Twilio)', config: { to: 'whatsapp:+1234567890', from: 'whatsapp:+14155238886', message: '{{data}}' } },
    sms:           { type: 'twilio_sms',         label: 'Send SMS',          config: { to: '', message: '{{data}}' } },
    database:      { type: 'postgres_insert',    label: 'Insert to DB',      config: { table: '', data: '{{data}}' } },
    google_sheets: { type: 'google_sheets_write',label: 'Append to Sheet',   config: { spreadsheetId: '', values: '{{data}}' } },
    file:          { type: 'csv_parse',          label: 'CSV',               config: {} },
    jira:          { type: 'jira_create',        label: 'Create Jira Issue', config: { project: '', summary: '{{data}}' } },
    hubspot:       { type: 'hubspot_contact',    label: 'HubSpot Contact',   config: {} },
    notion:        { type: 'notion_page',        label: 'Create Notion Page',config: { databaseId: '', title: '{{data}}' } },
    s3:            { type: 'aws_s3_upload',      label: 'Upload to S3',      config: { bucket: '', key: '' } },
    airtable:      { type: 'airtable_create',    label: 'Add to Airtable',   config: { baseId: '', table: '' } },
  },
};

function makeEdge(id, source, target) {
  return { id, source, target, type: 'smoothstep', animated: false, style: { stroke: '#374151', strokeWidth: 1.5 } };
}
function makeNode(id, x, y, label, type, config = {}) {
  return { id, type: 'flowNode', position: { x, y }, data: { label, type, icon: '🔗', config } };
}

function buildWorkflowFromEntities(entities) {
  const nodes = [];
  const edges = [];
  const Y = 220, X0 = 100, SPACING = 280, BRANCH_DY = 160;
  let x = X0, lastId = null;

  const addNode = (spec, posX, posY) => {
    const id = `${spec.type}-${nodes.length + 1}-${Date.now()}`;
    nodes.push(makeNode(id, posX, posY, spec.label, spec.type, { ...spec.config }));
    return id;
  };
  const link = (from, to) => from && to && edges.push(makeEdge(`e-${from}-${to}`, from, to));

  // 1) Trigger
  let triggerKind = entities.triggers.length ? entities.triggers[0].type
                  : entities.schedule       ? 'cron'
                  : entities.sources.length ? 'webhook'
                  : 'manual';
  const triggerSpec = { ...NODE_SPECS.trigger[triggerKind] };
  if (triggerKind === 'cron' && entities.schedule) {
    triggerSpec.config = { expression: entities.schedule.cron };
    triggerSpec.label = `Schedule (${entities.schedule.label})`;
  }
  lastId = addNode(triggerSpec, x, Y);
  x += SPACING;

  // 2) Source
  const HTTP_SOURCES = new Set(['api', 'github']);
  if (entities.sources.length && NODE_SPECS.source[entities.sources[0]]) {
    const srcKey = entities.sources[0];
    const id = addNode(NODE_SPECS.source[srcKey], x, Y);
    link(lastId, id); lastId = id; x += SPACING;

    // HTTP sources almost always return JSON — auto-insert a parse step
    if (HTTP_SOURCES.has(srcKey) && !entities.actions.includes('parse')) {
      const parseId = addNode(NODE_SPECS.transform.parse, x, Y);
      link(lastId, parseId); lastId = parseId; x += SPACING;
    }
  }

  // 3) Parse / JSON if explicitly requested (and not already added above)
  if (entities.actions.includes('parse') && !HTTP_SOURCES.has(entities.sources[0])) {
    const id = addNode(NODE_SPECS.transform.parse, x, Y);
    link(lastId, id); lastId = id; x += SPACING;
  }

  // 4) Filter (conditional)
  if (entities.actions.includes('filter') || entities.hasCondition) {
    const id = addNode(NODE_SPECS.transform.filter, x, Y);
    link(lastId, id); lastId = id; x += SPACING;
  }

  // 5) AI / transform processing — only when explicitly asked
  if (entities.actions.includes('classify')) {
    const id = addNode(NODE_SPECS.transform.classify, x, Y);
    link(lastId, id); lastId = id; x += SPACING;
  } else if (entities.actions.includes('summarize')) {
    const id = addNode(NODE_SPECS.transform.summarize, x, Y);
    link(lastId, id); lastId = id; x += SPACING;
  } else if (entities.actions.includes('transform')) {
    const id = addNode(NODE_SPECS.transform.transform, x, Y);
    link(lastId, id); lastId = id; x += SPACING;
  }

  // 6) Destinations — branch if multiple
  const dests = entities.destinations.length ? entities.destinations
              : entities.actions.includes('store')  ? ['database']
              : entities.actions.includes('notify') ? ['email']
              : [];

  if (dests.length === 1) {
    const spec = NODE_SPECS.destination[dests[0]];
    if (spec) link(lastId, addNode(spec, x, Y));
  } else if (dests.length > 1) {
    const branchOrigin = lastId;
    const startY = Y - ((dests.length - 1) * BRANCH_DY) / 2;
    dests.forEach((d, i) => {
      const spec = NODE_SPECS.destination[d];
      if (!spec) return;
      const id = addNode(spec, x, startY + i * BRANCH_DY);
      link(branchOrigin, id);
    });
  } else {
    const id = addNode({ type: 'console_log', label: 'Log Output', config: { message: '{{data}}' } }, x, Y);
    link(lastId, id);
  }

  return { nodes, edges };
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 5.  GRAPH ALGORITHMS (DFS / A*)                                      │
 * └──────────────────────────────────────────────────────────────────────┘ */

function buildAdjacency(nodes, edges) {
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) if (adj[e.source]) adj[e.source].push(e.target);
  return adj;
}

function analyzeGraphDFS(nodes, edges) {
  const adj = buildAdjacency(nodes, edges);
  const visited = new Set();
  const depth = {};
  const stack = [];
  function dfs(id, d) {
    if (visited.has(id)) return stack.includes(id);
    visited.add(id); stack.push(id); depth[id] = d;
    let cycle = false;
    for (const next of adj[id] || []) cycle = dfs(next, d + 1) || cycle;
    stack.pop();
    return cycle;
  }
  const triggers = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  const starts = triggers.length ? triggers : nodes.filter(n => !edges.some(e => e.target === n.id));
  let hasCycle = false;
  for (const s of starts) hasCycle = dfs(s.id, 0) || hasCycle;
  const maxDepth = Object.values(depth).reduce((m, v) => Math.max(m, v), 0);
  const unreachable = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
  return { visited, depth, maxDepth, unreachable, hasCycle };
}

function aStarShortestPath(nodes, edges) {
  if (!nodes.length) return [];
  const adj = buildAdjacency(nodes, edges);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const triggers = nodes.filter(n => (n.data?.type || n.type || '').includes('trigger'));
  const startId = (triggers[0] || nodes[0]).id;
  const terminals = new Set(nodes.filter(n => !(adj[n.id] || []).length).map(n => n.id));
  const g = {}; nodes.forEach(n => { g[n.id] = Infinity; }); g[startId] = 0;
  const open = new Set([startId]);
  const parent = { [startId]: null };
  const closed = new Set();
  while (open.size > 0) {
    let curr = null, min = Infinity;
    for (const id of open) if (g[id] < min) { min = g[id]; curr = id; }
    open.delete(curr); closed.add(curr);
    if (terminals.has(curr)) {
      const path = []; let c = curr;
      while (c !== null) { path.unshift(nodeMap[c]); c = parent[c]; }
      return path;
    }
    for (const next of adj[curr] || []) {
      if (closed.has(next)) continue;
      const t = g[curr] + 1;
      if (t < g[next]) { g[next] = t; parent[next] = curr; open.add(next); }
    }
  }
  return [];
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 6.  WORKFLOW HEALTH                                                  │
 * └──────────────────────────────────────────────────────────────────────┘ */

function analyzeWorkflowHealth(workflow) {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const issues = []; const tips = [];

  if (!nodes.length) return { score: 0, grade: 'Empty', issues: [{ type: 'warning', msg: 'Canvas is empty.' }], tips: ['Add a trigger node to begin.'] };

  const { unreachable, hasCycle, maxDepth } = analyzeGraphDFS(nodes, edges);
  const types = nodes.map(n => (n.data?.type || n.type || '').toLowerCase());
  let score = 100;

  const hasTrigger = types.some(t => t.includes('trigger'));
  if (!hasTrigger)        { issues.push({ type: 'error',   msg: 'No trigger — workflow cannot start.' }); score -= 30; tips.push('Add a Webhook, Schedule or Manual trigger.'); }
  if (hasCycle)           { issues.push({ type: 'error',   msg: 'Cycle detected.' });                     score -= 25; tips.push('Workflows must be a DAG — break the cycle.'); }
  if (unreachable.length) { issues.push({ type: 'error',   msg: `${unreachable.length} node(s) unreachable.` }); score -= 15; tips.push('Connect or remove disconnected nodes.'); }
  if (!types.some(t => t.includes('error_handler')) && nodes.length > 2) { issues.push({ type: 'warning', msg: 'No Error Handler.' }); score -= 8; tips.push('Add an Error Handler to catch failures.'); }
  if (types.some(t => t.includes('http') || t.startsWith('rest_')) && !types.some(t => t.includes('transform') || t === 'json_parse')) {
    issues.push({ type: 'warning', msg: 'HTTP node without a transform.' }); score -= 5; tips.push('Use a Transform/JSON Parse to shape API responses.');
  }
  if (maxDepth > 6 && !types.some(t => t === 'logic_if' || t === 'logic_switch')) {
    issues.push({ type: 'warning', msg: `Linear chain ${maxDepth} steps deep.` }); score -= 5; tips.push('Consider branching with Logic If.');
  }
  if (!types.some(t => t === 'console_log') && nodes.length > 4) {
    issues.push({ type: 'warning', msg: 'No logging anywhere.' }); score -= 3; tips.push('Add a Log node to make debugging easier.');
  }
  let empty = 0;
  for (const n of nodes) {
    const cfg = n.data?.config || {};
    const vals = Object.values(cfg);
    if (vals.length > 0 && vals.every(v => v === '' || v == null)) empty++;
  }
  if (empty > 0) { issues.push({ type: 'warning', msg: `${empty} node(s) have empty config.` }); score -= Math.min(15, empty * 3); tips.push('Open each node and fill required fields.'); }

  score = Math.max(0, score);
  const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Needs work' : 'Critical';
  return { score, grade, issues, tips: tips.slice(0, 4) };
}

function getRuntimeRegistry() {
  try {
    return require('../nodes/registry');
  } catch {
    return null;
  }
}

function getNodeRuntimeType(node) {
  return node?.data?.type || node?.type || 'unknown';
}

function getNodeLabel(node) {
  return node?.data?.label || node?.id || 'Unnamed node';
}

function isMissingValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function getCredentialRequirement(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('hubspot')) {
    return {
      serviceId: 'hubspot',
      serviceLabel: 'HubSpot',
      envKeys: ['HUBSPOT_ACCESS_TOKEN'],
      fields: ['HubSpot credential']
    };
  }
  if (t.includes('slack')) {
    return {
      serviceId: 'slack',
      serviceLabel: 'Slack',
      envKeys: [],
      fields: ['Slack webhook URL']
    };
  }
  if (t.includes('ai_classify') || t.includes('ai_summar') || t.includes('anthropic')) {
    return {
      serviceId: 'anthropic',
      serviceLabel: 'Anthropic',
      envKeys: ['ANTHROPIC_API_KEY'],
      fields: ['Anthropic API key']
    };
  }
  if (t.includes('openai')) {
    return {
      serviceId: 'openai',
      serviceLabel: 'OpenAI',
      envKeys: ['OPENAI_API_KEY'],
      fields: ['OpenAI API key']
    };
  }
  return null;
}

function hasNodeLocalCredential(type, config) {
  const t = (type || '').toLowerCase();
  if (t.includes('slack')) return !isMissingValue(config.webhookUrl) || !isMissingValue(config.webhook_url);
  if (t.includes('hubspot')) return !isMissingValue(config.access_token) || !isMissingValue(config.accessToken);
  if (t.includes('ai_classify') || t.includes('ai_summar') || t.includes('anthropic')) return !isMissingValue(config.apiKey) || !isMissingValue(config.api_key);
  if (t.includes('openai')) return !isMissingValue(config.apiKey) || !isMissingValue(config.api_key);
  return false;
}

function inferNodeOutputSchema(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('webhook')) return ['body', 'headers', 'query', 'method'];
  if (t.includes('trigger') || t.includes('cron') || t.includes('schedule')) return ['timestamp', 'payload'];
  if (t.includes('http') || t.includes('rest')) return ['statusCode', 'body', 'headers', 'success'];
  if (t.includes('slack') || t.includes('email') || t.includes('telegram') || t.includes('discord')) return ['success', 'messageId', 'sentAt'];
  if (t.includes('classify')) return ['category', 'confidence'];
  if (t.includes('summar')) return ['summary'];
  if (t.includes('database') || t.includes('postgres') || t.includes('mysql')) return ['rows', 'count', 'result'];
  if (t.includes('filter')) return ['passed', 'rejected'];
  if (t.includes('split') || t.includes('loop')) return ['items', 'count'];
  if (t.includes('date')) return ['datetime', 'timestamp'];
  if (t.includes('math')) return ['result'];
  return ['data'];
}

function buildDataContracts(nodes, edges) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return (edges || []).map((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    return {
      edgeId: edge.id,
      from: getNodeLabel(source),
      to: getNodeLabel(target),
      sourceType: getNodeRuntimeType(source),
      targetType: getNodeRuntimeType(target),
      availableFields: inferNodeOutputSchema(getNodeRuntimeType(source)),
      expectedInput: 'data'
    };
  });
}

function analyzePolicyGuardrails(nodes) {
  const findings = [];
  const secretPatterns = [
    { name: 'API key', pattern: /(sk-|xox[baprs]-|ghp_|AIza|SG\.)[A-Za-z0-9_\-]{8,}/ },
    { name: 'JWT/private token', pattern: /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/ },
    { name: 'Password field', pattern: /(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^"',}\s]+/i },
  ];
  const piiPatterns = [
    { name: 'Email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
    { name: 'Phone number', pattern: /\+?\d[\d\s().-]{8,}\d/ },
  ];

  for (const node of nodes || []) {
    const type = getNodeRuntimeType(node);
    const label = getNodeLabel(node);
    const configText = JSON.stringify(node?.data?.config || {});

    for (const rule of secretPatterns) {
      if (rule.pattern.test(configText)) {
        findings.push({
          severity: 'high',
          nodeId: node.id,
          nodeLabel: label,
          type: 'secret_exposure',
          message: `${rule.name} appears to be stored directly in node config. Move it to Credentials Manager.`
        });
      }
    }

    for (const rule of piiPatterns) {
      if (rule.pattern.test(configText)) {
        findings.push({
          severity: 'medium',
          nodeId: node.id,
          nodeLabel: label,
          type: 'pii_literal',
          message: `${rule.name} detected in node config. Confirm this workflow is allowed to process PII.`
        });
      }
    }

    const url = node?.data?.config?.url || node?.data?.config?.webhookUrl;
    if (typeof url === 'string' && /^http:\/\//i.test(url)) {
      findings.push({
        severity: 'medium',
        nodeId: node.id,
        nodeLabel: label,
        type: 'insecure_http',
        message: 'External HTTP URL is not encrypted. Use HTTPS before production.'
      });
    }

    if ((type.includes('ai') || type.includes('openai') || type.includes('anthropic')) && configText.length > 2) {
      findings.push({
        severity: 'low',
        nodeId: node.id,
        nodeLabel: label,
        type: 'ai_review',
        message: 'AI node should be reviewed for prompt safety, PII handling, and output constraints.'
      });
    }
  }

  return {
    status: findings.some(f => f.severity === 'high') ? 'blocked' : findings.length ? 'review' : 'clear',
    findings
  };
}

function findMissingConfig(nodes, registry) {
  return (nodes || []).flatMap((node) => {
    const type = getNodeRuntimeType(node);
    const definition = registry?.get?.(type);
    const schema = definition?.configSchema || {};
    const config = node?.data?.config || {};
    const missingFields = Object.entries(schema)
      .filter(([, field]) => field?.required)
      .map(([key]) => key)
      .filter((key) => isMissingValue(config[key]));

    const credentialRequirement = getCredentialRequirement(type);
    const hasLinkedCredential = Boolean(node?.data?.credentialId || config.credentialId);
    const hasEnvCredential = credentialRequirement?.envKeys?.some((key) => Boolean(process.env[key]));
    const hasConfigCredential = hasNodeLocalCredential(type, config);
    const needsCredential = credentialRequirement && !hasLinkedCredential && !hasEnvCredential && !hasConfigCredential;

    if (missingFields.length === 0 && !needsCredential) return [];

    return [{
      nodeId: node.id,
      nodeLabel: getNodeLabel(node),
      nodeType: type,
      fields: needsCredential ? [...missingFields, ...credentialRequirement.fields] : missingFields,
      serviceId: credentialRequirement?.serviceId || null,
      serviceLabel: credentialRequirement?.serviceLabel || null,
      fixActions: [
        { type: 'open_node', label: 'Open node' },
        ...(needsCredential ? [{ type: 'add_credential', label: `Add ${credentialRequirement.serviceLabel} credential`, serviceId: credentialRequirement.serviceId }] : [])
      ]
    }];
  });
}

function compileWorkflow(workflow) {
  const nodes = workflow?.nodes || [];
  const edges = workflow?.edges || [];
  const registry = getRuntimeRegistry();
  const health = analyzeWorkflowHealth({ nodes, edges });
  const unsupportedNodes = nodes
    .filter((node) => !registry?.get?.(getNodeRuntimeType(node)))
    .map((node) => ({
      nodeId: node.id,
      nodeLabel: getNodeLabel(node),
      nodeType: getNodeRuntimeType(node)
    }));
  const missingConfig = findMissingConfig(nodes, registry);
  const dataContracts = buildDataContracts(nodes, edges);
  const simulation = simulateWorkflow({ nodes, edges });
  const policy = analyzePolicyGuardrails(nodes);

  let readinessScore = health.score;
  readinessScore -= unsupportedNodes.length * 15;
  readinessScore -= missingConfig.reduce((total, item) => total + item.fields.length * 6, 0);
  readinessScore -= policy.findings.reduce((total, finding) => total + (finding.severity === 'high' ? 18 : finding.severity === 'medium' ? 8 : 3), 0);
  readinessScore = Math.max(0, Math.min(100, readinessScore));

  const releaseChecklist = [
    unsupportedNodes.length === 0 ? 'All node types are supported by the runtime.' : `Resolve ${unsupportedNodes.length} unsupported runtime node(s).`,
    missingConfig.length === 0 ? 'Required node configuration is complete.' : `Fill required fields on ${missingConfig.length} node(s).`,
    policy.status === 'clear' ? 'Policy guardrails passed.' : `Review ${policy.findings.length} policy finding(s).`,
    health.issues.filter((issue) => issue.type === 'error').length === 0 ? 'No blocking graph errors detected.' : 'Fix blocking graph health errors.',
    edges.length > 0 || nodes.length <= 1 ? 'Connection structure is valid for this graph size.' : 'Connect workflow steps before publishing.',
    'Run one dry-run execution with sample payload before production.'
  ];

  const hasBlockingGraphError = health.issues.some((issue) => issue.type === 'error');
  const status =
    unsupportedNodes.length > 0 || hasBlockingGraphError || policy.status === 'blocked' ? 'blocked' :
    missingConfig.length > 0 || readinessScore < 85 ? 'review' :
    'ready';

  return {
    status,
    readinessScore,
    health,
    unsupportedNodes,
    missingConfig,
    dataContracts,
    policy,
    simulation,
    releaseChecklist
  };
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 7.  ERROR / DEBUG RULES                                              │
 * └──────────────────────────────────────────────────────────────────────┘ */

const NODE_ERROR_RULES = {
  http_request: [
    { patterns: ['ECONNREFUSED','ENOTFOUND','getaddrinfo'], diagnosis: 'Target URL unreachable.', root_cause: 'Connection refused or DNS resolution failed.', fix: { url: 'Verify URL.' }, prevention: 'Add an Error Handler.' },
    { patterns: ['401','Unauthorized','Authentication'],     diagnosis: 'Authentication failed.', root_cause: 'Missing/invalid credentials.', fix: { headers: 'Add Authorization header.' }, prevention: 'Use Credentials Manager.' },
    { patterns: ['403','Forbidden'],                          diagnosis: 'Access denied.',          root_cause: 'Token lacks permission.',         fix: { headers: 'Use token with required scope.' }, prevention: 'Check API scopes.' },
    { patterns: ['404','Not Found'],                          diagnosis: 'Endpoint not found.',     root_cause: 'URL path or ID does not exist.',  fix: { url: 'Double-check URL.' },                  prevention: 'Log URLs before requests.' },
    { patterns: ['429','Too Many Requests','rate limit'],     diagnosis: 'Rate limit exceeded.',    root_cause: 'Too many requests.',              fix: { retry: 'Add Delay with back-off.' },         prevention: 'Throttle with Delay node.' },
    { patterns: ['500','502','503','Bad Gateway'],            diagnosis: 'Server error.',           root_cause: 'API provider failure.',            fix: { retry: 'Retry after delay.' },               prevention: 'Wrap with Error Handler.' },
    { patterns: ['timeout','ETIMEDOUT'],                      diagnosis: 'Request timed out.',      root_cause: 'Server did not respond.',         fix: { timeout: 'Increase timeout.' },              prevention: 'Add fallback with Logic If.' },
  ],
  postgres: [
    { patterns: ['syntax error','SyntaxError'],               diagnosis: 'SQL syntax error.',       root_cause: 'Statement syntax mistake.',       fix: { query: 'Review query syntax.' },             prevention: 'Test queries in a DB client.' },
    { patterns: ['relation does not exist','table not found'],diagnosis: 'Table does not exist.',   root_cause: 'Wrong table name.',               fix: { query: 'Check table name (case-sensitive).' },prevention: 'Run migrations first.' },
    { patterns: ['column','does not exist'],                  diagnosis: 'Column does not exist.',  root_cause: 'Column name mismatch.',           fix: { query: 'Check column names.' },              prevention: 'Version schema with workflows.' },
    { patterns: ['connection refused','ECONNREFUSED'],        diagnosis: 'Cannot connect to PG.',   root_cause: 'Wrong host/port or server down.', fix: { connection: 'Check host/port/creds.' },      prevention: 'Use Credentials Manager.' },
    { patterns: ['duplicate key','unique constraint'],        diagnosis: 'Duplicate key.',          root_cause: 'Record already exists.',          fix: { query: 'Use ON CONFLICT DO NOTHING/UPDATE.' },prevention: 'Lookup before insert.' },
  ],
  transform: [
    { patterns: ['Cannot read','undefined','TypeError'],      diagnosis: 'Field is null/missing.',  root_cause: 'Expected field absent.',          fix: { mapping: 'Add null check or default.' },     prevention: 'Validate with Logic If first.' },
    { patterns: ['JSON','parse','Unexpected token'],          diagnosis: 'JSON parse failed.',      root_cause: 'Input not valid JSON.',           fix: { input: 'Ensure upstream outputs JSON.' },    prevention: 'Log raw output.' },
  ],
  logic_if: [
    { patterns: ['ReferenceError','is not defined'],          diagnosis: 'Variable not defined.',   root_cause: 'Name mismatch with input.',       fix: { condition: 'Check field name.' },            prevention: 'Add Log before condition.' },
    { patterns: ['SyntaxError'],                              diagnosis: 'Condition syntax error.', root_cause: 'Invalid JS expression.',          fix: { condition: 'Use simple comparisons.' },      prevention: 'Test with sample data.' },
  ],
  email_send: [
    { patterns: ['ECONNREFUSED','SMTP'],                      diagnosis: 'Cannot connect to SMTP.', root_cause: 'Wrong host/port.',                fix: { host: 'Verify SMTP host/port.' },             prevention: 'Use Credentials Manager.' },
    { patterns: ['invalid login','535'],                      diagnosis: 'SMTP auth failed.',       root_cause: 'Wrong username/password.',        fix: { credentials: 'Re-enter creds.' },             prevention: 'Use app-specific password.' },
    { patterns: ['Invalid address'],                          diagnosis: 'Invalid recipient.',      root_cause: 'Malformed "to" field.',           fix: { to: 'Validate email format.' },               prevention: 'Validate with Logic If.' },
  ],
  slack: [
    { patterns: ['invalid_token','not_authed'],               diagnosis: 'Invalid Slack token.',    root_cause: 'Token missing/expired.',          fix: { token: 'Re-create token.' },                  prevention: 'Use Bot tokens (xoxb-).' },
    { patterns: ['channel_not_found'],                        diagnosis: 'Channel not found.',      root_cause: 'Wrong channel or bot not member.',fix: { channel: 'Invite bot to channel.' },         prevention: 'Use channel IDs.' },
  ],
};

function getRulesForNodeType(nodeType) {
  if (!nodeType) return [];
  const t = nodeType.toLowerCase();
  if (t.includes('http') || t.includes('rest') || t.includes('graphql')) return NODE_ERROR_RULES.http_request;
  if (t.includes('postgres') || t.includes('mysql') || t.includes('mongo')) return NODE_ERROR_RULES.postgres;
  if (t.includes('transform') || t.includes('json') || t.includes('code')) return NODE_ERROR_RULES.transform;
  if (t.includes('logic') || t.includes('if') || t.includes('switch'))     return NODE_ERROR_RULES.logic_if;
  if (t.includes('email') || t.includes('smtp'))                            return NODE_ERROR_RULES.email_send;
  if (t.includes('slack'))                                                   return NODE_ERROR_RULES.slack;
  return [];
}
function matchErrorRule(rules, errorMsg) {
  if (!errorMsg) return null;
  for (const r of rules) if (r.patterns.some(p => errorMsg.includes(p))) return r;
  return null;
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 8.  INTENT CLASSIFIER & OFF-TOPIC GUARD                              │
 * └──────────────────────────────────────────────────────────────────────┘ */

const INTENT_PROTOTYPES = {
  generate:    'build create make generate new workflow automation pipeline from scratch set up start',
  add_node:    'add insert place put append new node create a node to the canvas',
  remove_node: 'remove delete drop eliminate get rid take out the node',
  connect:     'connect link wire join attach edge between two nodes',
  clear:       'clear reset wipe empty start over fresh canvas everything',
  explain:     'what does this do explain how works describe tell about workflow current purpose function does it do',
  health:      'health score grade analyze quality check status validate review',
  simulate:    'simulate dry run preview test execution trace what happens',
  debug:       'debug fix problem error failure broken issue troubleshoot why',
  help:        'help capabilities commands what can you do guide tutorial',
  greeting:    'hi hello hey good morning afternoon evening what is up sup',
};

const INTENT_VECTORS = Object.fromEntries(
  Object.entries(INTENT_PROTOTYPES).map(([k, v]) => [k, tfidfVector(v)])
);

function classifyIntent(message) {
  const vec = tfidfVector(message);
  let best = null, bestScore = 0;
  const scores = {};
  for (const [intent, proto] of Object.entries(INTENT_VECTORS)) {
    const s = cosineSim(vec, proto);
    scores[intent] = s;
    if (s > bestScore) { bestScore = s; best = intent; }
  }
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const confidence = (sorted[0] || 0) - (sorted[1] || 0);
  return { intent: best || 'unknown', confidence, score: bestScore, scores };
}

const TOPIC_VOCAB = tfidfVector(
  'workflow automation node trigger schedule webhook api http email slack ' +
  'database transform filter execute run pipeline connect canvas builder ' +
  'integration data flow process steps action source destination chain edit ' +
  'config setup channel notify alert send fetch query store debug error fix ' +
  'gmail discord telegram twilio postgres mysql mongodb s3 github jira notion ' +
  'classify summarize health simulate cron daily weekly hourly monthly ' +
  'price rate stock gold silver crypto bitcoin currency forex exchange ' +
  'whatsapp sms message notification report data request call endpoint ' +
  'stripe payment hubspot salesforce airtable google sheets drive calendar ' +
  'webhook receive post get put delete rest json parse extract ' +
  'add remove improve enhance optimize suggestions improvements additions ' +
  'better upgrade update modify change replace swap condition retry delay ' +
  'build create make automate connect log output input result output ' +
  'what how when where which can could should would will may might ' +
  'missing next wrong needed lacking broken issue problem fix resolve'
);

// Explicit blacklist — terms that are clearly outside the workflow domain.
// Checked before intent routing, so "what is a linked list" cannot leak through as a help request.
const OFFTOPIC_KEYWORDS = [
  // CS concepts not workflow-related
  'linked list', 'binary tree', 'red black tree', 'hash table', 'big o', 'recursion',
  'leetcode', 'codewars', 'interview question', 'whiteboard',
  // Generic programming help
  'python tutorial', 'javascript tutorial', 'c++', 'java tutorial', 'rust tutorial',
  'how to code', 'learn programming', 'syntax error in', 'compile error',
  // Real-world topics
  'recipe', 'cook', 'cooking', 'food', 'restaurant',
  'weather', 'forecast', 'temperature outside',
  'movie', 'film', 'tv show', 'netflix', 'series',
  'song', 'music', 'lyrics', 'spotify', 'playlist',
  'translate to', 'translate this',
  'joke', 'funny',
  'who is', 'who was', 'history of', 'biography',
  'capital of', 'population of',
  // Math homework
  'solve this equation', 'calculus', 'derivative', 'integral', 'matrix multiplication',
  // Generic life advice
  'love advice', 'dating', 'relationship',
];

function isExplicitlyOffTopic(message) {
  const lower = (message || '').toLowerCase();
  return OFFTOPIC_KEYWORDS.some(kw => lower.includes(kw));
}

function isOnTopic(message, intent) {
  if (isExplicitlyOffTopic(message)) return false;
  // Any classified intent is on-topic by definition
  if (['generate','add_node','remove_node','connect','clear','explain','health','simulate','debug',
       'suggest','greeting','help','confirm','reject','modify_schedule','add_condition',
       'add_error_handler','add_delay','add_after','replace_node'].includes(intent)) return true;
  // Unknown intent — allow if there's any workflow vocabulary overlap
  return cosineSim(tfidfVector(message), TOPIC_VOCAB) >= 0.04;
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 9.  SIMULATION & TOOL APPLY                                          │
 * └──────────────────────────────────────────────────────────────────────┘ */

function simulateWorkflow(workflow) {
  const path = aStarShortestPath(workflow.nodes || [], workflow.edges || []);
  return path.map((n, i) => {
    const label = n.data?.label || n.id;
    const type  = n.data?.type  || n.type || 'unknown';
    return `${i + 1}.  ${label}  →  ${type}`;
  });
}

function applyWorkflowTool(workflow, op, input) {
  const nodes = [...(workflow.nodes || [])];
  const edges = [...(workflow.edges || [])];
  switch (op) {
    case 'set_workflow':
      return {
        nodes: (input.nodes || []).map(n => ({ ...n, type: 'flowNode',
          data: { ...(n.data || {}), type: n.data?.type || n.type || 'unknown', icon: n.data?.icon || '🔗', config: n.data?.config || {} } })),
        edges: (input.edges || []).map(e => ({ ...e, type: e.type || 'smoothstep', animated: false,
          style: e.style || { stroke: '#374151', strokeWidth: 1.5 } })),
      };
    case 'add_node': {
      const id = input.id || `${input.nodeType}-${Date.now()}`;
      return { nodes: [...nodes, { id, type: 'flowNode', position: input.position || { x: 200, y: 220 },
        data: { label: input.label, type: input.nodeType, icon: '🔗', config: input.config || {} } }], edges };
    }
    case 'remove_node':
      return { nodes: nodes.filter(n => n.id !== input.id), edges: edges.filter(e => e.source !== input.id && e.target !== input.id) };
    case 'add_edge':
      if (edges.some(e => e.source === input.source && e.target === input.target)) return { nodes, edges };
      return { nodes, edges: [...edges, makeEdge(`e-${input.source}-${input.target}`, input.source, input.target)] };
    default:
      return { nodes, edges };
  }
}

function findNodeByText(nodes, query) {
  const tokens = removeStopWords(tokenize(query));
  if (!tokens.length) return null;
  let best = null, bestScore = 0;
  for (const n of nodes) {
    const haystack = `${(n.data?.label || '').toLowerCase()} ${(n.data?.type || '').toLowerCase()}`;
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += 2;
      else if (haystack.split(/\s+/).some(w => fuzzyMatch(w, t) > 0.78)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = n; }
  }
  return bestScore > 0 ? best : null;
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 10. INPUT VALIDATION                                                  │
 * └──────────────────────────────────────────────────────────────────────┘ */

const EXAMPLE_PROMPTS = [
  'Fetch gold prices via HTTP and send a WhatsApp message via Twilio',
  'Send a Slack alert when a new GitHub PR is opened',
  'Daily report from Postgres emailed at 9am',
  'When a webhook fires, transform the data and insert it into a database',
];

function validatePrompt(prompt) {
  const trimmed = (prompt || '').trim();

  // 1. Too short to be a workflow description
  if (trimmed.length < 5) {
    return { valid: false, message: 'Please describe a workflow to generate. Example: "' + EXAMPLE_PROMPTS[0] + '"' };
  }

  const meaningful = removeStopWords(tokenize(trimmed));

  // 2. Nothing left after removing stop words
  if (meaningful.length === 0) {
    return { valid: false, message: 'Please describe a workflow to generate.' };
  }

  // 3. All tokens are purely numeric  (e.g. "123214", "999 000")
  if (meaningful.every(t => /^\d+$/.test(t))) {
    return {
      valid: false,
      message: "That doesn't look like a workflow description. Try: \"" + EXAMPLE_PROMPTS[1] + '"',
    };
  }

  // 4. Topic-relevance gate: cosine similarity with the workflow vocabulary.
  //    Gibberish like "sajdkhasjkd" or "asdfghjkl" scores exactly 0 because
  //    none of their characters form tokens present in TOPIC_VOCAB.
  const topicScore = cosineSim(tfidfVector(trimmed), TOPIC_VOCAB);

  // 5. Entity confidence: how many triggers / sources / actions / destinations matched.
  const entities = extractEntities(trimmed);

  // Reject when BOTH scores are near-zero — this catches random strings,
  // keyboard mashing, single real words that have no automation meaning, etc.
  if (topicScore < 0.06 && entities.confidence < 2) {
    return {
      valid: false,
      message: "I couldn't find any automation intent in that. Describe a trigger, an action, and a destination — for example: \"" + EXAMPLE_PROMPTS[3] + '"',
      suggestions: EXAMPLE_PROMPTS,
    };
  }

  return { valid: true, entities, topicScore };
}


/* ════════════════════════════════════════════════════════════════════════
 *  PUBLIC API
 * ════════════════════════════════════════════════════════════════════════ */

async function generateWorkflow(prompt) {
  // ── Validation runs OUTSIDE try/catch ──────────────────────────────────
  // If validation is inside the catch it gets silently swallowed and the
  // fallback generates a workflow anyway — defeating the whole point.
  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    return {
      success: false,
      type: 'invalid_prompt',
      message: validation.message,
      suggestions: validation.suggestions || EXAMPLE_PROMPTS,
    };
  }

  try {
    // Re-use entities already extracted during validation
    const entities = validation.entities || extractEntities(prompt);
    logger.info(`[intelligence] generateWorkflow: ${JSON.stringify({
      triggers: entities.triggers.map(t => t.type),
      sources: entities.sources, actions: entities.actions,
      destinations: entities.destinations, schedule: entities.schedule?.label,
      confidence: entities.confidence,
    })}`);
    const graph = buildWorkflowFromEntities(entities);
    const compile = compileWorkflow(graph);
    let description = '';
    if (entities.schedule)            description += `Runs ${entities.schedule.label}. `;
    if (entities.sources.length)      description += `Reads from ${entities.sources.join(' + ')}. `;
    if (entities.actions.length)      description += `Performs ${entities.actions.join(', ')}. `;
    if (entities.destinations.length) description += `Sends to ${entities.destinations.join(' + ')}.`;
    if (!description) description = prompt;
    const summary = description.trim();
    return {
      success: true,
      type: 'workflow_generated',
      graph,
      summary,
      description: summary,
      workflowExplanation: graph.nodes.map(n => `${n.data.label} (${n.data.type})`),
      confidence: entities.confidence >= 5 ? 'high' : 'medium',
      needsClarification: false,
      suggestions: [],
      compile,
      model: 'compositional-builder',
      tokensUsed: 0
    };
  } catch (err) {
    logger.error('[intelligence] generateWorkflow error:', err);
    const graph = { nodes: [makeNode('n1', 100, 220, 'Manual Trigger', 'trigger_manual', {}),
                            makeNode('n2', 400, 220, 'Log Output', 'console_log', { message: prompt })],
                    edges: [makeEdge('e1', 'n1', 'n2')] };
    return {
      success: true,
      type: 'workflow_generated',
      graph,
      summary: prompt,
      description: prompt,
      workflowExplanation: graph.nodes.map(n => `${n.data.label} (${n.data.type})`),
      confidence: 'low',
      needsClarification: false,
      suggestions: [],
      compile: compileWorkflow(graph),
      model: 'fallback',
      tokensUsed: 0,
    };
  }
}

async function explainError(execution, failedLogs) {
  try {
    if (!failedLogs.length) return {
      summary: execution.error || 'Execution failed.',
      root_cause: 'Unknown — no node logs were recorded.',
      suggestions: ['Check trigger config.', 'Inspect execution logs.'],
    };
    const first = failedLogs[0];
    const matched = matchErrorRule(getRulesForNodeType(first.node_type || ''), first.error || '');
    if (matched) return {
      summary: `${first.node_label || first.node_type} failed: ${matched.diagnosis}`,
      root_cause: matched.root_cause,
      suggestions: [Object.values(matched.fix)[0], matched.prevention, `Open node "${first.node_label}" in the editor.`],
    };
    const suggestions = failedLogs.slice(0, 3).map(l => `${l.node_label || l.node_type}: ${l.error || 'unknown error'}`);
    suggestions.push('Click the failed node in the editor to inspect.');
    return { summary: `Failed at "${first.node_label}": ${first.error || 'unknown'}`, root_cause: first.error || 'Unknown.', suggestions };
  } catch (err) {
    logger.error('[intelligence] explainError error:', err);
    return { summary: 'Execution failed.', root_cause: 'Unknown.', suggestions: [] };
  }
}

async function debugNode({ nodeType, nodeLabel, error }) {
  try {
    const matched = matchErrorRule(getRulesForNodeType(nodeType || ''), error || '');
    if (matched) return {
      diagnosis: matched.diagnosis, root_cause: matched.root_cause,
      fix: matched.fix, explanation: `${matched.diagnosis} ${matched.root_cause}`,
      prevention: matched.prevention, model: 'rule-engine', tokensUsed: 0,
    };
    return {
      diagnosis: `"${nodeLabel || nodeType}" failed: ${error || 'unknown'}`,
      root_cause: error || 'Unknown.', fix: { config: 'Review the configuration panel.' },
      explanation: `No specific rule matched for ${nodeType}.`,
      prevention: 'Add an Error Handler.', model: 'rule-engine', tokensUsed: 0,
    };
  } catch (err) {
    logger.error('[intelligence] debugNode error:', err);
    return { diagnosis: 'Could not diagnose.', root_cause: error || 'Unknown', fix: {}, explanation: '', prevention: '', model: 'fallback', tokensUsed: 0 };
  }
}

async function suggestNodes(graph) {
  try {
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    if (nodes.length < 2) return [
      { type: 'transform_set', reason: 'Add a Transform to map incoming data.' },
      { type: 'error_handler', reason: 'Add an Error Handler to catch failures.' },
    ];
    const types = nodes.map(n => (n.data?.type || n.type || '').toLowerCase());
    const { maxDepth, unreachable } = analyzeGraphDFS(nodes, edges);
    const out = [];
    if (!types.some(t => t === 'error_handler')) out.push({ type: 'error_handler', reason: 'No error handling.' });
    if (types.some(t => t.includes('http')) && !types.some(t => t.includes('transform') || t === 'json_parse'))
      out.push({ type: 'transform_set', reason: 'HTTP responses usually need transforming.' });
    if (maxDepth > 4 && !types.some(t => t === 'logic_if' || t === 'logic_switch'))
      out.push({ type: 'logic_if', reason: `Chain is ${maxDepth} steps deep — add branching.` });
    if (!types.some(t => t === 'console_log') && nodes.length > 3)
      out.push({ type: 'console_log', reason: 'Add logging to track execution.' });
    if (unreachable.length) {
      const label = nodes.find(n => n.id === unreachable[0])?.data?.label || unreachable[0];
      out.push({ type: 'error_handler', reason: `"${label}" is disconnected from the trigger.` });
    }
    return out.slice(0, 3).length ? out.slice(0, 3)
      : [{ type: 'delay', reason: 'Add a Delay to throttle execution.' }, { type: 'console_log', reason: 'Add logging.' }];
  } catch (err) {
    logger.error('[intelligence] suggestNodes error:', err);
    return [{ type: 'error_handler', reason: 'Add error handling.' }];
  }
}

async function documentWorkflow(workflow) {
  try {
    const graphData = typeof workflow.graph === 'string' ? JSON.parse(workflow.graph) : (workflow.graph || { nodes: [], edges: [] });
    const path = aStarShortestPath(graphData.nodes || [], graphData.edges || []);
    const steps = path.map(n => ({
      node: n?.data?.label || n?.id || 'Step',
      description: n?.data?.type ? `${n.data.type} — ${NODE_INDEX.find(ni => ni.type === n.data.type)?.desc || 'workflow step'}` : 'Workflow step',
    }));
    const trigger = (graphData.nodes || []).find(n => (n.data?.type || '').includes('trigger'));
    const terminals = (graphData.nodes || []).filter(n => !(graphData.edges || []).some(e => e.source === n.id));
    return {
      title: workflow.name || 'Untitled Workflow',
      description: workflow.description || `Workflow with ${(graphData.nodes || []).length} nodes.`,
      steps,
      inputs: trigger ? [`Triggered by: ${trigger.data?.type}`] : ['Manual trigger'],
      outputs: terminals.map(n => n.data?.label || n.data?.type || 'Output'),
    };
  } catch (err) {
    logger.error('[intelligence] documentWorkflow error:', err);
    return { title: 'Workflow', description: '', steps: [], inputs: [], outputs: [] };
  }
}


/* ┌──────────────────────────────────────────────────────────────────────┐
 * │  workflowChat — strict scope, intent-routed, multi-modal response    │
 * └──────────────────────────────────────────────────────────────────────┘ */

/* ┌──────────────────────────────────────────────────────────────────────┐
 * │  SMART WORKFLOW EXPLANATION                                          │
 * │  Reads labels, configs and A* path to produce natural-language desc. │
 * └──────────────────────────────────────────────────────────────────────┘ */

function describeNode(node) {
  const type    = node?.data?.type || node?.type || '';
  const label   = node?.data?.label || type;
  const config  = node?.data?.config || {};
  const catalog = NODE_INDEX.find(n => n.type === type);
  const base    = catalog?.desc || type.replace(/_/g, ' ');

  // Pull the most meaningful config value to surface as a hint
  const hints = [];
  if (config.expression)                  hints.push(`on schedule ${config.expression}`);
  if (config.url)                         hints.push(`at ${String(config.url).slice(0, 60)}`);
  if (config.query)                       hints.push(`"${String(config.query).slice(0, 50)}${String(config.query).length > 50 ? '…' : ''}"`);
  if (config.channel)                     hints.push(`in ${config.channel}`);
  if (config.to)                          hints.push(`to ${config.to}`);
  if (config.table)                       hints.push(`table ${config.table}`);
  if (config.subject)                     hints.push(`"${config.subject}"`);
  if (config.condition)                   hints.push(`if ${String(config.condition).slice(0, 40)}`);
  if (config.code || config.script)       hints.push(`(custom code)`);
  if (config.categories)                  hints.push(`categories: ${config.categories}`);
  if (config.message && !config.channel)  hints.push(`"${String(config.message).slice(0, 40)}${String(config.message).length > 40 ? '…' : ''}"`);

  const hint = hints.length ? ` ${hints[0]}` : '';
  return { label, base, hint, full: `${label}${hint} — ${base}` };
}

function buildWorkflowExplanation(nodes, edges) {
  const { unreachable } = analyzeGraphDFS(nodes, edges);
  const path = aStarShortestPath(nodes, edges);

  // ── Single node ──────────────────────────────────────────────────────
  if (nodes.length === 1) {
    const { label, base } = describeNode(nodes[0]);
    const isTrigger = (nodes[0].data?.type || '').includes('trigger');
    return isTrigger
      ? `Single node: ${label} — ${base}. Connect more nodes to build the automation.`
      : `Single node: ${label} — ${base}. No trigger is connected yet, so this won't run automatically.`;
  }

  // ── Multi-node: walk the A* path ─────────────────────────────────────
  const lines = ['Here is what this workflow does:\n'];

  path.forEach((node, i) => {
    if (!node) return;
    const { full } = describeNode(node);
    const prefix = i === 0 ? 'Start' : `Step ${i + 1}`;
    lines.push(`${prefix}: ${full}`);
  });

  // ── Branching nodes not on the main path ─────────────────────────────
  const pathIds = new Set(path.filter(Boolean).map(n => n.id));
  const branchNodes = nodes.filter(n => !pathIds.has(n.id) && !unreachable.includes(n.id));
  if (branchNodes.length > 0) {
    lines.push('\nAlso runs in parallel:');
    branchNodes.forEach(n => lines.push(`  ${describeNode(n).full}`));
  }

  // ── Disconnected nodes ───────────────────────────────────────────────
  if (unreachable.length > 0) {
    const labels = unreachable.map(id => nodes.find(n => n.id === id)?.data?.label || id).join(', ');
    lines.push(`\nNote: ${labels} ${unreachable.length === 1 ? 'is' : 'are'} disconnected and won't run.`);
  }

  return lines.join('\n');
}

/* ┌──────────────────────────────────────────────────────────────────────┐
 * │ 11. CONVERSATION CONTEXT & PENDING ACTION SYSTEM                      │
 * └──────────────────────────────────────────────────────────────────────┘ */

function buildConversationContext(history, nodes) {
  const ctx = {
    lastBotMsg: '',
    lastUserMsg: '',
    lastAction: null,
    lastAddedNodeType: null,
    lastSuggestedNodes: [],
    pendingQuestion: false,
    nodeLabels: nodes.map(n => (n.data?.label || n.data?.type || '').toLowerCase()),
  };
  if (!history || !history.length) return ctx;

  const botMsgs  = history.filter(h => h.role === 'assistant');
  const userMsgs = history.filter(h => h.role === 'user');
  ctx.lastBotMsg  = botMsgs[botMsgs.length - 1]?.content  || '';
  ctx.lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';

  const lb = ctx.lastBotMsg.toLowerCase();
  if (lb.includes('built') && lb.includes('workflow'))      ctx.lastAction = 'generated';
  else if (lb.includes('added a') || lb.includes('added an')) ctx.lastAction = 'added_node';
  else if (lb.includes('removed'))                           ctx.lastAction = 'removed_node';
  else if (lb.includes('connected'))                         ctx.lastAction = 'connected';
  else if (lb.includes('cleared'))                           ctx.lastAction = 'cleared';
  else if (lb.includes('suggest') || lb.includes('improve')) ctx.lastAction = 'suggested';
  else if (lb.includes('schedule') || lb.includes('daily') || lb.includes('weekly')) ctx.lastAction = 'scheduled';

  ctx.pendingQuestion = ctx.lastBotMsg.includes('?');

  // Extract nodes Freckles last suggested ("1. **Error Handler**")
  for (const m of ctx.lastBotMsg.matchAll(/\d+\.\s+\*\*([^*]+)\*\*/g)) {
    const desc = m[1].trim();
    const found = NODE_INDEX.find(n =>
      desc.toLowerCase().includes(n.desc.toLowerCase().split(' ').slice(0,2).join(' ')) ||
      n.desc.toLowerCase().includes(desc.toLowerCase())
    );
    if (found) ctx.lastSuggestedNodes.push(found);
  }

  return ctx;
}

// Runs a pending action that was stored by a previous turn
function executePendingAction(pendingAction, nodes, edges) {
  if (!pendingAction || !pendingAction.type) return null;
  switch (pendingAction.type) {
    case 'add_node': {
      const spec = NODE_INDEX.find(n => n.type === pendingAction.nodeType);
      if (!spec) return null;
      const id = `${spec.type}-${Date.now()}`;
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      let wf = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: spec.type, label: spec.desc, position: { x: lastX + 280, y: 220 }, config: {},
      });
      if (nodes.length > 0) {
        wf = applyWorkflowTool(wf, 'add_edge', { source: nodes[nodes.length - 1].id, target: id });
      }
      return { wf, label: spec.desc };
    }
    case 'add_nodes': {
      let wf = { nodes: [...nodes], edges: [...edges] };
      const added = [];
      for (const nodeType of (pendingAction.nodeTypes || [])) {
        const spec = NODE_INDEX.find(n => n.type === nodeType);
        if (!spec) continue;
        const id = `${spec.type}-${Date.now()}-${added.length}`;
        const lastX = wf.nodes.length ? Math.max(...wf.nodes.map(n => n.position?.x || 0)) : 100;
        const prevId = wf.nodes.length ? wf.nodes[wf.nodes.length - 1].id : null;
        wf = applyWorkflowTool(wf, 'add_node', { id, nodeType: spec.type, label: spec.desc, position: { x: lastX + 280, y: 220 }, config: {} });
        if (prevId) wf = applyWorkflowTool(wf, 'add_edge', { source: prevId, target: id });
        added.push(spec.desc);
      }
      return added.length ? { wf, label: added.join(' + ') } : null;
    }
    default: return null;
  }
}

// Resolve schedule shorthand to cron expression
function resolveSchedule(text) {
  const t = text.toLowerCase();
  if (/every\s*minute|each\s*minute/.test(t))   return { cron: '* * * * *',    label: 'every minute' };
  if (/every\s*5\s*min/.test(t))                return { cron: '*/5 * * * *',  label: 'every 5 minutes' };
  if (/every\s*15\s*min/.test(t))               return { cron: '*/15 * * * *', label: 'every 15 minutes' };
  if (/hour/.test(t))                           return { cron: '0 * * * *',    label: 'every hour' };
  if (/noon|12\s*pm|midday/.test(t))            return { cron: '0 12 * * *',   label: 'daily at noon' };
  if (/evening|6\s*pm/.test(t))                 return { cron: '0 18 * * *',   label: 'daily at 6pm' };
  if (/night|midnight/.test(t))                 return { cron: '0 0 * * *',    label: 'every midnight' };
  if (/daily|every\s*day|each\s*day|morning/.test(t)) return { cron: '0 9 * * *', label: 'daily at 9am' };
  if (/week|monday/.test(t))                    return { cron: '0 9 * * 1',    label: 'every Monday 9am' };
  if (/month/.test(t))                          return { cron: '0 9 1 * *',    label: 'first of the month' };
  return null;
}

const HELP_TEXT =
  "Here's what I can do:\n\n" +
  "**Build** — describe any automation in plain English\n" +
  "  _\"Fetch gold prices daily and send a WhatsApp alert\"_\n\n" +
  "**Edit** — add, remove, or connect nodes\n" +
  "  _\"Add a Slack node\"_ · _\"Remove the email step\"_\n\n" +
  "**Analyse** — health check, simulate, explain, debug\n" +
  "  _\"Check workflow health\"_ · _\"Simulate this\"_ · _\"What does this do?\"_\n\n" +
  "**Suggestions** — ask me what to improve\n" +
  "  _\"Any suggestions?\"_ · _\"What's missing?\"_";

const GREETINGS = [
  "Hey! I'm Freckles. Describe what you want to automate and I'll build it for you.",
  "Hi there! Tell me what you'd like to automate — I'll take care of the rest.",
  "Hello! What would you like to build today?",
  "Hey! What automation can I build for you?",
];

const OFFTOPIC_REPLIES = [
  "Hmm, I didn't quite catch that. I can build workflows, add nodes, check health, or explain what's on the canvas. What would you like to do?",
  "I'm not sure what you mean — try asking me to build a workflow, check health, or say 'help' for ideas.",
  "That's a bit outside my area. I specialise in workflow automation. Want me to build something, or need help?",
];

async function workflowChat({ message, history = [], workflow = {}, pendingAction = null }) {
  try {
    const msg = (message || '').trim();
    if (!msg) return { reply: 'Tell me what to build.', toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: [], metadata: {} };

    let { intent, confidence } = classifyIntent(msg);

    // ── Resolve workflow state FIRST so ctx and all handlers can use it ───
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    // ── Pattern overrides: comprehensive natural language recognition ────────
    const lower = msg.toLowerCase();
    const ctx   = buildConversationContext(history, nodes);

    // Greetings
    if (/^(hi|hey|hello|sup|yo|howdy|hiya|greetings|good\s?(morning|afternoon|evening|day))\b/.test(lower)) intent = 'greeting';

    // Confirmations — "yes", "do it", "add both", "go ahead", etc.
    const IS_CONFIRM = /^(yes|yep|yeah|sure|ok|okay|do it|go ahead|apply( it)?|add (it|them|both|all)|please( do)?|proceed|confirm|sounds good|perfect|great|absolutely|definitely|let'?s? do it|make it so|that'?s? (fine|good|great)|👍)\s*[!.]?\s*$/.test(lower);
    const IS_REJECT  = /^(no|nope|nah|cancel|stop|don'?t|never mind|nevermind|forget it|skip|discard|not now|ignore that|revert|undo)\s*[!.]?\s*$/.test(lower);

    if (IS_CONFIRM) intent = 'confirm';
    if (IS_REJECT)  intent = 'reject';

    // Schedule modification: "make it weekly", "run daily", "change to hourly"
    if (/\b(make|set|change|switch|update|run|schedule)\b.*(it|this|the trigger|the workflow|the schedule)?.*(weekly|daily|hourly|monthly|every (day|week|hour|morning|night|minute|5 min|15 min))/.test(lower)) intent = 'modify_schedule';
    if (/\b(every|each|run at|run on|schedule for) (day|week|month|hour|morning|night|minute|monday|tuesday|wednesday|thursday|friday|noon|midnight)\b/.test(lower)) intent = 'modify_schedule';

    // Conditional logic: "only if", "when amount > 100", "if it fails"
    if (/^only if\b/.test(lower) || /\badd (a )?(condition|conditional|if node|logic|filter|gate|check)\b/.test(lower)) intent = 'add_condition';
    if (/\bif (it )?fails?\b/.test(lower) || /\bwhen (it )?fails?\b/.test(lower)) intent = 'add_error_handler';
    if (/\bretry (if|on|when) (fail|error|failed)\b/.test(lower)) intent = 'add_error_handler';

    // Delay / wait
    if (/\badd (a )?(delay|pause|wait|sleep)\b/.test(lower) || /\bwait (for |a )?(few )?(second|minute|hour)\b/.test(lower)) intent = 'add_delay';

    // Add after: "add X after this/that/the Y node"
    if (/\badd\b.+\b(after|before|between|following)\b/.test(lower)) intent = 'add_after';

    // Replace / swap: "replace X with Y", "use Y instead"
    if (/\b(replace|swap|switch|change)\b.+(with|for|to)\b/.test(lower) || /\buse\b.+\binstead( of)?\b/.test(lower)) intent = 'replace_node';

    // Explain / describe
    if (/what does (this|it|the workflow|this workflow) (do|mean|actually do)/.test(lower)) intent = 'explain';
    if (/what is (this|the workflow|it)\b/.test(lower))                                      intent = 'explain';
    if (/^(explain|describe|tell me (about|what)|walk me through|summari[sz]e)\b/.test(lower)) intent = 'explain';
    if (/(summarize|summarise) (this|the|my)? ?(workflow|automation|it)/.test(lower))        intent = 'explain';
    if (/\bwhat('?s| is) (happening|going on|the flow|the purpose)\b/.test(lower))          intent = 'explain';

    // Suggestions / improvements — broad coverage for natural phrasings
    if (/\b(any|give( me)?|show( me)?|share|got) (any )?(suggestions?|ideas?|recommendations?|tips?|advice)\b/.test(lower)) intent = 'suggest';
    if (/^(suggestions?|ideas?|tips?|advice|recommendations?)\??\s*$/.test(lower.trim()))    intent = 'suggest';
    if (/what (should i|can i|could i) (add|improve|do next|change|fix|include|build)/.test(lower)) intent = 'suggest';
    if (/what('s| is) (missing|next|wrong|broken|needed|lacking|left)/.test(lower))          intent = 'suggest';
    if (/how (can i|do i|should i) (improve|optimise|optimize|fix|enhance|make (it|this) better)/.test(lower)) intent = 'suggest';
    if (/\b(improve|optimise|optimize|enhance) (this |the |my )?(workflow|automation|it|this)?\b/.test(lower)) intent = 'suggest';
    if (/\bwhat (additions?|improvements?|changes?|modifications?|enhancements?|nodes?|steps?)\b.*(can|could|should)/.test(lower)) intent = 'suggest';
    if (/\bwhat (can|could|should) (be|i) (add|do|improve|change|include|build|make)\b/.test(lower)) intent = 'suggest';
    if (/\b(how|what).*(make (this|it|the workflow) better|improve (this|it|the workflow))\b/.test(lower)) intent = 'suggest';
    if (/\bwhat (else|more) (can|could|should) (be|i|we) (add|do|improve|change)\b/.test(lower)) intent = 'suggest';
    if (/\b(make (it|this|the workflow) better|better(ify)?|level up)\b/.test(lower))        intent = 'suggest';
    if (/\bwhat (features?|capabilities|options|things?) (can|could|should) (be )?(add|include|build)\b/.test(lower)) intent = 'suggest';

    // Health / quality check
    if (/\b(check|analyse|analyze|review|audit|assess|validate|score)\b.*(workflow|health|quality|status|it|this)/.test(lower)) intent = 'health';
    if (/\bhow (good|healthy|ready|solid|valid) is (this|it|the workflow)\b/.test(lower))   intent = 'health';
    if (/\b(is this|is it|is my workflow) (ready|valid|good|correct|complete)\b/.test(lower)) intent = 'health';

    // Simulate / test
    if (/\b(simulate|test|preview|dry.?run|trace|run through|walk through)\b/.test(lower))  intent = 'simulate';
    if (/\bwhat (would|will) happen\b/.test(lower))                                          intent = 'simulate';
    if (/\bhow (would|will) (this|it) (run|execute|work)\b/.test(lower))                    intent = 'simulate';

    // Debug / fix
    if (/\b(debug|troubleshoot|diagnose|find (the )?issue)\b/.test(lower))                  intent = 'debug';
    if (/\b(fix|repair|resolve) (the |this |my )?(error|issue|problem|bug|failure)\b/.test(lower)) intent = 'debug';
    if (/\bwhy (isn'?t|doesn'?t|won'?t) (this|it) (work|run|fire|connect|execute)\b/.test(lower)) intent = 'debug';

    // Clear / reset
    if (/^(clear|reset|wipe|start (over|fresh|again)|start from scratch)\b/.test(lower))   intent = 'clear';
    if (/\b(clear|wipe|reset|delete all|remove all) (the |all )?(nodes?|everything|canvas|workflow|steps?)\b/.test(lower)) intent = 'clear';

    // Help
    if (/^(help|commands?)\b/.test(lower))                                                   intent = 'help';
    if (/\bwhat (can|do) you (do|help (with|me))\b/.test(lower))                            intent = 'help';
    if (/\bshow (me )?(help|commands?|what you can)\b/.test(lower))                         intent = 'help';
    const entities = extractEntities(msg);

    // Hard scope guard
    if (!isOnTopic(msg, intent)) {
      const reply = OFFTOPIC_REPLIES[Math.floor(Math.random() * OFFTOPIC_REPLIES.length)];
      return {
        reply, toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: ['Build a Slack notification', 'Daily report from Postgres', 'What can you do?'],
        metadata: {},
      };
    }

    /* ── CONFIRM ──────────────────────────────────────────────── */
    if (intent === 'confirm') {
      // Execute a pending action if one was passed from the frontend
      if (pendingAction) {
        const result = executePendingAction(pendingAction, nodes, edges);
        if (result) {
          return {
            reply: `Done! I've added **${result.label}** to the canvas.`,
            toolCalls: [{ name: 'add_node' }], updatedWorkflow: result.wf, messageType: 'workflow_edited',
            suggestions: ['Check workflow health', 'Any more improvements?', 'Simulate the workflow'],
            metadata: { changes: [`+ ${result.label}`] },
          };
        }
      }
      // No pending action — respond gracefully
      return {
        reply: ctx.lastAction
          ? `Sure! What would you like me to do?`
          : `Got it! What would you like me to build or change?`,
        toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: ['Add a node', 'Check workflow health', 'Any suggestions?'],
        metadata: {},
      };
    }

    /* ── REJECT ───────────────────────────────────────────────── */
    if (intent === 'reject') {
      return {
        reply: `No problem, I'll leave it as is. Let me know if you'd like to change anything else.`,
        toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: ['Any suggestions?', 'Check workflow health', 'Explain this workflow'],
        metadata: {},
      };
    }

    /* ── MODIFY SCHEDULE ──────────────────────────────────────── */
    if (intent === 'modify_schedule') {
      const schedule = resolveSchedule(msg);
      const triggerNode = nodes.find(n => (n.data?.type || '').includes('trigger_cron') || (n.data?.type || '').includes('trigger_manual'));
      if (!schedule) {
        return {
          reply: "What schedule would you like? For example: daily, weekly, every hour, every morning, or every Monday.",
          toolCalls: [], updatedWorkflow: null, messageType: 'clarification',
          suggestions: ['Daily at 9am', 'Every hour', 'Every Monday', 'Every 15 minutes'],
          metadata: {},
        };
      }
      if (!nodes.length) {
        return {
          reply: `There's no workflow on the canvas yet. Want me to build a scheduled workflow that runs ${schedule.label}?`,
          toolCalls: [], updatedWorkflow: null, messageType: 'message',
          suggestions: [`Build a workflow that runs ${schedule.label}`, 'What can you build?'],
          metadata: {},
        };
      }
      // Update or replace the trigger node
      const updatedNodes = nodes.map(n => {
        if ((n.data?.type || '').includes('trigger')) {
          return { ...n, data: { ...n.data, type: 'trigger_cron', label: `Schedule (${schedule.label})`, config: { expression: schedule.cron } } };
        }
        return n;
      });
      // If no trigger existed, add one at the front
      let finalNodes = updatedNodes;
      if (!nodes.some(n => (n.data?.type || '').includes('trigger'))) {
        const id = `trigger_cron-${Date.now()}`;
        finalNodes = [makeNode(id, 100, 220, `Schedule (${schedule.label})`, 'trigger_cron', { expression: schedule.cron }), ...nodes];
      }
      return {
        reply: `Updated! The workflow is now scheduled to run **${schedule.label}** (cron: \`${schedule.cron}\`).`,
        toolCalls: [{ name: 'set_workflow' }],
        updatedWorkflow: { nodes: finalNodes, edges },
        messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Simulate the workflow', 'Any other changes?'],
        metadata: { changes: [`Schedule → ${schedule.label}`] },
      };
    }

    /* ── ADD CONDITION ────────────────────────────────────────── */
    if (intent === 'add_condition') {
      const conditionText = msg.replace(/^only if\s*/i, '').replace(/^add (a )?(condition|conditional|if node|logic|filter)\s*/i, '').trim() || '{{data.value}} > 0';
      const id = `logic_if-${Date.now()}`;
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      let wf = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: 'logic_if', label: 'Condition', position: { x: lastX + 280, y: 220 },
        config: { condition: conditionText },
      });
      if (nodes.length > 0) wf = applyWorkflowTool(wf, 'add_edge', { source: nodes[nodes.length - 1].id, target: id });
      return {
        reply: `Added a **Condition** node. Open it to set your exact condition — for example: \`${conditionText}\`. The workflow will only continue if the condition is true.`,
        toolCalls: [{ name: 'add_node' }], updatedWorkflow: wf, messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Add error handling', 'Simulate the workflow'],
        metadata: { changes: ['+ Condition (If)'] },
      };
    }

    /* ── ADD ERROR HANDLER / RETRY ────────────────────────────── */
    if (intent === 'add_error_handler') {
      const id = `error_handler-${Date.now()}`;
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      let wf = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: 'error_handler', label: 'Error Handler', position: { x: lastX + 280, y: 380 }, config: {},
      });
      if (nodes.length > 0) wf = applyWorkflowTool(wf, 'add_edge', { source: nodes[nodes.length - 1].id, target: id });
      return {
        reply: `Added an **Error Handler** node. If anything upstream fails, execution will branch here so your workflow can recover gracefully instead of crashing silently.`,
        toolCalls: [{ name: 'add_node' }], updatedWorkflow: wf, messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Simulate the workflow', 'Any other improvements?'],
        metadata: { changes: ['+ Error Handler'] },
      };
    }

    /* ── ADD DELAY ────────────────────────────────────────────── */
    if (intent === 'add_delay') {
      const id = `delay-${Date.now()}`;
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      let wf = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: 'delay', label: 'Delay', position: { x: lastX + 280, y: 220 }, config: { duration: 5, unit: 'seconds' },
      });
      if (nodes.length > 0) wf = applyWorkflowTool(wf, 'add_edge', { source: nodes[nodes.length - 1].id, target: id });
      return {
        reply: `Added a **Delay** node. Open it to set how long to wait — useful for rate limiting, back-off strategies, or giving upstream systems time to process.`,
        toolCalls: [{ name: 'add_node' }], updatedWorkflow: wf, messageType: 'workflow_edited',
        suggestions: ['Add error handling', 'Check workflow health', 'Simulate the workflow'],
        metadata: { changes: ['+ Delay'] },
      };
    }

    /* ── REPLACE NODE ─────────────────────────────────────────── */
    if (intent === 'replace_node') {
      const top = retrieveNodes(msg, 3);
      const targetNode = findNodeByText(nodes, msg);
      if (!targetNode || !top.length) {
        return {
          reply: `I'm not sure which node to replace or what to replace it with. Could you be more specific? For example: "replace the email node with Slack" or "use Discord instead of Telegram".`,
          toolCalls: [], updatedWorkflow: null, messageType: 'message',
          suggestions: nodes.slice(0, 3).map(n => `Replace ${n.data?.label} with...`),
          metadata: {},
        };
      }
      const newType = top.find(t => t.type !== (targetNode.data?.type || '')) || top[0];
      const updatedNodes = nodes.map(n =>
        n.id === targetNode.id
          ? { ...n, data: { ...n.data, type: newType.type, label: newType.desc, config: {} } }
          : n
      );
      return {
        reply: `Swapped **${targetNode.data?.label}** for **${newType.desc}**. Open the node to configure the new connection details.`,
        toolCalls: [{ name: 'set_workflow' }], updatedWorkflow: { nodes: updatedNodes, edges }, messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Simulate the workflow'],
        metadata: { changes: [`${targetNode.data?.label} → ${newType.desc}`] },
      };
    }

    /* ── ADD AFTER SPECIFIC NODE ──────────────────────────────── */
    if (intent === 'add_after') {
      const top = retrieveNodes(msg, 1);
      const def = top[0];
      const afterNode = findNodeByText(nodes, msg) || (nodes.length ? nodes[nodes.length - 1] : null);
      if (!def) {
        return {
          reply: "What type of node would you like to add? For example: Slack, email, database, transform, delay, condition.",
          toolCalls: [], updatedWorkflow: null, messageType: 'clarification',
          suggestions: ['Add a Slack node', 'Add an email node', 'Add a delay', 'Add a condition'],
          metadata: {},
        };
      }
      const id = `${def.type}-${Date.now()}`;
      const posX = afterNode ? (afterNode.position?.x || 100) + 280 : 380;
      let wf = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: def.type, label: def.desc, position: { x: posX, y: 220 }, config: {},
      });
      if (afterNode) wf = applyWorkflowTool(wf, 'add_edge', { source: afterNode.id, target: id });
      return {
        reply: `Added **${def.desc}**${afterNode ? ` after **${afterNode.data?.label}**` : ''}. Open it to configure the details.`,
        toolCalls: [{ name: 'add_node' }], updatedWorkflow: wf, messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Add another node', 'Simulate the workflow'],
        metadata: { changes: [`+ ${def.desc}${afterNode ? ` (after ${afterNode.data?.label})` : ''}`] },
      };
    }

    // If entities are strong, treat as generate even when intent score is weak
    const isStrongGenerate = entities.confidence >= 5 || entities.destinations.length >= 1;

    /* ── GENERATE ─────────────────────────────────────────────── */
    if (intent === 'generate' || isStrongGenerate) {
      // If the request is meaningful but incomplete, ask a smart follow-up
      if (entities.confidence > 0 && entities.confidence < 3 && !entities.destinations.length && !entities.sources.length) {
        const topic = entities.actions.length ? entities.actions[0] : null;
        const question = topic
          ? `I can build that! What should trigger the ${topic} workflow — a webhook, a schedule, or something else?`
          : `Interesting idea! Could you tell me more? For example, what should trigger it, and where should the result go?`;
        return {
          reply: question,
          toolCalls: [], updatedWorkflow: null, messageType: 'clarification',
          suggestions: ['Trigger by webhook', 'Run on a schedule', 'Trigger manually'],
          metadata: {},
        };
      }
      const chatValidation = validatePrompt(msg);
      if (!chatValidation.valid) {
        return {
          reply: chatValidation.message,
          toolCalls: [], updatedWorkflow: null, messageType: 'error',
          suggestions: chatValidation.suggestions || EXAMPLE_PROMPTS,
          metadata: {},
        };
      }
      const built = buildWorkflowFromEntities(entities);
      const updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', built);
      const compile = compileWorkflow(updatedWorkflow);
      const parts = [];
      if (entities.schedule)             parts.push(`runs **${entities.schedule.label}**`);
      else if (entities.triggers.length) parts.push(`triggered by **${entities.triggers[0].type.replace(/_/g, ' ')}**`);
      if (entities.sources.length)       parts.push(`reads from **${entities.sources.join(' + ')}**`);
      if (entities.actions.length)       parts.push(`${entities.actions.slice(0, 2).join(', ')}`);
      if (entities.destinations.length)  parts.push(`sends to **${entities.destinations.join(' and ')}**`);

      const nodeCount = built.nodes.length;
      const opens = ['Got it!', 'Done!', 'Built it!', 'Here you go!'];
      const open = opens[Math.floor(Math.random() * opens.length)];
      const summary = parts.length ? parts.join(' → ') : 'manual trigger → log output';

      return {
        reply: `${open} I've built a **${nodeCount}-node workflow** that ${parts.join(', ') || 'starts from a manual trigger'}.\n\nOpen each node to fill in your credentials and connection details.`,
        toolCalls: [{ name: 'set_workflow' }],
        updatedWorkflow, messageType: 'workflow_built',
        suggestions: ['Check workflow health', 'Simulate the workflow', 'What does this workflow do?'],
        metadata: {
          summary,
          explanation: built.nodes.map(n => `${n.data.label} (${n.data.type})`),
          confidence: confidence > 0.25 ? 'high' : confidence > 0.1 ? 'medium' : 'low',
          changes: built.nodes.map(n => `+ ${n.data.label}`),
          compile, health: compile.health, simulation: compile.simulation,
        },
      };
    }

    /* ── ADD NODE ─────────────────────────────────────────────── */
    if (intent === 'add_node') {
      const top = retrieveNodes(msg, 1);
      const def = top[0] || NODE_INDEX[0];
      const id = `${def.type}-${Date.now()}`;
      const lastX = nodes.length ? Math.max(...nodes.map(n => n.position?.x || 0)) : 100;
      let updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'add_node', {
        id, nodeType: def.type, label: def.desc, position: { x: lastX + 280, y: 220 }, config: {},
      });
      if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        updatedWorkflow = applyWorkflowTool(updatedWorkflow, 'add_edge', { source: last.id, target: id });
      }
      return {
        reply: `Added a **${def.desc}** node to the canvas${nodes.length > 0 ? ' and connected it to the previous step' : ''}. Open it to configure the details.`,
        toolCalls: [{ name: 'add_node' }], updatedWorkflow, messageType: 'workflow_edited',
        suggestions: ['Add another node', 'Check workflow health', 'What does this workflow do?'],
        metadata: { changes: [`+ ${def.desc}`] },
      };
    }

    /* ── REMOVE NODE ──────────────────────────────────────────── */
    if (intent === 'remove_node') {
      const target = findNodeByText(nodes, msg);
      if (target) {
        const updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'remove_node', { id: target.id });
        return {
          reply: `Removed the **${target.data?.label || target.id}** node.`,
          toolCalls: [{ name: 'remove_node' }], updatedWorkflow, messageType: 'workflow_edited',
          suggestions: ['Add a new node', 'Check workflow health'],
          metadata: { changes: [`- ${target.data?.label}`] },
        };
      }
      return {
        reply: `I couldn't find a node matching that description. Here's what's on the canvas — which one did you mean?`,
        toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: nodes.slice(0, 3).map(n => `Remove ${n.data?.label}`),
        metadata: {},
      };
    }

    /* ── CONNECT ──────────────────────────────────────────────── */
    if (intent === 'connect') {
      if (nodes.length < 2) {
        return { reply: "You'll need at least two nodes on the canvas before I can connect them. Want me to add some?", toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: ['Add a webhook trigger', 'Add a Slack node'], metadata: {} };
      }
      const msgTokens = removeStopWords(tokenize(msg));
      const matches = [];
      for (const t of msgTokens) {
        const m = findNodeByText(nodes, t);
        if (m && !matches.find(x => x.id === m.id)) matches.push(m);
        if (matches.length === 2) break;
      }
      const [source, target] = matches.length >= 2 ? matches : [nodes[nodes.length - 2], nodes[nodes.length - 1]];
      const updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'add_edge', { source: source.id, target: target.id });
      return {
        reply: `Connected **${source.data?.label}** → **${target.data?.label}**.`,
        toolCalls: [{ name: 'add_edge' }], updatedWorkflow, messageType: 'workflow_edited',
        suggestions: ['Check workflow health', 'Simulate the workflow'],
        metadata: { changes: [`${source.data?.label} → ${target.data?.label}`] },
      };
    }

    /* ── CLEAR ────────────────────────────────────────────────── */
    if (intent === 'clear') {
      const updatedWorkflow = applyWorkflowTool({ nodes, edges }, 'set_workflow', { nodes: [], edges: [] });
      return {
        reply: "Canvas cleared! Fresh start — what would you like to build?",
        toolCalls: [{ name: 'set_workflow' }], updatedWorkflow, messageType: 'workflow_edited',
        suggestions: ['Build a Slack notification', 'Daily email report', 'What can you build?'],
        metadata: {},
      };
    }

    /* ── HEALTH ───────────────────────────────────────────────── */
    if (intent === 'health') {
      if (!nodes.length) return {
        reply: "The canvas is empty, so there's nothing to analyse yet. Build a workflow first and I'll check it for you.",
        toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: ['Build a workflow'], metadata: {},
      };
      const health = analyzeWorkflowHealth({ nodes, edges });
      const compile = compileWorkflow({ nodes, edges });
      const emoji = health.score >= 90 ? '🟢' : health.score >= 70 ? '🟡' : '🔴';
      let reply = `${emoji} **Health score: ${health.score}/100 — ${health.grade}**\n\n`;
      if (health.issues.length) {
        reply += health.issues.map(i => `${i.type === 'error' ? '❌' : '⚠️'} ${i.msg}`).join('\n');
      } else {
        reply += 'Everything looks good — no issues detected.';
      }
      return {
        reply, toolCalls: [], updatedWorkflow: null, messageType: 'health',
        suggestions: health.tips.length ? health.tips.slice(0, 3) : ['Simulate the workflow', 'Add an error handler'],
        metadata: { health, compile },
      };
    }

    /* ── SIMULATE ─────────────────────────────────────────────── */
    if (intent === 'simulate') {
      if (!nodes.length) return {
        reply: "Nothing on the canvas to simulate yet — describe what you want to build and I'll create it.",
        toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: ['Build a workflow'], metadata: {},
      };
      return {
        reply: "Here's how this workflow would execute step by step:",
        toolCalls: [], updatedWorkflow: null, messageType: 'simulation',
        suggestions: ['Check workflow health', 'Add error handling', 'What does this workflow do?'],
        metadata: { simulation: simulateWorkflow({ nodes, edges }), compile: compileWorkflow({ nodes, edges }) },
      };
    }

    /* ── EXPLAIN ──────────────────────────────────────────────── */
    if (intent === 'explain') {
      if (!nodes.length) return {
        reply: "The canvas is empty — nothing to explain yet. Tell me what you'd like to automate and I'll build it.",
        toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: ['Build a workflow', 'What can you do?'], metadata: {},
      };
      const reply = buildWorkflowExplanation(nodes, edges);
      return {
        reply, toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: ['Check workflow health', 'Simulate execution', 'Any suggestions?'],
        metadata: { explanation: nodes.map(n => `${n.data?.label} — ${n.data?.type}`) },
      };
    }

    /* ── DEBUG ────────────────────────────────────────────────── */
    if (intent === 'debug') {
      if (!nodes.length) return {
        reply: "The canvas is empty — no errors to debug. Build a workflow first.",
        toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: ['Build a workflow'], metadata: {},
      };
      const health = analyzeWorkflowHealth({ nodes, edges });
      const errs = health.issues.filter(i => i.type === 'error');
      const warns = health.issues.filter(i => i.type === 'warning');
      let reply;
      if (!errs.length && !warns.length) {
        reply = "No errors or warnings found — the workflow structure looks solid! ✅";
      } else if (!errs.length) {
        reply = `No blocking errors, but ${warns.length} warning${warns.length > 1 ? 's' : ''} to look at:\n\n` +
                warns.map(w => `⚠️ ${w.msg}`).join('\n');
      } else {
        reply = `Found ${errs.length} error${errs.length > 1 ? 's' : ''} that will prevent the workflow from running:\n\n` +
                errs.map(e => `❌ ${e.msg}`).join('\n');
        if (warns.length) reply += `\n\nAlso ${warns.length} warning${warns.length > 1 ? 's' : ''}:\n` + warns.map(w => `⚠️ ${w.msg}`).join('\n');
      }
      return {
        reply, toolCalls: [], updatedWorkflow: null, messageType: 'debug',
        suggestions: health.tips.slice(0, 3),
        metadata: { issues: health.issues, health },
      };
    }

    /* ── SUGGEST ──────────────────────────────────────────────── */
    if (intent === 'suggest') {
      if (!nodes.length) {
        return {
          reply: "Your canvas is empty, so I don't have a workflow to analyse yet.\n\nOnce you build something I can suggest improvements. Want me to build one now?",
          toolCalls: [], updatedWorkflow: null, messageType: 'message',
          suggestions: ['Build a Slack notification', 'Daily report from database', 'What can you build?'],
          metadata: {},
        };
      }
      const nodeSuggestions = await suggestNodes({ nodes, edges });
      const health = analyzeWorkflowHealth({ nodes, edges });
      const parts = [];
      if (nodeSuggestions.length > 0) {
        parts.push("Here's what I'd suggest improving:\n");
        nodeSuggestions.forEach((s, i) => {
          const label = NODE_INDEX.find(n => n.type === s.type)?.desc || s.type;
          parts.push(`${i + 1}. **${label}** — ${s.reason}`);
        });
        if (nodeSuggestions.length === 1) {
          parts.push(`\nWant me to add it? Just say **yes**.`);
        } else {
          parts.push(`\nSay **"add all"**, **"add the first one"**, or just **yes** to apply.`);
        }
      }
      if (health.tips.length > 0) {
        parts.push('\nBest practices:');
        health.tips.slice(0, 2).forEach(t => parts.push(`  • ${t}`));
      }
      if (!parts.length) parts.push("The workflow looks solid — no obvious improvements needed. 👍");

      // Build pending action so user can confirm
      const pa = nodeSuggestions.length === 1
        ? { type: 'add_node', nodeType: nodeSuggestions[0].type }
        : nodeSuggestions.length > 1
          ? { type: 'add_nodes', nodeTypes: nodeSuggestions.map(s => s.type) }
          : null;

      return {
        reply: parts.join('\n').trim(),
        toolCalls: [], updatedWorkflow: null, messageType: 'suggest',
        suggestions: nodeSuggestions.length > 0
          ? ['Yes, add them', 'Add the first one', 'Skip for now']
          : ['Check workflow health', 'Simulate the workflow'],
        metadata: { pendingAction: pa },
      };
    }

    /* ── GREETING ─────────────────────────────────────────────── */
    if (intent === 'greeting') {
      const hasWorkflow = nodes.length > 0;
      const reply = hasWorkflow
        ? `Hey! You've got a ${nodes.length}-node workflow on the canvas. Want me to explain it, check the health, or keep building?`
        : GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      return {
        reply, toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: hasWorkflow
          ? ['What does this workflow do?', 'Check workflow health', 'Any suggestions?']
          : ['Build a Slack notification', 'Daily report workflow', 'What can you do?'],
        metadata: {},
      };
    }

    /* ── HELP ─────────────────────────────────────────────────── */
    if (intent === 'help') {
      return {
        reply: HELP_TEXT, toolCalls: [], updatedWorkflow: null, messageType: 'message',
        suggestions: ['Fetch gold prices and send WhatsApp via Twilio', 'Daily Postgres report emailed at 9am', 'Slack alert on new GitHub PR'],
        metadata: {},
      };
    }

    /* ── UNKNOWN (still topical) ──────────────────────────────── */
    return {
      reply: "I'm not quite sure what you're asking. Here's what I can help with:\n\n" + HELP_TEXT,
      toolCalls: [], updatedWorkflow: null, messageType: 'message',
      suggestions: ['Build a workflow', 'What can you do?', 'Check workflow health'],
      metadata: {},
    };
  } catch (err) {
    logger.error('[intelligence] workflowChat error:', err);
    return { reply: 'Something went wrong. Please try again.', toolCalls: [], updatedWorkflow: null, messageType: 'message', suggestions: [], metadata: {} };
  }
}


module.exports = {
  generateWorkflow,
  explainError,
  debugNode,
  suggestNodes,
  documentWorkflow,
  compileWorkflow,
  workflowChat,
};

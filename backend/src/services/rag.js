const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const VECTOR_STORE_PATH = path.join(__dirname, '../../rag_store.json');
const TRAINING_WORKFLOWS_PATH = path.join(__dirname, '../../../training/data/workflows/seed_workflows.jsonl');
const DEFAULT_MODEL = process.env.RAG_MODEL || 'llama-3.1-8b-instant';
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
  'in', 'into', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'send', 'that', 'the',
  'then', 'this', 'to', 'use', 'via', 'when', 'with', 'you', 'your'
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function importantTerms(text) {
  return tokenize(text).filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function buildTfidf(texts) {
  const df = {};
  const tokenized = texts.map((text) => tokenize(text));
  const totalDocs = tokenized.length || 1;

  tokenized.forEach((tokens) => {
    new Set(tokens).forEach((term) => {
      df[term] = (df[term] || 0) + 1;
    });
  });

  return tokenized.map((tokens) => {
    const tf = {};
    tokens.forEach((term) => {
      tf[term] = (tf[term] || 0) + 1;
    });

    const vec = {};
    Object.entries(tf).forEach(([term, count]) => {
      const idf = Math.log((totalDocs + 1) / ((df[term] || 0) + 1)) + 1;
      vec[term] = (count / Math.max(tokens.length, 1)) * idf;
    });

    const norm = Math.sqrt(Object.values(vec).reduce((sum, value) => sum + value * value, 0)) || 1;
    Object.keys(vec).forEach((term) => {
      vec[term] /= norm;
    });
    return vec;
  });
}

function sparseCosine(a, b) {
  let dot = 0;
  for (const [term, value] of Object.entries(a)) {
    if (b[term]) dot += value * b[term];
  }
  return dot;
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
  const queryTerms = importantTerms(queryText);
  const allTexts = [...docs.map(getDocSearchText), queryText];
  const vecs = buildTfidf(allTexts);
  const queryVec = vecs[vecs.length - 1];

  return docs
    .map((doc, index) => {
      const semantic = sparseCosine(vecs[index], queryVec);
      const lexical = lexicalScore(queryTerms, doc);
      const boost = intentBoost(queryText, doc);
      const score = (semantic * 0.62) + (lexical * 0.28) + boost;
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
    ['webhook_sms', 'Receive webhook then send SMS. Use trigger_webhook -> twilio_sms. Map trigger.body.phone to "to" and trigger.body.message to "message".', ['webhook', 'twilio', 'sms']],
    ['webhook_email', 'Receive webhook then send email. Use trigger_webhook -> email_send. Map trigger.body fields to to, subject, body.', ['webhook', 'email']],
    ['schedule_api', 'Run on a schedule and call an API. Use trigger_cron with a cron expression -> http_request.', ['cron', 'api']],
    ['ai_classify_route', 'Classify incoming text with AI and route it. Use trigger_webhook -> ai_text_classifier -> logic_if, then connect true and false branches.', ['ai', 'routing']],
    ['hubspot_lead', 'CRM lead capture. Use trigger_webhook -> hubspot_contact -> slack_message to notify the team.', ['crm', 'hubspot', 'slack']],
    ['monitor_site', 'Website monitoring. Use trigger_cron -> http_request -> logic_if statusCode not_equals 200 -> slack_message.', ['monitoring', 'slack']],
    ['gpt_webhook', 'AI chatbot webhook. Use trigger_webhook -> openai_chat or anthropic_chat -> respond_webhook.', ['ai', 'webhook']],
    ['error_handler', 'Error handling. Add error_handler or retry-oriented logic around risky HTTP/API/database nodes.', ['errors', 'retry']],
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
      title: 'Variable syntax',
      text: 'Use {{trigger.body.fieldName}} for webhook data, {{$json.field}} for current input, and {{$node["Node Label"].json.field}} or {{NodeLabel.outputField}} for previous node output.',
      metadata: { type: 'syntax', tags: ['variables', 'mapping', 'expressions'] }
    },
    {
      id: 'syntax:workflow_json',
      title: 'Workflow JSON contract',
      text: 'Generated workflows must contain nodes and edges. Each node needs id, type, label, config, and optional position. Each edge source and target must reference existing node ids.',
      metadata: { type: 'syntax', tags: ['json', 'workflow', 'validation'] }
    },
    {
      id: 'platform:credentials',
      title: 'Credentials',
      text: 'Credentials are managed in the Credentials Manager. Nodes may use stored service credentials for OpenAI, Anthropic, Slack, HubSpot, Twilio, Stripe, GitHub, AWS, Google, and more.',
      metadata: { type: 'platform', tags: ['credentials', 'secrets'] }
    },
    {
      id: 'platform:triggers',
      title: 'Triggers',
      text: 'Common trigger nodes are trigger_webhook, trigger_cron, and trigger_manual. Workflows should normally start with one trigger or a root node with no incoming edges.',
      metadata: { type: 'platform', tags: ['triggers', 'webhook', 'cron'] }
    }
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

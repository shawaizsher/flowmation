const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const VECTOR_STORE_PATH = path.join(__dirname, '../../rag_store.json');
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// ── Embedding via HuggingFace Inference API ──────────────────────────────────

async function embed(texts) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not set in .env');

  const response = await axios.post(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
    { inputs: texts, options: { wait_for_model: true } },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return response.data; // array of float arrays
}

// ── Cosine similarity ────────────────────────────────────────────────────────

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

// ── Vector store (JSON file on disk) ────────────────────────────────────────

function loadStore() {
  if (!fs.existsSync(VECTOR_STORE_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8')); }
  catch { return []; }
}

function saveStore(docs) {
  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(docs), 'utf-8');
}

function retrieve(queryVec, docs, topK = 5) {
  return docs
    .map(doc => ({ ...doc, score: cosine(queryVec, doc.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ── Ingest documents ─────────────────────────────────────────────────────────

async function ingest(documents) {
  // documents = [{ id, text, metadata }]
  const BATCH = 32;
  const store = loadStore();
  const existingIds = new Set(store.map(d => d.id));

  const newDocs = documents.filter(d => !existingIds.has(d.id));
  if (newDocs.length === 0) { logger.info('[RAG] All documents already indexed'); return store.length; }

  logger.info(`[RAG] Embedding ${newDocs.length} new documents...`);

  for (let i = 0; i < newDocs.length; i += BATCH) {
    const batch = newDocs.slice(i, i + BATCH);
    const texts = batch.map(d => d.text);
    const embeddings = await embed(texts);
    batch.forEach((doc, j) => store.push({ id: doc.id, text: doc.text, metadata: doc.metadata, embedding: embeddings[j] }));
    logger.info(`[RAG] Embedded ${Math.min(i + BATCH, newDocs.length)}/${newDocs.length}`);
  }

  saveStore(store);
  logger.info(`[RAG] Store now has ${store.length} documents`);
  return store.length;
}

// ── Build knowledge base from node catalog ───────────────────────────────────

function buildKnowledgeBase() {
  const registry = require('../nodes/registry');
  const docs = [];

  // 1. Node definitions
  const all = registry.getAll();
  const seen = new Set();
  for (const [type, node] of Object.entries(all)) {
    if (seen.has(node.label)) continue;
    seen.add(node.label);

    const fields = node.configSchema
      ? Object.entries(node.configSchema).map(([k, v]) => `${k} (${v.type}${v.required ? ', required' : ''}): ${v.label || k}`).join(', ')
      : '';

    docs.push({
      id: `node:${type}`,
      text: `Node: ${node.label}\nType: ${type}\nCategory: ${node.category}\nDescription: ${node.description}\nConfig fields: ${fields}`,
      metadata: { type: 'node', nodeType: type, category: node.category }
    });
  }

  // 2. Workflow patterns (hand-crafted examples)
  const patterns = [
    { id: 'pattern:webhook_sms', text: 'Workflow pattern: Receive webhook then send SMS. Use trigger_webhook → twilio_sms. Map trigger.body.phone to "to" and trigger.body.message to "message".', metadata: { type: 'pattern' } },
    { id: 'pattern:webhook_email', text: 'Workflow pattern: Receive webhook then send email. Use trigger_webhook → email_send. Map trigger.body fields to to, subject, body.', metadata: { type: 'pattern' } },
    { id: 'pattern:schedule_api', text: 'Workflow pattern: Run on a schedule and call an API. Use trigger_cron with a cron expression → http_request.', metadata: { type: 'pattern' } },
    { id: 'pattern:ai_classify_route', text: 'Workflow pattern: AI classification with routing. Use trigger_webhook → ai_text_classifier → logic_if to branch on category result.', metadata: { type: 'pattern' } },
    { id: 'pattern:hubspot_lead', text: 'Workflow pattern: CRM lead capture. Use trigger_webhook → hubspot_contact (action: upsert) → slack_message to notify team.', metadata: { type: 'pattern' } },
    { id: 'pattern:ai_summarize_email', text: 'Workflow pattern: Summarize and email. Use trigger_webhook → ai_summarizer → email_send to send AI-generated summaries.', metadata: { type: 'pattern' } },
    { id: 'pattern:loop_email', text: 'Workflow pattern: Loop and email. Use database_query or google_sheets_read → logic_loop → email_send to send personalized bulk emails.', metadata: { type: 'pattern' } },
    { id: 'pattern:monitor_site', text: 'Workflow pattern: Website monitoring. Use trigger_cron → http_request → logic_if (check statusCode != 200) → slack_message to alert on downtime.', metadata: { type: 'pattern' } },
    { id: 'pattern:gpt_webhook', text: 'Workflow pattern: AI chatbot webhook. Use trigger_webhook → openai_chat or anthropic_chat → respond_webhook to return AI replies.', metadata: { type: 'pattern' } },
    { id: 'pattern:deploy_notify', text: 'Workflow pattern: CI/CD deploy and notify. Use trigger_webhook (GitHub webhook) → logic_if (merged) → vercel_deploy → slack_message.', metadata: { type: 'pattern' } },
    { id: 'pattern:stripe_crm', text: 'Workflow pattern: Payment to CRM. Use trigger_webhook (Stripe) → hubspot_create_deal → slack_message to log paid deals.', metadata: { type: 'pattern' } },
    { id: 'pattern:translate_summarize', text: 'Workflow pattern: Translate then summarize. Use trigger_webhook → google_translate → ai_summarizer → respond_webhook.', metadata: { type: 'pattern' } },
    { id: 'pattern:error_handler', text: 'Workflow pattern: Error handling. Connect error_handler node to catch failures. Configure action as continue, retry, or notify.', metadata: { type: 'pattern' } },
    { id: 'pattern:variable_syntax', text: 'Variable syntax: Use {{trigger.body.fieldName}} to access webhook data. Use {{NodeLabel.outputField}} to access previous node output. Use {{$json.field}} for current input.', metadata: { type: 'syntax' } },
    { id: 'pattern:cron_syntax', text: 'Cron expressions: "0 9 * * *" = 9am daily. "*/30 * * * *" = every 30 minutes. "0 9 * * 1-5" = 9am weekdays. "0 0 * * 0" = midnight Sunday.', metadata: { type: 'syntax' } },
    { id: 'pattern:credentials', text: 'Credentials: Add API keys via the Credentials Manager in settings. The node will automatically use stored credentials. Supported: OpenAI, Anthropic, Twilio, HubSpot, Slack, Stripe, GitHub, AWS, Google, etc.', metadata: { type: 'platform' } },
    { id: 'pattern:triggers', text: 'Trigger types: trigger_webhook (HTTP webhook), trigger_cron (scheduled), trigger_manual (button click). All workflows must start with a trigger node.', metadata: { type: 'platform' } },
    { id: 'pattern:logic_branch', text: 'Branching: Use logic_if with field, operator (equals, not_equals, contains, greater_than, less_than, exists, truthy), and value. Connect true and false outputs to different branches.', metadata: { type: 'platform' } },
  ];

  docs.push(...patterns);
  return docs;
}

// ── RAG query ────────────────────────────────────────────────────────────────

async function query(userMessage, conversationHistory = [], mode = 'chat') {
  const store = loadStore();
  if (store.length === 0) throw new Error('RAG store is empty — run /api/rag/ingest first');

  // Embed the query
  const [queryVec] = await embed([userMessage]);

  // Retrieve top-k relevant docs
  const topDocs = retrieve(queryVec, store, 6);
  const context = topDocs.map(d => d.text).join('\n\n---\n\n');

  // Build system prompt based on mode
  const systemPrompt = mode === 'workflow'
    ? `You are Flowa, an AI workflow automation assistant. Using the context below about available nodes and patterns, generate a valid JSON workflow when asked. Always output ONLY valid JSON with this exact structure:
{"nodes": [{"id": "n1", "type": "node_type", "label": "Label", "config": {...}}], "edges": [{"source": "n1", "target": "n2"}]}

Use {{trigger.body.field}} syntax to reference webhook data, and {{NodeLabel.outputField}} for node outputs.

CONTEXT:
${context}`
    : `You are Flowa, a helpful AI assistant for the Flowa workflow automation platform. Use the context below to answer questions about nodes, integrations, and how to build workflows. Be concise and practical.

CONTEXT:
${context}`;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // last 3 turns
    { role: 'user', content: userMessage }
  ];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    temperature: mode === 'workflow' ? 0.2 : 0.7,
    max_tokens: mode === 'workflow' ? 2048 : 1024,
  });

  const response = completion.choices[0].message.content;

  return {
    response,
    sources: topDocs.map(d => ({ id: d.id, score: d.score, metadata: d.metadata })),
    model: 'llama-3.1-8b-instant',
    mode
  };
}

module.exports = { ingest, buildKnowledgeBase, query, loadStore };

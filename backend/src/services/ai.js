'use strict';

const Groq = require('groq-sdk');
const logger = require('../utils/logger');
const { loadStore, retrieve } = require('./rag');

// ── Single Groq client ───────────────────────────────────────────────────────

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set in .env');
  return new Groq({ apiKey: key });
}

// ── Context retrieval using rag.js hybrid BM25+lexical+intent scoring ────────

function retrieveContext(queryText, topK = 6) {
  const store = loadStore();
  if (!store.length) return '';
  return retrieve(queryText, store, topK)
    .map((doc) => `[${doc.id} | score ${doc.score}]\n${doc.text}`)
    .join('\n\n---\n\n');
}

// ── Core LLM call ────────────────────────────────────────────────────────────

async function llm(messages, { temperature = 0.4, maxTokens = 2048, json = false } = {}) {
  const groq = getGroq();
  const params = {
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (json) params.response_format = { type: 'json_object' };
  const res = await groq.chat.completions.create(params);
  return res.choices[0].message.content;
}

// ── Extract JSON from LLM response safely ────────────────────────────────────

function extractJson(text) {
  // Try direct parse
  try { return JSON.parse(text); } catch {}
  // Find first {...} or [...]
  const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ── Node catalog summary (for prompts) ───────────────────────────────────────

function nodeCatalogSummary() {
  try {
    const registry = require('../nodes/registry');
    const all = registry.getAll();
    const seen = new Set();
    const lines = [];
    for (const [type, node] of Object.entries(all)) {
      if (seen.has(node.label)) continue;
      seen.add(node.label);
      lines.push(`${type}: ${node.label} (${node.category}) — ${node.description}`);
    }
    return lines.join('\n');
  } catch { return ''; }
}

// ════════════════════════════════════════════════════════════════════════════
//  1. GENERATE WORKFLOW
// ════════════════════════════════════════════════════════════════════════════

async function generateWorkflow(prompt) {
  if (!prompt || prompt.trim().length < 3) {
    return { type: 'invalid_input', success: false, error: 'Prompt too short' };
  }

  const context = retrieveContext(prompt, 8);
  const catalog = nodeCatalogSummary();

  const system = `You are Fluxion's workflow generation engine. Output a valid workflow JSON for the user's automation request.

RETURN ONLY JSON — no markdown, no explanation. Start your response with {

OUTPUT SHAPE:
{
  "nodes": [
    {"id":"n1","type":"trigger_webhook","label":"Webhook Trigger","data":{"label":"Webhook Trigger","config":{"method":"POST","path":"/hook"}}},
    {"id":"n2","type":"slack_send","label":"Notify Slack","data":{"label":"Notify Slack","config":{"channel":"#general","text":"{{trigger.body.message}}"}}}
  ],
  "edges": [{"id":"e1","source":"n1","target":"n2"}]
}

RULES:
1. MUST start with a trigger: trigger_webhook, trigger_cron, or trigger_manual.
2. Use EXACT node types from AVAILABLE NODES below — do not invent types.
3. Variable syntax: {{trigger.body.field}} for webhook data, {{NodeLabel.outputField}} for prior node output, {{$json.field}} inside loop_for_each.
4. Cron: "0 9 * * *"=daily 9am, "*/5 * * * *"=every 5min, "0 9 * * 1-5"=weekdays.
5. Each node needs: id (n1,n2…), type, label, data.label, data.config.
6. Each edge needs: id (e1,e2…), source, target — both must match existing node ids.
7. Include realistic config placeholders. Keep the workflow focused on what was asked.

AVAILABLE NODES:
${catalog}

RETRIEVED CONTEXT (patterns and examples to follow):
${context}`;

  try {
    const raw = await llm(
      [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 3000, json: true }
    );

    const graph = extractJson(raw);
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      return { type: 'invalid_input', success: false, error: 'Could not generate a valid workflow for that prompt. Try being more specific.' };
    }

    // Ensure position, data.label, and edge ids are present
    graph.nodes = graph.nodes.map((n, i) => ({
      ...n,
      position: n.position || { x: 250 + (i % 3) * 300, y: Math.floor(i / 3) * 180 + 100 },
      data: { ...(n.data || {}), label: n.label || n.data?.label || n.type, config: n.data?.config || n.config || {} }
    }));
    graph.edges = graph.edges.map((e, i) => ({
      ...e,
      id: e.id || `e${i + 1}`,
    }));

    return {
      type: 'workflow_generated',
      success: true,
      graph,
      model: 'llama-3.3-70b-versatile (Groq)',
      tokensUsed: 0,
      description: `Generated workflow for: ${prompt}`
    };
  } catch (err) {
    logger.error('[AI] generateWorkflow error:', err.message);
    return { type: 'error', success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  2. WORKFLOW CHAT (assistant panel)
// ════════════════════════════════════════════════════════════════════════════

async function workflowChat({ message, history = [], workflow = { nodes: [], edges: [] }, pendingAction = null }) {
  const context = retrieveContext(message, 6);

  const nodeList = (workflow.nodes || [])
    .map(n => `- ${n.data?.label || n.label || n.id} (${n.type || n.data?.type})`)
    .join('\n') || 'No nodes yet';

  const system = `You are Freckles, the AI assistant inside Fluxion workflow automation platform.

CURRENT WORKFLOW NODES:
${nodeList}

PLATFORM KNOWLEDGE:
${context}

You can:
1. Answer questions about nodes, integrations, and how to build workflows
2. Suggest nodes to add (respond with messageType "add_node_suggestion")
3. Edit the workflow JSON when asked (respond with an updatedWorkflow)
4. Explain errors and debug issues

RESPONSE FORMAT (always valid JSON):
{
  "reply": "Your conversational response here",
  "messageType": "message" | "workflow_update" | "add_node_suggestion",
  "updatedWorkflow": null | { "nodes": [...], "edges": [...] },
  "suggestions": ["quick reply 1", "quick reply 2"],
  "metadata": {}
}`;

  const messages = [
    { role: 'system', content: system },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const raw = await llm(messages, { temperature: 0.5, maxTokens: 1500, json: true });
    const parsed = extractJson(raw);

    if (!parsed) {
      return { reply: raw, messageType: 'message', updatedWorkflow: null, suggestions: [], metadata: {} };
    }

    let updatedWorkflow = parsed.updatedWorkflow || null;
    if (updatedWorkflow?.nodes) {
      updatedWorkflow.nodes = updatedWorkflow.nodes.map((n, i) => ({
        ...n,
        position: n.position || { x: 250 + (i % 3) * 300, y: Math.floor(i / 3) * 180 + 100 },
        data: { ...(n.data || {}), label: n.label || n.data?.label || n.type, config: n.data?.config || n.config || {} }
      }));
      updatedWorkflow.edges = (updatedWorkflow.edges || []).map((e, i) => ({ ...e, id: e.id || `e${i + 1}` }));
    }

    return {
      reply: parsed.reply || raw,
      messageType: parsed.messageType || 'message',
      updatedWorkflow,
      suggestions: parsed.suggestions || [],
      metadata: parsed.metadata || {}
    };
  } catch (err) {
    logger.error('[AI] workflowChat error:', err.message);
    return { reply: 'Sorry, something went wrong. Please try again.', messageType: 'message', updatedWorkflow: null, suggestions: [], metadata: {} };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  3. EXPLAIN ERROR
// ════════════════════════════════════════════════════════════════════════════

async function explainError(execution, failedLogs) {
  const errorSummary = failedLogs.map(l =>
    `Node: ${l.node_label} (${l.node_type})\nError: ${l.error}\nInput: ${JSON.stringify(l.input || {}).slice(0, 300)}`
  ).join('\n\n');

  const system = `You are a workflow debugging assistant for Fluxion. Explain the error clearly and provide actionable fix steps.

Respond with JSON:
{
  "summary": "One-line summary of what went wrong",
  "explanation": "Detailed explanation",
  "fixes": ["Step 1", "Step 2"],
  "rootCause": "The root cause in one sentence"
}`;

  try {
    const raw = await llm([
      { role: 'system', content: system },
      { role: 'user', content: `Workflow execution failed.\n\nFailed nodes:\n${errorSummary}` }
    ], { temperature: 0.3, maxTokens: 800, json: true });

    return extractJson(raw) || { summary: 'Execution failed', explanation: raw, fixes: [], rootCause: 'Unknown' };
  } catch (err) {
    return { summary: 'Could not explain error', explanation: err.message, fixes: [], rootCause: 'Unknown' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  4. DEBUG NODE
// ════════════════════════════════════════════════════════════════════════════

async function debugNode({ nodeType, nodeLabel, config, error, input, configSchema }) {
  const context = retrieveContext(`${nodeType} ${error}`, 3);

  const system = `You are a Fluxion node debugger. Diagnose why a node failed and provide exact config fixes.

Respond with JSON:
{
  "diagnosis": "What went wrong",
  "fix": "How to fix it",
  "configChanges": {"fieldName": "correctedValue"},
  "explanation": "Why this fix works"
}`;

  try {
    const raw = await llm([
      { role: 'system', content: system },
      { role: 'user', content: `Node: ${nodeLabel} (${nodeType})\nError: ${error}\nCurrent config: ${JSON.stringify(config || {}).slice(0, 400)}\n\nRelevant docs:\n${context}` }
    ], { temperature: 0.2, maxTokens: 600, json: true });

    return { ...extractJson(raw), model: 'llama-3.3-70b-versatile', tokensUsed: 0 }
      || { diagnosis: 'Could not diagnose', fix: error, configChanges: {}, explanation: '' };
  } catch (err) {
    return { diagnosis: 'Debug failed', fix: err.message, configChanges: {}, explanation: '' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  5. SUGGEST NODES
// ════════════════════════════════════════════════════════════════════════════

async function suggestNodes(graph) {
  const nodeList = (graph.nodes || []).map(n => n.type || n.data?.type).join(', ');
  const context = retrieveContext(`next node after ${nodeList}`, 4);

  const system = `You are a Fluxion workflow advisor. Given the current workflow nodes, suggest what nodes to add next.

Respond with JSON array:
[{"type": "node_type", "label": "Display name", "reason": "Why this node makes sense here"}]`;

  try {
    const raw = await llm([
      { role: 'system', content: system },
      { role: 'user', content: `Current nodes: ${nodeList}\n\nContext:\n${context}\n\nSuggest 3 next nodes.` }
    ], { temperature: 0.5, maxTokens: 500, json: true });

    const parsed = extractJson(raw);
    return Array.isArray(parsed) ? parsed : (parsed?.suggestions || []);
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  6. COMPILE WORKFLOW (static analysis — no LLM needed)
// ════════════════════════════════════════════════════════════════════════════

function compileWorkflow(workflow) {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const issues = [];
  const warnings = [];

  const hasTrigger = nodes.some(n => {
    const t = n.type || n.data?.type || '';
    return t.includes('trigger') || t.includes('webhook') || t.includes('cron') || t.includes('manual');
  });
  if (!hasTrigger) issues.push({ type: 'error', msg: 'Workflow has no trigger node — add a Webhook, Schedule, or Manual trigger.' });

  const isolated = nodes.filter(n => !edges.some(e => e.source === n.id || e.target === n.id));
  isolated.forEach(n => warnings.push({ type: 'warning', msg: `Node "${n.data?.label || n.id}" is disconnected.` }));

  const score = Math.max(0, 100 - issues.length * 30 - warnings.length * 10);

  return {
    status: issues.length ? 'blocked' : warnings.length ? 'review' : 'ready',
    readinessScore: score,
    issues,
    warnings,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    releaseChecklist: [
      hasTrigger ? '✅ Trigger node present' : '❌ Add a trigger node',
      isolated.length === 0 ? '✅ All nodes connected' : `⚠️ ${isolated.length} disconnected node(s)`,
      nodes.length >= 2 ? '✅ Workflow has multiple steps' : '⚠️ Consider adding more nodes',
    ]
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  7. DOCUMENT WORKFLOW
// ════════════════════════════════════════════════════════════════════════════

async function documentWorkflow(workflow) {
  const nodeList = (workflow.nodes || [])
    .map(n => `${n.data?.label || n.id} (${n.type || n.data?.type})`)
    .join(' → ');

  try {
    const raw = await llm([
      { role: 'system', content: 'You are a technical writer. Document this workflow clearly and concisely. Respond with JSON: {"title": "...", "description": "...", "steps": ["..."], "useCases": ["..."]}' },
      { role: 'user', content: `Document this workflow:\n${nodeList}` }
    ], { temperature: 0.4, maxTokens: 600, json: true });

    return extractJson(raw) || { title: 'Workflow', description: nodeList, steps: [], useCases: [] };
  } catch (err) {
    return { title: 'Workflow', description: nodeList, steps: [], useCases: [] };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  8. GENERATE DESCRIPTION
// ════════════════════════════════════════════════════════════════════════════

async function generateDescription({ name, nodes = [], edges = [] }) {
  const nodeList = nodes.map(n => n.data?.label || n.type).join(', ');
  try {
    const raw = await llm([
      { role: 'system', content: 'Generate a short 1-2 sentence workflow description. Respond with JSON: {"description": "..."}' },
      { role: 'user', content: `Workflow: "${name}"\nNodes: ${nodeList || 'none'}` }
    ], { temperature: 0.5, maxTokens: 150, json: true });

    const parsed = extractJson(raw);
    return { description: parsed?.description || name };
  } catch {
    return { description: name };
  }
}

module.exports = {
  generateWorkflow,
  workflowChat,
  explainError,
  debugNode,
  suggestNodes,
  compileWorkflow,
  documentWorkflow,
  generateDescription,
};

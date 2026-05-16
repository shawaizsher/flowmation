const express = require('express');
const { query } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const aiService = require('../services/ai');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireWorkspace);

// ── POST /api/workspaces/:wid/ai/generate-workflow ──
router.post('/generate-workflow', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // generateWorkflow now returns a structured object — never throws
    const result = await aiService.generateWorkflow(prompt);

    // Unsafe operations → 422
    if (result.type === 'unsafe_request') {
      return res.status(422).json(result);
    }

    // Truly invalid input (gibberish, greetings, etc.) → 400
    if (result.type === 'invalid_input' || result.type === 'invalid_prompt') {
      return res.status(400).json(result);
    }

    // All other cases (workflow_generated — including medium with needsClarification) → 200

    // Success — log the generation (non-critical, don't fail the request)
    try {
      await query(
        `INSERT INTO ai_generations (workspace_id, user_id, type, prompt, result, model, tokens_used)
         VALUES ($1, $2, 'generate-workflow', $3, $4, $5, $6)`,
        [req.workspaceId, req.user.id, prompt, JSON.stringify(result.graph),
         result.model || 'deterministic', result.tokensUsed || 0]
      );
    } catch (logErr) {
      logger.warn('[ai] Failed to log generation:', logErr.message);
    }

    res.json(result);
  } catch (err) {
    logger.error('AI generate workflow error:', err);
    res.status(500).json({ error: 'Failed to generate workflow' });
  }
});

// ── POST /api/workspaces/:wid/ai/explain-error ──
router.post('/explain-error', async (req, res) => {
  try {
    const { executionId } = req.body;

    if (!executionId) {
      return res.status(400).json({ error: 'Execution ID is required' });
    }

    // Get execution + failed node logs
    const execResult = await query(
      'SELECT * FROM executions WHERE id = $1 AND workspace_id = $2',
      [executionId, req.workspaceId]
    );

    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const logsResult = await query(
      "SELECT * FROM node_logs WHERE execution_id = $1 AND status = 'failed' ORDER BY started_at ASC",
      [executionId]
    );

    const explanation = await aiService.explainError(
      execResult.rows[0],
      logsResult.rows
    );

    res.json(explanation);
  } catch (err) {
    logger.error('AI explain error:', err);
    res.status(500).json({ error: 'Failed to explain error' });
  }
});

// ── POST /api/workspaces/:wid/ai/debug-node ──
router.post('/debug-node', async (req, res) => {
  try {
    const { nodeLogId } = req.body;

    if (!nodeLogId) {
      return res.status(400).json({ error: 'Node log ID is required' });
    }

    // Get the failed node log
    const logResult = await query(
      `SELECT nl.*, e.workflow_id
       FROM node_logs nl
       JOIN executions e ON nl.execution_id = e.id
       WHERE nl.id = $1`,
      [nodeLogId]
    );

    if (logResult.rows.length === 0) {
      return res.status(404).json({ error: 'Node log not found' });
    }

    const nodeLog = logResult.rows[0];

    // Get node's config schema from registry
    const registry = require('../nodes/registry');
    const nodeType = registry.get(nodeLog.node_type);
    const configSchema = nodeType ? nodeType.configSchema : {};

    const diagnosis = await aiService.debugNode({
      nodeType: nodeLog.node_type,
      nodeLabel: nodeLog.node_label,
      config: nodeLog.input,
      error: nodeLog.error,
      input: nodeLog.input,
      configSchema
    });

    // Log the AI generation
    await query(
      `INSERT INTO ai_generations (workspace_id, user_id, type, prompt, result, model, tokens_used)
       VALUES ($1, $2, 'debug-node', $3, $4, $5, $6)`,
      [req.workspaceId, req.user.id,
       JSON.stringify({ nodeLogId, nodeType: nodeLog.node_type, error: nodeLog.error }),
       JSON.stringify(diagnosis), diagnosis.model || 'claude', diagnosis.tokensUsed || 0]
    );

    res.json(diagnosis);
  } catch (err) {
    logger.error('AI debug node error:', err);
    res.status(500).json({ error: 'Failed to debug node' });
  }
});

// ── POST /api/workspaces/:wid/ai/apply-fix ──
router.post('/apply-fix', async (req, res) => {
  try {
    const { workflowId, nodeId, changes } = req.body;

    if (!workflowId || !nodeId || !changes) {
      return res.status(400).json({ error: 'workflowId, nodeId, and changes are required' });
    }

    // Get the workflow
    const wfResult = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [workflowId, req.workspaceId]
    );

    if (wfResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = wfResult.rows[0];
    const graph = typeof workflow.graph === 'string' ? JSON.parse(workflow.graph) : workflow.graph;

    // Find the node and patch its config
    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return res.status(404).json({ error: 'Node not found in workflow graph' });
    }

    // Apply changes to node config
    const node = graph.nodes[nodeIndex];
    node.data = node.data || {};
    node.data.config = node.data.config || {};
    Object.assign(node.data.config, changes);
    graph.nodes[nodeIndex] = node;

    // Save with version bump
    const { transaction } = require('../db');
    const result = await transaction(async (client) => {
      // Snapshot current version
      await client.query(
        `IF NOT EXISTS (SELECT 1 FROM workflow_versions WHERE workflow_id = $1 AND version = $2)
         BEGIN
           INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
           VALUES ($1, $2, $3, $4, $5, 1, $6)
         END`,
        [workflow.id, workflow.version, JSON.stringify(workflow.graph),
         'Before AI fix', 'Auto-save before AI Debugger fix', req.user.id]
      );

      const newVersion = workflow.version + 1;
      const updated = await client.query(
        `UPDATE workflows SET graph = $1, version = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [JSON.stringify(graph), newVersion, workflow.id]
      );

      // Record the fix version
      await client.query(
        `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
         VALUES ($1, $2, $3, $4, $5, 1, $6)`,
        [workflow.id, newVersion, JSON.stringify(graph),
         'AI Debugger fix', `AI fixed node ${nodeId}`, req.user.id]
      );

      return updated.rows[0];
    });

    // Broadcast
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(workflowId, {
        type: 'workflow_saved',
        workflowId,
        savedBy: 'AI Debugger',
        version: result.version
      });
    } catch (e) { /* non-critical */ }

    logger.info(`AI fix applied to node ${nodeId} in workflow ${workflowId}`);
    res.json({ workflow: result });
  } catch (err) {
    logger.error('AI apply fix error:', err);
    res.status(500).json({ error: 'Failed to apply fix' });
  }
});

// ── POST /api/workspaces/:wid/ai/suggest-nodes ──
router.post('/suggest-nodes', async (req, res) => {
  try {
    const { graph } = req.body;

    if (!graph) {
      return res.status(400).json({ error: 'Graph is required' });
    }

    const suggestions = await aiService.suggestNodes(graph);
    res.json({ suggestions });
  } catch (err) {
    logger.error('AI suggest nodes error:', err);
    res.status(500).json({ error: 'Failed to suggest nodes' });
  }
});

// ── POST /api/workspaces/:wid/ai/chat ──
// POST /api/workspaces/:wid/ai/compile-workflow
router.post('/compile-workflow', async (req, res) => {
  try {
    const { workflow } = req.body;

    if (!workflow) {
      return res.status(400).json({ error: 'workflow is required' });
    }

    res.json({ compile: aiService.compileWorkflow(workflow) });
  } catch (err) {
    logger.error('AI compile workflow error:', err);
    res.status(500).json({ error: 'Failed to compile workflow' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history, workflow } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await aiService.workflowChat({
      message,
      history: Array.isArray(history) ? history : [],
      workflow: workflow || { nodes: [], edges: [] },
    });

    res.json(result);
  } catch (err) {
    logger.error('AI chat error:', err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

// ── POST /api/workspaces/:wid/ai/document-workflow ──
router.post('/document-workflow', async (req, res) => {
  try {
    const { workflow } = req.body;

    if (!workflow) {
      return res.status(400).json({ error: 'Workflow is required' });
    }

    const documentation = await aiService.documentWorkflow(workflow);
    res.json(documentation);
  } catch (err) {
    logger.error('AI document workflow error:', err);
    res.status(500).json({ error: 'Failed to document workflow' });
  }
});

module.exports = router;

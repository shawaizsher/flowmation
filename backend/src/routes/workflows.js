const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// All routes require authentication + workspace membership
router.use(authenticate, requireWorkspace);

// ── GET /api/workspaces/:wid/workflows ──
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT w.*, u.name as created_by_name
      FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.workspace_id = $1
    `;
    const params = [req.workspaceId];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (w.name LIKE $${params.length} OR w.description LIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      sql += ` AND w.status = $${params.length}`;
    }

    sql += ' ORDER BY w.updated_at DESC';

    const result = await query(sql, params);
    res.json({ workflows: result.rows });
  } catch (err) {
    logger.error('List workflows error:', err);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

// ── POST /api/workspaces/:wid/workflows ──
router.post('/', async (req, res) => {
  try {
    const { name, description, graph } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, created_by)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.workspaceId,
        name,
        description || '',
        JSON.stringify(graph || { nodes: [], edges: [] }),
        req.user.id
      ]
    );

    logger.info(`Workflow created: ${result.rows[0].id} by ${req.user.email}`);
    res.status(201).json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Create workflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id ──
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT w.*, u.name as created_by_name
       FROM workflows w
       LEFT JOIN users u ON w.created_by = u.id
       WHERE w.id = $1 AND w.workspace_id = $2`,
      [req.params.id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Get workflow error:', err);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// ── PUT /api/workspaces/:wid/workflows/:id ──
router.put('/:id', async (req, res) => {
  try {
    const { name, description, graph, status, tags } = req.body;

    // Fetch existing workflow
    const existing = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = existing.rows[0];

    const result = await transaction(async (client) => {
      // Snapshot current version before update
      if (graph && JSON.stringify(graph) !== JSON.stringify(workflow.graph)) {
        await client.query(
          `IF NOT EXISTS (SELECT 1 FROM workflow_versions WHERE workflow_id = $1 AND version = $2)
           BEGIN
             INSERT INTO workflow_versions (workflow_id, version, graph, created_by)
             VALUES ($1, $2, $3, $4)
           END`,
          [workflow.id, workflow.version, JSON.stringify(workflow.graph), req.user.id]
        );
      }

      const newVersion = graph ? workflow.version + 1 : workflow.version;

      const updated = await client.query(
        `UPDATE workflows
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             graph = COALESCE($3, graph),
             status = COALESCE($4, status),
             tags = COALESCE($5, tags),
             version = $6,
             updated_at = GETDATE()
         OUTPUT INSERTED.*
         WHERE id = $7 AND workspace_id = $8`,
        [
          name || null,
          description !== undefined ? description : null,
          graph ? JSON.stringify(graph) : null,
          status || null,
          tags || null,
          newVersion,
          req.params.id,
          req.workspaceId
        ]
      );

      return updated.rows[0];
    });

    // Broadcast save event via WebSocket
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_saved',
        workflowId: req.params.id,
        savedBy: req.user.name,
        version: result.version
      });
    } catch (e) {
      // WebSocket broadcast is non-critical
    }

    res.json({ workflow: result });
  } catch (err) {
    logger.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ── DELETE /api/workspaces/:wid/workflows/:id ──
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM workflows OUTPUT DELETED.id WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    logger.info(`Workflow deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete workflow error:', err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/duplicate ──
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const wf = original.rows[0];
    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, tags, created_by)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.workspaceId,
        `${wf.name} (copy)`,
        wf.description,
        JSON.stringify(wf.graph),
        wf.tags,
        req.user.id
      ]
    );

    logger.info(`Workflow duplicated: ${wf.id} → ${result.rows[0].id}`);
    res.status(201).json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Duplicate workflow error:', err);
    res.status(500).json({ error: 'Failed to duplicate workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/execute ──
router.post('/:id/execute', async (req, res) => {
  try {
    const workflow = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (workflow.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { addExecutionJob } = require('../services/queue');
    const executionId = await addExecutionJob({
      workflowId: req.params.id,
      workspaceId: req.workspaceId,
      triggerType: 'manual',
      triggerPayload: req.body.payload || {},
      credentials: req.body.credentials || {}
    });

    res.json({ executionId });
  } catch (err) {
    logger.error('Execute workflow error:', err);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id/presence ──
router.get('/:id/presence', async (req, res) => {
  try {
    const result = await query(
      `SELECT we.user_id, u.name, u.email, we.last_seen
       FROM workflow_editors we
       JOIN users u ON we.user_id = u.id
       WHERE we.workflow_id = $1 AND we.last_seen > DATEADD(minute, -5, GETDATE())`,
      [req.params.id]
    );

    res.json({ editors: result.rows });
  } catch (err) {
    logger.error('Get presence error:', err);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

module.exports = router;

const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// All routes require authentication + workspace membership
router.use(authenticate, requireWorkspace);

// ── GET /api/workspaces/:wid/workflows/members ──
router.get('/members', async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, wm.role
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1 AND u.is_active = 1
       ORDER BY CASE WHEN wm.user_id = $2 THEN 0 ELSE 1 END, u.name ASC`,
      [req.workspaceId, req.user.id]
    );

    const members = result.rows.map((m) => ({
      ...m,
      isCurrentUser: m.id === req.user.id,
    }));

    res.json({ members });
  } catch (err) {
    logger.error('List workspace members error:', err);
    res.status(500).json({ error: 'Failed to load workspace members' });
  }
});

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
    const { name, description, graph, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).slice(0, 100)
      : [];

    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, tags, created_by)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.workspaceId,
        name,
        description || '',
        JSON.stringify(graph || { nodes: [], edges: [] }),
        JSON.stringify(normalizedTags),
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

    // Save is now a draft-only operation — no version bump, no snapshot.
    // Use POST /:id/publish to create a versioned release.
    const result = await query(
      `UPDATE workflows
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           graph = COALESCE($3, graph),
           status = COALESCE($4, status),
           tags = COALESCE($5, tags),
           updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = $6 AND workspace_id = $7`,
      [
        name || null,
        description !== undefined ? description : null,
        graph ? JSON.stringify(graph) : null,
        status || null,
        tags || null,
        req.params.id,
        req.workspaceId
      ]
    );

    const updatedWorkflow = result.rows[0];

    // Broadcast save event via WebSocket
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_saved',
        workflowId: req.params.id,
        savedBy: req.user.name,
        version: updatedWorkflow.version
      });
    } catch (e) {
      // WebSocket broadcast is non-critical
    }

    res.json({ workflow: updatedWorkflow });
  } catch (err) {
    logger.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/publish ──
// Publishes the current draft as a new named version
router.post('/:id/publish', async (req, res) => {
  try {
    const { label, message } = req.body;

    const existing = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = existing.rows[0];
    const newVersion = workflow.version + 1;

    const result = await transaction(async (client) => {
      // Snapshot current graph as the new published version
      await client.query(
        `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
         VALUES ($1, $2, $3, $4, $5, 1, $6)`,
        [
          workflow.id,
          newVersion,
          JSON.stringify(workflow.graph),
          label || `v${newVersion}`,
          message || '',
          req.user.id
        ]
      );

      // Bump the workflow version number
      const updated = await client.query(
        `UPDATE workflows SET version = $1, updated_at = GETDATE()
         OUTPUT INSERTED.*
         WHERE id = $2`,
        [newVersion, workflow.id]
      );

      return updated.rows[0];
    });

    // Broadcast publish event
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_published',
        workflowId: req.params.id,
        publishedBy: req.user.name,
        version: newVersion,
        label: label || `v${newVersion}`
      });
    } catch (e) { /* non-critical */ }

    logger.info(`Workflow ${req.params.id} published as v${newVersion} by ${req.user.email}`);
    res.json({ workflow: result, version: newVersion });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Version already exists — save and try again' });
    }
    logger.error('Publish workflow error:', err);
    res.status(500).json({ error: 'Failed to publish workflow' });
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
    const executionPayload = req.body.payload ?? req.body.inputData ?? {};

    const executionId = await addExecutionJob({
      workflowId: req.params.id,
      workspaceId: req.workspaceId,
      triggerType: 'manual',
      triggerPayload: executionPayload,
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

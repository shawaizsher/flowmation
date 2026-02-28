const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireWorkspace);

// ── GET /api/workspaces/:wid/workflows/:id/versions ──
router.get('/:id/versions', async (req, res) => {
  try {
    const result = await query(
      `SELECT wv.*, u.name as created_by_name
       FROM workflow_versions wv
       LEFT JOIN users u ON wv.created_by = u.id
       WHERE wv.workflow_id = $1
       ORDER BY wv.version DESC`,
      [req.params.id]
    );

    // Also include current live version
    const current = await query(
      'SELECT version, graph, updated_at FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    res.json({
      versions: result.rows,
      current: current.rows[0] || null
    });
  } catch (err) {
    logger.error('List versions error:', err);
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/versions (create named checkpoint) ──
router.post('/:id/versions', async (req, res) => {
  try {
    const { label, message } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Version label is required' });
    }

    const workflow = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (workflow.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const wf = workflow.rows[0];

    const result = await query(
      `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [wf.id, wf.version, JSON.stringify(wf.graph), label, message || '', req.user.id]
    );

    logger.info(`Named checkpoint created for workflow ${wf.id}: v${wf.version} "${label}"`);
    res.status(201).json({ version: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Version already exists' });
    }
    logger.error('Create version error:', err);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id/versions/:v ──
router.get('/:id/versions/:v', async (req, res) => {
  try {
    const result = await query(
      `SELECT wv.*, u.name as created_by_name
       FROM workflow_versions wv
       LEFT JOIN users u ON wv.created_by = u.id
       WHERE wv.workflow_id = $1 AND wv.version = $2`,
      [req.params.id, parseInt(req.params.v)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version: result.rows[0] });
  } catch (err) {
    logger.error('Get version error:', err);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id/versions/:a/diff/:b ──
router.get('/:id/versions/:a/diff/:b', async (req, res) => {
  try {
    const versionA = parseInt(req.params.a);
    const versionB = parseInt(req.params.b);

    const [resultA, resultB] = await Promise.all([
      query('SELECT graph FROM workflow_versions WHERE workflow_id = $1 AND version = $2',
        [req.params.id, versionA]),
      query('SELECT graph FROM workflow_versions WHERE workflow_id = $1 AND version = $2',
        [req.params.id, versionB])
    ]);

    if (resultA.rows.length === 0 || resultB.rows.length === 0) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    const graphA = resultA.rows[0].graph;
    const graphB = resultB.rows[0].graph;

    // Diff nodes
    const nodesA = new Map((graphA.nodes || []).map(n => [n.id, n]));
    const nodesB = new Map((graphB.nodes || []).map(n => [n.id, n]));

    const added = [];
    const removed = [];
    const modified = [];

    for (const [id, node] of nodesB) {
      if (!nodesA.has(id)) {
        added.push(node);
      } else {
        const oldNode = nodesA.get(id);
        if (JSON.stringify(oldNode) !== JSON.stringify(node)) {
          modified.push({ old: oldNode, new: node });
        }
      }
    }

    for (const [id, node] of nodesA) {
      if (!nodesB.has(id)) {
        removed.push(node);
      }
    }

    // Diff edges
    const edgesA = new Set((graphA.edges || []).map(e => JSON.stringify(e)));
    const edgesB = new Set((graphB.edges || []).map(e => JSON.stringify(e)));

    const addedEdges = [...edgesB].filter(e => !edgesA.has(e)).map(e => JSON.parse(e));
    const removedEdges = [...edgesA].filter(e => !edgesB.has(e)).map(e => JSON.parse(e));

    res.json({
      versionA,
      versionB,
      diff: {
        nodes: { added, removed, modified },
        edges: { added: addedEdges, removed: removedEdges }
      }
    });
  } catch (err) {
    logger.error('Diff versions error:', err);
    res.status(500).json({ error: 'Failed to diff versions' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/versions/:v/restore ──
router.post('/:id/versions/:v/restore', async (req, res) => {
  try {
    const targetVersion = parseInt(req.params.v);

    const result = await transaction(async (client) => {
      // Get current workflow
      const current = await client.query(
        'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
        [req.params.id, req.workspaceId]
      );

      if (current.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      const workflow = current.rows[0];

      // Get target version
      const target = await client.query(
        'SELECT graph FROM workflow_versions WHERE workflow_id = $1 AND version = $2',
        [req.params.id, targetVersion]
      );

      if (target.rows.length === 0) {
        throw new Error('Target version not found');
      }

      // Save current state as auto-checkpoint
      await client.query(
        `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
         VALUES ($1, $2, $3, $4, $5, false, $6)
         ON CONFLICT (workflow_id, version) DO NOTHING`,
        [workflow.id, workflow.version, JSON.stringify(workflow.graph),
         `Auto-save before restore to v${targetVersion}`, 'Auto-checkpoint before restore', req.user.id]
      );

      // Apply restored graph and bump version
      const newVersion = workflow.version + 1;
      const updated = await client.query(
        `UPDATE workflows SET graph = $1, version = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [JSON.stringify(target.rows[0].graph), newVersion, workflow.id]
      );

      // Record the restore as a named version
      await client.query(
        `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [workflow.id, newVersion, JSON.stringify(target.rows[0].graph),
         `Restored from v${targetVersion}`, `Restored by ${req.user.name}`, req.user.id]
      );

      return updated.rows[0];
    });

    // Broadcast to collaborators
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_saved',
        workflowId: req.params.id,
        savedBy: req.user.name,
        version: result.version
      });
    } catch (e) {
      // Non-critical
    }

    logger.info(`Workflow ${req.params.id} restored to v${targetVersion} by ${req.user.email}`);
    res.json({ workflow: result });
  } catch (err) {
    logger.error('Restore version error:', err);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message || 'Failed to restore version' });
  }
});

module.exports = router;

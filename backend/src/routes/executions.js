const express = require('express');
const { query } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireWorkspace);

// ── GET /api/workspaces/:wid/executions ──
router.get('/', async (req, res) => {
  try {
    const { workflowId, status, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT e.*, w.name as workflow_name
      FROM executions e
      JOIN workflows w ON e.workflow_id = w.id
      WHERE e.workspace_id = $1
    `;
    const params = [req.workspaceId];

    if (workflowId) {
      params.push(workflowId);
      sql += ` AND e.workflow_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    sql += ' ORDER BY e.created_at DESC';
    params.push(parseInt(limit));
    sql += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM executions WHERE workspace_id = $1';
    const countParams = [req.workspaceId];
    if (workflowId) {
      countParams.push(workflowId);
      countSql += ` AND workflow_id = $${countParams.length}`;
    }
    if (status) {
      countParams.push(status);
      countSql += ` AND status = $${countParams.length}`;
    }
    const countResult = await query(countSql, countParams);

    res.json({
      executions: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    logger.error('List executions error:', err);
    res.status(500).json({ error: 'Failed to list executions' });
  }
});

// ── GET /api/workspaces/:wid/executions/:id ──
router.get('/:id', async (req, res) => {
  try {
    const execResult = await query(
      `SELECT e.*, w.name as workflow_name
       FROM executions e
       JOIN workflows w ON e.workflow_id = w.id
       WHERE e.id = $1 AND e.workspace_id = $2`,
      [req.params.id, req.workspaceId]
    );

    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const logsResult = await query(
      'SELECT * FROM node_logs WHERE execution_id = $1 ORDER BY started_at ASC',
      [req.params.id]
    );

    res.json({
      execution: execResult.rows[0],
      nodeLogs: logsResult.rows
    });
  } catch (err) {
    logger.error('Get execution error:', err);
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

// ── DELETE /api/workspaces/:wid/executions/:id (cancel) ──
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE executions
       SET status = 'cancelled', finished_at = GETDATE()
       OUTPUT INSERTED.id
       WHERE id = $1 AND workspace_id = $2 AND status IN ('pending', 'running')`,
      [req.params.id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found or already finished' });
    }

    logger.info(`Execution cancelled: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Cancel execution error:', err);
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

module.exports = router;

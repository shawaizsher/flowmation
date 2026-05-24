'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/approve/:token?action=approve|reject&comment=...
// Called from email links — no auth required (token acts as secret)
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const action = req.query.action === 'reject' ? 'rejected' : 'approved';
  const comment = req.query.comment || '';

  try {
    const existing = await query('SELECT id, status FROM workflow_approvals WHERE token=$1', [token]);
    if (!existing.rows.length) {
      return res.status(404).send('<h2>Approval link not found or expired.</h2>');
    }
    if (existing.rows[0].status !== 'pending') {
      return res.send(`<h2>This request was already ${existing.rows[0].status}.</h2>`);
    }

    await query(
      `UPDATE workflow_approvals SET status=$1, comment=$2, resolved_at=NOW() WHERE token=$3`,
      [action, comment, token]
    );

    const emoji = action === 'approved' ? '✅' : '❌';
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h1>${emoji} Request ${action}</h1>
      <p>You can close this tab.</p>
    </body></html>`);
  } catch (err) {
    res.status(500).send(`<h2>Error: ${err.message}</h2>`);
  }
});

// POST /api/approve/:token — programmatic approval (authenticated)
router.post('/:token', async (req, res) => {
  const { token } = req.params;
  const { action, comment } = req.body;
  const status = action === 'reject' ? 'rejected' : 'approved';

  try {
    const result = await query(
      `UPDATE workflow_approvals SET status=$1, comment=$2, resolved_at=NOW()
       WHERE token=$3 AND status='pending' RETURNING *`,
      [status, comment || '', token]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Token not found or already resolved' });
    }
    res.json({ success: true, status, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

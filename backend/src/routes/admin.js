const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate, requireAdmin);

function parseUserSettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'object') return rawSettings;
  try {
    return JSON.parse(rawSettings);
  } catch {
    return {};
  }
}

function formatUser(row) {
  if (!row) return null;
  const settings = parseUserSettings(row.settings);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    avatar: settings.avatar || null,
    headline: typeof settings.headline === 'string' ? settings.headline : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/users', async (req, res) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const rawOffset = Number.parseInt(req.query.offset, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    const search = String(req.query.search || '').trim().toLowerCase();

    const params = [];
    let whereClause = '';
    if (search) {
      params.push(`%${search}%`);
      whereClause = 'WHERE LOWER(email) LIKE $1 OR LOWER(name) LIKE $1';
    }

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);

    const listParams = [...params, limit, offset];
    const usersResult = await query(
      `SELECT id, email, name, role, is_active, email_verified, settings, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );

    res.json({
      users: usersResult.rows.map(formatUser),
      total: Number.parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = String(req.params.id || '').trim();
    if (!userId) {
      return res.status(400).json({ error: 'User id is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const targetResult = await query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const target = targetResult.rows[0];

    if (target.role === 'admin') {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE");
      if (Number.parseInt(adminCount.rows[0].count, 10) <= 1) {
        return res.status(409).json({ error: 'Cannot delete the last active admin' });
      }
    }

    const result = await transaction(async (client) => {
      const ownedWorkspaces = await client.query(
        'SELECT id FROM workspaces WHERE owner_id = $1',
        [userId]
      );
      const ownedWorkspaceIds = ownedWorkspaces.rows.map((row) => row.id);

      if (ownedWorkspaceIds.length > 0) {
        await client.query(
          'UPDATE workspaces SET owner_id = $1 WHERE owner_id = $2',
          [req.user.id, userId]
        );
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           SELECT wid, $2, 'owner'
           FROM unnest($1::uuid[]) AS wid
           ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [ownedWorkspaceIds, req.user.id]
        );
      }

      await client.query('DELETE FROM workspace_members WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM workflow_editors WHERE user_id = $1', [userId]);
      await client.query('UPDATE workflows SET created_by = NULL WHERE created_by = $1', [userId]);
      await client.query('UPDATE workflow_versions SET created_by = NULL WHERE created_by = $1', [userId]);
      await client.query('UPDATE credentials SET created_by = NULL WHERE created_by = $1', [userId]);
      await client.query('UPDATE ai_generations SET user_id = NULL WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);

      const resetTable = await client.query("SELECT to_regclass('public.password_reset_tokens') AS name");
      if (resetTable.rows[0]?.name) {
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      }

      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      return { reassignedWorkspaces: ownedWorkspaceIds.length };
    });

    res.json({
      success: true,
      deletedUser: { id: target.id, email: target.email },
      reassignedWorkspaces: result.reassignedWorkspaces,
    });
  } catch (err) {
    logger.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

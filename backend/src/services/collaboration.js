const { query } = require('../db');

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: Boolean(row.is_read),
    data: parseJson(row.data, {}),
    createdAt: row.created_at,
    readAt: row.read_at || null,
  };
}

async function createNotification(userId, payload) {
  if (!userId) return null;
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      payload.type || 'general',
      payload.title || 'Update',
      payload.body || '',
      JSON.stringify(payload.data || {}),
    ]
  );
  return formatNotification(result.rows[0]);
}

async function logWorkflowActivity(payload) {
  if (!payload?.workflowId || !payload?.workspaceId || !payload?.type) return null;
  const result = await query(
    `INSERT INTO workflow_activity (workflow_id, workspace_id, actor_id, type, title, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.workflowId,
      payload.workspaceId,
      payload.actorId || null,
      payload.type,
      payload.title || payload.type,
      payload.body || '',
      JSON.stringify(payload.metadata || {}),
    ]
  );
  return result.rows[0];
}

module.exports = {
  parseJson,
  formatNotification,
  createNotification,
  logWorkflowActivity,
};

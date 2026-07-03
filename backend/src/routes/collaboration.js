const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendWorkspaceInviteEmail } = require('../services/email');
const { createNotification, logWorkflowActivity, parseJson } = require('../services/collaboration');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireWorkspace);

async function loadWorkflow(workspaceId, workflowId) {
  const result = await query(
    'SELECT id, workspace_id, name, created_by FROM workflows WHERE id = $1 AND workspace_id = $2',
    [workflowId, workspaceId]
  );
  return result.rows[0] || null;
}

async function loadThread(workspaceId, threadId, userId) {
  const result = await query(
    `SELECT t.*
     FROM inbox_threads t
     JOIN inbox_thread_members tm ON tm.thread_id = t.id
     WHERE t.id = $1 AND t.workspace_id = $2 AND tm.user_id = $3`,
    [threadId, workspaceId, userId]
  );
  return result.rows[0] || null;
}

function formatInvite(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    message: row.message || '',
    invitedAt: row.created_at,
    respondedAt: row.responded_at || null,
    invitedBy: row.invited_by_name ? {
      id: row.invited_by,
      name: row.invited_by_name,
      email: row.invited_by_email,
    } : null,
    invitedUser: row.invited_user_name ? {
      id: row.invited_user_id,
      name: row.invited_user_name,
      email: row.email,
    } : null,
  };
}

router.get('/invites', async (req, res) => {
  try {
    const result = await query(
      `SELECT wi.*,
              inviter.name AS invited_by_name,
              inviter.email AS invited_by_email,
              invited.name AS invited_user_name
       FROM workspace_invitations wi
       JOIN users inviter ON inviter.id = wi.invited_by
       LEFT JOIN users invited ON invited.id = wi.invited_user_id
       WHERE wi.workspace_id = $1
       ORDER BY wi.created_at DESC`,
      [req.workspaceId]
    );
    res.json({ invites: result.rows.map(formatInvite) });
  } catch (err) {
    logger.error('List invites error:', err);
    res.status(500).json({ error: 'Failed to load workspace invites' });
  }
});

router.post('/invites', requireRole('owner', 'admin', 'editor'), async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = ['owner', 'admin', 'editor', 'viewer'].includes(req.body.role) ? req.body.role : 'viewer';
    const message = String(req.body.message || '').trim().slice(0, 300);

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const existingMember = await query(
      `SELECT u.id, u.name, u.email
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND u.email = $2`,
      [req.workspaceId, email]
    );
    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'That user is already a workspace member' });
    }

    const pendingInvite = await query(
      `SELECT id FROM workspace_invitations
       WHERE workspace_id = $1 AND email = $2 AND status = 'pending'`,
      [req.workspaceId, email]
    );
    if (pendingInvite.rows.length > 0) {
      return res.status(409).json({ error: 'A pending invite already exists for this email' });
    }

    const invitedUser = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    const token = uuidv4();

    const inviteResult = await query(
      `INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, invited_user_id, token, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.workspaceId,
        email,
        role,
        req.user.id,
        invitedUser.rows[0]?.id || null,
        token,
        message || '',
      ]
    );

    if (invitedUser.rows[0]?.id) {
      await createNotification(invitedUser.rows[0].id, {
        type: 'workspace_invite',
        title: 'Workspace invitation',
        body: `${req.user.name} invited you to join this workspace as ${role}.`,
        data: {
          workspaceId: req.workspaceId,
          inviteId: inviteResult.rows[0].id,
          role,
        },
      });
    }

    sendWorkspaceInviteEmail({
      toEmail: email,
      inviterName: req.user.name,
      workspaceName: req.workspace?.name || 'Fluxion workspace',
      role,
      message,
      inviteToken: token,
    }).catch((mailErr) => {
      logger.warn('Workspace invite email failed:', mailErr.message);
    });

    res.status(201).json({ invite: formatInvite(inviteResult.rows[0]) });
  } catch (err) {
    logger.error('Create invite error:', err);
    res.status(500).json({ error: 'Failed to create workspace invite' });
  }
});

router.get('/workflow/:workflowId/members', async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.workspaceId, req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const result = await query(
      `SELECT wm.user_id, wm.access_role, wm.added_at, wm.last_seen,
              u.name, u.email, u.settings, workspace_member.role AS workspace_role
       FROM workflow_members wm
       JOIN users u ON u.id = wm.user_id
       LEFT JOIN workspace_members workspace_member
         ON workspace_member.workspace_id = $1 AND workspace_member.user_id = wm.user_id
       WHERE wm.workflow_id = $2
       ORDER BY wm.added_at ASC`,
      [req.workspaceId, req.params.workflowId]
    );

    res.json({
      members: result.rows.map((row) => {
        const settings = parseJson(row.settings, {});
        return {
          userId: row.user_id,
          name: row.name,
          email: row.email,
          accessRole: row.access_role,
          workspaceRole: row.workspace_role || 'viewer',
          avatar: settings.avatar || null,
          headline: settings.headline || '',
          addedAt: row.added_at,
          lastSeen: row.last_seen || null,
        };
      })
    });
  } catch (err) {
    logger.error('List workflow members error:', err);
    res.status(500).json({ error: 'Failed to load workflow members' });
  }
});

router.post('/workflow/:workflowId/members', requireRole('owner', 'admin', 'editor'), async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.workspaceId, req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const userId = req.body.userId;
    const accessRole = ['owner', 'edit', 'run', 'approve', 'view'].includes(req.body.accessRole)
      ? req.body.accessRole
      : 'edit';

    const member = await query(
      `SELECT u.id, u.name, u.email
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
      [req.workspaceId, userId]
    );
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'User must join the workspace before being added to the workflow' });
    }

    await query(
      `INSERT INTO workflow_members (workflow_id, user_id, access_role, invited_by, last_seen)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (workflow_id, user_id)
       DO UPDATE SET access_role = EXCLUDED.access_role, invited_by = EXCLUDED.invited_by, last_seen = NOW()`,
      [workflow.id, userId, accessRole, req.user.id]
    );

    await createNotification(userId, {
      type: 'workflow_invite',
      title: 'Added to workflow',
      body: `${req.user.name} added you to "${workflow.name}" with ${accessRole} access.`,
      data: {
        workspaceId: req.workspaceId,
        workflowId: workflow.id,
        accessRole,
      }
    });

    await logWorkflowActivity({
      workflowId: workflow.id,
      workspaceId: req.workspaceId,
      actorId: req.user.id,
      type: 'workflow_member_added',
      title: 'Collaborator added',
      body: `${member.rows[0].name} can now collaborate on this workflow.`,
      metadata: { memberUserId: userId, accessRole },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    logger.error('Add workflow member error:', err);
    res.status(500).json({ error: 'Failed to add workflow collaborator' });
  }
});

router.delete('/workflow/:workflowId/members/:userId', requireRole('owner', 'admin', 'editor'), async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.workspaceId, req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    await query(
      'DELETE FROM workflow_members WHERE workflow_id = $1 AND user_id = $2',
      [workflow.id, req.params.userId]
    );

    await logWorkflowActivity({
      workflowId: workflow.id,
      workspaceId: req.workspaceId,
      actorId: req.user.id,
      type: 'workflow_member_removed',
      title: 'Collaborator removed',
      body: `A collaborator was removed from this workflow.`,
      metadata: { memberUserId: req.params.userId },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Remove workflow member error:', err);
    res.status(500).json({ error: 'Failed to remove workflow collaborator' });
  }
});

router.get('/workflow/:workflowId/activity', async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.workspaceId, req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const result = await query(
      `SELECT wa.*, u.name AS actor_name, u.email AS actor_email, u.settings AS actor_settings
       FROM workflow_activity wa
       LEFT JOIN users u ON u.id = wa.actor_id
       WHERE wa.workflow_id = $1 AND wa.workspace_id = $2
       ORDER BY wa.created_at DESC
       LIMIT 100`,
      [workflow.id, req.workspaceId]
    );

    res.json({
      activity: result.rows.map((row) => {
        const settings = parseJson(row.actor_settings, {});
        return {
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          metadata: parseJson(row.metadata, {}),
          createdAt: row.created_at,
          actor: row.actor_id ? {
            id: row.actor_id,
            name: row.actor_name,
            email: row.actor_email,
            avatar: settings.avatar || null,
          } : null,
        };
      })
    });
  } catch (err) {
    logger.error('Workflow activity error:', err);
    res.status(500).json({ error: 'Failed to load workflow activity' });
  }
});

router.post('/workflow/:workflowId/activity', async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.workspaceId, req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const title = String(req.body.title || '').trim().slice(0, 120);
    const body = String(req.body.body || '').trim().slice(0, 400);
    const type = String(req.body.type || 'note').trim().slice(0, 40);

    if (!title) {
      return res.status(400).json({ error: 'Activity title is required' });
    }

    const activity = await logWorkflowActivity({
      workflowId: workflow.id,
      workspaceId: req.workspaceId,
      actorId: req.user.id,
      type,
      title,
      body,
      metadata: req.body.metadata || {},
    });

    res.status(201).json({ activity });
  } catch (err) {
    logger.error('Create workflow activity error:', err);
    res.status(500).json({ error: 'Failed to log workflow activity' });
  }
});

router.get('/inbox/threads', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*,
              tm.last_read_at,
              (
                SELECT COUNT(*)
                FROM inbox_messages im
                WHERE im.thread_id = t.id
                  AND (tm.last_read_at IS NULL OR im.created_at > tm.last_read_at)
                  AND im.sender_id <> $2
              ) AS unread_count
       FROM inbox_threads t
       JOIN inbox_thread_members tm ON tm.thread_id = t.id
       WHERE t.workspace_id = $1 AND tm.user_id = $2
       ORDER BY t.updated_at DESC`,
      [req.workspaceId, req.user.id]
    );

    res.json({
      threads: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        workflowId: row.workflow_id || null,
        updatedAt: row.updated_at,
        unreadCount: Number(row.unread_count || 0),
        lastReadAt: row.last_read_at || null,
      }))
    });
  } catch (err) {
    logger.error('List inbox threads error:', err);
    res.status(500).json({ error: 'Failed to load inbox threads' });
  }
});

router.post('/inbox/threads', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 120);
    const workflowId = req.body.workflowId || null;
    const participantIds = Array.isArray(req.body.participantIds) ? req.body.participantIds.filter(Boolean) : [];
    const allParticipantIds = [...new Set([req.user.id, ...participantIds])];

    if (!title) {
      return res.status(400).json({ error: 'Thread title is required' });
    }

    const validParticipants = await query(
      `SELECT user_id FROM workspace_members
       WHERE workspace_id = $1 AND user_id = ANY($2::uuid[])`,
      [req.workspaceId, allParticipantIds]
    );
    const validIds = validParticipants.rows.map((row) => row.user_id);

    const invalidParticipantIds = allParticipantIds.filter((id) => !validIds.includes(id));
    if (invalidParticipantIds.length > 0) {
      return res.status(400).json({
        error: 'One or more selected teammates are not active members of this workspace yet.',
        invalidParticipantIds,
      });
    }

    if (validIds.length < 2) {
      return res.status(400).json({
        error: 'Add at least one teammate who has already joined this workspace.',
      });
    }

    const thread = await transaction(async (client) => {
      const created = await client.query(
        `INSERT INTO inbox_threads (workspace_id, workflow_id, type, title, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.workspaceId, workflowId, workflowId ? 'workflow' : 'direct', title, req.user.id]
      );
      for (const userId of validIds) {
        await client.query(
          `INSERT INTO inbox_thread_members (thread_id, user_id, joined_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (thread_id, user_id) DO NOTHING`,
          [created.rows[0].id, userId]
        );
      }
      await client.query(
        `INSERT INTO inbox_messages (thread_id, sender_id, body, message_type)
         VALUES ($1, $2, $3, 'system')`,
        [created.rows[0].id, req.user.id, `${req.user.name} started this conversation.`]
      );
      return created.rows[0];
    });

    for (const userId of validIds) {
      if (userId === req.user.id) continue;
      await createNotification(userId, {
        type: 'inbox_thread',
        title: 'New conversation',
        body: `${req.user.name} started "${title}".`,
        data: { workspaceId: req.workspaceId, threadId: thread.id, workflowId },
      });
    }

    res.status(201).json({ thread });
  } catch (err) {
    logger.error('Create inbox thread error:', err);
    res.status(500).json({ error: 'Failed to create inbox thread' });
  }
});

router.delete('/inbox/threads/:threadId', async (req, res) => {
  try {
    const thread = await loadThread(req.workspaceId, req.params.threadId, req.user.id);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    await transaction(async (client) => {
      await client.query(
        'DELETE FROM inbox_thread_members WHERE thread_id = $1 AND user_id = $2',
        [thread.id, req.user.id]
      );

      const remainingMembers = await client.query(
        'SELECT COUNT(*)::int AS count FROM inbox_thread_members WHERE thread_id = $1',
        [thread.id]
      );

      if (Number(remainingMembers.rows[0]?.count || 0) === 0) {
        await client.query('DELETE FROM inbox_messages WHERE thread_id = $1', [thread.id]);
        await client.query('DELETE FROM inbox_threads WHERE id = $1', [thread.id]);
      }
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Delete inbox thread error:', err);
    res.status(500).json({ error: 'Failed to remove conversation' });
  }
});

router.get('/inbox/threads/:threadId/messages', async (req, res) => {
  try {
    const thread = await loadThread(req.workspaceId, req.params.threadId, req.user.id);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const messages = await query(
      `SELECT im.*, u.name AS sender_name, u.email AS sender_email, u.settings AS sender_settings
       FROM inbox_messages im
       JOIN users u ON u.id = im.sender_id
       WHERE im.thread_id = $1
       ORDER BY im.created_at ASC`,
      [thread.id]
    );

    await query(
      `UPDATE inbox_thread_members
       SET last_read_at = NOW()
       WHERE thread_id = $1 AND user_id = $2`,
      [thread.id, req.user.id]
    );

    res.json({
      thread: {
        id: thread.id,
        title: thread.title,
        type: thread.type,
        workflowId: thread.workflow_id || null,
      },
      messages: messages.rows.map((row) => {
        const settings = parseJson(row.sender_settings, {});
        return {
          id: row.id,
          body: row.body,
          messageType: row.message_type,
          createdAt: row.created_at,
          sender: {
            id: row.sender_id,
            name: row.sender_name,
            email: row.sender_email,
            avatar: settings.avatar || null,
          }
        };
      })
    });
  } catch (err) {
    logger.error('List inbox messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.post('/inbox/threads/:threadId/messages', async (req, res) => {
  try {
    const thread = await loadThread(req.workspaceId, req.params.threadId, req.user.id);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const body = String(req.body.body || '').trim().slice(0, 2000);
    if (!body) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const result = await query(
      `INSERT INTO inbox_messages (thread_id, sender_id, body, message_type)
       VALUES ($1, $2, $3, 'text')
       RETURNING *`,
      [thread.id, req.user.id, body]
    );
    await query('UPDATE inbox_threads SET updated_at = NOW() WHERE id = $1', [thread.id]);

    const recipients = await query(
      'SELECT user_id FROM inbox_thread_members WHERE thread_id = $1 AND user_id <> $2',
      [thread.id, req.user.id]
    );
    for (const row of recipients.rows) {
      await createNotification(row.user_id, {
        type: 'inbox_message',
        title: 'New message',
        body: `${req.user.name}: ${body.slice(0, 80)}`,
        data: { workspaceId: req.workspaceId, threadId: thread.id, workflowId: thread.workflow_id || null },
      });
    }

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    logger.error('Create inbox message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;

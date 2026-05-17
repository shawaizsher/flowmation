const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateToken, sendPasswordResetEmail } = require('../services/email');
const logger = require('../utils/logger');
const { formatNotification } = require('../services/collaboration');

const router = express.Router();

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
    avatar: settings.avatar || null,
    headline: typeof settings.headline === 'string' ? settings.headline : '',
  };
}

function sanitizeAvatar(avatar) {
  if (!avatar || typeof avatar !== 'object') return null;

  if (avatar.type === 'emoji' && typeof avatar.emoji === 'string' && avatar.emoji.trim()) {
    return { type: 'emoji', emoji: avatar.emoji.trim().slice(0, 16) };
  }

  if (
    avatar.type === 'image' &&
    typeof avatar.imageUrl === 'string' &&
    avatar.imageUrl.startsWith('data:image/')
  ) {
    return { type: 'image', imageUrl: avatar.imageUrl.slice(0, 1024 * 1024) };
  }

  if (
    avatar.type === 'gradient' &&
    avatar.gradient &&
    typeof avatar.gradient.from === 'string' &&
    typeof avatar.gradient.to === 'string'
  ) {
    return {
      type: 'gradient',
      gradient: {
        from: avatar.gradient.from.slice(0, 32),
        to: avatar.gradient.to.slice(0, 32),
      },
    };
  }

  return null;
}

function parseNotificationData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existing = await query('SELECT id, email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await transaction(async (client) => {
      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, name, email_verified, settings) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, settings",
        [email.toLowerCase(), passwordHash, name, true, JSON.stringify({})]
      );
      const user = userResult.rows[0];

      const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const workspaceResult = await client.query(
        'INSERT INTO workspaces (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug',
        [`${name}'s Workspace`, slug, user.id]
      );
      const workspace = workspaceResult.rows[0];

      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspace.id, user.id, 'owner']
      );

      return { user, workspace };
    });

    const token = jwt.sign(
      { userId: result.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    logger.info(`User registered: ${result.user.email}`);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: formatUser(result.user),
      workspaces: [
        {
          id: result.workspace.id,
          name: result.workspace.name,
          slug: result.workspace.slug,
          role: 'owner',
        },
      ],
      emailVerificationRequired: false,
    });
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── GET /api/auth/verify-email?token=xxx ──
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find the token
    const tokenResult = await query(
      'SELECT * FROM email_verification_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    const record = tokenResult.rows[0];

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      // Clean up expired token
      await query('DELETE FROM email_verification_tokens WHERE id = $1', [record.id]);
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    // Mark user as verified
    await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [record.user_id]);

    // Delete all verification tokens for this user
    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [record.user_id]);

    // Fetch user + workspace for auto-login
    const userResult = await query(
      'SELECT id, email, name, role, settings FROM users WHERE id = $1',
      [record.user_id]
    );
    const user = formatUser(userResult.rows[0]);

    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [user.id]
    );

    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    logger.info(`Email verified: ${user.email}`);

    res.json({
      message: 'Email verified successfully!',
      token: jwtToken,
      user,
      workspace: workspaces.rows[0] || null,
    });
  } catch (err) {
    logger.error('Email verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── POST /api/auth/verify-otp ──
// Verifies the 6-digit OTP code entered inline on the register page.
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const normalizedCode = String(code).trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'Code must be 6 digits' });
    }

    // Look up user
    const userResult = await query(
      'SELECT id, name, email, email_verified, role, settings FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'No account found for this email' });
    }
    const rawUser = userResult.rows[0];
    const user = formatUser(rawUser);

    if (rawUser.email_verified) {
      // Already verified — just return a JWT so the frontend can log in
      const workspaces = await query(
        `SELECT w.id, w.name, w.slug, wm.role FROM workspaces w
         JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE wm.user_id = $1 ORDER BY w.created_at ASC`,
        [user.id]
      );
      const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'Email already verified.', token: jwtToken, user, workspace: workspaces.rows[0] || null });
    }

    // Find matching OTP token
    const tokenResult = await query(
      'SELECT * FROM email_verification_tokens WHERE user_id = $1 AND token = $2',
      [user.id, normalizedCode]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid code. Please check the email and try again.' });
    }

    const record = tokenResult.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM email_verification_tokens WHERE id = $1', [record.id]);
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Mark user verified and clean up tokens
    await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [user.id]);
    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, wm.role FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1 ORDER BY w.created_at ASC`,
      [user.id]
    );
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    logger.info(`Email verified via OTP: ${user.email}`);

    res.json({
      message: 'Email verified! Welcome to Flowa.',
      token: jwtToken,
      user,
      workspace: workspaces.rows[0] || null,
    });
  } catch (err) {
    logger.error('OTP verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── POST /api/auth/resend-verification ──
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userResult = await query(
      'SELECT id, name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists — return success either way
      return res.json({ message: 'If an account exists with that email, a verification link has been sent.' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.json({ message: 'Email is already verified. You can sign in.' });
    }

    // Rate limit — don't send if a token was created less than 60s ago
    const recent = await query(
      "SELECT id FROM email_verification_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds'",
      [user.id]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting another email.' });
    }

    // Delete old tokens
    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

    // Create new OTP code (15 min expiry)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    await sendVerificationEmail(email.toLowerCase(), user.name, token);

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (err) {
    logger.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, name, role, settings, is_active, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Email verification is disabled; allow login without email checks.

    // Get user's workspaces
    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      token,
      user: formatUser(user),
      workspaces: workspaces.rows
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', authenticate, async (req, res) => {
  try {
    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [req.user.id]
    );

    res.json({
      user: req.user,
      workspaces: workspaces.rows
    });
  } catch (err) {
    logger.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ── PUT /api/auth/profile ──
router.put('/profile', authenticate, async (req, res) => {
  try {
    const nextName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const nextHeadline = typeof req.body.headline === 'string' ? req.body.headline.trim() : '';
    const nextAvatar = sanitizeAvatar(req.body.avatar);

    if (!nextName || nextName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    if (nextName.length > 80) {
      return res.status(400).json({ error: 'Name must be 80 characters or fewer' });
    }

    if (nextHeadline.length > 120) {
      return res.status(400).json({ error: 'Headline must be 120 characters or fewer' });
    }

    const mergedSettings = {
      ...(req.user.settings || {}),
      avatar: nextAvatar,
      headline: nextHeadline,
    };

    const result = await query(
      `UPDATE users
       SET name = $1,
           settings = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, settings`,
      [nextName, JSON.stringify(mergedSettings), req.user.id]
    );

    res.json({ user: formatUser(result.rows[0]) });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({
      notifications: result.rows.map(formatNotification),
      unreadCount: result.rows.filter((row) => !row.is_read).length,
    });
  } catch (err) {
    logger.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.post('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('Read all notifications error:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

router.post('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('Read notification error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.get('/invitations', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT wi.*, w.name AS workspace_name, inviter.name AS inviter_name, inviter.email AS inviter_email
       FROM workspace_invitations wi
       JOIN workspaces w ON w.id = wi.workspace_id
       LEFT JOIN users inviter ON inviter.id = wi.invited_by
       WHERE wi.email = $1
       ORDER BY wi.created_at DESC`,
      [req.user.email.toLowerCase()]
    );
    res.json({
      invitations: result.rows.map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        role: row.role,
        status: row.status,
        message: row.message || '',
        invitedAt: row.created_at,
        respondedAt: row.responded_at || null,
        token: row.token,
        inviter: row.inviter_name ? {
          name: row.inviter_name,
          email: row.inviter_email,
        } : null,
      })),
    });
  } catch (err) {
    logger.error('List invitations error:', err);
    res.status(500).json({ error: 'Failed to load invitations' });
  }
});

router.post('/invitations/:id/respond', authenticate, async (req, res) => {
  try {
    const action = req.body.action === 'accept' ? 'accept' : req.body.action === 'reject' ? 'reject' : null;
    if (!action) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }

    const invitationResult = await query(
      `SELECT wi.*, w.name AS workspace_name
       FROM workspace_invitations wi
       JOIN workspaces w ON w.id = wi.workspace_id
       WHERE wi.id = $1 AND wi.email = $2`,
      [req.params.id, req.user.email.toLowerCase()]
    );
    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitationResult.rows[0];
    if (invitation.status !== 'pending') {
      return res.status(409).json({ error: `Invitation already ${invitation.status}` });
    }

    if (action === 'accept') {
      await transaction(async (client) => {
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [invitation.workspace_id, req.user.id, invitation.role]
        );
        await client.query(
          `UPDATE workspace_invitations
           SET status = 'accepted', invited_user_id = $1, responded_at = NOW()
           WHERE id = $2`,
          [req.user.id, invitation.id]
        );
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'invite_response', $2, $3, $4)`,
          [
            invitation.invited_by,
            'Workspace invite accepted',
            `${req.user.name} accepted the invite to ${invitation.workspace_name}.`,
            JSON.stringify({ workspaceId: invitation.workspace_id, inviteId: invitation.id, action: 'accepted' }),
          ]
        );

        // Repair older solo-created direct chats that were opened before the invitee had joined.
        await client.query(
          `INSERT INTO inbox_thread_members (thread_id, user_id, joined_at)
           SELECT t.id, $1, NOW()
           FROM inbox_threads t
           LEFT JOIN inbox_thread_members existing_member
             ON existing_member.thread_id = t.id AND existing_member.user_id = $1
           WHERE t.workspace_id = $2
             AND t.type = 'direct'
             AND t.created_by = $3
             AND existing_member.user_id IS NULL
             AND (
               SELECT COUNT(*)
               FROM inbox_thread_members tm
               WHERE tm.thread_id = t.id
             ) = 1`,
          [req.user.id, invitation.workspace_id, invitation.invited_by]
        );

        const welcomeThread = await client.query(
          `INSERT INTO inbox_threads (workspace_id, workflow_id, type, title, created_by)
           VALUES ($1, NULL, 'direct', $2, $3)
           RETURNING id`,
          [
            invitation.workspace_id,
            `${invitation.workspace_name} team chat`,
            invitation.invited_by || req.user.id,
          ]
        );

        await client.query(
          `INSERT INTO inbox_thread_members (thread_id, user_id, joined_at)
           VALUES ($1, $2, NOW()), ($1, $3, NOW())
           ON CONFLICT (thread_id, user_id) DO NOTHING`,
          [welcomeThread.rows[0].id, invitation.invited_by || req.user.id, req.user.id]
        );

        await client.query(
          `INSERT INTO inbox_messages (thread_id, sender_id, body, message_type)
           VALUES ($1, $2, $3, 'system')`,
          [
            welcomeThread.rows[0].id,
            req.user.id,
            `${req.user.name} joined ${invitation.workspace_name}. You can coordinate here.`,
          ]
        );
      });
      return res.json({ success: true, status: 'accepted' });
    }

    await query(
      `UPDATE workspace_invitations
       SET status = 'rejected', invited_user_id = $1, responded_at = NOW()
       WHERE id = $2`,
      [req.user.id, invitation.id]
    );
    if (invitation.invited_by) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'invite_response', $2, $3, $4)`,
        [
          invitation.invited_by,
          'Workspace invite declined',
          `${req.user.name} declined the invite to ${invitation.workspace_name}.`,
          JSON.stringify({ workspaceId: invitation.workspace_id, inviteId: invitation.id, action: 'rejected' }),
        ]
      );
    }

    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    logger.error('Respond invitation error:', err);
    res.status(500).json({ error: 'Failed to respond to invitation' });
  }
});

// ── POST /api/auth/forgot-password ──
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userResult = await query(
      'SELECT id, name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset code has been sent.' });
    }

    const user = userResult.rows[0];

    // Rate limit — 60 seconds between requests
    const recent = await query(
      "SELECT id FROM password_reset_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds'",
      [user.id]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another reset code.' });
    }

    // Delete old tokens
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // Create new 6-digit OTP
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    sendPasswordResetEmail(email.toLowerCase(), user.name, token).catch((err) => {
      logger.error('Failed to send password reset email:', err);
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[DEV] Password reset OTP for ${email}: ${token}`);
    }

    res.json({ message: 'If an account exists, a reset code has been sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const userId = userResult.rows[0].id;

    const tokenResult = await query(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2',
      [userId, String(code).trim()]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const record = tokenResult.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM password_reset_tokens WHERE id = $1', [record.id]);
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    logger.info(`Password reset successful for user ${userId}`);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;

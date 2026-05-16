const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateToken, sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const logger = require('../utils/logger');

const router = express.Router();

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
    const isDev = process.env.NODE_ENV !== 'production';

    const result = await transaction(async (client) => {
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
        [email.toLowerCase(), passwordHash, name, false]
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

      // Always generate OTP — Ethereal SMTP is used as dev fallback
      const verificationToken = generateToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await client.query(
        'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, verificationToken, expiresAt]
      );

      return { user, workspace, verificationToken };
    });

    // Send OTP via email (Ethereal in dev, real SMTP in production)
    sendVerificationEmail(email.toLowerCase(), name, result.verificationToken).catch((err) => {
      logger.error('Failed to send OTP email:', err);
    });

    // Dev only: print OTP to terminal at debug level — never in production
    if (isDev) {
      logger.debug(`[DEV] OTP for ${email}: ${result.verificationToken}`);
    }

    logger.info(`User registered (OTP sent): ${result.user.email}`);

    res.status(201).json({
      message: 'Account created! Enter the 6-digit code we sent to your email.',
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      emailVerificationRequired: true,
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
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [record.user_id]
    );
    const user = userResult.rows[0];

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
      'SELECT id, name, email, email_verified, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'No account found for this email' });
    }
    const user = userResult.rows[0];

    if (user.email_verified) {
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
      'SELECT id, email, password_hash, name, role, is_active, email_verified FROM users WHERE email = $1',
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

    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email address before signing in.',
        emailVerificationRequired: true,
        email: user.email,
      });
    }

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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
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

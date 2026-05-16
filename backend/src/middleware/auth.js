const jwt = require('jsonwebtoken');
const { query } = require('../db');
const logger = require('../utils/logger');

function parseUserSettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'object') return rawSettings;
  try {
    return JSON.parse(rawSettings);
  } catch {
    return {};
  }
}

/**
 * Authenticate JWT token from Authorization header
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const result = await query(
      'SELECT id, email, name, role, settings, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const settings = parseUserSettings(user.settings);
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      settings,
      avatar: settings.avatar || null,
      headline: typeof settings.headline === 'string' ? settings.headline : '',
      is_active: user.is_active,
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    logger.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify the user is a member of the workspace (from :wid param)
 */
async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.params.wid;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    const result = await query(
      'SELECT wm.role FROM workspace_members wm WHERE wm.workspace_id = $1 AND wm.user_id = $2',
      [workspaceId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    req.workspaceRole = result.rows[0].role;
    req.workspaceId = workspaceId;
    next();
  } catch (err) {
    logger.error('Workspace middleware error:', err);
    res.status(500).json({ error: 'Workspace verification failed' });
  }
}

/**
 * Require a specific workspace role (or higher)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.workspaceRole)) {
      return res.status(403).json({
        error: `Requires role: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  };
}

module.exports = { authenticate, requireWorkspace, requireRole };

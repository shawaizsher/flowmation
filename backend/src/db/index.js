const { Pool } = require('pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL;
const wantsSsl =
  process.env.DB_SSL === 'true' ||
  process.env.NODE_ENV === 'production' ||
  /supabase\.com/i.test(connectionString || '');

const pool = new Pool({
  connectionString,
  ssl: wantsSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return { rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    logger.error('Query error:', { query: text.substring(0, 100), paramCount: params.length, error: err.message });
    throw err;
  }
}

async function getClient() {
  const client = await pool.connect();
  await client.query('BEGIN');
  return {
    query: async (text, params = []) => {
      const result = await client.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount };
    },
    commit: async () => {
      await client.query('COMMIT');
      client.release();
    },
    rollback: async () => {
      await client.query('ROLLBACK');
      client.release();
    },
    release: () => client.release(),
  };
}

async function transaction(callback) {
  const client = await getClient();
  try {
    const result = await callback(client);
    await client.commit();
    return result;
  } catch (err) {
    await client.rollback();
    throw err;
  }
}

async function initDb() {
  try {
    const result = await pool.query('SELECT NOW() as now');
    const migrations = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE',
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS settings TEXT DEFAULT '{}'",
      `CREATE TABLE IF NOT EXISTS login_otp_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS workspace_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        message TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        responded_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS workflow_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        access_role VARCHAR(20) DEFAULT 'edit' CHECK (access_role IN ('owner', 'edit', 'run', 'approve', 'view')),
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ,
        UNIQUE(workflow_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'general',
        title VARCHAR(255) NOT NULL,
        body TEXT DEFAULT '',
        data TEXT DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        read_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS inbox_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'workflow')),
        title VARCHAR(255) NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS inbox_thread_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID REFERENCES inbox_threads(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_read_at TIMESTAMPTZ,
        UNIQUE(thread_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS inbox_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID REFERENCES inbox_threads(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS workflow_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email)',
      'CREATE INDEX IF NOT EXISTS idx_workflow_members_workflow ON workflow_members(workflow_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_inbox_threads_workspace ON inbox_threads(workspace_id, updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages(thread_id, created_at ASC)',
      'CREATE INDEX IF NOT EXISTS idx_workflow_activity_workflow ON workflow_activity(workflow_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_login_otp_user ON login_otp_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_login_otp_created ON login_otp_tokens(created_at)',
    ];
    for (const statement of migrations) {
      await pool.query(statement);
    }
    logger.info(`PostgreSQL connected at ${result.rows[0].now}`);
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL:', err);
    throw err;
  }
}

async function closeDb() {
  await pool.end();
  logger.info('PostgreSQL connection pool closed');
}

module.exports = { query, getClient, transaction, initDb, closeDb, pool: () => pool };

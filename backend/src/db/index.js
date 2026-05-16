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

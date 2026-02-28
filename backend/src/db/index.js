const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a SQL query
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
  }
  return result;
}

/**
 * Get a client for transactions
 */
async function getClient() {
  return pool.connect();
}

/**
 * Execute a transaction with automatic commit/rollback
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initialize database connection
 */
async function initDb() {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info(`PostgreSQL connected at ${result.rows[0].now}`);
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL:', err);
    throw err;
  }
}

module.exports = { pool, query, getClient, transaction, initDb };

const sql = require('mssql');
const logger = require('../utils/logger');

// SQL Server configuration
const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'flowa',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Flowa_Secret_2026!',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Use encryption for Azure
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false', // Trust self-signed certs in dev
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 15000,
    instanceName: process.env.DB_INSTANCE || undefined // For named instances
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Add port only if explicitly specified
if (process.env.DB_PORT) {
  config.port = parseInt(process.env.DB_PORT);
}

// Connection pool
let pool = null;

/**
 * Get the connection pool
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    pool.on('error', (err) => {
      logger.error('Unexpected SQL Server pool error:', err);
      pool = null; // Reset pool on error
    });
  }
  return pool;
}

/**
 * Execute a SQL query
 * Converts PostgreSQL-style parameters ($1, $2) to SQL Server style (@param1, @param2)
 */
async function query(text, params = []) {
  const start = Date.now();
  
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Convert PostgreSQL parameter syntax ($1, $2) to SQL Server (@param1, @param2)
    let convertedText = text;
    if (params && params.length > 0) {
      params.forEach((param, index) => {
        const pgParam = `$${index + 1}`;
        const sqlParam = `@param${index + 1}`;
        convertedText = convertedText.replace(new RegExp('\\' + pgParam + '\\b', 'g'), sqlParam);
        
        // Add parameter to request
        request.input(`param${index + 1}`, param);
      });
    }
    
    const result = await request.query(convertedText);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${convertedText.substring(0, 100)}`);
    }
    
    // Convert result to PostgreSQL-like format
    return {
      rows: result.recordset || [],
      rowCount: result.rowsAffected ? result.rowsAffected[0] : 0
    };
  } catch (err) {
    logger.error('Query error:', { query: text, params, error: err.message });
    throw err;
  }
}

/**
 * Get a client for transactions
 */
async function getClient() {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  
  return {
    query: async (text, params = []) => {
      const request = transaction.request();
      
      // Convert PostgreSQL parameter syntax
      let convertedText = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const pgParam = `$${index + 1}`;
          const sqlParam = `@param${index + 1}`;
          convertedText = convertedText.replace(new RegExp('\\' + pgParam + '\\b', 'g'), sqlParam);
          request.input(`param${index + 1}`, param);
        });
      }
      
      const result = await request.query(convertedText);
      return {
        rows: result.recordset || [],
        rowCount: result.rowsAffected ? result.rowsAffected[0] : 0
      };
    },
    commit: async () => {
      await transaction.commit();
    },
    rollback: async () => {
      await transaction.rollback();
    },
    release: () => {
      // No-op for SQL Server (transaction auto-releases)
    }
  };
}

/**
 * Execute a transaction with automatic commit/rollback
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    const result = await callback(client);
    await client.commit();
    return result;
  } catch (err) {
    await client.rollback();
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
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() as now');
    logger.info(`SQL Server connected at ${result.recordset[0].now}`);
  } catch (err) {
    logger.error('Failed to connect to SQL Server:', err);
    throw err;
  }
}

/**
 * Close database connection
 */
async function closeDb() {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('SQL Server connection closed');
  }
}

module.exports = { query, getClient, transaction, initDb, closeDb, pool: () => pool };

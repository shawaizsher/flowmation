const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const logger = require('./utils/logger');
const { initDb } = require('./db');
const { initRedis } = require('./db/redis');
const { createWorker } = require('./services/queue');
const { executeWorkflow } = require('./engine/executor');
const { getWSManager } = require('./services/websocket');

async function start() {
  try {
    await initDb();
    await initRedis();

    logger.info('🔧 Starting Flowa worker...');

    const worker = createWorker(async (job) => {
      const { executionId, workflowId, triggerPayload, credentials } = job.data;
      logger.info(`Processing execution ${executionId} for workflow ${workflowId}`);

      const wsManager = getWSManager();
      const result = await executeWorkflow(executionId, workflowId, triggerPayload, wsManager, credentials);

      return result;
    });

    logger.info('✅ Flowa worker running and waiting for jobs');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Worker shutting down...');
      await worker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Worker shutting down...');
      await worker.close();
      process.exit(0);
    });
  } catch (err) {
    logger.error('Worker failed to start:', err);
    process.exit(1);
  }
}

start();

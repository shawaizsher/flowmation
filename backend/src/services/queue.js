const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../db/redis');
const { query } = require('../db');
const logger = require('../utils/logger');

let executionQueue = null;

function shouldUseInlineFallback() {
  return process.env.ENABLE_INLINE_EXECUTION_FALLBACK !== 'false';
}

async function hasActiveWorkers(queue) {
  try {
    const workers = await queue.getWorkers();
    return Array.isArray(workers) && workers.length > 0;
  } catch (err) {
    logger.warn(`Could not detect active queue workers: ${err.message}`);
    // If worker discovery fails, keep queue behavior unchanged.
    return true;
  }
}

function runExecutionInline({ executionId, workflowId, triggerPayload, credentials }) {
  setImmediate(async () => {
    try {
      const { executeWorkflow } = require('../engine/executor');
      const { getWSManager } = require('./websocket');
      const wsManager = getWSManager();

      await executeWorkflow(
        executionId,
        workflowId,
        triggerPayload || {},
        wsManager,
        credentials || {}
      );
    } catch (err) {
      logger.error(`Inline execution failed for ${executionId}:`, err);
    }
  });
}

function getQueue() {
  if (!executionQueue) {
    executionQueue = new Queue('workflow-executions', {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 1
      }
    });
  }
  return executionQueue;
}

/**
 * Add an execution job to the queue
 */
async function addExecutionJob({ workflowId, workspaceId, triggerType, triggerPayload, credentials }) {
  // Create execution record first
  const result = await query(
    `INSERT INTO executions (workflow_id, workspace_id, trigger_type, trigger_payload, status)
     OUTPUT INSERTED.id
     VALUES ($1, $2, $3, $4, 'pending')`,
    [workflowId, workspaceId, triggerType, JSON.stringify(triggerPayload || {})]
  );

  const executionId = result.rows[0].id;

  // Add to BullMQ queue when workers are available.
  const queue = getQueue();

  if (shouldUseInlineFallback()) {
    const workersOnline = await hasActiveWorkers(queue);

    if (!workersOnline) {
      logger.warn(`No active workers detected. Running execution inline: ${executionId}`);
      runExecutionInline({ executionId, workflowId, triggerPayload, credentials });
      return executionId;
    }
  }

  await queue.add('execute', {
    executionId,
    workflowId,
    workspaceId,
    triggerType,
    triggerPayload: triggerPayload || {},
    credentials: credentials || {}
  }, {
    jobId: executionId
  });

  logger.info(`Execution queued: ${executionId} for workflow ${workflowId}`);
  return executionId;
}

/**
 * Create a BullMQ worker (called from worker.js)
 */
function createWorker(processJob) {
  const worker = new Worker('workflow-executions', processJob, {
    connection: getRedis(),
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  });

  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.id}`, err);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  return worker;
}

module.exports = { getQueue, addExecutionJob, createWorker };

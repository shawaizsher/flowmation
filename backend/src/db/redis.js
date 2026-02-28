const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err.message);
    });
  }
  return redis;
}

async function initRedis() {
  const client = getRedis();
  await client.ping();
  logger.info('Redis ping successful');
  return client;
}

module.exports = { getRedis, initRedis };

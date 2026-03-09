const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let redisSub = null;

const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', REDIS_OPTIONS);

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err.message);
    });
  }
  return redis;
}

/** Separate connection for pub/sub subscriber (ioredis requirement) */
function getRedisSub() {
  if (!redisSub) {
    redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', REDIS_OPTIONS);

    redisSub.on('error', (err) => {
      logger.error('Redis subscriber error:', err.message);
    });
  }
  return redisSub;
}

async function initRedis() {
  const client = getRedis();
  await client.ping();
  logger.info('Redis ping successful');
  return client;
}

module.exports = { getRedis, getRedisSub, initRedis };

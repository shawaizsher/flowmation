const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let redisSub = null;
let selectedRedisUrl = null;

const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

function buildRedisCandidates() {
  const envUrl = process.env.REDIS_URL;
  const defaults = ['redis://localhost:6379', 'redis://redis:6379'];

  // No explicit REDIS_URL: try both common local/dev hostnames.
  if (!envUrl) {
    return defaults;
  }

  const candidates = [envUrl];

  try {
    const parsed = new URL(envUrl);

    if (parsed.hostname === 'redis') {
      const local = new URL(envUrl);
      local.hostname = 'localhost';
      candidates.push(local.toString());
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const dockerHost = new URL(envUrl);
      dockerHost.hostname = 'redis';
      candidates.push(dockerHost.toString());
    }
  } catch (err) {
    // If REDIS_URL is malformed, keep original value and let connection error surface.
  }

  // Deduplicate while preserving order.
  return [...new Set(candidates)];
}

function sanitizeRedisUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (err) {
    return url;
  }
}

async function probeRedis(url) {
  const probeClient = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null
  });

  // Probe failures are expected during fallback attempts; prevent unhandled event noise.
  probeClient.on('error', () => {});

  try {
    await probeClient.connect();
    await probeClient.ping();
    return true;
  } catch (err) {
    logger.warn(`Redis probe failed for ${sanitizeRedisUrl(url)}: ${err.message}`);
    return false;
  } finally {
    try {
      await probeClient.quit();
    } catch (err) {
      probeClient.disconnect();
    }
  }
}

function resolveRedisUrl() {
  return selectedRedisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
}

function getRedis() {
  if (!redis) {
    redis = new Redis(resolveRedisUrl(), REDIS_OPTIONS);

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
    redisSub = new Redis(resolveRedisUrl(), REDIS_OPTIONS);

    redisSub.on('error', (err) => {
      logger.error('Redis subscriber error:', err.message);
    });
  }
  return redisSub;
}

async function initRedis() {
  if (!selectedRedisUrl) {
    const candidates = buildRedisCandidates();

    for (const url of candidates) {
      const ok = await probeRedis(url);
      if (ok) {
        selectedRedisUrl = url;
        break;
      }
    }

    if (!selectedRedisUrl) {
      throw new Error(`Unable to connect to Redis. Tried: ${candidates.map(sanitizeRedisUrl).join(', ')}`);
    }

    logger.info(`Redis URL selected: ${sanitizeRedisUrl(selectedRedisUrl)}`);
  }

  const client = getRedis();
  await client.ping();
  logger.info('Redis ping successful');
  return client;
}

module.exports = { getRedis, getRedisSub, initRedis };

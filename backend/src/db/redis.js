const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let redisSub = null;
let selectedRedisUrl = null;
let selectedRedisVersion = null;
let redisAvailable = false;

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

function parseRedisVersion(info) {
  const match = String(info || '').match(/^redis_version:([^\r\n]+)/m);
  return match ? match[1].trim() : null;
}

function isRedisVersionAtLeast(version, minimum) {
  const current = String(version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const required = String(minimum || '').split('.').map((part) => Number.parseInt(part, 10) || 0);

  for (let i = 0; i < Math.max(current.length, required.length); i += 1) {
    const currentPart = current[i] || 0;
    const requiredPart = required[i] || 0;
    if (currentPart > requiredPart) return true;
    if (currentPart < requiredPart) return false;
  }

  return true;
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
    const info = await probeClient.info('server');
    return { ok: true, version: parseRedisVersion(info) };
  } catch (err) {
    logger.warn(`Redis probe failed for ${sanitizeRedisUrl(url)}: ${err.message}`);
    return { ok: false, version: null };
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
      const result = await probeRedis(url);
      if (result.ok) {
        selectedRedisUrl = url;
        selectedRedisVersion = result.version;
        break;
      }
    }

    if (!selectedRedisUrl) {
      logger.warn(
        `Redis unavailable. Tried: ${candidates.map(sanitizeRedisUrl).join(', ')}. ` +
        'Workflow executions will run inline; real-time cross-instance events disabled.'
      );
      redisAvailable = false;
      return null;
    }

    logger.info(`Redis URL selected: ${sanitizeRedisUrl(selectedRedisUrl)}${selectedRedisVersion ? ` (${selectedRedisVersion})` : ''}`);
  }

  const client = getRedis();
  await client.ping();
  redisAvailable = true;
  logger.info('Redis ping successful');
  return client;
}

function isRedisAvailable() {
  return redisAvailable;
}

function getRedisServerVersion() {
  return selectedRedisVersion;
}

module.exports = { getRedis, getRedisSub, initRedis, isRedisAvailable, getRedisServerVersion, isRedisVersionAtLeast };

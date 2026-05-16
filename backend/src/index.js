require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { initDb } = require('./db');
const { initRedis } = require('./db/redis');
const { initWebSocket } = require('./services/websocket');
const { initEmail } = require('./services/email');
const { authenticate } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const executionRoutes = require('./routes/executions');
const versionRoutes = require('./routes/versions');
const aiRoutes = require('./routes/ai');
const nodeRoutes = require('./routes/nodes');

// ── Startup secret validation — fail fast if defaults are used in production ──
if (process.env.NODE_ENV === 'production') {
  const BAD_SECRETS = ['change-me', 'secret', 'password', 'flowa-jwt', 'flowa-encryption'];
  const jwtSecret = process.env.JWT_SECRET || '';
  const encKey = process.env.ENCRYPTION_KEY || '';
  if (!jwtSecret || BAD_SECRETS.some(s => jwtSecret.toLowerCase().includes(s))) {
    logger.error('FATAL: JWT_SECRET must be set to a cryptographically random value in production');
    process.exit(1);
  }
  if (!encKey || BAD_SECRETS.some(s => encKey.toLowerCase().includes(s))) {
    logger.error('FATAL: ENCRYPTION_KEY must be set to a cryptographically random value in production');
    process.exit(1);
  }
  if (jwtSecret.length < 32) {
    logger.error('FATAL: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ── Security headers ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Managed by frontend nginx
}));

// ── CORS ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing — reduced limit, no urlencoded (API is JSON-only) ──
app.use(express.json({ limit: '1mb' }));

// ── Rate limiters ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP attempts, please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

// Apply auth rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth/verify-otp', otpLimiter);

// Apply general API rate limiting
app.use('/api/', apiLimiter);

// ── Request logging ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/health')) {
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// ── Health checks — public liveness/readiness, protected metrics ──
app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (req, res) => {
  try {
    const { query } = require('./db');
    await query('SELECT 1');
    res.json({ status: 'ready', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});
// Metrics endpoint — admin only
app.get('/health/metrics', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { query } = require('./db');
  try {
    const [users, workflows, executions] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM workflows'),
      query('SELECT COUNT(*) FROM executions')
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      workflows: parseInt(workflows.rows[0].count),
      executions: parseInt(executions.rows[0].count),
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: 'Metrics unavailable' });
  }
});

// ── API routes ──
app.use('/api/auth', authRoutes);
app.use('/api/workspaces/:wid/workflows', workflowRoutes);
app.use('/api/workspaces/:wid/executions', executionRoutes);
app.use('/api/workspaces/:wid/workflows', versionRoutes);
app.use('/api/workspaces/:wid/ai', aiRoutes);
app.use('/api/nodes', nodeRoutes);

// ── Webhook endpoint ──
app.all('/webhook/:path', async (req, res) => {
  try {
    const { query } = require('./db');
    const result = await query(
      'SELECT w.*, wf.workspace_id FROM webhooks w JOIN workflows wf ON w.workflow_id = wf.id WHERE w.path = $1 AND w.is_active = true',
      [req.params.path]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    const webhook = result.rows[0];
    if (webhook.method && webhook.method !== 'ANY' && webhook.method !== req.method) {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    const { addExecutionJob } = require('./services/queue');
    const jobId = await addExecutionJob({
      workflowId: webhook.workflow_id,
      workspaceId: webhook.workspace_id,
      triggerType: 'webhook',
      triggerPayload: {
        body: req.body,
        headers: req.headers,
        query: req.query,
        method: req.method,
        path: req.params.path
      }
    });
    res.json({ success: true, executionId: jobId });
  } catch (err) {
    logger.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler — never leak stack traces in production ──
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ── Start server ──
async function start() {
  try {
    await initDb();
  } catch (err) {
    logger.error('Fatal: cannot connect to database:', err.message);
    process.exit(1);
  }

  let redisOk = false;
  try {
    await initRedis();
    redisOk = true;
  } catch (err) {
    logger.warn('Redis unavailable — real-time collaboration and job queue disabled:', err.message);
    logger.warn('Start Redis to enable these features.');
  }

  try {
    await initEmail();
  } catch (err) {
    logger.warn('Email service unavailable:', err.message);
  }

  const wsManager = initWebSocket(server);
  if (redisOk) {
    try {
      wsManager.initRedisSubscriber();
    } catch (err) {
      logger.warn('WebSocket Redis subscriber failed:', err.message);
    }
  }

  server.listen(PORT, () => {
    logger.info(`🚀 Flowa backend running on port ${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!redisOk) logger.warn('   ⚠  Redis offline — real-time features disabled');
  });
}

start();

module.exports = { app, server };

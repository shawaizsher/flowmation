require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const logger = require('./utils/logger');
const { initDb } = require('./db');
const { initRedis, isRedisAvailable } = require('./db/redis');
const { initWebSocket } = require('./services/websocket');
const { initEmail } = require('./services/email');

const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const executionRoutes = require('./routes/executions');
const versionRoutes = require('./routes/versions');
const aiRoutes = require('./routes/ai');
const nodeRoutes = require('./routes/nodes');
const collaborationRoutes = require('./routes/collaboration');
const adminRoutes = require('./routes/admin');
const ragRoutes = require('./routes/rag');
const approvalRoutes = require('./routes/approvals');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ── Middleware ──
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// ── Health checks ──
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
app.get('/health/metrics', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// ── API routes ──
app.use('/api/auth', authRoutes);
app.use('/api/workspaces/:wid/workflows', workflowRoutes);
app.use('/api/workspaces/:wid/executions', executionRoutes);
app.use('/api/workspaces/:wid/workflows', versionRoutes);
app.use('/api/workspaces/:wid/ai', aiRoutes);
app.use('/api/workspaces/:wid/collaboration', collaborationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/approve', approvalRoutes);

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

// ── Error handler ──
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
    await initRedis();
    await initEmail();
    const wsManager = initWebSocket(server);
    if (isRedisAvailable()) {
      wsManager.initRedisSubscriber();
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Fluxion backend running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server };

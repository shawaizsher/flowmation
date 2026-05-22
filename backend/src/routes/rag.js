const express = require('express');
const router = express.Router();
const { ingest, buildKnowledgeBase, query, loadStore } = require('../services/rag');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/rag/ingest - rebuild the local knowledge base.
router.post('/ingest', authenticate, async (req, res) => {
  try {
    const docs = buildKnowledgeBase();
    const count = await ingest(docs);
    res.json({ success: true, message: `Knowledge base ready with ${count} documents` });
  } catch (err) {
    logger.error('[RAG ingest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rag/status - how many docs are indexed.
router.get('/status', authenticate, async (req, res) => {
  const store = loadStore();
  const byType = store.reduce((acc, doc) => {
    const type = doc.metadata?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  res.json({ indexed: store.length, ready: store.length > 0, byType });
});

// POST /api/rag/chat - chatbox query.
router.post('/chat', authenticate, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const result = await query(message, history, 'chat');
    res.json(result);
  } catch (err) {
    logger.error('[RAG chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rag/generate - workflow generation from natural language.
router.post('/generate', authenticate, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const result = await query(message, history, 'workflow');
    res.json(result);
  } catch (err) {
    logger.error('[RAG generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

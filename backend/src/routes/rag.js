const express = require('express');
const router = express.Router();
const { ingest, buildKnowledgeBase, query, loadStore } = require('../services/rag');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/rag/ingest  — build & embed the knowledge base
router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    const docs = buildKnowledgeBase();
    const count = await ingest(docs);
    res.json({ success: true, message: `Knowledge base ready with ${count} documents` });
  } catch (err) {
    logger.error('[RAG ingest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rag/status  — how many docs are indexed
router.get('/status', authenticateToken, async (req, res) => {
  const store = loadStore();
  res.json({ indexed: store.length, ready: store.length > 0 });
});

// POST /api/rag/chat  — chatbox query
router.post('/chat', authenticateToken, async (req, res) => {
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

// POST /api/rag/generate  — workflow generation from natural language
router.post('/generate', authenticateToken, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    const result = await query(message, history, 'workflow');
    // Try to parse the workflow JSON out of the response
    let workflow = null;
    try {
      const match = result.response.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
      if (match) workflow = JSON.parse(match[0]);
    } catch {}
    res.json({ ...result, workflow });
  } catch (err) {
    logger.error('[RAG generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

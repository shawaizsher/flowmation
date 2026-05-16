/**
 * Node Suggestion ML Service
 * ──────────────────────────
 * Algorithm: Co-occurrence + Directed-Transition Matrix with IDF weighting
 *
 * Intuition (same idea as collaborative filtering):
 *   - If node A and node B frequently appear in the same workflow → high co-occurrence
 *   - If node A frequently connects *directly* to node B via an edge → high transition score
 *   - Common nodes that appear in almost every workflow (e.g. console_log) are
 *     down-weighted via an IDF term so rare-but-useful nodes surface instead
 *
 * Score(candidate X | current nodes Q):
 *   co_occ  = Σ(q ∈ Q) C[q][X]                  ← co-occurrence count
 *   trans   = Σ(q ∈ Q) T[q][X]                  ← directed edge count
 *   idf     = log((N+1) / (F[X]+1))              ← penalise ubiquitous nodes
 *   score   = (co_occ + 2·trans) · idf / N       ← normalised final score
 *
 * The matrix is rebuilt from the DB at most once every 5 minutes (lazy cache).
 */

const { query } = require('../db');
const logger    = require('../utils/logger');

// ── In-memory cache ──────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let   _cache       = null;
let   _cacheAt     = 0;

// ── Default suggestions when there is no training data yet ───────────────────
const COLD_START_DEFAULTS = [
  { type: 'trigger_webhook',  reason: 'Most workflows start with a Webhook trigger' },
  { type: 'http_request',     reason: 'HTTP Request is the most versatile integration node' },
  { type: 'ai_prompt',        reason: 'AI nodes are widely used for processing and enrichment' },
  { type: 'if_condition',     reason: 'Branching logic is used in most real-world workflows' },
  { type: 'send_email',       reason: 'Email notification is a common workflow output' },
];

// ── Parse a workflow graph safely ────────────────────────────────────────────
function parseGraph(raw) {
  if (!raw) return { nodes: [], edges: [] };
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return { nodes: [], edges: [] }; }
  }
  return raw;
}

function nodeType(node) {
  return (node?.data?.type || node?.type || '').trim().toLowerCase();
}

// ── Build / refresh the matrix ───────────────────────────────────────────────
async function buildMatrix() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache;

  try {
    const rows = await query(
      'SELECT graph FROM workflows WHERE graph IS NOT NULL',
      []
    );

    // co[typeA][typeB] = # workflows containing both A and B
    const co   = {};
    // tr[typeA][typeB] = # directed edges A→B across all workflows
    const tr   = {};
    // freq[type]       = # workflows containing type
    const freq = {};
    const N = rows.rows.length;

    for (const row of rows.rows) {
      const graph = parseGraph(row.graph);
      if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) continue;

      // Unique types in this workflow
      const types = [...new Set(graph.nodes.map(nodeType).filter(Boolean))];

      // Frequency
      for (const t of types) freq[t] = (freq[t] || 0) + 1;

      // Co-occurrence (symmetric)
      for (let i = 0; i < types.length; i++) {
        for (let j = 0; j < types.length; j++) {
          if (i === j) continue;
          if (!co[types[i]]) co[types[i]] = {};
          co[types[i]][types[j]] = (co[types[i]][types[j]] || 0) + 1;
        }
      }

      // Directed transitions along edges
      if (Array.isArray(graph.edges)) {
        for (const edge of graph.edges) {
          const srcNode = graph.nodes.find(n => n.id === edge.source);
          const tgtNode = graph.nodes.find(n => n.id === edge.target);
          const src = srcNode ? nodeType(srcNode) : '';
          const tgt = tgtNode ? nodeType(tgtNode) : '';
          if (src && tgt && src !== tgt) {
            if (!tr[src]) tr[src] = {};
            tr[src][tgt] = (tr[src][tgt] || 0) + 1;
          }
        }
      }
    }

    _cache  = { co, tr, freq, N };
    _cacheAt = now;
    logger.info(`[NodeSuggestions] Matrix built from ${N} workflows`);
    return _cache;
  } catch (err) {
    logger.error('[NodeSuggestions] Matrix build error:', err);
    return { co: {}, tr: {}, freq: {}, N: 0 };
  }
}

// ── Invalidate cache (call after a workflow is saved/deleted) ────────────────
function invalidateCache() {
  _cacheAt = 0;
}

// ── Main scoring function ────────────────────────────────────────────────────
/**
 * @param {string[]} currentTypes  – node types already in the canvas
 * @param {string[]} allTypes      – every possible node type (from registry / catalog)
 * @param {number}   topK          – how many results to return
 * @returns {Promise<{type:string, score:number, reason:string}[]>}
 */
async function suggest(currentTypes, allTypes, topK = 5) {
  const clean = currentTypes.map(t => t.trim().toLowerCase()).filter(Boolean);

  const { co, tr, freq, N } = await buildMatrix();

  // Cold-start: not enough data → return hand-crafted defaults filtered to
  // exclude types already in the workflow
  if (N < 3) {
    return COLD_START_DEFAULTS
      .filter(d => !clean.includes(d.type))
      .slice(0, topK)
      .map(d => ({ ...d, score: 1 }));
  }

  // Score every candidate type not already in the workflow
  const candidates = allTypes
    .map(t => t.toLowerCase())
    .filter(t => t && !clean.includes(t));

  const scored = candidates.map(candidate => {
    let coScore  = 0;
    let trScore  = 0;

    for (const cur of clean) {
      coScore += co[cur]?.[candidate] || 0;
      trScore += tr[cur]?.[candidate] || 0;
    }

    // IDF: log((N+1)/(freq+1)) — suppresses extremely common nodes
    const f   = freq[candidate] || 0;
    const idf = Math.log((N + 1) / (f + 1));

    const rawScore = (coScore + 2 * trScore) * idf / N;

    // Build a human-readable reason
    let reason = '';
    if (trScore > coScore) {
      reason = `Directly follows ${clean[0] || 'selected nodes'} in ${Math.round(trScore)} workflow${trScore !== 1 ? 's' : ''}`;
    } else if (coScore > 0) {
      reason = `Appears alongside your current nodes in ${Math.round(coScore)} workflow${coScore !== 1 ? 's' : ''}`;
    } else {
      reason = 'Frequently used in similar workflows';
    }

    return { type: candidate, score: rawScore, coScore, trScore, reason };
  });

  // Sort descending, return top K with score > 0
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ type, score, reason }) => ({ type, score: Math.round(score * 1000) / 1000, reason }));
}

module.exports = { suggest, invalidateCache, buildMatrix };

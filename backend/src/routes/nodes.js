const express = require('express');
const registry = require('../nodes/registry');

const router = express.Router();

// ── GET /api/nodes ──
router.get('/', (req, res) => {
  const nodes = registry.getAll();

  const nodeList = Object.entries(nodes).map(([type, def]) => ({
    type,
    label: def.label,
    description: def.description,
    category: def.category,
    icon: def.icon,
    inputs: def.inputs || [],
    outputs: def.outputs || [],
    configSchema: def.configSchema || {}
  }));

  // Group by category
  const categories = {};
  nodeList.forEach(node => {
    if (!categories[node.category]) {
      categories[node.category] = [];
    }
    categories[node.category].push(node);
  });

  res.json({ nodes: nodeList, categories });
});

module.exports = router;

const { query } = require('../db');
const registry = require('../nodes/registry');
const logger = require('../utils/logger');

/**
 * Walk a value down a sequence of "parts" (e.g. ['body', 'price'] or ['items[0]', 'name']).
 * Supports object property access and array indexing via `key[N]`.
 */
function walkPath(value, parts) {
  for (const raw of parts) {
    if (value == null) return value;
    const arrayMatch = raw.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      value = value[arrayMatch[1]];
      if (Array.isArray(value)) value = value[parseInt(arrayMatch[2], 10)];
    } else {
      value = value[raw];
    }
  }
  return value;
}

/**
 * Split a token path into segments. Handles n8n-style `$node["Some Label"].json.field`
 * by extracting the bracketed quoted name first.
 *  - 'trigger.body.foo'                              → ['trigger', 'body', 'foo']
 *  - '$node["My Webhook"].json.price'                → ['$node:My Webhook', 'json', 'price']
 *  - '$json.field'                                   → ['$json', 'field']
 *  - 'nodeId123.field.sub'                           → ['nodeId123', 'field', 'sub']
 */
function tokenizePath(path) {
  const trimmed = path.trim();
  // n8n-style: $node["..."].rest...
  const m = trimmed.match(/^\$node\[(['"])(.+?)\1\]\.?(.*)$/);
  if (m) {
    const label = m[2];
    const rest = m[3] ? m[3].split('.').filter(Boolean) : [];
    return [`$node:${label}`, ...rest];
  }
  return trimmed.split('.');
}

/**
 * Resolve a single `{{...}}` token against the execution context.
 * Returns the resolved value (any type) or undefined when the path doesn't exist.
 */
function resolveToken(rawPath, context) {
  const outputsByLabel = context.outputsByLabel || {};
  const currentInput  = context.currentInput || {};
  const parts = tokenizePath(rawPath);
  if (!parts.length) return undefined;
  const head = parts[0];
  const tail = parts.slice(1);

  if (head === 'trigger') {
    return walkPath(context.triggerPayload, tail);
  }
  if (head === '$json') {
    const firstBucket = Object.values(currentInput)[0];
    return walkPath(firstBucket, tail);
  }
  if (head.startsWith('$node:')) {
    const label = head.slice('$node:'.length);
    // Primary lookup: outputsByLabel (populated as nodes complete)
    let nodeOut = outputsByLabel[label];
    // Fallback 1: case-insensitive label match
    if (nodeOut === undefined) {
      const lowerLabel = label.toLowerCase();
      const matchKey = Object.keys(outputsByLabel).find((k) => k.toLowerCase() === lowerLabel);
      if (matchKey) nodeOut = outputsByLabel[matchKey];
    }
    // Fallback 2: scan the workflow's nodes for a matching label, then look up by id
    if (nodeOut === undefined && Array.isArray(context.nodes)) {
      const match = context.nodes.find((n) => {
        const l = n.data?.label;
        return l && (l === label || l.toLowerCase() === label.toLowerCase());
      });
      if (match) nodeOut = context.nodeOutputs[match.id];
    }
    // Fallback 3: maybe the user typed the node id instead of label
    if (nodeOut === undefined && context.nodeOutputs[label] !== undefined) {
      nodeOut = context.nodeOutputs[label];
    }
    if (nodeOut === undefined) {
      logger.warn(`[resolver] No output found for $node["${label}"]. Available labels: ${Object.keys(outputsByLabel).join(', ') || '(none)'}`);
    }
    // Skip the optional "json"/"body" namespace
    const skip = (tail[0] === 'json' || tail[0] === 'body') ? 1 : 0;
    return walkPath(nodeOut, tail.slice(skip));
  }
  // Legacy: nodeId.field.nestedField
  return walkPath(context.nodeOutputs[head], tail);
}

/**
 * Replace all `{{...}}` tokens inside a string. If the entire string is a
 * single token and the resolved value is an object/array, return the value
 * directly so structured data flows through unchanged.
 */
function interpolateString(str, context) {
  const tokenRe = /\{\{([^}]+)\}\}/g;

  // Whole-string-is-a-single-token → return raw value (preserve type)
  const wholeMatch = str.match(/^\{\{([^}]+)\}\}$/);
  if (wholeMatch) {
    const v = resolveToken(wholeMatch[1], context);
    if (v === undefined) logger.warn(`[resolver] token "${wholeMatch[1]}" resolved to undefined`);
    return v === undefined || v === null ? '' : v;
  }

  return str.replace(tokenRe, (_m, raw) => {
    const v = resolveToken(raw, context);
    if (v === undefined) {
      logger.warn(`[resolver] token "${raw}" resolved to undefined`);
      return '';
    }
    if (v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

/**
 * Resolve variable interpolation throughout a config object. Walks the object
 * recursively and replaces `{{...}}` tokens in every string value. Avoids the
 * JSON.stringify/parse hack so n8n-style tokens with embedded quotes
 * (e.g. {{$node["Parse JSON"].json.price}}) work correctly.
 *
 * Supported syntaxes:
 *   {{trigger.field.sub}}                — webhook/manual trigger payload
 *   {{nodeId.field}}                     — upstream node output (by id)
 *   {{$node["My Webhook"].json.price}}   — n8n-style by label
 *   {{$node["My Webhook"].body.foo}}     — alias for .json.foo
 *   {{$json.field}}                      — current node's input
 */
function resolveVariables(config, context) {
<<<<<<< Updated upstream
  let str = JSON.stringify(config);

  // Build label→id map so expressions like {{ My Node.field }} resolve correctly
  const labelToId = {};
  if (context.nodes) {
    for (const n of context.nodes) {
      const label = n.data?.label || n.id;
      labelToId[label] = n.id;
    }
  }

  str = str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split('.');
    let value;

    if (parts[0] === 'trigger') {
      value = context.triggerPayload;
      for (let i = 1; i < parts.length; i++) {
        if (value == null) break;
        const arrayMatch = parts[i].match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]];
          if (Array.isArray(value)) value = value[parseInt(arrayMatch[2])];
        } else {
          value = value[parts[i]];
        }
      }
    } else {
      // Resolve first segment: try exact nodeId, then label→id, then label with spaces
      // (labels can contain spaces, e.g. "JSON Parse" → parts[0]="JSON Parse" after trim)
      // Re-join until we find a match since the label may contain dots... but dots are rare.
      let nodeId = null;
      let fieldStart = 1;

      // Try progressively longer prefixes to handle labels with spaces reconstructed from dot-split
      for (let end = parts.length; end >= 1; end--) {
        const candidate = parts.slice(0, end).join('.');
        if (context.nodeOutputs[candidate] !== undefined) {
          nodeId = candidate;
          fieldStart = end;
          break;
        }
        if (labelToId[candidate] && context.nodeOutputs[labelToId[candidate]] !== undefined) {
          nodeId = labelToId[candidate];
          fieldStart = end;
          break;
        }
      }

      if (nodeId === null) {
        // Last resort: first part as nodeId
        nodeId = labelToId[parts[0]] || parts[0];
        fieldStart = 1;
      }

      value = context.nodeOutputs[nodeId];
      for (let i = fieldStart; i < parts.length; i++) {
        if (value == null) break;
        const arrayMatch = parts[i].match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]];
          if (Array.isArray(value)) value = value[parseInt(arrayMatch[2])];
        } else {
          value = value[parts[i]];
        }
      }
=======
  const walk = (val) => {
    if (val == null) return val;
    if (typeof val === 'string') return interpolateString(val, context);
    if (Array.isArray(val)) return val.map(walk);
    if (typeof val === 'object') {
      const out = {};
      for (const k of Object.keys(val)) out[k] = walk(val[k]);
      return out;
>>>>>>> Stashed changes
    }
    return val;
  };
  return walk(config);
}

/**
 * Build adjacency and in-degree maps from edges
 */
function buildGraph(nodes, edges) {
  const adjacency = {}; // nodeId → [{ target, condition? }]
  const inDegree = {};

  nodes.forEach(n => {
    adjacency[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach(e => {
    adjacency[e.source] = adjacency[e.source] || [];
    adjacency[e.source].push({
      target: e.target,
      condition: e.data?.condition || null
    });
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  });

  return { adjacency, inDegree };
}

/**
 * Find trigger/starting nodes
 */
function isTriggerType(type) {
  return type.endsWith('Trigger') || type.startsWith('trigger_');
}

function findTriggerNodes(nodes, inDegree) {
  const type = n => n.data?.type || n.type || '';
  // Find actual trigger nodes first
  const triggers = nodes.filter(n => isTriggerType(type(n)));
  // If no explicit triggers, use root nodes (inDegree 0) as entry points
  if (triggers.length > 0) return triggers;
  return nodes.filter(n => inDegree[n.id] === 0);
}

/**
 * Evaluate a condition on an edge
 */
function evaluateCondition(condition, context) {
  if (!condition) return true;
  try {
    // Simple field-based condition: { field, operator, value }
    const { field, operator, value } = condition;
    const parts = field.split('.');
    let actual = context.nodeOutputs;
    for (const p of parts) {
      if (actual == null) return false;
      actual = actual[p];
    }

    switch (operator) {
      case 'equals': return actual == value;
      case 'not_equals': return actual != value;
      case 'contains': return String(actual).includes(value);
      case 'greater_than': return Number(actual) > Number(value);
      case 'less_than': return Number(actual) < Number(value);
      case 'exists': return actual !== undefined && actual !== null;
      case 'truthy': return !!actual;
      default: return true;
    }
  } catch {
    return true;
  }
}

/**
 * Execute a single workflow
 */
async function executeWorkflow(executionId, workflowId, triggerPayload = {}, wsManager = null, credentials = {}) {
  const startTime = Date.now();
  let executionStatus = 'success';
  let executionError = null;

  try {
    // Load workflow
    const wfResult = await query('SELECT * FROM workflows WHERE id = $1', [workflowId]);
    if (wfResult.rows.length === 0) throw new Error('Workflow not found');

    const workflow = wfResult.rows[0];
    const graph = typeof workflow.graph === 'string' ? JSON.parse(workflow.graph) : workflow.graph;
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    if (nodes.length === 0) throw new Error('Workflow has no nodes');

    // Update execution as running
    await query(
      "UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1",
      [executionId]
    );

    // Broadcast execution started
    if (wsManager) {
      wsManager.broadcastToWorkspace(workflow.workspace_id, {
        type: 'execution_started',
        executionId,
        workflowId
      });
    }

    // Build graph structures
    const { adjacency, inDegree } = buildGraph(nodes, edges);

    // Context holds all node outputs (by id AND by label for n8n-style refs)
    const context = {
      triggerPayload,
      nodeOutputs: {},
      outputsByLabel: {},
      currentInput: {},
      nodes,  // for label→id resolver fallback
      executionId,
      workflowId,
      credentials,
      nodes  // needed by resolveVariables to map labels → IDs
    };

    // Track completion
    const completed = new Set();
    const skipped = new Set();
    const failed = new Set();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Find trigger nodes and seed them; queue non-trigger root nodes to run in BFS
    const triggerNodes = nodes.filter(n => isTriggerType(n.data?.type || n.type || ''));
    const rootNodes = nodes.filter(n => inDegree[n.id] === 0 && !isTriggerType(n.data?.type || n.type || ''));

    // Seed triggers with payload
    for (const trigger of triggerNodes) {
      context.nodeOutputs[trigger.id] = triggerPayload;
      const triggerLabel = trigger.data?.label;
      if (triggerLabel) context.outputsByLabel[triggerLabel] = triggerPayload;
      completed.add(trigger.id);

      // Log trigger execution
      await query(
        `INSERT INTO node_logs (execution_id, node_id, node_type, node_label, status, input, output, started_at, finished_at, duration_ms)
         VALUES ($1, $2, $3, $4, 'success', $5, $6, NOW(), NOW(), 0)`,
        [executionId, trigger.id, trigger.data?.type || trigger.type,
         trigger.data?.label || 'Trigger', JSON.stringify(triggerPayload),
         JSON.stringify(triggerPayload)]
      );

      if (wsManager) {
        wsManager.broadcastToWorkspace(workflow.workspace_id, {
          type: 'node_finished',
          executionId,
          nodeId: trigger.id,
          status: 'success',
          output: triggerPayload,
          durationMs: 0
        });
      }
    }

    // BFS execution loop
    let iteration = 0;
    const MAX_ITERATIONS = 100;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      // Find ready nodes: all incoming edges are from completed/skipped nodes,
      // or root nodes with no incoming edges (non-trigger entry points)
      const readyNodes = nodes.filter(n => {
        if (completed.has(n.id) || skipped.has(n.id) || failed.has(n.id)) return false;

        // Check all nodes that point to this node
        const incomingEdges = edges.filter(e => e.target === n.id);

        // Root nodes with no incoming edges are ready immediately
        if (incomingEdges.length === 0) return true;

        return incomingEdges.every(e =>
          completed.has(e.source) || skipped.has(e.source) || failed.has(e.source)
        );
      });

      if (readyNodes.length === 0) break;

      // Execute ready nodes in parallel
      await Promise.all(readyNodes.map(async (node) => {
        const nodeType = node.data?.type || node.type;
        const nodeLabel = node.data?.label || nodeType;
        const nodeConfig = node.data?.config || {};
        const nodeStartTime = Date.now();

        // Check conditional edges leading to this node
        const incomingEdges = edges.filter(e => e.target === node.id);
        const shouldSkip = incomingEdges.some(e => {
          if (e.data?.condition && !evaluateCondition(e.data.condition, context)) {
            return true;
          }
          return false;
        });

        if (shouldSkip) {
          skipped.add(node.id);
          await query(
            `INSERT INTO node_logs (execution_id, node_id, node_type, node_label, status, started_at, finished_at)
             VALUES ($1, $2, $3, $4, 'skipped', NOW(), NOW())`,
            [executionId, node.id, nodeType, nodeLabel]
          );
          return;
        }

        // Gather input from upstream nodes
        const input = {};
        incomingEdges.forEach(e => {
          if (Object.prototype.hasOwnProperty.call(context.nodeOutputs, e.source)) {
            input[e.source] = context.nodeOutputs[e.source];
          }
        });

        // For root non-trigger nodes, expose execution trigger payload as input.
        if (incomingEdges.length === 0 && triggerPayload && Object.keys(triggerPayload).length > 0) {
          input.trigger = triggerPayload;
        }

        // Create node log record
        const logResult = await query(
          `INSERT INTO node_logs (execution_id, node_id, node_type, node_label, status, started_at)
           VALUES ($1, $2, $3, $4, 'running', NOW())
           RETURNING id`,
          [executionId, node.id, nodeType, nodeLabel]
        );
        const logId = logResult.rows[0].id;

        // Broadcast node started
        if (wsManager) {
          wsManager.broadcastToWorkspace(workflow.workspace_id, {
            type: 'node_started',
            executionId,
            nodeId: node.id,
            logId,
            nodeLabel,
            nodeType,
            input
          });
        }

        try {
          // Resolve variables in config — expose this node's input so {{$json.x}} works
          context.currentInput = input;
          const resolvedConfig = resolveVariables(nodeConfig, context);

          // ── Inject per-user credentials into config ──
          // If the node has a credentialId, look up the credential values
          // from the credentials map sent by the frontend
          const credentialId = node.data?.credentialId || nodeConfig?.credentialId;
          if (credentialId && credentials[credentialId]) {
            resolvedConfig._credentials = credentials[credentialId].values;
            resolvedConfig._credentialServiceId = credentials[credentialId].serviceId;
          }

          // Get handler from registry
          const handler = registry.get(nodeType);
          if (!handler) {
            logger.warn(`No handler for node type "${nodeType}" — passing input through`);
            const output = { ...input, __skipped: true, __nodeType: nodeType };
            context.nodeOutputs[node.id] = output;
            completed.add(node.id);
            await query(
              `UPDATE node_logs SET status = 'skipped', output = $1, finished_at = NOW(), duration_ms = $2
               WHERE id = $3`,
              [JSON.stringify(output), Date.now() - nodeStartTime, logId]
            );
            return;
          }

          // Execute the node (retry once on 429 rate-limit with 2s backoff)
          let output;
          try {
            output = await handler.execute({ config: resolvedConfig, input, context });
          } catch (execErr) {
            const status = execErr?.response?.status || execErr?.status;
            if (status === 429) {
              logger.warn(`Rate limited on node ${nodeType}, retrying in 3s…`);
              await new Promise(r => setTimeout(r, 3000));
              output = await handler.execute({ config: resolvedConfig, input, context });
            } else {
              throw execErr;
            }
          }

          const duration = Date.now() - nodeStartTime;

          // Store output (by id AND by label so n8n-style refs can find it)
          context.nodeOutputs[node.id] = output;
          if (nodeLabel) context.outputsByLabel[nodeLabel] = output;
          completed.add(node.id);

          // Update log
          await query(
            `UPDATE node_logs SET status = 'success', output = $1, finished_at = NOW(), duration_ms = $2, input = $3
             WHERE id = $4`,
            [JSON.stringify(output), duration, JSON.stringify(input), logId]
          );

          // Broadcast node finished
          if (wsManager) {
            wsManager.broadcastToWorkspace(workflow.workspace_id, {
              type: 'node_finished',
              executionId,
              nodeId: node.id,
              status: 'success',
              output,
              durationMs: duration
            });
          }
        } catch (err) {
          const duration = Date.now() - nodeStartTime;
          failed.add(node.id);
          executionStatus = 'failed';
          executionError = `Node "${nodeLabel}" failed: ${err.message}`;

          // Update log with failure
          await query(
            `UPDATE node_logs SET status = 'failed', error = $1, finished_at = NOW(), duration_ms = $2, input = $3
             WHERE id = $4`,
            [err.message, duration, JSON.stringify(input), logId]
          );

          // Broadcast node failed
          if (wsManager) {
            wsManager.broadcastToWorkspace(workflow.workspace_id, {
              type: 'node_failed',
              executionId,
              nodeId: node.id,
              error: err.message
            });
          }

          logger.error(`Node ${node.id} (${nodeType}) failed:`, err);
        }
      }));
    }
  } catch (err) {
    executionStatus = 'failed';
    executionError = err.message;
    logger.error(`Execution ${executionId} failed:`, err);
  }

  // Finalize execution
  const totalDuration = Date.now() - startTime;
  await query(
    `UPDATE executions SET status = $1, error = $2, finished_at = NOW(), duration_ms = $3
     WHERE id = $4`,
    [executionStatus, executionError, totalDuration, executionId]
  );

  // Broadcast execution finished
  if (wsManager) {
    try {
      const wfResult = await query('SELECT workspace_id FROM executions WHERE id = $1', [executionId]);
      if (wfResult.rows.length > 0) {
        wsManager.broadcastToWorkspace(wfResult.rows[0].workspace_id, {
          type: 'execution_finished',
          executionId,
          status: executionStatus,
          durationMs: totalDuration,
          error: executionError
        });
      }
    } catch (e) { /* non-critical */ }
  }

  logger.info(`Execution ${executionId} finished: ${executionStatus} (${totalDuration}ms)`);
  return { status: executionStatus, error: executionError, durationMs: totalDuration };
}

module.exports = { executeWorkflow, resolveVariables };

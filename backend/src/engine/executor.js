const { query } = require('../db');
const registry = require('../nodes/registry');
const logger = require('../utils/logger');

/**
 * Resolve variable interpolation in config: {{nodeId.field}} → actual value
 */
function resolveVariables(config, context) {
  let str = JSON.stringify(config);

  str = str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split('.');
    let value;

    if (parts[0] === 'trigger') {
      value = context.triggerPayload;
      for (let i = 1; i < parts.length; i++) {
        if (value == null) break;
        // Handle array access: items[0]
        const arrayMatch = parts[i].match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]];
          if (Array.isArray(value)) {
            value = value[parseInt(arrayMatch[2])];
          }
        } else {
          value = value[parts[i]];
        }
      }
    } else {
      // nodeId.field.nestedField
      const nodeId = parts[0];
      value = context.nodeOutputs[nodeId];
      for (let i = 1; i < parts.length; i++) {
        if (value == null) break;
        const arrayMatch = parts[i].match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]];
          if (Array.isArray(value)) {
            value = value[parseInt(arrayMatch[2])];
          }
        } else {
          value = value[parts[i]];
        }
      }
    }

    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });

  try {
    return JSON.parse(str);
  } catch {
    return config;
  }
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
function findTriggerNodes(nodes, inDegree) {
  return nodes.filter(n =>
    (n.data?.type || n.type || '').endsWith('Trigger') || inDegree[n.id] === 0
  );
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
async function executeWorkflow(executionId, workflowId, triggerPayload = {}, wsManager = null) {
  const startTime = Date.now();
  let executionStatus = 'success';
  let executionError = null;

  try {
    // Load workflow
    const wfResult = await query('SELECT * FROM workflows WHERE id = $1', [workflowId]);
    if (wfResult.rows.length === 0) throw new Error('Workflow not found');

    const workflow = wfResult.rows[0];
    const graph = workflow.graph;
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    if (nodes.length === 0) throw new Error('Workflow has no nodes');

    // Update execution as running
    await query(
      "UPDATE executions SET status = 'running', started_at = GETDATE() WHERE id = $1",
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

    // Context holds all node outputs
    const context = {
      triggerPayload,
      nodeOutputs: {},
      executionId,
      workflowId
    };

    // Track completion
    const completed = new Set();
    const skipped = new Set();
    const failed = new Set();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Find trigger nodes and seed them
    const triggers = findTriggerNodes(nodes, inDegree);
    for (const trigger of triggers) {
      context.nodeOutputs[trigger.id] = triggerPayload;
      completed.add(trigger.id);

      // Log trigger execution
      await query(
        `INSERT INTO node_logs (execution_id, node_id, node_type, node_label, status, input, output, started_at, finished_at, duration_ms)
         VALUES ($1, $2, $3, $4, 'success', $5, $6, GETDATE(), GETDATE(), 0)`,
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

      // Find ready nodes: all incoming edges are from completed/skipped nodes
      const readyNodes = nodes.filter(n => {
        if (completed.has(n.id) || skipped.has(n.id) || failed.has(n.id)) return false;

        // Check all nodes that point to this node
        const incomingEdges = edges.filter(e => e.target === n.id);
        if (incomingEdges.length === 0) return false;

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
             VALUES ($1, $2, $3, $4, 'skipped', GETDATE(), GETDATE())`,
            [executionId, node.id, nodeType, nodeLabel]
          );
          return;
        }

        // Create node log record
        const logResult = await query(
          `INSERT INTO node_logs (execution_id, node_id, node_type, node_label, status, started_at)
           OUTPUT INSERTED.id
           VALUES ($1, $2, $3, $4, 'running', GETDATE())`,
          [executionId, node.id, nodeType, nodeLabel]
        );
        const logId = logResult.rows[0].id;

        // Broadcast node started
        if (wsManager) {
          wsManager.broadcastToWorkspace(workflow.workspace_id, {
            type: 'node_started',
            executionId,
            nodeId: node.id,
            logId
          });
        }

        try {
          // Resolve variables in config
          const resolvedConfig = resolveVariables(nodeConfig, context);

          // Gather input from upstream nodes
          const input = {};
          incomingEdges.forEach(e => {
            if (context.nodeOutputs[e.source]) {
              input[e.source] = context.nodeOutputs[e.source];
            }
          });

          // Get handler from registry
          const handler = registry.get(nodeType);
          if (!handler) {
            throw new Error(`Unknown node type: ${nodeType}`);
          }

          // Execute the node
          const output = await handler.execute({
            config: resolvedConfig,
            input,
            context
          });

          const duration = Date.now() - nodeStartTime;

          // Store output
          context.nodeOutputs[node.id] = output;
          completed.add(node.id);

          // Update log
          await query(
            `UPDATE node_logs SET status = 'success', output = $1, finished_at = GETDATE(), duration_ms = $2, input = $3
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
            `UPDATE node_logs SET status = 'failed', error = $1, finished_at = GETDATE(), duration_ms = $2
             WHERE id = $3`,
            [err.message, duration, logId]
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
    `UPDATE executions SET status = $1, error = $2, finished_at = GETDATE(), duration_ms = $3
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

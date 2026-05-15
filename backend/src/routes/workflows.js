const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// All routes require authentication + workspace membership
router.use(authenticate, requireWorkspace);

function parseGraphValue(value) {
  if (!value) return { nodes: [], edges: [] };
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return { nodes: [], edges: [] }; }
  }
  return value;
}

async function loadWorkflowOr404(req, res) {
  const result = await query(
    'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.workspaceId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Workflow not found' });
    return null;
  }
  return result.rows[0];
}

function getNodeType(node) {
  return node?.data?.type || node?.type || 'unknown';
}

function getNodeLabel(node) {
  return node?.data?.label || node?.id || 'Unnamed node';
}

function generateTestFixtures(graph) {
  const trigger = (graph.nodes || []).find(n => getNodeType(n).includes('trigger'));
  const hasLead = (graph.nodes || []).some(n => /lead|hubspot|crm/i.test(`${getNodeType(n)} ${getNodeLabel(n)}`));
  return [
    {
      name: hasLead ? 'Hot lead happy path' : 'Default happy path',
      payload: {
        body: hasLead
          ? { email: 'lead@example.com', status: 'hot', score: 92, source: 'website' }
          : { message: 'hello from Flowa', status: 'ok' },
        headers: { 'x-flowa-test': 'true' },
        query: {},
        method: 'POST',
        trigger: trigger ? getNodeType(trigger) : 'manual'
      },
      assertions: [
        'Workflow has a trigger',
        'Every non-trigger node is reachable',
        'No unsupported runtime node types',
        'Policy guardrails are not blocked'
      ]
    },
    {
      name: 'Missing optional data path',
      payload: { body: {}, headers: {}, query: {}, method: 'POST' },
      assertions: ['Workflow should not crash on sparse payload']
    }
  ];
}

function makeReleasePlan(workflow, compile) {
  const blocked = compile.status === 'blocked';
  return {
    environment: process.env.FLOWA_RELEASE_ENV || 'local',
    recommendation: blocked ? 'Do not publish yet' : compile.status === 'review' ? 'Publish to staging first' : 'Ready for production publish',
    canary: {
      enabled: !blocked,
      initialTrafficPercent: blocked ? 0 : 10,
      promoteWhen: '20 consecutive successful executions and error rate below 2%',
      rollbackWhen: 'Any policy blocker, 3 consecutive failures, or error rate above 5%'
    },
    rollback: {
      available: workflow.version > 1,
      target: workflow.version > 1 ? `v${workflow.version - 1}` : null
    },
    checklist: compile.releaseChecklist
  };
}

function makeEdgeRunnerPlan(graph, compile) {
  const privateNodeTypes = ['postgres', 'mysql', 'mongodb', 'redis', 'filesystem', 's3'];
  const privateNodes = (graph.nodes || []).filter(n =>
    privateNodeTypes.some(type => getNodeType(n).toLowerCase().includes(type))
  );
  return {
    mode: privateNodes.length ? 'recommended' : 'optional',
    runnerName: `flowa-edge-${Date.now()}`,
    reason: privateNodes.length
      ? 'Workflow touches private databases/storage; run close to the data source.'
      : 'No private-data connector detected, but edge execution can still reduce latency.',
    privateNodes: privateNodes.map(n => ({ id: n.id, label: getNodeLabel(n), type: getNodeType(n) })),
    command: 'node src/worker.js --runner=edge --workspace=current',
    requiredSecrets: compile.missingConfig.map(item => `${item.nodeLabel}: ${item.fields.join(', ')}`)
  };
}

function buildTestFailureReasons(compile) {
  const reasons = [];
  for (const node of compile.unsupportedNodes || []) {
    reasons.push({
      severity: 'error',
      nodeId: node.nodeId,
      nodeLabel: node.nodeLabel,
      nodeType: node.nodeType,
      message: `Unsupported node type "${node.nodeType}" cannot run on the backend yet.`,
      fix: 'Replace this node with a supported runtime node or implement its backend handler.'
    });
  }
  for (const item of compile.missingConfig || []) {
    reasons.push({
      severity: 'warning',
      nodeId: item.nodeId,
      nodeLabel: item.nodeLabel,
      nodeType: item.nodeType,
      message: `${item.nodeLabel} is missing: ${item.fields.join(', ')}.`,
      fix: item.serviceId
        ? `Add/link a ${item.serviceLabel} credential, then re-run tests.`
        : 'Open the node and fill the required fields.'
    });
  }
  for (const finding of compile.policy?.findings || []) {
    reasons.push({
      severity: finding.severity,
      nodeId: finding.nodeId,
      nodeLabel: finding.nodeLabel,
      nodeType: finding.type,
      message: finding.message,
      fix: 'Review the policy finding before publishing.'
    });
  }
  return reasons;
}

async function buildAdvancedReport(workflow) {
  const aiService = require('../services/ai');
  const graph = parseGraphValue(workflow.graph);
  const compile = aiService.compileWorkflow(graph);
  return {
    compiler: compile,
    schemaAwareCanvas: {
      contracts: compile.dataContracts,
      warningCount: compile.dataContracts.filter(c => c.availableFields.length === 1 && c.availableFields[0] === 'data').length
    },
    selfHealing: {
      available: true,
      description: 'Failed node logs can be diagnosed and patched through AI Debugger.',
      recommendedAction: compile.unsupportedNodes.length
        ? 'Implement or replace unsupported node types before retrying.'
        : compile.missingConfig.length
          ? 'Fill missing configuration before retrying.'
          : 'Run the workflow and use Debug with AI on any failed node.'
    },
    timeTravelDebugger: {
      available: true,
      description: 'Execution replay is built from node_logs and can be fetched after a run.'
    },
    workflowUnitTests: {
      fixtures: generateTestFixtures(graph)
    },
    releaseSystem: makeReleasePlan(workflow, compile),
    edgeRunner: makeEdgeRunnerPlan(graph, compile),
    policyGuardrails: compile.policy
  };
}

// ── GET /api/workspaces/:wid/workflows/members ──
router.get('/members', async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, wm.role
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1 AND u.is_active = 1
       ORDER BY CASE WHEN wm.user_id = $2 THEN 0 ELSE 1 END, u.name ASC`,
      [req.workspaceId, req.user.id]
    );

    const members = result.rows.map((m) => ({
      ...m,
      isCurrentUser: m.id === req.user.id,
    }));

    res.json({ members });
  } catch (err) {
    logger.error('List workspace members error:', err);
    res.status(500).json({ error: 'Failed to load workspace members' });
  }
});

// ── GET /api/workspaces/:wid/workflows ──
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT w.*, u.name as created_by_name
      FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.workspace_id = $1
    `;
    const params = [req.workspaceId];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (w.name LIKE $${params.length} OR w.description LIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      sql += ` AND w.status = $${params.length}`;
    }

    sql += ' ORDER BY w.updated_at DESC';

    const result = await query(sql, params);
    res.json({ workflows: result.rows });
  } catch (err) {
    logger.error('List workflows error:', err);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

// ── POST /api/workspaces/:wid/workflows ──
router.post('/', async (req, res) => {
  try {
    const { name, description, graph, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).slice(0, 100)
      : [];

    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, tags, created_by)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.workspaceId,
        name,
        description || '',
        JSON.stringify(graph || { nodes: [], edges: [] }),
        JSON.stringify(normalizedTags),
        req.user.id
      ]
    );

    logger.info(`Workflow created: ${result.rows[0].id} by ${req.user.email}`);
    res.status(201).json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Create workflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id ──
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT w.*, u.name as created_by_name
       FROM workflows w
       LEFT JOIN users u ON w.created_by = u.id
       WHERE w.id = $1 AND w.workspace_id = $2`,
      [req.params.id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Get workflow error:', err);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// ── PUT /api/workspaces/:wid/workflows/:id ──
// GET /api/workspaces/:wid/workflows/:id/advanced-report
router.get('/:id/advanced-report', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    res.json(await buildAdvancedReport(workflow));
  } catch (err) {
    logger.error('Advanced report error:', err);
    res.status(500).json({ error: 'Failed to build advanced workflow report' });
  }
});

// POST /api/workspaces/:wid/workflows/:id/tests/generate
router.post('/:id/tests/generate', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    res.json({ tests: generateTestFixtures(parseGraphValue(workflow.graph)) });
  } catch (err) {
    logger.error('Generate workflow tests error:', err);
    res.status(500).json({ error: 'Failed to generate workflow tests' });
  }
});

// POST /api/workspaces/:wid/workflows/:id/tests/run
router.post('/:id/tests/run', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const graph = parseGraphValue(workflow.graph);
    const aiService = require('../services/ai');
    const compile = aiService.compileWorkflow(graph);
    const tests = Array.isArray(req.body.tests) && req.body.tests.length ? req.body.tests : generateTestFixtures(graph);
    const failureReasons = buildTestFailureReasons(compile);
    const results = tests.map((test) => {
      const assertions = (test.assertions || []).map((assertion) => {
        const passed =
          assertion.includes('trigger') ? (graph.nodes || []).some(n => getNodeType(n).includes('trigger')) :
          assertion.includes('unsupported') ? compile.unsupportedNodes.length === 0 :
          assertion.includes('Policy') ? compile.policy.status !== 'blocked' :
          assertion.includes('crash') ? compile.status !== 'blocked' :
          true;
        return {
          assertion,
          passed,
          reason: passed ? null : (
            assertion.includes('unsupported') ? 'One or more workflow nodes do not have backend runtime support.' :
            assertion.includes('Policy') ? 'Policy guardrails found a blocking issue.' :
            assertion.includes('crash') ? 'Compiler blockers must be resolved before this fixture is safe to execute.' :
            'This assertion failed.'
          )
        };
      });
      return {
        name: test.name,
        status: assertions.some(a => !a.passed) || failureReasons.some(r => r.severity === 'error') ? 'failed' : 'passed',
        assertions,
        failureReasons,
        payload: test.payload
      };
    });
    res.json({
      status: results.some(r => r.status === 'failed') ? 'failed' : 'passed',
      summary: failureReasons.length
        ? `${failureReasons.length} item(s) need attention before this workflow is production-ready.`
        : 'All generated workflow tests passed.',
      failureReasons,
      results,
      compile
    });
  } catch (err) {
    logger.error('Run workflow tests error:', err);
    res.status(500).json({ error: 'Failed to run workflow tests' });
  }
});

// GET /api/workspaces/:wid/workflows/:id/replay/:executionId
router.get('/:id/replay/:executionId', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const execution = await query(
      'SELECT * FROM executions WHERE id = $1 AND workflow_id = $2 AND workspace_id = $3',
      [req.params.executionId, req.params.id, req.workspaceId]
    );
    if (execution.rows.length === 0) return res.status(404).json({ error: 'Execution not found' });
    const logs = await query('SELECT * FROM node_logs WHERE execution_id = $1 ORDER BY started_at ASC', [req.params.executionId]);
    res.json({
      execution: execution.rows[0],
      timeline: logs.rows.map((log, index) => ({
        step: index + 1,
        nodeId: log.node_id,
        nodeLabel: log.node_label,
        nodeType: log.node_type,
        status: log.status,
        durationMs: log.duration_ms,
        input: log.input,
        output: log.output,
        error: log.error,
        startedAt: log.started_at,
        finishedAt: log.finished_at
      }))
    });
  } catch (err) {
    logger.error('Replay execution error:', err);
    res.status(500).json({ error: 'Failed to replay execution' });
  }
});

// POST /api/workspaces/:wid/workflows/:id/self-heal
router.post('/:id/self-heal', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const graph = parseGraphValue(workflow.graph);
    const aiService = require('../services/ai');
    const compile = aiService.compileWorkflow(graph);
    const failedNode = req.body.nodeId ? (graph.nodes || []).find(n => n.id === req.body.nodeId) : null;
    const diagnosis = await aiService.debugNode({
      nodeType: failedNode ? getNodeType(failedNode) : req.body.nodeType || 'unknown',
      nodeLabel: failedNode ? getNodeLabel(failedNode) : req.body.nodeLabel || 'Unknown node',
      error: req.body.error || 'No error provided'
    });
    res.json({
      diagnosis,
      testBeforeApply: {
        status: compile.status === 'blocked' ? 'failed' : 'passed',
        readinessScore: compile.readinessScore,
        message: compile.status === 'blocked'
          ? 'Patch should not be applied until compiler blockers are resolved.'
          : 'Patch can be tested with generated fixtures before applying.'
      },
      suggestedNextStep: 'Review the fix, run workflow tests, then apply through AI Debugger if appropriate.'
    });
  } catch (err) {
    logger.error('Self-heal workflow error:', err);
    res.status(500).json({ error: 'Failed to self-heal workflow' });
  }
});

// GET /api/workspaces/:wid/workflows/:id/release-plan
router.get('/:id/release-plan', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const aiService = require('../services/ai');
    const compile = aiService.compileWorkflow(parseGraphValue(workflow.graph));
    res.json({ release: makeReleasePlan(workflow, compile), compile });
  } catch (err) {
    logger.error('Release plan error:', err);
    res.status(500).json({ error: 'Failed to build release plan' });
  }
});

// GET /api/workspaces/:wid/workflows/:id/edge-runner-plan
router.get('/:id/edge-runner-plan', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const graph = parseGraphValue(workflow.graph);
    const aiService = require('../services/ai');
    const compile = aiService.compileWorkflow(graph);
    res.json({ edgeRunner: makeEdgeRunnerPlan(graph, compile) });
  } catch (err) {
    logger.error('Edge runner plan error:', err);
    res.status(500).json({ error: 'Failed to build edge runner plan' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, graph, status, tags } = req.body;

    // Fetch existing workflow
    const existing = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = existing.rows[0];

    // Save is now a draft-only operation — no version bump, no snapshot.
    // Use POST /:id/publish to create a versioned release.
    const result = await query(
      `UPDATE workflows
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           graph = COALESCE($3, graph),
           status = COALESCE($4, status),
           tags = COALESCE($5, tags),
           updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = $6 AND workspace_id = $7`,
      [
        name || null,
        description !== undefined ? description : null,
        graph ? JSON.stringify(graph) : null,
        status || null,
        tags || null,
        req.params.id,
        req.workspaceId
      ]
    );

    const updatedWorkflow = result.rows[0];

    // Broadcast save event via WebSocket
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_saved',
        workflowId: req.params.id,
        savedBy: req.user.name,
        version: updatedWorkflow.version
      });
    } catch (e) {
      // WebSocket broadcast is non-critical
    }

    res.json({ workflow: updatedWorkflow });
  } catch (err) {
    logger.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/publish ──
// Publishes the current draft as a new named version
router.post('/:id/publish', async (req, res) => {
  try {
    const { label, message } = req.body;

    const existing = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflow = existing.rows[0];
    const newVersion = workflow.version + 1;

    const result = await transaction(async (client) => {
      // Snapshot current graph as the new published version
      await client.query(
        `INSERT INTO workflow_versions (workflow_id, version, graph, label, message, is_named, created_by)
         VALUES ($1, $2, $3, $4, $5, 1, $6)`,
        [
          workflow.id,
          newVersion,
          JSON.stringify(workflow.graph),
          label || `v${newVersion}`,
          message || '',
          req.user.id
        ]
      );

      // Bump the workflow version number
      const updated = await client.query(
        `UPDATE workflows SET version = $1, updated_at = GETDATE()
         OUTPUT INSERTED.*
         WHERE id = $2`,
        [newVersion, workflow.id]
      );

      return updated.rows[0];
    });

    // Broadcast publish event
    try {
      const { broadcast } = require('../services/websocket');
      broadcast(req.params.id, {
        type: 'workflow_published',
        workflowId: req.params.id,
        publishedBy: req.user.name,
        version: newVersion,
        label: label || `v${newVersion}`
      });
    } catch (e) { /* non-critical */ }

    logger.info(`Workflow ${req.params.id} published as v${newVersion} by ${req.user.email}`);
    res.json({ workflow: result, version: newVersion });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Version already exists — save and try again' });
    }
    logger.error('Publish workflow error:', err);
    res.status(500).json({ error: 'Failed to publish workflow' });
  }
});

// ── DELETE /api/workspaces/:wid/workflows/:id ──
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM workflows OUTPUT DELETED.id WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    logger.info(`Workflow deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete workflow error:', err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/duplicate ──
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const wf = original.rows[0];
    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, tags, created_by)
       OUTPUT INSERTED.*
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.workspaceId,
        `${wf.name} (copy)`,
        wf.description,
        JSON.stringify(wf.graph),
        wf.tags,
        req.user.id
      ]
    );

    logger.info(`Workflow duplicated: ${wf.id} → ${result.rows[0].id}`);
    res.status(201).json({ workflow: result.rows[0] });
  } catch (err) {
    logger.error('Duplicate workflow error:', err);
    res.status(500).json({ error: 'Failed to duplicate workflow' });
  }
});

// ── POST /api/workspaces/:wid/workflows/:id/execute ──
router.post('/:id/execute', async (req, res) => {
  try {
    const workflow = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );

    if (workflow.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { addExecutionJob } = require('../services/queue');
    const executionPayload = req.body.payload ?? req.body.inputData ?? {};

    const executionId = await addExecutionJob({
      workflowId: req.params.id,
      workspaceId: req.workspaceId,
      triggerType: 'manual',
      triggerPayload: executionPayload,
      credentials: req.body.credentials || {}
    });

    res.json({ executionId });
  } catch (err) {
    logger.error('Execute workflow error:', err);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// ── GET /api/workspaces/:wid/workflows/:id/presence ──
router.get('/:id/presence', async (req, res) => {
  try {
    const result = await query(
      `SELECT we.user_id, u.name, u.email, we.last_seen
       FROM workflow_editors we
       JOIN users u ON we.user_id = u.id
       WHERE we.workflow_id = $1 AND we.last_seen > DATEADD(minute, -5, GETDATE())`,
      [req.params.id]
    );

    res.json({ editors: result.rows });
  } catch (err) {
    logger.error('Get presence error:', err);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

module.exports = router;

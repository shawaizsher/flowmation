const express = require('express');
const { query, transaction } = require('../db');
const { authenticate, requireWorkspace } = require('../middleware/auth');
const logger = require('../utils/logger');
const registry = require('../nodes/registry');
const { Client } = require('pg');
const { suggest: suggestNodes, invalidateCache } = require('../services/nodeSuggestions');

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

const WORKFLOW_TEMPLATES = [
  {
    id: 'lead-triage-demo',
    name: 'Lead Triage Demo',
    category: 'Sales',
    description: 'Webhook intake, lead filtering, summary generation, approval, and notification.',
    tags: ['demo', 'sales', 'approval'],
    setupGuide: [
      'Send a sample webhook payload with body.email, body.message, and body.priority.',
      'Review the filter condition and message templates in the editor.',
      'Optionally connect an email credential for production delivery.'
    ],
    requiredCredentials: [
      { serviceId: 'email', label: 'Email/SMTP', required: false, reason: 'Only needed if you want live external delivery instead of dev mail.' }
    ],
    graph: {
      nodes: [
        { id: 'trigger-webhook-1', type: 'trigger_webhook', position: { x: 40, y: 120 }, data: { label: 'Webhook Trigger', type: 'trigger_webhook', config: { path: '/lead-triage', method: 'POST' } } },
        { id: 'filter-high-priority', type: 'transform_filter', position: { x: 320, y: 120 }, data: { label: 'Filter High Priority', type: 'transform_filter', config: { field: 'body.priority', operator: 'equals', value: 'high' } } },
        { id: 'transform-summary', type: 'transform_set', position: { x: 600, y: 120 }, data: { label: 'Prepare Summary', type: 'transform_set', config: { field: 'summary', value: 'Urgent lead from {{body.email}}: {{body.message}}' } } },
        { id: 'console-log', type: 'console_log', position: { x: 860, y: 120 }, data: { label: 'Log Summary', type: 'console_log', config: { message: 'Lead summary ready for review' } } },
        { id: 'wait-approval', type: 'wait_approval', position: { x: 1120, y: 120 }, data: { label: 'Wait for Approval', type: 'wait_approval', config: { message: 'Review urgent lead before sending', timeout: 60 } } },
        { id: 'send-email', type: 'email_send', position: { x: 1380, y: 120 }, data: { label: 'Send Email', type: 'email_send', config: { to: 'ops@example.com', subject: 'Urgent lead alert', body: '{{summary}}' } } }
      ],
      edges: [
        { id: 'lead-1', source: 'trigger-webhook-1', target: 'filter-high-priority' },
        { id: 'lead-2', source: 'filter-high-priority', target: 'transform-summary' },
        { id: 'lead-3', source: 'transform-summary', target: 'console-log' },
        { id: 'lead-4', source: 'console-log', target: 'wait-approval' },
        { id: 'lead-5', source: 'wait-approval', target: 'send-email' }
      ],
      comments: []
    }
  },
  {
    id: 'incident-response',
    name: 'Incident Response Workflow',
    category: 'Operations',
    description: 'Escalate critical incidents through logging, approval, and follow-up messaging.',
    tags: ['ops', 'incident', 'collaboration'],
    setupGuide: [
      'Trigger it with a webhook payload containing body.service, body.severity, and body.message.',
      'Use collaboration comments to discuss remediation steps on each node.',
      'Open the Advanced panel to review privacy and release guidance.'
    ],
    requiredCredentials: [
      { serviceId: 'slack', label: 'Slack', required: false, reason: 'Optional if you want live channel notifications.' }
    ],
    graph: {
      nodes: [
        { id: 'trigger-webhook-ir', type: 'trigger_webhook', position: { x: 60, y: 180 }, data: { label: 'Incident Webhook', type: 'trigger_webhook', config: { path: '/incident', method: 'POST' } } },
        { id: 'transform-incident', type: 'transform_set', position: { x: 360, y: 180 }, data: { label: 'Prepare Incident Brief', type: 'transform_set', config: { field: 'incidentBrief', value: 'Service {{body.service}} is {{body.severity}}: {{body.message}}' } } },
        { id: 'wait-ir-approval', type: 'wait_approval', position: { x: 660, y: 180 }, data: { label: 'Ops Approval', type: 'wait_approval', config: { message: 'Approve remediation plan', timeout: 30 } } },
        { id: 'notify-email-ir', type: 'email_send', position: { x: 960, y: 180 }, data: { label: 'Notify Team', type: 'email_send', config: { to: 'incident@example.com', subject: 'Incident alert', body: '{{incidentBrief}}' } } }
      ],
      edges: [
        { id: 'ir-1', source: 'trigger-webhook-ir', target: 'transform-incident' },
        { id: 'ir-2', source: 'transform-incident', target: 'wait-ir-approval' },
        { id: 'ir-3', source: 'wait-ir-approval', target: 'notify-email-ir' }
      ],
      comments: []
    }
  },
  {
    id: 'no-code-audit-trail',
    name: 'Audit Trail Starter',
    category: 'Governance',
    description: 'A collaboration-friendly starter template for approvals, logging, and safe release review.',
    tags: ['audit', 'governance', 'safe-demo'],
    setupGuide: [
      'Use this as a team review template while testing comments and shared debugging.',
      'Create comments on nodes and watch them sync live with collaborators.',
      'Run the workflow to populate replay and observability sections.'
    ],
    requiredCredentials: [],
    graph: {
      nodes: [
        { id: 'audit-manual', type: 'trigger_manual', position: { x: 80, y: 100 }, data: { label: 'Manual Trigger', type: 'trigger_manual', config: {} } },
        { id: 'audit-log', type: 'console_log', position: { x: 360, y: 100 }, data: { label: 'Record Input', type: 'console_log', config: { message: 'Audit workflow started' } } },
        { id: 'audit-approval', type: 'wait_approval', position: { x: 640, y: 100 }, data: { label: 'Reviewer Sign-off', type: 'wait_approval', config: { message: 'Approve workflow release', timeout: 45 } } },
        { id: 'audit-email', type: 'email_send', position: { x: 920, y: 100 }, data: { label: 'Send Confirmation', type: 'email_send', config: { to: 'audit@example.com', subject: 'Audit approved', body: 'Workflow approved and logged.' } } }
      ],
      edges: [
        { id: 'audit-1', source: 'audit-manual', target: 'audit-log' },
        { id: 'audit-2', source: 'audit-log', target: 'audit-approval' },
        { id: 'audit-3', source: 'audit-approval', target: 'audit-email' }
      ],
      comments: []
    }
  }
];

function getTemplateById(templateId) {
  return WORKFLOW_TEMPLATES.find((template) => template.id === templateId) || null;
}

function getNodeConfig(node) {
  return node?.data?.config || {};
}

function getNodeCredentialId(node) {
  return node?.data?.credentialId || node?.data?.config?.credentialId || null;
}

function getCredentialRequirementForType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('hubspot')) {
    return { serviceId: 'hubspot', label: 'HubSpot', scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'] };
  }
  if (t.includes('slack')) {
    return { serviceId: 'slack', label: 'Slack', scopes: ['incoming-webhook'] };
  }
  if (t.includes('anthropic') || t.includes('ai_classify') || t.includes('ai_summar')) {
    return { serviceId: 'anthropic', label: 'Anthropic', scopes: ['messages:create'] };
  }
  if (t.includes('openai')) {
    return { serviceId: 'openai', label: 'OpenAI', scopes: ['responses.create'] };
  }
  if (t.includes('postgres')) {
    return { serviceId: 'postgres', label: 'PostgreSQL', scopes: ['connect', 'query'] };
  }
  if (t.includes('google_')) {
    return { serviceId: 'google', label: 'Google', scopes: ['sheets', 'gmail', 'drive'] };
  }
  return null;
}

function inferOutputFields(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('webhook')) return ['body.email', 'body.message', 'body.priority', 'body.status', 'headers', 'query'];
  if (t.includes('trigger') || t.includes('cron') || t.includes('schedule')) return ['payload', 'timestamp'];
  if (t.includes('hubspot')) return ['contact.email', 'contact.firstname', 'contact.lastname', 'contact.id', 'success'];
  if (t.includes('http') || t.includes('rest')) return ['body', 'statusCode', 'headers', 'success'];
  if (t.includes('filter')) return ['passed', 'rejected'];
  if (t.includes('classify')) return ['category', 'confidence', 'explanation'];
  if (t.includes('summar')) return ['summary', 'highlights'];
  if (t.includes('email')) return ['to', 'subject', 'sentAt', 'success'];
  if (t.includes('slack')) return ['text', 'channel', 'sentAt', 'success'];
  if (t.includes('postgres') || t.includes('mysql')) return ['rows', 'count', 'result'];
  return ['data'];
}

function buildFieldAliases(field) {
  const base = String(field || '').toLowerCase();
  const aliases = new Set([base]);
  if (base.includes('email')) aliases.add('recipient');
  if (base.includes('message') || base.includes('text')) aliases.add('body');
  if (base.includes('subject')) aliases.add('title');
  if (base.includes('phone')) aliases.add('number');
  if (base.includes('body')) aliases.add('message');
  return [...aliases];
}

function scoreFieldMapping(sourceField, targetField) {
  const source = String(sourceField || '').toLowerCase();
  const target = String(targetField || '').toLowerCase();
  if (!source || !target) return 0;
  if (source === target) return 1;
  if (source.endsWith(`.${target}`)) return 0.95;
  if (target.includes('email') && (source.includes('email') || source.includes('recipient'))) return 0.92;
  if ((target.includes('message') || target.includes('text') || target.includes('body')) &&
      (source.includes('message') || source.includes('text') || source.includes('body') || source.includes('summary'))) return 0.9;
  if (target.includes('subject') && (source.includes('title') || source.includes('subject') || source.includes('category'))) return 0.82;
  if (target.includes('query') && source.includes('query')) return 0.88;
  if (target.includes('payload') && source.includes('body')) return 0.78;
  return 0;
}

function resolveTemplateValue(value, sampleInput) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawPath) => {
    const parts = String(rawPath).trim().split('.');
    let current = sampleInput;
    for (const part of parts) {
      if (current == null) return '';
      current = current[part];
    }
    return current == null ? '' : String(current);
  });
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function estimateNodeCost(nodeType, promptText, outputText) {
  const totalTokens = estimateTokens(promptText) + estimateTokens(outputText);
  const t = (nodeType || '').toLowerCase();
  let per1k = 0;
  if (t.includes('anthropic') || t.includes('ai_classify') || t.includes('ai_summar')) per1k = 0.008;
  else if (t.includes('openai')) per1k = 0.005;
  else if (t.includes('hubspot') || t.includes('slack') || t.includes('email')) per1k = 0;
  return {
    estimatedTokens: totalTokens,
    estimatedUsd: Number(((totalTokens / 1000) * per1k).toFixed(4))
  };
}

function buildCompilerRemediations(compile) {
  const actions = [];
  for (const item of compile.unsupportedNodes || []) {
    actions.push({
      priority: 'high',
      nodeId: item.nodeId,
      title: `Replace or implement ${item.nodeLabel}`,
      action: `Backend runtime does not support "${item.nodeType}" yet.`,
      owner: 'engineering'
    });
  }
  for (const item of compile.missingConfig || []) {
    actions.push({
      priority: item.serviceId ? 'high' : 'medium',
      nodeId: item.nodeId,
      title: `Configure ${item.nodeLabel}`,
      action: item.serviceId
        ? `Link a ${item.serviceLabel} credential and fill ${item.fields.join(', ')}.`
        : `Fill ${item.fields.join(', ')} in node config.`,
      owner: item.serviceId ? 'ops' : 'builder'
    });
  }
  for (const finding of compile.policy?.findings || []) {
    actions.push({
      priority: finding.severity === 'high' ? 'high' : 'medium',
      nodeId: finding.nodeId,
      title: `Review policy finding on ${finding.nodeLabel}`,
      action: finding.message,
      owner: 'security'
    });
  }
  return actions.slice(0, 3);
}

function buildSmartInputMapper(graph) {
  const nodeMap = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const suggestions = [];

  for (const edge of graph.edges || []) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const sourceFields = inferOutputFields(getNodeType(source));
    const targetConfig = getNodeConfig(target);
    const definition = registry.get(getNodeType(target));
    const targetSchema = definition?.configSchema || {};
    const candidateFields = Object.keys(targetSchema).filter((key) => {
      const field = targetSchema[key];
      const value = targetConfig[key];
      return field?.required || value === '' || value == null;
    });

    for (const targetField of candidateFields) {
      const best = sourceFields
        .map((sourceField) => ({
          sourceField,
          confidence: Math.max(
            scoreFieldMapping(sourceField, targetField),
            ...buildFieldAliases(targetField).map((alias) => scoreFieldMapping(sourceField, alias))
          )
        }))
        .sort((a, b) => b.confidence - a.confidence)[0];

      if (best && best.confidence >= 0.78) {
        suggestions.push({
          edgeId: edge.id,
          sourceNodeId: source.id,
          sourceNodeLabel: getNodeLabel(source),
          sourceField: best.sourceField,
          targetNodeId: target.id,
          targetNodeLabel: getNodeLabel(target),
          targetField,
          confidence: Number(best.confidence.toFixed(2)),
          applyValue: `{{${best.sourceField}}}`
        });
      }
    }
  }

  return suggestions.slice(0, 12);
}

function buildSimulationPreview(graph) {
  const nodeMap = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const outgoing = new Map();
  for (const edge of graph.edges || []) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source).push(edge.target);
  }

  const branches = [];
  for (const node of graph.nodes || []) {
    const targets = outgoing.get(node.id) || [];
    if (targets.length > 1) {
      branches.push({
        nodeId: node.id,
        nodeLabel: getNodeLabel(node),
        nodeType: getNodeType(node),
        branches: targets.map((targetId) => ({
          targetId,
          targetLabel: getNodeLabel(nodeMap.get(targetId)),
        }))
      });
    }
  }

  return {
    path: (graph.nodes || []).map((node, index) => ({
      step: index + 1,
      nodeId: node.id,
      nodeLabel: getNodeLabel(node),
      nodeType: getNodeType(node)
    })),
    branches
  };
}

function buildApprovalSystem(graph) {
  const approvalNodes = (graph.nodes || [])
    .filter((node) => getNodeType(node).toLowerCase().includes('approval'))
    .map((node) => {
      const config = getNodeConfig(node);
      const timeout = Number(config.timeout || config.timeoutMinutes || 60);
      return {
        nodeId: node.id,
        label: getNodeLabel(node),
        message: config.message || 'Manual review required',
        slaMinutes: timeout,
        assignee: config.assignee || 'Workspace reviewer',
        escalatesAfterMinutes: Math.max(timeout, 15),
        status: 'ready'
      };
    });

  return {
    enabled: approvalNodes.length > 0,
    nodes: approvalNodes,
    inboxSummary: approvalNodes.length
      ? `${approvalNodes.length} approval step(s) configured for manual review.`
      : 'No approval nodes in this workflow yet.'
  };
}

async function buildObservability(workspaceId, workflowId) {
  const execResult = await query(
    `SELECT status, duration_ms, created_at
     FROM executions
     WHERE workspace_id = $1 AND workflow_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [workspaceId, workflowId]
  );
  const executions = execResult.rows;
  const total = executions.length;
  const failures = executions.filter((row) => row.status === 'failed').length;
  const successes = executions.filter((row) => row.status === 'success').length;
  const avgDurationMs = total
    ? Math.round(executions.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / total)
    : 0;

  const nodeResult = await query(
    `SELECT node_id, node_label, node_type,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
            AVG(duration_ms) AS avg_duration_ms,
            MAX(duration_ms) AS max_duration_ms
     FROM node_logs
     WHERE execution_id IN (
       SELECT id FROM executions WHERE workspace_id = $1 AND workflow_id = $2 ORDER BY created_at DESC LIMIT 50
     )
     GROUP BY node_id, node_label, node_type
     ORDER BY failed_count DESC, avg_duration_ms DESC NULLS LAST`,
    [workspaceId, workflowId]
  );

  return {
    totals: {
      executions: total,
      successes,
      failures,
      failureRate: total ? Number(((failures / total) * 100).toFixed(1)) : 0,
      avgDurationMs
    },
    trends: executions.slice(0, 10).reverse().map((row, index) => ({
      run: index + 1,
      status: row.status,
      durationMs: Number(row.duration_ms || 0),
      createdAt: row.created_at
    })),
    topBrokenNodes: nodeResult.rows.slice(0, 5).map((row) => ({
      nodeId: row.node_id,
      nodeLabel: row.node_label,
      nodeType: row.node_type,
      failedCount: Number(row.failed_count || 0),
      successCount: Number(row.success_count || 0),
      avgDurationMs: Math.round(Number(row.avg_duration_ms || 0)),
      maxDurationMs: Number(row.max_duration_ms || 0)
    }))
  };
}

function buildPrivacyMode(graph, compile) {
  const sensitiveNodeTypes = ['postgres', 'mysql', 'mongodb', 'email', 'slack', 'http', 'hubspot', 'ai_'];
  const sensitiveNodes = (graph.nodes || []).filter((node) =>
    sensitiveNodeTypes.some((type) => getNodeType(node).toLowerCase().includes(type))
  );
  return {
    enabled: sensitiveNodes.length > 0 || (compile.policy?.findings || []).length > 0,
    redactionEnabled: true,
    sensitiveNodes: sensitiveNodes.map((node) => ({
      nodeId: node.id,
      nodeLabel: getNodeLabel(node),
      nodeType: getNodeType(node)
    })),
    warning: sensitiveNodes.length
      ? 'Sensitive connectors detected. Redact logs before sharing exports.'
      : 'No sensitive connectors detected.'
  };
}

async function testCredentialConnection(serviceId, values = {}) {
  const service = String(serviceId || '').toLowerCase();
  const result = { status: 'unknown', message: 'No validator available yet.', scopes: [], details: null };

  if (service === 'slack') {
    const url = values.webhook_url || values.webhookUrl;
    if (!url) return { status: 'failed', message: 'Missing Slack webhook URL.', scopes: ['incoming-webhook'], details: null };
    return {
      status: /^https:\/\/hooks\.slack\.com\/services\//.test(url) ? 'passed' : 'warning',
      message: /^https:\/\/hooks\.slack\.com\/services\//.test(url)
        ? 'Webhook URL format looks valid.'
        : 'Webhook URL format does not match Slack incoming webhooks.',
      scopes: ['incoming-webhook'],
      details: { hasBotToken: Boolean(values.bot_token) }
    };
  }

  if (service === 'hubspot') {
    const token = values.access_token || values.accessToken;
    if (!token) return { status: 'failed', message: 'Missing HubSpot access token.', scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'], details: null };
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + token, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        return { status: 'warning', message: `HubSpot token check returned ${response.status}.`, scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'], details: null };
      }
      const data = await response.json();
      return {
        status: 'passed',
        message: 'HubSpot token responded successfully.',
        scopes: Array.isArray(data.scopes) ? data.scopes : ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
        details: { hubId: data.hub_id || null }
      };
    } catch (err) {
      return { status: 'warning', message: `HubSpot validation could not complete: ${err.message}`, scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'], details: null };
    }
  }

  if (service === 'postgres') {
    const client = new Client({
      host: values.host,
      port: Number(values.port || 5432),
      database: values.database,
      user: values.username,
      password: values.password,
      ssl: String(values.ssl || '').toLowerCase() === 'require' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return { status: 'passed', message: 'PostgreSQL connection succeeded.', scopes: ['connect', 'query'], details: { host: values.host, database: values.database } };
    } catch (err) {
      return { status: 'failed', message: `PostgreSQL connection failed: ${err.message}`, scopes: ['connect', 'query'], details: null };
    } finally {
      try { await client.end(); } catch {}
    }
  }

  if (service === 'anthropic') {
    const key = values.api_key || values.apiKey;
    return {
      status: key && /^sk-ant-/.test(key) ? 'passed' : 'warning',
      message: key ? 'Anthropic key format looks valid.' : 'Missing Anthropic API key.',
      scopes: ['messages:create'],
      details: { liveValidation: false }
    };
  }

  if (service === 'openai') {
    const key = values.api_key || values.apiKey;
    return {
      status: key && /^sk-/.test(key) ? 'passed' : 'warning',
      message: key ? 'OpenAI key format looks valid.' : 'Missing OpenAI API key.',
      scopes: ['responses.create'],
      details: { liveValidation: false }
    };
  }

  return result;
}

async function buildCredentialHealth(graph, credentialsMap = {}) {
  const requiredByService = new Map();
  for (const node of graph.nodes || []) {
    const requirement = getCredentialRequirementForType(getNodeType(node));
    if (!requirement) continue;
    if (!requiredByService.has(requirement.serviceId)) {
      requiredByService.set(requirement.serviceId, {
        serviceId: requirement.serviceId,
        serviceLabel: requirement.label,
        requiredByNodes: [],
        scopes: new Set()
      });
    }
    const current = requiredByService.get(requirement.serviceId);
    current.requiredByNodes.push({ nodeId: node.id, nodeLabel: getNodeLabel(node), credentialId: getNodeCredentialId(node) });
    requirement.scopes.forEach((scope) => current.scopes.add(scope));
  }

  const statuses = [];
  const usedCredentialIds = new Set();
  for (const item of requiredByService.values()) {
    const linked = item.requiredByNodes
      .map((node) => node.credentialId)
      .filter(Boolean)
      .map((credentialId) => ({ credentialId, credential: credentialsMap[credentialId] }))
      .filter((row) => row.credential);

    if (linked.length === 0) {
      statuses.push({
        serviceId: item.serviceId,
        serviceLabel: item.serviceLabel,
        status: 'missing',
        usage: 'required',
        requiredScopes: [...item.scopes],
        usedByNodes: item.requiredByNodes,
        message: `No ${item.serviceLabel} credential is linked to the required node(s).`
      });
      continue;
    }

    for (const link of linked) {
      usedCredentialIds.add(link.credentialId);
      const check = await testCredentialConnection(link.credential.serviceId, link.credential.values || {});
      statuses.push({
        credentialId: link.credentialId,
        serviceId: link.credential.serviceId,
        serviceLabel: item.serviceLabel,
        name: link.credential.name || link.credentialId,
        status: check.status,
        usage: 'linked',
        requiredScopes: [...item.scopes],
        actualScopes: check.scopes || [],
        usedByNodes: item.requiredByNodes.filter((node) => node.credentialId === link.credentialId),
        message: check.message,
        details: check.details
      });
    }
  }

  for (const [credentialId, credential] of Object.entries(credentialsMap || {})) {
    if (!usedCredentialIds.has(credentialId)) {
      statuses.push({
        credentialId,
        serviceId: credential.serviceId,
        serviceLabel: credential.serviceId,
        name: credential.name || credentialId,
        status: 'unused',
        usage: 'unused',
        requiredScopes: [],
        actualScopes: [],
        usedByNodes: [],
        message: 'Saved credential is not linked to any node in this workflow.'
      });
    }
  }

  return {
    status: statuses.some((item) => item.status === 'failed' || item.status === 'missing') ? 'attention' : 'healthy',
    summary: `${statuses.filter((item) => item.status === 'passed').length} healthy · ${statuses.filter((item) => item.status === 'missing' || item.status === 'failed').length} need attention`,
    statuses
  };
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
  const observability = await buildObservability(workflow.workspace_id, workflow.id);
  return {
    compiler: compile,
    autoRemediation: {
      fixes: buildCompilerRemediations(compile)
    },
    schemaAwareCanvas: {
      contracts: compile.dataContracts,
      warningCount: compile.dataContracts.filter(c => c.availableFields.length === 1 && c.availableFields[0] === 'data').length
    },
    smartInputMapper: {
      suggestions: buildSmartInputMapper(graph)
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
    simulationMode: buildSimulationPreview(graph),
    humanApproval: buildApprovalSystem(graph),
    observability,
    releaseSystem: makeReleasePlan(workflow, compile),
    edgeRunner: makeEdgeRunnerPlan(graph, compile),
    policyGuardrails: compile.policy,
    dataPrivacyMode: buildPrivacyMode(graph, compile)
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
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
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

// GET /api/workspaces/:wid/workflows/templates/marketplace
router.get('/templates/marketplace', async (req, res) => {
  try {
    const userId = req.user.id;
    const builtInIds = WORKFLOW_TEMPLATES.map((t) => t.id);

    // Ratings for built-in templates
    const builtInRatingsRes = await query(
      `SELECT template_id,
              ROUND(AVG(rating)::numeric, 2)  AS avg_rating,
              COUNT(*)::int                   AS rating_count,
              MAX(CASE WHEN user_id = $1 THEN rating END) AS user_rating
         FROM template_ratings
        WHERE template_id = ANY($2)
        GROUP BY template_id`,
      [userId, builtInIds]
    );
    const builtInRatings = {};
    for (const r of builtInRatingsRes.rows) {
      builtInRatings[r.template_id] = {
        avgRating:   parseFloat(r.avg_rating)  || 0,
        ratingCount: parseInt(r.rating_count)  || 0,
        userRating:  r.user_rating ? parseInt(r.user_rating) : null,
      };
    }

    // User-published templates + their ratings
    const publishedRes = await query(
      `SELECT mt.*,
              ROUND(AVG(tr.rating)::numeric, 2) AS avg_rating,
              COUNT(tr.id)::int                 AS rating_count,
              MAX(CASE WHEN tr.user_id = $1 THEN tr.rating END) AS user_rating
         FROM marketplace_templates mt
         LEFT JOIN template_ratings tr ON tr.template_id = mt.id::text
        WHERE mt.is_active = true
        GROUP BY mt.id
        ORDER BY mt.created_at DESC`,
      [userId]
    );

    const builtIn = WORKFLOW_TEMPLATES.map((t) => ({
      id:                  t.id,
      name:                t.name,
      category:            t.category,
      description:         t.description,
      tags:                t.tags,
      setupGuide:          t.setupGuide,
      requiredCredentials: t.requiredCredentials,
      nodeCount:           t.graph.nodes.length,
      edgeCount:           t.graph.edges.length,
      owner:               'Flowa Team',
      isBuiltIn:           true,
      avgRating:           builtInRatings[t.id]?.avgRating   ?? 0,
      ratingCount:         builtInRatings[t.id]?.ratingCount ?? 0,
      userRating:          builtInRatings[t.id]?.userRating  ?? null,
      installCount:        0,
    }));

    const published = publishedRes.rows.map((t) => ({
      id:                  t.id,
      name:                t.name,
      category:            t.category,
      description:         t.description,
      tags:                t.tags,
      setupGuide:          t.setup_guide,
      requiredCredentials: t.required_credentials,
      nodeCount:           t.node_count,
      edgeCount:           t.edge_count,
      owner:               t.published_by_name,
      isBuiltIn:           false,
      avgRating:           parseFloat(t.avg_rating)  || 0,
      ratingCount:         parseInt(t.rating_count)  || 0,
      userRating:          t.user_rating ? parseInt(t.user_rating) : null,
      installCount:        t.install_count,
    }));

    res.json({ templates: [...builtIn, ...published] });
  } catch (err) {
    logger.error('Templates marketplace error:', err);
    res.status(500).json({ error: 'Failed to load workflow templates marketplace' });
  }
});

// POST /api/workspaces/:wid/workflows/templates/publish
router.post('/templates/publish', async (req, res) => {
  try {
    const { workflowId, category, setupGuide, requiredCredentials } = req.body;
    if (!workflowId) return res.status(400).json({ error: 'workflowId is required' });

    const wfRes = await query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [workflowId, req.workspaceId]
    );
    if (!wfRes.rows.length) return res.status(404).json({ error: 'Workflow not found' });

    const wf    = wfRes.rows[0];
    const graph = parseGraphValue(wf.graph);

    const result = await query(
      `INSERT INTO marketplace_templates
         (name, description, category, tags, graph, setup_guide, required_credentials,
          published_by, published_by_name, node_count, edge_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        wf.name,
        wf.description || '',
        category || 'General',
        wf.tags || '[]',
        JSON.stringify(graph),
        JSON.stringify(setupGuide          || []),
        JSON.stringify(requiredCredentials || []),
        req.user.id,
        req.user.name || 'Unknown',
        graph.nodes?.length || 0,
        graph.edges?.length || 0,
      ]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    logger.error('Publish template error:', err);
    res.status(500).json({ error: 'Failed to publish template' });
  }
});

// POST /api/workspaces/:wid/workflows/templates/:templateId/rate
router.post('/templates/:templateId/rate', async (req, res) => {
  try {
    const rating = parseInt(req.body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be an integer 1–5' });
    }

    await query(
      `INSERT INTO template_ratings (template_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (template_id, user_id) DO UPDATE SET rating = $3`,
      [req.params.templateId, req.user.id, rating]
    );

    const stats = await query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*)::int AS rating_count
         FROM template_ratings WHERE template_id = $1`,
      [req.params.templateId]
    );

    res.json({
      avgRating:   parseFloat(stats.rows[0].avg_rating)  || 0,
      ratingCount: parseInt(stats.rows[0].rating_count)  || 0,
      userRating:  rating,
    });
  } catch (err) {
    logger.error('Rate template error:', err);
    res.status(500).json({ error: 'Failed to rate template' });
  }
});

// POST /api/workspaces/:wid/workflows/templates/:templateId/install
router.post('/templates/:templateId/install', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Try built-in first, then user-published
    const builtIn = getTemplateById(templateId);
    let name, description, graph, tags, setupGuide, requiredCredentials;

    if (builtIn) {
      ({ name, description, graph, tags, setupGuide, requiredCredentials } = builtIn);
    } else {
      const dbRes = await query(
        'SELECT * FROM marketplace_templates WHERE id = $1 AND is_active = true',
        [templateId]
      );
      if (!dbRes.rows.length) return res.status(404).json({ error: 'Workflow template not found' });
      const t = dbRes.rows[0];
      name                = t.name;
      description         = t.description;
      graph               = parseGraphValue(t.graph);
      tags                = t.tags;
      setupGuide          = t.setup_guide;
      requiredCredentials = t.required_credentials;
      // increment install counter in background
      query('UPDATE marketplace_templates SET install_count = install_count + 1 WHERE id = $1', [templateId]).catch(() => {});
    }

    const finalName = typeof req.body.name === 'string' && req.body.name.trim()
      ? req.body.name.trim()
      : name;

    const result = await query(
      `INSERT INTO workflows (workspace_id, name, description, graph, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.workspaceId, finalName, description, JSON.stringify(graph), JSON.stringify(tags || []), req.user.id]
    );

    res.status(201).json({
      workflow: result.rows[0],
      template: { id: templateId, name, setupGuide, requiredCredentials },
    });
  } catch (err) {
    logger.error('Install workflow template error:', err);
    res.status(500).json({ error: 'Failed to install workflow template' });
  }
});

// POST /api/workspaces/:wid/workflows/:id/credential-health
router.post('/:id/credential-health', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;
    const graph = parseGraphValue(workflow.graph);
    const credentials = req.body.credentials || {};
    res.json(await buildCredentialHealth(graph, credentials));
  } catch (err) {
    logger.error('Credential health error:', err);
    res.status(500).json({ error: 'Failed to inspect credential health' });
  }
});

// POST /api/workspaces/:wid/workflows/:id/prompt-sandbox
router.post('/:id/prompt-sandbox', async (req, res) => {
  try {
    const workflow = await loadWorkflowOr404(req, res);
    if (!workflow) return;

    const graph = parseGraphValue(workflow.graph);
    const nodeId = req.body.nodeId;
    const sampleInput = req.body.sampleInput || {};
    const credentials = req.body.credentials || {};
    const node = (graph.nodes || []).find((item) => item.id === nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found in workflow graph' });
    }

    const nodeType = getNodeType(node);
    const definition = registry.get(nodeType);
    if (!definition) {
      return res.status(400).json({ error: `Unsupported node type "${nodeType}" for sandbox execution` });
    }

    const rawConfig = { ...getNodeConfig(node) };
    const resolvedConfig = Object.fromEntries(
      Object.entries(rawConfig).map(([key, value]) => [key, resolveTemplateValue(value, sampleInput)])
    );

    const credentialId = getNodeCredentialId(node);
    if (credentialId && credentials[credentialId]) {
      resolvedConfig._credentials = credentials[credentialId].values || {};
      resolvedConfig._credentialServiceId = credentials[credentialId].serviceId || null;
    }

    const promptFields = ['prompt', 'message', 'userMessage', 'systemPrompt', 'text', 'content', 'instructions'];
    const resolvedPrompt = promptFields
      .map((field) => resolvedConfig[field])
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const started = Date.now();
    let output = null;
    let error = null;
    try {
      output = await definition.execute({
        config: resolvedConfig,
        input: { sample: sampleInput },
        context: { triggerPayload: sampleInput, sandbox: true }
      });
    } catch (err) {
      error = err.message;
    }
    const durationMs = Date.now() - started;
    const outputPreview = output ? JSON.stringify(output, null, 2) : error || '';
    const cost = estimateNodeCost(nodeType, resolvedPrompt, outputPreview);

    res.json({
      nodeId,
      nodeType,
      nodeLabel: getNodeLabel(node),
      resolvedPrompt,
      resolvedConfig,
      sampleInput,
      output,
      error,
      durationMs,
      sandboxStatus: error ? 'failed' : 'passed',
      cost
    });
  } catch (err) {
    logger.error('Prompt sandbox error:', err);
    res.status(500).json({ error: 'Failed to run prompt sandbox' });
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
           updated_at = NOW()
       WHERE id = $6 AND workspace_id = $7
       RETURNING *`,
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

    // Invalidate ML suggestion cache so next request re-learns from updated graphs
    if (graph) invalidateCache();

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
        `UPDATE workflows SET version = $1, updated_at = NOW()
         RETURNING *
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
      'DELETE FROM workflows WHERE id = $1 AND workspace_id = $2 RETURNING id',
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
       RETURNING *
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
       WHERE we.workflow_id = $1 AND we.last_seen > NOW() - INTERVAL '5 minutes'`,
      [req.params.id]
    );

    res.json({ editors: result.rows });
  } catch (err) {
    logger.error('Get presence error:', err);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

// POST /api/workspaces/:wid/workflows/suggest-nodes
// ML-powered node suggestion: returns top-5 recommended node types to add
// given the types already present in the current workflow canvas.
router.post('/suggest-nodes', async (req, res) => {
  try {
    const { currentNodeTypes = [] } = req.body;
    if (!Array.isArray(currentNodeTypes)) {
      return res.status(400).json({ error: 'currentNodeTypes must be an array of strings' });
    }

    // Collect all available node types from the registry
    const allTypes = registry.getAll
      ? registry.getAll().map(n => n.type || n.id).filter(Boolean)
      : [];

    const suggestions = await suggestNodes(currentNodeTypes, allTypes, 5);
    res.json({ suggestions });
  } catch (err) {
    logger.error('Node suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate node suggestions' });
  }
});

module.exports = router;

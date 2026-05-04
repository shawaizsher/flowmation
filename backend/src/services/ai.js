const logger = require('../utils/logger');

/**
 * Generate a workflow graph from a natural language prompt
 */
async function generateWorkflow(prompt) {
  const systemPrompt = `You are a workflow automation expert for the Flowa platform. 
Given a natural language description, generate a valid workflow graph in JSON format.

The graph must follow this structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "nodeType",
      "position": { "x": number, "y": number },
      "data": {
        "label": "Human readable label",
        "type": "nodeType",
        "config": { /* config fields based on node type */ }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id"
    }
  ]
}

Available node types:
- manualTrigger, webhookTrigger, scheduleTrigger (triggers)
- httpRequest, respondWebhook (HTTP)
- codeBlock, setVariable, jsonParse, splitArray, mergeData, filterData (transform)
- ifCondition, switchNode, delay, loop (logic)
- aiPrompt, aiClassify, aiSummarize (AI)
- sendEmail, slackMessage (communication)
- readDatabase, writeDatabase (data)
- consoleLog, errorHandler, waitForApproval, dateTime, mathOperation (utility)

Layout rules:
- Start trigger at x:100, y:200
- Space nodes ~300px apart horizontally
- Use y-offset for branches

Respond with ONLY the JSON object, no markdown or explanation.`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate a workflow for: ${prompt}` }]
      });

      const text = response.content[0].text;
      const graph = JSON.parse(text);

      return {
        graph,
        description: prompt,
        model: 'claude-sonnet-4-6',
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      };
    } else if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a workflow for: ${prompt}` }
        ]
      });

      const text = response.choices[0].message.content;
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const graph = JSON.parse(cleaned);

      return {
        graph,
        description: prompt,
        model: 'gpt-4o',
        tokensUsed: response.usage?.total_tokens || 0
      };
    } else {
      // Fallback: generate a simple template
      return generateFallbackWorkflow(prompt);
    }
  } catch (err) {
    logger.error('AI generateWorkflow error:', err);
    return generateFallbackWorkflow(prompt);
  }
}

/**
 * Fallback workflow when no AI key is configured
 */
function generateFallbackWorkflow(prompt) {
  return {
    graph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'manualTrigger',
          position: { x: 100, y: 200 },
          data: { label: 'Manual Trigger', type: 'manualTrigger', config: {} }
        },
        {
          id: 'log-1',
          type: 'consoleLog',
          position: { x: 400, y: 200 },
          data: {
            label: 'Log Output',
            type: 'consoleLog',
            config: { message: `Workflow generated from: ${prompt}` }
          }
        }
      ],
      edges: [
        { id: 'e-trigger-1-log-1', source: 'trigger-1', target: 'log-1' }
      ]
    },
    description: prompt,
    model: 'fallback',
    tokensUsed: 0
  };
}

/**
 * Explain a failed execution
 */
async function explainError(execution, failedLogs) {
  const context = {
    executionStatus: execution.status,
    error: execution.error,
    failedNodes: failedLogs.map(l => ({
      nodeType: l.node_type,
      nodeLabel: l.node_label,
      error: l.error,
      input: l.input
    }))
  };

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'You are a workflow debugging assistant. Explain what went wrong in this workflow execution. Be concise and actionable. Respond in JSON: {"summary": "...", "root_cause": "...", "suggestions": ["..."]}',
        messages: [{ role: 'user', content: JSON.stringify(context) }]
      });

      return JSON.parse(response.content[0].text);
    }
  } catch (err) {
    logger.error('AI explainError error:', err);
  }

  return {
    summary: execution.error || 'Execution failed',
    root_cause: failedLogs[0]?.error || 'Unknown error',
    suggestions: ['Check the failed node configuration', 'Verify input data format']
  };
}

/**
 * Debug a failed node and suggest a fix
 */
async function debugNode({ nodeType, nodeLabel, config, error, input, configSchema }) {
  const context = { nodeType, nodeLabel, config, error, input, configSchema };

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `You are a workflow automation debugger. Analyze this node failure and return a JSON object with:
- diagnosis: plain English explanation of what went wrong
- root_cause: the technical root cause
- fix: exact config changes as key-value pairs to fix the issue
- explanation: why this fix works
- prevention: tip to prevent this in the future

Respond with ONLY valid JSON.`,
        messages: [{ role: 'user', content: JSON.stringify(context) }]
      });

      const result = JSON.parse(response.content[0].text);
      result.model = 'claude-sonnet-4-6';
      result.tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
      return result;
    }
  } catch (err) {
    logger.error('AI debugNode error:', err);
  }

  return {
    diagnosis: `Node "${nodeLabel}" (${nodeType}) failed with error: ${error}`,
    root_cause: error,
    fix: {},
    explanation: 'Unable to auto-diagnose. Check the error message and node configuration.',
    prevention: 'Ensure all required fields are properly configured.',
    model: 'fallback',
    tokensUsed: 0
  };
}

/**
 * Suggest nodes to add to a workflow
 */
async function suggestNodes(graph) {
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: 'Analyze this workflow graph and suggest 2-3 nodes that could enhance it. Respond in JSON: [{"type": "nodeType", "reason": "why this helps"}]',
        messages: [{ role: 'user', content: JSON.stringify(graph) }]
      });

      return JSON.parse(response.content[0].text);
    }
  } catch (err) {
    logger.error('AI suggestNodes error:', err);
  }

  return [
    { type: 'errorHandler', reason: 'Add error handling for reliability' },
    { type: 'consoleLog', reason: 'Add logging for debugging' }
  ];
}

/**
 * Generate documentation for a workflow
 */
async function documentWorkflow(workflow) {
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'Generate clear documentation for this workflow. Include: title, description, trigger, steps, inputs, outputs. Respond in JSON: {"title": "...", "description": "...", "steps": [{"node": "...", "description": "..."}], "inputs": [...], "outputs": [...]}',
        messages: [{ role: 'user', content: JSON.stringify(workflow) }]
      });

      return JSON.parse(response.content[0].text);
    }
  } catch (err) {
    logger.error('AI documentWorkflow error:', err);
  }

  return {
    title: workflow.name || 'Untitled Workflow',
    description: workflow.description || 'No description available',
    steps: ((typeof workflow.graph === 'string' ? JSON.parse(workflow.graph) : workflow.graph)?.nodes || []).map(n => ({
      node: n.data?.label || n.id,
      description: `${n.data?.type || n.type} node`
    })),
    inputs: [],
    outputs: []
  };
}

// ── Node catalog summary for the AI system prompt ──
const NODE_CATALOG = `
TRIGGERS: trigger_webhook, trigger_cron, trigger_email, trigger_manual
GOOGLE: google_sheets_read, google_sheets_write, google_gmail_send, google_gmail_read, google_drive_upload, google_drive_list, google_calendar_create, google_translate, google_vision, google_maps_geocode, youtube_search
AI_ML: openai_chat, openai_image, anthropic_chat, huggingface_inference, whisper_transcribe, ai_classify, ai_summarize, ai_embed
SOCIAL: twitter_post, twitter_search, instagram_post, linkedin_post, reddit_post
MESSAGING: slack_send, slack_create_channel, discord_send, telegram_send, whatsapp_send, email_send, twilio_sms
DATABASES: postgres_query, postgres_insert, mysql_query, mongodb_find, mongodb_insert, redis_get, redis_set, firebase_read, firebase_write, supabase_query
CLOUD: aws_s3_upload, aws_s3_read, aws_lambda_invoke, aws_sns_publish, github_create_pr, github_commit, docker_run, vercel_deploy
HTTP: http_request, graphql_query, rest_get, rest_post, rest_put, rest_delete
FILES: file_read, file_write, csv_parse, csv_generate, pdf_extract, pdf_generate, ftp_upload
TRANSFORM: transform_set, json_parse, json_stringify, xml_parse, code_execute, transform_filter, transform_split, transform_merge, transform_map
LOGIC: logic_if, logic_switch, error_handler, delay, loop_for_each
CRM: salesforce_query, salesforce_create, hubspot_contact, airtable_find, airtable_create, notion_page, notion_database
PRODUCTIVITY: jira_create, jira_update, trello_card, asana_task, monday_item, clickup_task
ECOMMERCE: shopify_order, shopify_product, woocommerce_order
PAYMENTS: stripe_payment_intent, paypal_payment, stripe_refund, stripe_charge
ANALYTICS: google_analytics_event, mixpanel_track, segment_identify
UTILITIES: console_log, date_time, math_operation, wait_approval, random, uuid_generate, base64_encode, hash
`;

/**
 * Apply a single tool call to the workflow state
 */
function applyWorkflowTool(workflow, toolName, input) {
  const nodes = [...workflow.nodes];
  const edges = [...workflow.edges];

  switch (toolName) {
    case 'set_workflow':
      return { nodes: input.nodes || [], edges: input.edges || [] };

    case 'add_node': {
      const newNode = {
        id: input.id,
        type: 'flowNode',
        position: input.position,
        data: {
          label: input.label,
          type: input.nodeType,
          icon: '🔗',
          config: input.config || {},
        },
      };
      return { nodes: [...nodes, newNode], edges };
    }

    case 'update_node':
      return {
        nodes: nodes.map(n => {
          if (n.id !== input.id) return n;
          return {
            ...n,
            data: {
              ...n.data,
              ...(input.label ? { label: input.label } : {}),
              config: { ...(n.data?.config || {}), ...(input.config || {}) },
            },
          };
        }),
        edges,
      };

    case 'remove_node':
      return {
        nodes: nodes.filter(n => n.id !== input.id),
        edges: edges.filter(e => e.source !== input.id && e.target !== input.id),
      };

    case 'add_edge': {
      if (edges.some(e => e.source === input.source && e.target === input.target)) {
        return { nodes, edges };
      }
      return {
        nodes,
        edges: [...edges, {
          id: `edge-${input.source}-${input.target}`,
          source: input.source,
          target: input.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }],
      };
    }

    case 'remove_edge':
      return { nodes, edges: edges.filter(e => e.id !== input.id) };

    default:
      return { nodes, edges };
  }
}

/**
 * Conversational workflow creation and editing agent
 */
async function workflowChat({ message, history, workflow }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      reply: 'AI assistant requires ANTHROPIC_API_KEY to be configured.',
      toolCalls: [],
      updatedWorkflow: null,
    };
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const currentState = JSON.stringify({
    nodeCount: (workflow.nodes || []).length,
    nodes: (workflow.nodes || []).map(n => ({
      id: n.id,
      type: n.data?.type || n.type,
      label: n.data?.label,
      position: n.position,
      config: n.data?.config,
    })),
    edges: (workflow.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  }, null, 2);

  const systemPrompt = `You are Flowa's AI workflow assistant. You help users create and edit visual automation workflows through natural conversation.

## AVAILABLE NODE TYPES
${NODE_CATALOG}

## CURRENT WORKFLOW STATE
${currentState}

## TOOL USAGE RULES
- Use set_workflow when building a new workflow from scratch (replaces everything)
- Use add_node / update_node / remove_node / add_edge / remove_edge for targeted edits
- Node IDs: use format "{nodeType}-{timestamp}" e.g. "slack_send-1234567890"
- Edge IDs: use format "edge-{source}-{target}"
- Node positions: start at x:150, y:250; space 280px horizontally; branches ±150px vertically
- Every node object must have: id, type:"flowNode", position:{x,y}, data:{label, type, icon:"🔗", config:{}}
- Every edge object must have: id, source, target, type:"smoothstep", animated:true, style:{stroke:"#64748b",strokeWidth:2}
- Always populate config with sensible defaults

## GUIDELINES
- Explain what you're doing conversationally before or after using tools
- Suggest improvements when relevant
- Ask clarifying questions if the request is ambiguous`;

  const tools = [
    {
      name: 'set_workflow',
      description: 'Replace the entire workflow graph. Use when creating from scratch.',
      input_schema: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { type: 'object' } },
          edges: { type: 'array', items: { type: 'object' } },
        },
        required: ['nodes', 'edges'],
      },
    },
    {
      name: 'add_node',
      description: 'Add a single new node to the workflow.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nodeType: { type: 'string', description: 'Node type from the catalog (e.g. slack_send, http_request)' },
          label: { type: 'string' },
          position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
          config: { type: 'object' },
        },
        required: ['id', 'nodeType', 'label', 'position'],
      },
    },
    {
      name: 'update_node',
      description: 'Update the label or config of an existing node by its ID.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          config: { type: 'object' },
        },
        required: ['id'],
      },
    },
    {
      name: 'remove_node',
      description: 'Remove a node and its connected edges by ID.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    {
      name: 'add_edge',
      description: 'Connect two existing nodes.',
      input_schema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source node ID' },
          target: { type: 'string', description: 'Target node ID' },
        },
        required: ['source', 'target'],
      },
    },
    {
      name: 'remove_edge',
      description: 'Remove an edge by its ID.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  ];

  const claudeMessages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages: claudeMessages,
  });

  let updatedWorkflow = {
    nodes: JSON.parse(JSON.stringify(workflow.nodes || [])),
    edges: JSON.parse(JSON.stringify(workflow.edges || [])),
  };
  const toolCalls = [];
  let replyText = '';

  for (const block of response.content) {
    if (block.type === 'text') {
      replyText += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({ name: block.name, input: block.input });
      updatedWorkflow = applyWorkflowTool(updatedWorkflow, block.name, block.input);
    }
  }

  return {
    reply: replyText || (toolCalls.length > 0 ? 'Done! Workflow updated.' : "I can help you build workflows. What would you like to create?"),
    toolCalls,
    updatedWorkflow: toolCalls.length > 0 ? updatedWorkflow : null,
  };
}

module.exports = { generateWorkflow, explainError, debugNode, suggestNodes, documentWorkflow, workflowChat };

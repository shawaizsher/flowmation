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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate a workflow for: ${prompt}` }]
      });

      const text = response.content[0].text;
      const graph = JSON.parse(text);

      return {
        graph,
        description: prompt,
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
      result.model = 'claude-3-5-sonnet-20241022';
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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

module.exports = { generateWorkflow, explainError, debugNode, suggestNodes, documentWorkflow };

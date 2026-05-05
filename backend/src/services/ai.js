const logger = require('../utils/logger');

// ── LLM client factory ──
// Priority: GROQ_API_KEY (free) → OPENAI_API_KEY → null
function createLLMClient() {
  const OpenAI = require('openai');
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: 'gpt-4o-mini',
      provider: 'openai',
    };
  }
  return null;
}

// ── Shared chat helper for simple text-only calls ──
async function llmChat(systemContent, userContent, maxTokens = 2048) {
  const llm = createLLMClient();
  if (!llm) return null;

  const response = await llm.client.chat.completions.create({
    model: llm.model,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
  });

  return {
    text: response.choices[0].message.content,
    model: llm.model,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

// ── Strip markdown code fences that some models add around JSON ──
function stripCodeFence(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

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
        "config": {}
      }
    }
  ],
  "edges": [
    { "id": "edge-id", "source": "source-node-id", "target": "target-node-id" }
  ]
}

Available node types:
- trigger_manual, trigger_webhook, trigger_cron (triggers)
- http_request, rest_get, rest_post (HTTP)
- code_execute, transform_set, json_parse, transform_split, transform_merge, transform_filter (transform)
- logic_if, logic_switch, delay, loop_for_each (logic)
- openai_chat, anthropic_chat, ai_classify, ai_summarize (AI)
- email_send, slack_send (messaging)
- postgres_query, postgres_insert (databases)
- console_log, error_handler, wait_approval, date_time, math_operation (utilities)

Layout rules:
- Start trigger at x:100, y:200
- Space nodes ~300px apart horizontally
- Use y-offset for branches

Respond with ONLY the JSON object, no markdown, no explanation.`;

  try {
    const result = await llmChat(systemPrompt, `Generate a workflow for: ${prompt}`, 4096);
    if (!result) return generateFallbackWorkflow(prompt);

    const graph = JSON.parse(stripCodeFence(result.text));
    return { graph, description: prompt, model: result.model, tokensUsed: result.tokensUsed };
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
          type: 'trigger_manual',
          position: { x: 100, y: 200 },
          data: { label: 'Manual Trigger', type: 'trigger_manual', config: {} },
        },
        {
          id: 'log-1',
          type: 'console_log',
          position: { x: 400, y: 200 },
          data: { label: 'Log Output', type: 'console_log', config: { message: `Workflow: ${prompt}` } },
        },
      ],
      edges: [{ id: 'e-trigger-1-log-1', source: 'trigger-1', target: 'log-1' }],
    },
    description: prompt,
    model: 'fallback',
    tokensUsed: 0,
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
      input: l.input,
    })),
  };

  try {
    const result = await llmChat(
      'You are a workflow debugging assistant. Explain what went wrong in this workflow execution. Be concise and actionable. Respond ONLY in JSON: {"summary": "...", "root_cause": "...", "suggestions": ["..."]}',
      JSON.stringify(context),
      1024
    );
    if (result) return JSON.parse(stripCodeFence(result.text));
  } catch (err) {
    logger.error('AI explainError error:', err);
  }

  return {
    summary: execution.error || 'Execution failed',
    root_cause: failedLogs[0]?.error || 'Unknown error',
    suggestions: ['Check the failed node configuration', 'Verify input data format'],
  };
}

/**
 * Debug a failed node and suggest a fix
 */
async function debugNode({ nodeType, nodeLabel, config, error, input, configSchema }) {
  const context = { nodeType, nodeLabel, config, error, input, configSchema };

  try {
    const result = await llmChat(
      `You are a workflow automation debugger. Analyze this node failure and return a JSON object with:
- diagnosis: plain English explanation of what went wrong
- root_cause: the technical root cause
- fix: exact config changes as key-value pairs to fix the issue
- explanation: why this fix works
- prevention: tip to prevent this in the future

Respond with ONLY valid JSON.`,
      JSON.stringify(context),
      1024
    );
    if (result) {
      const parsed = JSON.parse(stripCodeFence(result.text));
      parsed.model = result.model;
      parsed.tokensUsed = result.tokensUsed;
      return parsed;
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
    tokensUsed: 0,
  };
}

/**
 * Suggest nodes to add to a workflow
 */
async function suggestNodes(graph) {
  try {
    const result = await llmChat(
      'Analyze this workflow graph and suggest 2-3 nodes that could enhance it. Respond ONLY in JSON: [{"type": "nodeType", "reason": "why this helps"}]',
      JSON.stringify(graph),
      512
    );
    if (result) return JSON.parse(stripCodeFence(result.text));
  } catch (err) {
    logger.error('AI suggestNodes error:', err);
  }

  return [
    { type: 'error_handler', reason: 'Add error handling for reliability' },
    { type: 'console_log', reason: 'Add logging for debugging' },
  ];
}

/**
 * Generate documentation for a workflow
 */
async function documentWorkflow(workflow) {
  try {
    const result = await llmChat(
      'Generate clear documentation for this workflow. Include: title, description, trigger, steps, inputs, outputs. Respond ONLY in JSON: {"title": "...", "description": "...", "steps": [{"node": "...", "description": "..."}], "inputs": [...], "outputs": [...]}',
      JSON.stringify(workflow),
      1024
    );
    if (result) return JSON.parse(stripCodeFence(result.text));
  } catch (err) {
    logger.error('AI documentWorkflow error:', err);
  }

  return {
    title: workflow.name || 'Untitled Workflow',
    description: workflow.description || 'No description available',
    steps: ((typeof workflow.graph === 'string' ? JSON.parse(workflow.graph) : workflow.graph)?.nodes || []).map(n => ({
      node: n.data?.label || n.id,
      description: `${n.data?.type || n.type} node`,
    })),
    inputs: [],
    outputs: [],
  };
}

// ── Node index for RAG retrieval ──
const NODE_INDEX = [
  // Triggers
  { type: 'trigger_webhook',    cat: 'TRIGGERS',    kw: 'webhook http receive trigger incoming request',           desc: 'Start workflow on incoming HTTP webhook' },
  { type: 'trigger_cron',       cat: 'TRIGGERS',    kw: 'schedule cron recurring timer interval daily weekly',    desc: 'Trigger on a recurring schedule' },
  { type: 'trigger_email',      cat: 'TRIGGERS',    kw: 'email receive inbox trigger imap',                       desc: 'Trigger when a new email arrives' },
  { type: 'trigger_manual',     cat: 'TRIGGERS',    kw: 'manual button click start trigger test',                 desc: 'Start workflow manually' },
  // Google
  { type: 'google_sheets_read',    cat: 'GOOGLE', kw: 'google sheets read spreadsheet rows data',                desc: 'Read rows from Google Sheets' },
  { type: 'google_sheets_write',   cat: 'GOOGLE', kw: 'google sheets write append update row spreadsheet',       desc: 'Write or append rows to Google Sheets' },
  { type: 'google_gmail_send',     cat: 'GOOGLE', kw: 'gmail send email google mail',                            desc: 'Send email via Gmail' },
  { type: 'google_gmail_read',     cat: 'GOOGLE', kw: 'gmail read email google mail inbox',                      desc: 'Read emails from Gmail' },
  { type: 'google_drive_upload',   cat: 'GOOGLE', kw: 'google drive upload file store',                          desc: 'Upload file to Google Drive' },
  { type: 'google_drive_list',     cat: 'GOOGLE', kw: 'google drive list files folder',                          desc: 'List files in Google Drive folder' },
  { type: 'google_calendar_create',cat: 'GOOGLE', kw: 'google calendar create event meeting schedule',           desc: 'Create calendar event in Google Calendar' },
  { type: 'google_translate',      cat: 'GOOGLE', kw: 'google translate language text',                          desc: 'Translate text using Google Translate' },
  { type: 'google_vision',         cat: 'GOOGLE', kw: 'google vision image ocr detect label',                    desc: 'Analyze images with Google Vision' },
  { type: 'google_maps_geocode',   cat: 'GOOGLE', kw: 'google maps geocode address location coordinates',        desc: 'Geocode addresses with Google Maps' },
  { type: 'youtube_search',        cat: 'GOOGLE', kw: 'youtube search video google',                             desc: 'Search YouTube videos' },
  // AI/ML
  { type: 'openai_chat',           cat: 'AI_ML', kw: 'openai gpt chat completion llm ai prompt generate text',  desc: 'Chat completion with OpenAI GPT models' },
  { type: 'openai_image',          cat: 'AI_ML', kw: 'openai dalle image generate picture ai',                   desc: 'Generate images with DALL-E' },
  { type: 'anthropic_chat',        cat: 'AI_ML', kw: 'anthropic claude chat completion llm ai prompt',           desc: 'Chat completion with Claude' },
  { type: 'huggingface_inference', cat: 'AI_ML', kw: 'huggingface model inference ml classification',            desc: 'Run inference on Hugging Face models' },
  { type: 'whisper_transcribe',    cat: 'AI_ML', kw: 'whisper transcribe audio speech to text openai',           desc: 'Transcribe audio to text with Whisper' },
  { type: 'ai_classify',           cat: 'AI_ML', kw: 'classify categorize label ai sentiment analysis',          desc: 'Classify or categorize text with AI' },
  { type: 'ai_summarize',          cat: 'AI_ML', kw: 'summarize summary text ai shorten abstract',               desc: 'Summarize text with AI' },
  { type: 'ai_embed',              cat: 'AI_ML', kw: 'embed embedding vector text semantic search',              desc: 'Generate text embeddings' },
  // Social
  { type: 'twitter_post',          cat: 'SOCIAL', kw: 'twitter tweet post social media x',                       desc: 'Post a tweet on Twitter/X' },
  { type: 'twitter_search',        cat: 'SOCIAL', kw: 'twitter search tweets social media x',                    desc: 'Search tweets on Twitter/X' },
  { type: 'instagram_post',        cat: 'SOCIAL', kw: 'instagram post photo social media',                       desc: 'Post to Instagram' },
  { type: 'linkedin_post',         cat: 'SOCIAL', kw: 'linkedin post professional social network',               desc: 'Post to LinkedIn' },
  { type: 'reddit_post',           cat: 'SOCIAL', kw: 'reddit post subreddit social',                            desc: 'Post to Reddit' },
  // Messaging
  { type: 'slack_send',            cat: 'MESSAGING', kw: 'slack send message channel notify alert',              desc: 'Send a message to a Slack channel' },
  { type: 'slack_create_channel',  cat: 'MESSAGING', kw: 'slack create channel workspace',                       desc: 'Create a Slack channel' },
  { type: 'discord_send',          cat: 'MESSAGING', kw: 'discord send message channel bot notify',              desc: 'Send a message to Discord' },
  { type: 'telegram_send',         cat: 'MESSAGING', kw: 'telegram send message bot notify',                     desc: 'Send a message via Telegram bot' },
  { type: 'whatsapp_send',         cat: 'MESSAGING', kw: 'whatsapp send message sms chat',                       desc: 'Send a WhatsApp message' },
  { type: 'email_send',            cat: 'MESSAGING', kw: 'email send smtp notify alert message',                 desc: 'Send an email via SMTP' },
  { type: 'twilio_sms',            cat: 'MESSAGING', kw: 'twilio sms text message phone notify',                 desc: 'Send SMS via Twilio' },
  // Databases
  { type: 'postgres_query',        cat: 'DATABASES', kw: 'postgres postgresql sql database query select',        desc: 'Run a SQL query on PostgreSQL' },
  { type: 'postgres_insert',       cat: 'DATABASES', kw: 'postgres postgresql sql insert write database',        desc: 'Insert rows into PostgreSQL' },
  { type: 'mysql_query',           cat: 'DATABASES', kw: 'mysql sql database query select',                      desc: 'Run a SQL query on MySQL' },
  { type: 'mongodb_find',          cat: 'DATABASES', kw: 'mongodb nosql find query document collection',         desc: 'Query documents in MongoDB' },
  { type: 'mongodb_insert',        cat: 'DATABASES', kw: 'mongodb nosql insert document collection',             desc: 'Insert documents into MongoDB' },
  { type: 'redis_get',             cat: 'DATABASES', kw: 'redis cache get key value store read',                 desc: 'Get a value from Redis' },
  { type: 'redis_set',             cat: 'DATABASES', kw: 'redis cache set key value store write',                desc: 'Set a value in Redis' },
  { type: 'firebase_read',         cat: 'DATABASES', kw: 'firebase firestore realtime database read google',     desc: 'Read from Firebase' },
  { type: 'firebase_write',        cat: 'DATABASES', kw: 'firebase firestore realtime database write google',    desc: 'Write to Firebase' },
  { type: 'supabase_query',        cat: 'DATABASES', kw: 'supabase postgres query database sql',                 desc: 'Query Supabase database' },
  // Cloud
  { type: 'aws_s3_upload',         cat: 'CLOUD', kw: 'aws s3 upload file storage bucket amazon',                desc: 'Upload file to AWS S3' },
  { type: 'aws_s3_read',           cat: 'CLOUD', kw: 'aws s3 read download file storage bucket amazon',         desc: 'Read file from AWS S3' },
  { type: 'aws_lambda_invoke',     cat: 'CLOUD', kw: 'aws lambda invoke function serverless amazon',             desc: 'Invoke an AWS Lambda function' },
  { type: 'aws_sns_publish',       cat: 'CLOUD', kw: 'aws sns publish notification amazon queue',                desc: 'Publish to AWS SNS topic' },
  { type: 'github_create_pr',      cat: 'CLOUD', kw: 'github pull request create code repository',              desc: 'Create a GitHub pull request' },
  { type: 'github_commit',         cat: 'CLOUD', kw: 'github commit push code repository git',                  desc: 'Commit to a GitHub repository' },
  { type: 'docker_run',            cat: 'CLOUD', kw: 'docker run container image execute',                      desc: 'Run a Docker container' },
  { type: 'vercel_deploy',         cat: 'CLOUD', kw: 'vercel deploy deployment frontend serverless',             desc: 'Deploy to Vercel' },
  // HTTP
  { type: 'http_request',          cat: 'HTTP', kw: 'http request api call get post put delete rest',            desc: 'Make an HTTP request to any URL' },
  { type: 'graphql_query',         cat: 'HTTP', kw: 'graphql query api request mutation',                        desc: 'Execute a GraphQL query' },
  { type: 'rest_get',              cat: 'HTTP', kw: 'rest get api http fetch read',                              desc: 'HTTP GET request' },
  { type: 'rest_post',             cat: 'HTTP', kw: 'rest post api http send create',                            desc: 'HTTP POST request' },
  { type: 'rest_put',              cat: 'HTTP', kw: 'rest put api http update replace',                          desc: 'HTTP PUT request' },
  { type: 'rest_delete',           cat: 'HTTP', kw: 'rest delete api http remove',                               desc: 'HTTP DELETE request' },
  // Files
  { type: 'file_read',             cat: 'FILES', kw: 'file read local storage open load',                        desc: 'Read a local file' },
  { type: 'file_write',            cat: 'FILES', kw: 'file write save local storage create',                     desc: 'Write a local file' },
  { type: 'csv_parse',             cat: 'FILES', kw: 'csv parse read comma separated spreadsheet',               desc: 'Parse CSV data' },
  { type: 'csv_generate',          cat: 'FILES', kw: 'csv generate write export comma separated',                desc: 'Generate a CSV file' },
  { type: 'pdf_extract',           cat: 'FILES', kw: 'pdf extract text parse read document',                     desc: 'Extract text from a PDF' },
  { type: 'pdf_generate',          cat: 'FILES', kw: 'pdf generate create document report',                      desc: 'Generate a PDF document' },
  { type: 'ftp_upload',            cat: 'FILES', kw: 'ftp upload file server sftp transfer',                     desc: 'Upload file via FTP/SFTP' },
  // Transform
  { type: 'transform_set',         cat: 'TRANSFORM', kw: 'set variable value transform map field',               desc: 'Set or map data fields' },
  { type: 'json_parse',            cat: 'TRANSFORM', kw: 'json parse string object convert',                     desc: 'Parse a JSON string' },
  { type: 'json_stringify',        cat: 'TRANSFORM', kw: 'json stringify serialize string convert',              desc: 'Stringify an object to JSON' },
  { type: 'xml_parse',             cat: 'TRANSFORM', kw: 'xml parse convert object',                             desc: 'Parse XML data' },
  { type: 'code_execute',          cat: 'TRANSFORM', kw: 'code run execute javascript python custom logic',      desc: 'Run custom code' },
  { type: 'transform_filter',      cat: 'TRANSFORM', kw: 'filter array data remove where condition',             desc: 'Filter array items by condition' },
  { type: 'transform_split',       cat: 'TRANSFORM', kw: 'split array divide chunk items',                       desc: 'Split array into batches' },
  { type: 'transform_merge',       cat: 'TRANSFORM', kw: 'merge combine join objects arrays data',               desc: 'Merge multiple data objects' },
  { type: 'transform_map',         cat: 'TRANSFORM', kw: 'map transform each item array modify',                 desc: 'Map over array items' },
  // Logic
  { type: 'logic_if',              cat: 'LOGIC', kw: 'if condition branch decision yes no',                      desc: 'Branch on a condition' },
  { type: 'logic_switch',          cat: 'LOGIC', kw: 'switch case condition multiple branch route',              desc: 'Route to multiple branches' },
  { type: 'error_handler',         cat: 'LOGIC', kw: 'error handle catch failure retry',                         desc: 'Handle errors gracefully' },
  { type: 'delay',                 cat: 'LOGIC', kw: 'delay wait pause sleep timeout',                           desc: 'Pause execution for a duration' },
  { type: 'loop_for_each',         cat: 'LOGIC', kw: 'loop foreach iterate each item array repeat',              desc: 'Iterate over each item in an array' },
  // CRM
  { type: 'salesforce_query',      cat: 'CRM', kw: 'salesforce crm query lead contact account',                  desc: 'Query Salesforce CRM' },
  { type: 'salesforce_create',     cat: 'CRM', kw: 'salesforce crm create lead contact account',                 desc: 'Create record in Salesforce' },
  { type: 'hubspot_contact',       cat: 'CRM', kw: 'hubspot crm contact lead create update',                     desc: 'Create or update HubSpot contact' },
  { type: 'airtable_find',         cat: 'CRM', kw: 'airtable find query record database spreadsheet',            desc: 'Find records in Airtable' },
  { type: 'airtable_create',       cat: 'CRM', kw: 'airtable create record database spreadsheet',                desc: 'Create a record in Airtable' },
  { type: 'notion_page',           cat: 'CRM', kw: 'notion create page document note',                           desc: 'Create a Notion page' },
  { type: 'notion_database',       cat: 'CRM', kw: 'notion database query record',                               desc: 'Query a Notion database' },
  // Productivity
  { type: 'jira_create',           cat: 'PRODUCTIVITY', kw: 'jira ticket issue create project management',       desc: 'Create a Jira issue' },
  { type: 'jira_update',           cat: 'PRODUCTIVITY', kw: 'jira ticket issue update status project',           desc: 'Update a Jira issue' },
  { type: 'trello_card',           cat: 'PRODUCTIVITY', kw: 'trello card board create task project',             desc: 'Create a Trello card' },
  { type: 'asana_task',            cat: 'PRODUCTIVITY', kw: 'asana task create project management',              desc: 'Create an Asana task' },
  { type: 'monday_item',           cat: 'PRODUCTIVITY', kw: 'monday item board create task project',             desc: 'Create a Monday.com item' },
  { type: 'clickup_task',          cat: 'PRODUCTIVITY', kw: 'clickup task create project management',            desc: 'Create a ClickUp task' },
  // Ecommerce
  { type: 'shopify_order',         cat: 'ECOMMERCE', kw: 'shopify order ecommerce store sales',                  desc: 'Get or process Shopify orders' },
  { type: 'shopify_product',       cat: 'ECOMMERCE', kw: 'shopify product ecommerce store inventory',            desc: 'Manage Shopify products' },
  { type: 'woocommerce_order',     cat: 'ECOMMERCE', kw: 'woocommerce order ecommerce wordpress',                desc: 'Get or process WooCommerce orders' },
  // Payments
  { type: 'stripe_payment_intent', cat: 'PAYMENTS', kw: 'stripe payment charge create intent',                   desc: 'Create a Stripe payment intent' },
  { type: 'paypal_payment',        cat: 'PAYMENTS', kw: 'paypal payment create charge',                          desc: 'Create a PayPal payment' },
  { type: 'stripe_refund',         cat: 'PAYMENTS', kw: 'stripe refund payment return money',                    desc: 'Refund a Stripe payment' },
  { type: 'stripe_charge',         cat: 'PAYMENTS', kw: 'stripe charge payment legacy',                          desc: 'Create a Stripe charge' },
  // Analytics
  { type: 'google_analytics_event',cat: 'ANALYTICS', kw: 'google analytics event track ga4',                    desc: 'Track event in Google Analytics' },
  { type: 'mixpanel_track',        cat: 'ANALYTICS', kw: 'mixpanel track event analytics product',               desc: 'Track event in Mixpanel' },
  { type: 'segment_identify',      cat: 'ANALYTICS', kw: 'segment identify user track analytics cdp',            desc: 'Identify user in Segment' },
  // Utilities
  { type: 'console_log',           cat: 'UTILITIES', kw: 'log debug print output console',                       desc: 'Log a value for debugging' },
  { type: 'date_time',             cat: 'UTILITIES', kw: 'date time format now current timestamp',               desc: 'Get or format date/time' },
  { type: 'math_operation',        cat: 'UTILITIES', kw: 'math calculate arithmetic add multiply',               desc: 'Perform a math operation' },
  { type: 'wait_approval',         cat: 'UTILITIES', kw: 'wait approval human review pause manual',              desc: 'Pause and wait for human approval' },
  { type: 'random',                cat: 'UTILITIES', kw: 'random number generate uuid pick chance',              desc: 'Generate a random value' },
  { type: 'uuid_generate',         cat: 'UTILITIES', kw: 'uuid generate unique id identifier',                   desc: 'Generate a UUID' },
  { type: 'base64_encode',         cat: 'UTILITIES', kw: 'base64 encode decode convert binary',                  desc: 'Base64 encode or decode data' },
  { type: 'hash',                  cat: 'UTILITIES', kw: 'hash sha md5 checksum digest',                         desc: 'Hash data with SHA/MD5' },
];

// Keyword-based RAG retrieval — returns top-N most relevant nodes for the query
function retrieveNodes(query, topN = 22) {
  const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (tokens.length === 0) return NODE_INDEX.slice(0, topN);

  const scored = NODE_INDEX.map(node => {
    const haystack = `${node.type} ${node.cat} ${node.kw} ${node.desc}`.toLowerCase();
    const score = tokens.reduce((s, t) => s + (haystack.match(new RegExp(t, 'g')) || []).length, 0);
    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN).map(s => s.node);

  // Always include at least one trigger and one logic node
  if (!top.some(n => n.cat === 'TRIGGERS')) top.push(NODE_INDEX.find(n => n.type === 'trigger_manual'));
  if (!top.some(n => n.cat === 'LOGIC'))    top.push(NODE_INDEX.find(n => n.type === 'logic_if'));

  return top;
}

function formatNodeCatalog(nodes) {
  const byCategory = {};
  for (const n of nodes) {
    (byCategory[n.cat] = byCategory[n.cat] || []).push(`${n.type} — ${n.desc}`);
  }
  return Object.entries(byCategory)
    .map(([cat, items]) => `${cat}:\n  ${items.join('\n  ')}`)
    .join('\n');
}

// ── Workflow tool definitions (OpenAI / Groq function-calling format) ──
const WORKFLOW_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'set_workflow',
      description: 'Replace the entire workflow graph. Use when creating from scratch.',
      parameters: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { type: 'object' } },
          edges: { type: 'array', items: { type: 'object' } },
        },
        required: ['nodes', 'edges'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_node',
      description: 'Add a single new node to the workflow.',
      parameters: {
        type: 'object',
        properties: {
          id:       { type: 'string' },
          nodeType: { type: 'string', description: 'Node type from the catalog e.g. slack_send, http_request' },
          label:    { type: 'string' },
          position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
          config:   { type: 'object' },
        },
        required: ['id', 'nodeType', 'label', 'position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_node',
      description: 'Update the label or config of an existing node by its ID.',
      parameters: {
        type: 'object',
        properties: {
          id:     { type: 'string' },
          label:  { type: 'string' },
          config: { type: 'object' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_node',
      description: 'Remove a node and its connected edges by ID.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_edge',
      description: 'Connect two existing nodes.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
        },
        required: ['source', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_edge',
      description: 'Remove an edge by its ID.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
];

// Parse text-based tool calls that some models (Llama on Groq) emit instead of
// using the proper OpenAI tool_calls field. Handles patterns like:
//   <function(update_node){"id": "...", "label": "..."}</function>
//   <function=update_node>{"id": "...", "label": "..."}</function>
//   <tool_call>{"name": "update_node", "arguments": {...}}</tool_call>
function parseTextToolCalls(text) {
  if (!text) return [];
  const calls = [];
  let match;

  // Pattern: <function(name){json}</function>  or  <function=name>{json}</function>
  const re1 = /<function[\(=]([a-z_]+)\)?\s*(\{[\s\S]*?\})\s*<\/function>/gi;
  while ((match = re1.exec(text)) !== null) {
    try {
      calls.push({ name: match[1].trim(), input: JSON.parse(match[2]) });
    } catch {}
  }

  // Pattern: <tool_call>{"name":"x","arguments":{...}}</tool_call>
  const re2 = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/gi;
  while ((match = re2.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      if (obj.name && obj.arguments) calls.push({ name: obj.name, input: obj.arguments });
    } catch {}
  }

  return calls;
}

// Apply a single tool call to the in-memory workflow state
function applyWorkflowTool(workflow, toolName, input) {
  const nodes = [...workflow.nodes];
  const edges = [...workflow.edges];

  switch (toolName) {
    case 'set_workflow':
      return {
        nodes: (input.nodes || []).map(n => ({
          ...n,
          type: 'flowNode',
          data: {
            ...(n.data || {}),
            type: n.data?.type || n.type || 'unknown',
            icon: n.data?.icon || '🔗',
            config: n.data?.config || {},
          },
        })),
        edges: (input.edges || []).map(e => ({
          ...e,
          type: e.type || 'smoothstep',
          animated: e.animated !== undefined ? e.animated : true,
          style: e.style || { stroke: '#64748b', strokeWidth: 2 },
        })),
      };

    case 'add_node': {
      const newNode = {
        id: input.id,
        type: 'flowNode',
        position: input.position,
        data: { label: input.label, type: input.nodeType, icon: '🔗', config: input.config || {} },
      };
      return { nodes: [...nodes, newNode], edges };
    }

    case 'update_node':
      return {
        nodes: nodes.map(n => n.id !== input.id ? n : {
          ...n,
          data: {
            ...n.data,
            ...(input.label ? { label: input.label } : {}),
            config: { ...(n.data?.config || {}), ...(input.config || {}) },
          },
        }),
        edges,
      };

    case 'remove_node':
      return {
        nodes: nodes.filter(n => n.id !== input.id),
        edges: edges.filter(e => e.source !== input.id && e.target !== input.id),
      };

    case 'add_edge': {
      if (edges.some(e => e.source === input.source && e.target === input.target)) return { nodes, edges };
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
 * Conversational RAG agent for workflow creation and editing.
 * - Retrieves relevant nodes via keyword search (RAG)
 * - Runs a multi-turn tool-use loop so the model sees tool results
 * - Uses Groq (free) → OpenAI as fallback
 */
async function workflowChat({ message, history, workflow }) {
  const llm = createLLMClient();
  if (!llm) {
    return {
      reply: 'AI assistant requires GROQ_API_KEY or OPENAI_API_KEY to be configured.',
      toolCalls: [],
      updatedWorkflow: null,
    };
  }

  // RAG: retrieve the most relevant nodes for this turn
  const ragQuery = [message, ...history.slice(-4).map(h => h.content)].join(' ');
  const nodeCatalogSection = formatNodeCatalog(retrieveNodes(ragQuery, 22));

  const currentState = JSON.stringify({
    nodeCount: (workflow.nodes || []).length,
    nodes: (workflow.nodes || []).map(n => ({
      id: n.id,
      type: n.data?.type || n.type,
      label: n.data?.label,
      position: n.position,
      config: n.data?.config,
    })),
    edges: (workflow.edges || []).map(e => ({ id: e.id, source: e.source, target: e.target })),
  }, null, 2);

  const systemContent = `You are Freckles, Flowa's workflow automation assistant. You help users build and edit visual automation workflows on the canvas.

## SCOPE
- Help with: building workflows, editing nodes, connecting nodes, configuring node settings, debugging workflow logic, suggesting integrations.
- For off-topic requests (general coding help unrelated to workflows, trivia, writing, math homework, "what is a linked list", etc.), reply ONLY: "I can only help with building workflows. What would you like to automate?"

## HOW TO HANDLE REQUESTS
1. **Clear and unambiguous** → call the tool immediately and confirm in one sentence.
2. **Ambiguous but workflow-related** → ask ONE specific clarifying question. Examples:
   - User says "change code to 1 to 10 loop" → ask: "Got it — should the loop iterate over the array [1,2,3,4,5,6,7,8,9,10], or run a range from 1 to 10?"
   - User says "add a notification" → ask: "Slack, email, or Discord?"
3. **Refers to "the existing node" / "this code" / "current workflow"** → look at the CURRENT WORKFLOW STATE below. The user is referring to nodes that already exist there. Use their actual IDs when calling tools.

## RESPONSE STYLE
- Be direct, warm, and brief. One sentence per action.
- After calling a tool, describe what you did in one short sentence: "Updated the loop node to iterate 1 through 10."
- Don't list options the user didn't ask for.
- Don't say "I won't make any changes" — either act, or ask one focused question.
- NEVER write \`<function>\`, \`<tool_call>\`, raw JSON, or function-call syntax in your text. Tool invocation is automatic — text is for talking to the user only.

## TOOL USAGE RULES
- Use set_workflow when building from scratch (replaces everything)
- Use add_node / update_node / remove_node / add_edge / remove_edge for targeted edits
- **CRITICAL — node IDs:** When editing an EXISTING node, you MUST use the exact \`id\` value from the CURRENT WORKFLOW STATE section below. Never invent IDs. Never use placeholders like "1234567890". For NEW nodes, generate \`{nodeType}-{Date.now()}\` style IDs.
- Node positions for new nodes: start at x:150, y:250; space 280px horizontally; branches ±150px vertically
- Every new node must include: id, type:"flowNode", position:{x,y}, data:{label, type, icon:"🔗", config:{}}
- Every new edge must include: id, source, target, type:"smoothstep", animated:true, style:{stroke:"#64748b",strokeWidth:2}
- Always populate config with sensible defaults

## AVAILABLE NODE TYPES (retrieved for this request)
${nodeCatalogSection}

## CURRENT WORKFLOW STATE
${currentState}`;

  const messages = [
    { role: 'system', content: systemContent },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  let updatedWorkflow = {
    nodes: JSON.parse(JSON.stringify(workflow.nodes || [])),
    edges: JSON.parse(JSON.stringify(workflow.edges || [])),
  };
  const allToolCalls = [];
  let finalReply = '';

  try {
    const MAX_ROUNDS = 5;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await llm.client.chat.completions.create({
        model: llm.model,
        max_tokens: 4096,
        temperature: 0.4,
        tools: WORKFLOW_TOOLS,
        tool_choice: 'auto',
        messages,
      });

      const msg = response.choices[0].message;
      const rawContent = msg.content || '';
      const toolCalls = msg.tool_calls || [];
      const textCalls = toolCalls.length === 0 ? parseTextToolCalls(rawContent) : [];

      if (toolCalls.length === 0 && textCalls.length === 0) {
        // Pure text response — this is the final reply, nothing to strip
        finalReply = rawContent.trim();
        break;
      }

      if (toolCalls.length > 0) {
        // ── Proper OpenAI/Groq tool_calls ──
        // Keep any text the model wrote before the tool call as preamble only
        // (don't set finalReply yet — wait for the follow-up text round)
        const toolResults = [];
        for (const call of toolCalls) {
          try {
            const input = JSON.parse(call.function.arguments);
            allToolCalls.push({ name: call.function.name, input });
            updatedWorkflow = applyWorkflowTool(updatedWorkflow, call.function.name, input);
            toolResults.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ success: true, applied: call.function.name }),
            });
          } catch (parseErr) {
            logger.warn('Failed to parse tool call arguments:', call.function.arguments);
          }
        }
        messages.push({ role: 'assistant', content: rawContent, tool_calls: toolCalls });
        messages.push(...toolResults);

        if (response.choices[0].finish_reason !== 'tool_calls') break;

      } else {
        // ── Fallback: model leaked tool calls as text ──
        // Do NOT put rawContent into finalReply — it's tainted with function-call syntax.
        for (const call of textCalls) {
          allToolCalls.push(call);
          updatedWorkflow = applyWorkflowTool(updatedWorkflow, call.name, call.input);
        }
        // Ask for one clean sentence confirming what was done
        messages.push({ role: 'assistant', content: rawContent });
        messages.push({
          role: 'user',
          content: '[System: tool calls applied. Reply in plain text only — one sentence confirming what changed. No function syntax.]',
        });
      }
    }
  } catch (err) {
    logger.error('workflowChat loop error:', err);
    return {
      reply: 'Something went wrong while processing your request. Please try again.',
      toolCalls: allToolCalls,
      updatedWorkflow: allToolCalls.length > 0 ? updatedWorkflow : null,
    };
  }

  return {
    reply: finalReply || (allToolCalls.length > 0 ? 'Done! Workflow updated.' : "I can help you build workflows. What would you like to create?"),
    toolCalls: allToolCalls,
    updatedWorkflow: allToolCalls.length > 0 ? updatedWorkflow : null,
  };
}

module.exports = { generateWorkflow, explainError, debugNode, suggestNodes, documentWorkflow, workflowChat };

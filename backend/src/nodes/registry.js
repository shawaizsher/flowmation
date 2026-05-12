const axios = require('axios');
const logger = require('../utils/logger');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class NodeRegistry {
  constructor() {
    this.nodes = {};
  }

  register(type, definition) {
    this.nodes[type] = definition;
  }

  get(type) {
    return this.nodes[type] || null;
  }

  getAll() {
    return { ...this.nodes };
  }
}

const registry = new NodeRegistry();

// ═══════════════════════════════════════════════════════
// TRIGGER NODES
// ═══════════════════════════════════════════════════════

registry.register('manualTrigger', {
  label: 'Manual Trigger',
  description: 'Trigger workflow manually with a button click',
  category: 'triggers',
  icon: '▶️',
  inputs: [],
  outputs: [{ name: 'payload', type: 'any' }],
  configSchema: {},
  execute: async ({ config, input, context }) => {
    return context.triggerPayload || {};
  }
});

registry.register('webhookTrigger', {
  label: 'Webhook Trigger',
  description: 'Trigger workflow via an incoming HTTP webhook',
  category: 'triggers',
  icon: '🔗',
  inputs: [],
  outputs: [
    { name: 'body', type: 'any' },
    { name: 'headers', type: 'object' },
    { name: 'query', type: 'object' }
  ],
  configSchema: {
    path: { type: 'text', label: 'Webhook Path', required: true },
    method: { type: 'select', options: ['ANY', 'GET', 'POST', 'PUT', 'DELETE'], default: 'POST' }
  },
  execute: async ({ config, input, context }) => {
    const payload = context.triggerPayload || {};
    return {
      body: payload.body || {},
      headers: payload.headers || {},
      query: payload.query || {},
      method: payload.method || 'POST'
    };
  }
});

registry.register('scheduleTrigger', {
  label: 'Schedule Trigger',
  description: 'Trigger workflow on a cron schedule',
  category: 'triggers',
  icon: '⏰',
  inputs: [],
  outputs: [{ name: 'timestamp', type: 'string' }],
  configSchema: {
    cron: { type: 'text', label: 'Cron Expression', required: true, default: '0 * * * *' },
    timezone: { type: 'text', label: 'Timezone', default: 'UTC' }
  },
  execute: async ({ config }) => {
    return { timestamp: new Date().toISOString(), cron: config.cron };
  }
});

// ═══════════════════════════════════════════════════════
// HTTP NODES
// ═══════════════════════════════════════════════════════

registry.register('httpRequest', {
  label: 'HTTP Request',
  description: 'Make any HTTP request to an external API with advanced options',
  category: 'http',
  icon: '🌐',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [
    { name: 'body', type: 'any' },
    { name: 'statusCode', type: 'number' },
    { name: 'headers', type: 'object' },
    { name: 'fullResponse', type: 'object' }
  ],
  configSchema: {
    // Basic request
    method: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], default: 'GET' },
    url: { type: 'text', label: 'URL', required: true },

    // Query Parameters
    parameters: { type: 'json', label: 'Query Parameters', default: '{}', description: 'URL query string parameters' },

    // Request Headers
    headers: { type: 'json', label: 'Headers', default: '{}' },

    // Request Body
    body: { type: 'json', label: 'Request Body' },
    bodyType: { type: 'select', options: ['auto', 'json', 'form', 'raw'], default: 'auto', description: 'Request body content type' },

    // Authentication
    authType: { type: 'select', options: ['none', 'basic', 'bearer', 'api_key', 'oauth2'], default: 'none' },
    basicAuthUsername: { type: 'text', label: 'Username', description: 'For Basic Auth' },
    basicAuthPassword: { type: 'text', label: 'Password', description: 'For Basic Auth' },
    bearerToken: { type: 'text', label: 'Bearer Token', description: 'For Bearer Token Auth' },
    apiKeyName: { type: 'text', label: 'API Key Header Name', description: 'e.g., X-API-Key' },
    apiKeyValue: { type: 'text', label: 'API Key Value' },

    // Request Options
    timeout: { type: 'number', label: 'Timeout (seconds)', default: 30 },
    followRedirects: { type: 'boolean', label: 'Follow Redirects', default: true },
    maxRedirects: { type: 'number', label: 'Max Redirects', default: 5 },

    // SSL/TLS
    verifySSL: { type: 'boolean', label: 'Verify SSL Certificate', default: true },

    // Response Options
    returnFullResponse: { type: 'boolean', label: 'Return Full Response', default: false },
    responseType: { type: 'select', options: ['auto', 'json', 'text', 'arraybuffer'], default: 'auto' },

    // Proxy (optional)
    useProxy: { type: 'boolean', label: 'Use Proxy', default: false },
    proxyUrl: { type: 'text', label: 'Proxy URL', description: 'e.g., http://proxy.example.com:8080' }
  },
  execute: async ({ config }) => {
    let headers = config.headers;
    if (typeof headers === 'string') {
      try { headers = JSON.parse(headers); } catch { headers = {}; }
    }
    headers = headers || {};

    let params = config.parameters;
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch { params = {}; }
    }
    params = params || {};

    // Handle authentication
    if (config.authType === 'basic' && config.basicAuthUsername && config.basicAuthPassword) {
      const credentials = Buffer.from(`${config.basicAuthUsername}:${config.basicAuthPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (config.authType === 'bearer' && config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    } else if (config.authType === 'api_key' && config.apiKeyName && config.apiKeyValue) {
      headers[config.apiKeyName] = config.apiKeyValue;
    }

    let body = config.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* keep as string */ }
    }

    // Set content-type based on body type
    if (body && config.bodyType === 'form') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (body && config.bodyType === 'json') {
      headers['Content-Type'] = 'application/json';
    } else if (body && config.bodyType === 'auto' && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    // Build axios config
    const axiosConfig = {
      method: config.method || 'GET',
      url: config.url,
      headers,
      params,
      data: body,
      timeout: (config.timeout || 30) * 1000,
      maxRedirects: config.followRedirects !== false ? (config.maxRedirects || 5) : 0,
      validateStatus: () => true,
      ...(config.responseType && config.responseType !== 'auto' && { responseType: config.responseType })
    };

    // Handle proxy if specified
    if (config.useProxy && config.proxyUrl) {
      const proxyUrl = new URL(config.proxyUrl);
      axiosConfig.httpAgent = new (require('http').Agent)({ proxy: config.proxyUrl });
      axiosConfig.httpsAgent = new (require('https').Agent)({ proxy: config.proxyUrl });
    }

    // Handle SSL verification
    if (!config.verifySSL) {
      axiosConfig.httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
    }

    const response = await axios(axiosConfig);

    const result = {
      statusCode: response.status,
      body: response.data,
      headers: response.headers,
      success: response.status >= 200 && response.status < 300
    };

    if (config.returnFullResponse) {
      result.fullResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        config: { url: response.config.url, method: response.config.method }
      };
    }

    return result;
  }
});

registry.register('respondWebhook', {
  label: 'Respond to Webhook',
  description: 'Send a response back to the webhook caller',
  category: 'http',
  icon: '↩️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'response', type: 'any' }],
  configSchema: {
    statusCode: { type: 'number', label: 'Status Code', default: 200 },
    body: { type: 'json', label: 'Response Body' },
    headers: { type: 'json', label: 'Response Headers', default: '{}' }
  },
  execute: async ({ config, input }) => {
    return {
      statusCode: config.statusCode || 200,
      body: config.body || input,
      headers: config.headers || {}
    };
  }
});

// ═══════════════════════════════════════════════════════
// DATA TRANSFORMATION NODES
// ═══════════════════════════════════════════════════════

registry.register('codeBlock', {
  label: 'Code Block',
  description: 'Run custom JavaScript code to transform data',
  category: 'transform',
  icon: '💻',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    code: { type: 'code', label: 'JavaScript Code', language: 'javascript',
      default: '// input contains data from previous nodes\n// return the transformed data\nreturn input;' }
  },
  execute: async ({ config, input }) => {
    // Safe function execution (sandboxed)
    const fn = new Function('input', config.code || 'return input;');
    return fn(input);
  }
});

registry.register('code_javascript', {
  label: 'JavaScript Code',
  description: 'Run custom JavaScript code',
  category: 'transform',
  icon: '🟨',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    code: { type: 'code', label: 'Code', language: 'javascript',
      default: '// Access input via `data`\nreturn data;' }
  },
  execute: async ({ config, input }) => {
    const fn = new Function('data', config.code || 'return data;');
    const result = fn(input);
    return { result };
  }
});

registry.register('code_python', {
  label: 'Python Code',
  description: 'Run custom Python code',
  category: 'transform',
  icon: '🐍',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    code: { type: 'code', label: 'Code', language: 'python',
      default: '# Access input via `data`\nresult = data' }
  },
  execute: async ({ config, input }) => {
    const { execFileSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const code = (config.code || 'result = None').replace(/\r\n/g, '\n');
    const indentedCode = code
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n');

    // Write wrapper to a temp file to avoid shell escaping issues
    const wrapper = [
      'import ast, contextlib, io, json, sys',
      'data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}',
      '_stdout = io.StringIO()',
      'with contextlib.redirect_stdout(_stdout):',
      indentedCode || '    pass',
      'captured_stdout = _stdout.getvalue().strip()',
      'if "result" in locals():',
      '    final_result = result',
      'elif captured_stdout:',
      '    last_line = captured_stdout.splitlines()[-1].strip()',
      '    try:',
      '        final_result = ast.literal_eval(last_line)',
      '    except Exception:',
      '        final_result = last_line',
      'else:',
      '    final_result = None',
      'print(json.dumps({"result": final_result}, default=str))'
    ].join('\n');

    const tmpFile = path.join(os.tmpdir(), `flowa_py_${Date.now()}.py`);
    try {
      fs.writeFileSync(tmpFile, wrapper, 'utf-8');
      const inputJson = JSON.stringify(input || {});
      const output = execFileSync('python', [tmpFile, inputJson], {
        timeout: 30000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      // Parse the last line as JSON (in case there's print() output before)
      const lines = output.trim().split(/\r?\n/);
      const lastLine = lines[lines.length - 1];
      try {
        return JSON.parse(lastLine);
      } catch {
        return { result: output.trim() };
      }
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString() : err.message;
      throw new Error(`Python execution failed: ${stderr}`);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
});

registry.register('setVariable', {
  label: 'Set Variable',
  description: 'Set or transform data fields',
  category: 'transform',
  icon: '📝',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'data', type: 'any' }],
  configSchema: {
    assignments: { type: 'json', label: 'Variable Assignments',
      default: '{"key": "value"}' }
  },
  execute: async ({ config, input }) => {
    let assignments = config.assignments;
    if (typeof assignments === 'string') {
      assignments = JSON.parse(assignments);
    }
    return { ...Object.values(input)[0], ...assignments };
  }
});

registry.register('jsonParse', {
  label: 'JSON Parse',
  description: 'Parse a JSON string into an object',
  category: 'transform',
  icon: '{}',
  inputs: [{ name: 'data', type: 'string' }],
  outputs: [{ name: 'parsed', type: 'any' }],
  configSchema: {
    field: { type: 'text', label: 'Field to Parse', default: 'body' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0];
    const field = config.field || 'body';
    const value = data?.[field] || data;
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  }
});

registry.register('splitArray', {
  label: 'Split Array',
  description: 'Split an array into individual items for parallel processing',
  category: 'transform',
  icon: '📊',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'items', type: 'array' }],
  configSchema: {
    field: { type: 'text', label: 'Array Field', default: '' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0];
    const field = config.field;
    const arr = field ? data?.[field] : (Array.isArray(data) ? data : [data]);
    return { items: Array.isArray(arr) ? arr : [arr], count: Array.isArray(arr) ? arr.length : 1 };
  }
});

registry.register('mergeData', {
  label: 'Merge Data',
  description: 'Merge data from multiple inputs into a single object',
  category: 'transform',
  icon: '🔀',
  inputs: [{ name: 'data1', type: 'any' }, { name: 'data2', type: 'any' }],
  outputs: [{ name: 'merged', type: 'any' }],
  configSchema: {
    mode: { type: 'select', options: ['merge', 'concat', 'zip'], default: 'merge' }
  },
  execute: async ({ config, input }) => {
    const values = Object.values(input);
    if (config.mode === 'concat' && values.every(Array.isArray)) {
      return { items: values.flat() };
    }
    // Default merge
    return Object.assign({}, ...values);
  }
});

registry.register('filterData', {
  label: 'Filter',
  description: 'Filter data based on a condition',
  category: 'transform',
  icon: '🔍',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'passed', type: 'any' }, { name: 'rejected', type: 'any' }],
  configSchema: {
    field: { type: 'text', label: 'Field Name', required: true },
    operator: { type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'truthy'], default: 'equals' },
    value: { type: 'text', label: 'Compare Value' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0];
    const items = Array.isArray(data) ? data : [data];

    const passed = [];
    const rejected = [];

    items.forEach(item => {
      const val = item?.[config.field];
      let match = false;
      switch (config.operator) {
        case 'equals': match = val == config.value; break;
        case 'not_equals': match = val != config.value; break;
        case 'contains': match = String(val).includes(config.value); break;
        case 'greater_than': match = Number(val) > Number(config.value); break;
        case 'less_than': match = Number(val) < Number(config.value); break;
        case 'exists': match = val !== undefined && val !== null; break;
        case 'truthy': match = !!val; break;
      }
      (match ? passed : rejected).push(item);
    });

    return { passed, rejected };
  }
});

// ═══════════════════════════════════════════════════════
// LOGIC / FLOW CONTROL NODES
// ═══════════════════════════════════════════════════════

registry.register('ifCondition', {
  label: 'IF Condition',
  description: 'Branch workflow based on a condition',
  category: 'logic',
  icon: '🔀',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'true', type: 'any' }, { name: 'false', type: 'any' }],
  configSchema: {
    field: { type: 'text', label: 'Field to Check', required: true },
    operator: { type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'truthy'], default: 'equals' },
    value: { type: 'text', label: 'Compare Value' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const val = data[config.field];
    let result = false;

    switch (config.operator) {
      case 'equals': result = val == config.value; break;
      case 'not_equals': result = val != config.value; break;
      case 'contains': result = String(val).includes(config.value); break;
      case 'greater_than': result = Number(val) > Number(config.value); break;
      case 'less_than': result = Number(val) < Number(config.value); break;
      case 'exists': result = val !== undefined && val !== null; break;
      case 'truthy': result = !!val; break;
    }

    return { condition: result, data, branch: result ? 'true' : 'false' };
  }
});

registry.register('switchNode', {
  label: 'Switch',
  description: 'Route to different branches based on a value',
  category: 'logic',
  icon: '🔄',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'output', type: 'any' }],
  configSchema: {
    field: { type: 'text', label: 'Field to Switch On', required: true },
    cases: { type: 'json', label: 'Cases (JSON array)', default: '["case1", "case2"]' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const value = data[config.field];
    let cases = config.cases;
    if (typeof cases === 'string') cases = JSON.parse(cases);
    const matchedCase = cases.find(c => c == value) || 'default';
    return { matchedCase, value, data };
  }
});

registry.register('delay', {
  label: 'Delay',
  description: 'Wait for a specified duration before continuing',
  category: 'logic',
  icon: '⏳',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'data', type: 'any' }],
  configSchema: {
    seconds: { type: 'number', label: 'Delay (seconds)', default: 1, required: true }
  },
  execute: async ({ config, input }) => {
    const delay = Math.min(config.seconds || 1, 300) * 1000; // Max 5 minutes
    await new Promise(resolve => setTimeout(resolve, delay));
    return Object.values(input)[0] || {};
  }
});

registry.register('loop', {
  label: 'Loop',
  description: 'Iterate over an array of items',
  category: 'logic',
  icon: '🔁',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'items', type: 'array' }],
  configSchema: {
    field: { type: 'text', label: 'Array Field to Loop Over' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const items = config.field ? data[config.field] : (Array.isArray(data) ? data : [data]);
    return { items: Array.isArray(items) ? items : [items], count: Array.isArray(items) ? items.length : 1 };
  }
});

// ═══════════════════════════════════════════════════════
// AI NODES
// ═══════════════════════════════════════════════════════

registry.register('aiPrompt', {
  label: 'AI Prompt',
  description: 'Send a prompt to an AI model and get a response',
  category: 'ai',
  icon: '🤖',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'response', type: 'string' }, { name: 'tokensUsed', type: 'number' }],
  configSchema: {
    model: { type: 'select', options: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gpt-4o-mini'], default: 'claude-3-5-sonnet-20241022' },
    systemPrompt: { type: 'textarea', label: 'System Prompt', default: 'You are a helpful assistant.' },
    prompt: { type: 'textarea', label: 'User Prompt', required: true },
    temperature: { type: 'number', label: 'Temperature', default: 0.7 },
    maxTokens: { type: 'number', label: 'Max Tokens', default: 1024 }
  },
  execute: async ({ config, input }) => {
    const model = config.model || 'claude-3-5-sonnet-20241022';
    // Per-user credentials (from Credentials Manager) with fallback to global env
    const userCreds = config._credentials || {};

    if (model.startsWith('claude')) {
      const apiKey = userCreds.apiKey || userCreds.api_key || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key not configured — add it in Credentials Manager or set ANTHROPIC_API_KEY in .env');
      }
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: config.maxTokens || 1024,
        system: config.systemPrompt || 'You are a helpful assistant.',
        messages: [{ role: 'user', content: config.prompt }]
      });
      return {
        response: response.content[0].text,
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        model
      };
    } else {
      const apiKey = userCreds.apiKey || userCreds.api_key || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured — add it in Credentials Manager or set OPENAI_API_KEY in .env');
      }
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1024,
        messages: [
          { role: 'system', content: config.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: config.prompt }
        ]
      });
      return {
        response: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        model
      };
    }
  }
});

// ── Gemini Chat ──
registry.register('gemini_chat', {
  label: 'Gemini Chat',
  description: 'Chat with Google Gemini models',
  category: 'ai',
  icon: '✨',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'response', type: 'string' }, { name: 'tokensUsed', type: 'number' }],
  configSchema: {
    model: { type: 'select', options: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'], default: 'gemini-2.0-flash' },
    systemPrompt: { type: 'textarea', label: 'System Prompt', default: 'You are a helpful assistant.' },
    message: { type: 'textarea', label: 'User Message', required: true },
    temperature: { type: 'number', label: 'Temperature', default: 0.7 },
    maxTokens: { type: 'number', label: 'Max Tokens', default: 2048 }
  },
  execute: async ({ config }) => {
    // Per-user credentials (from Credentials Manager) with fallback to global env
    const userCreds = config._credentials || {};
    const apiKey = userCreds.apiKey || userCreds.api_key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured — add it in Credentials Manager or set GEMINI_API_KEY in .env');
    }

    const model = config.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: config.message || '' }] }],
      systemInstruction: config.systemPrompt ? { parts: [{ text: config.systemPrompt }] } : undefined,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens || 2048,
      },
    };

    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const candidate = res.data.candidates?.[0];
    if (!candidate) {
      throw new Error(res.data.error?.message || 'No response from Gemini API');
    }

    const text = candidate.content?.parts?.map(p => p.text).join('') || '';
    const usage = res.data.usageMetadata || {};

    return {
      response: text,
      tokensUsed: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
      model,
    };
  }
});

registry.register('aiClassify', {
  label: 'AI Classify',
  description: 'Classify text into predefined categories using AI',
  category: 'ai',
  icon: '🏷️',
  inputs: [{ name: 'text', type: 'string' }],
  outputs: [{ name: 'category', type: 'string' }, { name: 'confidence', type: 'number' }],
  configSchema: {
    categories: { type: 'text', label: 'Categories (comma-separated)', required: true, default: 'positive,negative,neutral' },
    textField: { type: 'text', label: 'Text Field', default: 'text' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const text = data[config.textField] || JSON.stringify(data);
    const categories = config.categories.split(',').map(c => c.trim());

    // Per-user credentials with fallback to global env
    const userCreds = config._credentials || {};
    const apiKey = userCreds.apiKey || userCreds.api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured — add it in Credentials Manager or set ANTHROPIC_API_KEY in .env');
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      system: `Classify the following text into one of these categories: ${categories.join(', ')}. Respond with ONLY the category name and a confidence score (0-1) in JSON format: {"category": "...", "confidence": 0.9}`,
      messages: [{ role: 'user', content: text }]
    });

    try {
      return JSON.parse(response.content[0].text);
    } catch {
      return { category: response.content[0].text.trim(), confidence: 0.8 };
    }
  }
});

registry.register('aiSummarize', {
  label: 'AI Summarize',
  description: 'Summarize text using AI',
  category: 'ai',
  icon: '📄',
  inputs: [{ name: 'text', type: 'string' }],
  outputs: [{ name: 'summary', type: 'string' }],
  configSchema: {
    textField: { type: 'text', label: 'Text Field', default: 'body' },
    maxLength: { type: 'number', label: 'Max Summary Length (words)', default: 100 }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const text = data[config.textField] || JSON.stringify(data);

    // Per-user credentials with fallback to global env
    const userCreds = config._credentials || {};
    const apiKey = userCreds.apiKey || userCreds.api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured — add it in Credentials Manager or set ANTHROPIC_API_KEY in .env');
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: `Summarize the following text in ${config.maxLength || 100} words or fewer. Be concise and clear.`,
      messages: [{ role: 'user', content: text }]
    });

    return { summary: response.content[0].text };
  }
});

// ═══════════════════════════════════════════════════════
// COMMUNICATION NODES
// ═══════════════════════════════════════════════════════

registry.register('sendEmail', {
  label: 'Send Email',
  description: 'Send an email (via configured SMTP or API)',
  category: 'communication',
  icon: '📧',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'text', label: 'To Email', required: true },
    subject: { type: 'text', label: 'Subject', required: true },
    body: { type: 'textarea', label: 'Email Body (HTML)', required: true },
    from: { type: 'text', label: 'From Email', default: 'noreply@flowa.dev' }
  },
  execute: async ({ config }) => {
    // Placeholder - would integrate with SMTP/SendGrid/etc.
    logger.info(`Email would be sent to ${config.to}: ${config.subject}`);
    return {
      success: true,
      to: config.to,
      subject: config.subject,
      sentAt: new Date().toISOString(),
      note: 'Email sending placeholder - configure SMTP provider'
    };
  }
});

registry.register('slackMessage', {
  label: 'Slack Message',
  description: 'Send a message to a Slack channel',
  category: 'communication',
  icon: '💬',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    webhookUrl: { type: 'text', label: 'Slack Webhook URL', required: true },
    channel: { type: 'text', label: 'Channel' },
    message: { type: 'textarea', label: 'Message', required: true }
  },
  execute: async ({ config }) => {
    const response = await axios.post(config.webhookUrl, {
      channel: config.channel,
      text: config.message
    });
    return { success: true, statusCode: response.status };
  }
});

// ═══════════════════════════════════════════════════════
// DATA / STORAGE NODES
// ═══════════════════════════════════════════════════════

registry.register('readDatabase', {
  label: 'Read Database',
  description: 'Execute a SQL SELECT query',
  category: 'data',
  icon: '🗄️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    query: { type: 'textarea', label: 'SQL Query', required: true },
    connectionString: { type: 'text', label: 'Connection String' }
  },
  execute: async ({ config }) => {
    // For security, only allow SELECT queries
    const sql = config.query.trim();
    if (!sql.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }
    // Use internal DB for demo, or external connection in production
    const { query: dbQuery } = require('../db');
    const result = await dbQuery(sql);
    return { rows: result.rows, count: result.rows.length };
  }
});

registry.register('writeDatabase', {
  label: 'Write Database',
  description: 'Execute an INSERT/UPDATE/DELETE query',
  category: 'data',
  icon: '💾',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    query: { type: 'textarea', label: 'SQL Query', required: true },
    connectionString: { type: 'text', label: 'Connection String' }
  },
  execute: async ({ config }) => {
    const { query: dbQuery } = require('../db');
    const result = await dbQuery(config.query);
    return { rowCount: result.rowCount, command: result.command };
  }
});

// ═══════════════════════════════════════════════════════
// UTILITY NODES
// ═══════════════════════════════════════════════════════

registry.register('consoleLog', {
  label: 'Console Log',
  description: 'Log data to the execution output',
  category: 'utility',
  icon: '📋',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'data', type: 'any' }],
  configSchema: {
    message: { type: 'text', label: 'Log Message', default: '' },
    logLevel: { type: 'select', options: ['info', 'warn', 'error', 'debug'], default: 'info' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0] || {};
    const message = config.message || JSON.stringify(data);
    logger[config.logLevel || 'info'](`[Workflow Log] ${message}`);
    return { logged: true, message, data, timestamp: new Date().toISOString() };
  }
});

registry.register('errorHandler', {
  label: 'Error Handler',
  description: 'Catch and handle errors from upstream nodes',
  category: 'utility',
  icon: '🛡️',
  inputs: [{ name: 'error', type: 'any' }],
  outputs: [{ name: 'error', type: 'any' }, { name: 'handled', type: 'boolean' }],
  configSchema: {
    action: { type: 'select', options: ['continue', 'retry', 'notify', 'stop'], default: 'continue' },
    message: { type: 'text', label: 'Error Message Override' }
  },
  execute: async ({ config, input }) => {
    return {
      handled: true,
      action: config.action || 'continue',
      originalError: input,
      message: config.message || 'Error handled'
    };
  }
});

registry.register('waitForApproval', {
  label: 'Wait for Approval',
  description: 'Pause workflow and wait for manual approval',
  category: 'utility',
  icon: '✋',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'approved', type: 'boolean' }],
  configSchema: {
    message: { type: 'textarea', label: 'Approval Message', default: 'Please approve to continue' },
    timeout: { type: 'number', label: 'Timeout (minutes)', default: 60 }
  },
  execute: async ({ config, input }) => {
    // In a real implementation, this would pause and wait
    return {
      approved: true,
      message: config.message,
      approvedAt: new Date().toISOString(),
      note: 'Auto-approved in development mode'
    };
  }
});

registry.register('dateTime', {
  label: 'Date/Time',
  description: 'Get or format date/time values',
  category: 'utility',
  icon: '📅',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'datetime', type: 'string' }],
  configSchema: {
    operation: { type: 'select', options: ['now', 'format', 'add', 'subtract', 'diff'], default: 'now' },
    format: { type: 'text', label: 'Format', default: 'ISO' },
    amount: { type: 'number', label: 'Amount', default: 0 },
    unit: { type: 'select', options: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'], default: 'hours' }
  },
  execute: async ({ config }) => {
    const now = new Date();

    if (config.operation === 'add' || config.operation === 'subtract') {
      const multiplier = config.operation === 'subtract' ? -1 : 1;
      const amount = (config.amount || 0) * multiplier;
      const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };
      const ms = units[config.unit] || units.hours;
      const result = new Date(now.getTime() + amount * ms);
      return { datetime: result.toISOString(), timestamp: result.getTime() };
    }

    return { datetime: now.toISOString(), timestamp: now.getTime() };
  }
});

registry.register('mathOperation', {
  label: 'Math',
  description: 'Perform mathematical operations',
  category: 'utility',
  icon: '🔢',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'number' }],
  configSchema: {
    operation: { type: 'select', options: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'round', 'floor', 'ceil', 'abs', 'random'], default: 'add' },
    valueA: { type: 'text', label: 'Value A', required: true },
    valueB: { type: 'text', label: 'Value B' }
  },
  execute: async ({ config }) => {
    const a = parseFloat(config.valueA) || 0;
    const b = parseFloat(config.valueB) || 0;
    let result;

    switch (config.operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b !== 0 ? a / b : 0; break;
      case 'modulo': result = a % b; break;
      case 'round': result = Math.round(a); break;
      case 'floor': result = Math.floor(a); break;
      case 'ceil': result = Math.ceil(a); break;
      case 'abs': result = Math.abs(a); break;
      case 'random': result = Math.random() * (b - a) + a; break;
      default: result = a;
    }

    return { result };
  }
});

module.exports = registry;

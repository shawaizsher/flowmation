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
    // SSRF protection — block requests to internal/private IP ranges and metadata endpoints
    const { URL: URLP } = require('url');
    const dns = require('dns').promises;
    try {
      const parsed = new URLP(config.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Protocol "${parsed.protocol}" is not allowed`);
      }
      const host = parsed.hostname;
      const blockedPatterns = [
        /^localhost$/i, /^127\./, /^0\.0\.0\.0$/, /^::1$/,
        /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
        /^169\.254\./, /^fc00:/i, /^fe80:/i,
        /metadata\.google\.internal/i, /metadata\.azure\.com/i,
      ];
      if (blockedPatterns.some(p => p.test(host))) {
        throw new Error('Requests to internal or private IP ranges are not allowed');
      }
      // Also resolve DNS and check the resolved IP
      try {
        const addresses = await dns.lookup(host, { all: true });
        for (const { address } of addresses) {
          if (blockedPatterns.some(p => p.test(address))) {
            throw new Error('Requests to internal or private IP ranges are not allowed');
          }
        }
      } catch (dnsErr) {
        if (dnsErr.message.includes('not allowed')) throw dnsErr;
        // DNS lookup failed — let axios handle the error naturally
      }
    } catch (err) {
      if (err.message.includes('not allowed') || err.message.includes('Protocol')) throw err;
      throw new Error(`Invalid URL: ${err.message}`);
    }

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

    // SSL verification — only allow disabling in non-production environments
    if (!config.verifySSL && process.env.NODE_ENV !== 'production') {
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
    const vm = require('vm');
    const sandbox = Object.freeze({ input: JSON.parse(JSON.stringify(input || {})) });
    const ctx = vm.createContext(sandbox);
    const wrapped = `(function(input) { ${config.code || 'return input;'} })(input)`;
    const result = vm.runInContext(wrapped, ctx, { timeout: 5000, displayErrors: true });
    return result;
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
    const vm = require('vm');
    const data = JSON.parse(JSON.stringify(Object.values(input || {})[0] || input || {}));
    const sandbox = Object.freeze({ data });
    const ctx = vm.createContext(sandbox);
    const wrapped = `(function(data) { ${config.code || 'return data;'} })(data)`;
    const result = vm.runInContext(wrapped, ctx, { timeout: 5000, displayErrors: true });
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
      // Run Python with restricted flags: no user site packages, isolated mode
      const output = execFileSync('python', ['-I', '-B', tmpFile, inputJson], {
        timeout: 10000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          // Minimal safe environment — no PATH tricks, no proxy vars
          PATH: '/usr/bin:/bin',
          PYTHONDONTWRITEBYTECODE: '1',
          PYTHONIOENCODING: 'utf-8',
        }
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
      validateStatus: () => true,
    });

    if (res.status === 429) {
      throw new Error('Gemini API rate limit exceeded — wait a moment and try again, or upgrade your Google AI quota at aistudio.google.com');
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Gemini API key is invalid or lacks permissions — check your key at aistudio.google.com');
    }

    if (res.status !== 200) {
      throw new Error(res.data?.error?.message || `Gemini API error (HTTP ${res.status})`);
    }

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
    const userCreds = config._credentials || {};
    const webhookUrl = config.webhookUrl || userCreds.webhook_url || userCreds.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured - add it in Credentials Manager or set it on the node.');
    }

    const response = await axios.post(webhookUrl, {
      channel: config.channel,
      text: config.message
    });
    return { success: true, statusCode: response.status };
  }
});

function parseJsonConfig(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getFirstInputPayload(input) {
  const first = Object.values(input || {})[0] || {};
  return first.body || first.data || first.result || first;
}

function getValueFromConfigOrPayload(config, payload, keys) {
  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== null && String(config[key]).trim() !== '') return config[key];
  }
  for (const key of keys) {
    if (payload?.[key] !== undefined && payload?.[key] !== null && String(payload[key]).trim() !== '') return payload[key];
  }
  return '';
}

function getHubSpotToken(config) {
  const userCreds = config._credentials || {};
  const token = userCreds.access_token || userCreds.accessToken || userCreds.token || config.access_token || config.accessToken || process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error('HubSpot access token not configured - add a HubSpot credential in Credentials Manager or set HUBSPOT_ACCESS_TOKEN in .env');
  }
  return token;
}

async function hubspotRequest(config, axiosConfig) {
  const token = getHubSpotToken(config);
  const response = await axios({
    baseURL: 'https://api.hubapi.com',
    timeout: 30000,
    validateStatus: () => true,
    ...axiosConfig,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(axiosConfig.headers || {})
    }
  });

  if (response.status < 200 || response.status >= 300) {
    const message = response.data?.message || response.data?.error || `HubSpot API returned ${response.status}`;
    throw new Error(`HubSpot request failed: ${message}`);
  }

  return response.data;
}

async function searchHubSpotContactByEmail(config, email, properties) {
  const data = await hubspotRequest(config, {
    method: 'POST',
    url: '/crm/v3/objects/contacts/search',
    data: {
      filterGroups: [{
        filters: [{ propertyName: 'email', operator: 'EQ', value: email }]
      }],
      properties,
      limit: 1
    }
  });
  return data.results?.[0] || null;
}

registry.register('hubspotContact', {
  label: 'HubSpot Contact',
  description: 'Create, update, upsert, or fetch a HubSpot CRM contact',
  category: 'crm',
  icon: 'hubspot',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'contact', type: 'object' }, { name: 'success', type: 'boolean' }],
  configSchema: {
    action: { type: 'select', label: 'Action', options: ['upsert', 'create', 'update', 'get'], default: 'upsert' },
    email: { type: 'text', label: 'Email' },
    firstName: { type: 'text', label: 'First Name' },
    lastName: { type: 'text', label: 'Last Name' },
    contactId: { type: 'text', label: 'Contact ID' },
    properties: { type: 'json', label: 'Extra Properties', default: '{}' },
    returnProperties: { type: 'text', label: 'Return Properties', default: 'email,firstname,lastname,phone,company,website,lifecyclestage' }
  },
  execute: async ({ config, input }) => {
    const payload = getFirstInputPayload(input);
    const action = config.action || 'upsert';
    const returnProperties = String(config.returnProperties || 'email,firstname,lastname,phone,company,website,lifecyclestage')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const email = getValueFromConfigOrPayload(config, payload, ['email']);
    const firstName = getValueFromConfigOrPayload(config, payload, ['firstName', 'firstname', 'first_name']);
    const lastName = getValueFromConfigOrPayload(config, payload, ['lastName', 'lastname', 'last_name']);
    const contactId = getValueFromConfigOrPayload(config, payload, ['contactId', 'id', 'hs_object_id']);
    const extraProperties = parseJsonConfig(config.properties, {});
    const properties = {
      ...extraProperties,
      ...(email ? { email } : {}),
      ...(firstName ? { firstname: firstName } : {}),
      ...(lastName ? { lastname: lastName } : {})
    };

    if (action === 'get') {
      if (!email && !contactId) throw new Error('HubSpot contact get requires either email or contactId.');
      const identifier = email || contactId;
      const data = await hubspotRequest(config, {
        method: 'GET',
        url: `/crm/v3/objects/contacts/${encodeURIComponent(identifier)}`,
        params: {
          properties: returnProperties.join(','),
          ...(email ? { idProperty: 'email' } : {})
        }
      });
      return { success: true, action, contact: data, properties: data.properties };
    }

    if (!email && !contactId) {
      throw new Error('HubSpot contact create/update requires an email from node config or incoming data.');
    }

    if (action === 'create') {
      const data = await hubspotRequest(config, {
        method: 'POST',
        url: '/crm/v3/objects/contacts',
        data: { properties }
      });
      return { success: true, action, contact: data, properties: data.properties };
    }

    if (action === 'update') {
      const identifier = contactId || email;
      const data = await hubspotRequest(config, {
        method: 'PATCH',
        url: `/crm/v3/objects/contacts/${encodeURIComponent(identifier)}`,
        params: email && !contactId ? { idProperty: 'email' } : undefined,
        data: { properties }
      });
      return { success: true, action, contact: data, properties: data.properties };
    }

    const existing = email ? await searchHubSpotContactByEmail(config, email, returnProperties) : null;
    if (existing) {
      const data = await hubspotRequest(config, {
        method: 'PATCH',
        url: `/crm/v3/objects/contacts/${existing.id}`,
        data: { properties }
      });
      return { success: true, action: 'updated', contact: data, properties: data.properties };
    }

    const data = await hubspotRequest(config, {
      method: 'POST',
      url: '/crm/v3/objects/contacts',
      data: { properties }
    });
    return { success: true, action: 'created', contact: data, properties: data.properties };
  }
});

registry.register('hubspotGetContacts', {
  label: 'HubSpot Get Contacts',
  description: 'List HubSpot CRM contacts',
  category: 'crm',
  icon: 'hubspot',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'contacts', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    limit: { type: 'number', label: 'Limit', default: 100 },
    properties: { type: 'text', label: 'Properties', default: 'email,firstname,lastname' }
  },
  execute: async ({ config }) => {
    const properties = String(config.properties || 'email,firstname,lastname');
    const data = await hubspotRequest(config, {
      method: 'GET',
      url: '/crm/v3/objects/contacts',
      params: { limit: Math.min(Number(config.limit) || 100, 100), properties }
    });
    return { success: true, contacts: data.results || [], count: data.results?.length || 0, paging: data.paging };
  }
});

registry.register('hubspotCreateDeal', {
  label: 'HubSpot Create Deal',
  description: 'Create a HubSpot CRM deal',
  category: 'crm',
  icon: 'hubspot',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'deal', type: 'object' }, { name: 'success', type: 'boolean' }],
  configSchema: {
    dealName: { type: 'text', label: 'Deal Name', required: true },
    amount: { type: 'number', label: 'Amount', default: 0 },
    pipeline: { type: 'text', label: 'Pipeline ID' },
    stage: { type: 'text', label: 'Stage ID' },
    properties: { type: 'json', label: 'Extra Properties', default: '{}' }
  },
  execute: async ({ config }) => {
    const extraProperties = parseJsonConfig(config.properties, {});
    const properties = {
      ...extraProperties,
      dealname: config.dealName,
      ...(config.amount ? { amount: String(config.amount) } : {}),
      ...(config.pipeline ? { pipeline: config.pipeline } : {}),
      ...(config.stage ? { dealstage: config.stage } : {})
    };
    const data = await hubspotRequest(config, {
      method: 'POST',
      url: '/crm/v3/objects/deals',
      data: { properties }
    });
    return { success: true, deal: data, properties: data.properties };
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
    const sql = (config.query || '').trim();
    // Strict allowlist: only simple SELECT, no stacked queries or DDL
    if (!/^SELECT\s/i.test(sql)) {
      throw new Error('Only SELECT queries are allowed');
    }
    if (/;\s*\S/i.test(sql)) {
      throw new Error('Stacked queries are not allowed');
    }
    const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE|GRANT|REVOKE)\b/i;
    if (forbidden.test(sql)) {
      throw new Error('Query contains forbidden SQL keywords');
    }
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
  execute: async () => {
    // Direct SQL write execution is disabled for security.
    // Use parameterized queries via the HTTP Request node to a dedicated API endpoint instead.
    throw new Error('The Write Database node is disabled. Use the HTTP Request node to call a dedicated API endpoint instead.');
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

// Frontend and AI-generated workflows use snake_case node ids, while the
// original runtime used camelCase ids. Register aliases so canvas/catalog nodes
// execute instead of failing with "Unknown node type".
function registerAlias(alias, target, options = {}) {
  const targetDefinition = registry.get(target);
  if (!targetDefinition) return;

  registry.register(alias, {
    ...targetDefinition,
    ...options,
    execute: options.execute || targetDefinition.execute
  });
}

function withConfig(target, normalizeConfig) {
  const targetDefinition = registry.get(target);
  return async ({ config, input, context }) => targetDefinition.execute({
    config: normalizeConfig(config || {}),
    input,
    context
  });
}

registerAlias('trigger_manual', 'manualTrigger');
registerAlias('trigger_webhook', 'webhookTrigger');
registerAlias('trigger_cron', 'scheduleTrigger');
registerAlias('trigger_schedule', 'scheduleTrigger');
registerAlias('schedule', 'scheduleTrigger');

registerAlias('http_request', 'httpRequest');
registerAlias('rest_get', 'httpRequest', {
  execute: withConfig('httpRequest', (config) => ({ ...config, method: 'GET' }))
});
registerAlias('rest_post', 'httpRequest', {
  execute: withConfig('httpRequest', (config) => ({ ...config, method: 'POST' }))
});
registerAlias('respond_webhook', 'respondWebhook');

registerAlias('code_execute', 'codeBlock');
registerAlias('transform_set', 'setVariable');
registerAlias('json_parse', 'jsonParse');
registerAlias('csv_parse', 'jsonParse');
registerAlias('transform_split', 'splitArray');
registerAlias('transform_merge', 'mergeData');
registerAlias('transform_filter', 'filterData');
registerAlias('logic_if', 'ifCondition');
registerAlias('logic_switch', 'switchNode');
registerAlias('loop_for_each', 'loop');

registerAlias('openai_chat', 'aiPrompt', {
  execute: withConfig('aiPrompt', (config) => ({
    ...config,
    model: config.model || 'gpt-4o-mini',
    systemPrompt: config.systemPrompt || config.prompt || 'You are a helpful assistant.',
    prompt: config.userMessage || config.message || config.input || config.prompt || ''
  }))
});
registerAlias('anthropic_chat', 'aiPrompt', {
  execute: withConfig('aiPrompt', (config) => ({
    ...config,
    model: config.model || 'claude-3-5-sonnet-20241022',
    systemPrompt: config.systemPrompt || 'You are a helpful assistant.',
    prompt: config.message || config.userMessage || config.prompt || ''
  }))
});
registerAlias('ai_classify', 'aiClassify');
registerAlias('ai_text_classifier', 'aiClassify');
registerAlias('ai_summarize', 'aiSummarize');
registerAlias('ai_summarizer', 'aiSummarize');

registerAlias('email_send', 'sendEmail');
registerAlias('slack_send', 'slackMessage', {
  configSchema: {
    webhookUrl: { type: 'text', label: 'Slack Webhook URL' },
    channel: { type: 'text', label: 'Channel' },
    text: { type: 'textarea', label: 'Message', required: true }
  },
  execute: withConfig('slackMessage', (config) => ({
    ...config,
    message: config.message || config.text || config.content || ''
  }))
});
registerAlias('slack_message', 'slackMessage', {
  configSchema: {
    webhookUrl: { type: 'text', label: 'Slack Webhook URL' },
    channel: { type: 'text', label: 'Channel' },
    text: { type: 'textarea', label: 'Message', required: true }
  },
  execute: withConfig('slackMessage', (config) => ({
    ...config,
    message: config.message || config.text || config.content || ''
  }))
});

registerAlias('hubspot_contact', 'hubspotContact');
registerAlias('hubspot_get_contacts', 'hubspotGetContacts');
registerAlias('hubspot_create_deal', 'hubspotCreateDeal');

registerAlias('postgres_query', 'readDatabase');
registerAlias('mysql_query', 'readDatabase');
registerAlias('database_query', 'readDatabase');
registerAlias('postgres_insert', 'writeDatabase');
registerAlias('database_insert', 'writeDatabase');

registerAlias('console_log', 'consoleLog');
registerAlias('error_handler', 'errorHandler');
registerAlias('wait_approval', 'waitForApproval');
registerAlias('date_time', 'dateTime');
registerAlias('math_operation', 'mathOperation');

module.exports = registry;

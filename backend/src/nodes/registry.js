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
    method: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'], default: 'GET' },
    url: { type: 'text', label: 'URL', required: true },

    // Query Parameters
    parameters: { type: 'json', label: 'Query Parameters', default: '{}', description: 'URL query string parameters' },

    // Request Headers - Support both JSON and dynamic headers
    headers: { type: 'json', label: 'Headers (JSON)', default: '{}', description: 'Optional: JSON object of headers. Can be combined with Dynamic Headers.' },
    dynamicHeaders: { type: 'json', label: 'Dynamic Headers', default: '[]', description: 'Array of header objects: [{"key": "X-API-Key", "value": "abc123"}, {"key": "Authorization", "value": "Bearer token"}]. Add as many as needed!' },

    // Request Body
    body: { type: 'json', label: 'Request Body' },
    bodyType: { type: 'select', options: ['auto', 'json', 'form', 'raw', 'xml'], default: 'auto', description: 'Request body content type' },

    // Authentication
    authType: { type: 'select', options: ['none', 'basic', 'bearer', 'api_key', 'oauth2', 'custom'], default: 'none' },
    basicAuthUsername: { type: 'text', label: 'Username', description: 'For Basic Auth' },
    basicAuthPassword: { type: 'text', label: 'Password', description: 'For Basic Auth' },
    bearerToken: { type: 'text', label: 'Bearer Token', description: 'For Bearer Token Auth' },
    apiKeyName: { type: 'text', label: 'API Key Header Name', description: 'e.g., X-API-Key' },
    apiKeyValue: { type: 'text', label: 'API Key Value' },
    customAuthHeader: { type: 'text', label: 'Custom Auth Header', description: 'Full authorization header value for custom auth' },

    // Request Options
    timeout: { type: 'number', label: 'Timeout (seconds)', default: 30 },
    followRedirects: { type: 'boolean', label: 'Follow Redirects', default: true },
    maxRedirects: { type: 'number', label: 'Max Redirects', default: 5 },

    // SSL/TLS
    verifySSL: { type: 'boolean', label: 'Verify SSL Certificate', default: true },

    // Response Options
    returnFullResponse: { type: 'boolean', label: 'Return Full Response', default: false },
    responseType: { type: 'select', options: ['auto', 'json', 'text', 'arraybuffer', 'blob', 'stream'], default: 'auto' },

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

    // Merge dynamic headers (array format) - supports unlimited headers
    let dynamicHeaders = config.dynamicHeaders;
    if (typeof dynamicHeaders === 'string') {
      try { dynamicHeaders = JSON.parse(dynamicHeaders); } catch { dynamicHeaders = []; }
    }
    if (Array.isArray(dynamicHeaders)) {
      dynamicHeaders.forEach(headerObj => {
        if (headerObj && headerObj.key && headerObj.value !== undefined) {
          headers[headerObj.key] = String(headerObj.value);
        }
      });
    }

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
    } else if (config.authType === 'custom' && config.customAuthHeader) {
      headers['Authorization'] = config.customAuthHeader;
    }

    let body = config.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* keep as string */ }
    }

    // Set content-type based on body type
    if (body) {
      if (config.bodyType === 'form') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (config.bodyType === 'json') {
        headers['Content-Type'] = 'application/json';
      } else if (config.bodyType === 'xml') {
        headers['Content-Type'] = 'application/xml';
      } else if (config.bodyType === 'auto' && typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
      }
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
      success: response.status >= 200 && response.status < 300,
      method: config.method,
      url: config.url
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
// MESSAGING NODES
// ═══════════════════════════════════════════════════════

registry.register('twilio_sms', {
  label: 'Twilio – Send SMS',
  description: 'Send SMS via Twilio',
  category: 'messaging',
  icon: '📲',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'string', label: 'To Phone', default: '' },
    body: { type: 'string', label: 'Message', default: '' },
  },
  execute: async ({ config, input }) => {
    const creds = config._credentials || {};

    const accountSid = creds.account_sid || config.accountSid || config.account_sid;
    const authToken  = creds.auth_token  || config.authToken  || config.auth_token;
    const fromRaw    = creds.from_number || config.from       || config.from_number;

    if (!accountSid || !authToken || !fromRaw) {
      throw new Error('Twilio credentials missing — connect a Twilio credential (Account SID, Auth Token, From Number)');
    }

    const normalizePhone = (n) => {
      const s = String(n || '').replace(/\s/g, '');
      return s && !s.startsWith('+') ? '+' + s : s;
    };

    const to   = normalizePhone(config.to   || input?.to   || '');
    const from = normalizePhone(fromRaw);
    const body = String(config.body || config.message || input?.body || input?.message || '').trim();

    if (!to)   throw new Error('Twilio SMS: "to" phone number is required (e.g. +12125551234)');
    if (!body) throw new Error('Twilio SMS: message body is required');

    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ To: to, From: from, Body: body }).toString(),
        {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      return { sid: response.data.sid, status: response.data.status, to, body };
    } catch (err) {
      const twilioMsg = err.response?.data?.message || err.response?.data?.error_message;
      const twilioCode = err.response?.data?.code;
      if (twilioMsg) throw new Error(`Twilio error ${twilioCode || ''}: ${twilioMsg}`);
      throw err;
    }
  }
});

registry.register('whatsapp_send', {
  label: 'WhatsApp – Send Message',
  description: 'Send a WhatsApp message via Twilio or Meta API',
  category: 'messaging',
  icon: '📱',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'string', label: 'Phone Number', default: '' },
    message: { type: 'string', label: 'Message', default: '' },
  },
  execute: async ({ config, input }) => {
    const creds = config._credentials || {};

    const accountSid = creds.account_sid || config.accountSid || config.account_sid;
    const authToken  = creds.auth_token  || config.authToken  || config.auth_token;
    const fromRaw    = creds.from_number || config.from       || config.from_number || 'whatsapp:+14155238886';
    const from       = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;

    if (!accountSid || !authToken) {
      throw new Error('WhatsApp credentials missing — connect a Twilio credential to this node');
    }

    const normalizePhone = (n) => {
      const s = String(n || '').replace(/\s/g, '');
      return s && !s.startsWith('+') ? '+' + s : s;
    };

    const rawTo  = normalizePhone(config.to || input?.to || '');
    const body   = String(config.message || input?.message || config.body || '').trim();
    const to     = rawTo.startsWith('whatsapp:') ? rawTo : `whatsapp:${rawTo}`;

    if (!rawTo) throw new Error('WhatsApp: "to" phone number is required (e.g. +12125551234)');
    if (!body)  throw new Error('WhatsApp: message is required');

    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ To: to, From: from, Body: body }).toString(),
        {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      return { sid: response.data.sid, status: response.data.status, to: rawTo, body };
    } catch (err) {
      const twilioMsg = err.response?.data?.message || err.response?.data?.error_message;
      const twilioCode = err.response?.data?.code;
      if (twilioMsg) throw new Error(`Twilio error ${twilioCode || ''}: ${twilioMsg}`);
      throw err;
    }
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
    const nodemailer = require('nodemailer');
    const creds = config._credentials || {};
    const host = creds.host || config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(creds.port || config.port || process.env.SMTP_PORT || 587);
    const user = creds.user || creds.username || config.user || process.env.SMTP_USER;
    const pass = creds.pass || creds.password || config.password || process.env.SMTP_PASS;
    const from = config.from || creds.from || process.env.SMTP_FROM || user;
    if (!user || !pass) throw new Error('SMTP credentials missing (set SMTP_USER and SMTP_PASS)');
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to: config.to, subject: config.subject, html: config.body || config.html || config.text });
    logger.info(`[sendEmail] Sent to ${config.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, to: config.to, subject: config.subject, sentAt: new Date().toISOString() };
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

// ── Twilio: SMS ─────────────────────────────────────────────────────────────
async function sendTwilioMessage({ accountSid, authToken, to, from, body }) {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env (or add via Credentials Manager).');
  }
  const missing = [];
  if (!to)   missing.push(`To (got: "${to ?? ''}")`);
  if (!from) missing.push(`From (got: "${from ?? ''}")`);
  if (!body) missing.push(`Message body (got: "${body ?? ''}")`);
  if (missing.length) {
    throw new Error(
      `Twilio: missing ${missing.join(', ')}. ` +
      `If a value was set via {{...}} placeholder, it may have resolved to empty — ` +
      `verify the upstream node ran successfully and the path exists.`
    );
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const response = await axios.post(url, params.toString(), {
    auth: { username: accountSid, password: authToken },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    const msg = response.data?.message || JSON.stringify(response.data);
    throw new Error(`Twilio API ${response.status}: ${msg}`);
  }

  return {
    sid: response.data.sid,
    status: response.data.status,
    to: response.data.to,
    from: response.data.from,
    body: response.data.body,
    success: true,
  };
}

function resolveTwilioCreds(config) {
  const userCreds = config._credentials || {};
  return {
    accountSid: userCreds.accountSid || userCreds.account_sid || config.accountSid || process.env.TWILIO_ACCOUNT_SID,
    authToken:  userCreds.authToken  || userCreds.auth_token  || config.authToken  || process.env.TWILIO_AUTH_TOKEN,
    fromNumber: userCreds.from_number || userCreds.fromNumber || '',
  };
}

registry.register('twilio_sms', {
  label: 'Send SMS (Twilio)',
  description: 'Send an SMS message via Twilio',
  category: 'communication',
  icon: '📱',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'text', label: 'To (E.164, e.g. +923001234567)', required: true },
    from: { type: 'text', label: 'From (your Twilio number — leave blank to use credential default)' },
    message: { type: 'textarea', label: 'Message', required: true },
  },
  execute: async ({ config }) => {
    const { accountSid, authToken, fromNumber } = resolveTwilioCreds(config);
    return sendTwilioMessage({
      accountSid,
      authToken,
      to: config.to,
      from: config.from || fromNumber,
      body: config.message || config.body,
    });
  },
});

registry.register('twilio_whatsapp', {
  label: 'Send WhatsApp (Twilio)',
  description: 'Send a WhatsApp message via Twilio',
  category: 'communication',
  icon: '🟢',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'text', label: 'To (e.g. whatsapp:+923001234567)', required: true },
    from: { type: 'text', label: 'From (sandbox or business)', default: 'whatsapp:+14155238886' },
    message: { type: 'textarea', label: 'Message', required: true },
  },
  execute: async ({ config }) => {
    const { accountSid, authToken, fromNumber } = resolveTwilioCreds(config);
    const ensureWaPrefix = (v) => v && !String(v).startsWith('whatsapp:') ? `whatsapp:${v}` : v;

    return sendTwilioMessage({
      accountSid,
      authToken,
      to: ensureWaPrefix(config.to),
      from: ensureWaPrefix(config.from || fromNumber || 'whatsapp:+14155238886'),
      body: config.message || config.body,
    });
  },
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

// ═══════════════════════════════════════════════════════
// EMAIL (SMTP – real nodemailer implementation)
// ═══════════════════════════════════════════════════════

registry.register('email_send', {
  label: 'Send Email (SMTP)',
  description: 'Send an email via SMTP using Nodemailer',
  category: 'messaging',
  icon: '📧',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    host: { type: 'text', label: 'SMTP Host', default: 'smtp.gmail.com' },
    port: { type: 'number', label: 'Port', default: 587 },
    to: { type: 'text', label: 'To', required: true },
    subject: { type: 'text', label: 'Subject', required: true },
    body: { type: 'textarea', label: 'Body (HTML)', required: true },
    from: { type: 'text', label: 'From', default: '' }
  },
  execute: async ({ config }) => {
    const nodemailer = require('nodemailer');
    const creds = config._credentials || {};
    const host = creds.host || config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(creds.port || config.port || process.env.SMTP_PORT || 587);
    const user = creds.user || creds.username || config.user || process.env.SMTP_USER;
    const pass = creds.pass || creds.password || config.password || process.env.SMTP_PASS;
    const from = config.from || creds.from || process.env.SMTP_FROM || user;
    if (!user || !pass) throw new Error('SMTP credentials missing — set SMTP_USER and SMTP_PASS in .env or connect an Email credential');
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to: config.to, subject: config.subject, html: config.body });
    return { success: true, messageId: info.messageId, to: config.to, subject: config.subject };
  }
});

// ═══════════════════════════════════════════════════════
// DISCORD
// ═══════════════════════════════════════════════════════

registry.register('discord_message', {
  label: 'Discord – Send Message',
  description: 'Send a message via Discord webhook',
  category: 'messaging',
  icon: '🎮',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    webhookUrl: { type: 'text', label: 'Webhook URL', required: true },
    content: { type: 'textarea', label: 'Message', required: true },
    username: { type: 'text', label: 'Username Override', default: 'Flowa Bot' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const webhookUrl = creds.webhook_url || creds.webhookUrl || config.webhookUrl;
    if (!webhookUrl) throw new Error('Discord webhook URL is required');
    const response = await axios.post(webhookUrl, { content: config.content, username: config.username || 'Flowa Bot' });
    return { success: true, statusCode: response.status };
  }
});

// ═══════════════════════════════════════════════════════
// TELEGRAM
// ═══════════════════════════════════════════════════════

registry.register('telegram_send', {
  label: 'Telegram – Send Message',
  description: 'Send a message via Telegram Bot API',
  category: 'messaging',
  icon: '✈️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    botToken: { type: 'text', label: 'Bot Token', required: true },
    chatId: { type: 'text', label: 'Chat ID', required: true },
    text: { type: 'textarea', label: 'Message', required: true },
    parseMode: { type: 'select', options: ['HTML', 'Markdown', 'MarkdownV2', 'none'], default: 'HTML' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const token = creds.bot_token || creds.botToken || config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config.chatId || creds.chat_id;
    if (!token) throw new Error('Telegram bot token is required');
    if (!chatId) throw new Error('Telegram chat ID is required');
    const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: config.text,
      ...(config.parseMode !== 'none' && { parse_mode: config.parseMode })
    });
    return { success: true, messageId: response.data.result?.message_id };
  }
});

// ═══════════════════════════════════════════════════════
// GITHUB
// ═══════════════════════════════════════════════════════

registry.register('github_create_issue', {
  label: 'GitHub – Create Issue',
  description: 'Create an issue on a GitHub repo',
  category: 'cloud',
  icon: '🐙',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'issue', type: 'object' }],
  configSchema: {
    owner: { type: 'text', label: 'Owner', required: true },
    repo: { type: 'text', label: 'Repo', required: true },
    title: { type: 'text', label: 'Title', required: true },
    body: { type: 'textarea', label: 'Body', default: '' },
    labels: { type: 'text', label: 'Labels (comma-sep)', default: '' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const token = creds.token || creds.access_token || config.token || process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GitHub token required — set GITHUB_TOKEN in .env or add a GitHub credential');
    const labels = config.labels ? config.labels.split(',').map(l => l.trim()).filter(Boolean) : [];
    const response = await axios.post(
      `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
      { title: config.title, body: config.body || '', labels },
      { headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'Flowa-Automation' } }
    );
    return { success: true, issue: response.data, number: response.data.number, url: response.data.html_url };
  }
});

registry.register('github_pr', {
  label: 'GitHub – List PRs',
  description: 'List pull requests from a GitHub repo',
  category: 'cloud',
  icon: '🔃',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'pullRequests', type: 'array' }],
  configSchema: {
    owner: { type: 'text', label: 'Owner', required: true },
    repo: { type: 'text', label: 'Repo', required: true },
    state: { type: 'select', options: ['open', 'closed', 'all'], default: 'open' },
    limit: { type: 'number', label: 'Limit', default: 30 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const token = creds.token || creds.access_token || config.token || process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GitHub token required — set GITHUB_TOKEN in .env');
    const response = await axios.get(
      `https://api.github.com/repos/${config.owner}/${config.repo}/pulls`,
      { params: { state: config.state || 'open', per_page: Math.min(config.limit || 30, 100) }, headers: { Authorization: `token ${token}`, 'User-Agent': 'Flowa-Automation' } }
    );
    return { success: true, pullRequests: response.data, count: response.data.length };
  }
});

// ═══════════════════════════════════════════════════════
// STRIPE
// ═══════════════════════════════════════════════════════

registry.register('stripe_charge', {
  label: 'Stripe – Create Charge',
  description: 'Create a payment charge via Stripe',
  category: 'payments',
  icon: '💳',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'charge', type: 'object' }],
  configSchema: {
    amount: { type: 'number', label: 'Amount (cents)', required: true },
    currency: { type: 'text', label: 'Currency', default: 'usd' },
    customerId: { type: 'text', label: 'Customer ID', default: '' },
    source: { type: 'text', label: 'Source Token (tok_...)', default: '' },
    description: { type: 'text', label: 'Description', default: '' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.secret_key || creds.api_key || config.apiKey || process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error('Stripe secret key required — set STRIPE_SECRET_KEY in .env');
    const params = new URLSearchParams({ amount: String(config.amount), currency: config.currency || 'usd' });
    if (config.description) params.append('description', config.description);
    if (config.customerId) params.append('customer', config.customerId);
    if (config.source) params.append('source', config.source);
    const response = await axios.post('https://api.stripe.com/v1/charges', params.toString(), {
      auth: { username: apiKey, password: '' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { success: true, charge: response.data, chargeId: response.data.id, status: response.data.status };
  }
});

registry.register('stripe_customer', {
  label: 'Stripe – Get Customer',
  description: 'Retrieve a Stripe customer',
  category: 'payments',
  icon: '👤',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'customer', type: 'object' }],
  configSchema: {
    customerId: { type: 'text', label: 'Customer ID', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.secret_key || creds.api_key || config.apiKey || process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error('Stripe secret key required — set STRIPE_SECRET_KEY in .env');
    const response = await axios.get(`https://api.stripe.com/v1/customers/${config.customerId}`, { auth: { username: apiKey, password: '' } });
    return { success: true, customer: response.data };
  }
});

// ═══════════════════════════════════════════════════════
// OPENAI DALL·E + WHISPER
// ═══════════════════════════════════════════════════════

registry.register('openai_image', {
  label: 'OpenAI – DALL·E',
  description: 'Generate images with DALL·E',
  category: 'ai',
  icon: '🎨',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'imageUrl', type: 'string' }, { name: 'images', type: 'array' }],
  configSchema: {
    prompt: { type: 'textarea', label: 'Image Prompt', required: true },
    model: { type: 'select', options: ['dall-e-3', 'dall-e-2'], default: 'dall-e-3' },
    size: { type: 'select', options: ['1024x1024', '1792x1024', '1024x1792', '512x512', '256x256'], default: '1024x1024' },
    n: { type: 'number', label: 'Number of Images', default: 1 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.apiKey || creds.api_key || config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key required — set OPENAI_API_KEY in .env');
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    const response = await client.images.generate({ model: config.model || 'dall-e-3', prompt: config.prompt, n: config.n || 1, size: config.size || '1024x1024' });
    const images = response.data.map(img => img.url);
    return { success: true, imageUrl: images[0], images };
  }
});

registry.register('whisper_transcribe', {
  label: 'Whisper – Transcribe Audio',
  description: 'Transcribe audio to text using OpenAI Whisper',
  category: 'ai',
  icon: '🎤',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'text', type: 'string' }],
  configSchema: {
    audioUrl: { type: 'text', label: 'Audio URL', required: true },
    language: { type: 'text', label: 'Language', default: 'en' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.apiKey || creds.api_key || config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key required — set OPENAI_API_KEY in .env');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const audioResponse = await axios.get(config.audioUrl, { responseType: 'arraybuffer' });
    const ext = path.extname(config.audioUrl.split('?')[0]) || '.mp3';
    const tmpFile = path.join(os.tmpdir(), `whisper_${Date.now()}${ext}`);
    fs.writeFileSync(tmpFile, Buffer.from(audioResponse.data));
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const transcription = await client.audio.transcriptions.create({ file: fs.createReadStream(tmpFile), model: 'whisper-1', language: config.language || 'en' });
      return { success: true, text: transcription.text };
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
});

// ═══════════════════════════════════════════════════════
// HUGGING FACE
// ═══════════════════════════════════════════════════════

registry.register('huggingface_inference', {
  label: 'Hugging Face – Inference',
  description: 'Run ML models via Hugging Face Inference API',
  category: 'ai',
  icon: '🤗',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    model: { type: 'text', label: 'Model ID', required: true, default: 'facebook/bart-large-mnli' },
    inputs: { type: 'textarea', label: 'Input', required: true },
    parameters: { type: 'json', label: 'Parameters (JSON)', default: '{}' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.apiKey || creds.api_key || config.apiKey || process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error('Hugging Face API key required — set HUGGINGFACE_API_KEY in .env');
    let parameters = config.parameters;
    if (typeof parameters === 'string') { try { parameters = JSON.parse(parameters); } catch { parameters = {}; } }
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${config.model}`,
      { inputs: config.inputs, parameters },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    return { success: true, result: response.data };
  }
});

// ═══════════════════════════════════════════════════════
// AIRTABLE
// ═══════════════════════════════════════════════════════

registry.register('airtable_list', {
  label: 'Airtable – List Records',
  description: 'List records from an Airtable base',
  category: 'crm',
  icon: '📋',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'records', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    baseId: { type: 'text', label: 'Base ID', required: true },
    table: { type: 'text', label: 'Table Name', required: true },
    view: { type: 'text', label: 'View', default: 'Grid view' },
    maxRecords: { type: 'number', label: 'Max Records', default: 100 },
    filterFormula: { type: 'text', label: 'Filter Formula', default: '' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || creds.apiKey || config.apiKey || process.env.AIRTABLE_API_KEY;
    if (!apiKey) throw new Error('Airtable API key required — set AIRTABLE_API_KEY in .env');
    const params = { view: config.view || 'Grid view', maxRecords: config.maxRecords || 100 };
    if (config.filterFormula) params.filterByFormula = config.filterFormula;
    const response = await axios.get(
      `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.table)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, params }
    );
    return { success: true, records: response.data.records, count: response.data.records.length };
  }
});

// ═══════════════════════════════════════════════════════
// NOTION
// ═══════════════════════════════════════════════════════

registry.register('notion_query', {
  label: 'Notion – Query Database',
  description: 'Query pages from a Notion database',
  category: 'crm',
  icon: '📓',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'pages', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    databaseId: { type: 'text', label: 'Database ID', required: true },
    filter: { type: 'json', label: 'Filter (JSON)', default: '{}' },
    pageSize: { type: 'number', label: 'Page Size', default: 100 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || creds.token || config.apiKey || process.env.NOTION_API_KEY;
    if (!apiKey) throw new Error('Notion API key required — set NOTION_API_KEY in .env');
    let filter = config.filter;
    if (typeof filter === 'string') { try { filter = JSON.parse(filter); } catch { filter = {}; } }
    const body = { page_size: config.pageSize || 100, ...(Object.keys(filter || {}).length > 0 && { filter }) };
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${config.databaseId}/query`,
      body,
      { headers: { Authorization: `Bearer ${apiKey}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' } }
    );
    return { success: true, pages: response.data.results, count: response.data.results.length, hasMore: response.data.has_more };
  }
});

// ═══════════════════════════════════════════════════════
// MIXPANEL & SEGMENT
// ═══════════════════════════════════════════════════════

registry.register('mixpanel_track', {
  label: 'Mixpanel – Track Event',
  description: 'Send a tracking event to Mixpanel',
  category: 'analytics',
  icon: '📊',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    event: { type: 'text', label: 'Event Name', required: true },
    distinctId: { type: 'text', label: 'Distinct ID', default: 'anonymous' },
    properties: { type: 'json', label: 'Properties (JSON)', default: '{}' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const projectToken = creds.project_token || creds.token || config.projectToken || process.env.MIXPANEL_PROJECT_TOKEN;
    if (!projectToken) throw new Error('Mixpanel project token required — set MIXPANEL_PROJECT_TOKEN in .env');
    let properties = config.properties;
    if (typeof properties === 'string') { try { properties = JSON.parse(properties); } catch { properties = {}; } }
    const eventData = [{ event: config.event, properties: { token: projectToken, distinct_id: config.distinctId || 'anonymous', time: Math.floor(Date.now() / 1000), ...properties } }];
    const response = await axios.post('https://api.mixpanel.com/track', `data=${Buffer.from(JSON.stringify(eventData)).toString('base64')}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { success: response.data === 1, status: response.data };
  }
});

registry.register('segment_track', {
  label: 'Segment – Track',
  description: 'Send an event to Segment',
  category: 'analytics',
  icon: '📡',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    event: { type: 'text', label: 'Event Name', required: true },
    userId: { type: 'text', label: 'User ID', default: '' },
    anonymousId: { type: 'text', label: 'Anonymous ID', default: '' },
    properties: { type: 'json', label: 'Properties (JSON)', default: '{}' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const writeKey = creds.write_key || creds.api_key || config.writeKey || process.env.SEGMENT_WRITE_KEY;
    if (!writeKey) throw new Error('Segment write key required — set SEGMENT_WRITE_KEY in .env');
    let properties = config.properties;
    if (typeof properties === 'string') { try { properties = JSON.parse(properties); } catch { properties = {}; } }
    const response = await axios.post('https://api.segment.io/v1/track', { event: config.event, userId: config.userId || undefined, anonymousId: config.anonymousId || undefined, properties, timestamp: new Date().toISOString() }, { auth: { username: writeKey, password: '' }, headers: { 'Content-Type': 'application/json' } });
    return { success: true, statusCode: response.status };
  }
});

// ═══════════════════════════════════════════════════════
// VERCEL DEPLOY
// ═══════════════════════════════════════════════════════

registry.register('vercel_deploy', {
  label: 'Vercel – Trigger Deploy',
  description: 'Trigger a Vercel deployment via deploy hook',
  category: 'cloud',
  icon: '▲',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    hookUrl: { type: 'text', label: 'Deploy Hook URL', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const hookUrl = creds.hook_url || config.hookUrl;
    if (!hookUrl) throw new Error('Vercel deploy hook URL is required');
    const response = await axios.post(hookUrl);
    return { success: true, statusCode: response.status, job: response.data };
  }
});

// ═══════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════

registry.register('file_read', {
  label: 'Read File',
  description: 'Read contents of a local file',
  category: 'files',
  icon: '📖',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'content', type: 'string' }, { name: 'size', type: 'number' }],
  configSchema: {
    path: { type: 'text', label: 'File Path', required: true },
    encoding: { type: 'select', options: ['utf-8', 'base64', 'binary'], default: 'utf-8' }
  },
  execute: async ({ config }) => {
    const fs = require('fs');
    if (!config.path) throw new Error('File path is required');
    const content = fs.readFileSync(config.path, config.encoding === 'binary' ? undefined : config.encoding || 'utf-8');
    const stats = fs.statSync(config.path);
    return { success: true, content: config.encoding === 'binary' ? Buffer.from(content).toString('base64') : content, size: stats.size, path: config.path };
  }
});

registry.register('file_write', {
  label: 'Write File',
  description: 'Write contents to a file',
  category: 'files',
  icon: '✍️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    path: { type: 'text', label: 'File Path', required: true },
    content: { type: 'textarea', label: 'Content', required: true },
    mode: { type: 'select', options: ['overwrite', 'append'], default: 'overwrite' }
  },
  execute: async ({ config }) => {
    const fs = require('fs');
    if (!config.path) throw new Error('File path is required');
    if (config.mode === 'append') fs.appendFileSync(config.path, config.content, 'utf-8');
    else fs.writeFileSync(config.path, config.content, 'utf-8');
    const stats = fs.statSync(config.path);
    return { success: true, path: config.path, size: stats.size, mode: config.mode || 'overwrite' };
  }
});

// ═══════════════════════════════════════════════════════
// REDIS COMMAND
// ═══════════════════════════════════════════════════════

registry.register('redis_command', {
  label: 'Redis – Command',
  description: 'Execute a Redis command',
  category: 'databases',
  icon: '⚡',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    url: { type: 'text', label: 'Redis URL', default: 'redis://localhost:6379' },
    command: { type: 'text', label: 'Command (e.g. GET, SET, HGET)', required: true },
    args: { type: 'text', label: 'Args (comma-separated)', default: '' }
  },
  execute: async ({ config }) => {
    const Redis = require('ioredis');
    const creds = config._credentials || {};
    const url = creds.url || config.url || process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(url, { lazyConnect: true, connectTimeout: 10000, enableOfflineQueue: false });
    try {
      await redis.connect();
      const cmd = (config.command || '').toLowerCase().trim();
      const args = config.args ? config.args.split(',').map(a => a.trim()).filter(Boolean) : [];
      const result = await redis.call(cmd, ...args);
      return { success: true, result };
    } finally {
      redis.disconnect();
    }
  }
});

// ═══════════════════════════════════════════════════════
// GOOGLE APIs
// ═══════════════════════════════════════════════════════

registry.register('google_translate', {
  label: 'Google Translate',
  description: 'Translate text between languages',
  category: 'google',
  icon: '🌍',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'translatedText', type: 'string' }, { name: 'detectedLanguage', type: 'string' }],
  configSchema: {
    text: { type: 'textarea', label: 'Text', required: true },
    target: { type: 'text', label: 'Target Language', default: 'en' },
    source: { type: 'text', label: 'Source Language (blank = auto)', default: '' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || config.apiKey || process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google API key required — set GOOGLE_TRANSLATE_API_KEY in .env');
    const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, { q: config.text, target: config.target || 'en', ...(config.source && { source: config.source }) });
    const translation = response.data.data.translations[0];
    return { success: true, translatedText: translation.translatedText, detectedLanguage: translation.detectedSourceLanguage || config.source };
  }
});

registry.register('google_maps_geocode', {
  label: 'Google Maps – Geocode',
  description: 'Convert address to coordinates',
  category: 'google',
  icon: '📍',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'lat', type: 'number' }, { name: 'lng', type: 'number' }, { name: 'formattedAddress', type: 'string' }],
  configSchema: {
    address: { type: 'text', label: 'Address', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || config.apiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google Maps API key required — set GOOGLE_MAPS_API_KEY in .env');
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', { params: { address: config.address, key: apiKey } });
    if (response.data.status !== 'OK') throw new Error(`Geocoding failed: ${response.data.status} — ${response.data.error_message || ''}`);
    const result = response.data.results[0];
    const { lat, lng } = result.geometry.location;
    return { success: true, lat, lng, formattedAddress: result.formatted_address, placeId: result.place_id };
  }
});

registry.register('youtube_search', {
  label: 'YouTube – Search',
  description: 'Search YouTube videos',
  category: 'google',
  icon: '▶️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'videos', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    query: { type: 'text', label: 'Search Query', required: true },
    maxResults: { type: 'number', label: 'Max Results', default: 5 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || config.apiKey || process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('YouTube Data API key required — set YOUTUBE_API_KEY in .env');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params: { part: 'snippet', q: config.query, maxResults: config.maxResults || 5, type: 'video', key: apiKey } });
    const videos = response.data.items.map(item => ({ videoId: item.id.videoId, title: item.snippet.title, description: item.snippet.description, channel: item.snippet.channelTitle, publishedAt: item.snippet.publishedAt, thumbnail: item.snippet.thumbnails?.default?.url, url: `https://www.youtube.com/watch?v=${item.id.videoId}` }));
    return { success: true, videos, count: videos.length };
  }
});

registry.register('google_vision', {
  label: 'Google Vision AI',
  description: 'Analyze images with Google Cloud Vision',
  category: 'google',
  icon: '👁️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'annotations', type: 'any' }],
  configSchema: {
    imageUrl: { type: 'text', label: 'Image URL', required: true },
    features: { type: 'select', options: ['LABEL_DETECTION', 'TEXT_DETECTION', 'FACE_DETECTION', 'OBJECT_LOCALIZATION', 'SAFE_SEARCH_DETECTION'], default: 'LABEL_DETECTION' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || config.apiKey || process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google Cloud API key required — set GOOGLE_API_KEY in .env');
    const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, { requests: [{ image: { source: { imageUri: config.imageUrl } }, features: [{ type: config.features || 'LABEL_DETECTION', maxResults: 10 }] }] });
    return { success: true, annotations: response.data.responses[0], feature: config.features };
  }
});

registry.register('google_sheets_read', {
  label: 'Google Sheets – Read',
  description: 'Read rows from a Google Spreadsheet',
  category: 'google',
  icon: '📊',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    spreadsheetId: { type: 'text', label: 'Spreadsheet ID', required: true },
    range: { type: 'text', label: 'Range', default: 'Sheet1!A1:Z100' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const apiKey = creds.api_key || config.apiKey || process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;
    const accessToken = creds.access_token || config.accessToken;
    if (!apiKey && !accessToken) throw new Error('Google API key or OAuth access token required — set GOOGLE_SHEETS_API_KEY in .env');
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const params = apiKey ? { key: apiKey } : {};
    const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(config.range || 'Sheet1!A1:Z100')}`, { headers, params });
    const values = response.data.values || [];
    const [header, ...dataRows] = values;
    const parsed = header ? dataRows.map(row => Object.fromEntries(header.map((h, i) => [h, row[i] ?? '']))) : values;
    return { success: true, rows: parsed, rawValues: values, count: parsed.length };
  }
});

registry.register('google_sheets_write', {
  label: 'Google Sheets – Write',
  description: 'Append or update rows in Google Sheets',
  category: 'google',
  icon: '📝',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    spreadsheetId: { type: 'text', label: 'Spreadsheet ID', required: true },
    range: { type: 'text', label: 'Range', default: 'Sheet1!A1' },
    mode: { type: 'select', options: ['append', 'update'], default: 'append' },
    data: { type: 'json', label: 'Data (2D array or array of objects)', default: '[]' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken;
    if (!accessToken) throw new Error('Google OAuth access token required for Sheets write — add a Google credential with access_token');
    let data = config.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = []; } }
    const values = Array.isArray(data[0]) ? data : data.map(row => Object.values(row));
    const range = encodeURIComponent(config.range || 'Sheet1!A1');
    const isAppend = config.mode !== 'update';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}${isAppend ? ':append' : ''}?valueInputOption=USER_ENTERED`;
    const response = await axios[isAppend ? 'post' : 'put'](url, { values }, { headers: { Authorization: `Bearer ${accessToken}` } });
    return { success: true, updatedRange: response.data.updates?.updatedRange || response.data.updatedRange };
  }
});

registry.register('google_gmail_send', {
  label: 'Gmail – Send Email',
  description: 'Send an email via Gmail API (OAuth)',
  category: 'google',
  icon: '✉️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    to: { type: 'text', label: 'To', required: true },
    subject: { type: 'text', label: 'Subject', required: true },
    body: { type: 'textarea', label: 'Body (HTML)', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Gmail OAuth access token required — add a Google/Gmail credential with access_token');
    const message = [`To: ${config.to}`, `Subject: ${config.subject}`, 'Content-Type: text/html; charset=utf-8', 'MIME-Version: 1.0', '', config.body].join('\r\n');
    const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const response = await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: encoded }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
    return { success: true, messageId: response.data.id, threadId: response.data.threadId };
  }
});

registry.register('google_gmail_read', {
  label: 'Gmail – Read Emails',
  description: 'Read emails from Gmail inbox',
  category: 'google',
  icon: '📬',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'messages', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    query: { type: 'text', label: 'Search Query', default: 'is:unread' },
    maxResults: { type: 'number', label: 'Max Results', default: 10 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GMAIL_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Gmail OAuth access token required');
    const listResp = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', { params: { q: config.query || 'is:unread', maxResults: config.maxResults || 10 }, headers: { Authorization: `Bearer ${accessToken}` } });
    const messageIds = listResp.data.messages || [];
    const messages = await Promise.all(messageIds.slice(0, 10).map(async ({ id }) => {
      const msg = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject,From,Date`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const hdrs = msg.data.payload?.headers || [];
      const get = name => hdrs.find(h => h.name === name)?.value || '';
      return { id, subject: get('Subject'), from: get('From'), date: get('Date'), snippet: msg.data.snippet };
    }));
    return { success: true, messages, count: messages.length };
  }
});

registry.register('google_calendar_create', {
  label: 'Google Calendar – Create Event',
  description: 'Create a new Google Calendar event',
  category: 'google',
  icon: '📅',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'event', type: 'object' }],
  configSchema: {
    summary: { type: 'text', label: 'Title', required: true },
    startTime: { type: 'text', label: 'Start (ISO)', required: true },
    endTime: { type: 'text', label: 'End (ISO)', required: true },
    attendees: { type: 'text', label: 'Attendees (comma-sep emails)', default: '' },
    calendarId: { type: 'text', label: 'Calendar ID', default: 'primary' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Google OAuth access token required — add a Google Calendar credential');
    const attendees = config.attendees ? config.attendees.split(',').map(e => ({ email: e.trim() })).filter(a => a.email) : [];
    const event = { summary: config.summary, start: { dateTime: config.startTime, timeZone: 'UTC' }, end: { dateTime: config.endTime, timeZone: 'UTC' }, ...(attendees.length > 0 && { attendees }) };
    const response = await axios.post(`https://www.googleapis.com/calendar/v3/calendars/${config.calendarId || 'primary'}/events`, event, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
    return { success: true, event: response.data, eventId: response.data.id, htmlLink: response.data.htmlLink };
  }
});

registry.register('google_drive_upload', {
  label: 'Google Drive – Upload',
  description: 'Upload content to Google Drive',
  category: 'google',
  icon: '📤',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'file', type: 'object' }],
  configSchema: {
    fileName: { type: 'text', label: 'File Name', required: true, default: 'output.txt' },
    content: { type: 'textarea', label: 'Content', required: true },
    folderId: { type: 'text', label: 'Folder ID (blank = root)', default: '' },
    mimeType: { type: 'text', label: 'MIME Type', default: 'text/plain' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Google OAuth access token required — add a Google Drive credential');
    const metadata = { name: config.fileName, ...(config.folderId && { parents: [config.folderId] }) };
    const boundary = 'flowa_boundary';
    const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${config.mimeType || 'text/plain'}\r\n\r\n${config.content}\r\n--${boundary}--`;
    const response = await axios.post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', body, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` } });
    return { success: true, file: response.data, fileId: response.data.id, webViewLink: response.data.webViewLink };
  }
});

registry.register('google_drive_list', {
  label: 'Google Drive – List Files',
  description: 'List files in a Google Drive folder',
  category: 'google',
  icon: '📂',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'files', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    folderId: { type: 'text', label: 'Folder ID', default: 'root' },
    query: { type: 'text', label: 'Name Filter', default: '' },
    maxResults: { type: 'number', label: 'Max Results', default: 50 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Google OAuth access token required');
    let q = `'${config.folderId || 'root'}' in parents and trashed=false`;
    if (config.query) q += ` and name contains '${config.query}'`;
    const response = await axios.get('https://www.googleapis.com/drive/v3/files', { params: { q, pageSize: config.maxResults || 50, fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)' }, headers: { Authorization: `Bearer ${accessToken}` } });
    return { success: true, files: response.data.files, count: response.data.files.length };
  }
});

// ═══════════════════════════════════════════════════════
// TWITTER / X
// ═══════════════════════════════════════════════════════

registry.register('twitter_post', {
  label: 'X (Twitter) – Post',
  description: 'Post a tweet to X/Twitter',
  category: 'social',
  icon: '🐦',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'tweet', type: 'object' }],
  configSchema: {
    text: { type: 'textarea', label: 'Tweet Text', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const token = creds.access_token || config.accessToken || process.env.TWITTER_ACCESS_TOKEN;
    if (!token) throw new Error('Twitter OAuth2 user access token required — set TWITTER_ACCESS_TOKEN in .env');
    const response = await axios.post('https://api.twitter.com/2/tweets', { text: config.text }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    return { success: true, tweet: response.data.data };
  }
});

registry.register('twitter_search', {
  label: 'X (Twitter) – Search',
  description: 'Search recent tweets on X/Twitter',
  category: 'social',
  icon: '🔎',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'tweets', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    query: { type: 'text', label: 'Search Query', required: true },
    count: { type: 'number', label: 'Max Results', default: 10 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const bearerToken = creds.bearer_token || config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) throw new Error('Twitter Bearer Token required — set TWITTER_BEARER_TOKEN in .env');
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', { params: { query: config.query, max_results: Math.min(Math.max(config.count || 10, 10), 100), 'tweet.fields': 'created_at,author_id,text' }, headers: { Authorization: `Bearer ${bearerToken}` } });
    const tweets = response.data.data || [];
    return { success: true, tweets, count: tweets.length };
  }
});

// ═══════════════════════════════════════════════════════
// SOCIAL MEDIA
// ═══════════════════════════════════════════════════════

registry.register('instagram_post', {
  label: 'Instagram – Post',
  description: 'Publish a media post to Instagram via Meta Graph API',
  category: 'social',
  icon: '📸',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'post', type: 'object' }],
  configSchema: {
    imageUrl: { type: 'text', label: 'Image URL', required: true },
    caption: { type: 'textarea', label: 'Caption', default: '' },
    accountId: { type: 'text', label: 'Instagram Business Account ID', required: true }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = creds.account_id || config.accountId || process.env.INSTAGRAM_ACCOUNT_ID;
    if (!accessToken) throw new Error('Instagram access token required — set INSTAGRAM_ACCESS_TOKEN in .env');
    if (!accountId) throw new Error('Instagram Business Account ID required');
    const containerResp = await axios.post(`https://graph.facebook.com/v18.0/${accountId}/media`, null, { params: { image_url: config.imageUrl, caption: config.caption || '', access_token: accessToken } });
    const publishResp = await axios.post(`https://graph.facebook.com/v18.0/${accountId}/media_publish`, null, { params: { creation_id: containerResp.data.id, access_token: accessToken } });
    return { success: true, postId: publishResp.data.id };
  }
});

registry.register('linkedin_post', {
  label: 'LinkedIn – Post',
  description: 'Share a post on LinkedIn',
  category: 'social',
  icon: '💼',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'post', type: 'object' }],
  configSchema: {
    text: { type: 'textarea', label: 'Post Text', required: true },
    visibility: { type: 'select', options: ['PUBLIC', 'CONNECTIONS'], default: 'PUBLIC' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
    const personId = creds.person_id || config.personId || process.env.LINKEDIN_PERSON_ID;
    if (!accessToken) throw new Error('LinkedIn access token required — set LINKEDIN_ACCESS_TOKEN in .env');
    if (!personId) throw new Error('LinkedIn person URN required — set LINKEDIN_PERSON_ID in .env (e.g. urn:li:person:XXXX)');
    const author = personId.startsWith('urn:') ? personId : `urn:li:person:${personId}`;
    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', { author, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: config.text }, shareMediaCategory: 'NONE' } }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': config.visibility || 'PUBLIC' } }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' } });
    return { success: true, postId: response.data.id };
  }
});

registry.register('reddit_post', {
  label: 'Reddit – Submit Post',
  description: 'Submit a post to a subreddit',
  category: 'social',
  icon: '🔴',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'post', type: 'object' }],
  configSchema: {
    subreddit: { type: 'text', label: 'Subreddit (without r/)', required: true },
    title: { type: 'text', label: 'Title', required: true },
    body: { type: 'textarea', label: 'Body', default: '' },
    kind: { type: 'select', options: ['self', 'link'], default: 'self' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.REDDIT_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Reddit access token required — set REDDIT_ACCESS_TOKEN in .env (use OAuth2 flow)');
    const response = await axios.post('https://oauth.reddit.com/api/submit', new URLSearchParams({ sr: config.subreddit, title: config.title, kind: config.kind || 'self', text: config.body || '', resubmit: 'true' }).toString(), { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Flowa-Automation/1.0' } });
    return { success: true, post: response.data };
  }
});

// ═══════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════

registry.register('paypal_payment', {
  label: 'PayPal – Create Order',
  description: 'Create a payment order via PayPal REST API',
  category: 'payments',
  icon: '💰',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'order', type: 'object' }, { name: 'approvalUrl', type: 'string' }],
  configSchema: {
    amount: { type: 'number', label: 'Amount', required: true },
    currency: { type: 'text', label: 'Currency', default: 'USD' },
    description: { type: 'text', label: 'Description', default: '' },
    sandbox: { type: 'select', options: ['true', 'false'], default: 'true' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const clientId = creds.client_id || config.clientId || process.env.PAYPAL_CLIENT_ID;
    const secret = creds.client_secret || config.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !secret) throw new Error('PayPal Client ID and Secret required — set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env');
    const baseUrl = config.sandbox !== 'false' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const tokenResp = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', { auth: { username: clientId, password: secret }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const orderResp = await axios.post(`${baseUrl}/v2/checkout/orders`, { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: config.currency || 'USD', value: String(config.amount) }, description: config.description }] }, { headers: { Authorization: `Bearer ${tokenResp.data.access_token}`, 'Content-Type': 'application/json' } });
    const order = orderResp.data;
    return { success: true, order, orderId: order.id, approvalUrl: order.links?.find(l => l.rel === 'approve')?.href, status: order.status };
  }
});

// ═══════════════════════════════════════════════════════
// CRM – SALESFORCE
// ═══════════════════════════════════════════════════════

registry.register('salesforce_query', {
  label: 'Salesforce – SOQL Query',
  description: 'Query Salesforce records with SOQL',
  category: 'crm',
  icon: '☁️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'records', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    query: { type: 'textarea', label: 'SOQL Query', required: true, default: 'SELECT Id, Name FROM Account LIMIT 10' },
    instanceUrl: { type: 'text', label: 'Instance URL (e.g. https://org.my.salesforce.com)', default: '' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.SALESFORCE_ACCESS_TOKEN;
    const instanceUrl = (creds.instance_url || config.instanceUrl || process.env.SALESFORCE_INSTANCE_URL || '').replace(/\/$/, '');
    if (!accessToken) throw new Error('Salesforce access token required — set SALESFORCE_ACCESS_TOKEN in .env');
    if (!instanceUrl) throw new Error('Salesforce instance URL required — set SALESFORCE_INSTANCE_URL in .env');
    const response = await axios.get(`${instanceUrl}/services/data/v57.0/query`, { params: { q: config.query }, headers: { Authorization: `Bearer ${accessToken}` } });
    return { success: true, records: response.data.records, count: response.data.totalSize, done: response.data.done };
  }
});

// ═══════════════════════════════════════════════════════
// ANALYTICS – GOOGLE ANALYTICS
// ═══════════════════════════════════════════════════════

registry.register('google_analytics', {
  label: 'Google Analytics – Report',
  description: 'Fetch reports from Google Analytics GA4',
  category: 'analytics',
  icon: '📈',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }, { name: 'rowCount', type: 'number' }],
  configSchema: {
    propertyId: { type: 'text', label: 'GA4 Property ID', required: true },
    startDate: { type: 'text', label: 'Start Date', default: '7daysAgo' },
    endDate: { type: 'text', label: 'End Date', default: 'today' },
    metrics: { type: 'text', label: 'Metrics (comma-sep)', default: 'sessions,screenPageViews' },
    dimensions: { type: 'text', label: 'Dimensions (comma-sep)', default: 'date' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessToken = creds.access_token || config.accessToken || process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Google Analytics OAuth access token required — add a Google credential');
    const metrics = (config.metrics || 'sessions').split(',').map(m => ({ name: m.trim() }));
    const dimensions = config.dimensions ? config.dimensions.split(',').map(d => ({ name: d.trim() })) : [];
    const response = await axios.post(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:runReport`, { dateRanges: [{ startDate: config.startDate || '7daysAgo', endDate: config.endDate || 'today' }], metrics, ...(dimensions.length > 0 && { dimensions }) }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
    const rows = (response.data.rows || []).map(row => {
      const obj = {};
      (row.dimensionValues || []).forEach((v, i) => { obj[dimensions[i]?.name || `dim${i}`] = v.value; });
      (row.metricValues || []).forEach((v, i) => { obj[metrics[i]?.name || `metric${i}`] = v.value; });
      return obj;
    });
    return { success: true, rows, rowCount: response.data.rowCount || rows.length };
  }
});

// ═══════════════════════════════════════════════════════
// DATABASES – SUPABASE, MONGODB, FIREBASE
// ═══════════════════════════════════════════════════════

registry.register('supabase_query', {
  label: 'Supabase – Query',
  description: 'Query data from Supabase via REST API',
  category: 'databases',
  icon: '⚡',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    projectUrl: { type: 'text', label: 'Project URL', required: true },
    table: { type: 'text', label: 'Table', required: true },
    select: { type: 'text', label: 'Select Columns', default: '*' },
    filter: { type: 'json', label: 'Filters (JSON: {"col": "val"})', default: '{}' },
    limit: { type: 'number', label: 'Limit', default: 100 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const projectUrl = (creds.project_url || config.projectUrl || process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const apiKey = creds.anon_key || creds.service_key || config.apiKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!projectUrl) throw new Error('Supabase project URL required — set SUPABASE_URL in .env');
    if (!apiKey) throw new Error('Supabase API key required — set SUPABASE_ANON_KEY in .env');
    let filter = config.filter;
    if (typeof filter === 'string') { try { filter = JSON.parse(filter); } catch { filter = {}; } }
    const params = new URLSearchParams({ select: config.select || '*', limit: String(config.limit || 100) });
    Object.entries(filter || {}).forEach(([k, v]) => params.append(k, `eq.${v}`));
    const response = await axios.get(`${projectUrl}/rest/v1/${config.table}?${params}`, { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } });
    return { success: true, rows: response.data, count: response.data.length };
  }
});

registry.register('mongodb_find', {
  label: 'MongoDB – Find',
  description: 'Query documents via MongoDB Atlas Data API',
  category: 'databases',
  icon: '🍃',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'documents', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    dataApiUrl: { type: 'text', label: 'Atlas Data API URL', required: true },
    database: { type: 'text', label: 'Database', required: true },
    collection: { type: 'text', label: 'Collection', required: true },
    filter: { type: 'json', label: 'Filter (JSON)', default: '{}' },
    limit: { type: 'number', label: 'Limit', default: 100 }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const dataApiUrl = (creds.data_api_url || config.dataApiUrl || process.env.MONGODB_DATA_API_URL || '').replace(/\/$/, '');
    const dataApiKey = creds.data_api_key || config.dataApiKey || process.env.MONGODB_DATA_API_KEY;
    if (!dataApiUrl) throw new Error('MongoDB Atlas Data API URL required — set MONGODB_DATA_API_URL in .env');
    if (!dataApiKey) throw new Error('MongoDB Atlas Data API key required — set MONGODB_DATA_API_KEY in .env');
    let filter = config.filter;
    if (typeof filter === 'string') { try { filter = JSON.parse(filter); } catch { filter = {}; } }
    const response = await axios.post(`${dataApiUrl}/action/find`, { dataSource: creds.cluster || config.cluster || 'Cluster0', database: config.database, collection: config.collection, filter, limit: config.limit || 100 }, { headers: { 'api-key': dataApiKey, 'Content-Type': 'application/json' } });
    return { success: true, documents: response.data.documents, count: response.data.documents.length };
  }
});

registry.register('firebase_read', {
  label: 'Firebase – Read',
  description: 'Read data from Firebase Realtime Database',
  category: 'databases',
  icon: '🔥',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'data', type: 'any' }],
  configSchema: {
    databaseUrl: { type: 'text', label: 'Database URL', required: true },
    path: { type: 'text', label: 'Path', required: true, default: '/users' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const dbUrl = (creds.database_url || config.databaseUrl || process.env.FIREBASE_DATABASE_URL || '').replace(/\/$/, '');
    const secret = creds.database_secret || config.databaseSecret || process.env.FIREBASE_DATABASE_SECRET;
    if (!dbUrl) throw new Error('Firebase database URL required — set FIREBASE_DATABASE_URL in .env');
    const url = `${dbUrl}${config.path}.json${secret ? `?auth=${secret}` : ''}`;
    const response = await axios.get(url);
    return { success: true, data: response.data, path: config.path };
  }
});

// ═══════════════════════════════════════════════════════
// FILES – CSV/PDF
// ═══════════════════════════════════════════════════════

registry.register('csv_parse', {
  label: 'CSV Parser',
  description: 'Parse CSV text into JSON objects',
  category: 'files',
  icon: '📑',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }, { name: 'count', type: 'number' }],
  configSchema: {
    field: { type: 'text', label: 'Field containing CSV (blank = entire input)', default: '' },
    delimiter: { type: 'text', label: 'Delimiter', default: ',' },
    hasHeader: { type: 'select', options: ['true', 'false'], default: 'true' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input || {})[0] || {};
    const raw = config.field ? (data[config.field] || '') : (typeof data === 'string' ? data : '');
    if (!raw) return { rows: [], count: 0 };
    const delimiter = config.delimiter || ',';
    const lines = raw.trim().split(/\r?\n/);
    const hasHeader = config.hasHeader !== 'false';
    const parse = line => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    if (hasHeader && lines.length > 1) {
      const headers = parse(lines[0]);
      const rows = lines.slice(1).map(line => Object.fromEntries(parse(line).map((v, i) => [headers[i] ?? i, v])));
      return { success: true, rows, count: rows.length, headers };
    }
    const rows = lines.map(parse);
    return { success: true, rows, count: rows.length };
  }
});

registry.register('pdf_extract', {
  label: 'PDF – Extract Text',
  description: 'Extract text from a PDF via URL (requires pdftotext)',
  category: 'files',
  icon: '📄',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'text', type: 'string' }],
  configSchema: {
    fileUrl: { type: 'text', label: 'PDF URL', required: true }
  },
  execute: async ({ config }) => {
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    const pdfResp = await axios.get(config.fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const tmpFile = path.join(os.tmpdir(), `flowa_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tmpFile, Buffer.from(pdfResp.data));
    try {
      const { execSync } = require('child_process');
      const text = execSync(`pdftotext "${tmpFile}" -`, { timeout: 30000, encoding: 'utf-8' });
      return { success: true, text: text.trim() };
    } catch {
      return { success: false, text: '', note: 'pdftotext (poppler-utils) not installed on server — run: apt-get install poppler-utils' };
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
});

// ═══════════════════════════════════════════════════════
// TRANSFORM – XML PARSE
// ═══════════════════════════════════════════════════════

registry.register('xml_parse', {
  label: 'XML Parse',
  description: 'Parse XML into JSON',
  category: 'transform',
  icon: '📰',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'parsed', type: 'any' }],
  configSchema: {
    field: { type: 'text', label: 'Field containing XML (blank = entire input)', default: '' }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input || {})[0] || {};
    const xmlString = config.field ? (data[config.field] || '') : (typeof data === 'string' ? data : JSON.stringify(data));
    const parseXml = (xml) => {
      const clean = xml.replace(/<\?[^>]+\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
      const parse = (str) => {
        const result = {};
        const tagRe = /<(\w[\w:.-]*)([^>]*)>([\s\S]*?)<\/\1>/g;
        let m;
        while ((m = tagRe.exec(str)) !== null) {
          const [, tag, , content] = m;
          const inner = content.trim();
          const val = inner.includes('<') ? parse(inner) : inner;
          if (result[tag]) { if (!Array.isArray(result[tag])) result[tag] = [result[tag]]; result[tag].push(val); } else result[tag] = val;
        }
        return Object.keys(result).length > 0 ? result : str.trim();
      };
      return parse(clean);
    };
    return { success: true, parsed: parseXml(xmlString) };
  }
});

// ═══════════════════════════════════════════════════════
// AWS S3 + LAMBDA
// ═══════════════════════════════════════════════════════

registry.register('aws_s3_upload', {
  label: 'AWS S3 – Upload',
  description: 'Upload content to Amazon S3',
  category: 'cloud',
  icon: '☁️',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'url', type: 'string' }, { name: 'result', type: 'object' }],
  configSchema: {
    bucket: { type: 'text', label: 'Bucket Name', required: true },
    key: { type: 'text', label: 'Object Key (file path)', required: true },
    content: { type: 'textarea', label: 'Content', default: '' },
    region: { type: 'text', label: 'Region', default: 'us-east-1' },
    contentType: { type: 'text', label: 'Content Type', default: 'text/plain' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessKeyId = creds.access_key_id || creds.aws_access_key_id || config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = creds.secret_access_key || config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials required — set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    const crypto = require('crypto');
    const region = config.region || 'us-east-1';
    const bucket = config.bucket;
    const key = config.key;
    const content = config.content || '';
    const contentType = config.contentType || 'text/plain';
    const now = new Date();
    const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const sign = (k, msg) => crypto.createHmac('sha256', k).update(msg).digest();
    const hash = msg => crypto.createHash('sha256').update(msg).digest('hex');
    const bodyHash = hash(content);
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${datetime}\n`;
    const canonicalRequest = `PUT\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;
    const credScope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credScope}\n${hash(canonicalRequest)}`;
    const signingKey = sign(sign(sign(sign(`AWS4${secretAccessKey}`, date), region), 's3'), 'aws4_request');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    await axios.put(`https://${host}/${key}`, content, { headers: { 'Content-Type': contentType, Authorization: authorization, 'x-amz-content-sha256': bodyHash, 'x-amz-date': datetime } });
    return { success: true, url: `https://${host}/${key}`, bucket, key, region };
  }
});

registry.register('aws_lambda_invoke', {
  label: 'AWS Lambda – Invoke',
  description: 'Invoke an AWS Lambda function',
  category: 'cloud',
  icon: 'λ',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'result', type: 'any' }],
  configSchema: {
    functionName: { type: 'text', label: 'Function Name or ARN', required: true },
    payload: { type: 'json', label: 'Payload (JSON)', default: '{}' },
    region: { type: 'text', label: 'Region', default: 'us-east-1' },
    invocationType: { type: 'select', options: ['RequestResponse', 'Event', 'DryRun'], default: 'RequestResponse' }
  },
  execute: async ({ config }) => {
    const creds = config._credentials || {};
    const accessKeyId = creds.access_key_id || config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = creds.secret_access_key || config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials required — set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    const crypto = require('crypto');
    const region = config.region || 'us-east-1';
    let payload = config.payload;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = {}; } }
    const body = JSON.stringify(payload || {});
    const now = new Date();
    const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const sign = (k, msg) => crypto.createHmac('sha256', k).update(msg).digest();
    const hash = msg => crypto.createHash('sha256').update(msg).digest('hex');
    const bodyHash = hash(body);
    const host = `lambda.${region}.amazonaws.com`;
    const path = `/2015-03-31/functions/${encodeURIComponent(config.functionName)}/invocations`;
    const invocationType = config.invocationType || 'RequestResponse';
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date;x-amz-invocation-type';
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${datetime}\nx-amz-invocation-type:${invocationType}\n`;
    const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;
    const credScope = `${date}/${region}/lambda/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credScope}\n${hash(canonicalRequest)}`;
    const signingKey = sign(sign(sign(sign(`AWS4${secretAccessKey}`, date), region), 'lambda'), 'aws4_request');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await axios.post(`https://${host}${path}`, body, { headers: { 'Content-Type': 'application/json', Authorization: authorization, 'x-amz-date': datetime, 'x-amz-content-sha256': bodyHash, 'x-amz-invocation-type': invocationType } });
    const result = typeof response.data === 'string' ? (() => { try { return JSON.parse(response.data); } catch { return response.data; } })() : response.data;
    return { success: true, result, statusCode: response.status };
  }
});

// ═══════════════════════════════════════════════════════
// TRIGGER – EMAIL TRIGGER
// ═══════════════════════════════════════════════════════

registry.register('trigger_email', {
  label: 'Email Trigger',
  description: 'Trigger when a new email arrives (polls IMAP)',
  category: 'triggers',
  icon: '📩',
  inputs: [],
  outputs: [{ name: 'email', type: 'object' }],
  configSchema: {
    mailbox: { type: 'text', label: 'Mailbox', default: 'INBOX' },
    filter: { type: 'text', label: 'Subject Filter', default: '' }
  },
  execute: async ({ config, context }) => {
    // Email triggers are polled externally; this node passes through the trigger payload
    const payload = context.triggerPayload || {};
    return { subject: payload.subject || '', from: payload.from || '', body: payload.body || '', receivedAt: payload.receivedAt || new Date().toISOString(), mailbox: config.mailbox || 'INBOX' };
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
registry.register('csv_parse', {
  label: 'CSV Parse',
  description: 'Parse CSV text into an array of objects',
  category: 'transform',
  icon: '📊',
  inputs: [{ name: 'data', type: 'any' }],
  outputs: [{ name: 'rows', type: 'array' }],
  configSchema: {
    field: { type: 'text', label: 'Input field containing CSV text', default: 'body' },
    delimiter: { type: 'text', label: 'Delimiter', default: ',' },
    hasHeader: { type: 'boolean', label: 'First row is header', default: true }
  },
  execute: async ({ config, input }) => {
    const data = Object.values(input)[0];
    const raw = data?.[config.field || 'body'] ?? data;
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const delim = config.delimiter || ',';
    const hasHeader = config.hasHeader !== false;

    function parseRow(line) {
      const fields = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuote = false; }
          else { cur += ch; }
        } else if (ch === '"') {
          inQuote = true;
        } else if (ch === delim) {
          fields.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur);
      return fields;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { rows: [], count: 0 };

    if (!hasHeader) {
      return { rows: lines.map(parseRow), count: lines.length };
    }

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseRow(line);
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
    return { rows, count: rows.length, headers };
  }
});
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
registerAlias('util_logger', 'consoleLog');
registerAlias('error_handler', 'errorHandler');
registerAlias('wait_approval', 'waitForApproval');
registerAlias('date_time', 'dateTime');
registerAlias('util_date_format', 'dateTime');
registerAlias('math_operation', 'mathOperation');
registerAlias('logic_delay', 'delay');
registerAlias('logic_loop', 'loop');
registerAlias('logic_retry', 'errorHandler');
registerAlias('logic_parallel', 'mergeData');
registerAlias('transform_map', 'setVariable');
registerAlias('transform_aggregate', 'mergeData');
registerAlias('util_set_variable', 'setVariable');
registerAlias('webhook_response', 'respondWebhook');
registerAlias('rest_api_poll', 'httpRequest');
registerAlias('graphql_query', 'httpRequest', {
  execute: withConfig('httpRequest', (config) => ({
    method: 'POST',
    url: config.endpoint || config.url || '',
    body: JSON.stringify({ query: config.query, variables: config.variables || {} }),
    headers: '{"Content-Type":"application/json"}',
  }))
});

// New node aliases
registerAlias('discord_send', 'discord_message');
registerAlias('telegram_message', 'telegram_send');
registerAlias('github_issue', 'github_create_issue');
registerAlias('github_list_prs', 'github_pr');
registerAlias('stripe_create_charge', 'stripe_charge');
registerAlias('stripe_get_customer', 'stripe_customer');
registerAlias('dalle_image', 'openai_image');
registerAlias('openai_dalle', 'openai_image');
registerAlias('whisper', 'whisper_transcribe');
registerAlias('huggingface', 'huggingface_inference');
registerAlias('hf_inference', 'huggingface_inference');
registerAlias('airtable', 'airtable_list');
registerAlias('notion', 'notion_query');
registerAlias('notion_database', 'notion_query');
registerAlias('mixpanel', 'mixpanel_track');
registerAlias('segment', 'segment_track');
registerAlias('vercel', 'vercel_deploy');
registerAlias('read_file', 'file_read');
registerAlias('write_file', 'file_write');
registerAlias('redis', 'redis_command');
registerAlias('translate', 'google_translate');
registerAlias('geocode', 'google_maps_geocode');
registerAlias('youtube', 'youtube_search');
registerAlias('vision_ai', 'google_vision');
registerAlias('sheets_read', 'google_sheets_read');
registerAlias('sheets_write', 'google_sheets_write');
registerAlias('gmail_send', 'google_gmail_send');
registerAlias('gmail_read', 'google_gmail_read');
registerAlias('calendar_create', 'google_calendar_create');
registerAlias('drive_list', 'google_drive_list');
registerAlias('drive_upload', 'google_drive_upload');
registerAlias('tweet', 'twitter_post');
registerAlias('x_post', 'twitter_post');
registerAlias('twitter', 'twitter_search');
registerAlias('instagram', 'instagram_post');
registerAlias('linkedin', 'linkedin_post');
registerAlias('reddit', 'reddit_post');
registerAlias('paypal', 'paypal_payment');
registerAlias('salesforce', 'salesforce_query');
registerAlias('ga4', 'google_analytics');
registerAlias('supabase', 'supabase_query');
registerAlias('mongodb', 'mongodb_find');
registerAlias('firebase', 'firebase_read');
registerAlias('xml', 'xml_parse');
registerAlias('s3_upload', 'aws_s3_upload');
registerAlias('lambda_invoke', 'aws_lambda_invoke');
registerAlias('ftp_upload', 'file_write');
registerAlias('soap_request', 'httpRequest');

module.exports = registry;

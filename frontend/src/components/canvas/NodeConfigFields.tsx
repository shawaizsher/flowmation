import React from 'react';
import DynamicHeadersInput from '../DynamicHeadersInput';

interface NodeConfigFieldsProps {
  config: Record<string, any>;
  nodeType: string;
  onUpdate: (key: string, value: any) => void;
  /** Drop-target factory that inserts an `{{...}}` token at the caret position */
  makeTokenDropHandler: (key: string, current: string) => {
    onDragOver: (e: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onDrop: (e: React.DragEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
}

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const HTTP_GROUPS: Record<string, string[]> = {
  'Basic Request': ['method', 'url'],
  'Query & Parameters': ['parameters'],
  'Headers': ['headers', 'dynamicHeaders'],
  'Request Body': ['body', 'bodyType'],
  'Authentication': ['authType', 'basicAuthUsername', 'basicAuthPassword', 'bearerToken', 'apiKeyName', 'apiKeyValue'],
  'Request Options': ['timeout', 'followRedirects', 'maxRedirects', 'responseType', 'returnFullResponse'],
  'SSL & Security': ['verifySSL'],
  'Proxy': ['useProxy', 'proxyUrl'],
};

const SELECT_OPTIONS: Record<string, string[]> = {
  method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'],
  authType: ['none', 'basic', 'bearer', 'api_key', 'oauth2', 'custom'],
  bodyType: ['auto', 'json', 'form', 'raw', 'xml'],
  responseType: ['auto', 'json', 'text', 'arraybuffer', 'blob', 'stream'],
};

function shouldShowHttpField(fieldName: string, allConfig: Record<string, any>) {
  if (fieldName.startsWith('basicAuth') && allConfig.authType !== 'basic') return false;
  if (fieldName.startsWith('bearerToken') && allConfig.authType !== 'bearer') return false;
  if (fieldName.startsWith('apiKey') && allConfig.authType !== 'api_key') return false;
  if (fieldName === 'proxyUrl' && !allConfig.useProxy) return false;
  return true;
}

/**
 * Renders the per-key config inputs for a node. Shared between the right-side
 * config panel and the full-screen NodeEditorModal so both stay in sync.
 */
export default function NodeConfigFields({ config, nodeType, onUpdate, makeTokenDropHandler }: NodeConfigFieldsProps) {
  const isHttp = nodeType === 'httpRequest' || nodeType === 'http_request';

  const renderField = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <button
          onClick={() => onUpdate(key, !value)}
          className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition text-center ${
            value
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'bg-surface-border text-foreground-muted border border-surface-border hover:border-brand-500/20'
          }`}
        >
          {value ? '✓ Enabled' : '○ Disabled'}
        </button>
      );
    }

    if (SELECT_OPTIONS[key]) {
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => onUpdate(key, e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
        >
          {SELECT_OPTIONS[key].map((opt) => (
            <option key={opt} value={opt}>{opt.replace(/_/g, ' ').toUpperCase()}</option>
          ))}
        </select>
      );
    }

    if (key === 'dynamicHeaders') {
      const parsed = (() => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try { const p = JSON.parse(value || '[]'); return Array.isArray(p) ? p : []; }
          catch { return []; }
        }
        return [];
      })();
      return <DynamicHeadersInput value={parsed} onChange={(h) => onUpdate(key, h)} />;
    }

    const longTextField = key === 'body' || key === 'headers' || key === 'parameters' || key === 'code' || key === 'message' || key === 'prompt' || key === 'systemPrompt';
    if (longTextField || (typeof value === 'string' && value.length > 80)) {
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onUpdate(key, e.target.value)}
          {...makeTokenDropHandler(key, String(value ?? ''))}
          className="w-full rounded-lg border border-surface-border bg-surface-input p-3 font-mono text-sm text-foreground outline-none focus:border-brand-500/50 transition resize-none"
          rows={key === 'body' || key === 'code' || key === 'message' || key === 'prompt' ? 5 : 3}
          placeholder={`Enter ${formatLabel(key).toLowerCase()}…`}
        />
      );
    }

    return (
      <input
        type={key.includes('Password') || key.includes('Token') || key.includes('Key') ? 'password' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onUpdate(key, e.target.value)}
        {...makeTokenDropHandler(key, String(value ?? ''))}
        className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal placeholder:text-foreground-muted/50"
        placeholder={`Enter ${formatLabel(key).toLowerCase()}…`}
      />
    );
  };

  // Grouped rendering for HTTP Request
  if (isHttp) {
    return (
      <>
        {Object.entries(HTTP_GROUPS).map(([groupName, fieldNames]) => {
          const visible = fieldNames.filter((f) => shouldShowHttpField(f, config) && f in config);
          if (visible.length === 0) return null;
          return (
            <div key={groupName} className="mb-6 border-b border-surface-border pb-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">{groupName}</h4>
              <div className="space-y-3">
                {visible.map((key) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">{formatLabel(key)}</label>
                    {renderField(key, config[key])}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  // Default flat rendering
  return (
    <>
      {Object.entries(config)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => (
          <div key={key} className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground-muted">{formatLabel(key)}</label>
            {renderField(key, value)}
          </div>
        ))}
    </>
  );
}

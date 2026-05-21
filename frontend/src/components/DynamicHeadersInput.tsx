import { Plus, Trash2 } from 'lucide-react';

interface Header {
  key: string;
  value: string;
}

interface DynamicHeadersInputProps {
  value: Header[];
  onChange: (headers: Header[]) => void;
}

export default function DynamicHeadersInput({ value, onChange }: DynamicHeadersInputProps) {
  const headers = Array.isArray(value) ? value : [];

  const addHeader = () => {
    onChange([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {headers.length === 0 ? (
        <p className="text-xs text-foreground-muted/70 italic">No headers yet</p>
      ) : (
        headers.map((header, index) => (
          <div key={index} className="rounded-lg border border-surface-border bg-surface-input/30 p-2 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Header name (e.g., Authorization)"
                value={header.key}
                onChange={(e) => updateHeader(index, 'key', e.target.value)}
                className="flex-1 rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50 transition"
              />
              <button
                onClick={() => removeHeader(index)}
                className="p-2 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition"
                title="Remove header"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Value (e.g., Bearer token123)"
              value={header.value}
              onChange={(e) => updateHeader(index, 'value', e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50 transition"
            />
          </div>
        ))
      )}

      <button
        onClick={addHeader}
        className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-500/30 py-2 text-sm text-brand-400 hover:bg-brand-500/5 transition"
      >
        <Plus size={14} /> Add Header
      </button>
    </div>
  );
}

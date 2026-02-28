import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  Search,
  Key,
  ChevronRight,
  ArrowLeft,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NodeIcon from '../canvas/NodeIcon';
import {
  useCredentialStore,
  serviceDefinitions,
  type ServiceDefinition,
  type SavedCredential,
  type CredentialField,
} from '../../store/credentials';

/* ────────── Props ────────── */
interface CredentialsManagerProps {
  open: boolean;
  onClose: () => void;
  /** If set, start on the form view for this service */
  preselectedServiceId?: string;
}

/* ────────── Sub-components ────────── */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-3">
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground-muted">
        {field.label}
        {field.required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type={field.type === 'password' && !visible ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className="w-full rounded-lg border border-surface-border bg-base px-3 py-2.5 pr-10 text-sm text-foreground font-mono outline-none focus:border-brand-500/50 transition"
        />
        {field.type === 'password' && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition"
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────── Credential Form ────────── */
function CredentialForm({
  service,
  existing,
  onSave,
  onBack,
}: {
  service: ServiceDefinition;
  existing?: SavedCredential;
  onSave: () => void;
  onBack: () => void;
}) {
  const { addCredential, updateCredential } = useCredentialStore();
  const [name, setName] = useState(existing?.name || `${service.label} Account`);
  const [values, setValues] = useState<Record<string, string>>(
    existing?.values || Object.fromEntries(service.fields.map((f) => [f.key, '']))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    // Validate required fields
    const missing = service.fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }

    if (!name.trim()) {
      toast.error('Please give this credential a name');
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        updateCredential(existing.id, { name, values });
        toast.success('Credential updated');
      } else {
        addCredential({ serviceId: service.serviceId, name, values });
        toast.success('Credential saved');
      }
      onSave();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-border p-4">
        <button onClick={onBack} className="rounded p-1 hover:bg-surface-border text-foreground-muted hover:text-foreground transition">
          <ArrowLeft size={18} />
        </button>
        <NodeIcon nodeType={service.fields.length > 0 ? service.icon : ''} size="md" />
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            {existing ? 'Edit' : 'Add'} {service.label} Credential
          </h3>
          <p className="text-xs text-foreground-muted">{service.description}</p>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Auth type badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-400 uppercase tracking-wide">
            {service.authType.replace('_', ' ')}
          </span>
        </div>

        {/* Credential name */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground-muted">Credential Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API Key"
            className="w-full rounded-lg border border-surface-border bg-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500/50 transition"
          />
        </div>

        <div className="mb-4 h-px bg-surface-border" />

        {/* Service-specific fields */}
        {service.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key] || ''}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}

        {/* Security notice */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <Shield size={16} className="mt-0.5 shrink-0 text-yellow-400" />
          <p className="text-xs text-foreground-muted leading-relaxed">
            Credentials are stored locally in your browser for this demo. In production, they would be encrypted and stored in a secure vault.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-surface-border p-4 flex gap-2">
        <button onClick={onBack} className="flex-1 rounded-lg border border-surface-border py-2.5 text-sm text-foreground-muted hover:bg-surface-border transition">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 !py-2.5 !text-sm"
        >
          {saving ? 'Saving…' : existing ? 'Update Credential' : 'Save Credential'}
        </button>
      </div>
    </div>
  );
}

/* ────────── Main Modal ────────── */
export default function CredentialsManager({ open, onClose, preselectedServiceId }: CredentialsManagerProps) {
  const { credentials, removeCredential } = useCredentialStore();
  const [view, setView] = useState<'list' | 'pick-service' | 'form'>('list');
  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
  const [editingCred, setEditingCred] = useState<SavedCredential | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // When opening with a preselected service, jump to form
  const handleOpen = () => {
    if (preselectedServiceId) {
      const svc = serviceDefinitions.find((s) => s.serviceId === preselectedServiceId);
      if (svc) {
        setSelectedService(svc);
        setView('form');
        return;
      }
    }
    setView('list');
  };

  // Reset on close
  const handleClose = () => {
    setView('list');
    setSelectedService(null);
    setEditingCred(null);
    setSearchQuery('');
    onClose();
  };

  if (!open) return null;

  // Filter services by search
  const filteredServices = serviceDefinitions.filter(
    (s) =>
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="relative flex h-[640px] w-[560px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── List view: show saved credentials ── */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between border-b border-surface-border p-4">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-brand-400" />
                <h2 className="font-display text-lg font-bold text-foreground">Credentials</h2>
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-400">
                  {credentials.length}
                </span>
              </div>
              <button onClick={handleClose} className="rounded p-1 text-foreground-muted hover:text-foreground hover:bg-surface-border transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {credentials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
                    <Shield size={32} className="text-brand-400/60" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">No credentials yet</h3>
                  <p className="text-sm text-foreground-muted mb-6 max-w-xs">
                    Add API keys and credentials to connect your workflow nodes to external services.
                  </p>
                  <button
                    onClick={() => setView('pick-service')}
                    className="btn-primary !py-2.5 !px-5 !text-sm"
                  >
                    <Plus size={15} className="mr-1.5 inline" /> Add Credential
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {credentials.map((cred) => {
                    const service = serviceDefinitions.find((s) => s.serviceId === cred.serviceId);
                    return (
                      <div key={cred.id} className="group flex items-center gap-3 rounded-lg border border-surface-border bg-base p-3 hover:border-brand-500/30 transition">
                        <NodeIcon nodeType={service?.icon || ''} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{cred.name}</span>
                            <CheckCircle2 size={14} className="shrink-0 text-green-400" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-foreground-muted">
                            <span>{service?.label || cred.serviceId}</span>
                            <span>·</span>
                            <span>{new Date(cred.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingCred(cred);
                              setSelectedService(service || null);
                              setView('form');
                            }}
                            className="rounded p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-border transition"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              removeCredential(cred.id);
                              toast.success('Credential removed');
                            }}
                            className="rounded p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {credentials.length > 0 && (
              <div className="border-t border-surface-border p-4">
                <button
                  onClick={() => setView('pick-service')}
                  className="btn-primary w-full !py-2.5 !text-sm"
                >
                  <Plus size={15} className="mr-1.5 inline" /> Add New Credential
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Pick service view ── */}
        {view === 'pick-service' && (
          <>
            <div className="flex items-center gap-3 border-b border-surface-border p-4">
              <button onClick={() => setView('list')} className="rounded p-1 text-foreground-muted hover:text-foreground hover:bg-surface-border transition">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">Select Service</h2>
                <p className="text-xs text-foreground-muted">Choose which service to configure credentials for</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search services…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-base py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-500/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="space-y-1">
                {filteredServices.map((service) => {
                  const existingCount = credentials.filter((c) => c.serviceId === service.serviceId).length;
                  return (
                    <button
                      key={service.serviceId}
                      onClick={() => {
                        setSelectedService(service);
                        setEditingCred(null);
                        setView('form');
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-base transition group"
                    >
                      <NodeIcon nodeType={service.icon} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{service.label}</span>
                          <span className="rounded-full bg-surface-border px-2 py-0.5 text-[10px] text-foreground-muted uppercase tracking-wide">
                            {service.authType.replace('_', ' ')}
                          </span>
                          {existingCount > 0 && (
                            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-400">
                              {existingCount} saved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted truncate">{service.description}</p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-foreground-muted/40 group-hover:text-foreground-muted transition" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Form view ── */}
        {view === 'form' && selectedService && (
          <CredentialForm
            service={selectedService}
            existing={editingCred || undefined}
            onSave={() => {
              setView('list');
              setEditingCred(null);
            }}
            onBack={() => {
              setView(editingCred ? 'list' : 'pick-service');
              setEditingCred(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

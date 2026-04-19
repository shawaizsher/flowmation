import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Sparkles,
  MoreVertical,
  Play,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  X,
  Workflow,
  ArrowRight,
  Zap,
  TrendingUp,
  Activity,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi, aiApi } from '../utils/api';
import { useStore } from '../store';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: string;
  version: number;
  tags: string[];
  updated_at: string;
  created_by_name: string;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isCurrentUser?: boolean;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string; dot: string }> = {
  draft:  { icon: <Clock size={14} />,        color: 'text-gray-400',   label: 'Draft',  dot: 'bg-gray-400' },
  active: { icon: <CheckCircle2 size={14} />, color: 'text-green-400',  label: 'Active', dot: 'bg-green-400' },
  paused: { icon: <Pause size={14} />,        color: 'text-yellow-400', label: 'Paused', dot: 'bg-yellow-400' },
  error:  { icon: <AlertCircle size={14} />,  color: 'text-red-400',    label: 'Error',  dot: 'bg-red-400' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspace, user } = useStore();

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selectedWf, setSelectedWf] = useState<string | null>(null);

  // Create workflow modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [createName, setCreateName] = useState('Untitled Workflow');
  const [createDescription, setCreateDescription] = useState('');
  const [collaborationMode, setCollaborationMode] = useState<'solo' | 'multiplayer'>('solo');
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // AI Generate modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const workspaceId = workspace?.id;

  const fetchWorkflows = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await workflowApi.list(workspaceId, params);
      setWorkflows(res.data.workflows);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, search, statusFilter]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const openCreateModal = async () => {
    if (!workspaceId) return;

    setShowCreateModal(true);
    setCreateName('Untitled Workflow');
    setCreateDescription('');
    setCollaborationMode('solo');
    setSelectedCollaboratorIds([]);

    try {
      setLoadingMembers(true);
      const res = await workflowApi.listMembers(workspaceId);
      setWorkspaceMembers(res.data.members || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load workspace users');
      setWorkspaceMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaboratorIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!workspaceId) return;

    const name = createName.trim();
    const description = createDescription.trim();

    if (!name) {
      toast.error('Workflow name is required');
      return;
    }

    if (collaborationMode === 'multiplayer' && selectedCollaboratorIds.length === 0) {
      toast.error('Select at least one collaborator for multiplayer workflows');
      return;
    }

    const tags = [
      `visibility:${collaborationMode}`,
      ...selectedCollaboratorIds.map((uid) => `collab-user:${uid}`),
    ];

    try {
      setCreatingWorkflow(true);
      const res = await workflowApi.create(workspaceId, {
        name,
        description,
        tags,
      });
      toast.success('Workflow created');
      setShowCreateModal(false);
      navigate(`/workflows/${res.data.workflow.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!workspaceId) return;
    try {
      await workflowApi.duplicate(workspaceId, id);
      toast.success('Workflow duplicated');
      fetchWorkflows();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to duplicate');
    }
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (!workspaceId) return;
    try {
      await workflowApi.delete(workspaceId, id);
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
    setMenuOpen(null);
  };

  const handleExecute = async (id: string) => {
    if (!workspaceId) return;
    try {
      const res = await workflowApi.execute(workspaceId, id);
      toast.success(`Execution started: ${res.data.executionId.slice(0, 8)}…`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute');
    }
    setMenuOpen(null);
  };

  const handleAiGenerate = async () => {
    if (!workspaceId || !aiPrompt.trim()) return;
    try {
      setAiGenerating(true);
      const res = await aiApi.generateWorkflow(workspaceId!, aiPrompt);
      const graph = res.data.graph;

      const wfRes = await workflowApi.create(workspaceId, {
        name: aiPrompt.slice(0, 60),
        description: `AI-generated: ${aiPrompt}`,
        graph,
      });

      toast.success('AI workflow generated!');
      setShowAiModal(false);
      setAiPrompt('');
      navigate(`/workflows/${wfRes.data.workflow.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const selectedWorkflow = workflows.find((w) => w.id === selectedWf);
  const activeCount = workflows.filter((w) => w.status === 'active').length;
  const errorCount = workflows.filter((w) => w.status === 'error').length;
  const selectableMembers = workspaceMembers.filter((m) => !m.isCurrentUser);

  return (
    <div className="h-full flex">
      {/* ═══════════ Left sidebar — Workflow list ═══════════ */}
      <div className="w-[320px] border-r border-surface-border flex flex-col bg-surface-card/40">
        {/* Search + New */}
        <div className="p-4 border-b border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Workflow size={14} className="text-brand-400" />
              Workflows
            </h2>
            <button
              onClick={openCreateModal}
              className="w-7 h-7 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-brand-500/25 hover:scale-105 active:scale-95"
              title="New Workflow"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-input border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-gray-500 focus:outline-none focus:border-brand-500/50 transition"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {['', 'draft', 'active', 'paused', 'error'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  statusFilter === s
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'text-foreground-muted hover:text-foreground-secondary border border-transparent hover:border-surface-border'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-lg bg-surface-hover p-3">
                  <div className="h-4 w-2/3 rounded bg-surface-border mb-2" />
                  <div className="h-3 w-1/3 rounded bg-surface-border" />
                </div>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center mx-auto mb-3">
                <Workflow size={20} className="text-foreground-muted" />
              </div>
              <p className="text-sm text-foreground-muted mb-1">No workflows yet</p>
              <p className="text-xs text-foreground-muted">Create one to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {workflows.map((wf) => {
                const status = statusConfig[wf.status] || statusConfig.draft;
                const isSelected = selectedWf === wf.id;
                return (
                  <div
                    key={wf.id}
                    className={`group relative rounded-lg px-3 py-3 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand-500/10 border border-brand-500/30'
                        : 'border border-transparent hover:bg-surface-hover hover:border-surface-border'
                    }`}
                    onClick={() => setSelectedWf(wf.id)}
                    onDoubleClick={() => navigate(`/workflows/${wf.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} shrink-0`} />
                          <h4 className="text-sm font-medium text-foreground truncate">{wf.name}</h4>
                        </div>
                        {wf.description && (
                          <p className="text-xs text-foreground-muted truncate pl-3.5">{wf.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 pl-3.5">
                          <span className="text-[10px] text-gray-600">v{wf.version}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-600">{timeAgo(wf.updated_at)}</span>
                        </div>
                      </div>

                      {/* Context menu */}
                      <div
                        className="opacity-0 group-hover:opacity-100 transition shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setMenuOpen(menuOpen === wf.id ? null : wf.id)}
                          className="rounded p-1 text-foreground-muted hover:text-foreground hover:bg-surface-border"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {menuOpen === wf.id && (
                          <div className="absolute right-2 top-10 z-20 w-40 rounded-lg border border-surface-border bg-surface-card py-1 shadow-xl">
                            <button
                              onClick={() => handleExecute(wf.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-hover"
                            >
                              <Play size={12} /> Run
                            </button>
                            <button
                              onClick={() => handleDuplicate(wf.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-hover"
                            >
                              <Copy size={12} /> Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(wf.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-surface-hover"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-surface-border">
          <button
            onClick={() => setShowAiModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-xs font-medium text-brand-400 transition hover:bg-brand-500/20"
          >
            <Sparkles size={14} />
            AI Generate Workflow
          </button>
        </div>
      </div>

      {/* ═══════════ Main content area ═══════════ */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="border-b border-surface-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Welcome back{user?.name ? `, ${user.name}` : ''}
              </h1>
              <p className="text-sm text-foreground-muted mt-1">
                Here's what's happening in your workspace
              </p>
            </div>
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              New Workflow
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* ── Stats cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-gradient-border p-5 animate-slide-up stagger-1" style={{ animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-foreground-muted uppercase tracking-wider font-medium">Total Workflows</span>
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                  <Workflow size={16} className="text-brand-400" />
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{workflows.length}</p>
              <p className="text-xs text-foreground-muted mt-1">in this workspace</p>
            </div>

            <div className="card-gradient-border p-5 animate-slide-up stagger-2" style={{ animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-foreground-muted uppercase tracking-wider font-medium">Active</span>
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-400" />
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-foreground-muted mt-1">running now</p>
            </div>

            <div className="card-gradient-border p-5 animate-slide-up stagger-3" style={{ animationFillMode: 'both' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-foreground-muted uppercase tracking-wider font-medium">Errors</span>
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <Activity size={16} className="text-red-400" />
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{errorCount}</p>
              <p className="text-xs text-foreground-muted mt-1">need attention</p>
            </div>
          </div>

          {/* ── Selected workflow detail / Quick actions ── */}
          {selectedWorkflow ? (
            <div className="card p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    {selectedWorkflow.name}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      (statusConfig[selectedWorkflow.status] || statusConfig.draft).color
                    } bg-surface-hover`}>
                      {(statusConfig[selectedWorkflow.status] || statusConfig.draft).icon}
                      {(statusConfig[selectedWorkflow.status] || statusConfig.draft).label}
                    </span>
                  </h2>
                  {selectedWorkflow.description && (
                    <p className="text-sm text-foreground-muted mt-1">{selectedWorkflow.description}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/workflows/${selectedWorkflow.id}`)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  Open Editor <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-surface-hover/50 rounded-lg p-3">
                  <p className="text-xs text-foreground-muted mb-1">Version</p>
                  <p className="text-sm font-medium text-foreground">v{selectedWorkflow.version}</p>
                </div>
                <div className="bg-surface-hover/50 rounded-lg p-3">
                  <p className="text-xs text-foreground-muted mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-foreground">{timeAgo(selectedWorkflow.updated_at)}</p>
                </div>
                <div className="bg-surface-hover/50 rounded-lg p-3">
                  <p className="text-xs text-foreground-muted mb-1">Created By</p>
                  <p className="text-sm font-medium text-foreground">{selectedWorkflow.created_by_name || 'Unknown'}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-surface-border">
                <button
                  onClick={() => handleExecute(selectedWorkflow.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 transition"
                >
                  <Play size={14} /> Run
                </button>
                <button
                  onClick={() => handleDuplicate(selectedWorkflow.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-foreground-secondary text-sm font-medium hover:text-foreground transition"
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  onClick={() => handleDelete(selectedWorkflow.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ) : (
            /* Quick actions when nothing selected */
            <div className="card p-8 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-brand-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {workflows.length === 0 ? 'Create your first workflow' : 'Select a workflow'}
              </h3>
              <p className="text-sm text-foreground-muted mb-6 max-w-md mx-auto">
                {workflows.length === 0
                  ? 'Start automating by creating a workflow manually or let AI generate one for you.'
                  : 'Click a workflow on the left to see details, or double-click to open the editor.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-2.5 text-sm font-medium text-brand-400 transition hover:bg-brand-500/20"
                >
                  <Sparkles size={16} />
                  AI Generate
                </button>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
                  <Plus size={16} />
                  New Workflow
                </button>
              </div>
            </div>
          )}

          {/* ── Recent workflows grid ── */}
          {workflows.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-foreground-muted uppercase tracking-wider mb-4">
                Recent Workflows
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.slice(0, 6).map((wf, i) => {
                  const status = statusConfig[wf.status] || statusConfig.draft;
                  return (
                    <div
                      key={wf.id}
                      className={`card group relative cursor-pointer p-4 transition-all duration-300 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 animate-slide-up stagger-${i + 1}`}
                      style={{ animationFillMode: 'both' }}
                      onClick={() => navigate(`/workflows/${wf.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                        <h4 className="text-sm font-semibold text-foreground truncate">{wf.name}</h4>
                      </div>
                      {wf.description && (
                        <p className="text-xs text-foreground-muted line-clamp-2 mb-3">{wf.description}</p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-gray-600">
                        <span>v{wf.version} · {status.label}</span>
                        <span>{timeAgo(wf.updated_at)}</span>
                      </div>
                      {/* Hover arrow */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
                        <ArrowRight size={14} className="text-brand-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Create Workflow Modal ═══════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-2xl p-6 animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Plus size={20} className="text-brand-400" />
                New Workflow
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-foreground-muted hover:text-foreground transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">Workflow Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Customer Onboarding"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">Description (optional)</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="input-field min-h-20 resize-none"
                  placeholder="What this workflow does"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Workflow Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollaborationMode('solo')}
                    className={`rounded-xl border p-4 text-left transition ${
                      collaborationMode === 'solo'
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-surface-border hover:border-brand-500/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Solo</p>
                    <p className="text-xs text-foreground-muted mt-1">Only you will work on this workflow initially.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollaborationMode('multiplayer')}
                    className={`rounded-xl border p-4 text-left transition ${
                      collaborationMode === 'multiplayer'
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-surface-border hover:border-brand-500/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">Multiplayer</p>
                    <p className="text-xs text-foreground-muted mt-1">Invite teammates so they can collaborate on this workflow.</p>
                  </button>
                </div>
              </div>

              {collaborationMode === 'multiplayer' && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground-secondary">
                    <Users size={16} className="text-brand-400" />
                    Add Collaborators
                  </div>

                  {loadingMembers ? (
                    <div className="rounded-xl border border-surface-border bg-surface-hover/40 p-4 text-sm text-foreground-muted">
                      Loading workspace users...
                    </div>
                  ) : selectableMembers.length === 0 ? (
                    <div className="rounded-xl border border-surface-border bg-surface-hover/40 p-4 text-sm text-foreground-muted">
                      No other users found in this workspace.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-surface-border">
                      {selectableMembers.map((member) => {
                        const selected = selectedCollaboratorIds.includes(member.id);
                        return (
                          <button
                            type="button"
                            key={member.id}
                            onClick={() => toggleCollaborator(member.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-surface-border last:border-b-0 transition ${
                              selected ? 'bg-brand-500/10' : 'hover:bg-surface-hover/50'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-foreground-muted">{member.email}</p>
                            </div>
                            <div className={`h-5 w-5 rounded border flex items-center justify-center ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-border text-transparent'}`}>
                              ✓
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creatingWorkflow || !createName.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {creatingWorkflow ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ AI Generate Modal ═══════════ */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-lg p-6 animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles size={20} className="text-brand-400" />
                AI Generate Workflow
              </h2>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-foreground-muted hover:text-foreground transition"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-foreground-muted">
              Describe what you want your workflow to do in plain English.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., When a webhook is received, classify the sentiment using AI, then send a Slack message if it's negative…"
              className="input-field mb-4 h-32 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAiModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

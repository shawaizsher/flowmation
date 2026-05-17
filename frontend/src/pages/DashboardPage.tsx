import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
const TutorialOverlay = lazy(() => import('../components/TutorialOverlay'));
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
  Store,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi, aiApi } from '../utils/api';
import { useStore } from '../store';
import { UserAvatar } from '../components/UserAvatar';

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
  const { workspace, user, showTutorial } = useStore();

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

  // Publish to Marketplace modal
  const [showPublishModal, setShowPublishModal]     = useState(false);
  const [publishingWfId, setPublishingWfId]         = useState<string | null>(null);
  const [publishCategory, setPublishCategory]       = useState('General');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishSetupGuide, setPublishSetupGuide]   = useState('');
  const [publishing, setPublishing]                 = useState(false);
  const [generatingDesc, setGeneratingDesc]         = useState(false);

  const PUBLISH_CATEGORIES = ['General','Sales','Marketing','Data','Finance','Productivity','AI','DevOps','Operations','Governance','Social'];

  const openPublishModal = (wfId: string) => {
    setPublishingWfId(wfId);
    setPublishCategory('General');
    setPublishDescription('');
    setPublishSetupGuide('');
    setShowPublishModal(true);
  };

  const handleGenerateDescription = async () => {
    if (!workspaceId || !publishingWfId) return;
    const wf = workflows.find(w => w.id === publishingWfId);
    if (!wf) return;
    try {
      setGeneratingDesc(true);
      // Fetch the full workflow graph so the generator has nodes + edges
      const wfRes = await workflowApi.get(workspaceId, publishingWfId);
      const graph = wfRes.data.workflow?.graph || { nodes: [], edges: [] };
      const res = await aiApi.generateDescription(workspaceId, {
        name: wf.name,
        nodes: graph.nodes || [],
        edges: graph.edges || [],
      });
      if (res.data.description) setPublishDescription(res.data.description);
      if (res.data.setupGuide?.length) setPublishSetupGuide(res.data.setupGuide.join('\n'));
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handlePublish = async () => {
    if (!workspaceId || !publishingWfId) return;
    try {
      setPublishing(true);
      const setupGuide = publishSetupGuide
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await workflowApi.publishTemplate(workspaceId, {
        workflowId: publishingWfId,
        category: publishCategory,
        description: publishDescription.trim() || undefined,
        setupGuide,
        requiredCredentials: [],
      });
      toast.success('Workflow published to Marketplace!');
      setShowPublishModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // AI Generate modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<{ message: string; suggestions: string[] } | null>(null);
  const [aiRefinement, setAiRefinement] = useState<{
    graph: unknown;
    summary: string;
    workflowExplanation: string[];
    clarification: string;
    clarificationOptions: string[];
    suggestions: string[];
    prompt: string;
  } | null>(null);
  const [aiConfidence, setAiConfidence] = useState<string | null>(null);

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

    try {
      setCreatingWorkflow(true);
      const res = await workflowApi.create(workspaceId, {
        name,
        description,
        tags: [`visibility:${collaborationMode}`],
        collaborators: selectedCollaboratorIds.map((userId) => ({
          userId,
          accessRole: 'edit',
        })),
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

  const resetAiModal = () => {
    setAiError(null);
    setAiRefinement(null);
    setAiConfidence(null);
  };

  // Automation-related vocabulary — any prompt containing at least one of these
  // words is allowed through; short prompts with zero matches are rejected immediately.
  const AUTOMATION_WORDS = new Set([
    'fetch','send','get','post','webhook','trigger','schedule','cron',
    'email','slack','discord','telegram','whatsapp','sms','database','db',
    'api','http','https','notify','alert','store','save','insert','filter',
    'transform','parse','classify','summarize','github','twilio','stripe',
    'daily','weekly','hourly','every','when','report','data','workflow',
    'automate','automation','request','response','message','notification',
    'event','run','execute','query','read','write','create','update','delete',
    'upload','download','push','pull','connect','monitor','check','watch',
    'receive','process','make','build','integrate','log','google','postgres',
    'mysql','mongodb','redis','aws','s3','jira','notion','airtable','hubspot',
    'salesforce','openai','anthropic','price','stock','payment','invoice',
    'form','file','csv','pdf','add','import','export','new','if','action',
    'source','destination','pipeline','node','step','flow','send',
  ]);

  const clientValidatePrompt = (text: string): string | null => {
    if (text.length < 5) return 'Please describe a workflow to generate.';
    const tokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
    if (tokens.length === 0) return 'Please describe a workflow to generate.';
    // If the prompt is short AND contains zero known automation words → gibberish
    const hasKnownWord = tokens.some(t => AUTOMATION_WORDS.has(t));
    if (!hasKnownWord && text.length < 30) {
      return "That doesn't look like a workflow description. Try: \"Send a Slack alert when a new GitHub PR is opened.\"";
    }
    return null;
  };

  const handleAiGenerate = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!workspaceId || !prompt) return;

    // Client-side gate — catches obvious gibberish without a round-trip to the server
    const clientError = clientValidatePrompt(prompt);
    if (clientError) {
      setAiError({
        message: clientError,
        suggestions: [
          'Fetch gold prices via HTTP and send a WhatsApp message via Twilio',
          'Send a Slack alert when a new GitHub PR is opened',
          'Daily report from Postgres emailed at 9am',
          'When a webhook fires, transform the data and insert it into a database',
        ],
      });
      return;
    }

    resetAiModal();

    try {
      setAiGenerating(true);
      const res = await aiApi.generateWorkflow(workspaceId, prompt);
      const data = res.data;

      if (!data.success) {
        toast.error(data.error || 'AI generation failed');
        return;
      }

      setAiConfidence(data.confidence || null);

      // MEDIUM confidence: show the generated workflow + refinement options
      // before actually creating it — let user refine or proceed
      if (data.needsClarification) {
        setAiRefinement({
          graph:                data.graph,
          summary:              data.summary || '',
          workflowExplanation:  data.workflowExplanation || [],
          clarification:        data.clarification || '',
          clarificationOptions: data.clarificationOptions || [],
          suggestions:          data.suggestions || [],
          prompt,
        });
        return;
      }

      // HIGH confidence: create immediately and navigate
      await createAndNavigate(prompt, data);
    } catch (err: any) {
      const errorData = err.response?.data;

      if (errorData?.type === 'invalid_input' || errorData?.type === 'invalid_prompt') {
        setAiError({ message: errorData.message || errorData.error || 'Invalid input.', suggestions: errorData.suggestions || [] });
        return;
      }
      if (errorData?.type === 'unsafe_request') {
        toast.error('This request involves potentially unsafe operations.');
        return;
      }
      toast.error(errorData?.error || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const createAndNavigate = async (prompt: string, data: any) => {
    const wfRes = await workflowApi.create(workspaceId!, {
      name:        prompt.slice(0, 60),
      description: data.summary || `AI-generated: ${prompt}`,
      graph:       data.graph,
    });
    toast.success(data.summary ? `Workflow created: ${data.summary}` : 'Workflow generated!');
    setShowAiModal(false);
    setAiPrompt('');
    resetAiModal();
    navigate(`/workflows/${wfRes.data.workflow.id}`);
  };

  // User picks a refined suggestion → re-generate with that prompt
  const handleRefineSuggestion = (suggestion: string) => {
    setAiPrompt(suggestion);
    setAiRefinement(null);
    handleAiGenerate(suggestion);
  };

  // User proceeds with the current best-guess workflow without refining
  const handleProceedWithWorkflow = async () => {
    if (!aiRefinement || !workspaceId) return;
    try {
      setAiGenerating(true);
      await createAndNavigate(aiRefinement.prompt, aiRefinement);
    } catch {
      toast.error('Failed to create workflow');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAiPrompt(suggestion);
    setAiError(null);
    handleAiGenerate(suggestion);
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
      {showTutorial && <Suspense fallback={null}><TutorialOverlay /></Suspense>}
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
              <div className="flex items-center gap-4">
                <UserAvatar avatar={user?.avatar} name={user?.name || 'User'} size={52} showRing glow animatedBorder presence="online" />
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Welcome back{user?.name ? `, ${user.name}` : ''}
                  </h1>
                  <p className="text-sm text-foreground-muted mt-1">
                    {user?.headline || "Here's what's happening in your workspace"}
                  </p>
                </div>
              </div>
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

          {/* ── Marketplace banner ── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-surface-card to-accent-500/10 p-6 cursor-pointer group hover:border-brand-500/40 transition-all duration-300"
            onClick={() => navigate('/marketplace')}
          >
            {/* Background glow blobs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-accent-500/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-accent-500/30 group-hover:from-brand-500/40 group-hover:to-accent-500/40 transition-all duration-300">
                  <Store size={22} className="text-brand-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    Workflow Marketplace
                    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-bold text-brand-400">New</span>
                  </h2>
                  <p className="text-sm text-foreground-muted mt-0.5">
                    Browse pre-built workflow templates and install them in one click.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-xs text-foreground-muted">
                  <Download size={12} className="text-brand-400" />
                  <span>One-click install</span>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-all duration-200 group-hover:shadow-lg group-hover:shadow-brand-500/25">
                  Browse Templates
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
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
                <button
                  onClick={() => openPublishModal(selectedWorkflow.id)}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/10 text-brand-400 text-sm font-medium hover:bg-brand-500/20 border border-brand-500/20 transition"
                >
                  <Upload size={14} /> Publish to Marketplace
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
          <div className="card mx-4 w-full max-w-lg animate-scale-in overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles size={20} className="text-brand-400" />
                AI Generate Workflow
                {aiConfidence && !aiRefinement && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    aiConfidence === 'high'   ? 'bg-green-500/15 text-green-400' :
                    aiConfidence === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                                               'bg-surface-border text-foreground-muted'
                  }`}>
                    {aiConfidence}
                  </span>
                )}
              </h2>
              <button onClick={() => { setShowAiModal(false); resetAiModal(); }}
                className="text-foreground-muted hover:text-foreground transition">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">

              {/* ══════════════════════════════════════════════════════
                  STATE A — Invalid input error (LOW confidence)
              ══════════════════════════════════════════════════════ */}
              {aiError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-red-300">{aiError.message}</p>
                  </div>
                  {aiError.suggestions.length > 0 && (
                    <>
                      <p className="mb-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                        Try one of these:
                      </p>
                      <div className="space-y-1.5">
                        {aiError.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleSuggestionClick(s)}
                            className="w-full text-left rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs font-medium text-foreground-secondary hover:border-brand-500/40 hover:text-foreground hover:bg-surface-hover transition">
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════
                  STATE B — Refinement panel (MEDIUM confidence)
                  Workflow was built but details are incomplete.
              ══════════════════════════════════════════════════════ */}
              {aiRefinement && (
                <>
                  {/* Generated workflow preview */}
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                      <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                        Best-guess workflow ready
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {aiRefinement.summary}
                    </p>
                    {aiRefinement.workflowExplanation.length > 0 && (
                      <div className="mt-2.5 space-y-0.5 border-t border-green-500/10 pt-2.5">
                        {aiRefinement.workflowExplanation.map((step, i) => (
                          <p key={i} className="text-xs text-foreground-muted">• {step}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clarification question */}
                  {aiRefinement.clarification && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        {aiRefinement.clarification}
                      </p>
                      {/* Quick-select options (append to prompt) */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {aiRefinement.clarificationOptions.map((opt, i) => (
                          <button key={i}
                            onClick={() => handleRefineSuggestion(`${aiRefinement.prompt} — ${opt.toLowerCase()}`)}
                            disabled={aiGenerating}
                            className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400 hover:bg-brand-500/20 transition disabled:opacity-50">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full example suggestions */}
                  {aiRefinement.suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                        Or use a complete example:
                      </p>
                      <div className="space-y-1.5">
                        {aiRefinement.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleRefineSuggestion(s)}
                            disabled={aiGenerating}
                            className="w-full text-left rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs font-medium text-foreground-secondary hover:border-brand-500/40 hover:text-foreground hover:bg-surface-hover transition disabled:opacity-50">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-border">
                    <button
                      onClick={() => { setAiRefinement(null); setAiConfidence(null); }}
                      className="text-xs text-foreground-muted hover:text-foreground transition">
                      ← Edit prompt
                    </button>
                    <button
                      onClick={handleProceedWithWorkflow}
                      disabled={aiGenerating}
                      className="btn-primary flex items-center gap-1.5 !text-xs !py-1.5 !px-4 disabled:opacity-50">
                      {aiGenerating
                        ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Creating…</>
                        : <><Workflow size={13} />Use this workflow</>
                      }
                    </button>
                  </div>
                </>
              )}

              {/* ══════════════════════════════════════════════════════
                  STATE C — Default prompt input
              ══════════════════════════════════════════════════════ */}
              {!aiRefinement && (
                <>
                  {!aiError && (
                    <p className="text-sm text-foreground-muted">
                      Describe what you want your workflow to do in plain English.
                    </p>
                  )}
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => { setAiPrompt(e.target.value); if (aiError) setAiError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAiGenerate(); }}
                    placeholder="e.g., When a webhook fires, classify the sentiment with AI then send a Slack message if negative…"
                    className="input-field h-28 resize-none"
                    autoFocus={!aiError}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setShowAiModal(false); resetAiModal(); }}
                      className="text-sm text-foreground-muted hover:text-foreground transition">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAiGenerate()}
                      disabled={!aiPrompt.trim() || aiGenerating}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50">
                      {aiGenerating
                        ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating…</>
                        : <><Sparkles size={16} />Generate</>
                      }
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Publish to Marketplace Modal ═══════════ */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-lg p-6 animate-scale-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Upload size={18} className="text-brand-400" />
                Publish to Marketplace
              </h2>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-foreground-muted hover:text-foreground transition"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-foreground-muted mb-5">
              Publishing makes this workflow available as a template in the Marketplace so anyone in your workspace can install it.
            </p>

            <div className="space-y-4">
              {/* AI generate button */}
              <button
                onClick={handleGenerateDescription}
                disabled={generatingDesc}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-accent-500/10 px-4 py-2.5 text-sm font-semibold text-brand-400 hover:from-brand-500/20 hover:to-accent-500/20 transition disabled:opacity-50"
              >
                {generatingDesc ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-400" /> Generating with AI…</>
                ) : (
                  <><Sparkles size={14} /> Generate Description with AI</>
                )}
              </button>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={publishCategory}
                    onChange={(e) => setPublishCategory(e.target.value)}
                    className="input-field w-full appearance-none pr-8"
                  >
                    {PUBLISH_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Description <span className="text-foreground-muted font-normal">(shown on marketplace card)</span>
                </label>
                <textarea
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="What does this workflow do? What problem does it solve?"
                  className="input-field min-h-[72px] resize-none w-full"
                />
              </div>

              {/* Setup guide */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Setup Guide <span className="text-foreground-muted font-normal">(one step per line, optional)</span>
                </label>
                <textarea
                  value={publishSetupGuide}
                  onChange={(e) => setPublishSetupGuide(e.target.value)}
                  placeholder={"Configure your webhook URL in the trigger node.\nAdd your API credentials in Settings.\nTest with a sample payload."}
                  className="input-field min-h-[90px] resize-none w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Publishing…
                  </>
                ) : (
                  <>
                    <Store size={15} />
                    Publish Template
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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Search,
  Download,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ArrowLeft,
  Package,
  User,
  Star,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi } from '../utils/api';
import { useStore } from '../store';
import BanterLoader from '../components/BanterLoader';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  owner: string;
  isBuiltIn: boolean;
  avgRating: number;
  ratingCount: number;
  userRating: number | null;
  installCount: number;
  nodeCount: number;
  edgeCount: number;
  setupGuide?: string[];
  requiredCredentials?: { label: string; required: boolean; reason: string; serviceId: string }[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Sales:       { bg: 'bg-yellow-500/15', text: 'text-yellow-400',  dot: 'bg-yellow-400' },
  Operations:  { bg: 'bg-blue-500/15',   text: 'text-blue-400',    dot: 'bg-blue-400' },
  Governance:  { bg: 'bg-purple-500/15', text: 'text-purple-400',  dot: 'bg-purple-400' },
  Marketing:   { bg: 'bg-pink-500/15',   text: 'text-pink-400',    dot: 'bg-pink-400' },
  Data:        { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',    dot: 'bg-cyan-400' },
  Finance:     { bg: 'bg-green-500/15',  text: 'text-green-400',   dot: 'bg-green-400' },
  Productivity:{ bg: 'bg-orange-500/15', text: 'text-orange-400',  dot: 'bg-orange-400' },
  AI:          { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',    dot: 'bg-cyan-400' },
  DevOps:      { bg: 'bg-red-500/15',    text: 'text-red-400',     dot: 'bg-red-400' },
  General:     { bg: 'bg-brand-500/15',  text: 'text-brand-400',   dot: 'bg-brand-400' },
};

function catStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: 'bg-brand-500/15', text: 'text-brand-400', dot: 'bg-brand-400' };
}

// ── Star rating display ───────────────────────────────────────────────────────
function StarDisplay({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-surface-border fill-surface-border'}
        />
      ))}
      <span className="ml-1 text-[11px] text-foreground-muted">
        {avg > 0 ? avg.toFixed(1) : '—'} ({count})
      </span>
    </div>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────
function StarPicker({
  templateId,
  userRating,
  onRate,
}: {
  templateId: string;
  userRating: number | null;
  onRate: (templateId: string, rating: number) => Promise<void>;
}) {
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleClick = async (star: number) => {
    if (busy) return;
    setBusy(true);
    await onRate(templateId, star);
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] text-foreground-muted mr-1">Rate:</span>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= (hover || userRating || 0);
        return (
          <button
            key={s}
            disabled={busy}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleClick(s)}
            className="transition-transform hover:scale-125 disabled:opacity-50"
            title={`Rate ${s} star${s !== 1 ? 's' : ''}`}
          >
            <Star
              size={14}
              className={filled ? 'text-yellow-400 fill-yellow-400' : 'text-foreground-muted'}
            />
          </button>
        );
      })}
      {userRating && (
        <span className="ml-1 text-[10px] font-semibold text-yellow-400">
          (your rating: {userRating}★)
        </span>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { workspace } = useStore();
  const workspaceId = workspace?.id;

  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeCategory, setCategory] = useState('All');
  const [installing, setInstalling] = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await workflowApi.templatesMarketplace(workspaceId);
      setTemplates(res.data.templates || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleRate = async (templateId: string, rating: number) => {
    if (!workspaceId) return;
    try {
      const res = await workflowApi.rateTemplate(workspaceId, templateId, rating);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, avgRating: res.data.avgRating, ratingCount: res.data.ratingCount, userRating: res.data.userRating }
            : t
        )
      );
      toast.success(`Rated ${rating} star${rating !== 1 ? 's' : ''}!`);
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const handleInstall = async (template: Template) => {
    if (!workspaceId) return;
    try {
      setInstalling(template.id);
      const res = await workflowApi.installTemplate(workspaceId, template.id, { name: template.name });
      toast.success(`"${template.name}" installed!`);
      navigate(`/workflows/${res.data.workflow.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to install template');
    } finally {
      setInstalling(null);
    }
  };

  const categories = ['All', ...Array.from(new Set(templates.map((t) => t.category))).sort()];

  const filtered = templates.filter((t) => {
    const matchCat    = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.owner.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-surface-base">

      {/* ── Page header ── */}
      <header className="border-b border-surface-border bg-surface-card px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-4 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-accent-500/30 flex items-center justify-center">
                <Store size={24} className="text-brand-400" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                  Workflow Marketplace
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-400">
                    {templates.length} template{templates.length !== 1 ? 's' : ''}
                  </span>
                </h1>
                <p className="text-sm text-foreground-muted mt-0.5">
                  Browse, rate, and install pre-built automation templates in one click.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-72 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates or authors…"
                className="w-full rounded-lg border border-surface-border bg-surface-input pl-9 pr-3 py-2 text-sm text-foreground placeholder-gray-500 focus:outline-none focus:border-brand-500/50 transition"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            {categories.map((cat) => {
              const active = cat === activeCategory;
              const style  = cat === 'All' ? null : catStyle(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? cat === 'All'
                        ? 'bg-brand-500 text-white'
                        : `${style!.bg} ${style!.text} ring-1 ring-current/30`
                      : 'bg-surface-hover text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {style && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <BanterLoader label="Loading templates…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package size={40} className="text-foreground-muted mb-4" />
            <p className="text-foreground font-semibold">No templates found</p>
            <p className="text-sm text-foreground-muted mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((template) => {
              const style        = catStyle(template.category);
              const isExpanded   = expanded === template.id;
              const isInstalling = installing === template.id;
              const credCount    = template.requiredCredentials?.length ?? 0;
              const stepCount    = template.setupGuide?.length ?? 0;

              return (
                <div
                  key={template.id}
                  className="card flex flex-col overflow-hidden hover:border-brand-500/30 transition-all duration-200"
                >
                  {/* ── Card header ── */}
                  <div className="p-5 flex-1 space-y-3">

                    {/* Category + node count */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {template.category}
                      </span>
                      <span className="text-[11px] text-foreground-muted">
                        {template.nodeCount} node{template.nodeCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-display text-base font-bold text-foreground leading-snug">
                      {template.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    {/* Owner */}
                    <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                      {template.isBuiltIn ? (
                        <BadgeCheck size={12} className="text-brand-400 shrink-0" />
                      ) : (
                        <User size={12} className="shrink-0" />
                      )}
                      <span className={template.isBuiltIn ? 'text-brand-400 font-semibold' : ''}>
                        {template.owner}
                      </span>
                      {template.installCount > 0 && (
                        <>
                          <span className="text-surface-border">·</span>
                          <Download size={10} />
                          <span>{template.installCount} install{template.installCount !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>

                    {/* Avg star rating display */}
                    <StarDisplay avg={template.avgRating} count={template.ratingCount} />

                    {/* Credential badge */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {credCount === 0 ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <ShieldCheck size={11} /> No credentials required
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-foreground-muted">
                          <ShieldCheck size={11} /> {credCount} credential{credCount !== 1 ? 's' : ''} needed
                        </span>
                      )}
                    </div>

                    {/* Expand toggle */}
                    {stepCount > 0 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : template.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition"
                      >
                        <BookOpen size={11} />
                        {isExpanded ? 'Hide' : 'Show'} setup guide ({stepCount} step{stepCount !== 1 ? 's' : ''})
                        <ChevronRight size={11} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    )}

                    {/* Setup guide */}
                    {isExpanded && template.setupGuide && (
                      <div className="rounded-lg border border-surface-border bg-surface-input p-3 space-y-1.5">
                        {template.setupGuide.map((step, i) => (
                          <p key={i} className="text-[11px] text-foreground-muted leading-relaxed">
                            <span className="font-bold text-brand-400 mr-1">{i + 1}.</span>
                            {step}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Credential checklist */}
                    {isExpanded && credCount > 0 && (
                      <div className="rounded-lg border border-surface-border bg-surface-input p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground mb-1">Credentials needed</p>
                        {template.requiredCredentials!.map((c) => (
                          <p key={c.serviceId} className="text-[11px] text-foreground-muted">
                            <span className={`font-semibold ${c.required ? 'text-red-400' : 'text-yellow-400'}`}>
                              {c.required ? 'Required' : 'Optional'}
                            </span>{' '}· {c.label} — {c.reason}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Footer: rate + install ── */}
                  <div className="px-5 pb-5 pt-2 space-y-3 border-t border-surface-border mt-2">
                    {/* Star picker */}
                    <StarPicker
                      templateId={template.id}
                      userRating={template.userRating}
                      onRate={handleRate}
                    />

                    {/* Install button */}
                    <button
                      onClick={() => handleInstall(template)}
                      disabled={isInstalling}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2.5 text-sm font-bold text-white transition"
                    >
                      {isInstalling ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Installing…
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          Install Template
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="mt-10 text-center text-xs text-foreground-muted flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-brand-400" />
            Templates create a new workflow you can edit immediately in the canvas editor.
          </p>
        )}
      </main>
    </div>
  );
}

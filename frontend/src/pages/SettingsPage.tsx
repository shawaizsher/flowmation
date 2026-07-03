import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  User, Lock, Bell, Palette, Eye, EyeOff, Save, Shield,
  Mail, Sun, Moon, Monitor, CheckCircle2, AlertCircle,
  AlertTriangle, Loader2, Info, Trash2, Camera, Upload,
  X, Smile,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { useTheme, useAccentTheme, type Theme } from '../hooks/useTheme';
import { authApi } from '../utils/api';
import {
  AVATAR_EMOJIS as PROFILE_AVATAR_EMOJIS,
  AVATAR_GRADIENTS as PROFILE_AVATAR_GRADIENTS,
  UserAvatar,
} from '../components/UserAvatar';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',       icon: Lock },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'appearance',    label: 'Appearance',     icon: Palette },
];

// ── Password strength ──────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; label: string; color: string; bg: string } {
  if (!pw) return { score: 0, label: '', color: '', bg: '' };
  let score = 0;
  if (pw.length >= 8)               score++;
  if (pw.length >= 12)              score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))     score++;
  const levels = [
    { label: 'Very weak',   color: 'text-red-400',    bg: 'bg-red-500' },
    { label: 'Weak',        color: 'text-orange-400', bg: 'bg-orange-500' },
    { label: 'Fair',        color: 'text-yellow-400', bg: 'bg-yellow-400' },
    { label: 'Strong',      color: 'text-green-400',  bg: 'bg-green-500' },
    { label: 'Very strong', color: 'text-emerald-400',bg: 'bg-emerald-500' },
  ];
  return { score, ...levels[Math.min(score, 4)] };
}

// ── Field error helper ─────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-red-400">
      <AlertCircle size={12} /> {msg}
    </p>
  );
}

// ── Inline saved indicator ─────────────────────────────────────────────────

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-400 animate-fade-in">
      <CheckCircle2 size={12} /> Saved
    </span>
  );
}

// ── Info box ───────────────────────────────────────────────────────────────

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3.5 py-3 text-xs text-blue-300">
      <Info size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-bold uppercase tracking-widest text-foreground-muted/60">{label}</span>
      <div className="flex-1 h-px bg-surface-border" />
    </div>
  );
}

// ── Toggle item ────────────────────────────────────────────────────────────

function ToggleItem({
  label, description, checked, onChange, disabled,
}: {
  label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-1 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
          checked ? 'bg-brand-500' : 'bg-surface-border'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  AVATAR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

type AvatarType = 'gradient' | 'emoji' | 'image';

interface AvatarData {
  type: AvatarType;
  gradient?: { from: string; to: string };
  emoji?: string;
  imageUrl?: string;
}

const AVATAR_GRADIENTS = [
  { id: 'ocean',    label: 'Ocean',   from: '#3b82f6', to: '#06b6d4' },
  { id: 'sunset',   label: 'Sunset',  from: '#f97316', to: '#ef4444' },
  { id: 'forest',   label: 'Forest',  from: '#22c55e', to: '#16a34a' },
  { id: 'violet',   label: 'Violet',  from: '#8b5cf6', to: '#6366f1' },
  { id: 'rose',     label: 'Rose',    from: '#ec4899', to: '#f43f5e' },
  { id: 'gold',     label: 'Gold',    from: '#f59e0b', to: '#f97316' },
  { id: 'teal',     label: 'Teal',    from: '#14b8a6', to: '#0ea5e9' },
  { id: 'slate',    label: 'Slate',   from: '#64748b', to: '#334155' },
  { id: 'candy',    label: 'Candy',   from: '#f472b6', to: '#c084fc' },
  { id: 'mint',     label: 'Mint',    from: '#34d399', to: '#3b82f6' },
  { id: 'crimson',  label: 'Crimson', from: '#ef4444', to: '#7c3aed' },
  { id: 'dawn',     label: 'Dawn',    from: '#fbbf24', to: '#f472b6' },
];

const AVATAR_EMOJIS = [
  '😀','😎','🤓','🧑‍💻','👨‍💻','👩‍💻','🧑‍🎨','🧑‍🚀','🦸','🥷',
  '🦊','🐺','🦁','🐉','🦋','🦅','🐬','🦄','🐙','🦋',
  '⚡','🔥','✨','🚀','💎','🎯','🌊','🌙','⭐','🎭',
  '🏆','💡','🎮','🌈','🎪','🧩',
];

const AVATAR_STORAGE_KEY = 'fluxion-user-avatar';

function loadAvatar(): AvatarData | null {
  try {
    const stored = localStorage.getItem(AVATAR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveAvatar(data: AvatarData) {
  try { localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── AvatarDisplay — renders any avatar type ────────────────────────────────

function AvatarDisplay({ avatar, name, size = 64 }: { avatar: AvatarData | null; name: string; size?: number }) {
  const fontSize = size * 0.38;

  if (avatar?.type === 'image' && avatar.imageUrl) {
    return (
      <img
        src={avatar.imageUrl}
        alt="Profile"
        className="rounded-full object-cover shadow-lg shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (avatar?.type === 'emoji' && avatar.emoji) {
    return (
      <div
        className="rounded-full flex items-center justify-center shadow-lg shrink-0 bg-surface-border"
        style={{ width: size, height: size, fontSize: fontSize * 1.3 }}
      >
        {avatar.emoji}
      </div>
    );
  }

  // Gradient (default or chosen)
  const bg = avatar?.type === 'gradient' && avatar.gradient
    ? `linear-gradient(135deg, ${avatar.gradient.from}, ${avatar.gradient.to})`
    : (() => {
        const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
        return `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue + 40) % 360},70%,45%))`;
      })();

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold uppercase select-none shadow-lg shrink-0"
      style={{ width: size, height: size, fontSize, background: bg }}
    >
      {name.trim().charAt(0) || 'U'}
    </div>
  );
}

// ── AvatarPickerModal ──────────────────────────────────────────────────────

function AvatarPickerModal({
  name,
  current,
  onSave,
  onClose,
}: {
  name: string;
  current: AvatarData | null;
  onSave: (data: AvatarData) => void;
  onClose: () => void;
}) {
  type PickerTab = 'gradient' | 'emoji' | 'photo';
  const [tab, setTab]           = useState<PickerTab>('gradient');
  const [draft, setDraft]       = useState<AvatarData>(current ?? { type: 'gradient' });
  const [imgError, setImgError] = useState('');
  const fileRef                 = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setImgError('Image must be under 2 MB'); return; }
    if (!file.type.startsWith('image/')) { setImgError('Please select an image file'); return; }
    setImgError('');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 320;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImgError('Could not process image');
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimized = canvas.toDataURL('image/jpeg', 0.82);
        setDraft({ type: 'image', imageUrl: optimized });
      };
      image.onerror = () => setImgError('Could not read image');
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 animate-scale-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h3 className="font-display text-base font-bold text-foreground">Choose Avatar</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-border hover:text-foreground transition">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-border bg-surface-input/40">
          <UserAvatar avatar={draft} name={name} size={56} showRing glow animatedBorder presence="online" />
          <div>
            <p className="text-sm font-semibold text-foreground">{name || 'Your name'}</p>
            <p className="text-xs text-foreground-muted mt-0.5">Preview</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border">
          {([
            { id: 'gradient', label: 'Colors',  icon: Palette },
            { id: 'emoji',    label: 'Emoji',   icon: Smile },
            { id: 'photo',    label: 'Photo',   icon: Camera },
          ] as { id: PickerTab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
                tab === t.id
                  ? 'text-brand-400 border-b-2 border-brand-500'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 min-h-[200px]">

          {/* ── Colors ── */}
          {tab === 'gradient' && (
            <div className="grid grid-cols-6 gap-3">
              {PROFILE_AVATAR_GRADIENTS.map(g => {
                const active = draft.type === 'gradient' && draft.gradient?.from === g.from;
                return (
                  <button
                    key={g.id}
                    title={g.label}
                    onClick={() => setDraft({ type: 'gradient', gradient: { from: g.from, to: g.to } })}
                    className={`relative w-full aspect-square rounded-full transition-all duration-150 hover:scale-110 ${
                      active ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-card scale-110' : ''
                    }`}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  >
                    {active && (
                      <CheckCircle2 size={12} className="absolute -top-0.5 -right-0.5 text-white bg-brand-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Emoji ── */}
          {tab === 'emoji' && (
            <div className="grid grid-cols-9 gap-2">
              {PROFILE_AVATAR_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setDraft({ type: 'emoji', emoji: em })}
                  className={`text-xl rounded-lg p-1.5 transition-all hover:bg-surface-hover hover:scale-110 ${
                    draft.type === 'emoji' && draft.emoji === em
                      ? 'bg-brand-500/20 ring-1 ring-brand-500 scale-110'
                      : ''
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* ── Photo ── */}
          {tab === 'photo' && (
            <div className="space-y-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-surface-border bg-surface-input py-8 text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5 transition"
              >
                <Upload size={28} />
                <div className="text-center">
                  <p className="text-sm font-semibold">Click to upload photo</p>
                  <p className="text-xs mt-0.5">PNG, JPG, GIF — max 2 MB</p>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              {imgError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={12} />{imgError}</p>}
              {draft.type === 'image' && draft.imageUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <img src={draft.imageUrl} alt="Preview" className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-400">Image ready</p>
                    <p className="text-xs text-foreground-muted mt-0.5">Click Save to apply</p>
                  </div>
                  <button
                    onClick={() => setDraft({ type: 'gradient' })}
                    className="text-foreground-muted hover:text-red-400 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border">
          <button
            onClick={() => { onSave({ type: 'gradient' }); onClose(); }}
            className="text-xs text-foreground-muted hover:text-foreground transition"
          >
            Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm text-foreground-muted hover:text-foreground transition px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={() => { onSave(draft); onClose(); }}
              className="btn-primary !py-1.5 !px-4 !text-sm flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Save Avatar
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════
//  SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user, setUser } = useStore();
  const [activeTab, setActiveTab]   = useState<Tab>('profile');

  // ── Avatar ──────────────────────────────────────────────────────────────
  const [avatar, setAvatar]               = useState<AvatarData | null>(user?.avatar || loadAvatar());
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleAvatarSave = (data: AvatarData) => {
    saveAvatar(data);
    setAvatar(data);
    setProfileSaved(false);
  };

  // ── Profile ─────────────────────────────────────────────────────────────
  const [name, setName]             = useState(user?.name || '');
  const [email]                     = useState(user?.email || '');
  const [headline, setHeadline]     = useState(user?.headline || '');
  const [nameError, setNameError]   = useState('');
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setHeadline(user?.headline || '');
    setAvatar(user?.avatar || loadAvatar());
  }, [user?.name, user?.headline, user?.avatar]);

  useEffect(() => {
    setProfileDirty(
      name !== (user?.name || '') ||
      headline !== (user?.headline || '') ||
      JSON.stringify(avatar || null) !== JSON.stringify(user?.avatar || null)
    );
    setProfileSaved(false);
  }, [name, headline, avatar, user?.name, user?.headline, user?.avatar]);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Name cannot be empty'); return; }
    if (name.trim().length < 2) { setNameError('Name must be at least 2 characters'); return; }
    setNameError('');
    setProfileSaving(true);
    try {
      const { data } = await authApi.updateProfile({
        name: name.trim(),
        headline: headline.trim(),
        avatar,
      });
      if (data?.user && user) {
        setUser({ ...user, ...data.user });
      }
      if (avatar) saveAvatar(avatar);
      setProfileSaved(true);
      setProfileDirty(false);
      toast.success('Profile updated across your workspace');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Security ─────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwErrors, setPwErrors]           = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving]           = useState(false);
  const [pwSaved, setPwSaved]             = useState(false);
  const strength                          = getPasswordStrength(newPw);

  const validatePwForm = () => {
    const errs = { current: '', newPw: '', confirm: '' };
    if (!currentPw) errs.current = 'Current password is required';
    if (!newPw) errs.newPw = 'New password is required';
    else if (newPw.length < 8) errs.newPw = 'Password must be at least 8 characters';
    else if (strength.score < 2) errs.newPw = 'Password is too weak — add uppercase, numbers or symbols';
    if (!confirmPw) errs.confirm = 'Please confirm your new password';
    else if (newPw !== confirmPw) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validatePwForm();
    setPwErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setPwSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setPwSaving(false);
    setPwSaved(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwSaved(false), 3000);
    toast.success('Password changed successfully');
  };

  // Clear individual errors on input
  const handlePwInput = (field: keyof typeof pwErrors, val: string) => {
    setPwErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'current') setCurrentPw(val);
    if (field === 'newPw')   { setNewPw(val); setPwSaved(false); }
    if (field === 'confirm') setConfirmPw(val);
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const [emailNotif, setEmailNotif]       = useState(true);
  const [failureAlerts, setFailureAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest]   = useState(false);
  const [notifSaved, setNotifSaved]       = useState(false);
  const [notifSaving, setNotifSaving]     = useState(false);

  const handleNotifSave = async () => {
    setNotifSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setNotifSaving(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
    toast.success('Notification preferences saved');
  };

  // ── Appearance ────────────────────────────────────────────────────────────
  const { theme, setTheme }                               = useTheme();
  const { accentTheme, setAccentTheme, accentPalettes }   = useAccentTheme();
  const [appearanceSaved, setAppearanceSaved]             = useState(false);

  const handleAppearanceChange = (fn: () => void) => {
    fn();
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 2000);
  };

  return (
    <div className="min-h-screen">

      {/* ── Header ── */}
      <header className="border-b border-surface-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-foreground-muted mt-0.5">Manage your account, security, and preferences</p>
          </div>
          {/* Unsaved changes badge */}
          {profileDirty && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400 animate-fade-in">
              <AlertTriangle size={13} /> Unsaved changes
            </div>
          )}
        </div>
      </header>

      <div className="flex max-w-5xl mx-auto px-8 py-8 gap-8">

        {/* ── Sidebar nav ── */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-brand-500/15 text-brand-400 shadow-sm'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <tab.icon size={16} className="shrink-0" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.id === 'profile' && profileDirty && (
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" title="Unsaved changes" />
              )}
            </button>
          ))}

          {/* Quick tips */}
          <div className="mt-6 rounded-xl border border-surface-border bg-surface-input p-4">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Tip</p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {activeTab === 'security' && 'Use 12+ characters with a mix of letters, numbers and symbols for a strong password.'}
              {activeTab === 'profile' && 'Your avatar, name, and headline update across settings, sidebar, dashboard, and collaboration surfaces.'}
              {activeTab === 'notifications' && 'Failure alerts are recommended — they notify you when a workflow stops working.'}
              {activeTab === 'appearance' && 'Theme and accent color are saved automatically as you select them.'}
            </p>
          </div>
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ══ PROFILE TAB ══════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div className="card p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Profile</h2>
                  <p className="text-sm text-foreground-muted mt-0.5">Your personal information visible to collaborators</p>
                </div>
                <SavedBadge show={profileSaved} />
              </div>

              <form onSubmit={handleProfileSave} className="space-y-6 max-w-xl">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  {/* Clickable avatar with camera overlay */}
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    aria-label="Change avatar"
                  >
                    <UserAvatar avatar={avatar} name={name || 'U'} size={64} showRing glow animatedBorder presence="online" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Camera size={18} className="text-white" />
                    </div>
                  </button>

                  <div>
                    <p className="text-sm font-semibold text-foreground">{name || 'Your name'}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">{user?.role || 'Member'}</p>
                    {headline && <p className="mt-1 text-xs text-brand-300">{headline}</p>}
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
                      className="mt-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition"
                    >
                      Change avatar
                    </button>
                  </div>
                </div>

                <SectionDivider label="Account details" />

                {/* Full name */}
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(''); }}
                    className={`input-field ${nameError ? 'border-red-500/50 focus:border-red-500/80' : ''}`}
                    placeholder="Your full name"
                    autoComplete="name"
                    maxLength={80}
                  />
                  <FieldError msg={nameError} />
                  <p className="text-xs text-foreground-muted/60 mt-1">{name.length}/80 characters</p>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    <span className="flex items-center gap-1.5"><Mail size={13} /> Email address</span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    disabled
                    className="input-field opacity-50 cursor-not-allowed"
                    autoComplete="email"
                  />
                  <InfoBox>Email address is tied to your account and cannot be changed.</InfoBox>
                </div>

                <div>
                  <label htmlFor="profile-headline" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    Headline
                  </label>
                  <input
                    id="profile-headline"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                    className="input-field"
                    placeholder="Automation architect · Team lead · Building smooth workflows"
                    maxLength={120}
                  />
                  <p className="text-xs text-foreground-muted/60 mt-1">{headline.length}/120 characters</p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={!profileDirty || profileSaving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {profileSaving
                      ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                      : <><Save size={14} /> Save Changes</>
                    }
                  </button>
                  {profileDirty && !profileSaving && (
                    <button
                      type="button"
                      onClick={() => {
                        setName(user?.name || '');
                        setHeadline(user?.headline || '');
                        setAvatar(user?.avatar || loadAvatar());
                        setNameError('');
                      }}
                      className="text-sm text-foreground-muted hover:text-foreground transition"
                    >
                      Discard
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ══ SECURITY TAB ══════════════════════════════════════════════ */}
          {activeTab === 'security' && (
            <>
              <div className="card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                      <Shield size={18} className="text-brand-400" /> Change Password
                    </h2>
                    <p className="text-sm text-foreground-muted mt-0.5">Use a strong, unique password for your account</p>
                  </div>
                  <SavedBadge show={pwSaved} />
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                  {/* Current password */}
                  <div>
                    <label htmlFor="current-pw" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="current-pw"
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPw}
                        onChange={(e) => handlePwInput('current', e.target.value)}
                        className={`input-field pr-10 ${pwErrors.current ? 'border-red-500/50' : ''}`}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />
                      <button type="button" tabIndex={-1} aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition"
                        onClick={() => setShowCurrentPw(v => !v)}>
                        {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <FieldError msg={pwErrors.current} />
                  </div>

                  <SectionDivider label="New password" />

                  {/* New password */}
                  <div>
                    <label htmlFor="new-pw" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new-pw"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => handlePwInput('newPw', e.target.value)}
                        className={`input-field pr-10 ${pwErrors.newPw ? 'border-red-500/50' : ''}`}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" tabIndex={-1} aria-label={showNewPw ? 'Hide' : 'Show'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition"
                        onClick={() => setShowNewPw(v => !v)}>
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Password strength meter */}
                    {newPw && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i < strength.score ? strength.bg : 'bg-surface-border'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
                      </div>
                    )}
                    <FieldError msg={pwErrors.newPw} />
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="confirm-pw" className="block text-sm font-medium text-foreground-secondary mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-pw"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={(e) => handlePwInput('confirm', e.target.value)}
                        className={`input-field pr-10 ${pwErrors.confirm ? 'border-red-500/50' : confirmPw && confirmPw === newPw ? 'border-green-500/40' : ''}`}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                      <button type="button" tabIndex={-1} aria-label={showConfirmPw ? 'Hide' : 'Show'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition"
                        onClick={() => setShowConfirmPw(v => !v)}>
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      {/* Inline match indicator */}
                      {confirmPw && confirmPw === newPw && (
                        <CheckCircle2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-green-400 pointer-events-none" />
                      )}
                    </div>
                    <FieldError msg={pwErrors.confirm} />
                  </div>

                  <button type="submit" disabled={pwSaving}
                    className="btn-primary flex items-center gap-2 disabled:opacity-60">
                    {pwSaving
                      ? <><Loader2 size={14} className="animate-spin" /> Changing…</>
                      : <><Lock size={14} /> Change Password</>
                    }
                  </button>
                </form>
              </div>

              {/* Danger zone */}
              <div className="card p-6 border-red-500/20 animate-fade-in">
                <h2 className="font-display text-base font-bold text-red-400 flex items-center gap-2 mb-1">
                  <AlertTriangle size={16} /> Danger Zone
                </h2>
                <p className="text-sm text-foreground-muted mb-4">Irreversible and destructive actions</p>
                <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Delete Account</p>
                    <p className="text-xs text-foreground-muted mt-0.5">Permanently delete your account and all associated data</p>
                  </div>
                  <button
                    onClick={() => toast.error('Please contact support to delete your account')}
                    className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition shrink-0"
                  >
                    <Trash2 size={13} /> Delete Account
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ══ NOTIFICATIONS TAB ═════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div className="card p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Notifications</h2>
                  <p className="text-sm text-foreground-muted mt-0.5">Control how and when Fluxion contacts you</p>
                </div>
                <SavedBadge show={notifSaved} />
              </div>

              <div className="space-y-1 max-w-md divide-y divide-surface-border/60">
                <div className="pb-4">
                  <SectionDivider label="Email" />
                  <div className="mt-4 space-y-5">
                    <ToggleItem
                      label="Email notifications"
                      description="Receive emails for important account updates and alerts"
                      checked={emailNotif}
                      onChange={setEmailNotif}
                    />
                    <ToggleItem
                      label="Weekly digest"
                      description="A summary of your workspace activity sent every Monday"
                      checked={weeklyDigest}
                      onChange={setWeeklyDigest}
                      disabled={!emailNotif}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <SectionDivider label="Workflow" />
                  <div className="mt-4 space-y-5">
                    <ToggleItem
                      label="Failure alerts"
                      description="Get notified immediately when a workflow execution fails"
                      checked={failureAlerts}
                      onChange={setFailureAlerts}
                    />
                  </div>

                  {!failureAlerts && (
                    <div className="mt-3 flex gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3.5 py-3 text-xs text-yellow-300">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <span>Failure alerts are disabled — you may miss critical workflow errors.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-surface-border">
                <button onClick={handleNotifSave} disabled={notifSaving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60">
                  {notifSaving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><Save size={14} /> Save Preferences</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ══ APPEARANCE TAB ════════════════════════════════════════════ */}
          {activeTab === 'appearance' && (
            <div className="card p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Appearance</h2>
                  <p className="text-sm text-foreground-muted mt-0.5">Customize how Fluxion looks for you</p>
                </div>
                <SavedBadge show={appearanceSaved} />
              </div>

              <div className="space-y-8 max-w-md">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-secondary mb-3">
                    Interface Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: 'dark',   icon: Moon,    label: 'Dark',   desc: 'Easy on the eyes' },
                      { key: 'light',  icon: Sun,     label: 'Light',  desc: 'Clean & bright' },
                      { key: 'system', icon: Monitor, label: 'System', desc: 'Follows OS setting' },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => handleAppearanceChange(() => setTheme(t.key as Theme))}
                        className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center transition-all duration-150 ${
                          theme === t.key
                            ? 'border-brand-500 bg-brand-500/10 shadow-sm shadow-brand-500/10'
                            : 'border-surface-border bg-surface-input hover:border-brand-500/30 hover:bg-surface-hover'
                        }`}
                      >
                        <t.icon size={20} className={theme === t.key ? 'text-brand-400' : 'text-foreground-muted'} />
                        <div>
                          <p className={`text-sm font-semibold ${theme === t.key ? 'text-brand-400' : 'text-foreground'}`}>
                            {t.label}
                          </p>
                          <p className="text-[10px] text-foreground-muted mt-0.5">{t.desc}</p>
                        </div>
                        {theme === t.key && (
                          <CheckCircle2 size={13} className="text-brand-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-secondary mb-1.5">
                    Accent Color
                  </label>
                  <p className="text-xs text-foreground-muted mb-3">Applied to buttons, active states, and highlights</p>
                  <div className="flex flex-wrap gap-3">
                    {(Object.entries(accentPalettes) as Array<[keyof typeof accentPalettes, (typeof accentPalettes)[keyof typeof accentPalettes]]>).map(([key, palette]) => (
                      <button
                        key={key}
                        title={palette.label}
                        onClick={() => handleAppearanceChange(() => setAccentTheme(key))}
                        className={`flex flex-col items-center gap-1.5 group transition-all duration-150`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full transition-all duration-150 ${
                            accentTheme === key
                              ? 'ring-2 ring-offset-2 ring-offset-surface-card scale-110'
                              : 'opacity-60 hover:opacity-90 hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: palette.preview,
                            ...(accentTheme === key ? { boxShadow: `0 0 0 2px ${palette.preview}` } : {}),
                          }}
                        />
                        <span className={`text-[10px] font-medium transition-colors ${
                          accentTheme === key ? 'text-foreground' : 'text-foreground-muted'
                        }`}>
                          {palette.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <AvatarPickerModal
          name={name || 'U'}
          current={avatar}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}


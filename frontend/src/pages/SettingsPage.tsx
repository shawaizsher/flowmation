import { useState, FormEvent } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Eye,
  EyeOff,
  Save,
  Shield,
  Mail,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { useTheme, type Theme } from '../hooks/useTheme';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  // Security form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Notification prefs
  const [emailNotif, setEmailNotif] = useState(true);
  const [failureAlerts, setFailureAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Appearance — real theme hook
  const { theme, setTheme } = useTheme();

  const handleProfileSave = (e: FormEvent) => {
    e.preventDefault();
    // In a real app this would call the API
    toast.success('Profile updated');
  };

  const handlePasswordChange = (e: FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) return toast.error('Fill in all fields');
    if (newPw.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPw !== confirmPw) return toast.error('Passwords do not match');
    // In a real app this would call the API
    toast.success('Password changed');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  const handleNotifSave = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-border px-8 py-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-foreground-muted mt-1">Manage your account and preferences</p>
      </header>

      <div className="flex max-w-5xl mx-auto px-8 py-8 gap-8">
        {/* Settings sidebar tabs */}
        <nav className="w-52 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="card p-6 animate-fade-in">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Profile</h2>
              <p className="text-sm text-foreground-muted mb-6">Your personal information</p>

              <form onSubmit={handleProfileSave} className="space-y-5 max-w-md">
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg shadow-brand-500/20">
                    {name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{name || 'User'}</p>
                    <p className="text-sm text-foreground-muted">{user?.role || 'Member'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} /> Email
                    </span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="input-field opacity-60 cursor-not-allowed"
                    placeholder="Email"
                  />
                  <p className="text-xs text-foreground-muted mt-1">Email cannot be changed</p>
                </div>

                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Save Changes
                </button>
              </form>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="card p-6 animate-fade-in">
              <h2 className="font-display text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <Shield size={18} className="text-brand-400" /> Security
              </h2>
              <p className="text-sm text-foreground-muted mb-6">Change your password</p>

              <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="input-field pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      tabIndex={-1}
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary"
                      onClick={() => setShowNewPw(!showNewPw)}
                      tabIndex={-1}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Lock size={16} /> Change Password
                </button>
              </form>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="card p-6 animate-fade-in">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Notifications</h2>
              <p className="text-sm text-foreground-muted mb-6">Choose how you want to be notified</p>

              <div className="space-y-5 max-w-md">
                <ToggleItem
                  label="Email notifications"
                  description="Receive email for important updates"
                  checked={emailNotif}
                  onChange={setEmailNotif}
                />
                <ToggleItem
                  label="Failure alerts"
                  description="Get notified when a workflow execution fails"
                  checked={failureAlerts}
                  onChange={setFailureAlerts}
                />
                <ToggleItem
                  label="Weekly digest"
                  description="Summary of your workspace activity every Monday"
                  checked={weeklyDigest}
                  onChange={setWeeklyDigest}
                />

                <button onClick={handleNotifSave} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="card p-6 animate-fade-in">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Appearance</h2>
              <p className="text-sm text-foreground-muted mb-6">Customize the look and feel</p>

              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-3">Theme</label>
                  <div className="flex gap-3">
                    {([{ key: 'dark', icon: Moon, label: 'Dark' }, { key: 'light', icon: Sun, label: 'Light' }, { key: 'system', icon: Monitor, label: 'System' }] as const).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTheme(t.key as Theme)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          theme === t.key
                            ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                            : 'border-surface-border bg-surface-card text-foreground-muted hover:text-foreground hover:border-surface-hover'
                        }`}
                      >
                        <t.icon size={16} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-3">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    {[
                      { name: 'Violet', color: 'bg-violet-500' },
                      { name: 'Cyan', color: 'bg-cyan-500' },
                      { name: 'Rose', color: 'bg-rose-500' },
                      { name: 'Amber', color: 'bg-amber-500' },
                      { name: 'Emerald', color: 'bg-emerald-500' },
                    ].map((c) => (
                      <button
                        key={c.name}
                        title={c.name}
                        className={`w-8 h-8 rounded-full ${c.color} transition-all duration-200 hover:scale-110 ${
                          c.name === 'Violet'
                            ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-card'
                            : 'opacity-50 hover:opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle helper ── */
function ToggleItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-brand-500' : 'bg-surface-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

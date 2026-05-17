import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../utils/api';
import { useStore } from '../store';
import { UserAvatar } from '../components/UserAvatar';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: any;
  headline?: string;
  createdAt?: string;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function AdminUsersPage() {
  const currentUser = useStore((s) => s.user);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      setLoading(true);
      const response = await adminApi.listUsers({
        search: search.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      setUsers(response.data.users || []);
      setTotal(Number(response.data.total || 0));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentUser, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleDelete = async (target: AdminUserItem) => {
    if (!currentUser) return;
    if (target.id === currentUser.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    const confirmation = window.confirm(
      `Delete ${target.email}? This is permanent. Workspaces owned by this user will be reassigned to you.`
    );
    if (!confirmation) return;

    try {
      setDeletingId(target.id);
      const response = await adminApi.deleteUser(target.id);
      const reassigned = Number(response.data.reassignedWorkspaces || 0);
      toast.success(reassigned > 0 ? `User deleted. Reassigned ${reassigned} workspace(s).` : 'User deleted.');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-full bg-surface-base px-8 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-surface-border bg-surface-card p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Admin access only</h1>
              <p className="mt-1 text-sm text-foreground-muted">You do not have permission to view this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface-base px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Admin — Users</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Review all registered users and permanently remove accounts when needed.
          </p>
        </div>

        <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">User directory</h2>
                <p className="text-sm text-foreground-muted">{total} total account(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-9"
                  placeholder="Search by name or email"
                />
              </div>
              <button
                onClick={loadUsers}
                className="inline-flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-input px-4 py-3 text-sm font-semibold text-foreground-muted transition hover:text-foreground"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-foreground-muted">Loading users...</p>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                No users found for this search.
              </div>
            ) : (
              users.map((member) => (
                <div key={member.id} className="rounded-2xl border border-surface-border bg-surface-input p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatar={member.avatar} name={member.name} size={44} glow animatedBorder presence={member.isActive ? 'online' : 'offline'} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-foreground-muted">{member.email}</p>
                        <p className="mt-1 text-[11px] text-foreground-secondary">Joined {formatDate(member.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-foreground-secondary">
                        {member.role}
                      </span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${member.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`rounded-full px-3 py-1 ${member.emailVerified ? 'bg-brand-500/10 text-brand-300' : 'bg-white/5 text-foreground-muted'}`}>
                        {member.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                      <button
                        onClick={() => handleDelete(member)}
                        disabled={deletingId === member.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, CheckCircle2, Clock3, Inbox, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../utils/api';
import { useStore } from '../store';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, any>;
  createdAt: string;
}

interface InvitationItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: string;
  status: string;
  message: string;
  invitedAt: string;
  inviter: { name: string; email: string } | null;
}

export default function NotificationsPage() {
  const setUser = useStore((s) => s.setUser);
  const setWorkspaces = useStore((s) => s.setWorkspaces);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, invitationsRes] = await Promise.all([
        authApi.notifications(),
        authApi.invitations(),
      ]);
      setNotifications(notificationsRes.data.notifications || []);
      setInvitations(invitationsRes.data.invitations || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markAllRead = async () => {
    try {
      await authApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success('Notifications marked as read');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update notifications');
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      setRespondingId(id);
      await authApi.respondInvitation(id, action);
      const meRes = await authApi.me();
      const targetInvite = invitations.find((item) => item.id === id);
      setUser(meRes.data.user);
      setWorkspaces(meRes.data.workspaces || [], action === 'accept' ? targetInvite?.workspaceId : undefined);
      toast.success(action === 'accept' ? 'Invitation accepted' : 'Invitation rejected');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to respond to invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const pendingInvites = invitations.filter((invite) => invite.status === 'pending');
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="min-h-full bg-surface-base px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Notifications</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Invitation updates, workflow collaboration events, and inbox alerts all in one place.
            </p>
          </div>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-300 transition hover:bg-brand-500/15"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                  <Inbox size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Invitation Center</h2>
                  <p className="text-sm text-foreground-muted">
                    Accept or reject workspace invites like GitHub.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-foreground-secondary">
                {pendingInvites.length} pending
              </span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-foreground-muted">Loading invitations...</p>
              ) : pendingInvites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                  No pending invites right now.
                </div>
              ) : pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-surface-border bg-surface-input p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{invite.workspaceName}</h3>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {invite.inviter ? `${invite.inviter.name} invited you as ${invite.role}.` : `Invited as ${invite.role}.`}
                      </p>
                      {invite.message && (
                        <p className="mt-3 rounded-xl border border-brand-500/10 bg-brand-500/5 px-3 py-2 text-xs text-foreground-secondary">
                          {invite.message}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      Pending
                    </span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleRespond(invite.id, 'accept')}
                      disabled={respondingId === invite.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      <CheckCircle2 size={15} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(invite.id, 'reject')}
                      disabled={respondingId === invite.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Activity Feed</h2>
                  <p className="text-sm text-foreground-muted">
                    Workflow events, messages, and collaboration updates.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-foreground-secondary">
                {unreadCount} unread
              </span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-foreground-muted">Loading feed...</p>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                  No notifications yet.
                </div>
              ) : notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    item.isRead
                      ? 'border-surface-border bg-surface-input/50'
                      : 'border-brand-500/20 bg-brand-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-foreground-muted">{item.body}</p>
                    </div>
                    {!item.isRead && (
                      <span className="rounded-full bg-brand-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-foreground-muted">
                    <Clock3 size={12} />
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

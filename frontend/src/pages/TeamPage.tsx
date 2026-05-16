import { useEffect, useState } from 'react';
import { MailPlus, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { collaborationApi, workflowApi } from '../utils/api';
import { useStore } from '../store';
import { UserAvatar } from '../components/UserAvatar';

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: any;
  headline?: string;
  isCurrentUser?: boolean;
}

interface InviteItem {
  id: string;
  email: string;
  role: string;
  status: string;
  message: string;
  invitedAt: string;
}

export default function TeamPage() {
  const workspace = useStore((s) => s.workspace);
  const workspaceId = workspace?.id;

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('editor');
  const [inviteMessage, setInviteMessage] = useState('');

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [membersRes, invitesRes] = await Promise.all([
        workflowApi.listMembers(workspaceId),
        collaborationApi.listInvites(workspaceId),
      ]);
      setMembers(membersRes.data.members || []);
      setInvites(invitesRes.data.invites || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const sendInvite = async () => {
    if (!workspaceId || !inviteEmail.trim()) {
      toast.error('Invite email is required');
      return;
    }
    try {
      setSendingInvite(true);
      await collaborationApi.createInvite(workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        message: inviteMessage.trim(),
      });
      toast.success('Invitation sent');
      setInviteEmail('');
      setInviteMessage('');
      setInviteRole('editor');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const pendingInvites = invites.filter((invite) => invite.status === 'pending');

  return (
    <div className="min-h-full bg-surface-base px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Team Collaboration</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Invite teammates by email, manage workspace roles, and build the shared workflow crew.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,0.95fr]">
          <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                <MailPlus size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Invite by email</h2>
                <p className="text-sm text-foreground-muted">Bring someone into the workspace and let them accept or reject in-app.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Email</label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="teammate@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="input-field"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Message</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="input-field min-h-[112px] resize-none"
                  placeholder="Add context for your teammate..."
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={sendInvite}
                disabled={sendingInvite}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
              >
                <MailPlus size={16} />
                Send invite
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pending invites</h2>
                <p className="text-sm text-foreground-muted">Track who has been invited and whether they joined yet.</p>
              </div>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-foreground-muted">Loading invites...</p>
              ) : pendingInvites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                  No pending invites.
                </div>
              ) : pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-surface-border bg-surface-input p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{invite.email}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {invite.role} • sent {new Date(invite.invitedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      {invite.status}
                    </span>
                  </div>
                  {invite.message && (
                    <p className="mt-3 text-xs text-foreground-secondary">{invite.message}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-surface-border bg-surface-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-300">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workspace members</h2>
              <p className="text-sm text-foreground-muted">Everyone who can collaborate in this workspace today.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-2xl border border-surface-border bg-surface-input p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar avatar={member.avatar} name={member.name} size={44} glow animatedBorder presence="online" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-foreground-muted">{member.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-foreground-secondary">
                    {member.role}
                  </span>
                  {member.isCurrentUser && (
                    <span className="rounded-full bg-brand-500/10 px-3 py-1 font-semibold text-brand-300">You</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

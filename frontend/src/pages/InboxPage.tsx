import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Plus, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { collaborationApi, workflowApi } from '../utils/api';
import { useStore } from '../store';
import { UserAvatar } from '../components/UserAvatar';

interface ThreadItem {
  id: string;
  title: string;
  type: string;
  workflowId?: string | null;
  updatedAt: string;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  body: string;
  messageType: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: any;
  };
}

interface MemberItem {
  id: string;
  name: string;
  email: string;
}

export default function InboxPage() {
  const workspace = useStore((s) => s.workspace);
  const workspaceId = workspace?.id;
  const currentUser = useStore((s) => s.user);

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  const loadThreads = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [threadRes, membersRes] = await Promise.all([
        collaborationApi.inboxThreads(workspaceId),
        workflowApi.listMembers(workspaceId),
      ]);
      setThreads(threadRes.data.threads || []);
      setMembers(membersRes.data.members || []);
      if (!selectedThreadId && threadRes.data.threads?.length) {
        setSelectedThreadId(threadRes.data.threads[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    if (!workspaceId) return;
    try {
      const res = await collaborationApi.inboxMessages(workspaceId, threadId);
      setMessages(res.data.messages || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load messages');
    }
  };

  useEffect(() => {
    loadThreads();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const createThread = async () => {
    if (!workspaceId || !threadTitle.trim()) {
      toast.error('Thread title is required');
      return;
    }
    try {
      const res = await collaborationApi.createInboxThread(workspaceId, {
        title: threadTitle.trim(),
        participantIds: selectedParticipantIds,
      });
      toast.success('Conversation created');
      setShowComposer(false);
      setThreadTitle('');
      setSelectedParticipantIds([]);
      await loadThreads();
      setSelectedThreadId(res.data.thread.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create conversation');
    }
  };

  const sendMessage = async () => {
    if (!workspaceId || !selectedThreadId || !draftMessage.trim()) return;
    try {
      setSending(true);
      await collaborationApi.sendInboxMessage(workspaceId, selectedThreadId, draftMessage.trim());
      setDraftMessage('');
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectableMembers = members.filter((member) => member.id !== currentUser?.id);

  return (
    <div className="min-h-full bg-surface-base px-8 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Inbox</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Chat with teammates about workflows, approvals, and debugging without leaving Flowa.
            </p>
          </div>
          <button
            onClick={() => setShowComposer((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-300 transition hover:bg-brand-500/15"
          >
            <Plus size={16} />
            New conversation
          </button>
        </div>

        {showComposer && (
          <div className="mb-6 rounded-3xl border border-surface-border bg-surface-card p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Conversation title</label>
                <input
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Release review squad"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-secondary">Add teammates</label>
                <div className="max-h-40 overflow-y-auto rounded-2xl border border-surface-border bg-surface-input">
                  {selectableMembers.map((member) => {
                    const selected = selectedParticipantIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() =>
                          setSelectedParticipantIds((prev) =>
                            prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id]
                          )
                        }
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                          selected ? 'bg-brand-500/10 text-foreground' : 'text-foreground-secondary hover:bg-surface-hover'
                        }`}
                      >
                        <span>{member.name}</span>
                        <span className="text-xs text-foreground-muted">{member.email}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowComposer(false)}
                className="rounded-xl px-4 py-2 text-sm text-foreground-muted transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={createThread}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Start conversation
              </button>
            </div>
          </div>
        )}

        <div className="grid min-h-[68vh] gap-6 lg:grid-cols-[320px,1fr]">
          <section className="rounded-3xl border border-surface-border bg-surface-card p-4">
            <div className="mb-4 flex items-center gap-2 px-2">
              <Users size={16} className="text-brand-300" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-secondary">Conversations</h2>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="px-3 py-4 text-sm text-foreground-muted">Loading conversations...</p>
              ) : threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                  No conversations yet.
                </div>
              ) : threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedThreadId === thread.id
                      ? 'border-brand-500/40 bg-brand-500/10'
                      : 'border-surface-border bg-surface-input hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{thread.title}</h3>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {thread.type === 'workflow' ? 'Workflow chat' : 'Team chat'}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface-card p-6">
            {!selectedThread ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-3xl bg-brand-500/10 p-4 text-brand-300">
                  <MessageSquareText size={26} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Pick a conversation</h2>
                <p className="mt-2 max-w-md text-sm text-foreground-muted">
                  Use the inbox for release planning, workflow debugging, and teammate follow-up without switching tools.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="mb-5 border-b border-surface-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground">{selectedThread.title}</h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {selectedThread.type === 'workflow' ? 'Workflow-linked collaboration thread' : 'Direct team collaboration thread'}
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-surface-border bg-surface-input p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <UserAvatar avatar={message.sender.avatar} name={message.sender.name} size={38} glow animatedBorder presence="online" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{message.sender.name}</p>
                          <p className="text-xs text-foreground-muted">{new Date(message.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-foreground-secondary">{message.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-surface-border pt-4">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      placeholder="Send an update to your teammates..."
                      className="input-field min-h-[96px] flex-1 resize-none"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draftMessage.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
                    >
                      <Send size={16} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

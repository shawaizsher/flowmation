import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCheck,
  Clock3,
  MessageCircle,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [threadToDelete, setThreadToDelete] = useState<ThreadItem | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

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

  const filteredThreads = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(normalized) || thread.type.toLowerCase().includes(normalized)
    );
  }, [threads, searchTerm]);

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

  const removeThread = async () => {
    if (!workspaceId || !threadToDelete) return;
    try {
      setDeletingThreadId(threadToDelete.id);
      await collaborationApi.deleteInboxThread(workspaceId, threadToDelete.id);
      toast.success('Conversation removed');

      setThreads((prev) => {
        const next = prev.filter((thread) => thread.id !== threadToDelete.id);
        if (selectedThreadId === threadToDelete.id) {
          setSelectedThreadId(next[0]?.id || null);
        }
        return next;
      });
      if (selectedThreadId === threadToDelete.id) {
        setMessages([]);
      }
      setThreadToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove conversation');
    } finally {
      setDeletingThreadId(null);
    }
  };

  const selectableMembers = members.filter((member) => member.id !== currentUser?.id);

  return (
    <div className="min-h-full bg-surface-base px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl shadow-slate-950/5 dark:shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                <MessageCircle size={19} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Inbox</h1>
                <p className="text-sm text-foreground-muted">Team conversations and workflow updates.</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowComposer((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Plus size={16} />
            New conversation
          </button>
        </div>

        {showComposer && (
          <div className="border-b border-surface-border bg-surface-hover/40 p-5">
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

        <div className="grid min-h-0 flex-1 lg:grid-cols-[360px,1fr]">
          <section className="flex min-h-0 flex-col border-b border-surface-border bg-surface-card lg:border-b-0 lg:border-r">
            <div className="space-y-4 border-b border-surface-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-brand-400" />
                  <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
                </div>
                <span className="rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-foreground-muted">
                  {threads.length}
                </span>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-input px-3 py-2.5 focus-within:border-brand-500/50">
                <Search size={15} className="text-foreground-muted" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chats"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {loading ? (
                <p className="px-3 py-4 text-sm text-foreground-muted">Loading conversations...</p>
              ) : filteredThreads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-foreground-muted">
                  {threads.length === 0 ? 'No conversations yet.' : 'No conversations match your search.'}
                </div>
              ) : filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                    selectedThreadId === thread.id
                      ? 'border-brand-500/40 bg-brand-500/10 shadow-sm'
                      : 'border-transparent bg-transparent hover:border-surface-border hover:bg-surface-hover'
                  }`}
                >
                  <button
                    onClick={() => setSelectedThreadId(thread.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-input text-brand-400">
                      <MessageSquareText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{thread.title}</h3>
                        <span className="shrink-0 text-[11px] text-foreground-muted">
                          {new Date(thread.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                        <span>{thread.type === 'workflow' ? 'Workflow chat' : 'Team chat'}</span>
                        <span className="h-1 w-1 rounded-full bg-foreground-muted/50" />
                        <Clock3 size={12} />
                        <span>{new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {thread.unreadCount > 0 && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setThreadToDelete(thread)}
                      title="Remove chat"
                      className="rounded-lg p-1.5 text-foreground-muted opacity-100 transition hover:bg-red-500/10 hover:text-red-400 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-col bg-surface-base">
            {!selectedThread ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-brand-500/10 p-4 text-brand-400">
                  <MessageSquareText size={26} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Pick a conversation</h2>
                <p className="mt-2 max-w-md text-sm text-foreground-muted">
                  Use the inbox for release planning, workflow debugging, and teammate follow-up without switching tools.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-surface-border bg-surface-card px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">{selectedThread.title}</h2>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      {selectedThread.type === 'workflow' ? 'Workflow-linked collaboration thread' : 'Direct team collaboration thread'}
                    </p>
                  </div>
                  <button
                    onClick={() => setThreadToDelete(selectedThread)}
                    title="Remove chat"
                    className="rounded-xl border border-surface-border p-2.5 text-foreground-muted transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
                      No messages in this conversation yet.
                    </div>
                  ) : messages.map((message) => {
                    const isMine = message.sender.id === currentUser?.id;
                    const isSystem = message.messageType === 'system';

                    if (isSystem) {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <span className="rounded-full border border-surface-border bg-surface-card px-3 py-1 text-xs text-foreground-muted">
                            {message.body}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <UserAvatar avatar={message.sender.avatar} name={message.sender.name} size={34} glow animatedBorder presence="online" />
                        )}
                        <div className={`max-w-[min(620px,78%)] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className={`flex items-center gap-2 px-1 text-xs text-foreground-muted ${isMine ? 'flex-row-reverse' : ''}`}>
                            <span className="font-medium text-foreground-secondary">{isMine ? 'You' : message.sender.name}</span>
                            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                              isMine
                                ? 'rounded-br-md bg-brand-500 text-white'
                                : 'rounded-bl-md border border-surface-border bg-surface-card text-foreground-secondary'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          </div>
                          {isMine && (
                            <div className="flex items-center gap-1 px-1 text-[11px] text-foreground-muted">
                              <CheckCheck size={12} />
                              Sent
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-surface-border bg-surface-card p-4">
                  <div className="flex items-end gap-3 rounded-2xl border border-surface-border bg-surface-input p-2 focus-within:border-brand-500/50">
                    <textarea
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Send an update to your teammates..."
                      className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-foreground-muted"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draftMessage.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Remove this chat?</h2>
                  <p className="mt-1 text-sm leading-6 text-foreground-muted">
                    This removes "{threadToDelete.title}" from your inbox. Other participants can still keep their copy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setThreadToDelete(null)}
                className="rounded-lg p-1.5 text-foreground-muted transition hover:bg-surface-hover hover:text-foreground"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setThreadToDelete(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-foreground-muted transition hover:bg-surface-hover hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={removeThread}
                disabled={deletingThreadId === threadToDelete.id}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                <Trash2 size={15} />
                {deletingThreadId === threadToDelete.id ? 'Removing...' : 'Remove chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

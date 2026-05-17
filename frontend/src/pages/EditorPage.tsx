import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play,
  Save,
  ArrowLeft,
  PanelLeftOpen,
  PanelRightOpen,
  Sparkles,
  History,
  Users,
  Bot,
  ChevronDown,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Bug,
  RotateCcw,
  Tag,
  Key,
  ArrowUpFromLine,
  Link2,
  Unlink,
  Upload,
  ShieldCheck,
  Store,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi, executionApi, nodeApi, aiApi, versionApi, collaborationApi } from '../utils/api';
import { useStore } from '../store';
import FlowNode from '../components/canvas/FlowNode';
import BanterLoader from '../components/BanterLoader';
import NodeIcon from '../components/canvas/NodeIcon';
import IOPanel, { type NodeIOEntry } from '../components/canvas/IOPanel';
import CredentialsManager from '../components/modals/CredentialsManager';
import WorkflowAssistant from '../components/canvas/WorkflowAssistant';
import { UserAvatar } from '../components/UserAvatar';
import { useCredentialStore, getServiceForNodeType, type SavedCredential } from '../store/credentials';
import { nodeCatalog as allNodes, categoryMeta, searchNodes, getGroupedCatalog, type NodeDefinition } from '../data/nodeCatalog';

const nodeTypes = { flowNode: FlowNode };

// ── Node def type alias ──
type NodeDef = NodeDefinition;

function EditorCanvas() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace, user, setNodeStatuses } = useStore();
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowVersion, setWorkflowVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Publishing (version)
  const [publishing, setPublishing] = useState(false);
  const [showPublishPopover, setShowPublishPopover] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');

  // Publish to Marketplace
  const [showMktModal, setShowMktModal]       = useState(false);
  const [mktCategory, setMktCategory]         = useState('General');
  const [mktDescription, setMktDescription]   = useState('');
  const [mktSetupGuide, setMktSetupGuide]     = useState('');
  const [publishingMkt, setPublishingMkt]     = useState(false);
  const [generatingDesc, setGeneratingDesc]   = useState(false);
  const MKT_CATEGORIES = ['General','Sales','Marketing','Data','Finance','Productivity','AI','DevOps','Operations','Governance','Social'];

  // Panels — both open by default for easier understanding
  const [leftPanel, setLeftPanel] = useState<'nodes' | 'none'>('nodes');
  const [rightPanel, setRightPanel] = useState<'config' | 'logs' | 'versions' | 'debug' | 'ai' | 'advanced' | 'templates' | 'collaboration' | 'none'>('config');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Node catalog (local)
  const [nodeSearch, setNodeSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // ML node suggestions
  const [nodeSuggestions, setNodeSuggestions] = useState<{ type: string; score: number; reason: string }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Quick-add popover
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickAddSourceId, setQuickAddSourceId] = useState<string | null>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Close quick-add when clicking outside
  useEffect(() => {
    if (!showQuickAdd) return;
    const handler = (e: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as globalThis.Node)) {
        setShowQuickAdd(false);
        setQuickAddSourceId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showQuickAdd]);

  // Listen for + button clicks on individual nodes
  useEffect(() => {
    const handler = (e: Event) => {
      const { sourceNodeId } = (e as CustomEvent).detail;
      setQuickAddSourceId(sourceNodeId);
      setQuickSearch('');
      setShowQuickAdd(true);
    };
    window.addEventListener('flowa:node-quick-add', handler);
    return () => window.removeEventListener('flowa:node-quick-add', handler);
  }, []);

  // Execution
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [nodeLogs, setNodeLogs] = useState<any[]>([]);

  // Version history
  const [versions, setVersions] = useState<any[]>([]);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState('');

  // AI Debugger
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugging, setDebugging] = useState(false);
  const [advancedReport, setAdvancedReport] = useState<any>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [nodeComments, setNodeComments] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [sharedDebugFeed, setSharedDebugFeed] = useState<any[]>([]);
  const [workflowCollaborators, setWorkflowCollaborators] = useState<any[]>([]);
  const [workflowProgressFeed, setWorkflowProgressFeed] = useState<any[]>([]);
  const [collaborationLoading, setCollaborationLoading] = useState(false);
  const [promptSandboxNodeId, setPromptSandboxNodeId] = useState('');
  const [promptSandboxInput, setPromptSandboxInput] = useState('{\n  "body": {\n    "email": "lead@example.com",\n    "message": "Customer wants a product demo",\n    "priority": "high"\n  }\n}');
  const [promptSandboxResult, setPromptSandboxResult] = useState<any>(null);
  const [promptSandboxHistory, setPromptSandboxHistory] = useState<any[]>([]);
  const [promptSandboxLoading, setPromptSandboxLoading] = useState(false);

  // I/O Panel
  const [ioVisible, setIoVisible] = useState(false);
  const [ioEntries, setIoEntries] = useState<NodeIOEntry[]>([]);

  // Credentials
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [credPreselectedService, setCredPreselectedService] = useState<string | undefined>(undefined);
  const credentialStore = useCredentialStore();

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const suppressGraphSyncRef = useRef(false);
  const graphSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialGraphLoadedRef = useRef(false);
  const lastRemoteChangeTsRef = useRef(0);
  const pendingChangeSummaryRef = useRef<{ summary: string; changedNodeId?: string; changedField?: string } | null>(null);
  const executeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const executionPollInFlightRef = useRef(false);

  const workspaceId = workspace?.id;

  const loadCollaborationPanel = useCallback(async () => {
    if (!workspaceId || !id) return;
    try {
      setCollaborationLoading(true);
      const [membersRes, activityRes] = await Promise.all([
        collaborationApi.workflowMembers(workspaceId, id),
        collaborationApi.workflowActivity(workspaceId, id),
      ]);
      setWorkflowCollaborators(membersRes.data.members || []);
      setWorkflowProgressFeed(activityRes.data.activity || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load collaboration data');
    } finally {
      setCollaborationLoading(false);
    }
  }, [workspaceId, id]);

  const normalizeGraph = useCallback((rawGraph: any) => {
    if (!rawGraph) return { nodes: [], edges: [], comments: [] };

    let parsed = rawGraph;
    if (typeof rawGraph === 'string') {
      try {
        parsed = JSON.parse(rawGraph);
      } catch {
        return { nodes: [], edges: [], comments: [] };
      }
    }

    return {
      nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
      comments: Array.isArray(parsed?.comments) ? parsed.comments : [],
    };
  }, []);

  const toPersistedGraph = useCallback((nextNodes: Node[] = nodes, nextEdges: Edge[] = edges) => {
    const graphNodes = nextNodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      position: n.position,
      data: n.data,
    }));

    return { nodes: graphNodes, edges: nextEdges, comments: nodeComments };
  }, [nodes, edges, nodeComments]);

  // ── Load workflow ──
  useEffect(() => {
    if (!workspaceId || !id) return;
    initialGraphLoadedRef.current = false;

    const loadWorkflow = async () => {
      try {
        const res = await workflowApi.get(workspaceId, id);
        const wf = res.data.workflow;
        setWorkflowName(wf.name);
        setWorkflowVersion(wf.version);

        const graph = normalizeGraph(wf.graph);
        // Map nodes to ReactFlow format with flowNode type
        const flowNodes = (graph.nodes || []).map((n: any) => ({
          ...n,
          type: 'flowNode',
          data: { ...n.data, type: n.data?.type || n.type },
        }));
        suppressGraphSyncRef.current = true;
        setNodes(flowNodes);
        setEdges(graph.edges || []);
        setNodeComments(graph.comments || []);
        setTimeout(() => {
          suppressGraphSyncRef.current = false;
          initialGraphLoadedRef.current = true;
        }, 0);
      } catch (err: any) {
        toast.error('Failed to load workflow');
        navigate('/dashboard');
      }
    };

    loadWorkflow();
  }, [workspaceId, id, navigate, normalizeGraph, setEdges, setNodes]);

  // Toggle category collapse
  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ── WebSocket connection ──
  useEffect(() => {
    const token = useStore.getState().token;
    if (!token || !workspaceId || !id) return;

    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws') + `?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let joinedWorkflow = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', workspaceId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'subscribed' && msg?.workspaceId === workspaceId && !joinedWorkflow) {
          ws.send(JSON.stringify({ type: 'join_workflow', workflowId: id }));
          joinedWorkflow = true;
        }
        handleWsMessage(msg);
      } catch {}
    };

    ws.onclose = () => {
      // Could reconnect here
    };

    return () => {
      if (graphSyncTimerRef.current) {
        clearTimeout(graphSyncTimerRef.current);
        graphSyncTimerRef.current = null;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_workflow', workflowId: id }));
      }
      ws.close();
    };
  }, [workspaceId, id]);

  // Broadcast local draft edits to collaborators.
  useEffect(() => {
    if (!id || !initialGraphLoadedRef.current || suppressGraphSyncRef.current) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (graphSyncTimerRef.current) {
      clearTimeout(graphSyncTimerRef.current);
    }

    graphSyncTimerRef.current = setTimeout(() => {
      if (suppressGraphSyncRef.current) return;
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      socket.send(JSON.stringify({
        type: 'graph_change',
        workflowId: id,
        change: {
          workflowName,
          graph: toPersistedGraph(),
          changedAt: Date.now(),
          summary: pendingChangeSummaryRef.current?.summary,
          changedNodeId: pendingChangeSummaryRef.current?.changedNodeId,
          changedField: pendingChangeSummaryRef.current?.changedField,
        },
      }));
      pendingChangeSummaryRef.current = null;
    }, 250);

    return () => {
      if (graphSyncTimerRef.current) {
        clearTimeout(graphSyncTimerRef.current);
        graphSyncTimerRef.current = null;
      }
    };
  }, [id, nodes, edges, workflowName, toPersistedGraph]);

  const clearExecutionMonitors = useCallback(() => {
    if (executeTimeoutRef.current) {
      clearTimeout(executeTimeoutRef.current);
      executeTimeoutRef.current = null;
    }

    if (executionPollRef.current) {
      clearInterval(executionPollRef.current);
      executionPollRef.current = null;
    }

    executionPollInFlightRef.current = false;
  }, []);

  const parseLogPayload = useCallback((value: unknown) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, []);

  const toEntryStatus = useCallback((status: string): NodeIOEntry['status'] => {
    if (status === 'success' || status === 'failed' || status === 'running' || status === 'pending') {
      return status;
    }
    if (status === 'skipped') return 'success';
    return 'pending';
  }, []);

  const buildCredentialsMap = useCallback(() => {
    const credentialsMap: Record<string, { serviceId: string; name?: string; values: Record<string, string> }> = {};
    for (const n of nodes) {
      const credId = n.data.credentialId as string | undefined;
      if (credId && !credentialsMap[credId]) {
        const cred = credentialStore.getCredentialById(credId);
        if (cred) {
          credentialsMap[credId] = { serviceId: cred.serviceId, name: cred.name, values: cred.values };
        }
      }
    }
    return credentialsMap;
  }, [credentialStore, nodes]);

  const syncExecutionFromApi = useCallback(async (execId: string, notifyOnTerminal = true) => {
    if (!workspaceId || executionPollInFlightRef.current) return false;

    executionPollInFlightRef.current = true;
    try {
      const res = await executionApi.get(workspaceId, execId);
      const execution = res.data?.execution;
      const logs = Array.isArray(res.data?.nodeLogs) ? res.data.nodeLogs : [];

      if (logs.length > 0) {
        setNodeStatuses(() => {
          const next: Record<string, string> = {};
          logs.forEach((log: any) => {
            if (log.node_id && log.status) {
              next[log.node_id] = toEntryStatus(log.status);
            }
          });
          return next;
        });

        setNodeLogs(
          logs.map((log: any) => ({
            nodeId: log.node_id,
            status: toEntryStatus(log.status),
            output: parseLogPayload(log.output),
            error: log.error,
            durationMs: log.duration_ms,
          }))
        );

        setIoEntries((prev) => {
          const entries = new Map(prev.map((entry) => [entry.nodeId, entry]));

          logs.forEach((log: any) => {
            const existing = entries.get(log.node_id);
            entries.set(log.node_id, {
              nodeId: log.node_id,
              nodeLabel: log.node_label || existing?.nodeLabel || log.node_id,
              nodeType: log.node_type || existing?.nodeType || '',
              status: toEntryStatus(log.status),
              input: parseLogPayload(log.input) ?? existing?.input,
              output: parseLogPayload(log.output) ?? existing?.output,
              error: log.error || existing?.error,
              durationMs: log.duration_ms ?? existing?.durationMs,
            });
          });

          return Array.from(entries.values());
        });
      }

      const status = execution?.status;
      const isTerminal = status === 'success' || status === 'failed' || status === 'cancelled';

      if (isTerminal) {
        clearExecutionMonitors();
        setExecuting(false);

        if (notifyOnTerminal) {
          const duration = execution?.duration_ms ?? execution?.durationMs ?? 0;
          if (status === 'success') {
            toast.success(`Execution completed (${duration}ms)`);
          } else if (status === 'cancelled') {
            toast('Execution cancelled', { icon: '⏹️' });
          } else {
            toast.error(`Execution failed: ${execution?.error || 'Unknown error'}`);
          }
        }

        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      executionPollInFlightRef.current = false;
    }
  }, [workspaceId, clearExecutionMonitors, parseLogPayload, setNodeStatuses, toEntryStatus]);

  const startExecutionMonitoring = useCallback((execId: string) => {
    clearExecutionMonitors();

    executionPollRef.current = setInterval(() => {
      syncExecutionFromApi(execId, true);
    }, 2500);

    // Run an immediate status check so super-fast executions appear instantly.
    syncExecutionFromApi(execId, true);

    executeTimeoutRef.current = setTimeout(async () => {
      const finished = await syncExecutionFromApi(execId, true);
      if (finished) return;

      clearExecutionMonitors();
      setExecuting(false);

      const timeoutMessage = 'Execution timed out. Backend/worker may be offline.';
      setIoEntries((prev) =>
        prev.map((entry) =>
          entry.status === 'pending' || entry.status === 'running'
            ? { ...entry, status: 'failed', error: timeoutMessage }
            : entry
        )
      );

      setNodeStatuses((prev: Record<string, string>) => {
        const next = { ...prev };
        nodes.forEach((node) => {
          if (!next[node.id] || next[node.id] === 'pending' || next[node.id] === 'running') {
            next[node.id] = 'failed';
          }
        });
        return next;
      });

      toast.error(`${timeoutMessage} Please ensure backend is running and reachable.`, { duration: 5000 });
    }, 120000);
  }, [clearExecutionMonitors, nodes, setNodeStatuses, syncExecutionFromApi]);

  useEffect(() => {
    return () => {
      clearExecutionMonitors();
    };
  }, [clearExecutionMonitors]);

  const handleWsMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'presence_init':
        setCollaborators(msg.collaborators || []);
        break;
      case 'user_joined':
        setCollaborators((prev) => [...prev.filter((c) => c.userId !== msg.userId), {
          userId: msg.userId, userName: msg.userName, color: msg.color, avatar: msg.avatar, headline: msg.headline
        }]);
        toast(`${msg.userName} joined`, { icon: '👋', duration: 2000 });
        break;
      case 'user_left':
        setCollaborators((prev) => prev.filter((c) => c.userId !== msg.userId));
        break;
      case 'node_comment':
        if (msg.comment) {
          setNodeComments((prev) => {
            if (prev.some((item) => item.id === msg.comment.id)) return prev;
            return [...prev, msg.comment];
          });
          setActivityFeed((prev) => [{
            id: `comment-${msg.comment.id}`,
            type: 'comment',
            actorName: msg.comment.authorName,
            summary: `commented on ${msg.comment.nodeLabel || msg.comment.nodeId}`,
            nodeId: msg.comment.nodeId,
            createdAt: msg.comment.createdAt,
          }, ...prev].slice(0, 25));
        }
        break;
      case 'shared_debug':
        if (msg.debug) {
          setSharedDebugFeed((prev) => [msg.debug, ...prev].slice(0, 20));
          setActivityFeed((prev) => [{
            id: `debug-${msg.debug.id}`,
            type: 'debug',
            actorName: msg.debug.actorName,
            summary: msg.debug.summary,
            nodeId: msg.debug.nodeId,
            createdAt: msg.debug.createdAt,
          }, ...prev].slice(0, 25));
        }
        break;
      case 'workflow_saved':
        if (msg.savedBy !== user?.name) {
          toast(`${msg.savedBy} saved a draft`, { icon: '💾', duration: 3000 });
        }
        break;
      case 'workflow_published':
        if (msg.publishedBy !== user?.name) {
          toast(`${msg.publishedBy} published v${msg.version} — "${msg.label}"`, { icon: '🚀', duration: 4000 });
        }
        setWorkflowVersion(msg.version);
        break;
      case 'graph_change': {
        const incoming = msg.change || {};
        const changedAt = Number(incoming.changedAt || 0);
        if (changedAt && changedAt <= lastRemoteChangeTsRef.current) break;
        if (changedAt) {
          lastRemoteChangeTsRef.current = changedAt;
        }

        const graph = normalizeGraph(incoming.graph);
        const flowNodes = (graph.nodes || []).map((n: any) => ({
          ...n,
          type: 'flowNode',
          data: { ...n.data, type: n.data?.type || n.type },
        }));

        suppressGraphSyncRef.current = true;
        setNodes(flowNodes);
        setEdges(graph.edges || []);
        setNodeComments(graph.comments || []);

        if (typeof incoming.workflowName === 'string' && incoming.workflowName.trim().length > 0) {
          setWorkflowName(incoming.workflowName);
        }

        if (msg.userName && incoming.summary) {
          setActivityFeed((prev) => [{
            id: `activity-${changedAt || Date.now()}`,
            type: 'change',
            actorName: msg.userName,
            summary: incoming.summary,
            nodeId: incoming.changedNodeId,
            changedField: incoming.changedField,
            createdAt: new Date((changedAt || Date.now())).toISOString(),
          }, ...prev].slice(0, 25));
        }

        setSelectedNode((prev) => {
          if (!prev) return null;
          const updated = flowNodes.find((n: Node) => n.id === prev.id);
          return updated || null;
        });

        setTimeout(() => {
          suppressGraphSyncRef.current = false;
        }, 0);
        break;
      }
      case 'execution_started':
        setExecutionId(msg.executionId);
        setNodeStatuses({});
        // Don't clear ioEntries — they were pre-populated by handleExecute
        setIoVisible(true);
        if (msg.executionId) {
          startExecutionMonitoring(msg.executionId);
        }
        break;
      case 'node_started':
        setNodeStatuses((prev: Record<string, string>) => ({ ...prev, [msg.nodeId]: 'running' }));
        // Add running entry to I/O
        setIoEntries((prev) => [
          ...prev.filter((e) => e.nodeId !== msg.nodeId),
          { nodeId: msg.nodeId, nodeLabel: msg.nodeLabel || msg.nodeId, nodeType: msg.nodeType || '', status: 'running', input: msg.input },
        ]);
        break;
      case 'node_finished':
        setNodeStatuses((prev: Record<string, string>) => ({ ...prev, [msg.nodeId]: msg.status }));
        setNodeLogs((prev) => [...prev, { nodeId: msg.nodeId, status: msg.status, output: msg.output, durationMs: msg.durationMs }]);
        // Update I/O entry
        setIoEntries((prev) =>
          prev.map((e) =>
            e.nodeId === msg.nodeId
              ? { ...e, status: 'success' as const, output: msg.output, durationMs: msg.durationMs }
              : e
          )
        );
        break;
      case 'node_failed':
        setNodeStatuses((prev: Record<string, string>) => ({ ...prev, [msg.nodeId]: 'failed' }));
        setNodeLogs((prev) => [...prev, { nodeId: msg.nodeId, status: 'failed', error: msg.error }]);
        // Update I/O entry
        setIoEntries((prev) =>
          prev.map((e) =>
            e.nodeId === msg.nodeId
              ? { ...e, status: 'failed' as const, error: msg.error }
              : e
          )
        );
        break;
      case 'execution_finished':
        clearExecutionMonitors();
        if (msg.status === 'success') {
          toast.success(`Execution completed (${msg.durationMs}ms)`);
        } else {
          toast.error(`Execution failed: ${msg.error || 'Unknown error'}`);
        }
        setExecuting(false);
        break;
      case 'error':
        if (msg.code === 'workflow_access_denied') {
          toast.error('You no longer have access to this workflow');
          navigate('/dashboard');
        }
        break;
    }
  }, [user?.name, setNodeStatuses, normalizeGraph, navigate, setNodes, setEdges, clearExecutionMonitors, startExecutionMonitoring]);

  // ── Handlers ──
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    pendingChangeSummaryRef.current = {
      summary: `connected ${sourceNode?.data?.label || connection.source} to ${targetNode?.data?.label || connection.target}`,
      changedNodeId: connection.target,
      changedField: 'connection',
    };

    const edgeId = `e-${connection.source}-${connection.sourceHandle || 'out'}-${connection.target}-${connection.targetHandle || 'in'}-${Date.now()}`;

    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: edgeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#334155', strokeWidth: 1.6 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#334155',
          },
        },
        eds
      )
    );
  }, [nodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setRightPanel('config');

    // Broadcast node selection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'node_select', workflowId: id, nodeId: node.id }));
    }
  }, [id]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    if (deleted.length > 0) {
      pendingChangeSummaryRef.current = {
        summary: `deleted ${deleted.map((node) => node.data?.label || node.id).join(', ')}`,
        changedNodeId: deleted[0].id,
        changedField: 'delete',
      };
    }
    setSelectedNode((prev) => prev && deleted.some((n) => n.id === prev.id) ? null : prev);
  }, []);

  const handleSave = async () => {
    if (!workspaceId || !id) return;
    try {
      setSaving(true);
      const graph = toPersistedGraph();

      await workflowApi.update(workspaceId, id, { name: workflowName, graph });
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workspaceId || !id) return;
    try {
      setPublishing(true);
      // Save the current draft first
      const graph = toPersistedGraph();
      await workflowApi.update(workspaceId, id, { name: workflowName, graph });

      // Then publish as a new version
      const res = await workflowApi.publish(workspaceId, id, {
        label: publishLabel.trim() || undefined,
      });
      setWorkflowVersion(res.data.version);
      toast.success(`Published as v${res.data.version}`);
      setPublishLabel('');
      setShowPublishPopover(false);
      // Refresh version list if the panel is open
      if (rightPanel === 'versions') loadVersions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!workspaceId) return;
    try {
      setGeneratingDesc(true);
      const res = await aiApi.generateDescription(workspaceId, {
        name: workflowName,
        nodes,
        edges,
      });
      if (res.data.description) setMktDescription(res.data.description);
      if (res.data.setupGuide?.length) setMktSetupGuide(res.data.setupGuide.join('\n'));
      toast.success('Description generated!');
    } catch {
      toast.error('AI generation failed — check your ANTHROPIC_API_KEY');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handlePublishToMarketplace = async () => {
    if (!workspaceId || !id) return;
    try {
      setPublishingMkt(true);
      const setupGuide = mktSetupGuide.split('\n').map(s => s.trim()).filter(Boolean);
      await workflowApi.publishTemplate(workspaceId, {
        workflowId: id,
        category: mktCategory,
        description: mktDescription.trim() || undefined,
        setupGuide,
        requiredCredentials: [],
      });
      toast.success('Workflow published to Marketplace!');
      setShowMktModal(false);
      setMktDescription('');
      setMktSetupGuide('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish to marketplace');
    } finally {
      setPublishingMkt(false);
    }
  };

  const handleExecute = async () => {
    if (!workspaceId || !id) return;

    // If already executing, allow cancelling
    if (executing) {
      setExecuting(false);
      clearExecutionMonitors();
      toast('Execution cancelled', { icon: '⏹️' });
      return;
    }

    try {
      setExecuting(true);
      setNodeLogs([]);
      setNodeStatuses({});
      setRightPanel('logs');

      // Populate I/O entries from current nodes (as pending)
      const initialEntries: NodeIOEntry[] = nodes.map((n) => ({
        nodeId: n.id,
        nodeLabel: n.data.label || n.id,
        nodeType: n.data.type || '',
        status: 'pending' as const,
        input: n.data.config || {},
      }));
      setIoEntries(initialEntries);
      setIoVisible(true);

      const credentialsMap = buildCredentialsMap();
      const res = await workflowApi.execute(workspaceId, id, undefined, credentialsMap);
      setExecutionId(res.data.executionId);
      startExecutionMonitoring(res.data.executionId);
      toast.success('Execution started');
    } catch (err: any) {
      clearExecutionMonitors();
      toast.error(err.response?.data?.error || 'Failed to execute — ensure backend is running.');
      setExecuting(false);
    }
  };

  const handleAddNode = (def: NodeDef, sourceId?: string | null) => {
    const sourceNode = sourceId ? nodes.find(n => n.id === sourceId) : null;

    // Position: to the right of source node, or at viewport centre
    const position = sourceNode
      ? { x: sourceNode.position.x + 280, y: sourceNode.position.y }
      : (() => {
          const viewport = reactFlowInstance.getViewport();
          return { x: (-viewport.x + 400) / viewport.zoom, y: (-viewport.y + 300) / viewport.zoom };
        })();

    const newId = `${def.type}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'flowNode',
      position,
      data: {
        label: def.label,
        type: def.type,
        icon: def.icon,
        config: Object.fromEntries(
          Object.entries(def.configSchema || {}).map(([key, schema]: [string, any]) => [
            key,
            schema.default ?? '',
          ])
        ),
      },
    };

    pendingChangeSummaryRef.current = {
      summary: `added ${def.label}`,
      changedNodeId: newId,
      changedField: 'add_node',
    };
    setNodes((nds) => [...nds, newNode]);

    // Auto-connect if triggered from a node's + button
    if (sourceNode) {
      const edgeId = `e-${sourceId}-${newId}-${Date.now()}`;
      setEdges((eds) => [
        ...eds,
        {
          id: edgeId,
          source: sourceId!,
          target: newId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#374151', strokeWidth: 1.5 },
        },
      ]);
    }

    setQuickAddSourceId(null);
  };

  const handleUpdateNodeConfig = (key: string, value: any) => {
    if (!selectedNode) return;
    pendingChangeSummaryRef.current = {
      summary: `updated ${selectedNode.data.label || selectedNode.id}`,
      changedNodeId: selectedNode.id,
      changedField: key,
    };
    if (key === 'credentialId') {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, credentialId: value || undefined } }
            : n
        )
      );
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, credentialId: value || undefined } } : null
      );
      return;
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } }
          : n
      )
    );
    setSelectedNode((prev) =>
      prev ? { ...prev, data: { ...prev.data, config: { ...prev.data.config, [key]: value } } } : null
    );
  };

  const focusNodeFromAdvanced = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      toast.error('Node no longer exists in the canvas');
      return;
    }

    setSelectedNode(node);
    setRightPanel('config');
    reactFlowInstance.setCenter(
      node.position.x + 120,
      node.position.y + 40,
      { zoom: Math.max(reactFlowInstance.getViewport().zoom, 0.9), duration: 350 }
    );
  }, [nodes, reactFlowInstance]);

  const openCredentialFix = useCallback((item: any) => {
    const serviceId = item?.serviceId || getServiceForNodeType(item?.nodeType || '')?.serviceId;
    if (!serviceId) {
      focusNodeFromAdvanced(item.nodeId);
      toast('Open the node and fill the required fields first');
      return;
    }
    focusNodeFromAdvanced(item.nodeId);
    setCredPreselectedService(serviceId);
    setCredModalOpen(true);
  }, [focusNodeFromAdvanced]);

  // ── Version history ──
  const loadVersions = async () => {
    if (!workspaceId || !id) return;
    try {
      const res = await versionApi.list(workspaceId, id);
      setVersions(res.data.versions || []);
    } catch {
      toast.error('Failed to load versions');
    }
  };

  const handleCreateCheckpoint = async () => {
    if (!workspaceId || !id || !checkpointLabel.trim()) return;
    try {
      await versionApi.create(workspaceId, id, { label: checkpointLabel });
      toast.success('Checkpoint created');
      setCheckpointLabel('');
      setShowCheckpoint(false);
      loadVersions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create checkpoint');
    }
  };

  const handleRestore = async (version: number) => {
    if (!workspaceId || !id) return;
    try {
      const res = await versionApi.restore(workspaceId, id, version);
      const wf = res.data.workflow;
      const graph = normalizeGraph(wf.graph);
      const flowNodes = (graph.nodes || []).map((n: any) => ({
        ...n,
        type: 'flowNode',
        data: { ...n.data, type: n.data?.type || n.type },
      }));
      setNodes(flowNodes);
      setEdges(graph.edges || []);
      setWorkflowVersion(wf.version);
      toast.success(`Restored to v${version}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to restore');
    }
  };

  // ── AI Debug ──
  const handleDebugNode = async (log: any) => {
    if (!workspaceId) return;
    try {
      setDebugging(true);
      setRightPanel('debug');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'shared_debug',
          workflowId: id,
          debug: {
            id: `debug-${Date.now()}`,
            nodeId: log.nodeId,
            summary: `${user?.name || 'A collaborator'} started debugging ${log.nodeId}`,
            error: log.error || 'Unknown error',
            createdAt: new Date().toISOString(),
          }
        }));
      }
      const res = await aiApi.debugNode(workspaceId, {
        nodeId: log.nodeId,
        nodeType: log.nodeType || 'unknown',
        nodeConfig: log.nodeConfig || {},
        error: log.error || 'Unknown error',
      });
      setDebugResult(res.data);
    } catch (err: any) {
      toast.error('AI debug failed');
    } finally {
      setDebugging(false);
    }
  };

  const handleApplyFix = async () => {
    if (!workspaceId || !id || !debugResult?.fix || !selectedNode) return;
    try {
      await aiApi.applyFix(workspaceId, {
        workflowId: id,
        nodeId: selectedNode.id,
        fix: debugResult.fix,
      });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'shared_debug',
          workflowId: id,
          debug: {
            id: `debug-fix-${Date.now()}`,
            nodeId: selectedNode.id,
            summary: `${user?.name || 'A collaborator'} applied an AI fix to ${selectedNode.data.label || selectedNode.id}`,
            createdAt: new Date().toISOString(),
          }
        }));
      }
      toast.success('Fix applied!');
      // Reload workflow
      const res = await workflowApi.get(workspaceId, id);
      const wf = res.data.workflow;
      const graph = normalizeGraph(wf.graph);
      const flowNodes = (graph.nodes || []).map((n: any) => ({
        ...n,
        type: 'flowNode',
        data: { ...n.data, type: n.data?.type || n.type },
      }));
      setNodes(flowNodes);
      setWorkflowVersion(wf.version);
      setDebugResult(null);
      setRightPanel('logs');
    } catch (err: any) {
      toast.error('Failed to apply fix');
    }
  };

  const loadAdvancedReport = async () => {
    if (!workspaceId || !id) return;
    try {
      setAdvancedLoading(true);
      setRightPanel('advanced');
      const credentialsMap = buildCredentialsMap();
      const [reportRes, healthRes] = await Promise.all([
        workflowApi.advancedReport(workspaceId, id),
        workflowApi.credentialHealth(workspaceId, id, credentialsMap),
      ]);
      setAdvancedReport({
        ...reportRes.data,
        credentialHealth: healthRes.data,
      });
    } catch {
      toast.error('Failed to load advanced report');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const runWorkflowTests = async () => {
    if (!workspaceId || !id) return;
    try {
      setAdvancedLoading(true);
      const generated = await workflowApi.generateTests(workspaceId, id);
      const result = await workflowApi.runTests(workspaceId, id, generated.data.tests);
      setAdvancedReport((prev: any) => ({
        ...(prev || {}),
        workflowUnitTests: {
          fixtures: generated.data.tests,
          result: result.data,
        },
      }));
      toast.success(result.data.status === 'passed' ? 'Workflow tests passed' : 'Workflow tests need attention');
    } catch {
      toast.error('Workflow tests failed to run');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const loadReplayForLatestExecution = async () => {
    if (!workspaceId || !id || !executionId) {
      toast.error('Run the workflow first to create an execution replay');
      return;
    }
    try {
      setAdvancedLoading(true);
      const res = await workflowApi.replayExecution(workspaceId, id, executionId);
      setAdvancedReport((prev: any) => ({
        ...(prev || {}),
        timeTravelDebugger: {
          ...(prev?.timeTravelDebugger || {}),
          replay: res.data,
        },
      }));
    } catch {
      toast.error('Failed to load replay timeline');
    } finally {
      setAdvancedLoading(false);
    }
  };

  const loadReleaseAndEdgePlans = async () => {
    if (!workspaceId || !id) return;
    try {
      setAdvancedLoading(true);
      const [release, edge] = await Promise.all([
        workflowApi.releasePlan(workspaceId, id),
        workflowApi.edgeRunnerPlan(workspaceId, id),
      ]);
      setAdvancedReport((prev: any) => ({
        ...(prev || {}),
        releaseSystem: release.data.release,
        edgeRunner: edge.data.edgeRunner,
      }));
      toast.success('Release and edge runner plans updated');
    } catch {
      toast.error('Failed to load release/edge plans');
    } finally {
      setAdvancedLoading(false);
    }
  };

  // ── ML node suggestions: re-fetch (debounced) whenever canvas nodes change ──
  useEffect(() => {
    if (!workspaceId || nodes.length === 0) {
      setNodeSuggestions([]);
      return;
    }
    const currentTypes = [...new Set(
      nodes.map((n) => (n.data?.type || n.type || '') as string).filter(Boolean)
    )];
    const timer = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await workflowApi.suggestNodes(workspaceId, currentTypes);
        setNodeSuggestions(res.data.suggestions || []);
      } catch {
        // silently ignore — suggestions are non-critical
      } finally {
        setSuggestionsLoading(false);
      }
    }, 800); // 800 ms debounce
    return () => clearTimeout(timer);
  }, [nodes, workspaceId]);

  const loadTemplatesMarketplace = async () => {
    if (!workspaceId) return;
    try {
      setTemplatesLoading(true);
      setRightPanel('templates');
      const res = await workflowApi.templatesMarketplace(workspaceId);
      setTemplates(res.data.templates || []);
    } catch {
      toast.error('Failed to load workflow templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleInstallTemplate = async (templateId: string, templateName: string) => {
    if (!workspaceId) return;
    try {
      const res = await workflowApi.installTemplate(workspaceId, templateId, { name: templateName });
      toast.success(`${templateName} installed`);
      navigate(`/workflows/${res.data.workflow.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to install template');
    }
  };

  const addNodeComment = () => {
    if (!selectedNode || !commentInput.trim() || !user?.id) {
      if (!selectedNode) toast.error('Select a node first');
      return;
    }

    const comment = {
      id: `comment-${Date.now()}`,
      nodeId: selectedNode.id,
      nodeLabel: selectedNode.data.label || selectedNode.id,
      authorId: user.id,
      authorName: user.name,
      text: commentInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setNodeComments((prev) => [...prev, comment]);
    setActivityFeed((prev) => [{
      id: `activity-${comment.id}`,
      type: 'comment',
      actorName: user.name,
      summary: `commented on ${comment.nodeLabel}`,
      nodeId: comment.nodeId,
      createdAt: comment.createdAt,
    }, ...prev].slice(0, 25));
    pendingChangeSummaryRef.current = {
      summary: `commented on ${comment.nodeLabel}`,
      changedNodeId: comment.nodeId,
      changedField: 'comment',
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'node_comment', workflowId: id, comment }));
    }
    setCommentInput('');
  };

  const applySuggestedMapping = useCallback((suggestion: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === suggestion.targetNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  [suggestion.targetField]: suggestion.applyValue,
                },
              },
            }
          : node
      )
    );

    setSelectedNode((prev) =>
      prev && prev.id === suggestion.targetNodeId
        ? {
            ...prev,
            data: {
              ...prev.data,
              config: {
                ...prev.data.config,
                [suggestion.targetField]: suggestion.applyValue,
              },
            },
          }
        : prev
    );

    setAdvancedReport((prev: any) => ({
      ...(prev || {}),
      smartInputMapper: {
        ...(prev?.smartInputMapper || {}),
        suggestions: (prev?.smartInputMapper?.suggestions || []).filter((item: any) => !(item.edgeId === suggestion.edgeId && item.targetField === suggestion.targetField)),
      },
    }));
    toast.success(`Mapped ${suggestion.sourceField} -> ${suggestion.targetField}`);
  }, [setNodes]);

  const runPromptSandbox = async () => {
    if (!workspaceId || !id) return;
    const sandboxNodeId = promptSandboxNodeId || (selectedNode && /ai_|anthropic|openai/i.test(selectedNode.data.type || '') ? selectedNode.id : '');
    if (!sandboxNodeId) {
      toast.error('Select an AI node first');
      return;
    }

    let sampleInput: Record<string, unknown> = {};
    try {
      sampleInput = promptSandboxInput.trim() ? JSON.parse(promptSandboxInput) : {};
    } catch {
      toast.error('Sample payload must be valid JSON');
      return;
    }

    try {
      setPromptSandboxLoading(true);
      const res = await workflowApi.promptSandbox(workspaceId, id, {
        nodeId: sandboxNodeId,
        sampleInput,
        credentials: buildCredentialsMap(),
      });
      setPromptSandboxResult(res.data);
      setPromptSandboxHistory((prev) => [res.data, ...prev].slice(0, 4));
      toast.success(res.data.sandboxStatus === 'passed' ? 'Prompt sandbox passed' : 'Prompt sandbox needs attention');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Prompt sandbox failed');
    } finally {
      setPromptSandboxLoading(false);
    }
  };

  const savePromptVersion = () => {
    if (!promptSandboxResult?.nodeId || !promptSandboxResult?.resolvedPrompt) {
      toast.error('Run the sandbox first');
      return;
    }

    const versionEntry = {
      savedAt: new Date().toISOString(),
      prompt: promptSandboxResult.resolvedPrompt,
      sampleInput: promptSandboxResult.sampleInput,
      outputPreview: promptSandboxResult.output || promptSandboxResult.error,
      cost: promptSandboxResult.cost,
    };

    setNodes((nds) =>
      nds.map((node) =>
        node.id === promptSandboxResult.nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  promptVersions: [...((node.data.config?.promptVersions as any[]) || []), versionEntry].slice(-5),
                },
              },
            }
          : node
      )
    );

    setSelectedNode((prev) =>
      prev && prev.id === promptSandboxResult.nodeId
        ? {
            ...prev,
            data: {
              ...prev.data,
              config: {
                ...prev.data.config,
                promptVersions: [...((prev.data.config?.promptVersions as any[]) || []), versionEntry].slice(-5),
              },
            },
          }
        : prev
    );
    toast.success('Prompt version saved on the node');
  };

  // ── Filtered nodes for palette (local catalog) ──
  const aiSandboxNodes = nodes.filter((node) => /ai_|anthropic|openai/i.test(String(node.data?.type || '')));
  const selectedNodeComments = selectedNode ? nodeComments.filter((comment) => comment.nodeId === selectedNode.id) : [];
  const filteredCatalog = searchNodes(nodeSearch);
  const totalNodeCount = allNodes.length;

  return (
    <div className="flex h-screen flex-col bg-surface-base">
      {/* ── Editor Header ── */}
      <header className="flex h-14 items-center border-b border-surface-border bg-surface-card px-4 gap-4">

        {/* Left — back + workflow name */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-border hover:text-foreground transition shrink-0"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-px bg-surface-border shrink-0" />
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent font-body text-base font-bold text-foreground outline-none focus:border-b-2 focus:border-brand-500 min-w-0 max-w-[200px] transition-all truncate"
          />
        </div>

        {/* Centre — version + status badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-md bg-surface-border px-2 py-0.5 text-xs font-bold text-foreground-muted tracking-wide">
            v{workflowVersion}
          </span>
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold tracking-widest text-amber-400">
            DRAFT
          </span>
        </div>

        {/* Right — panel toggles + action buttons */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="flex -space-x-2 mr-3">
              {collaborators.map((c) => (
                <div
                  key={c.userId}
                  className="rounded-full border-2 border-surface"
                  title={c.userName}
                >
                  <UserAvatar avatar={c.avatar} name={c.userName || '?'} size={28} />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setLeftPanel(leftPanel === 'nodes' ? 'none' : 'nodes'); }}
            className={`rounded p-1.5 ${leftPanel === 'nodes' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Node palette"
          >
            <PanelLeftOpen size={16} />
          </button>
          <button
            onClick={() => { setRightPanel(rightPanel === 'versions' ? 'none' : 'versions'); loadVersions(); }}
            className={`rounded p-1.5 ${rightPanel === 'versions' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Version history"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'logs' ? 'none' : 'logs')}
            className={`rounded p-1.5 ${rightPanel === 'logs' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Execution logs"
          >
            <PanelRightOpen size={16} />
          </button>
          <button
            onClick={() => setIoVisible(!ioVisible)}
            className={`rounded p-1.5 ${ioVisible ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Input / Output"
          >
            <ArrowUpFromLine size={16} />
          </button>
          <button
            onClick={() => { setCredPreselectedService(undefined); setCredModalOpen(true); }}
            className="rounded p-1.5 text-foreground-muted hover:text-foreground"
            title="Manage credentials"
          >
            <Key size={16} />
          </button>
          <button
            onClick={loadTemplatesMarketplace}
            className={`rounded p-1.5 ${rightPanel === 'templates' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Workflow templates marketplace"
          >
            <Store size={16} />
          </button>
          <button
            onClick={() => {
              if (rightPanel === 'collaboration') {
                setRightPanel('none');
                return;
              }
              setRightPanel('collaboration');
              loadCollaborationPanel();
            }}
            className={`rounded p-1.5 ${rightPanel === 'collaboration' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Live collaboration"
          >
            <Users size={16} />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'ai' ? 'none' : 'ai')}
            className={`rounded p-1.5 ${rightPanel === 'ai' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="AI Workflow Assistant"
          >
            <Bot size={16} />
          </button>
          <button
            onClick={loadAdvancedReport}
            className={`rounded p-1.5 ${rightPanel === 'advanced' ? 'bg-brand-500/20 text-brand-400' : 'text-foreground-muted hover:text-foreground'}`}
            title="Advanced engineering report"
          >
            <ShieldCheck size={16} />
          </button>

          <div className="mx-2 h-5 w-px bg-surface-border" />

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-surface-border px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-surface-hover transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>

          {/* Publish button with popover */}
          <div className="relative">
            <button
              onClick={() => setShowPublishPopover(!showPublishPopover)}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-500/25 border border-brand-500/30"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Publish
            </button>
            {showPublishPopover && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-surface-border bg-surface-card p-4 shadow-2xl">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Publish New Version</h4>
                <p className="mb-3 text-xs text-foreground-muted">This will snapshot your current draft as v{workflowVersion + 1}.</p>
                <input
                  type="text"
                  placeholder={`Version label (e.g. "Add Gemini node")`}
                  value={publishLabel}
                  onChange={(e) => setPublishLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                  className="mb-3 w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowPublishPopover(false)} className="text-xs text-foreground-muted hover:text-foreground">
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                  >
                    {publishing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Publish v{workflowVersion + 1}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Publish to Marketplace button */}
          <button
            onClick={() => { setShowPublishPopover(false); setShowMktModal(true); }}
            className="flex items-center gap-1.5 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-500/20 transition"
            title="Publish this workflow as a Marketplace template"
          >
            <Store size={13} />
            To Marketplace
          </button>

          <button
            onClick={handleExecute}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition ${
              executing
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'btn-primary !py-1.5 !px-4 !text-xs'
            }`}
          >
            {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {executing ? 'Stop' : 'Run'}
          </button>
        </div>
      </header>

      {/* ── Main area with panels ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Node palette */}
        {/* Left panel: always visible */}
          <div className="w-80 shrink-0 flex flex-col border-r border-surface-border bg-surface-card">
            {/* Search header */}
            <div className="p-3 pb-2 border-b border-surface-border">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-body text-sm font-bold text-foreground tracking-wide">Node Palette</h3>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-400">{totalNodeCount}</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search nodes…"
                  value={nodeSearch}
                  onChange={(e) => setNodeSearch(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-input py-2 pl-8 pr-8 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal"
                />
                {nodeSearch && (
                  <button onClick={() => setNodeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* ── ML Suggested nodes panel ── */}
            {!nodeSearch && (nodeSuggestions.length > 0 || suggestionsLoading) && (
              <div className="border-b border-surface-border px-2 py-2">
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">✦ Suggested for you</span>
                  {suggestionsLoading && (
                    <div className="h-2.5 w-2.5 animate-spin rounded-full border border-brand-400/40 border-t-brand-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {nodeSuggestions.map((s) => {
                    const def = allNodes.find((n) => n.type === s.type);
                    if (!def) return null;
                    return (
                      <button
                        key={s.type}
                        onClick={() => handleAddNode(def)}
                        title={s.reason}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-500/10 group/sug border border-transparent hover:border-brand-500/20"
                      >
                        <NodeIcon nodeType={def.type} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground truncate">{def.label}</div>
                          <div className="text-[10px] text-foreground-muted truncate">{s.reason}</div>
                        </div>
                        <Plus size={14} className="shrink-0 text-brand-400 opacity-0 group-hover/sug:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scrollable category list */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {Object.entries(filteredCatalog).map(([category, defs]) => {
                const meta = categoryMeta[category] || { label: category, icon: '📦', color: 'text-foreground-muted' };
                const isCollapsed = collapsedCategories.has(category);
                return (
                  <div key={category} className="mb-0.5">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-hover"
                    >
                      <span className="text-sm">{meta.icon}</span>
                      <span className={`flex-1 text-xs font-bold uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                      <span className="rounded-full bg-surface-border px-2 py-0.5 text-[10px] font-bold text-foreground-muted">{defs.length}</span>
                      <ChevronDown size={13} className={`text-foreground-muted transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                    {!isCollapsed && (
                      <div className="ml-1 mt-0.5 space-y-0.5 pb-1">
                        {defs.map((def) => (
                          <button
                            key={def.type}
                            onClick={() => handleAddNode(def)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-surface-hover group/node"
                          >
                            <NodeIcon nodeType={def.type} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-foreground truncate">{def.label}</div>
                              <div className="text-xs font-medium text-foreground-muted truncate">{def.description}</div>
                            </div>
                            <Plus size={15} className="shrink-0 text-brand-400 opacity-0 group-hover/node:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(filteredCatalog).length === 0 && (
                <div className="flex flex-col items-center py-10 text-center">
                  <Search size={26} className="mb-3 text-foreground-muted/40" />
                  <p className="text-sm font-semibold text-foreground-muted">No results</p>
                  <p className="text-xs text-foreground-muted/60 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>

        {/* Canvas */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            fitView
            nodesConnectable
            className="bg-surface-base"
            deleteKeyCode={['Backspace', 'Delete']}
            connectionLineStyle={{ stroke: '#4b5563', strokeWidth: 1.5, strokeDasharray: '5 4' }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#374151', strokeWidth: 1.5 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#4b5563',
                width: 16,
                height: 16,
              },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
            <Controls className="!rounded-lg !bg-[#1a1f2e] !border-white/[0.07] !shadow-xl [&>button]:!bg-[#1a1f2e] [&>button]:!border-white/[0.07] [&>button]:!text-white/50 [&>button:hover]:!bg-white/[0.06] [&>button:hover]:!text-white/80" />
          </ReactFlow>

          {/* ── Floating quick-add button ── */}
          <div
            ref={quickAddRef}
            className="absolute bottom-20 right-5 z-30"
          >
            {/* Popover */}
            {showQuickAdd && (
              <div className="absolute bottom-14 right-0 w-72 rounded-xl border border-white/[0.08] bg-[#1a1f2e] shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: 420 }}>
                {/* Search */}
                <div className="p-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                    <Search size={13} className="text-white/30 shrink-0" />
                    <input
                      autoFocus
                      value={quickSearch}
                      onChange={e => setQuickSearch(e.target.value)}
                      placeholder="Search nodes…"
                      className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
                    />
                    {quickSearch && (
                      <button onClick={() => setQuickSearch('')} className="text-white/30 hover:text-white/60">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Node list */}
                <div className="overflow-y-auto flex-1 p-2">
                  {(() => {
                    const results = quickSearch.trim()
                      ? searchNodes(quickSearch)
                      : allNodes;
                    const grouped = quickSearch.trim()
                      ? { Results: results }
                      : Object.fromEntries(
                          Object.entries(getGroupedCatalog()).map(([cat, defs]) => [cat, defs])
                        );
                    return Object.entries(grouped).map(([cat, defs]) => (
                      <div key={cat} className="mb-2">
                        {!quickSearch.trim() && (
                          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
                            {cat}
                          </div>
                        )}
                        {(defs as NodeDef[]).slice(0, quickSearch ? 20 : 5).map(def => (
                          <button
                            key={def.type}
                            onClick={() => { handleAddNode(def, quickAddSourceId); setShowQuickAdd(false); setQuickSearch(''); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.05] transition"
                          >
                            <NodeIcon nodeType={def.type} size="sm" className="!h-7 !w-7 !rounded-md shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-medium text-white/80">{def.label}</div>
                              <div className="truncate text-[10px] text-white/30">{def.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* + button */}
            <button
              onClick={() => { setShowQuickAdd(v => !v); setQuickSearch(''); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-[#1a1f2e] text-white/70 shadow-xl transition-all duration-200 hover:bg-white/[0.08] hover:text-white hover:scale-110 hover:shadow-2xl"
              title="Add node"
            >
              <Plus size={20} className={`transition-transform duration-200 ${showQuickAdd ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* I/O Panel — bottom of canvas */}
          <IOPanel
            entries={ioEntries}
            edges={edges.map((edge) => ({ source: edge.source, target: edge.target }))}
            visible={ioVisible}
            onToggle={() => setIoVisible(!ioVisible)}
          />
        </div>

        {/* Right panel — always visible */}
        <div className="w-[340px] shrink-0 overflow-y-auto border-l border-surface-border bg-surface-card">
            {/* Config panel */}
            {rightPanel === 'config' && selectedNode && (
              <div className="p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <NodeIcon nodeType={selectedNode.data.type || ''} size="md" />
                    <div>
                      <h3 className="font-body text-base font-bold text-foreground leading-tight">
                        {selectedNode.data.label}
                      </h3>
                      <p className="text-xs font-medium text-foreground-muted mt-0.5">{selectedNode.data.type}</p>
                    </div>
                  </div>
                  <button onClick={() => setRightPanel('none')} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-border hover:text-foreground transition mt-0.5">
                    <X size={15} />
                  </button>
                </div>

                {/* Config fields — enhanced with sections & conditional visibility */}
                {selectedNode.data.config && (() => {
                  const config = selectedNode.data.config;
                  const nodeType = selectedNode.data.type || '';

                  // Field grouping for HTTP Request nodes
                  const fieldGroups = nodeType === 'httpRequest' ? {
                    'Basic Request': ['method', 'url'],
                    'Query & Parameters': ['parameters'],
                    'Headers': ['headers'],
                    'Request Body': ['body', 'bodyType'],
                    'Authentication': ['authType', 'basicAuthUsername', 'basicAuthPassword', 'bearerToken', 'apiKeyName', 'apiKeyValue'],
                    'Request Options': ['timeout', 'followRedirects', 'maxRedirects', 'responseType', 'returnFullResponse'],
                    'SSL & Security': ['verifySSL'],
                    'Proxy': ['useProxy', 'proxyUrl']
                  } : null;

                  // Conditional field visibility
                  const shouldShowField = (fieldName: string, allConfig: Record<string, any>) => {
                    if (nodeType !== 'httpRequest') return true;

                    // Show auth fields only if their auth type is selected
                    if (fieldName.startsWith('basicAuth') && allConfig.authType !== 'basic') return false;
                    if (fieldName.startsWith('bearerToken') && allConfig.authType !== 'bearer') return false;
                    if (fieldName.startsWith('apiKey') && allConfig.authType !== 'api_key') return false;

                    // Show proxy URL only if useProxy is enabled
                    if (fieldName === 'proxyUrl' && !allConfig.useProxy) return false;

                    return true;
                  };

                  // Helper to format field labels
                  const formatLabel = (key: string) => {
                    return key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/_/g, ' ')
                      .trim()
                      .split(' ')
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');
                  };

                  if (fieldGroups) {
                    // Render grouped fields for HTTP Request
                    return Object.entries(fieldGroups).map(([groupName, fieldNames]) => {
                      const visibleFields = fieldNames.filter(f => shouldShowField(f, config) && f in config);
                      if (visibleFields.length === 0) return null;

                      return (
                        <div key={groupName} className="mb-6 border-b border-surface-border pb-4">
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-400">{groupName}</h4>
                          <div className="space-y-3">
                            {visibleFields.map((key) => {
                              const value = config[key];
                              return (
                                <div key={key}>
                                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                                    {formatLabel(key)}
                                  </label>
                                  {typeof value === 'boolean' ? (
                                    <button
                                      onClick={() => handleUpdateNodeConfig(key, !value)}
                                      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition text-center ${value ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-surface-border text-foreground-muted border border-surface-border hover:border-brand-500/20'}`}
                                    >
                                      {value ? '✓ Enabled' : '○ Disabled'}
                                    </button>
                                  ) : key === 'method' || key === 'authType' || key === 'bodyType' || key === 'responseType' ? (
                                    <select
                                      value={String(value ?? '')}
                                      onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                                      className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                                    >
                                      {key === 'method' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                      ))}
                                      {key === 'authType' && ['none', 'basic', 'bearer', 'api_key', 'oauth2'].map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>
                                      ))}
                                      {key === 'bodyType' && ['auto', 'json', 'form', 'raw'].map(t => (
                                        <option key={t} value={t}>{t.toUpperCase()}</option>
                                      ))}
                                      {key === 'responseType' && ['auto', 'json', 'text', 'arraybuffer'].map(t => (
                                        <option key={t} value={t}>{t.toUpperCase()}</option>
                                      ))}
                                    </select>
                                  ) : (value as string)?.length > 80 || key === 'body' || key === 'headers' || key === 'parameters' ? (
                                    <textarea
                                      value={String(value ?? '')}
                                      onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                                      className="w-full rounded-lg border border-surface-border bg-surface-input p-3 font-mono text-sm text-foreground outline-none focus:border-brand-500/50 transition resize-none"
                                      rows={key === 'body' ? 5 : 3}
                                      placeholder={`Enter ${formatLabel(key).toLowerCase()}…`}
                                    />
                                  ) : (
                                    <input
                                      type={key.includes('Password') || key.includes('Token') || key.includes('Key') ? 'password' : 'text'}
                                      value={String(value ?? '')}
                                      onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                                      className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal placeholder:text-foreground-muted/50"
                                      placeholder={`Enter ${formatLabel(key).toLowerCase()}…`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }).filter(Boolean);
                  } else {
                    // Default rendering for other node types
                    return Object.entries(config).map(([key, value]) => (
                      <div key={key} className="mb-4">
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground-muted">
                          {formatLabel(key)}
                        </label>
                        {typeof value === 'boolean' ? (
                          <button
                            onClick={() => handleUpdateNodeConfig(key, !value)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${value ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-surface-border text-foreground-muted border border-surface-border hover:border-brand-500/20'}`}
                          >
                            {value ? '● On' : '○ Off'}
                          </button>
                        ) : (value as string)?.length > 80 || key === 'code' || key === 'body' ? (
                          <textarea
                            value={String(value ?? '')}
                            onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                            className="w-full rounded-lg border border-surface-border bg-surface-input p-3 font-mono text-sm text-foreground outline-none focus:border-brand-500/50 transition resize-none"
                            rows={4}
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(value ?? '')}
                            onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                            className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-brand-500/50 transition placeholder:font-normal placeholder:text-foreground-muted/50"
                            placeholder={`Enter ${formatLabel(key).toLowerCase()}…`}
                          />
                        )}
                      </div>
                    ));
                  }
                })()}

                {/* ── Credential Picker (for API nodes) ── */}
                {(() => {
                  const nodeType = selectedNode.data.type || '';
                  const service = getServiceForNodeType(nodeType);
                  if (!service) return null;

                  const savedCreds = credentialStore.credentials.filter((c) => c.serviceId === service.serviceId);
                  const linkedCredId = selectedNode.data.credentialId as string | undefined;
                  const linkedCred = linkedCredId ? credentialStore.getCredentialById(linkedCredId) : undefined;

                  return (
                    <div className="mt-4 pt-4 border-t border-surface-border">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Key size={14} className="text-brand-400" />
                          {service.label} Credential
                        </label>
                      </div>

                      {linkedCred ? (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link2 size={14} className="text-green-400" />
                              <span className="text-sm font-medium text-green-400">{linkedCred.name}</span>
                            </div>
                            <button
                              onClick={() => handleUpdateNodeConfig('credentialId', '' as any)}
                              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-red-400 transition"
                              title="Disconnect credential"
                            >
                              <Unlink size={12} /> Unlink
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-foreground-muted">
                            Connected · {Object.keys(linkedCred.values).filter((k) => linkedCred.values[k]).length} field{Object.keys(linkedCred.values).filter((k) => linkedCred.values[k]).length !== 1 ? 's' : ''} configured
                          </p>
                        </div>
                      ) : savedCreds.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleUpdateNodeConfig('credentialId', e.target.value as any);
                            }}
                            className="w-full rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Select a credential…</option>
                            {savedCreds.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => { setCredPreselectedService(service.serviceId); setCredModalOpen(true); }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border py-2 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 transition"
                          >
                            <Plus size={14} /> Add New {service.label} Credential
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setCredPreselectedService(service.serviceId); setCredModalOpen(true); }}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-surface-input py-3 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 transition"
                        >
                          <Key size={15} /> Connect {service.label} Account
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Logs panel */}
            {rightPanel === 'logs' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-bold text-foreground">Execution Logs</h3>
                  <button onClick={() => setRightPanel('none')} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-border hover:text-foreground transition">
                    <X size={15} />
                  </button>
                </div>

                {nodeLogs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-surface-border p-6 text-center">
                    <Play size={22} className="mx-auto mb-2 text-foreground-muted/40" />
                    <p className="text-sm font-semibold text-foreground-muted">No logs yet</p>
                    <p className="text-xs text-foreground-muted/60 mt-1">Run the workflow to see execution logs.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nodeLogs.map((log, i) => (
                      <div key={i} className="rounded-lg border border-surface-border bg-surface-input p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground truncate max-w-[160px]">{log.nodeId}</span>
                          <span className={`flex items-center gap-1 text-xs font-bold ${
                            log.status === 'success' ? 'text-green-400' : log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {log.status === 'success' ? <CheckCircle2 size={13} /> : log.status === 'failed' ? <AlertCircle size={13} /> : <Clock size={13} />}
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                        {log.durationMs && <p className="text-xs font-medium text-foreground-muted">{log.durationMs}ms</p>}
                        {log.error && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-red-400">{log.error}</p>
                            <button
                              onClick={() => handleDebugNode(log)}
                              className="mt-2 flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 transition"
                            >
                              <Bug size={13} /> Debug with AI
                            </button>
                          </div>
                        )}
                        {log.output && (
                          <pre className="mt-2 max-h-24 overflow-auto rounded bg-surface-border p-2 text-xs text-foreground-secondary">
                            {JSON.stringify(log.output, null, 2).slice(0, 500)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Versions panel */}
            {rightPanel === 'versions' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-semibold text-foreground">Version History</h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {/* Create checkpoint */}
                {showCheckpoint ? (
                  <div className="mb-4 rounded-lg border border-surface-border bg-surface-input p-3">
                    <input
                      type="text"
                      placeholder="Checkpoint label…"
                      value={checkpointLabel}
                      onChange={(e) => setCheckpointLabel(e.target.value)}
                      className="mb-2 w-full rounded border border-surface-border bg-surface-card px-2.5 py-2 text-sm text-foreground outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCreateCheckpoint} className="btn-primary !py-1.5 !px-3 !text-sm">
                        Save
                      </button>
                      <button onClick={() => setShowCheckpoint(false)} className="text-sm text-foreground-muted">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCheckpoint(true)}
                    className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border py-2.5 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-400"
                  >
                    <Tag size={14} /> Create Checkpoint
                  </button>
                )}

                {/* Current version */}
                <div className="mb-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-400">v{workflowVersion} (current)</span>
                    <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">LIVE</span>
                  </div>
                </div>

                {/* Past versions */}
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                          {v.is_named && <Tag size={12} className="text-brand-400" />}
                          v{v.version}
                        </span>
                        <button
                          onClick={() => handleRestore(v.version)}
                          className="flex items-center gap-1 text-xs text-foreground-muted hover:text-brand-400"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      </div>
                      {v.label && <p className="text-sm text-foreground-secondary">{v.label}</p>}
                      <p className="text-xs text-foreground-muted">
                        {v.created_by_name || 'System'} · {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rightPanel === 'templates' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-semibold text-foreground flex items-center gap-2">
                    <Store size={18} className="text-brand-400" /> Workflow Templates Marketplace
                  </h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {templatesLoading ? (
                  <div className="flex flex-col items-center py-8">
                    <BanterLoader label="Loading templates..." />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div key={template.id} className="rounded-lg border border-surface-border bg-surface-input p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{template.name}</p>
                            <p className="mt-1 text-xs text-foreground-muted">{template.description}</p>
                          </div>
                          <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-400">
                            {template.category}
                          </span>
                        </div>
                        <div className="mt-3 rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-xs font-semibold text-foreground">Setup guide</p>
                          {template.setupGuide?.map((step: string, index: number) => (
                            <p key={`${template.id}-step-${index}`} className="mt-1 text-xs text-foreground-muted">
                              {index + 1}. {step}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-xs font-semibold text-foreground">Credential checklist</p>
                          {(template.requiredCredentials || []).length === 0 ? (
                            <p className="mt-1 text-xs text-green-400">No external credentials required.</p>
                          ) : (
                            template.requiredCredentials.map((item: any) => (
                              <p key={`${template.id}-${item.serviceId}`} className="mt-1 text-xs text-foreground-muted">
                                {item.label} · {item.required ? 'Required' : 'Optional'} · {item.reason}
                              </p>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => handleInstallTemplate(template.id, template.name)}
                          className="mt-3 w-full rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/20"
                        >
                          Install Template
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightPanel === 'collaboration' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-semibold text-foreground flex items-center gap-2">
                    <Users size={18} className="text-brand-400" /> Live Collaboration
                  </h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Workflow Access</h4>
                      <button
                        onClick={loadCollaborationPanel}
                        className="text-[11px] font-semibold text-brand-300 hover:text-brand-200"
                      >
                        Refresh
                      </button>
                    </div>
                    {collaborationLoading ? (
                      <p className="text-xs text-foreground-muted">Loading collaborators...</p>
                    ) : workflowCollaborators.length === 0 ? (
                      <p className="text-xs text-foreground-muted">No explicit workflow members yet. Workspace access still applies.</p>
                    ) : (
                      workflowCollaborators.map((member) => (
                        <div key={member.userId} className="mb-2 flex items-center justify-between rounded-md border border-surface-border bg-surface-card p-2">
                          <div className="flex items-center gap-2">
                            <UserAvatar avatar={member.avatar} name={member.name || 'User'} size={28} />
                            <div>
                              <p className="text-xs font-semibold text-foreground">{member.name}</p>
                              <p className="text-[11px] text-foreground-muted">{member.workspaceRole} • {member.accessRole}</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-secondary">
                            {member.accessRole}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Presence</h4>
                    {collaborators.length === 0 ? (
                      <p className="text-xs text-foreground-muted">No other collaborators are currently in this workflow.</p>
                    ) : (
                      collaborators.map((person) => (
                        <div key={person.userId} className="mb-2 flex items-center gap-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <UserAvatar avatar={person.avatar} name={person.userName || 'User'} size={28} />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{person.userName}</p>
                            <p className="text-[11px] text-foreground-muted">
                              {person.headline || (person.selectedNode ? `Focused on ${person.selectedNode}` : 'Browsing the canvas')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Node Comments</h4>
                      <span className="text-[11px] text-foreground-muted">
                        {selectedNode ? selectedNode.data.label : 'Select a node'}
                      </span>
                    </div>
                    {selectedNode ? (
                      <>
                        <div className="max-h-40 space-y-2 overflow-auto pr-1">
                          {selectedNodeComments.length === 0 ? (
                            <p className="text-xs text-foreground-muted">No comments on this node yet.</p>
                          ) : (
                            selectedNodeComments.map((comment) => (
                              <div key={comment.id} className="rounded-md border border-surface-border bg-surface-card p-2">
                                <p className="text-xs font-semibold text-foreground">{comment.authorName}</p>
                                <p className="mt-1 text-xs text-foreground-muted">{comment.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <textarea
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          rows={3}
                          placeholder="Leave a note for collaborators..."
                          className="mt-2 w-full rounded-lg border border-surface-border bg-surface-card p-3 text-sm text-foreground outline-none focus:border-brand-500/40"
                        />
                        <button
                          onClick={addNodeComment}
                          className="mt-2 w-full rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/20"
                        >
                          <MessageSquare size={13} className="mr-1 inline" /> Add Comment
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-foreground-muted">Click a node first to review or add comments.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Shared Debugging</h4>
                    {sharedDebugFeed.length === 0 ? (
                      <p className="text-xs text-foreground-muted">No shared debug sessions yet.</p>
                    ) : (
                      sharedDebugFeed.slice(0, 5).map((item) => (
                        <div key={item.id} className="mb-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-xs font-semibold text-foreground">{item.summary}</p>
                          {item.error && <p className="mt-1 text-xs text-red-300">{item.error}</p>}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Change Feed</h4>
                    {activityFeed.length === 0 ? (
                      <p className="text-xs text-foreground-muted">No recent collaborative activity.</p>
                    ) : (
                      activityFeed.slice(0, 8).map((item) => (
                        <div key={item.id} className="mb-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-xs font-semibold text-foreground">{item.actorName}</p>
                          <p className="mt-1 text-xs text-foreground-muted">{item.summary}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">Progress Timeline</h4>
                    {workflowProgressFeed.length === 0 ? (
                      <p className="text-xs text-foreground-muted">No tracked workflow progress yet.</p>
                    ) : (
                      workflowProgressFeed.slice(0, 8).map((item) => (
                        <div key={item.id} className="mb-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{item.title}</p>
                            <span className="text-[10px] text-foreground-muted">
                              {new Date(item.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {item.body && <p className="mt-1 text-xs text-foreground-muted">{item.body}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Debug panel */}
            {rightPanel === 'debug' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-semibold text-foreground flex items-center gap-2">
                    <Bug size={18} className="text-brand-400" /> AI Debugger
                  </h3>
                  <button onClick={() => { setRightPanel('logs'); setDebugResult(null); }} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {debugging ? (
                  <div className="flex flex-col items-center py-8">
                    <BanterLoader label="Analyzing failure…" />
                  </div>
                ) : debugResult ? (
                  <div className="space-y-3">
                    {/* Diagnosis */}
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                      <h4 className="mb-1 text-sm font-semibold text-red-400">What went wrong</h4>
                      <p className="text-sm text-foreground-secondary">{debugResult.diagnosis}</p>
                    </div>

                    {/* Root cause */}
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <h4 className="mb-1 text-sm font-semibold text-yellow-400">Root Cause</h4>
                      <p className="text-sm text-foreground-secondary">{debugResult.root_cause}</p>
                    </div>

                    {/* Proposed fix */}
                    {debugResult.fix && Object.keys(debugResult.fix).length > 0 && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-green-400">Proposed Fix</h4>
                        {Object.entries(debugResult.fix).map(([key, val]) => (
                          <div key={key} className="mb-1 text-sm">
                            <span className="text-foreground-muted">{key}:</span>{' '}
                            <span className="text-green-300">{String(val)}</span>
                          </div>
                        ))}
                        <p className="mt-2 text-xs text-foreground-muted">{debugResult.explanation}</p>
                        <button
                          onClick={handleApplyFix}
                          className="btn-primary mt-3 !py-1.5 !px-3 !text-sm w-full"
                        >
                          Apply Fix
                        </button>
                      </div>
                    )}

                    {/* Prevention */}
                    {debugResult.prevention && (
                      <div className="rounded-lg bg-surface-border/50 p-3">
                        <p className="text-xs text-foreground-muted">💡 {debugResult.prevention}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">Select a failed node to debug.</p>
                )}
              </div>
            )}

            {/* Advanced engineering panel */}
            {rightPanel === 'advanced' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-body text-base font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck size={18} className="text-brand-400" /> Advanced Engineering
                  </h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {advancedLoading && !advancedReport ? (
                  <div className="flex flex-col items-center py-8">
                    <BanterLoader label="Building advanced report..." />
                  </div>
                ) : !advancedReport ? (
                  <div className="rounded-lg border border-surface-border bg-surface-input p-4 text-sm text-foreground-muted">
                    Click the shield icon again to generate compiler, policy, release, replay, and test insights.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">AI Compiler</span>
                        <span className="text-sm font-bold text-brand-400">
                          {advancedReport.compiler?.readinessScore}/100 {advancedReport.compiler?.status}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted">
                        Missing config: {advancedReport.compiler?.missingConfig?.length || 0} · Unsupported nodes: {advancedReport.compiler?.unsupportedNodes?.length || 0}
                      </p>
                    </div>

                    {(advancedReport.autoRemediation?.fixes || []).length > 0 && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-foreground">Compiler Auto-Remediation</h4>
                        <div className="space-y-2">
                          {(advancedReport.autoRemediation.fixes || []).map((fix: any, index: number) => (
                            <div key={`${fix.nodeId || index}-${index}`} className="rounded-md border border-surface-border bg-surface-card p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-foreground">{fix.title}</p>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${fix.priority === 'high' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                                  {fix.priority}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-foreground-muted">{fix.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {((advancedReport.compiler?.missingConfig || []).length > 0 || (advancedReport.compiler?.unsupportedNodes || []).length > 0) && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-foreground">Fix Missing Config</h4>
                        <div className="space-y-2">
                          {(advancedReport.compiler?.missingConfig || []).slice(0, 5).map((item: any) => (
                            <div key={item.nodeId} className="rounded-md border border-surface-border bg-surface-card p-2">
                              <p className="text-xs font-bold text-foreground">{item.nodeLabel}</p>
                              <p className="mt-0.5 text-xs text-foreground-muted">{item.fields?.join(', ')}</p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => focusNodeFromAdvanced(item.nodeId)}
                                  className="rounded border border-surface-border px-2 py-1 text-[11px] font-bold text-foreground-muted hover:border-brand-500/40 hover:text-brand-400"
                                >
                                  Open Node
                                </button>
                                {item.serviceId && (
                                  <button
                                    onClick={() => openCredentialFix(item)}
                                    className="rounded border border-brand-500/40 bg-brand-500/10 px-2 py-1 text-[11px] font-bold text-brand-400 hover:bg-brand-500/20"
                                  >
                                    Add Credential
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {(advancedReport.compiler?.unsupportedNodes || []).slice(0, 3).map((item: any) => (
                            <div key={item.nodeId} className="rounded-md border border-red-500/25 bg-red-500/5 p-2">
                              <p className="text-xs font-bold text-red-300">{item.nodeLabel}</p>
                              <p className="mt-0.5 text-xs text-foreground-muted">Unsupported runtime type: {item.nodeType}</p>
                              <button
                                onClick={() => focusNodeFromAdvanced(item.nodeId)}
                                className="mt-2 rounded border border-surface-border px-2 py-1 text-[11px] font-bold text-foreground-muted hover:border-brand-500/40 hover:text-brand-400"
                              >
                                Open Node
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Credential Health Center</h4>
                        <button
                          onClick={loadAdvancedReport}
                          disabled={advancedLoading}
                          className="rounded border border-surface-border px-2 py-1 text-[11px] font-bold text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 disabled:opacity-50"
                        >
                          Test All
                        </button>
                      </div>
                      <p className="mb-2 text-xs text-foreground-muted">{advancedReport.credentialHealth?.summary || 'No credential health data yet.'}</p>
                      <div className="space-y-2">
                        {(advancedReport.credentialHealth?.statuses || []).slice(0, 6).map((item: any, index: number) => (
                          <div key={`${item.credentialId || item.serviceId}-${index}`} className="rounded-md border border-surface-border bg-surface-card p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-foreground">{item.name || item.serviceLabel}</p>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                item.status === 'passed' ? 'bg-green-500/15 text-green-300' :
                                item.status === 'missing' || item.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                                'bg-amber-500/15 text-amber-300'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-foreground-muted">{item.message}</p>
                            {(item.usedByNodes || []).length > 0 && (
                              <p className="mt-1 text-[11px] text-foreground-muted">
                                Used by: {(item.usedByNodes || []).map((node: any) => node.nodeLabel).join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Smart Input Mapper</h4>
                      {(advancedReport.smartInputMapper?.suggestions || []).length === 0 ? (
                        <p className="text-xs text-foreground-muted">No obvious field mappings detected right now.</p>
                      ) : (
                        <div className="space-y-2">
                          {(advancedReport.smartInputMapper?.suggestions || []).slice(0, 6).map((suggestion: any) => (
                            <div key={`${suggestion.edgeId}-${suggestion.targetField}`} className="rounded-md border border-surface-border bg-surface-card p-2">
                              <p className="text-xs font-bold text-foreground">
                                {suggestion.sourceNodeLabel} → {suggestion.targetNodeLabel}
                              </p>
                              <p className="mt-1 text-xs text-foreground-muted">
                                {suggestion.sourceField} → {suggestion.targetField} · {Math.round((suggestion.confidence || 0) * 100)}% match
                              </p>
                              <button
                                onClick={() => applySuggestedMapping(suggestion)}
                                className="mt-2 rounded border border-brand-500/40 bg-brand-500/10 px-2 py-1 text-[11px] font-bold text-brand-400 hover:bg-brand-500/20"
                              >
                                Apply Mapping
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Policy Guardrails</h4>
                      {(advancedReport.policyGuardrails?.findings || []).length === 0 ? (
                        <p className="text-xs text-green-400">No policy findings.</p>
                      ) : (
                        <div className="space-y-1">
                          {advancedReport.policyGuardrails.findings.slice(0, 4).map((finding: any, i: number) => (
                            <p key={i} className="text-xs text-foreground-muted">{finding.severity}: {finding.message}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Schema-Aware Connections</h4>
                      {(advancedReport.schemaAwareCanvas?.contracts || []).slice(0, 4).map((contract: any, i: number) => (
                        <p key={i} className="truncate text-xs font-mono text-foreground-muted">
                          {contract.from} -&gt; {contract.to}: {contract.availableFields?.join(', ')}
                        </p>
                      ))}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Observability Dashboard</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-foreground-muted">Failure rate</p>
                          <p className="mt-1 text-sm font-bold text-foreground">{advancedReport.observability?.totals?.failureRate ?? 0}%</p>
                        </div>
                        <div className="rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-foreground-muted">Avg duration</p>
                          <p className="mt-1 text-sm font-bold text-foreground">{advancedReport.observability?.totals?.avgDurationMs ?? 0}ms</p>
                        </div>
                      </div>
                      {(advancedReport.observability?.topBrokenNodes || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(advancedReport.observability.topBrokenNodes || []).slice(0, 4).map((node: any) => (
                            <p key={node.nodeId} className="text-xs text-foreground-muted">
                              {node.nodeLabel}: {node.failedCount} failures · avg {node.avgDurationMs}ms
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">Prompt Sandbox</h4>
                      {aiSandboxNodes.length === 0 ? (
                        <p className="text-xs text-foreground-muted">Add an AI node to use the sandbox and save prompt versions.</p>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={promptSandboxNodeId}
                            onChange={(e) => setPromptSandboxNodeId(e.target.value)}
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/40"
                          >
                            <option value="">Use selected AI node</option>
                            {aiSandboxNodes.map((node) => (
                              <option key={node.id} value={node.id}>{node.data.label || node.id}</option>
                            ))}
                          </select>
                          <textarea
                            value={promptSandboxInput}
                            onChange={(e) => setPromptSandboxInput(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-surface-border bg-surface-card p-3 font-mono text-xs text-foreground outline-none focus:border-brand-500/40"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={runPromptSandbox}
                              disabled={promptSandboxLoading}
                              className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-bold text-foreground hover:border-brand-500/40 disabled:opacity-50"
                            >
                              {promptSandboxLoading ? 'Running…' : 'Run Node Unit Test'}
                            </button>
                            <button
                              onClick={savePromptVersion}
                              disabled={!promptSandboxResult}
                              className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-bold text-foreground hover:border-brand-500/40 disabled:opacity-50"
                            >
                              Save Prompt Version
                            </button>
                          </div>
                          {promptSandboxResult && (
                            <div className="rounded-md border border-surface-border bg-surface-card p-2">
                              <p className="text-xs font-bold text-foreground">{promptSandboxResult.nodeLabel}</p>
                              <p className="mt-1 text-xs text-foreground-muted">
                                {promptSandboxResult.cost?.estimatedTokens ?? 0} tokens · ${promptSandboxResult.cost?.estimatedUsd ?? 0} · {promptSandboxResult.durationMs}ms
                              </p>
                              {promptSandboxResult.error ? (
                                <p className="mt-2 text-xs text-red-300">{promptSandboxResult.error}</p>
                              ) : (
                                <pre className="mt-2 max-h-32 overflow-auto rounded bg-surface-border p-2 text-[11px] text-foreground-secondary">
                                  {JSON.stringify(promptSandboxResult.output, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                          {promptSandboxHistory.length > 1 && (
                            <div className="rounded-md border border-surface-border bg-surface-card p-2">
                              <p className="text-xs font-semibold text-foreground">Recent sandbox runs</p>
                              {promptSandboxHistory.slice(0, 3).map((item, index) => (
                                <p key={`${item.nodeId}-${index}`} className="mt-1 text-[11px] text-foreground-muted">
                                  Run {index + 1}: {item.cost?.estimatedTokens ?? 0} tokens · {item.sandboxStatus}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={runWorkflowTests} disabled={advancedLoading} className="rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs font-bold text-foreground hover:border-brand-500/40 disabled:opacity-50">
                        Run Unit Tests
                      </button>
                      <button onClick={loadReplayForLatestExecution} disabled={advancedLoading} className="rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs font-bold text-foreground hover:border-brand-500/40 disabled:opacity-50">
                        Load Replay
                      </button>
                      <button onClick={loadReleaseAndEdgePlans} disabled={advancedLoading} className="col-span-2 rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs font-bold text-foreground hover:border-brand-500/40 disabled:opacity-50">
                        Refresh Release + Edge Plans
                      </button>
                    </div>

                    {advancedReport.workflowUnitTests?.result && (
                      <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                        <h4 className="mb-1 text-sm font-semibold text-foreground">Workflow Unit Tests</h4>
                        <p className={`text-xs font-bold ${advancedReport.workflowUnitTests.result.status === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
                          {advancedReport.workflowUnitTests.result.status}
                        </p>
                        {advancedReport.workflowUnitTests.result.summary && (
                          <p className="mt-1 text-xs text-foreground-muted">{advancedReport.workflowUnitTests.result.summary}</p>
                        )}
                        {(advancedReport.workflowUnitTests.result.failureReasons || []).slice(0, 4).map((reason: any, i: number) => (
                          <div key={`${reason.nodeId || i}-${i}`} className="mt-2 rounded-md border border-surface-border bg-surface-card p-2">
                            <p className="text-xs font-semibold text-foreground">{reason.nodeLabel || 'Workflow'}</p>
                            <p className="mt-0.5 text-xs text-foreground-muted">{reason.message}</p>
                            {reason.fix && <p className="mt-1 text-xs text-brand-400">{reason.fix}</p>}
                          </div>
                        ))}
                        {(advancedReport.workflowUnitTests.result.results || []).slice(0, 2).map((test: any) => (
                          <div key={test.name} className="mt-2">
                            <p className="text-xs font-semibold text-foreground-muted">{test.name}</p>
                            {(test.assertions || []).slice(0, 3).map((assertion: any) => (
                              <p key={assertion.assertion} className={`text-xs ${assertion.passed ? 'text-green-400' : 'text-red-400'}`}>
                                {assertion.passed ? 'Pass' : 'Fail'}: {assertion.assertion}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">Simulation Mode</h4>
                      {(advancedReport.simulationMode?.branches || []).length === 0 ? (
                        <p className="text-xs text-foreground-muted">Current graph is mostly linear. Add a branching node to preview alternate paths.</p>
                      ) : (
                        <div className="space-y-2">
                          {(advancedReport.simulationMode.branches || []).slice(0, 4).map((branch: any) => (
                            <div key={branch.nodeId} className="rounded-md border border-surface-border bg-surface-card p-2">
                              <p className="text-xs font-bold text-foreground">{branch.nodeLabel}</p>
                              <p className="mt-1 text-xs text-foreground-muted">
                                {branch.branches.map((item: any) => item.targetLabel).join(' · ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {advancedReport.timeTravelDebugger?.replay && (
                      <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                        <h4 className="mb-2 text-sm font-semibold text-foreground">Time-Travel Replay</h4>
                        {advancedReport.timeTravelDebugger.replay.timeline.slice(0, 5).map((step: any) => (
                          <p key={step.step} className="text-xs text-foreground-muted">
                            {step.step}. {step.nodeLabel} - {step.status} ({step.durationMs || 0}ms)
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">Release System</h4>
                      <p className="text-xs text-foreground-muted">{advancedReport.releaseSystem?.recommendation}</p>
                      <p className="mt-1 text-xs text-foreground-muted">Canary: {advancedReport.releaseSystem?.canary?.initialTrafficPercent ?? 0}% initial traffic</p>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">Human-in-the-Loop</h4>
                      <p className="text-xs text-foreground-muted">{advancedReport.humanApproval?.inboxSummary}</p>
                      {(advancedReport.humanApproval?.nodes || []).slice(0, 3).map((item: any) => (
                        <div key={item.nodeId} className="mt-2 rounded-md border border-surface-border bg-surface-card p-2">
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="mt-1 text-xs text-foreground-muted">
                            SLA {item.slaMinutes} min · {item.assignee}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">Local Edge Runner</h4>
                      <p className="text-xs text-foreground-muted">{advancedReport.edgeRunner?.mode}: {advancedReport.edgeRunner?.reason}</p>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-input p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">Data Privacy Mode</h4>
                      <p className="text-xs text-foreground-muted">{advancedReport.dataPrivacyMode?.warning}</p>
                      {(advancedReport.dataPrivacyMode?.sensitiveNodes || []).slice(0, 3).map((item: any) => (
                        <p key={item.nodeId} className="mt-1 text-xs text-foreground-muted">
                          {item.nodeLabel} · {item.nodeType}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Workflow Assistant panel */}
            {rightPanel === 'ai' && (
              <WorkflowAssistant
                workspaceId={workspaceId || ''}
                workflowId={id || ''}
                workflowNodes={nodes}
                workflowEdges={edges}
                onWorkflowUpdate={(updatedNodes, updatedEdges) => {
                  const normalizedNodes = (updatedNodes as any[]).map(n => ({
                    ...n,
                    type: 'flowNode',
                    data: { ...n.data, type: n.data?.type || n.type },
                  }));
                  suppressGraphSyncRef.current = true;
                  setNodes(normalizedNodes);
                  setEdges(updatedEdges as any);
                  setTimeout(() => { suppressGraphSyncRef.current = false; }, 50);
                  setTimeout(() => { reactFlowInstance.fitView({ padding: 0.15 }); }, 100);
                }}
                onClose={() => setRightPanel('none')}
              />
            )}

            {/* Default welcome panel — when no specific panel or no node selected */}
            {(rightPanel === 'config' && !selectedNode) && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10">
                  <Sparkles size={28} className="text-brand-400" />
                </div>
                <h3 className="font-body text-base font-semibold text-foreground mb-2">Node Inspector</h3>
                <p className="text-sm text-foreground-muted leading-relaxed mb-6">
                  Click on any node in the canvas to view and edit its configuration here.
                </p>
                <div className="w-full space-y-2">
                  <div className="rounded-lg border border-surface-border bg-surface-input p-3 text-left">
                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Quick Actions</p>
                    <button onClick={() => setRightPanel('logs')} className="flex w-full items-center gap-2 rounded py-1.5 px-2 text-sm text-foreground hover:bg-surface-border transition">
                      <PanelRightOpen size={15} className="text-foreground-muted" /> View Execution Logs
                    </button>
                    <button onClick={() => { setRightPanel('versions'); loadVersions(); }} className="flex w-full items-center gap-2 rounded py-1.5 px-2 text-sm text-foreground hover:bg-surface-border transition">
                      <History size={15} className="text-foreground-muted" /> Version History
                    </button>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-input p-3 text-left">
                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Workflow Stats</p>
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="text-foreground-muted">Nodes</span>
                      <span className="font-medium text-foreground">{nodes.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="text-foreground-muted">Connections</span>
                      <span className="font-medium text-foreground">{edges.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="text-foreground-muted">Version</span>
                      <span className="font-medium text-brand-400">v{workflowVersion}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightPanel === 'none' && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-border">
                  <PanelRightOpen size={20} className="text-foreground-muted" />
                </div>
                <p className="text-sm text-foreground-muted">Select a panel from the toolbar above</p>
              </div>
            )}
          </div>
      </div>

      {/* Credentials Manager Modal */}
      <CredentialsManager
        open={credModalOpen}
        onClose={() => setCredModalOpen(false)}
        preselectedServiceId={credPreselectedService}
      />

      {/* ── Publish to Marketplace Modal ── */}
      {showMktModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl animate-scale-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Store size={18} className="text-brand-400" />
                Publish to Marketplace
              </h2>
              <button onClick={() => setShowMktModal(false)} className="text-foreground-muted hover:text-foreground transition">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-foreground-muted mb-5">
              Share <span className="font-semibold text-foreground">"{workflowName}"</span> as a reusable template so anyone in your workspace can install it from the Marketplace.
            </p>

            <div className="space-y-4">
              {/* AI generate button */}
              <button
                onClick={handleGenerateDescription}
                disabled={generatingDesc}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-accent-500/10 px-4 py-2.5 text-sm font-semibold text-brand-400 hover:from-brand-500/20 hover:to-accent-500/20 transition disabled:opacity-50"
              >
                {generatingDesc ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating with AI…</>
                ) : (
                  <><Sparkles size={14} /> Generate Description with AI</>
                )}
              </button>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">Category</label>
                <div className="relative">
                  <select
                    value={mktCategory}
                    onChange={(e) => setMktCategory(e.target.value)}
                    className="input-field w-full appearance-none pr-8"
                  >
                    {MKT_CATEGORIES.map((c) => (
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
                  value={mktDescription}
                  onChange={(e) => setMktDescription(e.target.value)}
                  placeholder="What does this workflow do? What problem does it solve?"
                  className="input-field min-h-[72px] resize-none w-full"
                  autoFocus
                />
              </div>

              {/* Setup guide */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Setup Guide <span className="text-foreground-muted font-normal">(one step per line, optional)</span>
                </label>
                <textarea
                  value={mktSetupGuide}
                  onChange={(e) => setMktSetupGuide(e.target.value)}
                  placeholder={"Configure the webhook URL in the trigger node.\nAdd your API credentials in Settings.\nTest with a sample payload."}
                  className="input-field min-h-[90px] resize-none w-full"
                />
              </div>

              {/* Info row */}
              <div className="rounded-lg border border-surface-border bg-surface-input px-3 py-2 text-xs text-foreground-muted flex items-start gap-2">
                <Store size={12} className="mt-0.5 text-brand-400 shrink-0" />
                The current workflow graph ({nodes.length} node{nodes.length !== 1 ? 's' : ''}) will be snapshotted and listed on the Marketplace. Installers get their own editable copy.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowMktModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToMarketplace}
                disabled={publishingMkt}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {publishingMkt ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                ) : (
                  <><Store size={14} /> Publish Template</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorCanvas />
    </ReactFlowProvider>
  );
}

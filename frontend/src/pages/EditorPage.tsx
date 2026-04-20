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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi, executionApi, nodeApi, aiApi, versionApi } from '../utils/api';
import { useStore } from '../store';
import FlowNode from '../components/canvas/FlowNode';
import NodeIcon from '../components/canvas/NodeIcon';
import IOPanel, { type NodeIOEntry } from '../components/canvas/IOPanel';
import CredentialsManager from '../components/modals/CredentialsManager';
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

  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [showPublishPopover, setShowPublishPopover] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');

  // Panels — both open by default for easier understanding
  const [leftPanel, setLeftPanel] = useState<'nodes' | 'none'>('nodes');
  const [rightPanel, setRightPanel] = useState<'config' | 'logs' | 'versions' | 'debug' | 'none'>('config');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Node catalog (local)
  const [nodeSearch, setNodeSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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
  const executeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const executionPollInFlightRef = useRef(false);

  const workspaceId = workspace?.id;

  const normalizeGraph = useCallback((rawGraph: any) => {
    if (!rawGraph) return { nodes: [], edges: [] };

    let parsed = rawGraph;
    if (typeof rawGraph === 'string') {
      try {
        parsed = JSON.parse(rawGraph);
      } catch {
        return { nodes: [], edges: [] };
      }
    }

    return {
      nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
    };
  }, []);

  const toPersistedGraph = useCallback((nextNodes: Node[] = nodes, nextEdges: Edge[] = edges) => {
    const graphNodes = nextNodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      position: n.position,
      data: n.data,
    }));

    return { nodes: graphNodes, edges: nextEdges };
  }, [nodes, edges]);

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

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', workspaceId }));
      ws.send(JSON.stringify({ type: 'join_workflow', workflowId: id }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
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
        },
      }));
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
          userId: msg.userId, userName: msg.userName, color: msg.color
        }]);
        toast(`${msg.userName} joined`, { icon: '👋', duration: 2000 });
        break;
      case 'user_left':
        setCollaborators((prev) => prev.filter((c) => c.userId !== msg.userId));
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

        if (typeof incoming.workflowName === 'string' && incoming.workflowName.trim().length > 0) {
          setWorkflowName(incoming.workflowName);
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
    setEdges((eds) => addEdge({ ...connection, id: `e-${connection.source}-${connection.target}` }, eds));
  }, [setEdges]);

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

      // ── Collect per-user credentials for all nodes that have a credentialId ──
      const credentialsMap: Record<string, { serviceId: string; values: Record<string, string> }> = {};
      for (const n of nodes) {
        const credId = n.data.credentialId as string | undefined;
        if (credId && !credentialsMap[credId]) {
          const cred = credentialStore.getCredentialById(credId);
          if (cred) {
            credentialsMap[credId] = { serviceId: cred.serviceId, values: cred.values };
          }
        }
      }

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

  const handleAddNode = (def: NodeDef) => {
    const viewport = reactFlowInstance.getViewport();
    const position = {
      x: (-viewport.x + 400) / viewport.zoom,
      y: (-viewport.y + 300) / viewport.zoom,
    };

    const newNode: Node = {
      id: `${def.type}-${Date.now()}`,
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

    setNodes((nds) => [...nds, newNode]);
  };

  const handleUpdateNodeConfig = (key: string, value: any) => {
    if (!selectedNode) return;
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

  // ── Filtered nodes for palette (local catalog) ──
  const filteredCatalog = searchNodes(nodeSearch);
  const totalNodeCount = allNodes.length;

  return (
    <div className="flex h-screen flex-col bg-base">
      {/* ── Editor Header ── */}
      <header className="flex h-14 items-center justify-between border-b border-surface-border bg-surface-card px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent font-display text-base font-semibold text-foreground outline-none focus:border-b focus:border-brand-500"
          />
          <span className="rounded bg-surface-border px-2 py-0.5 text-sm text-foreground-muted">
            v{workflowVersion}
          </span>
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            DRAFT
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="flex -space-x-2 mr-3">
              {collaborators.map((c) => (
                <div
                  key={c.userId}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-xs font-bold text-white"
                  style={{ backgroundColor: c.color }}
                  title={c.userName}
                >
                  {c.userName?.[0]?.toUpperCase() || '?'}
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

          <div className="mx-2 h-5 w-px bg-surface-border" />

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-border/80"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
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
                  className="mb-3 w-full rounded-lg border border-surface-border bg-base px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500/50"
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

          <button
            onClick={handleExecute}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              executing
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'btn-primary !py-1.5 !px-3 !text-xs'
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm font-semibold text-foreground">Nodes</h3>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-400">{totalNodeCount}</span>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search nodes…"
                  value={nodeSearch}
                  onChange={(e) => setNodeSearch(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-base py-2 pl-9 pr-8 text-sm text-foreground outline-none focus:border-brand-500/50"
                />
                {nodeSearch && (
                  <button onClick={() => setNodeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable category list */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {Object.entries(filteredCatalog).map(([category, defs]) => {
                const meta = categoryMeta[category] || { label: category, icon: '📦', color: 'text-foreground-muted' };
                const isCollapsed = collapsedCategories.has(category);
                return (
                  <div key={category} className="mb-1">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-base/50 group"
                    >
                      <span className="text-base">{meta.icon}</span>
                      <span className={`flex-1 text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="rounded-full bg-surface-border px-2 py-0.5 text-[11px] text-foreground-muted">{defs.length}</span>
                      <ChevronDown size={14} className={`text-foreground-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                    {!isCollapsed && (
                      <div className="ml-1 mt-0.5 space-y-0.5">
                        {defs.map((def) => (
                          <button
                            key={def.type}
                            onClick={() => handleAddNode(def)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-base group/node"
                          >
                            <NodeIcon nodeType={def.type} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate">{def.label}</div>
                              <div className="text-xs text-foreground-muted truncate">{def.description}</div>
                            </div>
                            <Plus size={16} className="shrink-0 text-foreground-muted opacity-0 group-hover/node:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(filteredCatalog).length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <Search size={28} className="mb-2 text-foreground-muted/50" />
                  <p className="text-sm text-foreground-muted">No nodes found for "{nodeSearch}"</p>
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
            className="bg-base"
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#1e2d42', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2d42" />
            <Controls className="!bg-surface-card !border-surface-border !shadow-xl [&>button]:!bg-surface-card [&>button]:!border-surface-border [&>button]:!text-foreground-muted [&>button:hover]:!bg-surface-hover" />
          </ReactFlow>

          {/* I/O Panel — bottom of canvas */}
          <IOPanel
            entries={ioEntries}
            visible={ioVisible}
            onToggle={() => setIoVisible(!ioVisible)}
          />
        </div>

        {/* Right panel — always visible */}
        <div className="w-[340px] shrink-0 overflow-y-auto border-l border-surface-border bg-surface-card">
            {/* Config panel */}
            {rightPanel === 'config' && selectedNode && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <NodeIcon nodeType={selectedNode.data.type || ''} size="md" />
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {selectedNode.data.label}
                    </h3>
                  </div>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-4 text-sm text-foreground-muted">Type: {selectedNode.data.type}</p>

                {/* Config fields */}
                {selectedNode.data.config && Object.entries(selectedNode.data.config).map(([key, value]) => (
                  <div key={key} className="mb-3">
                    <label className="mb-1 block text-sm font-medium text-foreground-muted capitalize">{key}</label>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => handleUpdateNodeConfig(key, !value)}
                        className={`rounded px-3 py-1.5 text-sm ${value ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-border text-foreground-muted'}`}
                      >
                        {value ? 'On' : 'Off'}
                      </button>
                    ) : typeof value === 'string' && (value.length > 80 || key === 'code' || key === 'body') ? (
                      <textarea
                        value={String(value)}
                        onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                        className="w-full rounded-lg border border-surface-border bg-base p-2.5 font-mono text-sm text-foreground outline-none focus:border-brand-500/50"
                        rows={4}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(value ?? '')}
                        onChange={(e) => handleUpdateNodeConfig(key, e.target.value)}
                        className="w-full rounded-lg border border-surface-border bg-base px-2.5 py-2 text-sm text-foreground outline-none focus:border-brand-500/50"
                      />
                    )}
                  </div>
                ))}

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
                            className="w-full rounded-lg border border-surface-border bg-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
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
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-base py-3 text-sm text-foreground-muted hover:border-brand-500/40 hover:text-brand-400 transition"
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
                  <h3 className="font-display text-base font-semibold text-foreground">Execution Logs</h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {nodeLogs.length === 0 ? (
                  <p className="text-sm text-foreground-muted">Run the workflow to see logs here.</p>
                ) : (
                  <div className="space-y-2">
                    {nodeLogs.map((log, i) => (
                      <div key={i} className="rounded-lg border border-surface-border bg-base p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{log.nodeId}</span>
                          <span className={`flex items-center gap-1 text-sm ${
                            log.status === 'success' ? 'text-green-400' : log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {log.status === 'success' ? <CheckCircle2 size={14} /> : log.status === 'failed' ? <AlertCircle size={14} /> : <Clock size={14} />}
                            {log.status}
                          </span>
                        </div>
                        {log.durationMs && <p className="text-xs text-foreground-muted">{log.durationMs}ms</p>}
                        {log.error && (
                          <div className="mt-2">
                            <p className="text-sm text-red-400">{log.error}</p>
                            <button
                              onClick={() => handleDebugNode(log)}
                              className="mt-2 flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
                            >
                              <Bug size={14} /> Debug with AI
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
                  <h3 className="font-display text-base font-semibold text-foreground">Version History</h3>
                  <button onClick={() => setRightPanel('none')} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {/* Create checkpoint */}
                {showCheckpoint ? (
                  <div className="mb-4 rounded-lg border border-surface-border bg-base p-3">
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
                    <div key={v.id} className="rounded-lg border border-surface-border bg-base p-3">
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

            {/* AI Debug panel */}
            {rightPanel === 'debug' && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <Bug size={18} className="text-brand-400" /> AI Debugger
                  </h3>
                  <button onClick={() => { setRightPanel('logs'); setDebugResult(null); }} className="text-foreground-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {debugging ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 size={28} className="mb-3 animate-spin text-brand-400" />
                    <p className="text-sm text-foreground-muted">Analyzing failure…</p>
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

            {/* Default welcome panel — when no specific panel or no node selected */}
            {(rightPanel === 'config' && !selectedNode) && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10">
                  <Sparkles size={28} className="text-brand-400" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">Node Inspector</h3>
                <p className="text-sm text-foreground-muted leading-relaxed mb-6">
                  Click on any node in the canvas to view and edit its configuration here.
                </p>
                <div className="w-full space-y-2">
                  <div className="rounded-lg border border-surface-border bg-base p-3 text-left">
                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Quick Actions</p>
                    <button onClick={() => setRightPanel('logs')} className="flex w-full items-center gap-2 rounded py-1.5 px-2 text-sm text-foreground hover:bg-surface-border transition">
                      <PanelRightOpen size={15} className="text-foreground-muted" /> View Execution Logs
                    </button>
                    <button onClick={() => { setRightPanel('versions'); loadVersions(); }} className="flex w-full items-center gap-2 rounded py-1.5 px-2 text-sm text-foreground hover:bg-surface-border transition">
                      <History size={15} className="text-foreground-muted" /> Version History
                    </button>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-base p-3 text-left">
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

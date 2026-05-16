import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface NodeStatus {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  output?: unknown;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
}

export interface Collaborator {
  userId: string;
  fullName: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedNode?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Store shape                                                        */
/* ------------------------------------------------------------------ */

interface AppState {
  /* auth */
  token: string | null;
  user: User | null;
  workspace: Workspace | null;

  setAuth: (token: string, user: User, workspace: Workspace) => void;
  logout: () => void;
  setWorkspace: (ws: Workspace) => void;

  /* execution */
  nodeStatuses: Record<string, string>;
  executionId: string | null;
  executionStatus: string | null;

  setExecutionId: (id: string | null) => void;
  setExecutionStatus: (s: string | null) => void;
  setNodeStatuses: (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setNodeStatus: (nodeId: string, status: string) => void;
  clearNodeStatuses: () => void;

  /* multiplayer */
  collaborators: Record<string, Collaborator>;
  setCollaborator: (userId: string, data: Partial<Collaborator>) => void;
  removeCollaborator: (userId: string) => void;
  clearCollaborators: () => void;

  /* editor ui */
  sidebarTab: 'nodes' | 'config' | 'runs' | 'ai' | 'versions';
  setSidebarTab: (tab: AppState['sidebarTab']) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  /* onboarding tutorial */
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Create store with persist (localStorage)                           */
/* ------------------------------------------------------------------ */

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      /* ---- auth ---- */
      token: null,
      user: null,
      workspace: null,

      setAuth: (token, user, workspace) => set({ token, user, workspace }),
      logout: () =>
        set({
          token: null,
          user: null,
          workspace: null,
          nodeStatuses: {},
          executionId: null,
          executionStatus: null,
          collaborators: {},
        }),
      setWorkspace: (ws) => set({ workspace: ws }),

      /* ---- execution ---- */
      nodeStatuses: {},
      executionId: null,
      executionStatus: null,

      setExecutionId: (id) => set({ executionId: id }),
      setExecutionStatus: (s) => set({ executionStatus: s }),
      setNodeStatuses: (updater) =>
        set((state) => ({
          nodeStatuses: typeof updater === 'function' ? updater(state.nodeStatuses) : updater,
        })),
      setNodeStatus: (nodeId, status) =>
        set((state) => ({
          nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
        })),
      clearNodeStatuses: () =>
        set({ nodeStatuses: {}, executionId: null, executionStatus: null }),

      /* ---- multiplayer ---- */
      collaborators: {},
      setCollaborator: (userId, data) =>
        set((state) => ({
          collaborators: {
            ...state.collaborators,
            [userId]: { ...state.collaborators[userId], ...data } as Collaborator,
          },
        })),
      removeCollaborator: (userId) =>
        set((state) => {
          const copy = { ...state.collaborators };
          delete copy[userId];
          return { collaborators: copy };
        }),
      clearCollaborators: () => set({ collaborators: {} }),

      /* ---- editor ui ---- */
      sidebarTab: 'nodes',
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      /* ---- onboarding tutorial ---- */
      showTutorial: false,
      setShowTutorial: (show) => set({ showTutorial: show }),
    }),
    {
      name: 'flowa-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        workspace: state.workspace,
        showTutorial: state.showTutorial,
      }),
    },
  ),
);

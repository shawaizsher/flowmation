import axios from 'axios';
import { useStore } from '../store';
import type { AvatarData } from '../components/UserAvatar';

/* ------------------------------------------------------------------ */
/*  Base Axios instance                                                */
/* ------------------------------------------------------------------ */

// In production VITE_API_URL points to the deployed backend (e.g. Railway).
// In development the Vite proxy handles /api → localhost:4000.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

/* ------------------------------------------------------------------ */
/*  Auth API                                                           */
/* ------------------------------------------------------------------ */

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email?token=${token}`),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),

  verifyOtp: (email: string, code: string) =>
    api.post('/auth/verify-otp', { email, code }),

  me: () => api.get('/auth/me'),

  updateProfile: (data: { name: string; avatar?: AvatarData | null; headline?: string }) =>
    api.put('/auth/profile', data),

  notifications: () =>
    api.get('/auth/notifications'),

  markNotificationRead: (id: string) =>
    api.post(`/auth/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    api.post('/auth/notifications/read-all'),

  invitations: () =>
    api.get('/auth/invitations'),

  respondInvitation: (id: string, action: 'accept' | 'reject') =>
    api.post(`/auth/invitations/${id}/respond`, { action }),
};

/* ------------------------------------------------------------------ */
/*  Workflow API  –  /api/workspaces/:wid/workflows                    */
/* ------------------------------------------------------------------ */

export const workflowApi = {
  templatesMarketplace: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/templates/marketplace`),

  installTemplate: (workspaceId: string, templateId: string, data?: { name?: string }) =>
    api.post(`/workspaces/${workspaceId}/workflows/templates/${templateId}/install`, data),

  list: (workspaceId: string, params?: Record<string, string>) =>
    api.get(`/workspaces/${workspaceId}/workflows`, { params }),

  listMembers: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/members`),

  get: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}`),

  create: (
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      graph?: unknown;
      tags?: string[];
      collaborators?: Array<{ userId: string; accessRole?: 'owner' | 'edit' | 'run' | 'approve' | 'view' }>;
    }
  ) =>
    api.post(`/workspaces/${workspaceId}/workflows`, data),

  update: (workspaceId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/workspaces/${workspaceId}/workflows/${id}`, data),

  delete: (workspaceId: string, id: string) =>
    api.delete(`/workspaces/${workspaceId}/workflows/${id}`),

  duplicate: (workspaceId: string, id: string) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/duplicate`),

  publish: (workspaceId: string, id: string, data?: { label?: string; message?: string }) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/publish`, data),

  execute: (workspaceId: string, id: string, payload?: Record<string, unknown>, credentials?: Record<string, { serviceId: string; values: Record<string, string> }>) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/execute`, {
      payload,
      // Keep compatibility with any backend route still expecting inputData.
      inputData: payload,
      credentials,
    }),

  advancedReport: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/advanced-report`),

  credentialHealth: (workspaceId: string, id: string, credentials?: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/credential-health`, { credentials }),

  promptSandbox: (
    workspaceId: string,
    id: string,
    data: { nodeId: string; sampleInput?: Record<string, unknown>; credentials?: Record<string, unknown> }
  ) => api.post(`/workspaces/${workspaceId}/workflows/${id}/prompt-sandbox`, data),

  generateTests: (workspaceId: string, id: string) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/tests/generate`),

  runTests: (workspaceId: string, id: string, tests?: unknown[]) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/tests/run`, { tests }),

  replayExecution: (workspaceId: string, id: string, executionId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/replay/${executionId}`),

  selfHeal: (workspaceId: string, id: string, data: { nodeId?: string; nodeType?: string; nodeLabel?: string; error?: string }) =>
    api.post(`/workspaces/${workspaceId}/workflows/${id}/self-heal`, data),

  releasePlan: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/release-plan`),

  edgeRunnerPlan: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/edge-runner-plan`),

  getPresence: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/presence`),
};

export const collaborationApi = {
  listInvites: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/collaboration/invites`),

  createInvite: (workspaceId: string, data: { email: string; role?: 'owner' | 'admin' | 'editor' | 'viewer'; message?: string }) =>
    api.post(`/workspaces/${workspaceId}/collaboration/invites`, data),

  workflowMembers: (workspaceId: string, workflowId: string) =>
    api.get(`/workspaces/${workspaceId}/collaboration/workflow/${workflowId}/members`),

  addWorkflowMember: (
    workspaceId: string,
    workflowId: string,
    data: { userId: string; accessRole?: 'owner' | 'edit' | 'run' | 'approve' | 'view' }
  ) => api.post(`/workspaces/${workspaceId}/collaboration/workflow/${workflowId}/members`, data),

  removeWorkflowMember: (workspaceId: string, workflowId: string, userId: string) =>
    api.delete(`/workspaces/${workspaceId}/collaboration/workflow/${workflowId}/members/${userId}`),

  workflowActivity: (workspaceId: string, workflowId: string) =>
    api.get(`/workspaces/${workspaceId}/collaboration/workflow/${workflowId}/activity`),

  logWorkflowActivity: (
    workspaceId: string,
    workflowId: string,
    data: { type?: string; title: string; body?: string; metadata?: Record<string, unknown> }
  ) => api.post(`/workspaces/${workspaceId}/collaboration/workflow/${workflowId}/activity`, data),

  inboxThreads: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/collaboration/inbox/threads`),

  createInboxThread: (
    workspaceId: string,
    data: { title: string; workflowId?: string | null; participantIds?: string[] }
  ) => api.post(`/workspaces/${workspaceId}/collaboration/inbox/threads`, data),

  inboxMessages: (workspaceId: string, threadId: string) =>
    api.get(`/workspaces/${workspaceId}/collaboration/inbox/threads/${threadId}/messages`),

  sendInboxMessage: (workspaceId: string, threadId: string, body: string) =>
    api.post(`/workspaces/${workspaceId}/collaboration/inbox/threads/${threadId}/messages`, { body }),
};

/* ------------------------------------------------------------------ */
/*  Execution API  –  /api/workspaces/:wid/executions                  */
/* ------------------------------------------------------------------ */

export const executionApi = {
  list: (workspaceId: string, params?: { workflowId?: string; page?: number; limit?: number; status?: string }) =>
    api.get(`/workspaces/${workspaceId}/executions`, { params }),

  get: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/executions/${id}`),

  cancel: (workspaceId: string, id: string) =>
    api.delete(`/workspaces/${workspaceId}/executions/${id}`),
};

/* ------------------------------------------------------------------ */
/*  Version API  –  /api/workspaces/:wid/workflows/:id/versions        */
/* ------------------------------------------------------------------ */

export const versionApi = {
  list: (workspaceId: string, workflowId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${workflowId}/versions`),

  get: (workspaceId: string, workflowId: string, version: number) =>
    api.get(`/workspaces/${workspaceId}/workflows/${workflowId}/versions/${version}`),

  create: (workspaceId: string, workflowId: string, data?: { label?: string }) =>
    api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/versions`, data),

  diff: (workspaceId: string, workflowId: string, versionA: number, versionB: number) =>
    api.get(`/workspaces/${workspaceId}/workflows/${workflowId}/versions/${versionA}/diff/${versionB}`),

  restore: (workspaceId: string, workflowId: string, version: number) =>
    api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/versions/${version}/restore`),
};

/* ------------------------------------------------------------------ */
/*  AI API  –  /api/workspaces/:wid/ai                                 */
/* ------------------------------------------------------------------ */

export const aiApi = {
  generateWorkflow: (workspaceId: string, prompt: string) =>
    api.post(`/workspaces/${workspaceId}/ai/generate-workflow`, { prompt }),

  explainError: (workspaceId: string, error: string, context?: Record<string, unknown>) =>
    api.post(`/workspaces/${workspaceId}/ai/explain-error`, { error, context }),

  debugNode: (workspaceId: string, data: { nodeId: string; nodeType: string; nodeConfig: Record<string, unknown>; error: string; inputData?: unknown; outputData?: unknown }) =>
    api.post(`/workspaces/${workspaceId}/ai/debug-node`, data),

  applyFix: (workspaceId: string, data: { workflowId: string; nodeId: string; fix: Record<string, unknown> }) =>
    api.post(`/workspaces/${workspaceId}/ai/apply-fix`, data),

  suggestNodes: (workspaceId: string, data: { currentNodes: unknown[]; goal?: string }) =>
    api.post(`/workspaces/${workspaceId}/ai/suggest-nodes`, data),

  compileWorkflow: (workspaceId: string, workflow: { nodes: unknown[]; edges: unknown[] }) =>
    api.post(`/workspaces/${workspaceId}/ai/compile-workflow`, { workflow }),

  documentWorkflow: (workspaceId: string, workflowId: string) =>
    api.post(`/workspaces/${workspaceId}/ai/document-workflow`, { workflowId }),

  workflowChat: (
    workspaceId: string,
    data: {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      workflow: { nodes: unknown[]; edges: unknown[] };
    }
  ) => api.post(`/workspaces/${workspaceId}/ai/chat`, data),
};

/* ------------------------------------------------------------------ */
/*  Node Catalog API                                                   */
/* ------------------------------------------------------------------ */

export const nodeApi = {
  list: () => api.get('/nodes'),
};

/* ------------------------------------------------------------------ */
/*  WebSocket helper                                                   */
/* ------------------------------------------------------------------ */

export function connectWebSocket(workflowId?: string): WebSocket | null {
  const token = useStore.getState().token;
  if (!token) return null;

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const url = `${protocol}://${host}/ws?token=${token}${workflowId ? `&workflowId=${workflowId}` : ''}`;

  return new WebSocket(url);
}

export default api;

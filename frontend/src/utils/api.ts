import axios from 'axios';
import { useStore } from '../store';

/* ------------------------------------------------------------------ */
/*  Base Axios instance                                                */
/* ------------------------------------------------------------------ */

const api = axios.create({ baseURL: '/api' });

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

  me: () => api.get('/auth/me'),
};

/* ------------------------------------------------------------------ */
/*  Workflow API  –  /api/workspaces/:wid/workflows                    */
/* ------------------------------------------------------------------ */

export const workflowApi = {
  list: (workspaceId: string, params?: Record<string, string>) =>
    api.get(`/workspaces/${workspaceId}/workflows`, { params }),

  listMembers: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/members`),

  get: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}`),

  create: (workspaceId: string, data: { name: string; description?: string; graph?: unknown; tags?: string[] }) =>
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

  getPresence: (workspaceId: string, id: string) =>
    api.get(`/workspaces/${workspaceId}/workflows/${id}/presence`),
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

  documentWorkflow: (workspaceId: string, workflowId: string) =>
    api.post(`/workspaces/${workspaceId}/ai/document-workflow`, { workflowId }),
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

import type { ApiResult, Issue, MediaAsset, MediaScope, NurseryMoveInPlan, User } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const payload = await response.json().catch(() => null) as ApiResult<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new ApiError(payload?.message || '请求失败，请稍后重试', response.status);
  }
  return payload.data;
}

export const api = {
  session: () => request<User>('/api/session'),
  login: (username: string, password: string) => request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' }),
  issue: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}`),
  sharedIssue: (token: string) => request<Issue>(`/api/shares/${encodeURIComponent(token)}`),
  nurseryPlan: (token: string) => request<NurseryMoveInPlan>(`/api/nursery-shares/${encodeURIComponent(token)}`, { cache: 'no-store' }),
  acknowledge: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}/acknowledge`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  resolve: (id: string, resolutionDescription: string, attachments: MediaAsset[]) => request<Issue>(`/api/issues/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ resolutionDescription, attachments }) }),
  createShare: (id: string) => request<{ url: string }>(`/api/issues/${encodeURIComponent(id)}/share`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  uploadMedia: async (blob: Blob, fileName: string, scope: MediaScope, entityId: string) => {
    const response = await fetch('/api/media', { method: 'PUT', credentials: 'same-origin', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg', 'X-Entity-Id': entityId, 'X-File-Name': fileName, 'X-File-Size': String(blob.size), 'X-Media-Scope': scope } });
    const payload = await response.json().catch(() => null) as ApiResult<MediaAsset> | null;
    if (!response.ok || !payload?.success || !payload.data) throw new ApiError(payload?.message || '照片上传失败', response.status);
    return payload.data;
  },
  deleteMedia: async (id: string) => {
    const response = await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
    const payload = await response.json().catch(() => null) as ApiResult<{ deleted: true }> | null;
    if (!response.ok || !payload?.success) throw new ApiError(payload?.message || '照片删除失败', response.status);
  },
};

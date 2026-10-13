import type { LaborPlan, LaborPlanItem } from './types';
import type { ApiResult, PestFormula, Issue, MediaAsset, MediaScope, NurseryMoveInPlan, User } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let facilityContext = '';
export function setFacilityContext(code:string) {facilityContext=code;}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(facilityContext?{'X-Facility-Name':facilityContext}:{}), ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const payload = await response.json().catch(() => null) as ApiResult<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new ApiError(payload?.message || '请求失败，请稍后重试', response.status);
  }
  return payload.data;
}

export const api = {
  session: () => request<User>('/api/session'),
  login: (username: string, password: string, facilityName?:string) => request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password, facilityName }) }),
  logout: () => request<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' }),
  issue: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}`),
  sharedIssue: (token: string) => request<Issue>(`/api/shares/${encodeURIComponent(token)}`),
  laborAccess: () => request<{facilities:string[]}>('/api/labor-access'),
  arrangeLabor: (token:string,nursery:boolean,item:LaborPlanItem,action:'confirm'|'revoke',requestId:string) => request<LaborPlanItem>(`/api/labor-shares/${nursery?'nursery/':''}${encodeURIComponent(token)}/items/${encodeURIComponent(item.id)}/arrangement`,{method:'POST',headers:{'X-Facility-Name':item.facilityName},body:JSON.stringify({action,requestId,version:item.version,plannedDate:item.plannedDate})}),
  laborPlan: (token: string, nursery = false) => request<LaborPlan>(`/api/labor-shares/${nursery ? 'nursery/' : ''}${encodeURIComponent(token)}`, { cache: 'no-store' }),
  nurseryPlan: (token: string) => request<NurseryMoveInPlan>(`/api/nursery-shares/${encodeURIComponent(token)}`, { cache: 'no-store' }),
  confirmNurseryPlan: (token: string, id: string, input: { moveInDate: string; quantity: number }, facilityName: string) => request<{ id: string; confirmedAt: string }>(`/api/nursery-shares/${encodeURIComponent(token)}/items/${encodeURIComponent(id)}/confirm`, { method: 'POST', headers: { 'X-Facility-Name': facilityName }, body: JSON.stringify(input) }),
  acknowledge: (id: string) => request<Issue>(`/api/issues/${encodeURIComponent(id)}/acknowledge`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  pestFormulas: (facilityName:string)=>request<PestFormula[]>(`/api/care-formulas?facilityName=${encodeURIComponent(facilityName)}`),
  resolve: (id: string, resolutionDescription: string, attachments: MediaAsset[], formula?:PestFormula) => request<Issue>(`/api/issues/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ resolutionDescription, attachments, ...(formula?{resolutionFormulaId:formula.id,resolutionFormulaVersion:formula.version}:{}) }) }),
  createShare: (id: string) => request<{ url: string }>(`/api/issues/${encodeURIComponent(id)}/share`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  uploadMedia: async (blob: Blob, fileName: string, scope: MediaScope, entityId: string) => {
    const response = await fetch('/api/media', { method: 'PUT', credentials: 'same-origin', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg', 'X-Entity-Id': entityId, 'X-File-Name': fileName, 'X-File-Size': String(blob.size), 'X-Media-Scope': scope, ...(facilityContext?{'X-Facility-Name':facilityContext}:{}) } });
    const payload = await response.json().catch(() => null) as ApiResult<MediaAsset> | null;
    if (!response.ok || !payload?.success || !payload.data) throw new ApiError(payload?.message || '照片上传失败', response.status);
    return payload.data;
  },
  deleteMedia: async (id: string) => {
    const response = await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin',headers:facilityContext?{'X-Facility-Name':facilityContext}:{} });
    const payload = await response.json().catch(() => null) as ApiResult<{ deleted: true }> | null;
    if (!response.ok || !payload?.success) throw new ApiError(payload?.message || '照片删除失败', response.status);
  },
};

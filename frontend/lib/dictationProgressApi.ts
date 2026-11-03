import type { ItemProgress, ProgressMap } from '@/lib/dictation/progress';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** True when there is a signed-in user to save progress for. */
export const canSyncDictation = () => 'Authorization' in getAuthHeader();

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/dictation/progress${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  if (!res.ok) throw new Error(`dictation progress ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const dictationProgressApi = {
  getMine: () => send<ProgressMap>(''),
  record: (itemKey: string, score: number) =>
    send<ItemProgress>('/record', { method: 'POST', body: JSON.stringify({ itemKey, score }) }),
  /** Sends progress that so far only existed in this browser; the server merges it and returns everything. */
  importMany: (items: ProgressMap) => send<ProgressMap>('/import', { method: 'POST', body: JSON.stringify({ items }) }),
};

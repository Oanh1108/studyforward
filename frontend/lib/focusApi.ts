const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface FocusSession {
  id: number;
  userId: number;
  departure: string;
  destination: string;
  targetMinutes: number;
  actualMinutes: number;
  status: 'completed' | 'aborted';
  createdAt: string;
}

export const focusApi = {
  async createSession(data: Partial<FocusSession>): Promise<FocusSession> {
    const res = await fetch(`${API_BASE}/api/focus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save focus session');
    return res.json();
  },

  async getHistory(): Promise<FocusSession[]> {
    const res = await fetch(`${API_BASE}/api/focus/history`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch focus history');
    return res.json();
  }
};

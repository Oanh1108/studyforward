const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const studyBoardsApi = {
  async getBoards() {
    const res = await fetch(`${API_BASE}/study-boards`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch boards');
    return res.json();
  },

  async getBoard(id: string) {
    const res = await fetch(`${API_BASE}/study-boards/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch board');
    return res.json();
  },

  async createBoard(name: string) {
    const res = await fetch(`${API_BASE}/study-boards`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create board');
    return res.json();
  },

  async updateBoardData(id: string, data: any, version: number = 0) {
    const res = await fetch(`${API_BASE}/study-boards/${id}/data`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, version }),
    });
    if (!res.ok) throw new Error('Failed to update board data');
    return res.json();
  },

  async deleteBoard(id: string) {
    const res = await fetch(`${API_BASE}/study-boards/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete board');
    return res.text();
  }
};

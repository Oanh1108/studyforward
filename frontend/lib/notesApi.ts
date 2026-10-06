const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface StudyNote {
  id: number;
  userId: number;
  content: string;
  targetType?: 'vocab' | 'lesson' | 'video' | 'general' | null;
  targetId?: string | null;
  targetName?: string | null;
  timestamp?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const notesApi = {
  async getMyNotes(search?: string): Promise<StudyNote[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/api/notes${query}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async createNote(data: Partial<StudyNote>): Promise<StudyNote> {
    const res = await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },

  async updateNote(id: number, content: string): Promise<StudyNote> {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  async deleteNote(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to delete note');
  }
};

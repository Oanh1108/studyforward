const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LearningPath {
  id: number;
  userId: number;
  title: string;
  description?: string;
  goal?: string;
  expectedLevel?: string;
  isPrivate: boolean;
  createdAt: string;
  sections?: LearningPathSection[];
}

export interface LearningPathSection {
  id: number;
  pathId: number;
  title: string;
  orderIndex: number;
  items?: LearningPathItem[];
}

export interface LearningPathItem {
  id: number;
  sectionId: number;
  title: string;
  type: 'youtube' | 'vocab' | 'dictation' | 'shadowing';
  referenceId?: string;
  orderIndex: number;
  completed?: boolean;
}

export const learningPathsApi = {
  async getMyPaths(): Promise<LearningPath[]> {
    const res = await fetch(`${API_BASE}/api/learning-paths`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch learning paths');
    return res.json();
  },

  async getPath(id: number): Promise<LearningPath> {
    const res = await fetch(`${API_BASE}/api/learning-paths/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch learning path');
    return res.json();
  },

  async createPath(data: Partial<LearningPath>): Promise<LearningPath> {
    const res = await fetch(`${API_BASE}/api/learning-paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create path');
    return res.json();
  },

  async updatePath(id: number, data: Partial<LearningPath>): Promise<LearningPath> {
    const res = await fetch(`${API_BASE}/api/learning-paths/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update path');
    return res.json();
  },

  async deletePath(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/learning-paths/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to delete path');
  },

  async createSection(pathId: number, title: string): Promise<LearningPathSection> {
    const res = await fetch(`${API_BASE}/api/learning-paths/${pathId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create section');
    return res.json();
  },

  async updateSection(id: number, data: Partial<LearningPathSection>): Promise<LearningPathSection> {
    const res = await fetch(`${API_BASE}/api/learning-paths/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update section');
    return res.json();
  },

  async deleteSection(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/learning-paths/sections/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to delete section');
  },

  async createItem(sectionId: number, data: Partial<LearningPathItem>): Promise<LearningPathItem> {
    const res = await fetch(`${API_BASE}/api/learning-paths/sections/${sectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  async updateItem(id: number, data: Partial<LearningPathItem>): Promise<LearningPathItem> {
    const res = await fetch(`${API_BASE}/api/learning-paths/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/learning-paths/items/${id}`, { method: 'DELETE', headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  async markItemCompleted(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/learning-paths/items/${id}/complete`, { method: 'POST', headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to mark item completed');
  },

  async unmarkItemCompleted(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/learning-paths/items/${id}/complete`, { method: 'DELETE', headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to unmark item completed');
  }
};

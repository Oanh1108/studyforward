const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface TodoItem {
  id: number;
  userId: number;
  title: string;
  note?: string | null;
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  linkedType?: string | null;
  linkedId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const todosApi = {
  async getMyTodos(): Promise<TodoItem[]> {
    const res = await fetch(`${API_BASE}/api/todos`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch todos');
    return res.json();
  },

  async createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create todo');
    return res.json();
  },

  async updateTodo(id: number, data: Partial<TodoItem>): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update todo');
    return res.json();
  },

  async deleteTodo(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/todos/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to delete todo');
  }
};

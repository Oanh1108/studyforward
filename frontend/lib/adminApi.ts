export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalLockedUsers: number;
  totalFolders: number;
  totalCustomWords: number;
  totalCurriculumWords: number;
  totalStudyRecords: number;
  recentLogs: AdminLogItem[];
}

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isLocked: boolean;
  goal: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminLogItem {
  id: number;
  adminId: number;
  adminEmail: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}

export interface CurriculumVocabItem {
  id: number;
  course: 'toeic' | 'ielts';
  topic: string;
  word: string;
  language?: string;
  reading?: string;
  phonetic?: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  partOfSpeech: string;
  meaning: string;
  example?: string;
  exampleEn?: string;
  exampleTranslation?: string;
  exampleVi?: string;
  imageUrl?: string;
  frequency?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002');

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

async function requestAdminApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `Yêu cầu thất bại (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export const adminApi = {
  // Stats
  async getStats(): Promise<AdminStats> {
    return requestAdminApi<AdminStats>('/api/admin/stats');
  },

  // Users
  async getUsers(params: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: AdminUserItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (params.search && params.search.trim()) q.append('search', params.search.trim());
    if (params.role && params.role !== 'all') q.append('role', params.role);
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));

    return requestAdminApi(`/api/admin/users?${q.toString()}`);
  },

  async setUserLock(id: number, isLocked: boolean): Promise<{ success: boolean; user: AdminUserItem; message: string }> {
    return requestAdminApi(`/api/admin/users/${id}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ isLocked }),
    });
  },

  async setUserRole(id: number, role: 'admin' | 'user'): Promise<{ success: boolean; user: AdminUserItem; message: string }> {
    return requestAdminApi(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    return requestAdminApi(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Shared Curriculum Vocabulary
  async getCurriculumVocab(params: {
    search?: string;
    topic?: string;
    course?: string;
    language?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ words: CurriculumVocabItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (params.search && params.search.trim()) q.append('search', params.search.trim());
    if (params.topic && params.topic !== 'all') q.append('topic', params.topic);
    if (params.course) q.append('course', params.course);
    if (params.language && params.language !== 'all') q.append('language', params.language);
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));

    return requestAdminApi(`/api/admin/curriculum-vocab?${q.toString()}`);
  },

  async createCurriculumWord(dto: {
    course?: 'toeic' | 'ielts';
    topic: string;
    word: string;
    meaning: string;
    language?: string;
    reading?: string;
    ipa?: string;
    pinyin?: string;
    kana?: string;
    romaji?: string;
    romaja?: string;
    thaiReading?: string;
    partOfSpeech?: string;
    example?: string;
    exampleEn?: string;
    exampleTranslation?: string;
    exampleVi?: string;
  }): Promise<CurriculumVocabItem> {
    return requestAdminApi('/api/admin/curriculum-vocab', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateCurriculumWord(id: number, dto: Partial<CurriculumVocabItem>): Promise<CurriculumVocabItem> {
    return requestAdminApi(`/api/admin/curriculum-vocab/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteCurriculumWord(id: number): Promise<{ success: boolean; message: string }> {
    return requestAdminApi(`/api/admin/curriculum-vocab/${id}`, {
      method: 'DELETE',
    });
  },

  // Audit Logs
  async getAuditLogs(params: { page?: number; limit?: number } = {}): Promise<{
    logs: AdminLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const q = new URLSearchParams();
    if (params.page) q.append('page', String(params.page));
    if (params.limit) q.append('limit', String(params.limit));

    return requestAdminApi(`/api/admin/logs?${q.toString()}`);
  },
};

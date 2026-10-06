import { SpeakingHistory } from '@/components/learning/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SpeakingPromptData {
  id: string;
  topic: string;
  level: string;
  language: string;
  sentence: string;
  ipa: string;
  meaningVi: string;
  hint: string;
  audioKey?: string;
  orderIndex: number;
}

export interface SpeakingHistoryData extends SpeakingHistory {
  userId: number;
  language: string;
  sessionId?: string;
  promptId?: string;
  createdAt: string;
}

export interface SpeakingTopicData {
  title: string;
  levels: string[];
  sentenceCount: number;
}

export interface SpeakingStatData {
  topic: string;
  level: string;
  count: number;
}

export interface SpeakingSessionData {
  id: string;
  userId: number;
  topic: string;
  level: string;
  mode: string;
  totalSentences: number;
  currentIndex: number;
  promptIds: string[];
  isCompleted: boolean;
}

export const speakingApi = {
  async getTopics(language: string = 'en'): Promise<SpeakingTopicData[]> {
    const res = await fetch(`${API_BASE}/api/speaking/topics?language=${encodeURIComponent(language)}`, {
      headers: { ...getAuthHeader() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Không thể tải danh sách chủ đề');
    return res.json();
  },

  async getStats(language: string = 'en'): Promise<{ stats: SpeakingStatData[], missing: any[], totalMissing: number }> {
    const res = await fetch(`${API_BASE}/api/speaking/stats?language=${encodeURIComponent(language)}`, {
      headers: { ...getAuthHeader() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Không thể tải thống kê');
    return res.json();
  },

  async seedAiPrompts(topic: string, level: string, language: string = 'en'): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/speaking/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify({ topic, level, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi tạo dữ liệu');
    }
    return res.json();
  },

  async createSession(data: {
    language: string;
    topic: string;
    level: string;
    mode: string; // 'read' or 'translate'
    requestedCount: number;
  }): Promise<SpeakingSessionData> {
    const res = await fetch(`${API_BASE}/api/speaking/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tạo phiên luyện nói');
    }
    return res.json();
  },

  async getSession(sessionId: string): Promise<{ session: SpeakingSessionData; prompts: SpeakingPromptData[] }> {
    const res = await fetch(`${API_BASE}/api/speaking/sessions/${sessionId}`, {
      headers: { ...getAuthHeader() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Không thể tải phiên luyện nói');
    return res.json();
  },

  async getActiveSessions(): Promise<SpeakingSessionData[]> {
    const res = await fetch(`${API_BASE}/api/speaking/sessions`, {
      headers: { ...getAuthHeader() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Không thể tải danh sách phiên đang học');
    return res.json();
  },

  async updateSessionProgress(sessionId: string, newIndex: number): Promise<SpeakingSessionData> {
    const res = await fetch(`${API_BASE}/api/speaking/sessions/${sessionId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify({ newIndex }),
    });
    if (!res.ok) throw new Error('Không thể cập nhật tiến độ');
    return res.json();
  },

  async evaluateTranscript(data: {
    transcript: string;
    targetSentence: string;
    targetLanguage: string;
    meaningVi: string;
    mode: string;
  }): Promise<{ score: number; fluency: number; pronunciation: number; feedback: string }> {
    const res = await fetch(`${API_BASE}/api/speaking/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      try {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lỗi khi phân tích giọng nói với AI');
      } catch (e: any) {
        throw new Error(e.message || 'Lỗi khi phân tích giọng nói với AI');
      }
    }
    return res.json();
  },

  async getPrompts(language: string = 'en'): Promise<SpeakingPromptData[]> {
    const res = await fetch(`${API_BASE}/api/speaking/prompts?language=${encodeURIComponent(language)}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải danh sách mẫu câu');
    }
    return res.json();
  },

  async getHistory(language?: string): Promise<SpeakingHistoryData[]> {
    const params = new URLSearchParams();
    if (language) params.append('language', language);

    const res = await fetch(`${API_BASE}/api/speaking/history?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải lịch sử luyện nói');
    }
    return res.json();
  },

  async recordHistory(data: {
    sessionId?: string;
    promptId?: string;
    sentence: string;
    score: number;
    fluency: number;
    pronunciation: number;
    feedback: string;
    language?: string;
  }): Promise<SpeakingHistoryData> {
    const res = await fetch(`${API_BASE}/api/speaking/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể lưu kết quả luyện nói');
    }
    return res.json();
  },
};

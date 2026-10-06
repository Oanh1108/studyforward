import { Lesson } from '@/components/learning/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LessonData extends Lesson {
  language: string;
  orderIndex: number;
}

export const coursesApi = {
  async getLessons(level?: string, skill?: string, language?: string): Promise<LessonData[]> {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    if (skill && skill !== 'all') params.append('skill', skill);
    if (language) params.append('language', language);

    const res = await fetch(`${API_BASE}/api/courses/lessons?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải danh sách bài học');
    }
    return res.json();
  },

  async updateProgress(lessonId: string, progress: number): Promise<void> {
    await fetch(`${API_BASE}/api/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify({ progress }),
    });
  },

  async completeLesson(
    lessonId: string,
    score: number = 100,
    stars: number = 3,
  ): Promise<{
    success: boolean;
    earnedXp: number;
    isFirstTimeCompleted: boolean;
    totalXp: number;
    streakDays: number;
  }> {
    const res = await fetch(`${API_BASE}/api/courses/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify({ score, stars }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể lưu kết quả bài học');
    }
    return res.json();
  },
};

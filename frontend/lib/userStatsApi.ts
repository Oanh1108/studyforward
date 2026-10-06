import { UserStats } from '@/components/learning/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface WeeklyDayData {
  day: string;
  date: string;
  completed: boolean;
  active: boolean;
}

export interface BackendUserStats extends UserStats {
  email: string;
  role: string;
  coverImage?: string;
  hasPassword?: boolean;
  vocabVisibilityConfig?: string;
  weeklyDays: WeeklyDayData[];
}

export const userStatsApi = {
  async getMyStats(language?: string): Promise<BackendUserStats> {
    const params = new URLSearchParams();
    if (language) params.append('language', language);

    const res = await fetch(`${API_BASE}/api/users/me/stats?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải thông tin thống kê người dùng');
    }
    return res.json();
  },

  async updateProfile(data: {
    name?: string;
    avatar?: string;
    coverImage?: string;
    currentLevel?: string;
    dailyGoalMinutes?: number;
    reminderEnabled?: boolean;
    reminderTime?: string;
    vocabVisibilityConfig?: string;
    weeklyTargetDays?: number;
    studyPurpose?: string;
  }): Promise<void> {
    const res = await fetch(`${API_BASE}/api/users/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật hồ sơ');
    }
  },

  async logActivity(data: { minutes: number; xp?: number; wordsCount?: number }): Promise<void> {
    await fetch(`${API_BASE}/api/users/me/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  },

  async getActivityHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/users/me/activity-history`, {
      headers: { ...getAuthHeader() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch activity history');
    return res.json();
  },
};

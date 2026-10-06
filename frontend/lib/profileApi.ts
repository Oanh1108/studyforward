const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const profileApi = {
  /** Upload avatar image; returns { avatarUrl } */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
        : null;
    if (!token) throw new Error('Chưa đăng nhập');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/auth/upload/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Tải ảnh lên thất bại');
    }
    return res.json();
  },

  /** Upload cover image; returns { coverUrl } */
  async uploadCover(file: File): Promise<{ coverUrl: string }> {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
        : null;
    if (!token) throw new Error('Chưa đăng nhập');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/auth/upload/cover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Tải ảnh nền lên thất bại');
    }
    return res.json();
  },

  /** Change password when logged in */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Đổi mật khẩu thất bại');
    }
  },
};

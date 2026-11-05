const API_BASE = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const mediaApi = {
  async getUserVideos() {
    const res = await fetch(`${API_BASE}/api/media/youtube`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to load videos');
    return res.json();
  },

  async saveVideoLesson(data: { youtubeVideoId: string; title: string; transcriptData: string; scoreCorrect?: number; scoreTotal?: number }) {
    const res = await fetch(`${API_BASE}/api/media/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save video lesson');
    return res.json();
  },

  async fetchTranscript(videoId: string) {
    const res = await fetch(`${API_BASE}/api/media/youtube/fetch-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ videoId }),
    });
    if (!res.ok) {
      // The backend answers { message, code }: surface the readable message, not the raw JSON
      const body = await res.json().catch(() => null);
      throw Object.assign(new Error(body?.message || 'Không lấy được phụ đề tự động.'), { code: body?.code as string | undefined });
    }
    return res.json();
  },

  async deleteVideoLesson(id: number) {
    const res = await fetch(`${API_BASE}/api/media/youtube/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete video lesson');
    return res.json();
  }
};

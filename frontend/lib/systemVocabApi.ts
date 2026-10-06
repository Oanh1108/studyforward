const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SystemWord {
  id: number;
  word: string;
  meaning: string;
  partOfSpeech: string;
  phonetic: string | null;
  example: string;
  exampleTranslation: string | null;
  topic: string;
  course: string;
  frequency: number;
}

export const systemVocabApi = {
  async getTopics(course: string = 'toeic'): Promise<string[]> {
    const res = await fetch(`${API_BASE}/api/vocabulary/topics?course=${course}`);
    if (!res.ok) throw new Error('Failed to load topics');
    return res.json();
  },

  async getWords(topic: string, course: string = 'toeic'): Promise<SystemWord[]> {
    const res = await fetch(`${API_BASE}/api/vocabulary/words?course=${course}&topic=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error('Failed to load words');
    return res.json();
  },

  async searchWords(q: string, course: string = 'toeic'): Promise<SystemWord[]> {
    const res = await fetch(`${API_BASE}/api/vocabulary/search?course=${course}&q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to search words');
    return res.json();
  },

  async addToMyNotebook(word: SystemWord, folderId?: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/vocabulary/my-words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        folderId: folderId || null,
        word: word.word,
        meaning: word.meaning,
        ipa: word.phonetic,
        partOfSpeech: word.partOfSpeech,
        example: word.example,
        exampleTranslation: word.exampleTranslation,
      }),
    });
    if (!res.ok) throw new Error('Failed to add word to notebook');
  }
};

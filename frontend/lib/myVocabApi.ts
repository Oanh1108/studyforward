import { SupportedLanguage } from './languages';

export interface VocabularyFolder {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  color: string;
  wordCount: number;
  language: SupportedLanguage;
  createdAt: string;
  updatedAt?: string;
}

export interface MyVocabularyWord {
  id: number;
  userId: number;
  folderId?: number | null;
  listName: string;
  language: SupportedLanguage;
  word: string;
  meaning: string;
  reading?: string | null;
  ipa?: string | null;
  pinyin?: string | null;
  kana?: string | null;
  romaji?: string | null;
  romaja?: string | null;
  thaiReading?: string | null;
  partOfSpeech?: string | null;
  synonyms?: string | null;
  antonyms?: string | null;
  example?: string | null;
  exampleTranslation?: string | null;
  notes?: string | null;
  status: 'new' | 'learning' | 'mastered';
  stage: number;
  intervalDays: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MeaningSuggestion {
  meaning: string;
  partOfSpeech: string;
  reading?: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  example: string;
  exampleTranslation: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface SuggestResponse {
  word: string;
  targetLanguage: string;
  detectedLanguage?: string;
  languageWarning?: string | null;
  suggestions: MeaningSuggestion[];
}

export interface BulkImportPayload {
  folderId?: number | null;
  newFolderName?: string;
  language?: SupportedLanguage;
  items: Array<{
    word: string;
    meaning?: string;
    partOfSpeech?: string;
    synonyms?: string | string[];
    antonyms?: string | string[];
    reading?: string;
    ipa?: string;
    pinyin?: string;
    kana?: string;
    romaji?: string;
    romaja?: string;
    thaiReading?: string;
    example?: string;
    exampleTranslation?: string;
    notes?: string;
    folderName?: string;
  }>;
  duplicateStrategy?: 'skip' | 'update' | 'keep_both';
}

export interface ReanalyzeCandidate {
  id: number;
  originalWord: string;
  cleanWord: string;
  originalPos: string | null;
  newPos: string | null;
  originalSynonyms: string | null;
  newSynonyms: string | null;
  originalAntonyms: string | null;
  newAntonyms: string | null;
  originalFolderId: number | null;
  currentListName: string;
  targetFolderName: string | null;
  needsReview?: boolean;
  reviewReason?: string;
  changeTypes: string[];
}


export interface BulkImportResponse {
  success: boolean;
  added: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; word: string; error: string }>;
  folderId?: number | null;
  folderName?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

async function requestApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

export const myVocabApi = {
  // Folder API
  async getFolders(language?: string): Promise<{ folders: VocabularyFolder[]; unassignedCount: number; totalFolders: number }> {
    const q = language ? `?language=${encodeURIComponent(language)}` : "";
    return requestApi<{ folders: VocabularyFolder[]; unassignedCount: number; totalFolders: number }>(`/api/vocabulary/folders${q}`);
  },

  async createFolder(data: { name: string; description?: string; color?: string; language?: SupportedLanguage }): Promise<VocabularyFolder> {
    return requestApi<VocabularyFolder>('/api/vocabulary/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFolder(id: number, data: { name?: string; description?: string; color?: string; language?: SupportedLanguage }): Promise<VocabularyFolder> {
    return requestApi<VocabularyFolder>(`/api/vocabulary/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteFolder(id: number): Promise<{ success: boolean; deletedFolderId: number; deletedWordsCount: number; message: string }> {
    return requestApi<{ success: boolean; deletedFolderId: number; deletedWordsCount: number; message: string }>(`/api/vocabulary/folders/${id}`, {
      method: 'DELETE',
    });
  },

  // Words API
  async getMyWords(params: {
    folderId?: string | number;
    folderIds?: string;
    status?: string;
    search?: string;
    language?: string;
  } = {}): Promise<MyVocabularyWord[]> {
    const q = new URLSearchParams();
    if (params.folderId !== undefined) q.append('folderId', String(params.folderId));
    if (params.folderIds) q.append('folderIds', params.folderIds);
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.search && params.search.trim()) q.append('search', params.search.trim());
    if (params.language) q.append('language', params.language);

    return requestApi<MyVocabularyWord[]>(`/api/vocabulary/my-words?${q.toString()}`);
  },

  async addMyWord(data: {
    folderId?: number | null;
    language?: SupportedLanguage;
    word: string;
    meaning: string;
    reading?: string;
    ipa?: string;
    pinyin?: string;
    kana?: string;
    romaji?: string;
    romaja?: string;
    thaiReading?: string;
    partOfSpeech?: string;
    synonyms?: string;
    antonyms?: string;
    example?: string;
    exampleTranslation?: string;
    notes?: string;
    allowDuplicate?: boolean;
  }): Promise<{ isDuplicate: boolean; item: MyVocabularyWord; message: string; existingId?: number }> {
    return requestApi<{ isDuplicate: boolean; item: MyVocabularyWord; message: string; existingId?: number }>('/api/vocabulary/my-words', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMyWord(id: number, data: Partial<MyVocabularyWord>): Promise<MyVocabularyWord> {
    return requestApi<MyVocabularyWord>(`/api/vocabulary/my-words/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async moveMyWord(id: number, targetFolderId: number | null): Promise<MyVocabularyWord> {
    return requestApi<MyVocabularyWord>(`/api/vocabulary/my-words/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ targetFolderId }),
    });
  },

  async deleteMyWord(id: number): Promise<{ success: boolean; message: string }> {
    return requestApi<{ success: boolean; message: string }>(`/api/vocabulary/my-words/${id}`, {
      method: 'DELETE',
    });
  },

  async recordWordStudy(id: number, ratingOrRemembered: boolean | string | number): Promise<MyVocabularyWord> {
    const isBool = typeof ratingOrRemembered === 'boolean';
    return requestApi<MyVocabularyWord>(`/api/vocabulary/my-words/${id}/study`, {
      method: 'POST',
      body: JSON.stringify({
        rating: ratingOrRemembered,
        remembered: isBool ? ratingOrRemembered : ratingOrRemembered === 3 || ratingOrRemembered === 4 || ratingOrRemembered === 'good' || ratingOrRemembered === 'easy',
      }),
    });
  },

  async evaluateQuiz(payload: {
    wordId: number;
    selections: {
      meaning: string[];
      synonym: string[];
      antonym: string[];
    };
    recordSrs?: boolean;
  }) {
    return requestApi<{
      success: boolean;
      isPerfect: boolean;
      meaning: { isCorrect: boolean; missing: string[]; wrong: string[] };
      synonym: { isCorrect: boolean; missing: string[]; wrong: string[] };
      antonym: { isCorrect: boolean; missing: string[]; wrong: string[] };
    }>('/api/vocabulary/study/quiz-evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async completeStudySession(payload: {
    sessionId: string;
    mode: string;
    language?: string;
    folderIds?: string | number[] | null;
    totalWords: number;
    correctCount: number;
    durationSeconds: number;
      isCompleted?: boolean;
    details?: Array<{
      wordId: number;
      rating?: string | number;
      isCorrect: boolean;
      userAnswer?: string;
    }>;
  }): Promise<{
    success: boolean;
    alreadyProcessed: boolean;
    session: any;
    xpEarned: number;
    stats?: any;
  }> {
    return requestApi('/api/vocabulary/study/session-complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  
    async getStudySession(id: string): Promise<any> {
    return requestApi<any>(`/api/vocabulary/study/sessions/${id}`);
  },

  async getIncompleteStudySessions(language?: string): Promise<any[]> {
    const q = language ? `?language=${encodeURIComponent(language)}` : "";
    return requestApi<any[]>(`/api/vocabulary/study/incomplete-sessions${q}`);
  },

  async getRecentStudySession(): Promise<any> {
    return requestApi('/api/vocabulary/study/recent-session');
  },

  async bulkImport(data: BulkImportPayload): Promise<BulkImportResponse> {
    return requestApi<BulkImportResponse>('/api/vocabulary/my-words/bulk-import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // AI & Dictionary suggestions
  async suggestMeanings(word: string, language?: string, context?: string): Promise<SuggestResponse> {
    const raw = await requestApi<any>('/api/vocabulary/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ word, language, context }),
    });
    // Trả về đối tượng SuggestResponse chuẩn
    if (Array.isArray(raw)) {
      return {
        word,
        targetLanguage: language || 'en',
        suggestions: raw,
      };
    }
    return raw;
  },

  async enrichBatch(items: Array<{ word: string; meaning?: string; example?: string }>, language?: string): Promise<
    Array<{
      index: number;
      ipa?: string;
      reading?: string;
      pinyin?: string;
      kana?: string;
      romaji?: string;
      romaja?: string;
      thaiReading?: string;
      partOfSpeech?: string;
      synonyms?: string[];
      antonyms?: string[];
      meaning?: string;
      example?: string;
      exampleTranslation?: string;
    }>
  > {
    return requestApi<
      Array<{
        index: number;
        ipa?: string;
        reading?: string;
        pinyin?: string;
        kana?: string;
        romaji?: string;
        romaja?: string;
        thaiReading?: string;
        partOfSpeech?: string;
        synonyms?: string[];
        antonyms?: string[];
        meaning?: string;
        example?: string;
        exampleTranslation?: string;
      }>
    >('/api/vocabulary/ai/enrich-batch', {
      method: 'POST',
      body: JSON.stringify({ items, language }),
    });
  },

  async reanalyzePreview(language?: string): Promise<{
    candidates: ReanalyzeCandidate[];
    totalScanned: number;
    totalCandidates: number;
  }> {
    const q = language && language !== 'all' ? `?language=${encodeURIComponent(language)}` : "";
    return requestApi<{
      candidates: ReanalyzeCandidate[];
      totalScanned: number;
      totalCandidates: number;
    }>(`/api/vocabulary/my-words/reanalyze/preview${q}`);
  },

  async reanalyzeApply(itemIds: number[]): Promise<{
    success: boolean;
    updatedCount: number;
  }> {
    return requestApi<{
      success: boolean;
      updatedCount: number;
    }>('/api/vocabulary/my-words/reanalyze/apply', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  },
};


export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequest {
  scenarioId: string;
  scenarioTag: string;
  scenarioTitle?: string;
  messages?: ChatMessage[];
  userMessage?: string;
  userLevel?: string;
}

export interface ChatSuggestion {
  en: string;
  vi: string;
}

export interface ChatVocabulary {
  word: string;
  ipa: string;
  meaning: string;
}

export interface ChatFeedback {
  correction?: string;
  tip?: string;
}

export interface ChatResponse {
  reply: string;
  replyVi: string;
  suggestions: ChatSuggestion[];
  vocabulary: ChatVocabulary[];
  feedback?: ChatFeedback;
  modelUsed?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const communicationApi = {
  async chat(req: ChatRequest): Promise<ChatResponse> {
    // 1. Try local/configured API backend first
    try {
      const res = await fetch(`${API_BASE}/api/communication/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(req),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Backend might be offline or cross-origin blocked, fall through to Next.js route
    }

    // 2. Fallback to Next.js serverless route
    const fallbackRes = await fetch('/api/communication/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!fallbackRes.ok) {
      const errText = await fallbackRes.text();
      throw new Error(`Hội thoại AI thất bại: ${fallbackRes.statusText || errText}`);
    }

    return await fallbackRes.json();
  },
};


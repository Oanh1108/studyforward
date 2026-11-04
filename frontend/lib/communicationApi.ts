const API_BASE = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');

export type ConvMode = 'free' | 'roleplay' | 'daily';
export type ConvLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type CorrectionMode = 'gentle' | 'detailed' | 'none';

export interface VocabItem { term: string; meaning: string }
export interface MessageFeedback { original: string; corrected: string; explanation: string; vocabulary: VocabItem[] }
export interface ConvMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  inputType: 'text' | 'voice';
  meta: { suggestions?: string[]; vocabulary?: VocabItem[]; phrases?: string[] } | null;
  createdAt: string;
  feedback: MessageFeedback | null;
}
export interface ConvSession {
  id: string; mode: ConvMode; topic: string; level: ConvLevel; correctionMode: CorrectionMode;
  status: 'active' | 'completed'; startedAt: string;
}
export interface TopicOption { id: string; label: string; labelVi: string }
export interface CommunicationStatus {
  aiConfigured: boolean;
  provider: string;
  levels: ConvLevel[];
  topics: TopicOption[];
  scenarios: TopicOption[];
}
export interface SessionResult {
  sessionId: string; mode: ConvMode; topic: string; level: ConvLevel;
  durationSeconds: number; userTurns: number;
  summary: {
    commonMistakes: { original: string; corrected: string; note: string }[];
    betterExpressions: { original: string; better: string }[];
    newVocabulary: VocabItem[];
    nextSteps: string[];
    encouragement: string;
  } | null;
  summaryError: string | null;
}
export interface SessionListItem { id: string; mode: ConvMode; topic: string; level: ConvLevel; status: 'active' | 'completed'; startedAt: string }

/** `code` distinguishes a missing server configuration (for admins) from a transient AI outage. */
export class CommunicationApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/communication${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new CommunicationApiError('Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.', 0, 'NETWORK');
  }
  if (!res.ok) {
    let message = `Yêu cầu thất bại (${res.status})`;
    let code: string | undefined;
    try {
      const j = await res.json();
      message = Array.isArray(j.message) ? j.message.join(', ') : j.message || message;
      code = j.code;
    } catch { /* keep default */ }
    if (res.status === 401) code = 'UNAUTHENTICATED';
    throw new CommunicationApiError(message, res.status, code);
  }
  return res.json();
}

export const communicationApi = {
  status: () => request<CommunicationStatus>('/status'),
  listSessions: () => request<SessionListItem[]>('/sessions'),
  createSession: (body: { mode: ConvMode; topic: string; level: ConvLevel; correctionMode: CorrectionMode }) =>
    request<{ session: ConvSession; messages: ConvMessage[] }>('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  getSession: (id: string) => request<{ session: ConvSession; messages: ConvMessage[] }>(`/sessions/${id}`),
  sendMessage: (id: string, content: string, inputType: 'text' | 'voice') =>
    request<{ userMessage: ConvMessage; assistantMessage: ConvMessage }>(`/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, inputType }),
    }),
  transcribe: (id: string, audioBase64: string, mimeType: string) =>
    request<{ transcript: string }>(`/sessions/${id}/audio`, { method: 'POST', body: JSON.stringify({ audio: audioBase64, mimeType }) }),
  complete: (id: string) => request<SessionResult>(`/sessions/${id}/complete`, { method: 'POST' }),
};

/** Turns an API failure into something the learner (or the admin) can act on. */
export function friendlyError(e: unknown): { text: string; adminProblem: boolean; retryable: boolean } {
  if (e instanceof CommunicationApiError) {
    if (e.code === 'AI_NOT_CONFIGURED') return { text: e.message, adminProblem: true, retryable: false };
    if (e.code === 'UNAUTHENTICATED') return { text: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.', adminProblem: false, retryable: false };
    if (e.code === 'NETWORK' || e.code === 'AI_UNAVAILABLE' || e.code === 'AI_BAD_RESPONSE' || e.status >= 500) {
      return { text: e.code === 'NETWORK' ? e.message : 'AI đang bận hoặc gặp sự cố tạm thời. Bạn thử lại sau ít giây nhé.', adminProblem: false, retryable: true };
    }
    return { text: e.message, adminProblem: false, retryable: false };
  }
  return { text: 'Đã xảy ra lỗi không mong muốn.', adminProblem: false, retryable: true };
}

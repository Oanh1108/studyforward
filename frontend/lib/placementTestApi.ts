const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002');

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

export interface PlacementQuestion {
  id: number;
  type: 'vocab' | 'grammar' | 'reading';
  question: string;
  options: string[];
  passage?: string;
}

export interface PlacementTestResult {
  id: number;
  userId: number;
  totalScore: number;
  maxScore: number;
  vocabScore: number;
  grammarScore: number;
  readingScore: number;
  estimatedLevel: string;
  recommendedAction: string;
  createdAt: string;
}

export const placementTestApi = {
  async getQuestions(): Promise<PlacementQuestion[]> {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/api/placement-test/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  },

  async submitTest(answers: { questionId: number; selectedAnswerIndex: number }[]): Promise<PlacementTestResult> {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/api/placement-test/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to submit test');
    return res.json();
  },

  async getHistory(): Promise<PlacementTestResult[]> {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/api/placement-test/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },
};

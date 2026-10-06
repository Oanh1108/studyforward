export type ActiveTab = 'dashboard' | 'courses' | 'paths' | 'vocabulary' | 'speaking' | 'dictation' | 'analytics' | 'notes' | 'todos' | 'focus' | 'profile' | 'admin' | 'srs' | 'my-vocab' | 'vocabulary_study' | 'discover' | 'study_board';

export type SkillType = 'all' | 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';

export type CourseLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'Business';

export interface Lesson {
  id: string;
  unit: number;
  title: string;
  subtitle: string;
  durationMin: number;
  xpReward: number;
  skill: 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';
  level: CourseLevel;
  status: 'completed' | 'in_progress' | 'locked';
  score?: number; // e.g. 100%
  stars?: number; // 1-3
  progress?: number; // 0-100%
}

export interface FlashcardWord {
  id: string;
  word: string;
  type: string;
  ipa: string;
  meaning: string;
  exampleEn: string;
  exampleVi: string;
  collocation: string;
  topic: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  state: 'new' | 'learning' | 'mastered';
}

export interface SpeakingPrompt {
  id: string;
  topic: string;
  level: string;
  language: string;
  sentence: string;
  ipa: string;
  meaningVi: string;
  hint: string;
  audioKey?: string;
}

export interface SpeakingHistory {
  id: string | number;
  sentence: string;
  score: number;
  fluency: number;
  pronunciation: number;
  timestamp?: string;
  createdAt?: string;
  feedback: string;
}

export interface UserStats {
  name: string;
  avatar: string;
  currentLevel: string;
  streakDays: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  totalHours: number;
  wordsLearned: number;
  totalWordsGoal: number;
  xpPoints: number;
  weeklyTargetDays: number;
  weeklyCompletedDays: number;
  reminderEnabled: boolean;
  reminderTime: string;
  studyPurpose?: string;
  weeklyDays?: {
    day: string;
    date: string;
    completed: boolean;
    active: boolean;
    minutes?: number;
  }[];
}

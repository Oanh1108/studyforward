import type { TranscriptSegment } from './youtubeUtils.ts';

export type YouTubeLessonMode = 'setup' | 'practice' | 'result';
export type YouTubePracticeType = 'dictation' | 'shadowing';

/** What is kept so a reload brings the YouTube lesson back where it was. */
export interface SavedYouTubeLesson {
  practiceType: YouTubePracticeType;
  videoUrl: string;
  videoId: string | null;
  rawTranscript: string;
  segments: TranscriptSegment[];
  lessonTitle: string;
  mode: YouTubeLessonMode;
  currentSegmentIndex: number;
  score: { correct: number; total: number };
  wrongSegments: number[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isSegment = (s: unknown): s is TranscriptSegment =>
  isObject(s) && typeof s.id === 'string' && typeof s.text === 'string' && typeof s.startTime === 'number' && typeof s.endTime === 'number';

/** Returns a usable saved lesson, or undefined. A lesson that is running but has lost its video or sentences goes back to setup. */
export function sanitizeYouTubeLesson(raw: unknown, fallbackType: YouTubePracticeType): SavedYouTubeLesson | undefined {
  if (!isObject(raw)) return undefined;
  const segments = Array.isArray(raw.segments) ? raw.segments.filter(isSegment) : [];
  const videoId = typeof raw.videoId === 'string' && raw.videoId ? raw.videoId : null;
  const wanted: YouTubeLessonMode = raw.mode === 'practice' || raw.mode === 'result' ? raw.mode : 'setup';
  const mode: YouTubeLessonMode = wanted !== 'setup' && (!videoId || segments.length === 0) ? 'setup' : wanted;
  const index = typeof raw.currentSegmentIndex === 'number' ? Math.floor(raw.currentSegmentIndex) : 0;
  const score = isObject(raw.score) && typeof raw.score.correct === 'number' && typeof raw.score.total === 'number' ? { correct: raw.score.correct, total: raw.score.total } : { correct: 0, total: 0 };
  return {
    practiceType: raw.practiceType === 'dictation' || raw.practiceType === 'shadowing' ? raw.practiceType : fallbackType,
    videoUrl: typeof raw.videoUrl === 'string' ? raw.videoUrl : '',
    videoId,
    rawTranscript: typeof raw.rawTranscript === 'string' ? raw.rawTranscript : '',
    segments,
    lessonTitle: typeof raw.lessonTitle === 'string' && raw.lessonTitle ? raw.lessonTitle : 'YouTube Practice',
    mode,
    currentSegmentIndex: segments.length ? Math.min(Math.max(index, 0), segments.length - 1) : 0,
    score,
    wrongSegments: Array.isArray(raw.wrongSegments) ? raw.wrongSegments.filter((n): n is number => typeof n === 'number') : [],
  };
}

import type { PracticeSegment, PracticeSpec, SegmentOutcome } from './practice.ts';
import { TOEIC_TESTS } from './toeic/index.ts';
import type { ToeicPart } from './toeic/types.ts';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function isPracticeSpec(v: unknown): v is PracticeSpec {
  if (!isObject(v) || typeof v.title !== 'string' || !Array.isArray(v.segments) || v.segments.length === 0) return false;
  return v.segments.every((s) => isObject(s) && typeof s.id === 'string' && typeof s.text === 'string');
}

export interface ActivePractice {
  spec: PracticeSpec;
  run: number;
}

export function sanitizeActivePractice(raw: unknown): ActivePractice | null | undefined {
  if (raw === null) return null;
  if (!isObject(raw) || !isPracticeSpec(raw.spec) || typeof raw.run !== 'number') return undefined;
  return { spec: raw.spec, run: raw.run };
}

/** Where the TOEIC browser is: the list of tests or inside one. */
export interface SavedToeicNav {
  testId: string | null;
  part: ToeicPart;
  year?: number;
}

export function sanitizeToeicNav(raw: unknown): SavedToeicNav | undefined {
  if (!isObject(raw)) return undefined;
  const part = raw.part === 1 || raw.part === 2 || raw.part === 3 || raw.part === 4 ? raw.part : 1;
  const year = typeof raw.year === 'number' ? raw.year : undefined;
  // a test that no longer exists sends the user back to the list instead of an empty page
  const testId = typeof raw.testId === 'string' && TOEIC_TESTS.some((t) => t.id === raw.testId) ? raw.testId : null;
  return { testId, part, year };
}

/** Progress inside a running practice session, so a reload carries on at the same sentence. */
export interface SavedPracticeProgress {
  queueIds: string[];
  index: number;
  input: string;
  outcomes: SegmentOutcome[];
  finished: boolean;
}

export const practiceStorageKey = (spec: PracticeSpec) => `dictation:practice:${spec.title}|${spec.subtitle ?? ''}`;

/** Restores a saved session onto the spec's sentences; undefined when it does not fit (changed data, junk). */
export function restorePracticeProgress(spec: PracticeSpec, raw: unknown): { queue: PracticeSegment[]; index: number; input: string; outcomes: SegmentOutcome[]; finished: boolean } | undefined {
  if (!isObject(raw) || !Array.isArray(raw.queueIds) || raw.queueIds.length === 0) return undefined;
  const byId = new Map(spec.segments.map((s) => [s.id, s]));
  const queue: PracticeSegment[] = [];
  for (const id of raw.queueIds) {
    const segment = typeof id === 'string' ? byId.get(id) : undefined;
    if (!segment) return undefined;
    queue.push(segment);
  }
  const index = typeof raw.index === 'number' && raw.index >= 0 && raw.index < queue.length ? Math.floor(raw.index) : 0;
  const outcomes = Array.isArray(raw.outcomes)
    ? raw.outcomes.filter((o): o is SegmentOutcome => isObject(o) && typeof o.segmentId === 'string' && typeof o.score === 'number')
    : [];
  return { queue, index, input: typeof raw.input === 'string' ? raw.input : '', outcomes, finished: raw.finished === true };
}

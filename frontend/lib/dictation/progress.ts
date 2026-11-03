/** Practice results kept in the browser, so the lists can show what has been done. */

export interface ItemProgress {
  /** Best accuracy so far, 0-100. */
  best: number;
  last: number;
  attempts: number;
  updatedAt: number;
}

export type ProgressMap = Record<string, ItemProgress>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'dictation:progress:v1';
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function recordAttempt(map: ProgressMap, itemId: string, score: number, now: number): ProgressMap {
  const value = clamp(score);
  const previous = map[itemId];
  return {
    ...map,
    [itemId]: {
      best: previous ? Math.max(previous.best, value) : value,
      last: value,
      attempts: (previous?.attempts ?? 0) + 1,
      updatedAt: now,
    },
  };
}

export function summarize(map: ProgressMap, itemIds: string[]): { practised: number; total: number; averageBest: number } {
  const practised = itemIds.filter((id) => map[id]);
  const sum = practised.reduce((n, id) => n + map[id].best, 0);
  return { practised: practised.length, total: itemIds.length, averageBest: practised.length ? Math.round(sum / practised.length) : 0 };
}

const isProgress = (v: unknown): v is ItemProgress =>
  !!v && typeof v === 'object' && ['best', 'last', 'attempts', 'updatedAt'].every((k) => typeof (v as Record<string, unknown>)[k] === 'number');

/**
 * Before progress was saved per test, TOEIC items were stored under bare ids such as "p1-q1", which every test shares.
 * Everything saved that way came from the first test, so it is moved there instead of showing up in all of them.
 */
const LEGACY_TOEIC_KEY = /^p[1-4]-q\d+$/;
const LEGACY_OWNER = 'toeic-2026-test-01';

export function migrateLegacyKeys(map: ProgressMap): ProgressMap {
  const next: ProgressMap = {};
  for (const [key, value] of Object.entries(map)) {
    const target = LEGACY_TOEIC_KEY.test(key) ? `${LEGACY_OWNER}/${key}` : key;
    next[target] = map[target] ?? value;
  }
  return next;
}

export function loadProgress(storage: StorageLike): ProgressMap {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return migrateLegacyKeys(Object.fromEntries(Object.entries(parsed).filter(([, v]) => isProgress(v))) as ProgressMap);
  } catch {
    return {};
  }
}

export function saveProgress(storage: StorageLike, map: ProgressMap): void {
  try {
    storage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Storage is blocked or full: progress just will not persist.
  }
}

/** Combines two maps (this browser's and the server's): highest best, most recent last, highest attempt count. */
export function mergeProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
  const out: ProgressMap = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const mine = out[key];
    if (!mine) {
      out[key] = value;
      continue;
    }
    const newer = value.updatedAt > mine.updatedAt ? value : mine;
    out[key] = {
      best: Math.max(mine.best, value.best),
      last: newer.last,
      attempts: Math.max(mine.attempts, value.attempts),
      updatedAt: Math.max(mine.updatedAt, value.updatedAt),
    };
  }
  return out;
}

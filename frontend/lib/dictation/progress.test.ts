import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordAttempt, summarize, loadProgress, saveProgress, type ProgressMap } from './progress.ts';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
  };
};

test('recordAttempt remembers the best score and counts attempts', () => {
  let map: ProgressMap = {};
  map = recordAttempt(map, 'p3-q32', 60, 1000);
  map = recordAttempt(map, 'p3-q32', 90, 2000);
  map = recordAttempt(map, 'p3-q32', 70, 3000);
  assert.deepEqual(map['p3-q32'], { best: 90, last: 70, attempts: 3, updatedAt: 3000 });
});

test('recordAttempt does not change the map it was given', () => {
  const before: ProgressMap = { a: { best: 50, last: 50, attempts: 1, updatedAt: 1 } };
  const snapshot = JSON.stringify(before);
  recordAttempt(before, 'a', 100, 2);
  recordAttempt(before, 'b', 100, 2);
  assert.equal(JSON.stringify(before), snapshot);
});

test('recordAttempt clamps scores to 0-100', () => {
  assert.equal(recordAttempt({}, 'x', 140, 1).x.best, 100);
  assert.equal(recordAttempt({}, 'x', -5, 1).x.best, 0);
});

test('summarize counts practised items and the average of their best scores', () => {
  const map: ProgressMap = {
    a: { best: 100, last: 100, attempts: 1, updatedAt: 1 },
    b: { best: 50, last: 40, attempts: 2, updatedAt: 1 },
    other: { best: 10, last: 10, attempts: 1, updatedAt: 1 },
  };
  assert.deepEqual(summarize(map, ['a', 'b', 'c']), { practised: 2, total: 3, averageBest: 75 });
  assert.deepEqual(summarize(map, []), { practised: 0, total: 0, averageBest: 0 });
  assert.deepEqual(summarize({}, ['a']), { practised: 0, total: 1, averageBest: 0 });
});

test('saveProgress and loadProgress round-trip', () => {
  const storage = fakeStorage();
  const map = recordAttempt({}, 'toeic-2026-test-03/p1-q1', 80, 5);
  saveProgress(storage, map);
  assert.deepEqual(loadProgress(storage), map);
});

test('loadProgress returns an empty map for missing, corrupt or wrongly shaped data', () => {
  assert.deepEqual(loadProgress(fakeStorage()), {});
  assert.deepEqual(loadProgress(fakeStorage({ 'dictation:progress:v1': '{not json' })), {});
  assert.deepEqual(loadProgress(fakeStorage({ 'dictation:progress:v1': '[1,2,3]' })), {});
  assert.deepEqual(loadProgress(fakeStorage({ 'dictation:progress:v1': JSON.stringify({ a: { best: 'high' }, b: { best: 80, last: 80, attempts: 1, updatedAt: 1 } }) })), {
    b: { best: 80, last: 80, attempts: 1, updatedAt: 1 },
  });
});

test('storage that throws (private mode, blocked) never breaks the page', () => {
  const broken = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadProgress(broken), {});
  assert.doesNotThrow(() => saveProgress(broken, { a: { best: 1, last: 1, attempts: 1, updatedAt: 1 } }));
});

test('progress saved under bare TOEIC item ids moves to the first test instead of appearing in every test', async () => {
  const { migrateLegacyKeys } = await import('./progress.ts');
  const entry = { best: 97, last: 97, attempts: 1, updatedAt: 1 };
  const out = migrateLegacyKeys({ 'p1-q1': entry, 'sample-1': entry, 'toeic-2026-test-02/p1-q1': { ...entry, best: 50 } });
  assert.deepEqual(Object.keys(out).sort(), ['sample-1', 'toeic-2026-test-01/p1-q1', 'toeic-2026-test-02/p1-q1']);
  assert.equal(out['toeic-2026-test-01/p1-q1'].best, 97);
  assert.equal(out['toeic-2026-test-02/p1-q1'].best, 50);
});

test('mergeProgress keeps the highest best, the most recent last and the highest attempt count', async () => {
  const { mergeProgress } = await import('./progress.ts');
  const out = mergeProgress(
    { a: { best: 90, last: 70, attempts: 2, updatedAt: 10 }, only: { best: 50, last: 50, attempts: 1, updatedAt: 1 } },
    { a: { best: 80, last: 85, attempts: 5, updatedAt: 20 }, more: { best: 60, last: 60, attempts: 1, updatedAt: 2 } },
  );
  assert.deepEqual(out.a, { best: 90, last: 85, attempts: 5, updatedAt: 20 });
  assert.deepEqual(Object.keys(out).sort(), ['a', 'more', 'only']);
});

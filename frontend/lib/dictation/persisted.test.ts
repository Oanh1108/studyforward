import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePracticeProgress, sanitizeActivePractice, sanitizeToeicNav } from './persisted.ts';
import { TOEIC_TESTS } from './toeic/index.ts';
import type { PracticeSpec } from './practice.ts';

const spec: PracticeSpec = {
  title: 'ETS 2024 · Test 1',
  segments: [
    { id: 'a', text: 'One.' },
    { id: 'b', text: 'Two.' },
    { id: 'c', text: 'Three.' },
  ],
};

test('sanitizeActivePractice accepts a saved session and null, and rejects junk', () => {
  assert.equal(sanitizeActivePractice(null), null);
  assert.deepEqual(sanitizeActivePractice({ spec, run: 2 }), { spec, run: 2 });
  assert.equal(sanitizeActivePractice({ spec: { title: 'x', segments: [] }, run: 1 }), undefined);
  assert.equal(sanitizeActivePractice('nonsense'), undefined);
  assert.equal(sanitizeActivePractice(undefined), undefined);
});

test('sanitizeToeicNav keeps a real test and falls back to the list for one that no longer exists', () => {
  const id = TOEIC_TESTS[0].id;
  assert.deepEqual(sanitizeToeicNav({ testId: id, part: 2, year: 2024 }), { testId: id, part: 2, year: 2024 });
  assert.deepEqual(sanitizeToeicNav({ testId: 'toeic-1999-test-01', part: 2 }), { testId: null, part: 2, year: undefined });
  assert.deepEqual(sanitizeToeicNav({ testId: null, part: 9 }), { testId: null, part: 1, year: undefined });
  assert.equal(sanitizeToeicNav(42), undefined);
});

test('restorePracticeProgress puts a session back on its own sentences, at the saved position', () => {
  const restored = restorePracticeProgress(spec, {
    queueIds: ['b', 'c'],
    index: 1,
    input: 'Thr',
    outcomes: [{ segmentId: 'b', score: 100 }, { junk: true }],
    finished: false,
  });
  assert.deepEqual(restored?.queue.map((s) => s.id), ['b', 'c']);
  assert.equal(restored?.index, 1);
  assert.equal(restored?.input, 'Thr');
  assert.deepEqual(restored?.outcomes, [{ segmentId: 'b', score: 100 }]);
});

test('restorePracticeProgress refuses a session whose sentences are gone', () => {
  assert.equal(restorePracticeProgress(spec, { queueIds: ['a', 'zzz'], index: 0 }), undefined);
  assert.equal(restorePracticeProgress(spec, { queueIds: [] }), undefined);
  assert.equal(restorePracticeProgress(spec, null), undefined);
});

test('restorePracticeProgress clamps a position that is out of range', () => {
  assert.equal(restorePracticeProgress(spec, { queueIds: ['a'], index: 7 })?.index, 0);
});

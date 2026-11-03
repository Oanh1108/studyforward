import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TOEIC_TESTS, toeicYears, findToeicTest, partsOf } from './index.ts';

const PUBLIC = path.resolve(import.meta.dirname, '../../../public');

for (const t of TOEIC_TESTS) {
  test(`${t.id}: every part has its recording on disk`, () => {
    for (const part of partsOf(t)) {
      const file = path.join(PUBLIC, t.audio[part]!);
      assert.ok(fs.existsSync(file), `missing ${t.audio[part]}`);
      assert.ok(fs.statSync(file).size > 100_000, `${t.audio[part]} looks empty`);
    }
  });

  test(`${t.id}: ids are unique and every sentence is clean text`, () => {
    const ids = t.items.flatMap((i) => [i.id, ...i.segments.map((s) => s.id)]);
    assert.equal(new Set(ids).size, ids.length);
    for (const item of t.items) {
      for (const s of item.segments) {
        assert.ok(s.text.trim().length > 0, `${s.id} is empty`);
        assert.ok(!/[|™©®§£¢¥~{}]/.test(s.text), `${s.id} has stray characters: ${s.text}`);
        assert.ok(!/\s{2,}/.test(s.text), `${s.id} has repeated spaces`);
        assert.ok(/[.?!"”')]$/.test(s.text), `${s.id} does not end like a sentence: ${s.text}`);
      }
    }
  });

  test(`${t.id}: every sentence can be played from its part's recording, in order`, () => {
    for (const part of partsOf(t)) {
      let previousEnd = 0;
      for (const item of t.items.filter((i) => i.part === part)) {
        for (const s of item.segments) {
          assert.ok(s.clip, `${s.id} has no audio clip`);
          assert.ok(s.clip.end - s.clip.start >= 0.6, `${s.id} clip is too short`);
          assert.ok(s.clip.start >= previousEnd - 0.001, `${s.id} starts before the previous sentence ends`);
          previousEnd = s.clip.end;
        }
      }
    }
  });

  test(`${t.id}: Part 1 and Part 2 items have the expected shape`, () => {
    for (const item of t.items.filter((i) => i.part === 1)) assert.deepEqual(item.segments.map((s) => s.tag), ['A', 'B', 'C', 'D']);
    for (const item of t.items.filter((i) => i.part === 2)) assert.deepEqual(item.segments.map((s) => s.tag), ['Q', 'A', 'B', 'C']);
  });
}

test('Test 7 (2026) covers all 100 listening questions', () => {
  const t = findToeicTest('toeic-2026-test-07')!;
  const count = (part: number) => t.items.filter((i) => i.part === part).length;
  assert.deepEqual([count(1), count(2), count(3), count(4)], [6, 25, 13, 10]);
  // 6 + 25 single questions, plus 13 + 10 groups of three
  assert.equal(count(1) + count(2) + (count(3) + count(4)) * 3, 100);
});

test('toeicYears groups tests by year, newest year first', () => {
  const fake = (year: number, test: number) => ({ ...TOEIC_TESTS[0], id: `${year}-${test}`, year, test });
  const years = toeicYears([fake(2025, 3), fake(2026, 8), fake(2026, 7), fake(2025, 1)]);
  assert.deepEqual(years.map((y) => y.year), [2026, 2025]);
  assert.deepEqual(years[0].tests.map((t) => t.test), [7, 8]);
  assert.deepEqual(years[1].tests.map((t) => t.test), [1, 3]);
});

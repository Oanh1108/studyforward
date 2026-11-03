import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreGroups, type PracticeSpec } from './practice.ts';
import { specForItem, specForPart } from './toeic/practice.ts';
import { findToeicTest } from './toeic/index.ts';

const t = findToeicTest('toeic-2026-test-07')!;

test('specForItem plays one item from its own part recording', () => {
  const item = t.items.find((i) => i.id === 'p3-q32')!;
  const spec = specForItem(t, item);
  assert.equal(spec.audioSrc, t.audio[3]);
  assert.equal(spec.segments.length, item.segments.length);
  assert.ok(spec.segments.every((s) => s.clip));
  assert.match(spec.subtitle!, /Part 3/);
  assert.match(spec.subtitle!, /Câu 32–34/);
  assert.deepEqual(spec.groups, [{ id: 'toeic-2026-test-07/p3-q32', segmentIds: item.segments.map((s) => s.id) }]);
});

test('specForPart goes through every item of the part in order, grouped by item', () => {
  const spec = specForPart(t, 2);
  const items = t.items.filter((i) => i.part === 2);
  assert.equal(spec.groups!.length, items.length);
  assert.equal(spec.segments.length, items.reduce((n, i) => n + i.segments.length, 0));
  assert.deepEqual(spec.groups!.map((g) => g.id), items.map((i) => `${t.id}/${i.id}`));
  assert.equal(spec.audioSrc, t.audio[2]);
});

test('segments keep what the practice screen shows: tag and speaker', () => {
  const p2 = specForItem(t, t.items.find((i) => i.part === 2)!);
  assert.deepEqual(p2.segments.map((s) => s.tag), ['Q', 'A', 'B', 'C']);
  const p3 = specForItem(t, t.items.find((i) => i.part === 3)!);
  assert.ok(p3.segments.every((s) => s.speaker));
});

test('scoreGroups averages the answered sentences of each group', () => {
  const spec: PracticeSpec = {
    title: 'x',
    segments: [],
    groups: [{ id: 'a', segmentIds: ['a1', 'a2'] }, { id: 'b', segmentIds: ['b1'] }, { id: 'c', segmentIds: ['c1'] }],
  };
  const result = scoreGroups(spec, [
    { segmentId: 'a1', score: 100 },
    { segmentId: 'a2', score: 50 },
    { segmentId: 'b1', score: 80 },
  ]);
  assert.deepEqual(result, [{ id: 'a', score: 75 }, { id: 'b', score: 80 }]);
});

test('scoreGroups returns nothing for a session without groups', () => {
  assert.deepEqual(scoreGroups({ title: 'x', segments: [] }, [{ segmentId: 's', score: 100 }]), []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeYouTubeLesson } from './youtubeLessonState.ts';

const seg = (n: number) => ({ id: `s${n}`, startTime: n * 5, endTime: n * 5 + 5, text: `Line ${n}` });

test('a running lesson is restored with its position and score', () => {
  const saved = sanitizeYouTubeLesson(
    { practiceType: 'shadowing', videoUrl: 'https://youtu.be/x', videoId: 'LGqxqxDysO4', segments: [seg(0), seg(1), seg(2)], lessonTitle: 'Cruise', mode: 'practice', currentSegmentIndex: 2, score: { correct: 1, total: 2 }, wrongSegments: [1] },
    'dictation',
  );
  assert.equal(saved?.mode, 'practice');
  assert.equal(saved?.currentSegmentIndex, 2);
  assert.deepEqual(saved?.score, { correct: 1, total: 2 });
  assert.equal(saved?.practiceType, 'shadowing');
  assert.deepEqual(saved?.wrongSegments, [1]);
});

test('a running lesson that lost its video or sentences goes back to setup', () => {
  assert.equal(sanitizeYouTubeLesson({ mode: 'practice', videoId: null, segments: [seg(0)] }, 'dictation')?.mode, 'setup');
  assert.equal(sanitizeYouTubeLesson({ mode: 'practice', videoId: 'abc', segments: [] }, 'dictation')?.mode, 'setup');
});

test('an out-of-range position is clamped and junk sentences are dropped', () => {
  const saved = sanitizeYouTubeLesson({ mode: 'practice', videoId: 'abc', segments: [seg(0), { text: 'no times' }, seg(1)], currentSegmentIndex: 50 }, 'dictation');
  assert.equal(saved?.segments.length, 2);
  assert.equal(saved?.currentSegmentIndex, 1);
});

test('nothing usable saved gives undefined; missing fields get defaults', () => {
  assert.equal(sanitizeYouTubeLesson(undefined, 'dictation'), undefined);
  assert.equal(sanitizeYouTubeLesson('x', 'dictation'), undefined);
  const saved = sanitizeYouTubeLesson({}, 'shadowing');
  assert.equal(saved?.practiceType, 'shadowing');
  assert.equal(saved?.lessonTitle, 'YouTube Practice');
  assert.equal(saved?.mode, 'setup');
});

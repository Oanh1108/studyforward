import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignScript, type TimedWord } from './align.ts';

/** Builds timed words from a sentence, one second per word starting at `from`. */
const speak = (sentence: string, from: number): TimedWord[] =>
  sentence.split(' ').map((text, i) => ({ text, start: from + i, end: from + i + 0.9 }));

test('finds where each script sentence is spoken', () => {
  const asr = [
    ...speak('Number one. Look at the picture marked number one.', 0),
    ...speak('A. She is holding a water bottle.', 20),
    ...speak('B. She is looking at a newspaper.', 40),
  ];
  const result = alignScript(
    [
      { id: 'a', text: 'She is holding a water bottle.' },
      { id: 'b', text: 'She is looking at a newspaper.' },
    ],
    asr,
  );
  assert.equal(result[0].start, 21);
  assert.ok(Math.abs(result[0].end! - 26.9) < 0.01);
  assert.equal(result[1].start, 41);
  assert.ok(result[0].end! < result[1].start!);
});

test('still aligns when the recogniser misheard or dropped a word', () => {
  const asr = speak('Where do I sign this contract', 5).filter((w) => w.text !== 'do').map((w) => (w.text === 'sign' ? { ...w, text: 'sine' } : w));
  const [r] = alignScript([{ id: 'q', text: 'Where do I sign this contract?' }], asr);
  assert.equal(r.start, 5);
  assert.ok(r.end! > 9);
  assert.ok(r.matched >= 3 && r.matched < r.total);
});

test('is not fooled by common words spoken elsewhere in the audio', () => {
  const asr = [
    ...speak('Look at the picture in your test book', 0),
    ...speak('The woman is walking across the street', 60),
  ];
  const [r] = alignScript([{ id: 'x', text: 'The woman is walking across the street.' }], asr);
  assert.equal(r.start, 60);
});

test('keeps sentences in order and does not let them overlap', () => {
  const asr = [...speak('Good morning everyone. Thank you for coming in early.', 10), ...speak('I would like to show you how it works.', 30)];
  const result = alignScript(
    [
      { id: '1', text: 'Good morning everyone.' },
      { id: '2', text: 'Thank you for coming in early.' },
      { id: '3', text: 'I would like to show you how it works.' },
    ],
    asr,
  );
  for (let i = 1; i < result.length; i++) assert.ok(result[i].start! >= result[i - 1].start!);
  assert.equal(result[2].start, 30);
});

test('reports no range for a sentence that was never recognised', () => {
  const asr = speak('Hello there my friend', 0);
  const result = alignScript([{ id: 'ghost', text: 'Completely different words appear here.' }], asr);
  assert.equal(result[0].start, null);
  assert.equal(result[0].end, null);
  assert.equal(result[0].matched, 0);
});

test('ignores punctuation, case and apostrophes when matching', () => {
  const asr = speak("it's a good idea", 3);
  const [r] = alignScript([{ id: 'p', text: "It’s a good idea!" }], asr);
  assert.equal(r.start, 3);
  assert.equal(r.matched, r.total);
});

test('handles empty input', () => {
  assert.deepEqual(alignScript([], []), []);
  const [r] = alignScript([{ id: 'e', text: 'Anything at all' }], []);
  assert.equal(r.start, null);
});

import { clipsFromAlignment } from './align.ts';

const aligned = (id: string, start: number | null, end: number | null, matched = 5, total = 5) => ({ id, start, end, matched, total });

test('clipsFromAlignment adds a little breathing room before and after each sentence', () => {
  const [c] = clipsFromAlignment([aligned('a', 10, 12)], 60);
  assert.ok(c!.start < 10 && c!.start >= 9.5);
  assert.ok(c!.end > 12 && c!.end <= 12.6);
});

test('clipsFromAlignment never lets neighbouring clips overlap', () => {
  const clips = clipsFromAlignment([aligned('a', 10, 12), aligned('b', 12.1, 14)], 60);
  assert.ok(clips[0]!.end <= clips[1]!.start);
});

test('clipsFromAlignment stays inside the recording', () => {
  const [first] = clipsFromAlignment([aligned('a', 0.05, 1)], 60);
  assert.equal(first!.start, 0);
  const [last] = clipsFromAlignment([aligned('z', 58, 59.9)], 60);
  assert.equal(last!.end, 60);
});

test('clipsFromAlignment returns null for sentences that were not located, without disturbing the others', () => {
  const clips = clipsFromAlignment([aligned('a', 10, 12), aligned('missing', null, null, 0), aligned('b', 20, 22)], 60);
  assert.equal(clips[1], null);
  assert.ok(clips[0] && clips[2]);
});

test('clipsFromAlignment rounds to centiseconds so the data stays compact', () => {
  const [c] = clipsFromAlignment([aligned('a', 10.123456, 12.987654)], 60);
  assert.equal(c!.start, Math.round(c!.start * 100) / 100);
  assert.equal(c!.end, Math.round(c!.end * 100) / 100);
});

test('clipsFromAlignment cuts at the midpoint when the recogniser reports sentences overlapping', () => {
  const clips = clipsFromAlignment([aligned('a', 10, 12.3), aligned('b', 12.2, 14)], 60);
  assert.ok(clips[0]!.end <= clips[1]!.start, `${clips[0]!.end} should not pass ${clips[1]!.start}`);
  assert.ok(Math.abs(clips[0]!.end - 12.25) < 0.02);
});

test('covers words the recogniser got wrong at the end of a sentence instead of cutting the sentence short', () => {
  const asr: TimedWord[] = [
    { text: 'A.', start: 0.2, end: 0.6 },
    { text: 'On', start: 1.0, end: 1.2 },
    { text: 'Whitma', start: 1.3, end: 1.8 },
    { text: 'Boulavard', start: 1.9, end: 2.6 },
    { text: 'B.', start: 4.0, end: 4.3 },
  ];
  const [r] = alignScript([{ id: 'a', text: 'On Whitmer Boulevard.' }], asr);
  assert.equal(r.start, 1.0);
  assert.equal(r.end, 2.6);
});

test('covers misheard words at the start of a sentence, but never the "A." / "B." markers', () => {
  const asr: TimedWord[] = [
    { text: 'A.', start: 0.2, end: 0.6 },
    { text: 'Pleece', start: 1.0, end: 1.3 },
    { text: 'sine', start: 1.4, end: 1.7 },
    { text: 'on', start: 1.8, end: 1.9 },
    { text: 'the', start: 1.95, end: 2.0 },
    { text: 'line.', start: 2.05, end: 2.5 },
  ];
  const [r] = alignScript([{ id: 'a', text: 'Please sign on the line.' }], asr);
  assert.equal(r.start, 1.0);
  assert.equal(r.end, 2.5);
});

test('does not stretch a sentence across a pause or into the next sentence', () => {
  const asr: TimedWord[] = [
    { text: 'Yes', start: 1.0, end: 1.3 },
    { text: 'I', start: 5.0, end: 5.1 },
    { text: 'did', start: 5.2, end: 5.4 },
    { text: 'that', start: 5.5, end: 5.8 },
  ];
  const result = alignScript([{ id: 's1', text: 'Yes.' }, { id: 's2', text: 'I did that.' }], asr);
  assert.equal(result[0].end, 1.3);
  assert.equal(result[1].start, 5.0);
});

test('copes with a stretch of speech that was recognised twice (overlapping recognition windows)', () => {
  const once = (from: number) => [
    { text: 'Please', start: from, end: from + 0.2 },
    { text: 'sign', start: from + 0.3, end: from + 0.5 },
    { text: 'on', start: from + 0.6, end: from + 0.7 },
    { text: 'the', start: from + 0.8, end: from + 0.9 },
    { text: 'line.', start: from + 1.0, end: from + 1.4 },
  ];
  const asr: TimedWord[] = [
    { text: 'Who', start: 0, end: 0.2 },
    { text: 'supervises', start: 0.3, end: 0.8 },
    { text: 'the', start: 0.9, end: 1.0 },
    { text: 'line?', start: 1.1, end: 1.5 },
    ...once(6),
    { text: 'B.', start: 8, end: 8.3 },
    ...once(6), // the same words again, same times
  ];
  const result = alignScript([{ id: 'q', text: 'Who supervises the line?' }, { id: 'a', text: 'Please sign on the line.' }], asr);
  assert.equal(result[0].end, 1.5);
  assert.equal(result[1].start, 6);
  assert.ok(Math.abs(result[1].end! - 7.4) < 0.01);
});

test('gives an unrecognised word between two sentences to the sentence it runs into, not to both', () => {
  const asr: TimedWord[] = [
    { text: 'Well,', start: 0.0, end: 0.4 },
    { text: "it's", start: 0.5, end: 0.7 },
    { text: 'a', start: 0.8, end: 0.9 },
    { text: 'covered', start: 1.0, end: 1.5 },
    { text: 'patio.', start: 1.6, end: 2.2 },
    // "OK" was written "okay" by the recogniser, so it is not matched; it belongs to the next sentence
    { text: 'Okay,', start: 2.6, end: 3.0 },
    { text: 'just', start: 3.2, end: 3.5 },
    { text: 'follow', start: 3.5, end: 3.8 },
    { text: 'me.', start: 3.8, end: 4.2 },
  ];
  const [first, second] = alignScript(
    [
      { id: 's1', text: "Well, it's a covered patio." },
      { id: 's2', text: 'OK. Just follow me.' },
    ],
    asr,
  );
  assert.equal(first.end, 2.2);
  assert.equal(second.start, 2.6);
  assert.ok(first.end! <= second.start!);
});

test('splits a run of unrecognised words at the longest pause', () => {
  const asr: TimedWord[] = [
    { text: 'Thanks', start: 0, end: 0.5 },
    { text: 'bladda', start: 0.55, end: 0.9 }, // tail of sentence 1, said straight after "Thanks"
    { text: 'blah', start: 2.0, end: 2.3 }, // head of sentence 2, after a pause
    { text: 'Great', start: 2.35, end: 2.8 },
  ];
  const [a, b] = alignScript([{ id: 'a', text: 'Thanks.' }, { id: 'b', text: 'Great.' }], asr);
  assert.equal(a.end, 0.9);
  assert.equal(b.start, 2.0);
});

test('gives unrecognised words to the sentence that is missing words, even if the pause falls before them', () => {
  const asr: TimedWord[] = [
    { text: 'Hey,', start: 0.0, end: 0.2 },
    { text: 'Sylvia,', start: 0.32, end: 0.96 }, // the name was spelt differently, so it is not matched
    { text: 'did', start: 1.0, end: 1.2 },
    { text: 'you', start: 1.2, end: 1.5 },
    { text: 'leave', start: 1.5, end: 1.8 },
  ];
  const [a, b] = alignScript([{ id: 'a', text: 'Hey, Silvia.' }, { id: 'b', text: 'Did you leave?' }], asr);
  assert.equal(a.end, 0.96);
  assert.equal(b.start, 1.0);
});

test('matches "All right" in the script to "Alright" in the recognised speech', () => {
  const asr: TimedWord[] = [
    { text: 'Alright,', start: 0, end: 0.5 },
    { text: 'I\'ll', start: 0.7, end: 0.9 },
    { text: 'start', start: 0.9, end: 1.2 },
  ];
  const [a, b] = alignScript([{ id: 'a', text: 'All right.' }, { id: 'b', text: "I'll start." }], asr);
  assert.equal(a.matched, 2);
  assert.equal(b.start, 0.7);
});

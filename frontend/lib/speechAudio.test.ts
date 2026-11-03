import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureAudio, normalizeSamples, isSilentRecording, isWhisperHallucination } from './speechAudio.ts';

const tone = (amplitude: number, length = 16000) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * 220 * i) / 16000));

test('measureAudio reports the peak and RMS of a signal', () => {
  const { peak, rms } = measureAudio(tone(0.5));
  assert.ok(Math.abs(peak - 0.5) < 0.01);
  assert.ok(Math.abs(rms - 0.5 / Math.SQRT2) < 0.01);
});

test('measureAudio treats an empty recording as silent', () => {
  assert.deepEqual(measureAudio(new Float32Array(0)), { peak: 0, rms: 0 });
});

test('normalizeSamples scales a quiet recording up to a usable peak', () => {
  const normalized = normalizeSamples(tone(0.05));
  assert.ok(Math.abs(measureAudio(normalized).peak - 0.8) < 0.01);
});

test('normalizeSamples leaves an already loud recording untouched', () => {
  const loud = tone(0.7);
  assert.deepEqual(normalizeSamples(loud), loud);
});

test('normalizeSamples does not amplify digital silence', () => {
  assert.equal(measureAudio(normalizeSamples(new Float32Array(16000))).peak, 0);
});

test('normalizeSamples does not modify its input', () => {
  const quiet = tone(0.05);
  const before = Array.from(quiet);
  normalizeSamples(quiet);
  assert.deepEqual(Array.from(quiet), before);
});

test('isSilentRecording is true for near-zero signal and false for quiet but real speech levels', () => {
  assert.equal(isSilentRecording(measureAudio(new Float32Array(16000))), true);
  assert.equal(isSilentRecording(measureAudio(tone(0.004))), true);
  assert.equal(isSilentRecording(measureAudio(tone(0.05))), false);
});

test('isWhisperHallucination flags the phrases Whisper invents for noise and silence', () => {
  for (const text of [' you', 'You.', ' Thank you.', 'thanks for watching!', '', '   ', '...']) {
    assert.equal(isWhisperHallucination(text), true, `expected "${text}" to be flagged`);
  }
});

test('isWhisperHallucination keeps real sentences, even ones containing "you"', () => {
  for (const text of [' Self introduction and elevator pitch.', 'Could you clarify the timeline?', 'Thank you for your time today']) {
    assert.equal(isWhisperHallucination(text), false, `expected "${text}" to be kept`);
  }
});

import { compareWords } from './speechAudio.ts';

const statuses = (target: string, heard: string) => compareWords(target, heard).words.map((w) => `${w.text}:${w.status}`);

test('compareWords marks every word correct when the sentence is read exactly', () => {
  const result = compareWords('Could you clarify the timeline?', 'could you clarify the timeline');
  assert.equal(result.score, 100);
  assert.ok(result.words.every((w) => w.status === 'correct'));
});

test('compareWords keeps the original display text of each target word', () => {
  assert.deepEqual(
    compareWords('Could you clarify the timeline?', 'x').words.map((w) => w.text),
    ['Could', 'you', 'clarify', 'the', 'timeline?'],
  );
});

test('compareWords flags only the misread word and scores the rest', () => {
  const result = compareWords('Could you clarify the timeline?', 'could you classify the timeline');
  assert.deepEqual(statuses('Could you clarify the timeline?', 'could you classify the timeline'), [
    'Could:correct', 'you:correct', 'clarify:wrong', 'the:correct', 'timeline?:correct',
  ]);
  assert.equal(result.score, 80);
});

test('compareWords flags words that were skipped', () => {
  assert.deepEqual(statuses('Please send the report today', 'please send report'), [
    'Please:correct', 'send:correct', 'the:wrong', 'report:correct', 'today:wrong',
  ]);
});

test('compareWords ignores extra words the speaker added', () => {
  const result = compareWords('Send the report', 'um please send the report now');
  assert.equal(result.score, 100);
});

test('compareWords requires words in order, so a repeated word cannot be matched twice', () => {
  assert.deepEqual(statuses('the cat and the dog', 'the cat and dog'), [
    'the:correct', 'cat:correct', 'and:correct', 'the:wrong', 'dog:correct',
  ]);
});

test('compareWords treats a hyphenated word as correct when spoken as separate words, and skips symbols', () => {
  const result = compareWords('Self-Introduction & Elevator Pitch', 'self introduction and elevator pitch');
  assert.deepEqual(result.words.map((w) => w.status), ['correct', 'neutral', 'correct', 'correct']);
  assert.equal(result.score, 100);
});

test('compareWords scores 0 and flags everything when nothing was heard', () => {
  const result = compareWords('Send the report', '');
  assert.equal(result.score, 0);
  assert.ok(result.words.every((w) => w.status === 'wrong'));
});

test('compareWords is case and punctuation insensitive', () => {
  assert.equal(compareWords("It's Friday, right?", "its friday right").score, 100);
});

test('compareWords treats digits and number words as the same thing', () => {
  assert.equal(compareWords('Take twenty-five percent off', 'take 25 percent off').score, 100);
  assert.equal(compareWords('It costs $250.00 today', 'it costs two hundred fifty dollars today').score, 100);
});

test('compareWords accepts e-mail / email and OK / okay', () => {
  assert.equal(compareWords("I'll e-mail you a link", 'ill email you a link').score, 100);
  assert.equal(compareWords('OK, see you there', 'okay see you there').score, 100);
});

test('compareWords lists the words that were typed but not in the sentence', () => {
  const result = compareWords('Send the report', 'um please send the report now');
  assert.deepEqual(result.extra, ['um', 'please', 'now']);
  assert.deepEqual(compareWords('Send the report', 'send the report').extra, []);
});

test('compareWords keeps the display text of target words with numbers and symbols', () => {
  const result = compareWords('No more than $250.00, so', 'no more than 250 dollars so');
  assert.deepEqual(result.words.map((w) => w.status), ['correct', 'correct', 'correct', 'correct', 'correct']);
  assert.equal(result.words[3].text, '$250.00,');
});

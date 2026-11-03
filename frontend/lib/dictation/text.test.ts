import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalWords, splitSentences } from './text.ts';

test('canonicalWords lowercases, drops punctuation and apostrophes', () => {
  assert.deepEqual(canonicalWords("It's Friday, right?"), ['its', 'friday', 'right']);
  assert.deepEqual(canonicalWords('It’s Friday'), ['its', 'friday']);
});

test('canonicalWords splits on dashes and hyphens so "45-minute" and "45 minute" agree', () => {
  assert.deepEqual(canonicalWords('A 45-minute lunch break'), ['a', '45', 'minute', 'lunch', 'break']);
  assert.deepEqual(canonicalWords('position—tell us about that'), ['position', 'tell', 'us', 'about', 'that']);
});

test('canonicalWords treats number words and digits the same', () => {
  assert.deepEqual(canonicalWords('Twenty dollars each.'), ['20', 'dollars', 'each']);
  assert.deepEqual(canonicalWords('20 dollars each'), ['20', 'dollars', 'each']);
  assert.deepEqual(canonicalWords('twenty-five percent off'), ['25', 'percent', 'off']);
  assert.deepEqual(canonicalWords('25 percent off'), ['25', 'percent', 'off']);
  assert.deepEqual(canonicalWords('about five hundred'), ['about', '500']);
  assert.deepEqual(canonicalWords('two hundred fifty dollars'), ['250', 'dollars']);
  assert.deepEqual(canonicalWords('ten dozen tulips'), ['10', 'dozen', 'tulips']);
});

test('canonicalWords reads a currency amount as number + dollars', () => {
  assert.deepEqual(canonicalWords('no more than $250.00, so'), ['no', 'more', 'than', '250', 'dollars', 'so']);
  assert.deepEqual(canonicalWords('two hundred fifty dollars'), canonicalWords('$250'));
});

test('canonicalWords accepts the spellings people actually type', () => {
  assert.deepEqual(canonicalWords('e-mail'), ['email']);
  assert.deepEqual(canonicalWords('email'), ['email']);
  assert.deepEqual(canonicalWords('Web site'), ['website']);
  assert.deepEqual(canonicalWords('OK—when will it start?'), ['okay', 'when', 'will', 'it', 'start']);
  assert.deepEqual(canonicalWords('okay'), ['okay']);
});

test('canonicalWords does not merge unrelated number words with the words around them', () => {
  assert.deepEqual(canonicalWords('one of the two'), ['1', 'of', 'the', '2']);
  assert.deepEqual(canonicalWords('twenty or thirty'), ['20', 'or', '30']);
});

test('canonicalWords returns nothing for symbols or empty text', () => {
  assert.deepEqual(canonicalWords(''), []);
  assert.deepEqual(canonicalWords('& —'), []);
});

test('splitSentences splits on sentence endings and keeps the punctuation', () => {
  assert.deepEqual(splitSentences('Hello there. How are you? Fine!'), ['Hello there.', 'How are you?', 'Fine!']);
});

test('splitSentences does not split on abbreviations or decimals', () => {
  assert.deepEqual(splitSentences('Dr. Ruiz, do you have a minute? I paid $250.00 today.'), [
    'Dr. Ruiz, do you have a minute?',
    'I paid $250.00 today.',
  ]);
  assert.deepEqual(splitSentences("Ms. Martin is demonstrating the software."), ['Ms. Martin is demonstrating the software.']);
});

test('splitSentences merges very short fragments into a neighbour so each clip is worth typing', () => {
  assert.deepEqual(splitSentences('Sure. I have time now. Great.'), ['Sure. I have time now.', 'Great.']);
  assert.deepEqual(splitSentences('Oh! I had my headset on, so I did not realize that.'), ['Oh! I had my headset on, so I did not realize that.']);
});

test('splitSentences returns a single sentence unchanged and handles empty input', () => {
  assert.deepEqual(splitSentences('Where do I sign this contract?'), ['Where do I sign this contract?']);
  assert.deepEqual(splitSentences('   '), []);
});

test('splitSentences keeps quotes and dashes inside a sentence', () => {
  assert.deepEqual(splitSentences("Recently, however, she left the university for another position—tell us about that."), [
    'Recently, however, she left the university for another position—tell us about that.',
  ]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeId, parseTranscript } from './youtubeUtils.ts';

test('extractYouTubeId reads watch, share and embed links', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://youtu.be/LGqxqxDysO4?si=gGQbZa5gi18_D4oq'), 'LGqxqxDysO4');
  assert.equal(extractYouTubeId('not a link'), null);
});

test('parseTranscript reads "[mm:ss] text" lines', () => {
  const s = parseTranscript('[00:05] Hello there\n[00:10.500] How are you?');
  assert.deepEqual(s.map((x) => [x.startTime, x.text]), [[5, 'Hello there'], [10.5, 'How are you?']]);
  assert.equal(s[0].endTime, 10.5);
});

test('parseTranscript reads what YouTube\'s "Show transcript" copies (timestamp line, then text line)', () => {
  const s = parseTranscript('0:00\nhello welcome to the channel\n0:04\nwhere you learn English\n1:02:03\nlast line');
  assert.deepEqual(s.map((x) => [x.startTime, x.text]), [
    [0, 'hello welcome to the channel'],
    [4, 'where you learn English'],
    [3723, 'last line'],
  ]);
});

test('parseTranscript keeps lines without timestamps, five seconds apart', () => {
  const s = parseTranscript('First sentence\nSecond sentence');
  assert.deepEqual(s.map((x) => [x.startTime, x.text]), [[0, 'First sentence'], [5, 'Second sentence']]);
});

test('parseTranscript ignores blank lines and a timestamp with no text after it', () => {
  const s = parseTranscript('\n0:05\n\n0:09\nonly this\n');
  assert.deepEqual(s.map((x) => [x.startTime, x.text]), [[9, 'only this']]);
});

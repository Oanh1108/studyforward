import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audioUrl } from './audioUrl.ts';

test('audioUrl leaves the path alone when no storage address is configured', () => {
  assert.equal(audioUrl('/audio/toeic/2024/test-01/part-1.mp3', ''), '/audio/toeic/2024/test-01/part-1.mp3');
});

test('audioUrl serves the path from the configured storage address', () => {
  assert.equal(
    audioUrl('/audio/toeic/2024/test-01/part-1.mp3', 'https://abc.public.blob.vercel-storage.com'),
    'https://abc.public.blob.vercel-storage.com/audio/toeic/2024/test-01/part-1.mp3',
  );
});

test('audioUrl copes with a trailing slash on the address and a path without a leading slash', () => {
  assert.equal(audioUrl('audio/x.mp3', 'https://cdn.example.com/'.replace(/\/+$/, '')), 'https://cdn.example.com/audio/x.mp3');
});

test('audioUrl keeps a path that is already a full address', () => {
  assert.equal(audioUrl('https://other.example.com/a.mp3', 'https://cdn.example.com'), 'https://other.example.com/a.mp3');
});

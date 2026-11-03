/**
 * Speech recognition with word timings for a TOEIC recording that is ONE file for the whole listening section
 * (the 2023 files), unlike transcribe-audio.mjs which expects one file per part.
 *
 *   node scripts/toeic/transcribe-full.mjs --audio "D:/TOEIC/2023/FILE NGHE/Test 01.mp3" --out tmp/asr-2023-01/asr-full.json
 *
 * Writes { duration, text, chunks: [{ text, timestamp: [start, end] }] } for the whole recording. Takes several minutes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { pipeline } from '@huggingface/transformers';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`missing --${name}`);
  return process.argv[i + 1];
};
const audioFile = arg('audio');
const out = arg('out');
// Parts 1 and 2 are all the dictation page needs for some tests, and they end well before the halfway point.
const maxMinutes = process.argv.includes('--max-minutes') ? Number(arg('max-minutes')) : Infinity;
fs.mkdirSync(path.dirname(out), { recursive: true });

// Decode in pieces and resample to 16 kHz mono as we go, so a 45-minute stereo file never sits in memory as floats.
const file = fs.readFileSync(audioFile);
const decoder = new MPEGDecoder();
await decoder.ready;
const pieces = [];
let carry = 0; // fractional read position carried between pieces
const CHUNK = 1 << 20;
for (let offset = 0; offset < file.length; offset += CHUNK) {
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(file.subarray(offset, offset + CHUNK)));
  const n = channelData[0]?.length ?? 0;
  if (!n) continue;
  const ratio = sampleRate / 16000;
  const count = Math.max(0, Math.floor((n - carry) / ratio));
  const piece = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const from = Math.floor(carry + i * ratio);
    const to = Math.min(n, Math.floor(carry + (i + 1) * ratio));
    let sum = 0;
    for (let k = from; k < to; k++) for (const ch of channelData) sum += ch[k];
    piece[i] = sum / (Math.max(1, to - from) * channelData.length);
  }
  carry = carry + count * ratio - n;
  pieces.push(piece);
  if (pieces.reduce((s, p) => s + p.length, 0) / 16000 / 60 >= maxMinutes) break;
}
decoder.free();
const audio = new Float32Array(pieces.reduce((s, p) => s + p.length, 0));
let at = 0;
for (const p of pieces) { audio.set(p, at); at += p.length; }
console.log(`decoded ${(audio.length / 16000 / 60).toFixed(1)} min, transcribing...`);

const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', { dtype: 'q8' });
const result = await asr(audio, { language: 'english', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word' });
fs.writeFileSync(out, JSON.stringify({ duration: audio.length / 16000, text: result.text, chunks: result.chunks }));
console.log('done', out);

/**
 * Speech recognition with word timings for the four recordings of a TOEIC test (Whisper, runs on this machine).
 *
 *   node scripts/toeic/transcribe-audio.mjs --audio-dir "D:/TOEIC/FILE NGHE 2026/Test_07" --prefix Test_07 --out tmp/asr-2026-07
 *
 * Expects <audio-dir>/<prefix>-Part1.mp3 ... Part4.mp3 and writes <out>/asr-part1.json ... asr-part4.json,
 * which scripts/toeic/build-test.ts reads. Takes a few minutes per test.
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
const audioDir = arg('audio-dir');
const prefix = arg('prefix');
const out = arg('out');
fs.mkdirSync(out, { recursive: true });

function toMono16k(channels, rate) {
  const n = channels[0].length;
  const mono = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length;
  const ratio = rate / 16000;
  const result = new Float32Array(Math.floor(n / ratio));
  for (let i = 0; i < result.length; i++) {
    const from = Math.floor(i * ratio);
    const to = Math.min(n, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let k = from; k < to; k++) sum += mono[k];
    result[i] = sum / Math.max(1, to - from);
  }
  return result;
}

// The "_timestamped" build keeps the attention data needed for word-level timings.
const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', { dtype: 'q8' });

for (const part of [1, 2, 3, 4]) {
  const target = path.join(out, `asr-part${part}.json`);
  if (fs.existsSync(target)) {
    console.log(`part ${part}: already done, skipping`);
    continue;
  }
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(path.join(audioDir, `${prefix}-Part${part}.mp3`))));
  decoder.free();
  const audio = toMono16k(channelData, sampleRate);
  console.log(`part ${part}: ${(audio.length / 16000 / 60).toFixed(1)} min, transcribing...`);
  const result = await asr(audio, { language: 'english', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word' });
  fs.writeFileSync(target, JSON.stringify({ duration: audio.length / 16000, text: result.text, chunks: result.chunks }));
}
console.log('done');

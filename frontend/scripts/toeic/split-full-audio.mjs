/**
 * Cuts the single recording of a whole listening section (the 2023 files) into one mp3 per part, without re-encoding,
 * using the speech-recognition output of transcribe-full.mjs to find where each part's directions begin.
 *
 *   node scripts/toeic/split-full-audio.mjs --audio "D:/TOEIC/2023/FILE NGHE/Test 01.mp3" \
 *        --asr tmp/asr-2023-01/asr-full.json --out-dir public/audio/toeic/2023/test-01
 *
 * Writes part-1.mp3 (from "Number 1" to the end of Part 1) and part-2.mp3 (from "Part 2. Directions" to the end of Part 2).
 * The cuts fall in the silence between parts. Prints the cut times so they can be checked by ear.
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`missing --${name}`);
  return process.argv[i + 1];
};
const audioFile = arg('audio');
const outDir = arg('out-dir');
// Where to write the recognition output re-timed to each part's own file (what build-test.ts reads)
const asrOut = process.argv.includes('--asr-out-dir') ? arg('asr-out-dir') : null;
const asr = JSON.parse(fs.readFileSync(arg('asr'), 'utf8'));
const words = asr.chunks.map((c) => ({ w: c.text.toLowerCase().replace(/[^a-z0-9]/g, ''), t: c.timestamp[0] }));

/** Start time of the first run of words matching `phrase` at or after index `from`. */
function find(phrase, from = 0) {
  for (let i = from; i < words.length - phrase.length; i++) if (phrase.every((p, k) => [].concat(p).includes(words[i + k].w))) return { index: i, t: words[i].t };
  throw new Error(`"${phrase.map((p) => [].concat(p)[0]).join(' ')}" not found in the recognised text`);
}

const number1 = find(['number', ['1', 'one']]);
const part2 = find(['part', ['2', 'two'], 'directions'], number1.index);
const part3 = find(['part', ['3', 'three'], 'directions'], part2.index);
const cuts = {
  1: [number1.t - 0.8, part2.t - 2.5],
  2: [part2.t - 1.0, part3.t - 2.5],
};

// Index the MPEG frames (Layer III) so cuts land on frame boundaries.
const file = fs.readFileSync(audioFile);
let at = 0;
if (file.toString('latin1', 0, 3) === 'ID3') at = 10 + ((file[6] << 21) | (file[7] << 14) | (file[8] << 7) | file[9]);
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const RATES = [44100, 48000, 32000];
const frames = [];
while (at < file.length - 4) {
  if (!(file[at] === 0xff && (file[at + 1] & 0xe0) === 0xe0)) { at++; continue; }
  const bitrate = BITRATES[file[at + 2] >> 4] * 1000;
  const rate = RATES[(file[at + 2] >> 2) & 3];
  const size = Math.floor((144 * bitrate) / rate) + ((file[at + 2] >> 1) & 1);
  if (!bitrate || !rate || at + size > file.length) break;
  frames.push(at);
  at += size;
}
frames.push(at);
const frameSeconds = 1152 / 44100;

fs.mkdirSync(outDir, { recursive: true });
for (const [part, [from, to]] of Object.entries(cuts)) {
  const a = Math.max(0, Math.floor(from / frameSeconds));
  const b = Math.min(frames.length - 1, Math.ceil(to / frameSeconds));
  const target = path.join(outDir, `part-${part}.mp3`);
  fs.writeFileSync(target, file.subarray(frames[a], frames[b]));
  if (asrOut) {
    fs.mkdirSync(asrOut, { recursive: true });
    const shift = a * frameSeconds;
    const chunks = asr.chunks
      .filter((c) => c.timestamp[0] >= shift && c.timestamp[0] < b * frameSeconds)
      .map((c) => ({ text: c.text, timestamp: [c.timestamp[0] - shift, (c.timestamp[1] ?? c.timestamp[0]) - shift] }));
    fs.writeFileSync(path.join(asrOut, `asr-part${part}.json`), JSON.stringify({ duration: (b - a) * frameSeconds, text: chunks.map((c) => c.text).join(''), chunks }));
  }
  console.log(`part ${part}: ${from.toFixed(1)}s - ${to.toFixed(1)}s (${((to - from) / 60).toFixed(1)} min) -> ${target}`);
}

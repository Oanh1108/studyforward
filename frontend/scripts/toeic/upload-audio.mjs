/**
 * Uploads the TOEIC recordings (public/audio/toeic/**) to Vercel Blob, so the deployed site can play them.
 * The recordings are git-ignored (copyrighted, ~600 MB), so a deploy never contains them.
 *
 *   1. In the Vercel dashboard: Storage > Create > Blob. Copy its read/write token.
 *   2. In a terminal, in frontend/:
 *        set BLOB_READ_WRITE_TOKEN=<token>          (PowerShell: $env:BLOB_READ_WRITE_TOKEN="<token>")
 *        npm run toeic:upload-audio
 *   3. The script prints the storage address. In the Vercel project, set the environment variable
 *      NEXT_PUBLIC_AUDIO_BASE_URL to it and redeploy.
 *
 * Safe to run again: files already uploaded with the same size are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { list, put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Set BLOB_READ_WRITE_TOKEN first (Vercel dashboard > Storage > your Blob store > .env.local tab).');
  process.exit(1);
}

const publicDir = path.resolve('public');
const root = path.join(publicDir, 'audio', 'toeic');
if (!fs.existsSync(root)) {
  console.error(`No recordings found in ${root}`);
  process.exit(1);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.toLowerCase().endsWith('.mp3')) yield full;
  }
}

// What is already uploaded, to skip it
const existing = new Map();
let cursor;
do {
  const page = await list({ prefix: 'audio/toeic/', cursor, token });
  page.blobs.forEach((b) => existing.set(b.pathname, b));
  cursor = page.cursor;
} while (cursor);

const files = [...walk(root)].sort();
let uploaded = 0;
let skipped = 0;
let baseUrl = '';
for (const [i, file] of files.entries()) {
  const pathname = path.relative(publicDir, file).split(path.sep).join('/');
  const size = fs.statSync(file).size;
  const before = existing.get(pathname);
  if (before && before.size === size) {
    skipped++;
    baseUrl ||= before.url.slice(0, before.url.indexOf(`/${pathname}`));
    continue;
  }
  const blob = await put(pathname, fs.readFileSync(file), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'audio/mpeg',
    token,
  });
  baseUrl ||= blob.url.slice(0, blob.url.indexOf(`/${pathname}`));
  uploaded++;
  console.log(`[${i + 1}/${files.length}] ${pathname} (${(size / 1048576).toFixed(1)} MB)`);
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} already there.`);
console.log(`NEXT_PUBLIC_AUDIO_BASE_URL=${baseUrl}`);

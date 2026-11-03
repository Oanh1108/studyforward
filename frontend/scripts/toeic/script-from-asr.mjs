/**
 * Drafts the Part 1 and Part 2 lines of a test's transcript file from the speech recognition of its recordings, for tests
 * whose transcript is only available as a scanned PDF. Optionally uses the OCR text of the PDF pages to correct names
 * and to fill in the speakers' accents.
 *
 *   node scripts/toeic/script-from-asr.mjs --asr-dir tmp/asr-2023-02 --year 2023 --test 2 --out data/toeic/2023/test-02.script.txt [--ocr tmp/ocr-2023-02.txt]
 *
 * The draft always needs a read-through (it marks anything it could not parse with ???), but the audio gives the words
 * and the order, so most lines come out right.
 */
import fs from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing --${name}`);
  }
  return process.argv[i + 1];
};
const asrDir = arg('asr-dir');
const year = arg('year');
const testNo = Number(arg('test'));
const out = arg('out');
const ocrText = process.argv.includes('--ocr') ? fs.readFileSync(arg('ocr'), 'utf8') : '';

const partText = (part) => {
  const asr = JSON.parse(fs.readFileSync(`${asrDir}/asr-part${part}.json`, 'utf8'));
  return asr.chunks.map((c) => c.text).join('').replace(/\s+/g, ' ').trim();
};

// Whisper writes the spoken letters A-D in many ways ("Hey." for A, "See." for C ...)
const MARK = { A: '(?:A|Hey|Ay|Eh|Ah)', B: '(?:B|Be|Bee|Bea)', C: '(?:C|See|Sea|Si|Sees)', D: '(?:D|Dee|Di)' };
const marker = (letter, flags = 'g') => new RegExp(`(?:^|(?<=[.?!] ))${MARK[letter]}[.,] ?`, flags);

function lastMatch(re, text, from = 0, to = text.length) {
  const slice = text.slice(from, to);
  let last = null;
  for (const m of slice.matchAll(re)) last = { start: from + m.index, end: from + m.index + m[0].length };
  return last;
}
function firstMatch(re, text, from = 0) {
  re.lastIndex = 0;
  const m = re.exec(text.slice(from));
  return m ? { start: from + m.index, end: from + m.index + m[0].length } : null;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function tidy(s) {
  let t = s
    .replace(/\b(\d{1,2}) o'clock/g, (_, n) => `${WORDS[+n] ?? n} o'clock`)
    .replace(/\bwebsite\b/gi, 'Web site')
    .replace(/\s+/g, ' ')
    .trim();
  // the announcement of the next question ("Number two. Look at the picture ...") can trail the last line of a block
  t = t.replace(/\s*\bNumber (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b.*$/, '').replace(/^[\s.,]+/, '');
  if (!t) return '???';
  t = t[0].toUpperCase() + t.slice(1);
  if (!/[.?!"')]$/.test(t)) t += /^(who|what|where|when|why|how|which|do|does|did|can|could|would|will|is|are|have|has)\b/i.test(t) ? '?' : '.';
  return t;
}

/** Splits one question's block of text into its question (part 2) and lettered lines. */
function parseBlock(block, letters, hasQuestion) {
  let text = block
    .replace(/Look at the picture marked number \d+ in your test book\.?/gi, '')
    .replace(/(?:^| )(?:Go on to the next page\.?|at the picture\.)/gi, ' ')
    .trim();
  const result = {};
  // the last occurrence of each marker wins: Whisper sometimes repeats a stretch of speech
  const cuts = {};
  let from = 0;
  for (const L of letters) {
    const m = lastMatch(marker(L), text, from) ?? lastMatch(marker(L), text, 0);
    if (!m) { cuts[L] = null; continue; }
    cuts[L] = m;
    from = m.start;
  }
  const first = letters.map((L) => cuts[L]).find(Boolean);
  if (hasQuestion) result.question = tidy(first ? text.slice(0, first.start) : text);
  letters.forEach((L, i) => {
    const c = cuts[L];
    if (!c) { result[L] = '???'; return; }
    const next = letters.slice(i + 1).map((n) => firstMatch(marker(n), text, c.end)).find(Boolean);
    result[L] = tidy(text.slice(c.end, next ? next.start : text.length));
  });
  return result;
}

const NUMBER_WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };

function blocksOf(text, from, to) {
  const found = {};
  for (let n = from; n <= to; n++) {
    // Whisper writes small numbers as words ("Number two") and sometimes drops the word "Number" ("12. Isn't the bus ...")
    const spoken = NUMBER_WORDS[n] ? `(?:${n}|${NUMBER_WORDS[n]})` : `${n}`;
    let hits = [...text.matchAll(new RegExp(`Number ${spoken}[.,]? ?`, 'gi'))];
    if (!hits.length) hits = [...text.matchAll(new RegExp(`(?<=[.?!] )${n}\\. `, 'g'))];
    if (hits.length) found[n] = hits[hits.length - 1];
  }
  const numbers = Object.keys(found).map(Number).sort((a, b) => a - b);
  return numbers.map((n, i) => {
    const start = found[n].index + found[n][0].length;
    const nextStart = i + 1 < numbers.length ? found[numbers[i + 1]].index : text.length;
    return [n, text.slice(start, nextStart)];
  });
}

// OCR hints: accents per question, and a word list for fixing names.
const TAG = '[MW][-\\u2014~]\\s?(?:Am|Ain|Br|Au|Cn|Gn|An)';
const norm = (t) => { const c = t.replace(/\s/g, '').replace(/[—~]/, '-'); const a = c.slice(2).toLowerCase().replace(/^ain$|^an$/, 'am').replace('gn', 'cn'); return c[0].toUpperCase() + '-' + a[0].toUpperCase() + a.slice(1); };
const accents = {};
if (ocrText) {
  const lines = ocrText.split('\n').map((l) => l.trim());
  lines.forEach((l, i) => {
    const one = l.match(/^(\d)[A-Za-z]?\s+([MWmw]{1,2}[-—~]\s?(?:Am|Ain|Br|Au|Cn|Gn|An))\s*$/i);
    if (one) { accents[+one[1]] = [norm(one[2])]; return; }
    if (/^\d{1,2}$/.test(l)) {
      const rest = lines.slice(i + 1, i + 9).filter(Boolean);
      const q = rest[0]?.match(new RegExp(`^(${TAG})\\b`, 'i'));
      const r = rest.slice(1, 5).map((x) => x.match(new RegExp(`^(${TAG})\\s+\\(?[A-C]`, 'i'))).find(Boolean);
      if (q) accents[+l] = [norm(q[1]), ...(r ? [norm(r[1])] : [])];
    }
  });
}
/** Part 2 accents found by the question's own text: the OCR line that starts with a tag and says the question, then the tag in front of response (A). */
function accentsForQuestion(question) {
  if (!ocrText) return [];
  const ocr = ocrText.split('\n').map((l) => l.trim());
  const words = (x) => x.toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
  const q = words(question);
  if (q.length < 3) return [];
  const head = q.slice(0, 4).join(' ');
  for (let i = 0; i < ocr.length; i++) {
    const m = ocr[i].match(new RegExp(`^(${TAG})\\s+(.*)$`, 'i'));
    if (!m || !words(m[2]).slice(0, 4).join(' ').startsWith(head.slice(0, Math.max(8, head.length - 3)))) continue;
    const second = ocr.slice(i + 1, i + 4).map((x) => x.match(new RegExp(`^(${TAG})\\s+[({]?[A-C]`, 'i'))).find(Boolean);
    return [norm(m[1]), ...(second ? [norm(second[1])] : [])];
  }
  return [];
}
const ocrWords = [...new Set((ocrText.match(/[A-Za-z][A-Za-z'’-]{3,}/g) ?? []).map((w) => w.replace(/’/g, "'")))];
const CALENDAR = 'january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday'.split(' ');
const known = new Set(fs.existsSync('data/toeic/2026/test-07.script.txt') ? fs.readFileSync('data/toeic/2026/test-07.script.txt', 'utf8').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) : []);
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const fixed = [];
function fixNames(s) {
  if (!ocrWords.length) return s;
  return s.replace(/[A-Za-z][A-Za-z'-]{3,}/g, (w) => {
    if (known.has(w.toLowerCase()) || CALENDAR.includes(w.toLowerCase()) || w[0] !== w[0].toUpperCase()) return w;
    const exact = ocrWords.find((o) => o.toLowerCase() === w.toLowerCase());
    if (exact) return exact.toLowerCase() === w.toLowerCase() && exact[0] !== w[0] ? w : exact;
    const near = ocrWords.filter((o) => lev(o.toLowerCase(), w.toLowerCase()) <= 1 && o[0].toLowerCase() === w[0].toLowerCase());
    if (near.length === 1) { fixed.push(`${w} -> ${near[0]}`); return near[0]; }
    return w;
  });
}

const lines = [`# TOEIC ${year} - Test ${testNo} listening script, Parts 1 and 2 (draft from the recording's speech recognition${ocrText ? ', names checked against the PDF OCR' : ''}; read through before use). Format: see lib/dictation/toeic/script.ts`];
lines.push('## PART 1 (4 statements each)');
for (const [n, block] of blocksOf(partText(1), 1, 6)) {
  const r = parseBlock(block, ['A', 'B', 'C', 'D'], false);
  // Part 1 speakers are printed beside the picture, which the OCR reads too unreliably to trust: leave them blank
  lines.push(`${n} |  | ${['A', 'B', 'C', 'D'].map((L) => fixNames(r[L])).join(' | ')}`);
}
lines.push('## PART 2 (question | A | B | C)');
for (const [n, block] of blocksOf(partText(2), 7, 31)) {
  const r = parseBlock(block, ['A', 'B', 'C'], true);
  lines.push(`${n} | ${(accentsForQuestion(r.question).length ? accentsForQuestion(r.question) : accents[n] ?? []).join("/")} | ${[r.question, r.A, r.B, r.C].map(fixNames).join(" | ")}`);
}
// Cross-check every sentence against the closest line of the PDF's OCR text and list the ones that differ.
const ocrRaw = ocrText
  .split('\n')
  .map((l) => l.trim().replace(/^[MWmw][-—~]\s?\w{2,3}\s+/, '').replace(/^[({]?[A-C][)}]\s*/, ''))
  .filter((l) => /^[A-Za-z|"']/.test(l) && !/[^\x20-\x7e‘’]/.test(l));
// a sentence that wraps onto a second line is also tried as the two lines joined
const ocrLines = [...ocrRaw, ...ocrRaw.map((l, i) => (i + 1 < ocrRaw.length && !/[.?!]$/.test(l) ? `${l} ${ocrRaw[i + 1]}` : l))];
const toks = (x) => x.toLowerCase().replace(/[‘’]/g, "'").replace(/\|/g, 'i').match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
const f1 = (a, b) => {
  const A = toks(a);
  const B = toks(b);
  if (!A.length || !B.length) return 0;
  const bag = new Map();
  B.forEach((w) => bag.set(w, (bag.get(w) ?? 0) + 1));
  let hit = 0;
  A.forEach((w) => {
    if (bag.get(w) > 0) { hit++; bag.set(w, bag.get(w) - 1); }
  });
  const p = hit / A.length;
  const r = hit / B.length;
  return p + r ? (2 * p * r) / (p + r) : 0;
};
const review = [];
const vocab = new Set();
for (let t = 1; t <= 10; t++) {
  const file = `data/toeic/2026/test-${String(t).padStart(2, '0')}.script.txt`;
  if (fs.existsSync(file)) for (const w of fs.readFileSync(file, 'utf8').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []) vocab.add(w);
}
// the PDF line is safe to take over when it is clean text: capitalised, ends like a sentence, every word a known word or a name
const cleanOcr = (l) => !l.includes('|') && /^[A-Z]/.test(l) && /[.?!]$/.test(l) && toks(l).every((w) => vocab.has(w)) ;
if (ocrLines.length) {
  for (let i = 0; i < lines.length; i++) {
    if (!/^\d/.test(lines[i])) continue;
    const cells = lines[i].split(' | ');
    for (let k = 2; k < cells.length; k++) {
      const sentence = cells[k];
      let best = '';
      let score = 0;
      for (const c of ocrLines) {
        const v = f1(sentence, c);
        if (v > score) { score = v; best = c; }
      }
      // below 0.55 the PDF text for this sentence was probably not read by the OCR at all, so there is nothing to compare
      if (score < 0.55 || score >= 0.97) continue;
      const candidate = best.replace(/’/g, "'");
      if (score >= 0.7 && cleanOcr(candidate) && Math.abs(toks(candidate).length - toks(sentence).length) <= 2) {
        cells[k] = candidate;
        fixed.push(`Q${cells[0]}: "${sentence}" -> "${candidate}"`);
      } else review.push(`Q${cells[0]}: ${sentence}\n      PDF: ${best}`);
    }
    lines[i] = cells.join(' | ');
  }
}
fs.writeFileSync(out, lines.join('\n') + '\n');
const count = lines.filter((l) => /^\d/.test(l)).length;
console.log(`${out}: ${count} questions (expected 31), ${lines.filter((l) => l.includes('???')).length} with ???, ${lines.filter((l) => /^\d+ \| \|/.test(l)).length} without accents`);

if (review.length) console.log('\n' + review.length + ' sentence(s) that differ from the PDF text, to check:\n' + review.join('\n'));
if (fixed.length) console.log('\ncorrected from the PDF text (' + fixed.length + '):\n  ' + fixed.join('\n  '));

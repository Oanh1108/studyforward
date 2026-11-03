/**
 * Finds where each sentence of a script is spoken in a recording, given speech-recognition output with
 * word timings. Used to prepare audio clips for dictation; run at build time, not in the browser.
 */

export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

export interface ScriptSentence {
  id: string;
  text: string;
}

export interface AlignedSentence {
  id: string;
  /** Seconds into the recording, or null if none of the sentence was recognised. */
  start: number | null;
  end: number | null;
  /** How many of the sentence's words were found in the recognised speech. */
  matched: number;
  total: number;
}

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/\balright\b/g, 'all right')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Matches this far from a sentence's typical position are treated as coincidences (common words said elsewhere).
const MIN_SPREAD_SECONDS = 6;
const SPREAD_PER_WORD_SECONDS = 0.6;
// Words closer together than this are the same word recognised twice by overlapping recognition windows.
const DUPLICATE_WITHIN_SECONDS = 0.08;
// Unrecognised words are only treated as part of a sentence if they follow on without a pause.
const MAX_GAP_SECONDS = 0.45;
// Letters and counters the recordings read out between sentences ("A.", "Number 14", "Part 3").
const MARKER = /^(?:[A-D][.,]|number|part|directions)$/i;

interface Heard {
  raw: string;
  word: string;
  start: number;
  end: number;
}

export function alignScript(sentences: ScriptSentence[], asr: TimedWord[]): AlignedSentence[] {
  // Flatten both sides to normalised words; a recognised token such as "45-minute" becomes two words.
  const script: { word: string; sentence: number }[] = [];
  sentences.forEach((s, sentence) => words(s.text).forEach((word) => script.push({ word, sentence })));

  const timeline = asr
    .map((t, order) => ({ ...t, order }))
    .sort((x, y) => x.start - y.start || x.order - y.order);
  const heard: Heard[] = [];
  let lastStart = -Infinity;
  for (const t of timeline) {
    if (t.start - lastStart < DUPLICATE_WITHIN_SECONDS) continue;
    lastStart = t.start;
    for (const word of words(t.text)) heard.push({ raw: t.text.trim(), word, start: t.start, end: t.end });
  }

  const n = script.length;
  const m = heard.length;
  const width = m + 1;
  const table = new Uint16Array((n + 1) * width);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      table[i * width + j] =
        script[i - 1].word === heard[j - 1].word
          ? table[(i - 1) * width + (j - 1)] + 1
          : Math.max(table[(i - 1) * width + j], table[i * width + (j - 1)]);
    }
  }

  // Walk back through the table to recover which script words were matched to which heard words.
  const matchedHeard: (number | null)[] = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (script[i - 1].word === heard[j - 1].word && table[i * width + j] === table[(i - 1) * width + (j - 1)] + 1) {
      matchedHeard[i - 1] = j - 1;
      i--;
      j--;
    } else if (table[(i - 1) * width + j] >= table[i * width + (j - 1)]) {
      i--;
    } else {
      j--;
    }
  }

  // Per sentence: the matches that sit where most of the sentence is (dropping coincidences far away).
  const found = sentences.map((_, sentence) => {
    const hits: number[] = [];
    let total = 0;
    script.forEach((w, i) => {
      if (w.sentence !== sentence) return;
      total++;
      const j = matchedHeard[i];
      if (j !== null) hits.push(j);
    });
    if (hits.length === 0) return { total, kept: [] as number[] };
    const times = hits.map((j) => heard[j].start).sort((p, q) => p - q);
    const median = times[Math.floor(times.length / 2)];
    const spread = Math.max(MIN_SPREAD_SECONDS, total * SPREAD_PER_WORD_SECONDS);
    return { total, kept: hits.filter((j) => Math.abs(heard[j].start - median) <= spread) };
  });

  // Sentences the recogniser found something of, in order.
  const located = found.map((f, k) => (f.kept.length ? k : -1)).filter((k) => k >= 0);
  const lo = new Map<number, number>();
  const hi = new Map<number, number>();
  located.forEach((k) => {
    lo.set(k, Math.min(...found[k].kept));
    hi.set(k, Math.max(...found[k].kept));
  });

  // A sentence the recogniser only half understood still starts and ends where the speaker did, so take in the
  // unrecognised words that run on from the recognised ones: no pause, not a read-out letter or counter.
  const gap = (i: number) => heard[i + 1].start - heard[i].end;
  const startAt = new Map<number, number>(lo);
  const endAt = new Map<number, number>(hi);
  const growEnd = (k: number, limit: number) => {
    let e = hi.get(k)!;
    while (e + 1 <= limit && gap(e) <= MAX_GAP_SECONDS && !MARKER.test(heard[e + 1].raw)) e++;
    endAt.set(k, e);
  };
  const growStart = (k: number, limit: number) => {
    let f = lo.get(k)!;
    while (f - 1 >= limit && gap(f - 1) <= MAX_GAP_SECONDS && !MARKER.test(heard[f - 1].raw)) f--;
    startAt.set(k, f);
  };

  located.forEach((k, pos) => {
    const prev = pos > 0 ? located[pos - 1] : null;
    const next = pos < located.length - 1 ? located[pos + 1] : null;
    if (prev === null) growStart(k, 0);
    if (next === null) {
      growEnd(k, m - 1);
      return;
    }
    // Words between two located sentences go to one side or the other. If only one side is missing words they are
    // most likely its own (a misspelt name, say); otherwise split at the longest pause between them.
    const left = hi.get(k)!;
    const right = lo.get(next)!;
    const missing = (s: number) => found[s].total - found[s].kept.length;
    let split = left;
    if (missing(k) > 0 && missing(next) === 0) split = right - 1;
    else if (missing(k) === 0 && missing(next) > 0) split = left;
    else for (let i = left; i < right; i++) if (gap(i) > gap(split)) split = i;
    growEnd(k, split);
    growStart(next, split + 1);
  });

  return sentences.map((sentence, k) => {
    const { total, kept } = found[k];
    if (kept.length === 0) return { id: sentence.id, start: null, end: null, matched: 0, total };
    return { id: sentence.id, start: heard[startAt.get(k)!].start, end: heard[endAt.get(k)!].end, matched: kept.length, total };
  });
}

const PAD_BEFORE_SECONDS = 0.25;
const PAD_AFTER_SECONDS = 0.4;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Clip {
  start: number;
  end: number;
}

/**
 * Turns aligned sentences into playable clips: a little breathing room around each sentence,
 * never overlapping the sentence next to it, always inside the recording. Unlocated sentences get null.
 */
export function clipsFromAlignment(aligned: AlignedSentence[], duration: number): (Clip | null)[] {
  return aligned.map((a, i) => {
    if (a.start === null || a.end === null) return null;

    let prevEnd: number | null = null;
    for (let k = i - 1; k >= 0; k--) if (aligned[k].end !== null) { prevEnd = aligned[k].end; break; }
    let nextStart: number | null = null;
    for (let k = i + 1; k < aligned.length; k++) if (aligned[k].start !== null) { nextStart = aligned[k].start; break; }

    // Next to another sentence, share the gap between them (the midpoint, even if the recogniser overlapped them).
    let start = a.start - PAD_BEFORE_SECONDS;
    if (prevEnd !== null && a.start - prevEnd < PAD_BEFORE_SECONDS + PAD_AFTER_SECONDS) start = a.start - (a.start - prevEnd) / 2;
    let end = a.end + PAD_AFTER_SECONDS;
    if (nextStart !== null && nextStart - a.end < PAD_BEFORE_SECONDS + PAD_AFTER_SECONDS) end = a.end + (nextStart - a.end) / 2;

    return { start: round2(Math.max(0, start)), end: round2(Math.min(duration, end)) };
  });
}

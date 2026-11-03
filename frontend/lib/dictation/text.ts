/** Text helpers for dictation: comparing what was typed with what was said, and cutting scripts into sentences. */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

type Kind = 'unit' | 'tens' | 'hundred' | 'thousand';
const kindOf = (w: string): Kind | null =>
  w in UNITS ? 'unit' : w in TENS ? 'tens' : w === 'hundred' ? 'hundred' : w === 'thousand' ? 'thousand' : null;

/** Reads a number written in words ("two hundred fifty") starting at `i`. Returns null if there is none. */
function readNumber(tokens: string[], i: number): { value: number; next: number } | null {
  let total = 0;
  let current = 0;
  let last: Kind | null = null;
  let j = i;

  for (; j < tokens.length; j++) {
    const w = tokens[j];
    const kind = kindOf(w);

    if (w === 'and' && (last === 'hundred' || last === 'thousand') && kindOf(tokens[j + 1] ?? '') && kindOf(tokens[j + 1]) !== 'hundred') {
      continue; // "two hundred and fifty"
    }
    if (!kind) break;

    if (kind === 'unit') {
      const isSmallUnit = UNITS[w] >= 1 && UNITS[w] <= 9;
      if (last === 'unit' || (last === 'tens' && !isSmallUnit)) break; // "seven eight" are two numbers
      current += UNITS[w];
    } else if (kind === 'tens') {
      if (last === 'unit' || last === 'tens') break;
      current += TENS[w];
    } else if (kind === 'hundred') {
      if (last === 'hundred' || last === 'thousand' || last === 'tens') break;
      current = (current || 1) * 100;
    } else {
      if (last === 'thousand') break;
      total += (current || 1) * 1000;
      current = 0;
    }
    last = kind;
  }

  return last === null ? null : { value: total + current, next: j };
}

/**
 * Lowercase words in a canonical form, so that equivalent ways of writing the same speech compare equal:
 * "$250.00" = "two hundred fifty dollars", "e-mail" = "email", "45-minute" = "forty-five minute", "it's" = "its".
 */
export function canonicalWords(text: string): string[] {
  const s = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/'/g, '')
    .replace(/\$\s*(\d[\d,]*)(?:\.\d+)?/g, (_, n: string) => ` ${n.replace(/,/g, '')} dollars `)
    .replace(/%/g, ' percent ')
    .replace(/\be[\s-]?mail\b/g, 'email')
    .replace(/\bweb[\s-]?site\b/g, 'website')
    .replace(/\bok\b/g, 'okay')
    .replace(/[^a-z0-9\s]/g, ' ');

  const tokens = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    const number = readNumber(tokens, i);
    if (number) {
      out.push(String(number.value));
      i = number.next;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

const ABBREVIATIONS = new Set(['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'st.', 'jr.', 'sr.', 'vs.', 'etc.', 'inc.', 'ltd.', 'co.', 'no.', 'e.g.', 'i.e.']);
const MIN_WORDS_PER_SENTENCE = 2;

/**
 * Cuts a script into sentences for dictation. Abbreviations ("Dr.") do not end a sentence, and a very short
 * fragment ("Sure.", "Oh!") is joined to the sentence after it, so every clip has something worth typing.
 */
export function splitSentences(text: string): string[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const raw: string[] = [];
  let current: string[] = [];
  for (const token of tokens) {
    current.push(token);
    const endsSentence = /[.?!]["')\]”]?$/.test(token) && !ABBREVIATIONS.has(token.toLowerCase());
    if (endsSentence) {
      raw.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) raw.push(current.join(' '));

  const merged: string[] = [];
  let carry = '';
  raw.forEach((sentence, index) => {
    const candidate = carry ? `${carry} ${sentence}` : sentence;
    const isLast = index === raw.length - 1;
    if (!isLast && candidate.split(/\s+/).length < MIN_WORDS_PER_SENTENCE) {
      carry = candidate;
    } else {
      merged.push(candidate);
      carry = '';
    }
  });
  return merged;
}

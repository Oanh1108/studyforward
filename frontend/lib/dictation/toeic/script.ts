import { splitSentences } from '../text.ts';
import type { DictationItem, DictationSegment, ToeicPart } from './types.ts';

/**
 * Reads a test's transcript file. Format (one question or group per line, "#" starts a comment):
 *
 *   ## PART 1
 *   1 | M-Au | statement A | statement B | statement C | statement D
 *   ## PART 2
 *   7 | M-Au/W-Am | question | response A | response B | response C
 *   ## PART 3
 *   32-34 | M-Cn/W-Am | M: first turn || W: second turn || M: third turn
 *   ## PART 4
 *   71-73 | W-Am | the whole talk
 */
export interface ScriptEntry {
  part: ToeicPart;
  from: number;
  to: number;
  accents: string[];
  /** Part 1 and 2: the spoken lines. */
  lines?: string[];
  /** Part 3: who says what. */
  turns?: { speaker: string; text: string }[];
  /** Part 4: the talk. */
  text?: string;
}

export function parseScript(source: string): ScriptEntry[] {
  const entries: ScriptEntry[] = [];
  let part: ToeicPart | null = null;

  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || (line.startsWith('#') && !line.startsWith('##'))) return;
    const where = `line ${index + 1}`;

    const heading = line.match(/^##\s*PART\s*([1-4])\b/i);
    if (heading) {
      part = Number(heading[1]) as ToeicPart;
      return;
    }
    if (!part) throw new Error(`${where}: question found outside any part ("## PART n" is missing)`);

    const cells = line.split('|').map((c) => c.trim());
    const range = cells[0].match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!range) throw new Error(`${where}: expected a question number first, got "${cells[0]}"`);
    const from = Number(range[1]);
    const to = Number(range[2] ?? range[1]);
    const accents = (cells[1] ?? '').split('/').map((a) => a.trim()).filter(Boolean);
    const entry: ScriptEntry = { part, from, to, accents };

    if (part === 1) {
      if (cells.length !== 6) throw new Error(`${where}: Part 1 needs 4 statements, found ${cells.length - 2}`);
      entry.lines = cells.slice(2);
    } else if (part === 2) {
      if (cells.length !== 6) throw new Error(`${where}: Part 2 needs a question and 3 responses (4 lines), found ${cells.length - 2}`);
      entry.lines = cells.slice(2);
    } else if (part === 3) {
      const body = cells.slice(2).join('|');
      entry.turns = body.split('||').map((turn) => {
        const m = turn.trim().match(/^([MW]\d?):\s*(.+)$/);
        if (!m) throw new Error(`${where}: each Part 3 turn must start with a speaker like "M:" or "W:", got "${turn.trim().slice(0, 30)}"`);
        return { speaker: m[1], text: m[2].trim() };
      });
    } else {
      entry.text = cells.slice(2).join('|');
      if (!entry.text) throw new Error(`${where}: Part 4 needs the talk text`);
    }
    entries.push(entry);
  });

  return entries;
}

const dash = '–';
const labelFor = (from: number, to: number) => (from === to ? `Câu ${from}` : `Câu ${from}${dash}${to}`);

/** Turns parsed script entries into practice items, each cut into sentences to type. */
export function buildItems(entries: ScriptEntry[]): DictationItem[] {
  return entries.map((entry) => {
    const id = `p${entry.part}-q${entry.from}`;
    const segments: DictationSegment[] = [];
    const add = (suffix: string, text: string, extra: Partial<DictationSegment> = {}) =>
      segments.push({ id: `${id}-${suffix}`, text, ...extra });

    if (entry.part === 1) {
      entry.lines!.forEach((text, i) => add('abcd'[i], text, { tag: 'ABCD'[i] }));
    } else if (entry.part === 2) {
      entry.lines!.forEach((text, i) => add(i === 0 ? 'q' : 'abc'[i - 1], text, { tag: i === 0 ? 'Q' : 'ABC'[i - 1] }));
    } else if (entry.part === 3) {
      let n = 0;
      for (const turn of entry.turns!) {
        for (const text of splitSentences(turn.text)) add(String(++n), text, { speaker: turn.speaker });
      }
    } else {
      splitSentences(entry.text!).forEach((text, i) => add(String(i + 1), text));
    }

    return { id, part: entry.part, label: labelFor(entry.from, entry.to), accents: entry.accents, segments };
  });
}

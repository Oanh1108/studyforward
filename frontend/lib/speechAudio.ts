import { canonicalWords } from './dictation/text.ts';

/** Pure helpers for judging a recording before and after speech-to-text. No browser APIs. */

export interface AudioLevels {
  peak: number;
  rms: number;
}

// Whisper peaks at 0.8 after normalization; quiet-but-real speech (peak ~0.05) is still recognised.
const TARGET_PEAK = 0.8;
const NORMALIZE_BELOW_PEAK = 0.5;
const MIN_NORMALIZABLE_PEAK = 0.001;
// Below this the microphone delivered effectively nothing.
const SILENT_PEAK = 0.01;

export function measureAudio(samples: Float32Array): AudioLevels {
  if (samples.length === 0) return { peak: 0, rms: 0 };
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    peak = Math.max(peak, Math.abs(v));
    sumSquares += v * v;
  }
  return { peak, rms: Math.sqrt(sumSquares / samples.length) };
}

/** Scales quiet recordings up so Whisper can hear them. Returns a copy; never amplifies silence. */
export function normalizeSamples(samples: Float32Array): Float32Array {
  const { peak } = measureAudio(samples);
  if (peak < MIN_NORMALIZABLE_PEAK || peak >= NORMALIZE_BELOW_PEAK) return samples;
  const scale = TARGET_PEAK / peak;
  return samples.map((v) => v * scale);
}

export function isSilentRecording({ peak }: AudioLevels): boolean {
  return peak < SILENT_PEAK;
}

// What Whisper "hears" in noise or silence. Only whole-transcript matches are flagged, so a real
// sentence that merely contains these words is kept.
const HALLUCINATIONS = new Set([
  'you',
  'thank you',
  'thanks',
  'thanks for watching',
  'thank you for watching',
  'bye',
  'okay',
]);

export function isWhisperHallucination(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return cleaned === '' || HALLUCINATIONS.has(cleaned);
}

export type WordStatus = 'correct' | 'wrong' | 'neutral';

export interface ComparedWord {
  /** The word exactly as written in the target sentence. */
  text: string;
  /** `neutral` for symbols with nothing to pronounce (e.g. "&"). */
  status: WordStatus;
}

export interface WordComparison {
  words: ComparedWord[];
  /** Share of target words that were read, 0-100. */
  score: number;
  /** Words that were said or typed but are not in the target sentence. */
  extra: string[];
}

/**
 * Aligns what was heard with the target sentence, in order (longest common subsequence), and
 * reports which target words were read correctly. Extra spoken words are ignored.
 */
export function compareWords(target: string, heard: string): WordComparison {
  const tokens = target.split(/\s+/).filter(Boolean);
  const flat = tokens.flatMap((token, tokenIndex) => canonicalWords(token).map((word) => ({ tokenIndex, word })));
  const said = canonicalWords(heard);

  // dp[i][j] = longest common subsequence of flat[0..i) and said[0..j)
  const dp = Array.from({ length: flat.length + 1 }, () => new Array<number>(said.length + 1).fill(0));
  for (let i = 1; i <= flat.length; i++) {
    for (let j = 1; j <= said.length; j++) {
      dp[i][j] = flat[i - 1].word === said[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = new Array<boolean>(flat.length).fill(false);
  const usedSaid = new Array<boolean>(said.length).fill(false);
  for (let i = flat.length, j = said.length; i > 0 && j > 0; ) {
    if (flat[i - 1].word === said[j - 1]) {
      matched[i - 1] = true;
      usedSaid[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const words: ComparedWord[] = tokens.map((text, tokenIndex) => {
    const own = flat.map((f, k) => ({ ...f, k })).filter((f) => f.tokenIndex === tokenIndex);
    if (own.length === 0) return { text, status: 'neutral' };
    return { text, status: own.every((f) => matched[f.k]) ? 'correct' : 'wrong' };
  });

  const hits = matched.filter(Boolean).length;
  return {
    words,
    score: flat.length === 0 ? 0 : Math.round((hits / flat.length) * 100),
    extra: said.filter((_, k) => !usedSaid[k]),
  };
}

export type ToeicPart = 1 | 2 | 3 | 4;

/** A stretch of a part's recording, in seconds. */
export interface AudioClip {
  start: number;
  end: number;
}

export interface DictationSegment {
  id: string;
  text: string;
  /** Who is speaking in a conversation (M, W, M1, M2...). */
  speaker?: string;
  /** Part 1: A-D, Part 2: Q (question) then A-C. */
  tag?: string;
  /** Where this sentence is in the part's recording; absent if it could not be located. */
  clip?: AudioClip;
}

/** One thing to practise: a photo (Part 1), a question (Part 2), a conversation (Part 3) or a talk (Part 4). */
export interface DictationItem {
  id: string;
  part: ToeicPart;
  /** For learners, e.g. "Câu 32–34". */
  label: string;
  accents: string[];
  segments: DictationSegment[];
}

export interface ToeicTest {
  id: string;
  year: number;
  test: number;
  title: string;
  /** Recording of each part, as a URL under /public. A test may cover only some parts (the 2023 tests: Parts 1 and 2). */
  audio: Partial<Record<ToeicPart, string>>;
  items: DictationItem[];
}

export const ALL_PARTS: ToeicPart[] = [1, 2, 3, 4];

/** The parts this test has a recording for, in order. */
export const partsOf = (test: ToeicTest): ToeicPart[] => ALL_PARTS.filter((p) => test.audio[p]);

export function audioFor(test: ToeicTest, part: ToeicPart): string {
  const src = test.audio[part];
  if (!src) throw new Error(`${test.id} has no recording for Part ${part}`);
  return src;
}

export const PART_INFO: Record<ToeicPart, { title: string; subtitle: string }> = {
  1: { title: 'Part 1', subtitle: 'Mô tả tranh' },
  2: { title: 'Part 2', subtitle: 'Hỏi – đáp' },
  3: { title: 'Part 3', subtitle: 'Hội thoại' },
  4: { title: 'Part 4', subtitle: 'Bài nói' },
};

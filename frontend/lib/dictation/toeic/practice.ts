import type { PracticeSegment, PracticeSpec } from '../practice.ts';
import { audioUrl } from '../audioUrl.ts';
import { PART_INFO, audioFor, type DictationItem, type ToeicPart, type ToeicTest } from './types.ts';

const toSegments = (item: DictationItem): PracticeSegment[] =>
  item.segments.map(({ id, text, tag, speaker, clip }) => ({ id, text, tag, speaker, clip }));

/** Progress is saved per test: item ids such as p1-q1 repeat in every test. */
export const progressKey = (test: ToeicTest, item: DictationItem) => `${test.id}/${item.id}`;

const group = (test: ToeicTest, item: DictationItem) => ({ id: progressKey(test, item), segmentIds: item.segments.map((s) => s.id) });

/** A practice session for one question or conversation. */
export function specForItem(test: ToeicTest, item: DictationItem): PracticeSpec {
  const info = PART_INFO[item.part];
  return {
    title: test.title,
    subtitle: `${info.title} · ${info.subtitle} · ${item.label}`,
    segments: toSegments(item),
    audioSrc: audioUrl(audioFor(test, item.part)),
    groups: [group(test, item)],
  };
}

/** A practice session that goes through a whole part, one item after another. */
export function specForPart(test: ToeicTest, part: ToeicPart): PracticeSpec {
  const items = test.items.filter((i) => i.part === part);
  const info = PART_INFO[part];
  return {
    title: test.title,
    subtitle: `${info.title} · ${info.subtitle} · cả phần`,
    segments: items.flatMap(toSegments),
    audioSrc: audioUrl(audioFor(test, part)),
    groups: items.map((i) => group(test, i)),
  };
}

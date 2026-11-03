import type { AudioClip } from './toeic/types.ts';

/** One sentence to listen to and type. */
export interface PracticeSegment {
  id: string;
  text: string;
  translation?: string;
  /** Part 1/2 role of the sentence: A-D, or Q for a question. */
  tag?: string;
  /** Who is speaking in a conversation. */
  speaker?: string;
  /** Where to play it in the recording. Without a clip the sentence is read by the browser's voice. */
  clip?: AudioClip;
}

/** Everything the practice screen needs to run one session. */
export interface PracticeSpec {
  title: string;
  subtitle?: string;
  segments: PracticeSegment[];
  /** The recording the clips refer to. */
  audioSrc?: string;
  /** Sentences grouped by the thing they belong to, so results can be saved per item. */
  groups?: { id: string; segmentIds: string[] }[];
}

export interface SegmentOutcome {
  segmentId: string;
  /** 0-100, how many words were right. */
  score: number;
}

/** Average score per group, for saving progress. Groups with no answered sentence are left out. */
export function scoreGroups(spec: PracticeSpec, outcomes: SegmentOutcome[]): { id: string; score: number }[] {
  const byId = new Map(outcomes.map((o) => [o.segmentId, o.score]));
  return (spec.groups ?? []).flatMap((group) => {
    const scores = group.segmentIds.map((id) => byId.get(id)).filter((s): s is number => s !== undefined);
    return scores.length ? [{ id: group.id, score: Math.round(scores.reduce((n, s) => n + s, 0) / scores.length) }] : [];
  });
}

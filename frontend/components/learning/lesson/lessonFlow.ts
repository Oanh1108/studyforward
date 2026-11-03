import type { Lesson } from '../types';

export type StepKey = 'listen' | 'quiz' | 'dictation' | 'speak';

export interface FlowStep {
  key: StepKey;
  label: string;
}

type FlowLesson = Pick<Lesson, 'skill' | 'content'>;
type TextLesson = Pick<Lesson, 'title' | 'subtitle' | 'content'>;

/**
 * How the learner practises the lesson sentence, by skill: say it aloud, or hear/read it and write it down.
 * The first step introduces the sentence; a quiz step follows when the lesson has quiz content.
 */
const FLOWS: Record<Lesson['skill'], { intro: string; activity: FlowStep }> = {
  speaking: { intro: 'Nghe mẫu', activity: { key: 'speak', label: 'Nói' } },
  vocab: { intro: 'Nghe', activity: { key: 'speak', label: 'Nói' } },
  reading: { intro: 'Đọc', activity: { key: 'speak', label: 'Đọc to' } },
  listening: { intro: 'Nghe', activity: { key: 'dictation', label: 'Chép lại' } },
  grammar: { intro: 'Đọc hiểu', activity: { key: 'dictation', label: 'Chép lại' } },
  writing: { intro: 'Đọc', activity: { key: 'dictation', label: 'Viết lại' } },
};

export function getLessonFlow(lesson: FlowLesson): FlowStep[] {
  const { intro, activity } = FLOWS[lesson.skill] ?? FLOWS.speaking;
  const steps: FlowStep[] = [{ key: 'listen', label: intro }];
  if (lesson.content?.quiz?.length) steps.push({ key: 'quiz', label: 'Trắc nghiệm' });
  steps.push(activity);
  return steps;
}

/** The sentence practised in the listen, speak and dictation steps. */
export const practiceText = (lesson: TextLesson): string => lesson.content?.sentence.text ?? lesson.title;

/** Its meaning in Vietnamese. */
export const practiceMeaning = (lesson: TextLesson): string => lesson.content?.sentence.meaning ?? lesson.subtitle;

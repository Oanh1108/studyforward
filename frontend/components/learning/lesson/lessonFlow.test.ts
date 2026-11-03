import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLessonFlow, practiceMeaning, practiceText } from './lessonFlow.ts';

const SKILLS = ['vocab', 'grammar', 'listening', 'speaking', 'reading', 'writing'] as const;
type Skill = (typeof SKILLS)[number];

const quizContent = {
  sentence: { text: 'Could we meet in the middle?', meaning: 'Chúng ta thỏa hiệp nhé?' },
  keyTerms: [{ term: 'compromise', meaning: 'thỏa hiệp' }],
  quiz: [{ question: 'Q?', options: ['a', 'b'], correctIndex: 1, explanation: 'because' }],
};

const lesson = (skill: Skill, content: typeof quizContent | null = null) => ({
  skill,
  title: 'Workplace Negotiation & Compromise',
  subtitle: 'Thương lượng điều khoản',
  content,
});

test('every skill starts by introducing the sentence and ends with an activity', () => {
  for (const skill of SKILLS) {
    const flow = getLessonFlow(lesson(skill));
    assert.ok(flow.length >= 2, `${skill} should have at least two steps`);
    assert.equal(flow[0].key, 'listen', `${skill} should start with the listen step`);
    assert.ok(['speak', 'dictation'].includes(flow.at(-1)!.key), `${skill} should end with an activity`);
  }
});

test('speaking and vocabulary lessons end by speaking, the rest by writing the sentence down', () => {
  assert.equal(getLessonFlow(lesson('speaking')).at(-1)?.key, 'speak');
  assert.equal(getLessonFlow(lesson('vocab')).at(-1)?.key, 'speak');
  assert.equal(getLessonFlow(lesson('reading')).at(-1)?.key, 'speak');
  assert.equal(getLessonFlow(lesson('listening')).at(-1)?.key, 'dictation');
  assert.equal(getLessonFlow(lesson('grammar')).at(-1)?.key, 'dictation');
  assert.equal(getLessonFlow(lesson('writing')).at(-1)?.key, 'dictation');
});

test('a lesson without quiz content has no quiz step', () => {
  for (const skill of SKILLS) {
    assert.ok(!getLessonFlow(lesson(skill)).some((s) => s.key === 'quiz'));
  }
});

test('a lesson with quiz content gets a quiz step between the introduction and the activity', () => {
  for (const skill of SKILLS) {
    const keys = getLessonFlow(lesson(skill, quizContent)).map((s) => s.key);
    assert.equal(keys[0], 'listen');
    assert.equal(keys[1], 'quiz');
    assert.ok(['speak', 'dictation'].includes(keys[2]));
    assert.equal(keys.length, 3);
  }
});

test('an empty quiz list does not add a quiz step', () => {
  const keys = getLessonFlow(lesson('speaking', { ...quizContent, quiz: [] })).map((s) => s.key);
  assert.ok(!keys.includes('quiz'));
});

test('step labels are non-empty and unique within a flow, with or without a quiz', () => {
  for (const skill of SKILLS) {
    for (const content of [null, quizContent]) {
      const labels = getLessonFlow(lesson(skill, content)).map((s) => s.label);
      assert.ok(labels.every(Boolean));
      assert.equal(new Set(labels).size, labels.length, `${skill} has duplicate labels`);
    }
  }
});

test('an unknown skill falls back to the speaking flow instead of crashing', () => {
  assert.deepEqual(getLessonFlow(lesson('something-new' as Skill)), getLessonFlow(lesson('speaking')));
});

test('practiceText and practiceMeaning use the authored sentence when there is one', () => {
  const l = lesson('speaking', quizContent);
  assert.equal(practiceText(l), 'Could we meet in the middle?');
  assert.equal(practiceMeaning(l), 'Chúng ta thỏa hiệp nhé?');
});

test('practiceText and practiceMeaning fall back to the title and subtitle for lessons without content', () => {
  const l = lesson('speaking');
  assert.equal(practiceText(l), 'Workplace Negotiation & Compromise');
  assert.equal(practiceMeaning(l), 'Thương lượng điều khoản');
});

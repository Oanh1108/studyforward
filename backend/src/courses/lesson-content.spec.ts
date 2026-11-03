import { describe, expect, it } from 'vitest';
import { DEFAULT_LESSON_CONTENT } from './lesson-content.js';
import { INITIAL_LESSONS } from './courses.service.js';

describe('default lesson content', () => {
  it('covers every seeded lesson', () => {
    for (const lesson of INITIAL_LESSONS) {
      expect(DEFAULT_LESSON_CONTENT[lesson.id as string], `no content for ${lesson.id}`).toBeDefined();
    }
  });

  it('has no content for lessons that do not exist', () => {
    const ids = new Set(INITIAL_LESSONS.map((l) => l.id));
    for (const id of Object.keys(DEFAULT_LESSON_CONTENT)) {
      expect(ids.has(id), `content for unknown lesson ${id}`).toBe(true);
    }
  });

  describe.each(Object.entries(DEFAULT_LESSON_CONTENT))('%s', (id, content) => {
    it('has a practice sentence with its meaning', () => {
      expect(content.sentence.text.trim().split(/\s+/).length).toBeGreaterThanOrEqual(4);
      expect(content.sentence.meaning.trim()).not.toBe('');
    });

    it('has key terms, each with a meaning', () => {
      expect(content.keyTerms.length).toBeGreaterThanOrEqual(2);
      for (const term of content.keyTerms) {
        expect(term.term.trim()).not.toBe('');
        expect(term.meaning.trim()).not.toBe('');
      }
    });

    it('has quiz questions with one valid correct answer and an explanation', () => {
      expect(content.quiz.length).toBeGreaterThanOrEqual(1);
      for (const q of content.quiz) {
        expect(q.question.trim()).not.toBe('');
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size, `duplicate options in "${q.question}"`).toBe(q.options.length);
        expect(Number.isInteger(q.correctIndex)).toBe(true);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(q.explanation.trim()).not.toBe('');
      }
    });

    it('does not always put the correct answer first', () => {
      // Guards against content where the answer position is predictable.
      const positions = new Set(content.quiz.map((q) => q.correctIndex));
      if (content.quiz.length >= 2) expect(positions.size).toBeGreaterThan(1);
    });
  });
});

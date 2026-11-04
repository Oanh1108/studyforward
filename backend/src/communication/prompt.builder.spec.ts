import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildSummaryPrompt } from './prompt.builder.js';

describe('buildSystemPrompt', () => {
  it('always contains the teacher rules', () => {
    const p = buildSystemPrompt({ mode: 'free', topic: 'food', level: 'B1', correctionMode: 'gentle' });
    expect(p).toContain('friendly, patient and professional English conversation teacher');
    expect(p).toContain('Ask only ONE question at a time');
  });

  it('changes behaviour with the CEFR level', () => {
    const a1 = buildSystemPrompt({ mode: 'free', topic: 'food', level: 'A1', correctionMode: 'gentle' });
    const c1 = buildSystemPrompt({ mode: 'free', topic: 'food', level: 'C1', correctionMode: 'gentle' });
    expect(a1).toContain('ALWAYS provide 2-3 suggested replies');
    expect(c1).not.toContain('ALWAYS provide 2-3 suggested replies');
    expect(c1).toContain('close to a native speaker');
  });

  it('keeps the AI in character during roleplay', () => {
    const p = buildSystemPrompt({ mode: 'roleplay', topic: 'coffee-shop', level: 'A2', correctionMode: 'gentle' });
    expect(p).toContain('ROLE-PLAY');
    expect(p).toContain('a friendly barista');
    expect(p).toContain('Stay in character');
  });

  it('makes daily practice follow up on the previous answer', () => {
    const p = buildSystemPrompt({ mode: 'daily', topic: 'hobbies', level: 'B1', correctionMode: 'gentle' });
    expect(p).toContain('DAILY SPEAKING PRACTICE');
    expect(p).toContain('MUST follow from what the student just said');
  });

  it('switches correction style', () => {
    const none = buildSystemPrompt({ mode: 'free', topic: 'food', level: 'B1', correctionMode: 'none' });
    const detailed = buildSystemPrompt({ mode: 'free', topic: 'food', level: 'B1', correctionMode: 'detailed' });
    expect(none).toContain('Do NOT correct the student');
    expect(detailed).toContain('DETAILED');
  });

  it('summary prompt forbids inventing content', () => {
    expect(buildSummaryPrompt({ mode: 'free', topic: 'food', level: 'B1', correctionMode: 'gentle' })).toContain('Do not invent');
  });
});

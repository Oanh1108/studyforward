"use client";

import React from 'react';
import { Volume2 } from 'lucide-react';
import { Lesson } from '../types';
import { WordComparison } from '@/lib/speechAudio';
import { ScoreSummary, WordChips } from './ScoreResult';
import { practiceText } from './lessonFlow';

interface DictationStepProps {
  lesson: Lesson;
  part: number;
  label: string;
  text: string;
  onTextChange: (value: string) => void;
  /** Set once the learner pressed "Kiểm tra"; the text is locked from then on. */
  comparison: WordComparison | null;
  isPlaying: boolean;
  onPlay: (text: string) => void;
  onPlayWord: (word: string) => void;
}

/** Hear the sentence, type it back, then see which words were right. */
export function DictationStep({ lesson, part, label, text, onTextChange, comparison, isPlaying, onPlay, onPlayWord }: DictationStepProps) {
  const checked = comparison !== null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Phần {part} · {label}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Nghe và gõ lại câu bạn nghe được</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
          <button
            type="button"
            onClick={() => onPlay(practiceText(lesson))}
            aria-label={isPlaying ? 'Đang phát' : 'Nghe câu'}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
              isPlaying ? 'bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Volume2 className={`h-6 w-6 ${isPlaying ? 'animate-pulse' : ''}`} />
          </button>
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--text-primary)]">Bấm để nghe câu</p>
            <p className="text-sm text-[var(--text-secondary)]">Bạn có thể nghe lại bao nhiêu lần tùy ý.</p>
          </div>
        </div>
  
        <div>
          <label htmlFor="dictation-answer" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">Câu bạn nghe được</label>
          <textarea
            id="dictation-answer"
            rows={2}
            value={text}
            disabled={checked}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Gõ lại câu bạn vừa nghe..."
            autoComplete="off"
            spellCheck={false}
            className="w-full resize-none rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-80"
          />
        </div>
        </div>

        <div role="status" aria-live="polite">
          {comparison ? (
            <div className="space-y-4 animate-fade-up">
              <ScoreSummary score={comparison.score} detail={`Câu đúng: “${practiceText(lesson)}”`} />
              <WordChips comparison={comparison} onPlayWord={onPlayWord} />
            </div>
          ) : (
            <div className="hidden min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)] md:flex">
              Điểm số và các từ cần luyện sẽ hiện ở đây sau khi bạn bấm Kiểm tra.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

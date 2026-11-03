"use client";

import React from 'react';
import { Lightbulb, Volume2 } from 'lucide-react';
import { Lesson } from '../types';
import { practiceMeaning, practiceText } from './lessonFlow';

interface ListenStepProps {
  lesson: Lesson;
  /** 1-based position of this step and its label, shown in the heading. */
  part: number;
  label: string;
  isPlaying: boolean;
  onPlay: (text: string) => void;
}

/** Introduces the lesson sentence (with its meaning and pronunciation) and its key terms. */
export function ListenStep({ lesson, part, label, isPlaying, onPlay }: ListenStepProps) {
  const sentence = practiceText(lesson);
  const meaning = practiceMeaning(lesson);
  const terms = lesson.content?.keyTerms ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Phần {part} · {label}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Làm quen với câu của bài học</h2>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-6 text-center">
        <p className="text-xl font-extrabold leading-snug text-[var(--text-primary)]">{sentence}</p>
        {meaning && <p className="mt-2 text-base text-[var(--text-secondary)]">{meaning}</p>}
        <button
          type="button"
          onClick={() => onPlay(sentence)}
          aria-label={isPlaying ? 'Đang phát' : 'Nghe phát âm mẫu'}
          className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
            isPlaying ? 'bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Volume2 className={`h-5 w-5 ${isPlaying ? 'animate-pulse' : ''}`} />
          {isPlaying ? 'Đang phát...' : 'Nghe phát âm mẫu'}
        </button>
      </div>

      {terms.length > 0 && (
        <section className="rounded-[20px] border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">
            <Lightbulb className="h-4 w-4" /> Từ khóa cần nhớ
          </h3>
          <ul className="mt-2 space-y-2">
            {terms.map(({ term, ipa, meaning: termMeaning }) => (
              <li key={term} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => onPlay(term.replace(/[…]/g, ''))}
                  aria-label={`Nghe phát âm ${term}`}
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
                <span>
                  <strong className="text-[var(--text-primary)]">{term}</strong>
                  {ipa && <span className="ml-1.5 text-[var(--text-muted)]">{ipa}</span>}
                  <span> — {termMeaning}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import React from 'react';
import { Check, X } from 'lucide-react';
import { QuizQuestion } from '../types';

interface QuizStepProps {
  part: number;
  label: string;
  questions: QuizQuestion[];
  /** Chosen option per question (null = not answered yet). */
  answers: (number | null)[];
  checked: boolean;
  onSelect: (questionIndex: number, optionIndex: number) => void;
}

export function QuizStep({ part, label, questions, answers, checked, onSelect }: QuizStepProps) {
  const correctCount = questions.filter((q, i) => answers[i] === q.correctIndex).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Phần {part} · {label}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Kiểm tra nhanh những gì vừa học</h2>
        <div role="status" aria-live="polite" className="mt-1 text-sm text-[var(--text-secondary)]">
          {checked ? `Bạn trả lời đúng ${correctCount}/${questions.length} câu.` : `${questions.length} câu hỏi. Chọn một đáp án cho mỗi câu.`}
        </div>
      </div>

      {questions.map((q, qi) => {
        const picked = answers[qi];
        const isRight = picked === q.correctIndex;
        return (
          <fieldset key={qi} className="space-y-3">
            <legend className="text-base font-bold leading-snug text-[var(--text-primary)]">
              <span className="mr-2 text-[var(--text-muted)]">{qi + 1}.</span>
              {q.question}
            </legend>

            <div role="radiogroup" aria-label={`Đáp án câu ${qi + 1}`} className="space-y-2">
              {q.options.map((option, oi) => {
                const chosen = picked === oi;
                const showCorrect = checked && oi === q.correctIndex;
                const showWrong = checked && chosen && oi !== q.correctIndex;
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    disabled={checked}
                    onClick={() => onSelect(qi, oi)}
                    className={`flex w-full items-center gap-3 rounded-[20px] border p-3.5 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                      showCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-[var(--text-primary)] dark:bg-emerald-500/10'
                        : showWrong
                          ? 'border-rose-500 bg-rose-50 text-[var(--text-primary)] dark:bg-rose-500/10'
                          : chosen
                            ? 'border-indigo-600 bg-indigo-50 text-[var(--text-primary)] dark:bg-indigo-500/10'
                            : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-indigo-400'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        showCorrect
                          ? 'bg-emerald-500 text-white'
                          : showWrong
                            ? 'bg-rose-500 text-white'
                            : chosen
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>

            {checked && (
              <p
                className={`rounded-[20px] border p-3.5 text-sm leading-relaxed animate-fade-up ${
                  isRight
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100'
                    : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100'
                }`}
              >
                <strong>{isRight ? 'Chính xác! ' : `Chưa đúng. Đáp án đúng là ${String.fromCharCode(65 + q.correctIndex)}. `}</strong>
                {q.explanation}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

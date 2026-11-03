"use client";

import React from 'react';
import { Check } from 'lucide-react';
import type { FlowStep } from './lessonFlow';

/** Labelled steps for this lesson; finished steps show a check, the current one is highlighted. */
export function LessonStepper({ steps, current }: { steps: FlowStep[]; current: number }) {
  return (
    <ol className="flex flex-1 items-center gap-2" aria-label="Các bước của bài học">
      {steps.map((step, index) => {
        const number = index + 1;
        const done = current > number;
        const active = current === number;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : number}
            </span>
            <span className={`hidden whitespace-nowrap text-sm sm:inline ${active ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-muted)]'}`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className={`h-0.5 flex-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-[var(--bg-muted)]'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import React from 'react';
import { Headphones, Volume2 } from 'lucide-react';
import { SAMPLE_LESSONS } from '@/lib/dictation/samples';
import type { ProgressMap } from '@/lib/dictation/progress';
import type { PracticeSpec } from './types';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function SampleBrowser({ progress, onStart }: { progress: ProgressMap; onStart: (spec: PracticeSpec) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {SAMPLE_LESSONS.map((lesson) => {
        const best = progress[lesson.id]?.best;
        return (
          <li key={lesson.id}>
            <button
              type="button"
              onClick={() =>
                onStart({
                  title: lesson.title,
                  subtitle: 'Bài mẫu · giọng đọc của trình duyệt',
                  segments: lesson.segments,
                  groups: [{ id: lesson.id, segmentIds: lesson.segments.map((s) => s.id) }],
                })
              }
              className={`flex h-full w-full flex-col gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition-colors hover:border-indigo-400 ${focusRing}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Headphones className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-[var(--text-primary)]">{lesson.title}</span>
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">{lesson.description}</span>
              </span>
              <span className="mt-auto flex items-center justify-between text-sm text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5"><Volume2 className="h-4 w-4" /> {lesson.segments.length} câu</span>
                <span className="font-semibold">{best === undefined ? 'Chưa luyện' : `Đạt ${best}%`}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

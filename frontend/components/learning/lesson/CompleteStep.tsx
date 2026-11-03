"use client";

import React from 'react';
import { Flame, Star, Trophy } from 'lucide-react';
import { Lesson } from '../types';

export function CompleteStep({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  return (
    <div className="flex w-full flex-col items-center py-2 text-center animate-fade-up">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/15">
        <Trophy className="h-10 w-10" />
      </span>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Hoàn thành bài học!</h2>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
        Bạn đã nắm vững nội dung bài “{lesson.title}”.
      </p>

      <dl className="mt-6 grid w-full max-w-xs grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
          <dt className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Star className="h-4 w-4 text-amber-500" /> Điểm XP
          </dt>
          <dd className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">+{lesson.xpReward}</dd>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
          <dt className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Flame className="h-4 w-4 text-orange-500" /> Chuỗi ngày
          </dt>
          <dd className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">+1 ngày</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        Quay lại bài học
      </button>
    </div>
  );
}

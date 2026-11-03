"use client";

import React, { useEffect, useRef } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import type { PracticeSegment, SegmentOutcome } from './types';

interface PracticeSummaryProps {
  title: string;
  subtitle?: string;
  /** The sentences of this run, in the order they were practised. */
  queue: PracticeSegment[];
  outcomes: SegmentOutcome[];
  onExit: () => void;
  onRestartAll: () => void;
  onRestartWeak: (weak: PracticeSegment[]) => void;
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

/** Verdict for the average score. Colour is never the only signal: each tone has its own words and icon. */
function verdict(average: number) {
  if (average >= 90) return { label: 'Rất tốt', hint: 'Bạn nghe và chép gần như chính xác.', good: true };
  if (average >= 70) return { label: 'Khá tốt', hint: 'Còn vài chỗ nghe sót, luyện lại sẽ chắc hơn.', good: false };
  return { label: 'Cần luyện thêm', hint: 'Nghe chậm lại từng câu và luyện lại các câu chưa đúng.', good: false };
}

const buttonBase = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold sm:w-auto ${focusRing}`;

export function PracticeSummary({ title, subtitle, queue, outcomes, onExit, onRestartAll, onRestartWeak }: PracticeSummaryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the result so a screen reader announces it and Tab continues from the actions.
  useEffect(() => headingRef.current?.focus(), []);

  const scoreOf = (s: PracticeSegment) => outcomes.find((o) => o.segmentId === s.id)?.score ?? 0;
  const total = queue.length;
  const average = total ? Math.round(queue.reduce((n, s) => n + scoreOf(s), 0) / total) : 0;
  const weak = queue.filter((s) => scoreOf(s) < 100);
  const perfect = total - weak.length;
  const { label, hint, good } = verdict(average);
  const Icon = good ? CheckCircle2 : AlertCircle;

  return (
    <section aria-labelledby="summary-title" className="mx-auto w-full max-w-3xl animate-fade-up overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)]">
      <header className="border-b border-[var(--border)] px-5 py-4 md:px-8">
        <p className="truncate text-sm font-semibold text-[var(--brand-text)]">{title}</p>
        {subtitle && <p className="truncate text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </header>

      <div className="grid gap-6 px-5 py-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8 md:px-8 md:py-8">
        <div className="flex items-baseline gap-1 md:flex-col md:items-start md:gap-0">
          <p className="text-6xl font-extrabold leading-none tabular-nums tracking-tight text-[var(--text-primary)] md:text-7xl">
            {average}
            <span className="text-3xl font-bold text-[var(--text-muted)]">%</span>
          </p>
          <p className="ml-2 text-sm font-semibold text-[var(--text-secondary)] md:ml-0 md:mt-2">Độ chính xác</p>
        </div>

        <div className="min-w-0 space-y-3">
          <h2 id="summary-title" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[var(--text-primary)] outline-none md:text-2xl">
            <Icon className={`h-6 w-6 shrink-0 ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} aria-hidden="true" />
            Hoàn thành bài luyện · {label}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{hint}</p>

          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Đúng hoàn toàn {perfect}/{total} câu
          </p>
          {/* one bar per sentence, in the order practised; the legend below says what the colours mean */}
          <ol className="flex gap-1" aria-label="Kết quả từng câu">
            {queue.map((s, i) => {
              const ok = scoreOf(s) >= 100;
              return <li key={s.id} className={`h-2 flex-1 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-label={`Câu ${i + 1}: ${ok ? 'đúng hoàn toàn' : `${scoreOf(s)}%`}`} />;
            })}
          </ol>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Đúng hoàn toàn</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />Cần luyện lại</span>
          </p>
        </div>
      </div>

      {weak.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-subtle)] px-5 py-4 md:px-8">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Các câu cần luyện lại ({weak.length})</h3>
          <ul className="mt-2 max-h-48 divide-y divide-[var(--border)] overflow-y-auto">
            {weak.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                <span className="min-w-0 text-[var(--text-secondary)]">{s.text}</span>
                <span className="shrink-0 font-bold tabular-nums text-amber-700 dark:text-amber-300">{scoreOf(s)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <button type="button" onClick={onExit} className={`${buttonBase} text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] sm:justify-start`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về danh sách
        </button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onRestartAll} className={`${buttonBase} border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]`}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Làm lại từ đầu
          </button>
          {weak.length > 0 && (
            <button type="button" onClick={() => onRestartWeak(weak)} className={`${buttonBase} bg-[var(--brand)] text-[var(--text-inverse)] hover:brightness-95`}>
              Luyện lại câu sai ({weak.length})
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

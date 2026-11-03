"use client";

import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, ListChecks } from 'lucide-react';
import { PART_INFO, partsOf, toeicYears, type DictationItem, type ToeicPart, type ToeicTest } from '@/lib/dictation/toeic';
import { progressKey, specForItem, specForPart } from '@/lib/dictation/toeic/practice';
import { summarize, type ProgressMap } from '@/lib/dictation/progress';
import { Select } from '@/components/ui/Select';
import type { PracticeSpec } from './types';

/** Parts offered for practice; Parts 3 and 4 are hidden for now. */
const SHOWN_PARTS: ToeicPart[] = [1, 2];
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

const shownItemsOf = (test: ToeicTest) => test.items.filter((i) => SHOWN_PARTS.includes(i.part));

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]"
    >
      <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function ScoreBadge({ best }: { best?: number }) {
  if (best === undefined) {
    return <span className="shrink-0 rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">Chưa luyện</span>;
  }
  const tone =
    best >= 85
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : best >= 60
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {best >= 85 && <Check className="h-3 w-3" />}
      {best}%
    </span>
  );
}

function ItemRow({ item, best, onStart }: { item: DictationItem; best?: number; onStart: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onStart}
        className={`group flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5 text-left transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-light)] ${focusRing}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-[var(--text-primary)]">{item.label}</span>
          <span className="block truncate text-sm text-[var(--text-secondary)]">
            {[...item.accents, `${item.segments.length} câu`].join(' · ')}
          </span>
        </span>
        <ScoreBadge best={best} />
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-text)]" />
      </button>
    </li>
  );
}

/** Where the browser is: the list of tests (testId null) or inside one test. Kept by the parent so it survives a practice session. */
export interface ToeicNav {
  testId: string | null;
  part: ToeicPart;
}

export function ToeicBrowser({
  progress,
  nav,
  onNavChange,
  onStart,
}: {
  progress: ProgressMap;
  nav: ToeicNav;
  onNavChange: (nav: ToeicNav) => void;
  onStart: (spec: PracticeSpec) => void;
}) {
  const years = toeicYears();
  const test = nav.testId ? years.flatMap((y) => y.tests).find((t) => t.id === nav.testId) : undefined;
  const [year, setYear] = useState(years.find((y) => y.tests.some((t) => t.id === nav.testId))?.year ?? years[0]?.year);
  const part = nav.part;
  const tests = years.find((y) => y.year === year)?.tests ?? [];

  const open = (id: string) => {
    onNavChange({ testId: id, part: 1 });
    window.scrollTo({ top: 0 });
  };
  const setPart = (p: ToeicPart) => onNavChange({ testId: nav.testId, part: p });

  // ---------- Page 1: choose a test ----------
  if (!test) {
    if (tests.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Chưa có đề TOEIC nào.</p>;
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Chọn một đề</h2>
          {years.length > 1 && (
            <Select
              value={year ?? ''}
              onChange={(val) => setYear(Number(val))}
              options={years.map((y) => ({ value: y.year, label: `Năm ${y.year}` }))}
              ariaLabel="Năm"
              variant="filter"
              className="w-40"
            />
          )}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tests.map((t) => {
            const items = shownItemsOf(t);
            const s = summarize(progress, items.map((i) => progressKey(t, i)));
            const pct = Math.round((s.practised / Math.max(1, s.total)) * 100);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => open(t.id)}
                  className={`group flex h-full w-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-light)] ${focusRing}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Test {t.test}</span>
                      <span className="block text-sm text-[var(--text-secondary)]">
                        {items.length} mục · {items.reduce((n, i) => n + i.segments.length, 0)} câu
                      </span>
                    </span>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-text)]" />
                  </span>
                  <span className="mt-auto block space-y-1.5">
                    <Meter value={pct} label={`Tiến độ Test ${t.test}`} />
                    <span className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Đã luyện {s.practised}/{s.total}</span>
                      {s.practised > 0 && <span className="font-semibold">TB {s.averageBest}%</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ---------- Page 2: parts and items of one test ----------
  const shownItems = shownItemsOf(test);
  const shownParts = partsOf(test).filter((p) => SHOWN_PARTS.includes(p));
  const items = shownItems.filter((i) => i.part === part);
  const stats = summarize(progress, shownItems.map((i) => progressKey(test, i)));
  const partStats = (p: ToeicPart) => summarize(progress, test.items.filter((i) => i.part === p).map((i) => progressKey(test, i)));
  const pct = Math.round((stats.practised / Math.max(1, stats.total)) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onNavChange({ testId: null, part: 1 })}
          className={`group -ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Tất cả đề
        </button>

        <section aria-label="Tổng quan đề">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{test.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {shownParts.map((p) => PART_INFO[p].title).join(' + ')} · {shownItems.reduce((n, i) => n + i.segments.length, 0)} câu để chép · giọng đọc gốc của đề
          </p>
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Phần thi" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-[var(--bg-subtle)] p-1 hide-scrollbar">
            {shownParts.map((p) => {
              const s = partStats(p);
              const active = p === part;
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  id={`part-tab-${p}`}
                  aria-selected={active}
                  aria-controls="part-panel"
                  onClick={() => setPart(p)}
                  className={`flex min-h-11 shrink-0 flex-col items-start justify-center rounded-xl px-4 text-left transition-colors ${focusRing} ${
                    active ? 'bg-[var(--bg-card)] shadow-[var(--shadow-sm)]' : 'hover:bg-[var(--bg-card)]/60'
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? 'text-[var(--brand-text)]' : 'text-[var(--text-secondary)]'}`}>{PART_INFO[p].title}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {PART_INFO[p].subtitle} · {s.practised}/{s.total}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="w-full sm:w-52">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Đã luyện {stats.practised}/{stats.total}</span>
                {stats.practised > 0 && <span className="text-[var(--text-secondary)]">TB {stats.averageBest}%</span>}
              </div>
              <Meter value={pct} label="Tiến độ luyện đề" />
            </div>
            <button
              type="button"
              onClick={() => onStart(specForPart(test, part))}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] transition hover:brightness-95 ${focusRing}`}
            >
              <ListChecks className="h-4 w-4" /> Luyện cả {PART_INFO[part].title}
            </button>
          </div>
        </div>

        <div id="part-panel" role="tabpanel" aria-labelledby={`part-tab-${part}`} className="space-y-3">
          <h3 className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
            {PART_INFO[part].subtitle} <span className="font-medium text-[var(--text-muted)]">({items.length} mục)</span>
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} best={progress[progressKey(test, item)]?.best} onStart={() => onStart(specForItem(test, item))} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

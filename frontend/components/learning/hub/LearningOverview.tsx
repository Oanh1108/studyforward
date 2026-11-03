"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Route, BookOpen, Headphones, Mic, MessagesSquare, Play, ArrowRight, RotateCcw, Flame, Star, Target, Check, Sparkles, Library,
} from 'lucide-react';
import { Lesson, UserStats } from '../types';
import { learningPathsApi, LearningPath } from '@/lib/learningPathsApi';
import { EmptyState, ProgressBar, SectionTitle, Skeleton } from './primitives';

interface LearningOverviewProps {
  stats: UserStats;
  lessons: Lesson[];
  isLoadingData: boolean;
  onStartLesson: (lesson: Lesson) => void;
}

interface PathProgress {
  path: LearningPath;
  total: number;
  done: number;
  nextTitle?: string;
}

function summarizePath(path: LearningPath): PathProgress {
  const items = (path.sections ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((s) => (s.items ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex));
  const done = items.filter((i) => i.completed).length;
  return { path, total: items.length, done, nextTitle: items.find((i) => !i.completed)?.title };
}

// Full class names so Tailwind can see them. One subtle accent per module, same design system.
const ACCENTS = {
  purple: { chip: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300', hover: 'hover:border-purple-400', link: 'text-purple-600 dark:text-purple-300' },
  blue: { chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300', hover: 'hover:border-blue-400', link: 'text-blue-600 dark:text-blue-300' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300', hover: 'hover:border-cyan-400', link: 'text-cyan-600 dark:text-cyan-300' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300', hover: 'hover:border-indigo-400', link: 'text-indigo-600 dark:text-indigo-300' },
  violet: { chip: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', hover: 'hover:border-violet-400', link: 'text-violet-600 dark:text-violet-300' },
} as const;

const card = 'rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)]';
const heroBtn =
  'inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-indigo-700 shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-white';
const primaryBtn =
  'inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500';

function GoalRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" role="img" aria-label={`Hoàn thành ${Math.round(v)}% mục tiêu hôm nay`}>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-[var(--bg-muted)]" />
      <circle
        cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
        className="stroke-indigo-600 dark:stroke-indigo-400 transition-all duration-700"
        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
      />
    </svg>
  );
}

export function LearningOverview({ stats, lessons, isLoadingData, onStartLesson }: LearningOverviewProps) {
  const [pathSummaries, setPathSummaries] = useState<PathProgress[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await learningPathsApi.getMyPaths();
        const detailed = await Promise.all(list.slice(0, 6).map((p) => learningPathsApi.getPath(p.id).catch(() => p)));
        if (alive) setPathSummaries(detailed.map(summarizePath));
      } catch {
        if (alive) setPathSummaries([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loading = isLoadingData || pathSummaries === null;
  const activePath = pathSummaries?.find((p) => p.total > 0 && p.done > 0 && p.done < p.total);
  const activeLesson = lessons.find((l) => l.status === 'in_progress');
  const completedLessons = lessons.filter((l) => l.status === 'completed').length;

  const modes = useMemo(
    () => [
      {
        href: '/paths', icon: Route, accent: ACCENTS.purple, title: 'Lộ trình', desc: 'Học theo một kế hoạch rõ ràng', cta: 'Khám phá',
        meta: pathSummaries && pathSummaries.length > 0 ? `${pathSummaries.length} lộ trình của bạn` : undefined,
        progress: undefined as number | undefined,
      },
      {
        href: '/courses', icon: BookOpen, accent: ACCENTS.blue, title: 'Khóa học', desc: 'Học theo chủ đề và trình độ', cta: 'Xem khóa học',
        meta: lessons.length > 0 ? `${completedLessons}/${lessons.length} bài đã hoàn thành` : undefined,
        progress: lessons.length > 0 ? (completedLessons / lessons.length) * 100 : undefined,
      },
      { href: '/dictation', icon: Headphones, accent: ACCENTS.cyan, title: 'Nghe chép', desc: 'Nghe và viết lại câu tiếng Anh', cta: 'Luyện nghe', meta: undefined, progress: undefined },
      { href: '/speaking', icon: Mic, accent: ACCENTS.indigo, title: 'Luyện nói', desc: 'Cải thiện phát âm và phản xạ', cta: 'Bắt đầu', meta: undefined, progress: undefined },
      { href: '/communication', icon: MessagesSquare, accent: ACCENTS.violet, title: 'Giao tiếp', desc: 'Hội thoại theo tình huống', cta: 'Trò chuyện', meta: undefined, progress: undefined },
    ],
    [pathSummaries, lessons.length, completedLessons],
  );

  const quick = [
    { href: '/dictation', icon: Headphones, label: 'Luyện nghe chép' },
    { href: '/speaking', icon: Mic, label: 'Luyện phát âm' },
    { href: '/vocabulary/srs', icon: RotateCcw, label: 'Ôn từ vựng' },
  ];

  const firstName = stats.name?.trim().split(/\s+/).slice(-1)[0];
  const hasGoal = stats.dailyGoalMinutes > 0;
  const dailyPct = hasGoal ? (stats.todayMinutes / stats.dailyGoalMinutes) * 100 : 0;
  const weekly = stats.weeklyDays ?? [];

  const heroCta = activePath ? (
    <Link href="/paths" className={heroBtn}><Play className="h-4 w-4" /> Tiếp tục học</Link>
  ) : activeLesson ? (
    <button onClick={() => onStartLesson(activeLesson)} className={heroBtn}><Play className="h-4 w-4" /> Tiếp tục học</button>
  ) : (
    <Link href="/courses" className={heroBtn}><Sparkles className="h-4 w-4" /> Khám phá khóa học</Link>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* HERO */}
      <section aria-label="Chào mừng" className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white md:p-8 dark:from-indigo-900 dark:via-indigo-900 dark:to-violet-900">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
          <defs>
            <pattern id="learn-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#learn-dots)" />
        </svg>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-100">Khu vực học tập</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
              {firstName ? `Chào ${firstName}!` : 'Chào bạn!'}
            </h1>
            <p className="mt-2 max-w-xl text-base text-indigo-100">Hôm nay bạn muốn cải thiện kỹ năng nào?</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {loading ? <Skeleton className="h-11 w-44 !bg-white/20" /> : heroCta}
              <Link
                href="/communication"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <MessagesSquare className="h-4 w-4" /> Luyện giao tiếp
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Flame, label: 'Chuỗi ngày', value: `${stats.streakDays}`, tone: 'text-orange-300' },
              { icon: Star, label: 'Điểm XP', value: stats.xpPoints.toLocaleString(), tone: 'text-amber-300' },
              { icon: Library, label: 'Từ đã học', value: `${stats.wordsLearned}`, tone: 'text-emerald-300' },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                  <Icon className={`h-4 w-4 ${tone}`} /> {label}
                </dt>
                <dd className="mt-1 text-2xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0 space-y-8">
          {/* Continue learning */}
          <section aria-label="Tiếp tục học">
            {loading ? (
              <Skeleton className="h-40 w-full rounded-[20px]" />
            ) : activePath ? (
              <div className={`${card} p-5 md:p-6`}>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Tiếp tục học · Lộ trình</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{activePath.path.title}</h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {activePath.nextTitle ? `Bài tiếp theo: ${activePath.nextTitle} · ` : ''}
                  {activePath.done}/{activePath.total} mục
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={(activePath.done / activePath.total) * 100} label="Tiến độ lộ trình" />
                  <span className="w-10 text-right text-sm font-semibold text-[var(--text-primary)]">
                    {Math.round((activePath.done / activePath.total) * 100)}%
                  </span>
                </div>
                <Link href="/paths" className={`mt-5 ${primaryBtn}`}><Play className="h-4 w-4" /> Tiếp tục học</Link>
              </div>
            ) : activeLesson ? (
              <div className={`${card} p-5 md:p-6`}>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Tiếp tục học · Khóa học</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{activeLesson.title}</h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{activeLesson.subtitle}</p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={activeLesson.progress ?? 0} label="Tiến độ bài học" />
                  <span className="w-10 text-right text-sm font-semibold text-[var(--text-primary)]">{Math.round(activeLesson.progress ?? 0)}%</span>
                </div>
                <button onClick={() => onStartLesson(activeLesson)} className={`mt-5 ${primaryBtn}`}><Play className="h-4 w-4" /> Tiếp tục học</button>
              </div>
            ) : (
              <EmptyState
                icon={<Play className="h-5 w-5" />}
                title="Bạn chưa bắt đầu bài học nào"
                description="Chọn một khóa học hoặc lộ trình để bắt đầu hành trình của bạn."
                action={<Link href="/courses" className={primaryBtn}>Khám phá khóa học</Link>}
              />
            )}
          </section>

          {/* Learning modes */}
          <section aria-label="Học gì hôm nay">
            <SectionTitle>Học gì hôm nay?</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {modes.map(({ href, icon: Icon, accent, title, desc, cta, meta, progress }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group flex min-h-[184px] flex-col last:sm:col-span-2 2xl:last:col-span-2 ${card} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-500 ${accent.hover}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.chip}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{desc}</p>
                  {meta && <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">{meta}</p>}
                  {progress !== undefined && (
                    <div className="mt-2"><ProgressBar value={progress} label={`Tiến độ ${title}`} /></div>
                  )}
                  <span className={`mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold ${accent.link}`}>
                    {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick practice */}
          <section aria-label="Luyện nhanh">
            <SectionTitle>Luyện nhanh</SectionTitle>
            <div className="flex flex-wrap gap-3">
              {quick.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex min-h-11 items-center gap-2.5 ${card} px-4 text-sm font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-500`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* SIDE COLUMN */}
        <aside aria-label="Tiến độ" className="min-w-0 space-y-6">
          {isLoadingData ? (
            <>
              <Skeleton className="h-64 w-full rounded-[20px]" />
              <Skeleton className="h-40 w-full rounded-[20px]" />
            </>
          ) : (
            <>
              <div className={`${card} p-5 md:p-6`}>
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> Mục tiêu hôm nay
                </div>
                {hasGoal ? (
                  <div className="mt-4 flex items-center gap-5">
                    <div className="relative shrink-0">
                      <GoalRing pct={dailyPct} />
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold text-[var(--text-primary)]">
                        {Math.round(Math.min(100, dailyPct))}%
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-3xl font-extrabold text-[var(--text-primary)]">{stats.todayMinutes}</p>
                      <p className="text-sm text-[var(--text-secondary)]">/ {stats.dailyGoalMinutes} phút</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">Bạn chưa đặt mục tiêu hằng ngày.</p>
                )}
              </div>

              <div className={`${card} p-5 md:p-6`}>
                <div className="flex items-center justify-between text-sm font-bold text-[var(--text-primary)]">
                  <span>Tuần này</span>
                  <span className="inline-flex items-center gap-1 text-orange-500">
                    <Flame className="h-4 w-4" />
                    {stats.streakDays} ngày liên tiếp
                  </span>
                </div>
                {weekly.length > 0 ? (
                  <ul className="mt-4 grid grid-cols-7 gap-1 text-center" aria-label="Hoạt động trong tuần">
                    {weekly.map((d) => (
                      <li key={d.date} className="flex flex-col items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{d.day}</span>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                            d.completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : d.active
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300'
                                : 'border-[var(--border)]'
                          }`}
                          title={d.completed ? 'Đã học' : d.active ? 'Hôm nay' : 'Chưa học'}
                        >
                          {d.completed && <Check className="h-4 w-4" aria-label="Đã học" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">Chưa có dữ liệu hoạt động.</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

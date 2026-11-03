"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Check, Clock, Lock, Play, RotateCcw, Zap, Sparkles, Library, PenLine, Headphones, Mic, BookOpen, Pencil, ArrowRight, Target,
} from 'lucide-react';
import { Lesson, CourseLevel, SkillType } from './types';
import { coursesApi } from '@/lib/coursesApi';
import { useAuth } from '@/lib/authContext';
import { EmptyState, ProgressBar, Skeleton } from './hub/primitives';

interface CoursesViewProps {
  onStartLesson: (lesson: Lesson) => void;
}

type IconType = React.ComponentType<{ className?: string }>;

const levelTabs: { id: CourseLevel; label: string; name: string; desc: string }[] = [
  { id: 'A1', label: 'A1', name: 'Sơ cấp', desc: 'Từ vựng và câu giao tiếp cơ bản nhất' },
  { id: 'A2', label: 'A2', name: 'Căn bản', desc: 'Phản xạ các tình huống hằng ngày' },
  { id: 'B1', label: 'B1', name: 'Trung cấp', desc: 'Giao tiếp công việc và thuyết trình' },
  { id: 'B2', label: 'B2', name: 'Nâng cao', desc: 'Tranh luận, đàm phán và từ chuyên ngành' },
  { id: 'Business', label: 'Business', name: 'Doanh nghiệp', desc: 'Email, đàm phán, họp quốc tế' },
];

const skillFilters: { id: SkillType; label: string; icon: IconType }[] = [
  { id: 'all', label: 'Tất cả', icon: Sparkles },
  { id: 'vocab', label: 'Từ vựng', icon: Library },
  { id: 'grammar', label: 'Ngữ pháp', icon: PenLine },
  { id: 'listening', label: 'Nghe', icon: Headphones },
  { id: 'speaking', label: 'Nói', icon: Mic },
  { id: 'reading', label: 'Đọc', icon: BookOpen },
  { id: 'writing', label: 'Viết', icon: Pencil },
];

const skillLabel: Record<Lesson['skill'], string> = {
  vocab: 'Từ vựng',
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  speaking: 'Nói',
  reading: 'Đọc',
  writing: 'Viết',
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function LessonRow({ lesson, order, onStart }: { lesson: Lesson; order: number; onStart: (lesson: Lesson) => void }) {
  const completed = lesson.status === 'completed';
  const inProgress = lesson.status === 'in_progress';
  const locked = lesson.status === 'locked';

  const marker = completed
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
    : inProgress
      ? 'bg-indigo-600 text-white'
      : 'bg-[var(--bg-muted)] text-[var(--text-muted)]';

  return (
    <li>
      <button
        type="button"
        disabled={locked}
        onClick={() => onStart(lesson)}
        className={`group flex w-full items-center gap-4 rounded-[20px] border bg-[var(--bg-card)] p-4 text-left transition-colors ${focusRing} ${
          inProgress ? 'border-indigo-300 dark:border-indigo-500/50' : 'border-[var(--border)]'
        } ${locked ? 'cursor-not-allowed opacity-60' : 'hover:border-indigo-400'}`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${marker}`}>
          {completed ? <Check className="h-5 w-5" /> : inProgress ? <Play className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
            <span className="font-semibold">Bài {order}</span>
            <span className="rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 font-medium text-[var(--text-secondary)]">{skillLabel[lesson.skill]}</span>
            {completed && <span className="font-semibold text-emerald-600 dark:text-emerald-300">Đã hoàn thành</span>}
            {locked && <span>Hoàn thành bài trước để mở khóa</span>}
          </span>
          <span className="mt-1 block truncate text-base font-bold text-[var(--text-primary)]">{lesson.title}</span>
          <span className="block truncate text-sm text-[var(--text-secondary)]">{lesson.subtitle}</span>
          {inProgress && typeof lesson.progress === 'number' && lesson.progress > 0 && (
            <span className="mt-2 block max-w-xs"><ProgressBar value={lesson.progress} label={`Tiến độ ${lesson.title}`} /></span>
          )}
        </span>

        <span className="hidden shrink-0 items-center gap-4 text-sm text-[var(--text-secondary)] sm:flex">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{lesson.durationMin} phút</span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"><Zap className="h-4 w-4" />{lesson.xpReward} XP</span>
        </span>

        {!locked && (
          <span
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold ${
              inProgress
                ? 'bg-indigo-600 text-white group-hover:bg-indigo-700'
                : 'border border-[var(--border)] text-[var(--text-secondary)] group-hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {completed ? <><RotateCcw className="h-4 w-4" />Ôn lại</> : <>Tiếp tục<ArrowRight className="h-4 w-4" /></>}
          </span>
        )}
      </button>
    </li>
  );
}

export function CoursesView({ onStartLesson }: CoursesViewProps) {
  const { currentLanguage } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel>('B1');
  const [selectedSkill, setSelectedSkill] = useState<SkillType>('all');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await coursesApi.getLessons(selectedLevel, selectedSkill, currentLanguage);
      setLessons(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách khóa học');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, selectedSkill, currentLanguage]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const level = levelTabs.find((t) => t.id === selectedLevel)!;
  const completedCount = lessons.filter((l) => l.status === 'completed').length;
  const totalCount = lessons.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = lessons.find((l) => l.status === 'in_progress');

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Khóa học</h1>
        <p className="text-sm text-[var(--text-secondary)]">Chọn cấp độ phù hợp và học theo chuỗi bài giảng có hệ thống.</p>
      </header>

      {/* Level selector */}
      <div role="tablist" aria-label="Cấp độ" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 hide-scrollbar">
        {levelTabs.map((tab) => {
          const active = tab.id === selectedLevel;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedLevel(tab.id)}
              className={`flex shrink-0 flex-col items-start rounded-2xl border px-4 py-2.5 text-left transition-colors ${focusRing} ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-indigo-400 hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="text-sm font-bold">{tab.label}</span>
              <span className={`text-xs ${active ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Level summary: one card with progress, next lesson and placement test */}
      <section aria-label="Tổng quan cấp độ" className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{level.label} {level.name}</h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{level.desc}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-full max-w-xs"><ProgressBar value={percent} label={`Tiến độ cấp ${level.label}`} /></div>
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[var(--text-primary)]">{completedCount}/{totalCount} bài · {percent}%</span>
            </div>
          </div>
          {nextLesson && (
            <button
              type="button"
              onClick={() => onStartLesson(nextLesson)}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 ${focusRing}`}
            >
              <Play className="h-4 w-4" /> Học bài tiếp theo
            </button>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-secondary)]">
          <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
          <span>Chưa biết nên học cấp nào?</span>
          <Link href="/placement-test" className={`font-semibold text-indigo-600 hover:underline dark:text-indigo-300 ${focusRing}`}>
            Làm bài kiểm tra đầu vào
          </Link>
        </div>
      </section>

      {/* Skill filter */}
      <div role="group" aria-label="Lọc theo kỹ năng" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
        {skillFilters.map(({ id, label, icon: Icon }) => {
          const active = id === selectedSkill;
          return (
            <button
              key={id}
              aria-pressed={active}
              onClick={() => setSelectedSkill(id)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${focusRing} ${
                active
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Lessons */}
      <section aria-label="Danh sách bài học" className="space-y-3">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Bài học <span className="font-medium text-[var(--text-muted)]">({totalCount})</span>
        </h2>

        {error ? (
          <div role="alert" className="rounded-[20px] border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            <button
              onClick={fetchLessons}
              className={`mt-3 inline-flex min-h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 ${focusRing}`}
            >
              Thử lại
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải bài học">
            {[1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full rounded-[20px]" />)}
          </div>
        ) : lessons.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="Chưa có bài học cho bộ lọc này"
            description="Chọn cấp độ hoặc kỹ năng khác để tiếp tục học."
            action={
              selectedSkill !== 'all' ? (
                <button onClick={() => setSelectedSkill('all')} className={`inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 ${focusRing}`}>
                  Xem tất cả kỹ năng
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {lessons.map((lesson, index) => <LessonRow key={lesson.id} lesson={lesson} order={index + 1} onStart={onStartLesson} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

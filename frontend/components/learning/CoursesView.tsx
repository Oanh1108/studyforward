"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Lesson, CourseLevel, SkillType } from './types';
import { coursesApi } from '@/lib/coursesApi';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';
import { IconCheck, IconLock, IconPlay, IconStar } from './icons';

interface CoursesViewProps {
  onStartLesson: (lesson: Lesson) => void;
}

const levelTabs: { id: CourseLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1 Sơ cấp', desc: 'Từ vựng & câu giao tiếp cơ bản nhất' },
  { id: 'A2', label: 'A2 Căn bản', desc: 'Phản xạ các tình huống hằng ngày' },
  { id: 'B1', label: 'B1 Trung cấp', desc: 'Giao tiếp công việc & thuyết trình' },
  { id: 'B2', label: 'B2 Nâng cao', desc: 'Tranh luận, đàm phán & từ chuyên ngành' },
  { id: 'Business', label: 'Doanh nghiệp', desc: 'Email, đàm phán, họp quốc tế' },
];

const skillFilters: { id: SkillType; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả', icon: '✨' },
  { id: 'vocab', label: 'Từ vựng', icon: '📚' },
  { id: 'grammar', label: 'Ngữ pháp', icon: '✍️' },
  { id: 'listening', label: 'Nghe', icon: '🎧' },
  { id: 'speaking', label: 'Nói', icon: '🎙️' },
  { id: 'reading', label: 'Đọc', icon: '📖' },
  { id: 'writing', label: 'Viết', icon: '📝' },
];

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
      setError(err?.message || 'Không thể tải danh sách khóa học từ database');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, selectedSkill, currentLanguage]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const completedCount = lessons.filter((l) => l.status === 'completed').length;
  const totalCount = lessons.length;
  const coursePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">
      {/* 1. Header & Level selector */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">
              Lộ trình & Khóa học
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Chọn cấp độ phù hợp để học theo chuỗi bài giảng có hệ thống.
            </p>
          </div>

          {/* Quick stats badge */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 rounded-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-[var(--text-muted)]">Hoàn thành: </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedCount}/{totalCount} bài</span>
            </div>
            <div className="w-16 bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${coursePercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Placement Test Promo Banner */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <span>🎯</span> Chưa biết học từ đâu?
            </h4>
            <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 mt-0.5">
              Làm bài kiểm tra đầu vào miễn phí để biết chính xác trình độ và nhận lộ trình phù hợp.
            </p>
          </div>
          <Link
            href="/placement-test"
            className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-95"
          >
            Làm bài test ngay →
          </Link>
        </div>

        {/* Level Horizontal Scroll Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3 mt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {levelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLevel(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all flex flex-col items-start ${
                selectedLevel === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Skill Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {skillFilters.map((sf) => (
          <button
            key={sf.id}
            onClick={() => setSelectedSkill(sf.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedSkill === sf.id
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            <span>{sf.icon}</span>
            <span>{sf.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Course Overview Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Lộ trình hiện tại
              </span>
              <span className="text-xs text-[var(--text-muted)]">• Cấp độ {selectedLevel}</span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] mt-1">
              {levelTabs.find((t) => t.id === selectedLevel)?.label} - {levelTabs.find((t) => t.id === selectedLevel)?.desc}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              Hệ thống bài học chuẩn hóa kết hợp phản xạ từ vựng, ngữ pháp ứng dụng và luyện nói thực tế.
            </p>
          </div>

          <div className="shrink-0 bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border)] flex items-center gap-4">
            <div>
              <div className="text-xs text-[var(--text-muted)] font-medium">Tiến độ khóa</div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{coursePercent}%</div>
            </div>
            <div className="w-24 bg-[var(--border)] h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${coursePercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lesson List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider">
            Danh sách bài học ({lessons.length})
          </h3>
          {isLoading && <span className="text-xs text-indigo-600 animate-pulse">Đang tải từ database...</span>}
        </div>

        {error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
            <p className="text-xs font-semibold text-rose-600">{error}</p>
            <button
              onClick={fetchLessons}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm"
            >
              Thử lại
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg-card)] animate-pulse flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--bg-subtle)]"></div>
                  <div className="space-y-2">
                    <div className="w-28 h-3 rounded bg-[var(--bg-subtle)]"></div>
                    <div className="w-48 h-4 rounded bg-[var(--bg-subtle)]"></div>
                  </div>
                </div>
                <div className="w-20 h-8 rounded-xl bg-[var(--bg-subtle)]"></div>
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center bg-[var(--bg-card)] space-y-2">
            <div className="text-3xl">📖</div>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">Chưa có bài học cho bộ lọc này</h4>
            <p className="text-xs text-[var(--text-muted)]">Hãy chọn cấp độ hoặc kỹ năng khác để tiếp tục học.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lessons.map((lesson) => {
              const isCompleted = lesson.status === 'completed';
              const isInProgress = lesson.status === 'in_progress';
              const isLocked = lesson.status === 'locked';

              return (
                <div
                  key={lesson.id}
                  onClick={() => {
                    if (!isLocked) onStartLesson(lesson);
                  }}
                  className={`group rounded-2xl border p-4 transition-all duration-200 flex items-center justify-between gap-4 ${
                    isLocked
                      ? 'border-[var(--border)] bg-[var(--bg-subtle)] opacity-70 cursor-not-allowed'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Status Indicator Icon */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isInProgress
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 animate-pulse'
                          : 'bg-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {isCompleted ? (
                        <IconCheck className="w-5 h-5 text-emerald-500" />
                      ) : isInProgress ? (
                        <IconPlay className="w-5 h-5 ml-0.5" />
                      ) : (
                        <IconLock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                          Unit {lesson.unit}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                          {lesson.skill.toUpperCase()}
                        </span>
                        {isCompleted && (
                          <div className="flex items-center gap-0.5 text-yellow-400">
                            <IconStar className="w-3.5 h-3.5 fill-current" />
                            <IconStar className="w-3.5 h-3.5 fill-current" />
                            <IconStar className="w-3.5 h-3.5 fill-current" />
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-sm md:text-base text-[var(--text-primary)] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {lesson.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right action button */}
                  <div className="shrink-0 flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        {lesson.durationMin} phút
                      </div>
                      <div className="text-[11px] text-amber-500 font-bold">
                        +{lesson.xpReward} XP
                      </div>
                    </div>

                    {isCompleted ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartLesson(lesson);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                      >
                        Ôn lại
                      </button>
                    ) : isInProgress ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartLesson(lesson);
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        Tiếp tục →
                      </button>
                    ) : (
                      <div className="p-2 text-[var(--text-muted)]">
                        <IconLock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


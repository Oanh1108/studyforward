"use client";

import React, { useState, useEffect } from "react";
import { UserStats, Lesson } from "./types";
import { IconFire, IconStar, IconCards, IconBook } from "./icons";
import { Clock, AlertCircle, ChevronRight, Play, CheckCircle2, Calendar, BrainCircuit } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { getLanguageInfo } from "@/lib/languages";
import { learningPathsApi, LearningPath, LearningPathItem } from "@/lib/learningPathsApi";
import { myVocabApi, MyVocabularyWord } from "@/lib/myVocabApi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface DashboardViewProps {
  stats: UserStats;
  nextLesson?: Lesson | null;
  onStartLesson: (lesson: Lesson) => void;
  onNavigateTab: (tab: "courses" | "vocabulary" | "speaking" | "profile" | "paths" | "dictation" | "todos") => void;
  onOpenVocabStudy?: (resume?: boolean, folderId?: number | null, sessionId?: string) => void;
}

export function DashboardView({
  stats,
  onNavigateTab,
  onOpenVocabStudy,
}: DashboardViewProps) {
  const { currentLanguage } = useAuth();
  const langInfo = getLanguageInfo(currentLanguage);

  // Path Data
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [nextPathItem, setNextPathItem] = useState<{ item: LearningPathItem, sectionTitle: string } | null>(null);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  // Vocabulary Data
  const [dueWords, setDueWords] = useState<MyVocabularyWord[]>([]);
  const [overdueWords, setOverdueWords] = useState<MyVocabularyWord[]>([]);
  const [futureWords, setFutureWords] = useState<MyVocabularyWord[]>([]);
  const [allWordsCount, setAllWordsCount] = useState(0);
  const [incompleteSessions, setIncompleteSessions] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [paths, wordsData, sessionsData] = await Promise.all([
          learningPathsApi.getMyPaths(),
          myVocabApi.getMyWords({ language: currentLanguage }),
          myVocabApi.getIncompleteStudySessions(currentLanguage).catch(() => []),
        ]);

        if (!isMounted) return;

        // Path logic
        if (paths.length > 0) {
          const firstPathId = paths[0].id;
          const fullPath = await learningPathsApi.getPath(firstPathId);
          setActivePath(fullPath);
          
          if (fullPath.sections) {
            for (const section of fullPath.sections) {
              const uncompletedItem = section.items?.find(i => !i.completed);
              if (uncompletedItem) {
                setNextPathItem({ item: uncompletedItem, sectionTitle: section.title });
                break;
              }
            }
          }
        }

        // Vocabulary logic
        const words = wordsData || [];
        setAllWordsCount(words.length);
        
        const now = new Date();
        const due = words.filter(w => w.nextReviewAt && new Date(w.nextReviewAt) <= now);
        const overdue = due.filter(w => new Date(w.nextReviewAt!).getTime() < now.getTime() - 24 * 60 * 60 * 1000);
        const future = words.filter(w => w.nextReviewAt && new Date(w.nextReviewAt) > now).sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime());
        
        // Sort due words: overdue first
        due.sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime());

        // Ensure unique words (in case of multiple skills for same word)
        const uniqueDue = Array.from(new Map(due.map(w => [w.word, w])).values());
        const uniqueOverdue = Array.from(new Map(overdue.map(w => [w.word, w])).values());

        setDueWords(uniqueDue);
        setOverdueWords(uniqueOverdue);
        setFutureWords(future);

        // Incomplete sessions
        setIncompleteSessions(sessionsData || []);

      } catch (e) {
        console.warn("Could not load dashboard widgets", e);
      } finally {
        if (isMounted) setLoadingWidgets(false);
      }
    };

    loadDashboardData();
    return () => { isMounted = false; };
  }, [currentLanguage]);

  const progressPercent = stats.dailyGoalMinutes > 0 
    ? Math.min(100, Math.round((stats.todayMinutes / stats.dailyGoalMinutes) * 100))
    : 0;

  const getSuggestedAction = () => {
    if (incompleteSessions.length > 0) return `Tiếp tục bài ôn tập còn dở`;
    if (dueWords.length > 0) return `Ôn tập ${dueWords.length} từ vựng đã đến hạn`;
    if (nextPathItem) return `Học bài mới: ${nextPathItem.item.title}`;
    if (allWordsCount === 0) return "Thêm từ vựng đầu tiên của bạn";
    if (!activePath) return "Tạo lộ trình học đầu tiên";
    return "Luyện nghe chép hoặc Shadowing";
  };

  const handleResumeSession = (sessionId: string) => {
    if (onOpenVocabStudy) onOpenVocabStudy(true, null, sessionId);
  };

  const handleStudyDueWords = () => {
    if (onOpenVocabStudy) onOpenVocabStudy(false);
  };

  const hasVocab = allWordsCount > 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up max-w-[1200px] mx-auto w-full">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Chào {stats.name || "bạn"}, hôm nay học tiếp nhé!
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Mục tiêu: {stats.dailyGoalMinutes} phút/ngày • Bạn nên {getSuggestedAction().toLowerCase()}
          </p>
        </div>

        {/* Level badge */}
        {stats.currentLevel && (
          <div className="self-start sm:self-auto flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--brand-text)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Level: {stats.currentLevel}
          </div>
        )}
      </div>

      {/* 2. Today's Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Chuỗi ngày</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
              <IconFire className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-black text-amber-500">{stats.streakDays}</span>
            <span className="text-xs font-bold text-[var(--text-secondary)]">ngày</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Mục tiêu</span>
            <span className="text-xs font-bold text-[var(--brand)]">{progressPercent}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)]">{stats.todayMinutes}</span>
            <span className="text-xs font-medium text-[var(--text-muted)]">/{stats.dailyGoalMinutes} phút</span>
          </div>
          <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Từ đã thuộc</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <IconCards className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)]">{stats.wordsLearned}</span>
            <span className="text-xs font-medium text-[var(--text-muted)]">từ</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Điểm XP</span>
            <div className="p-1.5 rounded-xl bg-yellow-400/15 text-yellow-500">
              <IconStar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)]">{stats.xpPoints.toLocaleString()}</span>
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">XP</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
        
        {/* LEFT COLUMN: Due Words */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <BrainCircuit className="w-4 h-4" />
              </div>
              Đến hạn ôn
            </h2>
            {dueWords.length > 0 && (
              <button 
                onClick={() => onNavigateTab("vocabulary")}
                className="text-sm font-medium text-[var(--brand)] hover:underline flex items-center"
              >
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[150px]">
            {loadingWidgets ? (
              <div className="p-8 flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : dueWords.length > 0 ? (
              <>
                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Cần ôn tập ngay</p>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                      {dueWords.length} <span className="text-base font-bold text-[var(--text-muted)]">từ</span>
                    </p>
                  </div>
                  {overdueWords.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {overdueWords.length} quá hạn
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <ul className="divide-y divide-[var(--border)]">
                    {dueWords.slice(0, 5).map((word, i) => (
                      <li key={word.id || i} className="p-3 hover:bg-[var(--bg-subtle)] transition-colors flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)] text-base">{word.word}</span>
                            {word.partOfSpeech && (
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-1.5 py-0.5 border border-[var(--border)] rounded">
                                {word.partOfSpeech}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-[200px]">
                            {(word as any).translation || word.meaning || (word as any).vietnameseMeaning || "Từ vựng"}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                            new Date(word.nextReviewAt!).getTime() < new Date().getTime() - 86400000 
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" 
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {new Date(word.nextReviewAt!).getTime() < new Date().getTime() - 86400000 ? "Quá hạn" : "Hôm nay"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)]">
                  <button 
                    onClick={handleStudyDueWords}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" /> Ôn ngay
                  </button>
                </div>
              </>
            ) : hasVocab ? (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">Tuyệt vời!</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[250px]">
                    Bạn đã ôn hết từ vựng đến hạn. Bộ não đang ghi nhớ rất tốt.
                  </p>
                </div>
                {futureWords.length > 0 && (
                  <div className="px-4 py-2 bg-[var(--bg-subtle)] rounded-lg text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Từ tiếp theo: {formatDistanceToNow(new Date(futureWords[0].nextReviewAt!), { addSuffix: true, locale: vi })}
                  </div>
                )}
                <button 
                  onClick={() => onNavigateTab("vocabulary")}
                  className="px-5 py-2 mt-2 border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] font-semibold rounded-lg text-sm text-[var(--text-primary)] transition-colors"
                >
                  Học từ mới
                </button>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center">
                  <IconCards className="w-8 h-8 opacity-50" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">Sổ từ vựng trống</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-[250px]">
                    Bạn chưa lưu từ vựng nào vào sổ cho ngôn ngữ {langInfo?.name || "này"}.
                  </p>
                </div>
                <button 
                  onClick={() => onNavigateTab("vocabulary")}
                  className="px-5 py-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
                >
                  Khám phá từ vựng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: In-Progress & Next Lesson */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              Đang học dở
            </h2>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[150px]">
            {loadingWidgets ? (
              <div className="p-8 flex justify-center items-center h-full flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : incompleteSessions.length > 0 ? (
              <ul className="divide-y divide-[var(--border)] flex-1">
                {incompleteSessions.slice(0, 4).map((session) => {
                  const modeText = session.mode === 'flashcard' ? 'Thẻ từ' : session.mode === 'quiz' ? 'Trắc nghiệm' : session.mode === 'typing' ? 'Gõ từ' : session.mode === 'dictation' ? 'Nghe chép' : 'Hỗn hợp';
                  return (
                    <li key={session.id} className="p-4 hover:bg-[var(--bg-subtle)] transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex flex-shrink-0 items-center justify-center text-indigo-500">
                            <IconCards className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[var(--text-primary)] leading-tight mb-1">Phiên ôn tập</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                              <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded text-[var(--text-muted)]">
                                {modeText}
                              </span>
                              <span>•</span>
                              <span>{session.currentIndex} / {session.deck?.length || "?"} từ</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Lần cuối: {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true, locale: vi })}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleResumeSession(session.id)}
                          className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          Tiếp tục <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full" 
                          style={{ width: `${session.deck?.length ? (session.currentIndex / session.deck.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center h-full flex-1 text-center">
                <div className="w-12 h-12 bg-[var(--bg-subtle)] text-[var(--text-muted)] rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Bạn không có bài học nào đang dở.</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">Các phiên đã hoàn thành sẽ không hiện ở đây.</p>
                <button 
                  onClick={() => onNavigateTab("courses")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors"
                >
                  Bắt đầu học ngay
                </button>
              </div>
            )}
            
            {/* Lộ trình tiếp theo nếu không có bài dở */}
            {incompleteSessions.length === 0 && nextPathItem && (
              <div className="border-t border-[var(--border)]">
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-between cursor-pointer" onClick={() => onNavigateTab("paths")}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <IconBook className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Lộ trình bài tiếp theo</div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm line-clamp-1">{nextPathItem.item.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{nextPathItem.sectionTitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

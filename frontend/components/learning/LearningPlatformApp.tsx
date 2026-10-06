"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Lesson, UserStats } from './types';
import { userStatsApi } from '@/lib/userStatsApi';
import { coursesApi } from '@/lib/coursesApi';
import { Navigation, getTabGroup } from './Navigation';
import { TopHeader } from './TopHeader';
import Link from 'next/link';
import { DashboardView } from './DashboardView';
import { CoursesView } from './CoursesView';
import { LessonModal } from './LessonModal';
import { MyVocabularyView } from './my-vocabulary/MyVocabularyView';
import { DiscoverVocabularyView } from './vocabulary/DiscoverVocabularyView';
import { SpeakingView } from './SpeakingView';
import { ProfileView } from './ProfileView';
import { AdminView } from './admin/AdminView';
import { DictationView } from './listening/DictationView';
import { LearningPathsView } from './paths/LearningPathsView';
import { ProgressTrackerView } from './analytics/ProgressTrackerView';
import { NotesView } from './notes/NotesView';
import { TodoListView } from './todos/TodoListView';
import { FocusTimerView } from './focus/FocusTimerView';
import { IconPhone } from './icons';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { myVocabApi, VocabularyFolder, MyVocabularyWord } from '@/lib/myVocabApi';

interface LearningPlatformAppProps {
  initialTab?: ActiveTab;
}

export function LearningPlatformApp({ initialTab = 'dashboard' }: LearningPlatformAppProps) {
  const { user, isAdmin, currentLanguage, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  
  const [stats, setStats] = useState<UserStats>(() => ({
    name: user?.name || "",
    avatar: "",
    currentLevel: 'A1 - Beginner',
    streakDays: 0,
    todayMinutes: 0,
    dailyGoalMinutes: 25,
    totalHours: 0,
    wordsLearned: 0,
    totalWordsGoal: 500,
    xpPoints: 0,
    weeklyTargetDays: 7,
    weeklyCompletedDays: 0,
    reminderEnabled: false,
    reminderTime: '20:00',
    weeklyDays: [],
  }));

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const handleOpenVocabStudy = useCallback((resume = false, folderId?: number | null, sessionId?: string) => {
    let url = '/vocabulary/study';
    const params = new URLSearchParams();
    if (folderId) params.append('folderId', String(folderId));
    if (sessionId) params.append('sessionId', sessionId);
    else if (resume) params.append('resume', 'true');
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    router.push(url);
  }, [router]);

  // Load real statistics and lessons from backend whenever user or language changes
  const reloadStats = useCallback(async () => {
    try {
      const data = await userStatsApi.getMyStats(currentLanguage);
      setStats(data);
    } catch (err) {
      console.warn('Could not load user stats from backend:', err);
    }
  }, [currentLanguage]);

  const reloadLessons = useCallback(async () => {
    try {
      const list = await coursesApi.getLessons(undefined, undefined, currentLanguage);
      setLessons(list);
    } catch (err) {
      console.warn('Could not load lessons from backend:', err);
    }
  }, [currentLanguage]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let isMounted = true;
    if (authLoading || !isAuthenticated) return;
    
    setIsLoadingData(true);
    Promise.all([
      userStatsApi.getMyStats(currentLanguage).catch(() => null),
      coursesApi.getLessons(undefined, undefined, currentLanguage).catch(() => []),
    ]).then(([statsData, lessonsData]) => {
      if (!isMounted) return;
      if (statsData) {
        setStats(statsData);
      }
      if (lessonsData) {
        setLessons(lessonsData);
      }
      setIsLoadingData(false);
    });

    return () => {
      isMounted = false;
    };
  }, [currentLanguage, user]);

  // Next lesson is the in_progress one or the first non-completed
  const nextLesson = lessons.find((l) => l.status === 'in_progress') || lessons.find((l) => l.status !== 'completed') || lessons[0] || null;

  const handleStartLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const handleCompleteLesson = async (lessonId: string, earnedXp: number) => {
    // 1. Optimistic UI update
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, status: 'completed', score: 100, stars: 3, progress: 100 } : l))
    );

    // 2. Persist completion to backend and refresh verified database stats
    try {
      await coursesApi.completeLesson(lessonId);
      await Promise.all([reloadStats(), reloadLessons()]);
    } catch (err) {
      console.error('Failed to complete lesson on database:', err);
      // Refresh to restore accurate state
      await reloadLessons();
    }
  };

  const handleUpdateStats = async (newStats: Partial<UserStats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
    try {
      await userStatsApi.updateProfile({
        name: newStats.name,
        avatar: newStats.avatar,
        currentLevel: newStats.currentLevel,
        dailyGoalMinutes: newStats.dailyGoalMinutes,
        reminderEnabled: newStats.reminderEnabled,
        reminderTime: newStats.reminderTime,
      });
      await reloadStats();
    } catch (err) {
      console.error('Failed to persist profile update to database:', err);
    }
  };

  const renderGroupTabs = () => {
    const currentGroup = getTabGroup(activeTab);
    const groupTabsConfig: Record<string, { id: ActiveTab; label: string; href: string }[]> = {
      learning: [
        { id: 'paths', label: 'Lộ trình', href: '/paths' },
        { id: 'courses', label: 'Khóa học', href: '/courses' },
        { id: 'dictation', label: 'Nghe chép', href: '/dictation' },
        { id: 'speaking', label: 'Luyện nói', href: '/speaking' },
      ],
      vocabulary_hub: [
        { id: 'vocabulary', label: 'Thư mục', href: '/vocabulary' },
        { id: 'discover', label: 'Khám phá từ mới', href: '/vocabulary/discover' },
        { id: 'vocabulary_study', label: 'Học từ vựng', href: '/vocabulary/study-config' },
        { id: 'srs', label: 'Ôn tập ngắt quãng', href: '/vocabulary/srs' },
      ],
      tools: [
        { id: 'notes', label: 'Ghi chú', href: '/notes' },
        { id: 'todos', label: 'To-do', href: '/todos' },
        { id: 'focus', label: 'Chuyến bay', href: '/flights' },
      ]
    };

    const tabs = groupTabsConfig[currentGroup];
    if (!tabs || tabs.length === 0) return null;

    return (
      <div className="mb-6 overflow-x-auto pb-1 hide-scrollbar">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-1">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // Render content based on activeTab
  const renderTabContent = () => {
    if (authLoading || !isAuthenticated) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-main)]">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            stats={stats}
            nextLesson={nextLesson}
            onStartLesson={handleStartLesson}
            onNavigateTab={(tab: any) => setActiveTab(tab)}
            onOpenVocabStudy={handleOpenVocabStudy}
          />
        );
      case 'courses':
        return <CoursesView onStartLesson={handleStartLesson} />;
      case 'vocabulary':
        return (
          <MyVocabularyView
            onOpenStudySession={(folderId) => handleOpenVocabStudy(false, folderId)}
          />
        );
      case 'discover':
        return <DiscoverVocabularyView />;
      case 'speaking':
        return <SpeakingView />;
      case 'dictation':
        return <DictationView />;
      case 'paths':
        return <LearningPathsView />;
      case 'vocabulary_study':
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <div className="text-4xl mb-4">📖</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Học từ vựng</h2>
            <p>Khởi tạo phiên học từ vựng mới với các tùy chọn linh hoạt.</p>
            <button 
              onClick={() => handleOpenVocabStudy()}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              Bắt đầu học
            </button>
          </div>
        );
      case 'srs':
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <div className="text-4xl mb-4">🧠</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Ôn tập ngắt quãng (SRS)</h2>
            <p>Hệ thống tự động nhắc nhở ôn tập từ vựng đã đến hạn.</p>
            <button 
              onClick={() => handleOpenVocabStudy(true)}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              Ôn tập ngay
            </button>
          </div>
        );
      case 'analytics':
        return <ProgressTrackerView onNavigate={(tab: any) => setActiveTab(tab)} />;
      case 'notes':
        return <NotesView onNavigate={(tab: any) => setActiveTab(tab)} />;
      case 'todos':
        return <TodoListView onNavigate={(tab: any) => setActiveTab(tab)} />;
      case 'focus':
        return <FocusTimerView onNavigate={(tab: any) => setActiveTab(tab)} />;
      case 'profile':
        return <ProfileView stats={stats} onUpdateStats={handleUpdateStats} />;
      case 'admin':
        if (!isAdmin) {
          return (
            <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
              <div className="text-4xl">🚫</div>
              <h2 className="text-xl font-bold text-rose-600">Truy cập bị từ chối</h2>
              <p className="text-sm text-[var(--text-secondary)]">Bạn không có quyền quản trị để truy cập trang này.</p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Quay về Trang chủ
              </button>
            </div>
          );
        }
        return <AdminView />;
      default:
        return null;
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // ==========================================
  // MOBILE DEVICE MOCKUP FRAME (when toggled on desktop)
  // ==========================================
  if (isMobileDeviceFrame) {
    return (
      <div className="min-h-screen bg-slate-900 py-6 px-4 flex flex-col items-center justify-center">
        {/* Top Control Bar */}
        <div className="mb-4 flex items-center justify-between w-full max-w-[410px] text-white">
          <div className="flex items-center gap-2 text-xs font-bold">
            <IconPhone className="w-4 h-4 text-indigo-400" />
            <span>Chế độ mô phỏng Mobile (iPhone 15 - 390px)</span>
          </div>
          <button
            onClick={() => setIsMobileDeviceFrame(false)}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl font-semibold transition-colors"
          >
            Quay lại Web ✕
          </button>
        </div>

        {/* iPhone 15 Chassis */}
        <div className="w-[390px] h-[820px] bg-[var(--bg-base)] rounded-[50px] border-[10px] border-slate-800 shadow-2xl relative flex flex-col overflow-hidden ring-1 ring-white/10">
          {/* Dynamic Island Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-end px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800"></div>
          </div>

          {/* Top Header inside device */}
          <TopHeader
            stats={stats}
            isMobileDeviceFrame={isMobileDeviceFrame}
            onToggleDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
            onAvatarClick={() => setActiveTab('profile')}
            onNavigateTab={(tab: any) => setActiveTab(tab)}
          />

          {/* Screen Content inside device (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 pt-3 pb-24 flex flex-col">
            {renderGroupTabs()}
            {renderTabContent()}
          </div>

          {/* Mobile Bottom Navigation inside device */}
          <Navigation
            activeTab={activeTab}
            onSelectTab={(tab: any) => setActiveTab(tab)}
            stats={stats}
            onQuickStart={() => handleStartLesson(nextLesson)}
          />

          {/* Home indicator bar at bottom */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/40 dark:bg-white/40 rounded-full z-50 pointer-events-none"></div>
        </div>

        {/* Lesson Interactive Modal */}
        {activeLesson && (
          <LessonModal
            lesson={activeLesson}
            onClose={() => setActiveLesson(null)}
            onCompleteLesson={handleCompleteLesson}
          />
        )}


      </div>
    );
  }

  // ==========================================
  // FULL WEB / MOBILE RESPONSIVE LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col md:flex-row transition-colors">
      {/* Navigation: Sidebar on Desktop, Bottom bar on Mobile */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab: any) => setActiveTab(tab)}
        stats={stats}
        onQuickStart={() => handleStartLesson(nextLesson)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          stats={stats}
          isMobileDeviceFrame={isMobileDeviceFrame}
          onToggleDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
          onAvatarClick={() => setActiveTab('profile')}
          onNavigateTab={(tab: any) => setActiveTab(tab)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col">
          {renderGroupTabs()}
          {renderTabContent()}
        </main>
      </div>

      {/* Interactive Lesson Modal Runner */}
      {activeLesson && (
        <LessonModal
          lesson={activeLesson}
          onClose={() => setActiveLesson(null)}
          onCompleteLesson={handleCompleteLesson}
        />
      )}


    </div>
  );
}

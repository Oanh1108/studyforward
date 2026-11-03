"use client";

import React, { useState, useRef, useMemo, useEffect, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { UserStats } from './types';
import { userStatsApi } from '@/lib/userStatsApi';
import { profileApi } from '@/lib/profileApi';
import { useAuth } from '@/lib/authContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Camera,
  Edit3,
  Clock,
  BookOpen,
  Target,
  Flame,
  Star,
  Trophy,
  Sparkles,
  CheckCircle2,
  Lock,
  Calendar,
  X,
  Check,
  Eye,
  EyeOff,
  Bell,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.';
  if (file.size > MAX_FILE_SIZE) return 'File ảnh không được vượt quá 5 MB.';
  return null;
}

function cleanLevelBadge(rawLevel?: string): string {
  if (!rawLevel) return 'B1 · Intermediate';
  return rawLevel.replace(/\s*-\s*/g, ' · ').trim();
}

interface ProfileViewProps {
  stats: UserStats;
  onUpdateStats: (newStats: Partial<UserStats>) => void;
}

export function ProfileView({ stats, onUpdateStats }: ProfileViewProps) {
  const { user, refreshSession } = useAuth();

  // ─── States ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Form states
  const [selectedGoalMinutes, setSelectedGoalMinutes] = useState(stats.dailyGoalMinutes || 25);
  const [selectedWeeklyDays, setSelectedWeeklyDays] = useState(stats.weeklyTargetDays || 7);
  const [selectedStudyPurpose, setSelectedStudyPurpose] = useState(stats.studyPurpose || 'communication');
  const [reminderEnabled, setReminderEnabled] = useState(stats.reminderEnabled ?? true);
  const [reminderTime, setReminderTime] = useState(stats.reminderTime || '20:30');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsToast, setSettingsToast] = useState(false);

  // Name & Passwords
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [passErrors, setPassErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [passStatus, setPassStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passError, setPassError] = useState('');
  const [hasPassword, setHasPassword] = useState(true);

  // Avatar & Cover
  const [avatarUrl, setAvatarUrl] = useState(stats.avatar || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load real data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setLoadError(false);
      try {
        const [userStatsRes, historyRes] = await Promise.all([
          userStatsApi.getMyStats().catch(() => null),
          userStatsApi.getActivityHistory().catch(() => []),
        ]);

        if (!isMounted) return;

        if (userStatsRes) {
          setNameValue(userStatsRes.name || '');
          setAvatarUrl((userStatsRes as any).avatar || '');
          setCoverUrl((userStatsRes as any).coverImage || '');
          setHasPassword((userStatsRes as any).hasPassword !== false);
          if (userStatsRes.dailyGoalMinutes) setSelectedGoalMinutes(userStatsRes.dailyGoalMinutes);
          if (userStatsRes.weeklyTargetDays) setSelectedWeeklyDays(userStatsRes.weeklyTargetDays);
          if (userStatsRes.studyPurpose) setSelectedStudyPurpose(userStatsRes.studyPurpose);
          if (userStatsRes.reminderEnabled !== undefined) setReminderEnabled(userStatsRes.reminderEnabled);
          if (userStatsRes.reminderTime) setReminderTime(userStatsRes.reminderTime);
        } else {
          setNameValue(user?.name || stats.name || '');
          setLoadError(true);
        }

        if (Array.isArray(historyRes)) {
          setActivityHistory(historyRes);
        }
      } catch (err) {
        console.warn('Error loading profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, stats.name, reloadKey]);

  // Calculated values
  const displayName = nameValue || user?.name || stats.name || 'Người dùng';
  const displayAvatar =
    avatarUrl ||
    stats.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  // 7-day Learning Progress Chart Data
  const weeklyChartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const historyMap = new Map<string, any>();
    activityHistory.forEach((item) => {
      if (item.date) {
        historyMap.set(item.date, item);
      }
    });

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const fullDayLabels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;
      const log = historyMap.get(dateStr);

      result.push({
        date: dateStr,
        dayLabel: dayLabels[d.getDay()],
        fullDayLabel: fullDayLabels[d.getDay()],
        dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        minutes: log ? log.minutes : 0,
        xp: log ? log.xpEarned : 0,
        isToday: i === 0,
      });
    }
    return result;
  }, [activityHistory]);

  // Progress metrics: only values the backend actually provides
  const progressMetrics = useMemo(() => {
    const items: { name: string; icon: React.ReactNode; percentage: number; detail: string }[] = [];
    if (stats.totalWordsGoal > 0) {
      items.push({
        name: 'Từ vựng',
        icon: <BookOpen className="w-3.5 h-3.5" />,
        percentage: Math.min(100, Math.round((stats.wordsLearned / stats.totalWordsGoal) * 100)),
        detail: `${stats.wordsLearned} / ${stats.totalWordsGoal} từ`,
      });
    }
    if (stats.dailyGoalMinutes > 0) {
      items.push({
        name: 'Mục tiêu hôm nay',
        icon: <Target className="w-3.5 h-3.5" />,
        percentage: Math.min(100, Math.round((stats.todayMinutes / stats.dailyGoalMinutes) * 100)),
        detail: `${stats.todayMinutes} / ${stats.dailyGoalMinutes} phút`,
      });
    }
    if (stats.weeklyTargetDays > 0) {
      items.push({
        name: 'Mục tiêu tuần',
        icon: <Calendar className="w-3.5 h-3.5" />,
        percentage: Math.min(100, Math.round((stats.weeklyCompletedDays / stats.weeklyTargetDays) * 100)),
        detail: `${stats.weeklyCompletedDays} / ${stats.weeklyTargetDays} ngày`,
      });
    }
    return items;
  }, [stats.wordsLearned, stats.totalWordsGoal, stats.todayMinutes, stats.dailyGoalMinutes, stats.weeklyCompletedDays, stats.weeklyTargetDays]);

  // Dynamic Achievements
  const dynamicAchievements = useMemo(
    () => [
      {
        id: 'ach-1',
        title: 'Chiến binh Streak 7 ngày',
        desc: 'Duy trì học liên tục trong 7 ngày không gián đoạn',
        icon: <Flame className="w-6 h-6" />,
        unlocked: stats.streakDays >= 7,
        progress: Math.min(100, Math.round((stats.streakDays / 7) * 100)),
        progressText: `${Math.min(7, stats.streakDays)} / 7 ngày`,
      },
      {
        id: 'ach-2',
        title: 'Nhà thông thái từ vựng',
        desc: 'Làm chủ ít nhất 50 từ vựng cốt lõi',
        icon: <BookOpen className="w-6 h-6" />,
        unlocked: stats.wordsLearned >= 50,
        progress: Math.min(100, Math.round((stats.wordsLearned / 50) * 100)),
        progressText: `${stats.wordsLearned} / 50 từ`,
      },
      {
        id: 'ach-3',
        title: 'Chăm chỉ tích lũy',
        desc: 'Học tập tích lũy đạt 5 giờ học hiệu quả',
        icon: <Clock className="w-6 h-6" />,
        unlocked: stats.totalHours >= 5,
        progress: Math.min(100, Math.round((stats.totalHours / 5) * 100)),
        progressText: `${stats.totalHours} / 5 giờ`,
      },
      {
        id: 'ach-4',
        title: `Bậc thầy ${stats.totalWordsGoal || 500} từ`,
        desc: `Làm chủ toàn bộ từ vựng mục tiêu (${stats.wordsLearned}/${stats.totalWordsGoal || 500})`,
        icon: <GraduationCap className="w-6 h-6" />,
        unlocked: stats.wordsLearned >= (stats.totalWordsGoal || 500),
        progress: Math.min(100, Math.round((stats.wordsLearned / (stats.totalWordsGoal || 500)) * 100)),
        progressText: `${stats.wordsLearned} / ${stats.totalWordsGoal || 500} từ`,
      },
      {
        id: 'ach-5',
        title: 'Cột mốc 1,000 XP',
        desc: 'Tích lũy từ bài học, luyện nghe chép và phản xạ',
        icon: <Star className="w-6 h-6" />,
        unlocked: stats.xpPoints >= 1000,
        progress: Math.min(100, Math.round((stats.xpPoints / 1000) * 100)),
        progressText: `${stats.xpPoints.toLocaleString()} / 1,000 XP`,
      },
      {
        id: 'ach-6',
        title: 'Người học kiên định',
        desc: 'Hoàn thành trọn vẹn mục tiêu tuần',
        icon: <Target className="w-6 h-6" />,
        unlocked: stats.streakDays >= (stats.weeklyTargetDays || 7),
        progress: Math.min(100, Math.round((stats.streakDays / (stats.weeklyTargetDays || 7)) * 100)),
        progressText: `${Math.min(stats.weeklyTargetDays || 7, stats.streakDays)} / ${stats.weeklyTargetDays || 7} ngày`,
      },
    ],
    [stats.streakDays, stats.wordsLearned, stats.totalHours, stats.totalWordsGoal, stats.xpPoints, stats.weeklyTargetDays]
  );

  // Recent Activities
  const recentActivities = useMemo(() => {
    if (!activityHistory || activityHistory.length === 0) return [];

    return activityHistory.slice(0, 5).map((log, i) => {
      let timeAgo = 'Gần đây';
      try {
        if (log.createdAt) {
          timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi });
        } else if (log.date) {
          timeAgo = `Ngày ${log.date}`;
        }
      } catch {
        timeAgo = log.date || 'Gần đây';
      }

      return {
        id: log.id || `act-${i}`,
        title: log.wordsLearned > 0 ? 'Luyện tập & Ôn từ vựng' : 'Phiên học tập trung hoàn tất',
        detail: `${log.minutes || 0} phút học · ${log.wordsLearned || 0} từ đã ôn`,
        xp: log.xpEarned || 0,
        timeAgo,
        icon: log.wordsLearned > 0 ? <BookOpen className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
      };
    });
  }, [activityHistory]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setAvatarError(err);
      return;
    }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const { avatarUrl: url } = await profileApi.uploadAvatar(file);
      setAvatarUrl(url);
      onUpdateStats({ avatar: url });
      await refreshSession();
    } catch (err: any) {
      setAvatarError(err.message || 'Tải ảnh đại diện thất bại');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setCoverError(err);
      return;
    }
    setCoverError('');
    setCoverUploading(true);
    try {
      const { coverUrl: url } = await profileApi.uploadCover(file);
      setCoverUrl(url);
    } catch (err: any) {
      setCoverError(err.message || 'Tải ảnh nền thất bại');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameValue.trim()) {
      setNameError('Tên không được để trống.');
      return;
    }
    if (nameValue.trim().length > 50) {
      setNameError('Tối đa 50 ký tự.');
      return;
    }
    setNameError('');
    setNameSaveStatus('saving');
    try {
      await userStatsApi.updateProfile({ name: nameValue.trim() });
      await refreshSession();
      onUpdateStats({ name: nameValue.trim() } as any);
      setNameSaveStatus('saved');
      setTimeout(() => setNameSaveStatus('idle'), 2500);
    } catch (err: any) {
      setNameSaveStatus('error');
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await userStatsApi.updateProfile({
        dailyGoalMinutes: selectedGoalMinutes,
        weeklyTargetDays: selectedWeeklyDays,
        studyPurpose: selectedStudyPurpose,
        reminderEnabled,
        reminderTime,
      });
      onUpdateStats({
        dailyGoalMinutes: selectedGoalMinutes,
        weeklyTargetDays: selectedWeeklyDays,
        studyPurpose: selectedStudyPurpose,
        reminderEnabled,
        reminderTime,
      });
      setSettingsToast(true);
      setTimeout(() => setSettingsToast(false), 2500);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errors: { current?: string; new?: string; confirm?: string } = {};
    if (!currentPass) errors.current = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!newPass) errors.new = 'Vui lòng nhập mật khẩu mới.';
    else if (newPass.length < 8) errors.new = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    if (!confirmPass) errors.confirm = 'Vui lòng xác nhận mật khẩu.';
    else if (confirmPass !== newPass) errors.confirm = 'Mật khẩu xác nhận không khớp.';
    setPassErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPassStatus('saving');
    setPassError('');
    try {
      await profileApi.changePassword(currentPass, newPass);
      setPassStatus('saved');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassStatus('idle'), 3000);
    } catch (err: any) {
      setPassError(err.message || 'Đổi mật khẩu thất bại');
      setPassStatus('error');
    }
  };

  // ─── Skeleton Loading State ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full space-y-6 pb-20 animate-pulse">
        {/* Cover Skeleton */}
        <div className="h-44 sm:h-48 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border)]" />
        {/* Info Skeleton */}
        <div className="flex flex-col sm:flex-row items-center gap-4 -mt-12 px-6">
          <div className="w-24 h-24 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-[var(--bg-card)]" />
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="h-6 w-48 bg-slate-300 dark:bg-slate-700 rounded-lg mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto sm:mx-0" />
          </div>
        </div>
        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-md w-full mx-auto mt-12 p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] text-center space-y-4" role="alert">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">Không thể tải thông tin hồ sơ.</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-7 pb-20 md:pb-12 animate-fade-up">
      {/* =========================================================================
          SECTION 1: PROFILE HERO & COVER
         ========================================================================= */}
      <div className="relative rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs overflow-hidden">
        {/* Modern EdTech Generative Cover (No ERD/database diagram!) */}
        <div className="relative h-44 sm:h-48 md:h-[180px] w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
          {/* Custom user background if uploaded, else pure generative design */}
          {coverUrl && !coverUrl.includes('erd') && !coverUrl.includes('database') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Soft ambient blurred orbs */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-1/2 left-10 -translate-y-1/2 w-48 h-48 bg-indigo-300/15 rounded-full blur-xl pointer-events-none" />

          {/* Subtle geometric dot matrix overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-15 dark:opacity-20 pointer-events-none" width="100%" height="100%">
            <defs>
              <pattern id="profile-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#profile-grid)" />
          </svg>

          {/* StudyForward EdTech Badge on Top-Left */}
          <div className="absolute top-4 left-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wide select-none">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>StudyForward Learning Profile</span>
          </div>

          {/* Edit Cover CTA button */}
          <div className="absolute bottom-3 right-4 z-10">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xs transition-all disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {coverUploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Đổi ảnh nền</span>
                </>
              )}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>
        </div>

        {/* Profile Information Row */}
        <div className="px-5 sm:px-8 pb-6 pt-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-14 pb-2">
            {/* Circular Avatar with 4px border & Camera edit button */}
            <div className="relative shrink-0 z-10">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-[var(--bg-card)] dark:ring-[var(--bg-card)] overflow-hidden shadow-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`;
                  }}
                />
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md ring-2 ring-[var(--bg-card)] transition-all active:scale-95 cursor-pointer"
                title="Đổi ảnh đại diện"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                      {displayName}
                    </h1>
                    {/* Level badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>{cleanLevelBadge(stats.currentLevel)}</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium mt-0.5">
                    {user?.email || (stats as { email?: string }).email}
                  </p>
                </div>

                {/* Edit Profile CTA Button */}
                <div className="shrink-0 flex justify-center sm:justify-end w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Chỉnh sửa hồ sơ</span>
                  </button>
                </div>
              </div>

              {/* Quick Metric Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{stats.streakDays} ngày Streak</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-extrabold">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span>{stats.xpPoints.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Error Messages */}
          {avatarError && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {avatarError}
            </p>
          )}
          {coverError && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {coverError}
            </p>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: LEARNING OVERVIEW (4 STAT CARDS)
         ========================================================================= */}
      <div>
        <h2 className="font-bold text-base md:text-lg text-[var(--text-primary)] mb-3.5 flex items-center gap-2">
          <span>Tổng quan học tập</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
          {/* Card 1: Study Time */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Thời gian học</div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mt-1">
              {stats.totalHours} <span className="text-sm font-medium text-[var(--text-muted)]">giờ</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">Tích lũy từ bài học</div>
          </div>

          {/* Card 2: Vocabulary Learned */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Từ vựng đã học</div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mt-1">
              {stats.wordsLearned} <span className="text-sm font-medium text-[var(--text-muted)]">từ</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">/{stats.totalWordsGoal || 600} từ cốt lõi</div>
          </div>

          {/* Card 3: Accuracy */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Độ chính xác</div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mt-1">
              —
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">Chưa có dữ liệu</div>
          </div>

          {/* Card 4: Streak */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Chuỗi học tập</div>
            <div className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mt-1">
              {stats.streakDays} <span className="text-sm font-medium text-[var(--text-muted)]">ngày</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">Duy trì liên tục</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: LEARNING PROGRESS + SKILLS (60% / 40%)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: 60% (7 cols) - Weekly Learning Progress ── */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">Tiến độ học tập</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Thời gian học tập theo từng ngày trong tuần</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/40">
              7 ngày gần nhất
            </span>
          </div>

          {/* Weekly Chart */}
          {weeklyChartData.every((d) => d.minutes === 0) ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Chưa có dữ liệu học tập trong tuần này</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Bắt đầu học ngay để duy trì chuỗi Streak của bạn!</p>
              </div>
              <Link
                href="/paths"
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                Bắt đầu học ngay
              </Link>
            </div>
          ) : (
            <div className="pt-4">
              <div className="flex items-end justify-between gap-2 h-48 px-2 pb-2">
                {weeklyChartData.map((item, idx) => {
                  const maxMins = Math.max(30, ...weeklyChartData.map((d) => d.minutes));
                  const heightPercent = Math.max(item.minutes > 0 ? 8 : 4, (item.minutes / maxMins) * 100);
                  const isToday = item.isToday;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap pointer-events-none z-20 shadow-md">
                        {item.fullDayLabel} ({item.dateLabel}): {item.minutes} phút ({item.xp} XP)
                      </div>

                      {/* Bar Container */}
                      <div className="w-full max-w-[36px] bg-[var(--bg-subtle)] rounded-xl h-36 flex items-end p-1 overflow-hidden">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-lg transition-all duration-500 ${
                            isToday
                              ? 'bg-gradient-to-t from-indigo-600 to-purple-600 shadow-xs'
                              : item.minutes > 0
                              ? 'bg-indigo-500/80 group-hover:bg-indigo-600'
                              : 'bg-slate-200 dark:bg-slate-700/50'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-[11px] font-bold ${
                          isToday ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {item.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: 40% (5 cols) - Skills & Level Progress ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Current Level Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Cấp độ hiện tại</span>
                <h3 className="font-black text-lg text-[var(--text-primary)] mt-0.5">
                  {cleanLevelBadge(stats.currentLevel)}
                </h3>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-3 font-medium">
              {stats.xpPoints.toLocaleString()} XP tích lũy
            </p>
          </div>

          {/* Skill Overview Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">Mục tiêu & từ vựng</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Tiến độ theo dữ liệu học tập thực tế của bạn</p>
            </div>

            <div className="space-y-3.5">
              {progressMetrics.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu mục tiêu.</p>
              )}
              {progressMetrics.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-[var(--text-primary)] flex items-center gap-1.5 min-w-0">
                      {m.icon}
                      <span className="truncate">{m.name}</span>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold shrink-0">{m.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                    <div style={{ width: `${m.percentage}%` }} className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-500" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{m.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ACHIEVEMENTS ("BỘ SƯU TẬP HUY HIỆU")
         ========================================================================= */}
      <div className="p-5 md:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold text-base md:text-lg text-[var(--text-primary)]">
              Bộ sưu tập Huy hiệu
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Đạt các cột mốc để mở khóa danh hiệu vinh danh.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/40">
            {dynamicAchievements.filter((a) => a.unlocked).length} / {dynamicAchievements.length} đã mở khóa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dynamicAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between space-y-3 ${
                ach.unlocked
                  ? 'border-indigo-200 dark:border-indigo-800/60 bg-[var(--bg-card)] shadow-2xs'
                  : 'border-[var(--border)] bg-[var(--bg-subtle)]/50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-2xs ${
                    ach.unlocked
                      ? 'bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] opacity-60'
                  }`}
                >
                  {ach.icon}
                </div>
                {ach.unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Đã mở khóa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Chưa mở
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{ach.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{ach.desc}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                  <span>Tiến độ</span>
                  <span className={ach.unlocked ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                    {ach.progressText || `${ach.progress}%`}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    style={{ width: `${ach.progress}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      ach.unlocked ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: RECENT ACTIVITY ("HOẠT ĐỘNG GẦN ĐÂY")
         ========================================================================= */}
      <div className="p-5 md:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold text-base md:text-lg text-[var(--text-primary)]">
              Hoạt động gần đây
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Nhật ký học tập và tích lũy điểm kinh nghiệm thực tế
            </p>
          </div>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Chưa có hoạt động gần đây.</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Hãy hoàn thành bài học đầu tiên để lưu nhật ký nhé!</p>
            </div>
            <Link
              href="/dashboard"
              className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
            >
              Bắt đầu học ngay
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    {act.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                      {act.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 font-medium">
                      {act.detail}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {act.xp > 0 && (
                    <span className="inline-block text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md">
                      +{act.xp} XP
                    </span>
                  )}
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {act.timeAgo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 6: EDIT PROFILE & PASSWORD MODAL / DRAWER
         ========================================================================= */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setIsEditOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-up z-10">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Chỉnh sửa hồ sơ & Cài đặt</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Quản lý thông tin tài khoản và lộ trình học tập</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="px-5 pt-3">
              <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-[var(--bg-card)] shadow-xs text-[var(--text-primary)] border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Thông tin học tập
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'security'
                      ? 'bg-[var(--bg-card)] shadow-xs text-[var(--text-primary)] border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Mật khẩu & Bảo mật
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {activeTab === 'profile' ? (
                <div className="space-y-4">
                  {/* Display Name */}
                  <form onSubmit={handleSaveName} className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Tên hiển thị
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nameValue}
                        maxLength={50}
                        onChange={(e) => {
                          setNameValue(e.target.value);
                          setNameError('');
                          setNameSaveStatus('idle');
                        }}
                        disabled={nameSaveStatus === 'saving'}
                        className={`input flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm ${
                          nameError ? 'border-rose-500' : ''
                        }`}
                        placeholder="Tên hiển thị của bạn"
                      />
                      <button
                        type="submit"
                        disabled={nameSaveStatus === 'saving' || nameValue.trim() === (user?.name || '')}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        {nameSaveStatus === 'saving' ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Lưu tên</span>
                      </button>
                    </div>
                    {nameError && <p className="text-xs text-rose-600 dark:text-rose-400">{nameError}</p>}
                    {nameSaveStatus === 'saved' && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã cập nhật tên thành công!
                      </p>
                    )}
                  </form>

                  {/* Study Purpose */}
                  <div className="border-t border-[var(--border)] pt-4 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Mục tiêu học tập chính:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'communication', label: 'Giao tiếp', icon: '🗣️' },
                        { id: 'studying', label: 'Học tập', icon: '📚' },
                        { id: 'work', label: 'Công việc', icon: '💼' },
                        { id: 'exams', label: 'Thi cử', icon: '🎓' },
                      ].map((purpose) => (
                        <button
                          key={purpose.id}
                          type="button"
                          onClick={() => setSelectedStudyPurpose(purpose.id)}
                          className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                            selectedStudyPurpose === purpose.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                              : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-indigo-300'
                          }`}
                        >
                          <div className="text-xl mb-1">{purpose.icon}</div>
                          <div>{purpose.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily & Weekly Goals */}
                  <div className="border-t border-[var(--border)] pt-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Kế hoạch học tập:
                    </label>
                    <div>
                      <div className="text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">Số phút học mỗi ngày:</div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[15, 25, 40].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setSelectedGoalMinutes(mins)}
                            className={`py-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                              selectedGoalMinutes === mins
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                                : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <div>{mins} phút</div>
                            <span className="text-[10px] font-normal text-[var(--text-muted)]">
                              {mins === 15 ? 'Vừa vặn' : mins === 25 ? 'Tiêu chuẩn' : 'Tăng tốc'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">Số ngày học mỗi tuần:</div>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setSelectedWeeklyDays(days)}
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                              selectedWeeklyDays === days
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                            }`}
                          >
                            {days}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reminder Toggle */}
                  <div className="border-t border-[var(--border)] pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">Nhắc nhở học hàng ngày</div>
                          <div className="text-[11px] text-[var(--text-muted)]">Giữ vững chuỗi Streak không bị ngắt</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReminderEnabled(!reminderEnabled)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                            reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    {reminderEnabled && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Giờ nhắc:</span>
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Save Settings CTA */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        'Lưu cài đặt'
                      )}
                    </button>
                    {settingsToast && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-500" /> Đã lưu cài đặt!
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Security & Password Tab */
                <div className="space-y-4">
                  {!hasPassword && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                      <strong className="block font-bold">Tài khoản đăng nhập qua Google</strong>
                      <p className="mt-0.5">
                        Bạn có thể đặt mật khẩu qua trang{' '}
                        <Link href="/forgot-password" className="underline font-bold">
                          quên mật khẩu
                        </Link>
                        .
                      </p>
                    </div>
                  )}

                  {passStatus === 'saved' && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> Đổi mật khẩu thành công!
                    </div>
                  )}
                  {passStatus === 'error' && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {passError}
                    </div>
                  )}

                  {hasPassword && (
                    <form onSubmit={handleChangePassword} noValidate className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          Mật khẩu hiện tại
                        </label>
                        <div className="relative">
                          <input
                            type={showCurr ? 'text' : 'password'}
                            value={currentPass}
                            onChange={(e) => {
                              setCurrentPass(e.target.value);
                              setPassErrors((p) => ({ ...p, current: undefined }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm pr-10 ${
                              passErrors.current ? 'border-rose-500' : ''
                            }`}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurr(!showCurr)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showCurr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passErrors.current && <p className="mt-1 text-xs text-rose-600">{passErrors.current}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          Mật khẩu mới
                        </label>
                        <div className="relative">
                          <input
                            type={showNew ? 'text' : 'password'}
                            value={newPass}
                            onChange={(e) => {
                              setNewPass(e.target.value);
                              setPassErrors((p) => ({ ...p, new: undefined }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm pr-10 ${
                              passErrors.new ? 'border-rose-500' : ''
                            }`}
                            placeholder="Tối thiểu 8 ký tự"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passErrors.new && <p className="mt-1 text-xs text-rose-600">{passErrors.new}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                          <input
                            type={showConf ? 'text' : 'password'}
                            value={confirmPass}
                            onChange={(e) => {
                              setConfirmPass(e.target.value);
                              setPassErrors((p) => ({ ...p, confirm: undefined }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm pr-10 ${
                              passErrors.confirm ? 'border-rose-500' : ''
                            }`}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConf(!showConf)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passErrors.confirm && <p className="mt-1 text-xs text-rose-600">{passErrors.confirm}</p>}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={passStatus === 'saving'}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all"
                        >
                          {passStatus === 'saving' ? 'Đang lưu...' : 'Đổi mật khẩu'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Session / Logout Info */}
              <div className="border-t border-[var(--border)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Phiên làm việc</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{user?.email}</div>
                </div>
                <LogoutButton className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

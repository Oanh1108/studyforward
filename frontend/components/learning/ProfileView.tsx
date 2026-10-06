"use client";

import React, { useState, useRef, useMemo, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import { UserStats } from './types';
import { userStatsApi } from '@/lib/userStatsApi';
import { profileApi } from '@/lib/profileApi';
import { IconFire, IconStar, IconCards, IconClock, IconBell, IconCheck } from './icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/lib/authContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.';
  if (file.size > MAX_FILE_SIZE) return 'File ảnh không được vượt quá 5 MB.';
  return null;
}

interface ProfileViewProps {
  stats: UserStats;
  onUpdateStats: (newStats: Partial<UserStats>) => void;
}

type SecurityTab = 'settings' | 'password';

export function ProfileView({ stats, onUpdateStats }: ProfileViewProps) {
  const { user, refreshSession } = useAuth();

  // ─── Settings state ────────────────────────────────────────────────────────
  const [selectedGoalMinutes, setSelectedGoalMinutes] = useState(stats.dailyGoalMinutes);
  const [selectedWeeklyDays, setSelectedWeeklyDays] = useState(stats.weeklyTargetDays || 7);
  const [selectedStudyPurpose, setSelectedStudyPurpose] = useState(stats.studyPurpose || 'communication');
  const [reminderEnabled, setReminderEnabled] = useState(stats.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(stats.reminderTime);
  const [saveToast, setSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Display name ─────────────────────────────────────────────────────────
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ─── Avatar ───────────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ─── Cover ────────────────────────────────────────────────────────────────
  const [coverUrl, setCoverUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ─── Security tab ─────────────────────────────────────────────────────────
  const [securityTab, setSecurityTab] = useState<SecurityTab>('settings');
  const [hasPassword, setHasPassword] = useState(true);

  // ─── Change password ──────────────────────────────────────────────────────
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [passErrors, setPassErrors] = useState<{current?: string; new?: string; confirm?: string}>({});
  const [passStatus, setPassStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passError, setPassError] = useState('');

  const goalOptions = [15, 25, 40];

  // Load user-specific data from stats API
  useEffect(() => {
    async function loadStats() {
      try {
        const s = await userStatsApi.getMyStats();
        setNameValue(s.name || '');
        setAvatarUrl((s as any).avatar || '');
        setCoverUrl((s as any).coverImage || '');
        setHasPassword((s as any).hasPassword !== false);
      } catch {
        setNameValue(user?.name || '');
      }
    }
    loadStats();
  }, [user]);

  const dynamicAchievements = useMemo(() => [
    {
      id: 'ach-1',
      title: 'Chiến binh Streak 7 ngày',
      desc: 'Duy trì học liên tục trong 7 ngày không gián đoạn',
      icon: '🔥',
      unlocked: stats.streakDays >= 7,
      progress: Math.min(100, Math.round((stats.streakDays / 7) * 100)),
    },
    {
      id: 'ach-2',
      title: 'Nhà thông thái từ vựng',
      desc: `Làm chủ từ vựng đã ghi nhớ (hiện có ${stats.wordsLearned}/50 từ)`,
      icon: '📚',
      unlocked: stats.wordsLearned >= 50,
      progress: Math.min(100, Math.round((stats.wordsLearned / 50) * 100)),
    },
    {
      id: 'ach-3',
      title: 'Chăm chỉ tích lũy',
      desc: `Học tập tích lũy đạt 5 giờ (hiện có ${stats.totalHours}/5h)`,
      icon: '⏱️',
      unlocked: stats.totalHours >= 5,
      progress: Math.min(100, Math.round((stats.totalHours / 5) * 100)),
    },
    {
      id: 'ach-4',
      title: `Bậc thầy ${stats.totalWordsGoal || 500} từ`,
      desc: `Làm chủ toàn bộ từ vựng mục tiêu (${stats.wordsLearned}/${stats.totalWordsGoal || 500})`,
      icon: '💎',
      unlocked: stats.wordsLearned >= (stats.totalWordsGoal || 500),
      progress: Math.min(100, Math.round((stats.wordsLearned / (stats.totalWordsGoal || 500)) * 100)),
    },
    {
      id: 'ach-5',
      title: 'Cột mốc 1,000 XP',
      desc: `Tích lũy từ các bài học và luyện nói (${stats.xpPoints.toLocaleString()}/1,000 XP)`,
      icon: '⭐',
      unlocked: stats.xpPoints >= 1000,
      progress: Math.min(100, Math.round((stats.xpPoints / 1000) * 100)),
    },
  ], [stats.streakDays, stats.wordsLearned, stats.totalHours, stats.totalWordsGoal, stats.xpPoints]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await userStatsApi.updateProfile({ 
        dailyGoalMinutes: selectedGoalMinutes, 
        weeklyTargetDays: selectedWeeklyDays,
        studyPurpose: selectedStudyPurpose,
        reminderEnabled, 
        reminderTime 
      });
      onUpdateStats({ 
        dailyGoalMinutes: selectedGoalMinutes, 
        weeklyTargetDays: selectedWeeklyDays,
        studyPurpose: selectedStudyPurpose,
        reminderEnabled, 
        reminderTime 
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValue.trim()) { setNameError('Tên không được để trống.'); return; }
    if (nameValue.trim().length > 50) { setNameError('Tối đa 50 ký tự.'); return; }
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

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setAvatarError(err); return; }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const { avatarUrl: url } = await profileApi.uploadAvatar(file);
      setAvatarUrl(url);
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
    if (err) { setCoverError(err); return; }
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {current?: string; new?: string; confirm?: string} = {};
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
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setPassStatus('idle'), 3000);
    } catch (err: any) {
      setPassError(err.message || 'Đổi mật khẩu thất bại');
      setPassStatus('error');
    }
  };

  const displayName = nameValue || user?.name || stats.name || 'Người dùng';
  const displayAvatar = avatarUrl || stats.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">

      {/* ── 1. Profile Header with Cover Image ── */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[var(--border)]">
        {/* Cover background */}
        <div
          className="h-28 sm:h-36 relative"
          style={{
            background: coverUrl
              ? `url(${coverUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #4f7cff 0%, #7c3aed 100%)',
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          {/* Cover change button */}
          <div className="absolute bottom-2 right-2">
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/70 text-white text-[11px] font-semibold backdrop-blur-sm transition-all disabled:opacity-60"
            >
              {coverUploading ? (
                <><div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"/><span>Đang tải...</span></>
              ) : (
                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg><span>Đổi ảnh nền</span></>
              )}
            </button>
            <input ref={coverInputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={handleCoverChange} />
          </div>
        </div>

        {/* Profile info section */}
        <div className="bg-[var(--bg-card)] px-5 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 -mt-10 sm:-mt-12 pb-1">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--bg-card)] overflow-hidden shadow-md flex items-center justify-center bg-indigo-50 dark:bg-indigo-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-all disabled:opacity-60"
                title="Đổi ảnh đại diện"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>
              </button>
              <input ref={avatarInputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + badges */}
            <div className="text-center sm:text-left pb-1 flex-1">
              <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">{displayName}</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {user?.email} • Trình độ: <strong className="text-indigo-600 dark:text-indigo-400">{stats.currentLevel}</strong>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <IconFire className="w-3.5 h-3.5" /> {stats.streakDays} ngày Streak
                </span>
                <span className="bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <IconStar className="w-3.5 h-3.5" /> {stats.xpPoints.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          {/* Upload error messages */}
          {avatarError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1"><span>⚠️</span> {avatarError}</p>}
          {coverError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1"><span>⚠️</span> {coverError}</p>}
          <p className="text-[11px] text-[var(--text-muted)] mt-2">Ảnh: JPG, PNG, WebP, GIF · Tối đa 5 MB</p>
        </div>
      </div>

      {/* ── 2. Statistics ── */}
      <div>
        <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-3">Thống kê học tập</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <IconClock className="w-4 h-4" />, color: 'text-indigo-500', value: stats.totalHours, unit: 'giờ tích lũy' },
            { icon: <IconCards className="w-4 h-4" />, color: 'text-blue-500', value: stats.wordsLearned, unit: `/${stats.totalWordsGoal} từ cốt lõi` },
            { icon: <IconCheck className="w-4 h-4" />, color: 'text-emerald-500', value: '92%', unit: 'độ chính xác' },
            { icon: <IconFire className="w-4 h-4" />, color: 'text-amber-500', value: stats.streakDays, unit: 'ngày liên tục' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
              <div className={`flex items-center gap-2 ${item.color} mb-1`}>
                {item.icon}
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{item.value}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{item.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Achievements ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            Bộ sưu tập Huy hiệu ({dynamicAchievements.filter((a) => a.unlocked).length}/{dynamicAchievements.length})
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Đạt các cột mốc để mở khóa danh hiệu vinh danh.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {dynamicAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${ach.unlocked ? 'border-[var(--border)] bg-[var(--bg-subtle)]' : 'border-dashed border-[var(--border)] opacity-60'}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-2xl shrink-0 shadow-sm">{ach.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs md:text-sm text-[var(--text-primary)] truncate">{ach.title}</h4>
                  {ach.unlocked ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">Đã đạt</span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">{ach.progress}%</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">{ach.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Account & Security (Tabbed) ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex gap-1 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl">
          {([['settings', '⚙️ Cài đặt'], ['password', '🔒 Bảo mật']] as [SecurityTab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setSecurityTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${securityTab === t
                ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Settings sub-tab */}
        {securityTab === 'settings' && (
          <div className="space-y-5">
            {/* Display name edit */}
            <form onSubmit={handleSaveName} noValidate className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Tên hiển thị</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameValue}
                  maxLength={50}
                  onChange={(e) => { setNameValue(e.target.value); setNameError(''); setNameSaveStatus('idle'); }}
                  disabled={nameSaveStatus === 'saving'}
                  className={`input flex-1 ${nameError ? 'border-rose-500' : ''}`}
                  placeholder="Tên hiển thị của bạn"
                />
                <button
                  type="submit"
                  disabled={nameSaveStatus === 'saving' || nameValue.trim() === (user?.name || '')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  {nameSaveStatus === 'saving' ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <IconCheck className="w-3.5 h-3.5"/>}
                  Lưu
                </button>
              </div>
              {nameError && <p className="text-xs text-rose-600 dark:text-rose-400">{nameError}</p>}
              {nameSaveStatus === 'saved' && <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><IconCheck className="w-3.5 h-3.5"/>Đã cập nhật tên!</p>}
            </form>

            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
              {/* Study Purpose */}
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Mục tiêu học tập chính:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    className={`p-3 rounded-2xl border text-center font-bold text-sm transition-all ${selectedStudyPurpose === purpose.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{purpose.icon}</div>
                    <div className="text-xs">{purpose.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
              {/* Daily and Weekly goal */}
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Kế hoạch học tập:</label>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold mb-2">Số phút mỗi ngày:</div>
                  <div className="grid grid-cols-3 gap-3">
                    {goalOptions.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSelectedGoalMinutes(mins)}
                        className={`py-3 rounded-2xl border text-center font-bold text-sm transition-all ${selectedGoalMinutes === mins
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div>{mins} phút</div>
                        <span className="text-[10px] font-normal text-[var(--text-muted)]">{mins === 15 ? 'Vừa vặn' : mins === 25 ? 'Tiêu chuẩn' : 'Tăng tốc'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-2">Số ngày mỗi tuần:</div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedWeeklyDays(days)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${selectedWeeklyDays === days
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder */}
            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><IconBell className="w-5 h-5" /></div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">Nhắc nhở học hàng ngày</div>
                    <div className="text-xs text-[var(--text-muted)]">Không đứt chuỗi Streak</div>
                  </div>
                </div>
                <button
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ${reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {reminderEnabled && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Giờ nhắc:</span>
                  <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]" />
                </div>
              )}
            </div>

            {/* Theme */}
            <div className="border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Giao diện (Sáng / Tối)</div>
                <div className="text-xs text-[var(--text-muted)]">Tối ưu cho mắt khi học ban đêm</div>
              </div>
              <ThemeToggle />
            </div>

            {/* Save */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs md:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Đang lưu...</span></> : 'Lưu cài đặt'}
              </button>
              {saveToast && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fade-up">
                  <IconCheck className="w-4 h-4 text-emerald-500" /> Đã lưu!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Password sub-tab */}
        {securityTab === 'password' && (
          <div className="space-y-4">
            {!hasPassword && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
                <span>ℹ️</span>
                <div>
                  <strong className="font-bold block">Tài khoản đăng nhập qua mạng xã hội</strong>
                  <p className="text-xs mt-0.5">Bạn có thể đặt mật khẩu qua <Link href="/forgot-password" className="underline font-semibold">quên mật khẩu</Link>.</p>
                </div>
              </div>
            )}

            {passStatus === 'saved' && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2 animate-fade-up">
                <IconCheck className="w-4 h-4 shrink-0"/> Đổi mật khẩu thành công!
              </div>
            )}
            {passStatus === 'error' && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 animate-fade-up" role="alert">
                <span>⚠️</span> {passError}
              </div>
            )}

            {hasPassword && (
              <form onSubmit={handleChangePassword} noValidate className="space-y-3">
                {[
                  { id: 'cp-curr', label: 'Mật khẩu hiện tại', val: currentPass, setVal: setCurrentPass, show: showCurr, setShow: setShowCurr, err: passErrors.current, errKey: 'current' as const, auto: 'current-password' },
                  { id: 'cp-new', label: 'Mật khẩu mới', val: newPass, setVal: setNewPass, show: showNew, setShow: setShowNew, err: passErrors.new, errKey: 'new' as const, auto: 'new-password' },
                  { id: 'cp-conf', label: 'Xác nhận mật khẩu mới', val: confirmPass, setVal: setConfirmPass, show: showConf, setShow: setShowConf, err: passErrors.confirm, errKey: 'confirm' as const, auto: 'new-password' },
                ].map(({ id, label, val, setVal, show, setShow, err, errKey, auto }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">{label}</label>
                    <div className="relative">
                      <input
                        id={id}
                        type={show ? 'text' : 'password'}
                        autoComplete={auto}
                        value={val}
                        onChange={(e) => { setVal(e.target.value); setPassErrors(p => ({...p, [errKey]: undefined})); if (passStatus === 'error') setPassStatus('idle'); }}
                        disabled={passStatus === 'saving'}
                        className={`input w-full pr-10 ${err ? 'border-rose-500' : ''}`}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label={show ? 'Ẩn' : 'Hiện'}>
                        {show ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        )}
                      </button>
                    </div>
                    {err && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{err}</p>}
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={passStatus === 'saving'}
                    className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    {passStatus === 'saving' ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Đang lưu...</span></> : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Session & Logout ── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-[var(--text-primary)]">Tài khoản & Phiên đăng nhập</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {user ? `Đang đăng nhập: ${user.name} (${user.email})` : 'Chưa đăng nhập'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {user ? `Vai trò: ${user.role} • Phiên đăng nhập được bảo mật bởi JWT` : 'Đăng nhập để đồng bộ kết quả học tập'}
            </div>
          </div>
          {user ? (
            <div className="sm:w-48 shrink-0">
              <LogoutButton className="bg-[var(--bg-card)] border border-rose-200 dark:border-rose-900/40 justify-center" />
            </div>
          ) : (
            <Link href="/login" className="btn-primary py-2 px-4 text-xs font-bold text-center shrink-0">Đăng nhập ngay</Link>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActiveTab, UserStats } from './types';
import { IconHome, IconBook, IconCards, IconMic, IconUser, IconFire, IconStar, IconPlay, IconShield, IconSpeaker, IconCheck } from './icons';
import { StudyForwardLogo } from '@/components/StudyForwardLogo';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/lib/authContext';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  stats: UserStats;
  onQuickStart: () => void;
}

export const getTabGroup = (tab: ActiveTab | string) => {
  if (['paths', 'courses', 'dictation', 'speaking'].includes(tab)) return 'learning';
  if (['vocabulary', 'srs', 'vocabulary_study'].includes(tab)) return 'vocabulary_hub';
  if (['notes', 'todos', 'focus'].includes(tab)) return 'tools';
  return tab;
};

const navItems: { id: ActiveTab | string; label: string; icon: React.ComponentType<{ className?: string }>; href?: string }[] = [
  { id: 'dashboard', label: 'Trang chủ', icon: IconHome, href: '/dashboard' },
  { id: 'learning', label: 'Học tập', icon: IconBook, href: '/paths' },
  { id: 'vocabulary_hub', label: 'Từ vựng', icon: IconCards, href: '/vocabulary' },
  { id: 'tools', label: 'Công cụ', icon: IconPlay, href: '/notes' },
  { id: 'analytics', label: 'Tiến độ', icon: IconFire, href: '/analytics' },
];

export function Navigation({ activeTab, onSelectTab, stats, onQuickStart }: NavigationProps) {
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentNavItems: { id: ActiveTab | string; label: string; icon: React.ComponentType<{ className?: string }>; href?: string }[] = isAdmin
    ? [...navItems, { id: 'admin' as ActiveTab, label: 'Quản trị', icon: IconShield }]
    : navItems;

  return (
    <>
      {/* =========================================
          DESKTOP SIDEBAR (Visible on md and up)
         ========================================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--bg-card)] p-5 justify-between select-none z-30">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="px-2">
            <StudyForwardLogo size="md" />
          </div>

          {/* Quick CTA Button */}
          <button
            onClick={onQuickStart}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <IconPlay className="w-4 h-4 ml-0.5" />
            <span>Học tiếp ngay</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = getTabGroup(activeTab) === item.id;
              
              // Map group clicks to a default activeTab in that group
              let targetTab = item.id as ActiveTab;
              if (item.id === 'learning') targetTab = 'paths';
              if (item.id === 'vocabulary_hub') targetTab = 'vocabulary';
              if (item.id === 'tools') targetTab = 'notes';

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all text-left ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(targetTab)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all text-left ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Quick Stats & User Profile */}
        <div className="space-y-3 pt-4 border-t border-[var(--border)]">
          {/* Quick Stats Pill */}
          <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-500">
              <IconFire className="w-4 h-4" />
              <span>{stats.streakDays} ngày</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-yellow-500">
              <IconStar className="w-4 h-4" />
              <span>{stats.xpPoints.toLocaleString()} XP</span>
            </div>
          </div>

          {/* User Account info & Logout button */}
          {/* Use mounted flag to avoid hydration mismatch: server always renders placeholder */}
          {!mounted ? (
            <div className="h-10" />
          ) : user ? (
            <div className="p-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div className="flex items-center justify-between gap-2.5">
                {/* Left info column: flex-1 and min-w-0 for truncating long text */}
                <Link href="/profile" className="flex-1 min-w-0 space-y-0.5 hover:opacity-80 transition-opacity">
                  {/* Top row: Name + Badge ADMIN / USER */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-xs font-bold text-[var(--text-primary)] truncate"
                      title={user.name}
                    >
                      {user.name}
                    </span>
                    <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                      {user.role}
                    </span>
                  </div>
                  {/* Bottom row: Email */}
                  <div
                    className="text-[10px] text-[var(--text-muted)] truncate"
                    title={user.email}
                  >
                    {user.email}
                  </div>
                </Link>

                {/* Right: Logout icon button (fixed 40x40px, non-shrinking, vertically centered) */}
                <LogoutButton className="shrink-0" />
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <span>Đăng nhập / Đăng ký</span>
            </Link>
          )}
        </div>
      </aside>

      {/* =========================================
          MOBILE BOTTOM BAR (Visible on mobile < md)
         ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-xl border-t border-[var(--border)] px-2 py-1 flex items-center justify-around shadow-[0_-8px_20px_rgba(0,0,0,0.06)] overflow-x-auto overflow-y-hidden snap-x">
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = getTabGroup(activeTab) === item.id;
          
          let targetTab = item.id as ActiveTab;
          if (item.id === 'learning') targetTab = 'paths';
          if (item.id === 'vocabulary_hub') targetTab = 'vocabulary';
          if (item.id === 'tools') targetTab = 'notes';

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex-shrink-0 snap-center flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all relative ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <div className={`p-1 rounded-xl ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(targetTab)}
              className={`flex-shrink-0 snap-center flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <div className={`p-1 rounded-xl ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

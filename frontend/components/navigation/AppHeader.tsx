"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { ActiveTab, UserStats } from '@/components/learning/types';
import {
  IconHome,
  IconBook,
  IconCards,
  IconPlay,
  IconFire,
  IconStar,
  IconShield,
} from '@/components/learning/icons';
import { StudyForwardLogo } from '@/components/StudyForwardLogo';
import { LanguageSelector } from '@/components/learning/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from './UserMenu';
import { getTabGroup } from '@/components/learning/Navigation';

export interface AppHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  stats: UserStats;
  onQuickStart: () => void;
  onAvatarClick?: () => void;
}

const navItems: { id: ActiveTab | string; label: string; icon: React.ComponentType<{ className?: string }>; href: string }[] = [
  { id: 'dashboard', label: 'Trang chủ', icon: IconHome, href: '/dashboard' },
  { id: 'learning', label: 'Học tập', icon: IconBook, href: '/learning' },
  { id: 'vocabulary_hub', label: 'Từ vựng', icon: IconCards, href: '/vocabulary' },
  { id: 'tools', label: 'Công cụ', icon: IconPlay, href: '/notes' },
  { id: 'analytics', label: 'Tiến độ', icon: IconFire, href: '/analytics' },
];

export function AppHeader({
  activeTab,
  onSelectTab,
  stats,
  onQuickStart,
  onAvatarClick,
}: AppHeaderProps) {
  const { isAdmin } = useAuth();

  const currentNavItems = isAdmin
    ? [...navItems, { id: 'admin' as ActiveTab, label: 'Quản trị', icon: IconShield, href: '/admin' }]
    : navItems;

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 md:h-[68px] bg-[var(--bg-card)]/90 backdrop-blur-xl transition-colors select-none">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-2 sm:gap-4">
          {/* LEFT: Logo */}
          <div className="flex items-center shrink-0 lg:flex-1 lg:min-w-0">
            <StudyForwardLogo size="sm" />
          </div>

          {/* CENTER: Horizontal navigation (phones use the bottom bar) */}
          <nav aria-label="Điều hướng chính" className="hidden md:flex flex-1 lg:flex-none justify-center items-center gap-1 lg:gap-4 xl:gap-8 2xl:gap-12 min-w-0">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = getTabGroup(activeTab) === item.id;

              let targetTab = item.id as ActiveTab;
              if (item.id === 'learning') targetTab = 'overview';
              if (item.id === 'vocabulary_hub') targetTab = 'vocabulary';
              if (item.id === 'tools') targetTab = 'notes';

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onSelectTab(targetTab)}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-1.5 px-2.5 py-2 lg:px-3.5 xl:gap-2 xl:px-4 rounded-xl text-[13px] lg:text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 xl:w-4.5 xl:h-4.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`} />
                  <span className={isActive ? "" : "hidden lg:inline"}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* =========================================
              RIGHT: Streak + XP + Language + Theme + Avatar
             ========================================= */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0 lg:flex-1">
            {/* Quick Start CTA */}
            <button
              type="button"
              onClick={onQuickStart}
              aria-label="Học tiếp ngay"
              className="hidden 2xl:flex shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              title="Tiếp tục học ngay"
            >
              <IconPlay className="w-3.5 h-3.5" />
              <span>Học tiếp</span>
            </button>

            {/* Streak Pill (only when there is room; also shown on the dashboard cards) */}
            <div
              className="hidden min-[1800px]:flex whitespace-nowrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs select-none"
              title="Chuỗi ngày học liên tục"
            >
              <IconFire className="w-4 h-4 text-amber-500" />
              <span>{stats?.streakDays || 0} ngày</span>
            </div>

            {/* XP Pill (Hidden on narrow mobile, shown on sm+) */}
            <div
              className="hidden min-[1800px]:flex whitespace-nowrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-extrabold text-xs select-none"
              title="Điểm kinh nghiệm tích lũy"
            >
              <IconStar className="w-4 h-4 text-yellow-500" />
              <span>{(stats?.xpPoints || 0).toLocaleString()} XP</span>
            </div>

            {/* Language Selector */}
            <LanguageSelector compactOnMobile={true} iconOnly />

            <ThemeToggle />

            {/* User Account Avatar & Dropdown */}
            <UserMenu
              stats={stats}
              onAvatarClick={onAvatarClick}
              onNavigateTab={onSelectTab}
            />
          </div>
        </div>
      </header>
    </>
  );
}


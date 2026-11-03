"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { ActiveTab } from '@/components/learning/types';
import {
  IconHome,
  IconBook,
  IconCards,
  IconPlay,
  IconFire,
  IconShield,
} from '@/components/learning/icons';
import { getTabGroup } from '@/components/learning/Navigation';

interface MobileBottomBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

const navItems: { id: ActiveTab | string; label: string; icon: React.ComponentType<{ className?: string }>; href: string }[] = [
  { id: 'dashboard', label: 'Trang chủ', icon: IconHome, href: '/dashboard' },
  { id: 'learning', label: 'Học tập', icon: IconBook, href: '/learning' },
  { id: 'vocabulary_hub', label: 'Từ vựng', icon: IconCards, href: '/vocabulary' },
  { id: 'tools', label: 'Công cụ', icon: IconPlay, href: '/notes' },
  { id: 'analytics', label: 'Tiến độ', icon: IconFire, href: '/analytics' },
];

export function MobileBottomBar({ activeTab, onSelectTab }: MobileBottomBarProps) {
  const { isAdmin } = useAuth();

  const currentNavItems = isAdmin
    ? [...navItems, { id: 'admin' as ActiveTab, label: 'Quản trị', icon: IconShield, href: '/admin' }]
    : navItems;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-xl border-t border-[var(--border)] px-2 py-1 flex items-center justify-around shadow-[0_-8px_20px_rgba(0,0,0,0.06)] overflow-x-auto overflow-y-hidden snap-x"
      aria-label="Điều hướng chính trên di động"
    >
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
      })}
    </nav>
  );
}


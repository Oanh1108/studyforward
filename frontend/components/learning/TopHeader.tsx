"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ActiveTab, UserStats } from './types';
import { IconFire, IconStar, IconPhone, IconMonitor, IconShield } from './icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StudyForwardLogo } from '@/components/StudyForwardLogo';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/lib/authContext';

import { LanguageSelector } from './LanguageSelector';

interface TopHeaderProps {
  stats: UserStats;
  isMobileDeviceFrame: boolean;
  onToggleDeviceFrame: () => void;
  onAvatarClick: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export function TopHeader({ stats, isMobileDeviceFrame, onToggleDeviceFrame, onAvatarClick, onNavigateTab }: TopHeaderProps) {
  const { user, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-card)]/90 backdrop-blur-xl border-b border-[var(--border)] px-4 md:px-8 py-3 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Brand / Title */}
      <div className="flex items-center gap-3">
        <div className="flex md:hidden items-center">
          <StudyForwardLogo size="sm" />
        </div>
      </div>

      {/* Right: Language Selector, Theme & Account Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Bộ chọn ngôn ngữ học */}
        <LanguageSelector />


        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* User Account Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          {user ? (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full border-2 border-indigo-500 overflow-hidden shrink-0 hover:ring-2 hover:ring-indigo-400 transition-all active:scale-95 flex items-center justify-center bg-indigo-600 text-white text-xs font-black"
              title="Menu tài khoản"
              aria-label="Menu tài khoản"
            >
              {stats.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stats.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(user.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              Đăng nhập
            </Link>
          )}

          {/* Account Dropdown Menu */}
          {dropdownOpen && user && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl p-3 z-50 animate-fade-up space-y-3">
              <div className="px-2 py-1 border-b border-[var(--border)] pb-2.5">
                <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                  {user.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {user.email}
                </div>
                <div className="mt-1.5 inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                  Vai trò: {user.role}
                </div>
              </div>

              <div className="space-y-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigateTab?.('admin');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-2 transition-colors"
                  >
                    <IconShield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Khu vực Quản trị</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAvatarClick();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2"
                >
                  <span>👤</span>
                  <span>Xem hồ sơ học viên</span>
                </button>
                <div className="sm:hidden flex items-center justify-between px-2.5 py-1.5">
                  <span className="text-xs text-[var(--text-secondary)]">Giao diện</span>
                  <ThemeToggle />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <LogoutButton
                  className="w-full justify-start bg-rose-50 dark:bg-rose-950/30"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

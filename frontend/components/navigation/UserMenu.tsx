"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { UserStats, ActiveTab } from '@/components/learning/types';
import { IconShield, IconUser } from '@/components/learning/icons';
import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

interface UserMenuProps {
  stats: UserStats;
  onAvatarClick?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export function UserMenu({ stats, onAvatarClick, onNavigateTab }: UserMenuProps) {
  const { user, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
      >
        Đăng nhập
      </Link>
    );
  }

  const avatarUrl = stats?.avatar || (user as any)?.avatar;
  const initial = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="w-9 h-9 rounded-full ring-2 ring-indigo-500/30 hover:ring-indigo-500 overflow-hidden shrink-0 transition-all active:scale-95 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-blue-500 text-white text-xs font-black shadow-xs cursor-pointer"
        title={user.name || 'Tài khoản'}
        aria-label="Menu tài khoản"
        aria-expanded={dropdownOpen}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f46e5&color=fff`;
            }}
          />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {/* Account Dropdown Card */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl p-3 z-50 animate-fade-up space-y-3">
          {/* User Info Header */}
          <div className="px-2 py-1.5 border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-sm text-[var(--text-primary)] truncate" title={user.name}>
                {user.name}
              </div>
              <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5" title={user.email}>
              {user.email}
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-1">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onNavigateTab) onNavigateTab('admin');
                }}
                className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <IconShield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Khu vực Quản trị</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                if (onAvatarClick) onAvatarClick();
              }}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <IconUser className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span>Hồ sơ</span>
            </button>

            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2.5 transition-colors"
            >
              <span className="text-sm leading-none">⚙️</span>
              <span>Cài đặt</span>
            </Link>

            <div className="sm:hidden flex items-center justify-between px-2.5 py-1.5 pt-2 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)]">Giao diện</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Logout Section */}
          <div className="pt-2 border-t border-[var(--border)]">
            <LogoutButton
              showLabel={true}
              className="w-full justify-start bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}

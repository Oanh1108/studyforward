"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StudyForwardLogo } from '@/components/StudyForwardLogo';
import { ActiveTab } from '../types';

export interface SideTab {
  id: ActiveTab;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SideTabsProps {
  title: string;
  ariaLabel: string;
  tabs: SideTab[];
  activeTab: ActiveTab;
  /** 'side' renders a slide-out drawer opened from an edge toggle; 'top' is an underlined tab row. */
  variant?: 'top' | 'side';
}

const TOGGLE_POS_KEY = 'sf-side-toggle-top';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

/** Section navigation: a slide-out drawer (edge toggle) or an underlined tab row. */
export function SideTabs({ title, ariaLabel, tabs, activeTab, variant = 'side' }: SideTabsProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const side = variant === 'side';

  // The edge toggle can be dragged up and down (or moved with the arrow keys); the position is remembered.
  const [toggleTop, setToggleTop] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const clampTop = (y: number) => Math.min(Math.max(y, 72), window.innerHeight - 48 - 16);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TOGGLE_POS_KEY));
      if (saved) setToggleTop(clampTop(saved));
    } catch {}
  }, []);

  const saveTop = (y: number) => {
    setToggleTop(y);
    try {
      localStorage.setItem(TOGGLE_POS_KEY, String(Math.round(y)));
    } catch {}
  };

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!side) activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeTab, side]);

  // Navigating to another tab closes the drawer.
  useEffect(() => setOpen(false), [activeTab]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (side) {
    const ActiveIcon = (tabs.find((t) => t.id === activeTab) ?? tabs[0]).icon;
    return (
      <>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => {
            if (!drag.current?.moved) setOpen(true);
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const top = e.currentTarget.getBoundingClientRect().top;
            drag.current = { startY: e.clientY, startTop: top, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
            if (!d.moved && Math.abs(e.clientY - d.startY) < 5) return;
            d.moved = true;
            setToggleTop(clampTop(d.startTop + e.clientY - d.startY));
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (d?.moved) saveTop(clampTop(d.startTop + e.clientY - d.startY));
            // Let the click handler that follows see `moved`, then reset.
            setTimeout(() => { drag.current = null; }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const current = toggleTop ?? window.innerHeight / 2 - 24;
            saveTop(clampTop(current + (e.key === 'ArrowUp' ? -24 : 24)));
          }}
          aria-label={`Mở menu ${title}. Kéo hoặc dùng phím mũi tên lên xuống để đổi vị trí`}
          aria-expanded={open}
          style={toggleTop === null ? { top: '50%', transform: 'translateY(-50%)' } : { top: toggleTop }}
          className={`group fixed left-0 z-40 flex h-12 cursor-grab touch-none items-center gap-0.5 rounded-r-2xl active:cursor-grabbing border border-l-0 border-[var(--border)] bg-[var(--bg-card)] pl-2.5 pr-1.5 text-indigo-600 shadow-[var(--shadow-md)] transition-[padding,background-color] hover:pl-3.5 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/15 ${focusRing}`}
        >
          <ActiveIcon className="h-[18px] w-[18px]" />
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div
          data-open={open}
          onClick={close}
          aria-hidden="true"
          className="sf-backdrop fixed inset-0 z-50 bg-slate-900/45 opacity-0 invisible data-[open=true]:visible data-[open=true]:opacity-100"
        />

        <aside
          data-open={open}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          inert={!open}
          className="sf-drawer fixed left-0 top-0 z-50 flex max-h-dvh w-[min(88vw,320px)] -translate-x-full flex-col overflow-hidden rounded-r-[28px] border border-l-0 border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] invisible data-[open=true]:visible data-[open=true]:translate-x-0"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <StudyForwardLogo size="sm" />
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Đóng menu"
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label={ariaLabel} className="overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
            <div className="flex flex-col gap-1">
              {tabs.map(({ id, label, href, icon: Icon }) => {
                const active = id === activeTab;
                return (
                  <Link
                    key={id}
                    href={href}
                    onClick={() => active && close()}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${focusRing} ${
                      active
                        ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
      </>
    );
  }

  return (
    <nav aria-label={ariaLabel} className="mb-6 overflow-x-auto hide-scrollbar border-b border-[var(--border)]">
      <div className="flex min-w-max gap-1 sm:gap-3">
        {tabs.map(({ id, label, href, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              href={href}
              ref={active ? activeRef : undefined}
              aria-current={active ? 'page' : undefined}
              className={`relative -mb-px flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                active
                  ? 'border-indigo-600 font-semibold text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                  : 'border-transparent font-medium text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

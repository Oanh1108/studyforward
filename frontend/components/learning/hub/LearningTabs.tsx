"use client";

import React from 'react';
import { LayoutDashboard, Route, BookOpen, Headphones, Mic, MessagesSquare, FolderOpen, LayoutGrid, RotateCcw, StickyNote, ListChecks, Plane } from 'lucide-react';
import { ActiveTab } from '../types';
import { SideTab, SideTabs } from './SideTabs';

export const LEARNING_TABS: SideTab[] = [
  { id: 'overview', label: 'Tổng quan', href: '/learning', icon: LayoutDashboard },
  { id: 'paths', label: 'Lộ trình', href: '/paths', icon: Route },
  { id: 'courses', label: 'Khóa học', href: '/courses', icon: BookOpen },
  { id: 'dictation', label: 'Nghe chép', href: '/dictation', icon: Headphones },
  { id: 'speaking', label: 'Luyện nói', href: '/speaking', icon: Mic },
  { id: 'communication', label: 'Giao tiếp', href: '/communication', icon: MessagesSquare },
];

export const VOCABULARY_TABS: SideTab[] = [
  { id: 'vocabulary', label: 'Thư mục', href: '/vocabulary', icon: FolderOpen },
  { id: 'study_board', label: 'Bảng học từ', href: '/study-board', icon: LayoutGrid },
  { id: 'srs', label: 'Ôn tập ngắt quãng', href: '/vocabulary/srs', icon: RotateCcw },
];

export const TOOLS_TABS: SideTab[] = [
  { id: 'notes', label: 'Ghi chú', href: '/notes', icon: StickyNote },
  { id: 'todos', label: 'To-do', href: '/todos', icon: ListChecks },
  { id: 'focus', label: 'Chuyến bay', href: '/flights', icon: Plane },
];

/** Sidebar content for each section of the app, keyed by the group returned by getTabGroup. */
export const SECTION_NAV: Record<string, { title: string; ariaLabel: string; tabs: SideTab[] }> = {
  learning: { title: 'Học tập', ariaLabel: 'Điều hướng khu vực Học tập', tabs: LEARNING_TABS },
  vocabulary_hub: { title: 'Từ vựng', ariaLabel: 'Điều hướng khu vực Từ vựng', tabs: VOCABULARY_TABS },
  tools: { title: 'Công cụ', ariaLabel: 'Điều hướng khu vực Công cụ', tabs: TOOLS_TABS },
};

export function LearningTabs({ activeTab, variant = 'top' }: { activeTab: ActiveTab; variant?: 'top' | 'side' }) {
  const { title, ariaLabel, tabs } = SECTION_NAV.learning;
  return <SideTabs title={title} ariaLabel={ariaLabel} tabs={tabs} activeTab={activeTab} variant={variant} />;
}

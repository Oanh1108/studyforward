"use client";

import { ActiveTab, UserStats } from './types';
import { MobileBottomBar } from '@/components/navigation/MobileBottomBar';

export { AppHeader } from '@/components/navigation/AppHeader';
export { UserMenu } from '@/components/navigation/UserMenu';
export { MobileBottomBar } from '@/components/navigation/MobileBottomBar';

export interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  stats?: UserStats;
  onQuickStart?: () => void;
}

export const getTabGroup = (tab: ActiveTab | string) => {
  if (['overview', 'paths', 'courses', 'dictation', 'speaking', 'communication'].includes(tab)) return 'learning';
  if (['vocabulary', 'study_board', 'srs', 'vocabulary_study'].includes(tab)) return 'vocabulary_hub';
  if (['notes', 'todos', 'focus'].includes(tab)) return 'tools';
  return tab;
};

/**
 * Legacy Navigation adapter:
 * Desktop sidebar is now replaced by AppHeader at the top.
 * On mobile (< 768px), this renders the mobile bottom navigation bar.
 */
export function Navigation({ activeTab, onSelectTab }: NavigationProps) {
  return <MobileBottomBar activeTab={activeTab} onSelectTab={onSelectTab} />;
}

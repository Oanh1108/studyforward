import React from 'react';
import { PlacementTestView } from '@/components/learning/placement-test/PlacementTestView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import Link from 'next/link';

import { StudyForwardLogo } from '@/components/StudyForwardLogo';

export default function PlacementTestPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans transition-colors duration-300">
      <header className="flex items-center justify-between p-4 md:px-8 border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <StudyForwardLogo />
          <div className="hidden md:flex items-center gap-1 text-sm font-semibold ml-4">
            <Link href="/courses" className="px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all">Khóa học</Link>
            <Link href="/vocabulary" className="px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all">Từ vựng</Link>
            <Link href="/placement-test" className="px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 transition-all">Kiểm tra đầu vào</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <PlacementTestView />
      </main>
    </div>
  );
}

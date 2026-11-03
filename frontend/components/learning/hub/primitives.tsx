"use client";

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[var(--bg-muted)] ${className}`} />;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]"
    >
      <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/** Compact empty state (max 520px) used across the Learning area. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{children}</h2>;
}

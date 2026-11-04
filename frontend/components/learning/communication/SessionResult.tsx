"use client";

import React from 'react';
import { ArrowRight, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import type { SessionResult as Result } from '@/lib/communicationApi';

const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
    <h2 className="mb-3 text-sm font-bold text-[var(--text-primary)]">{title}</h2>
    {children}
  </section>
);

export function SessionResult({ result, onNew }: { result: Result; onNew: () => void }) {
  const s = result.summary;
  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fade-up">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h1 className="mt-3 text-xl font-extrabold text-[var(--text-primary)]">Buổi luyện giao tiếp hoàn thành!</h1>
        {s?.encouragement && <p className="mt-1 text-sm text-[var(--text-secondary)]">{s.encouragement}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--bg-subtle)] p-4">
            <Clock className="mx-auto h-5 w-5 text-violet-500" />
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{fmt(result.durationSeconds)}</p>
            <p className="text-xs text-[var(--text-muted)]">Thời gian hội thoại</p>
          </div>
          <div className="rounded-2xl bg-[var(--bg-subtle)] p-4">
            <MessageSquare className="mx-auto h-5 w-5 text-violet-500" />
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{result.userTurns}</p>
            <p className="text-xs text-[var(--text-muted)]">Lượt trả lời của bạn</p>
          </div>
        </div>
      </div>

      {result.userTurns === 0 && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center text-sm text-[var(--text-secondary)]">Bạn chưa trả lời lượt nào nên chưa có nhận xét. Hãy thử một phiên mới nhé!</p>
      )}
      {result.summaryError && (
        <p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Chưa tạo được phần nhận xét của AI lúc này ({result.summaryError}). Thống kê ở trên vẫn chính xác.
        </p>
      )}

      {s && s.commonMistakes.length > 0 && (
        <Card title="Lỗi thường gặp">
          <ul className="space-y-3">
            {s.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm">
                <p className="text-rose-600 line-through dark:text-rose-300">{m.original}</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">{m.corrected}</p>
                {m.note && <p className="text-xs text-[var(--text-secondary)]">{m.note}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {s && s.betterExpressions.length > 0 && (
        <Card title="Cách diễn đạt hay hơn">
          <ul className="space-y-3">
            {s.betterExpressions.map((m, i) => (
              <li key={i} className="text-sm">
                <p className="text-[var(--text-secondary)]">{m.original}</p>
                <p className="font-semibold text-violet-700 dark:text-violet-300">→ {m.better}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {s && s.newVocabulary.length > 0 && (
        <Card title="Từ vựng mới">
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.newVocabulary.map((v, i) => (
              <li key={i} className="rounded-xl bg-[var(--bg-subtle)] px-3 py-2 text-sm">
                <span className="font-semibold text-[var(--text-primary)]">{v.term}</span>
                <span className="text-[var(--text-secondary)]"> — {v.meaning}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {s && s.nextSteps.length > 0 && (
        <Card title="Gợi ý cải thiện tiếp theo">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
            {s.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Card>
      )}

      <div className="text-center">
        <button onClick={onNew} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-700">
          Luyện phiên mới <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

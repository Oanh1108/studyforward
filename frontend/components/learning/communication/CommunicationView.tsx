"use client";

import React, { useState } from 'react';
import {
  ArrowLeft, Coffee, Plane, Hotel, Briefcase, ShoppingBag, Hand, UtensilsCrossed, MapPin, Play, Mic, Send, Volume2, Info,
} from 'lucide-react';
import { EmptyState, SectionTitle } from '../hub/primitives';

/**
 * Scenario catalogue (static content, not user data).
 * Level / duration / skills are intentionally omitted until a backend supplies them.
 *
 * UI READY:        scenario picker, session shell, composer (voice + text).
 * BACKEND REQUIRED: conversation engine (AI replies, TTS audio, answer feedback,
 *                   scoring, XP, session persistence). None exists yet, so the
 *                   session shell disables sending instead of faking responses.
 */
const SCENARIOS = [
  { id: 'coffee-shop', icon: Coffee, tag: 'At a coffee shop', title: 'Quán cà phê', desc: 'Luyện cách gọi đồ uống và giao tiếp với nhân viên.' },
  { id: 'airport', icon: Plane, tag: 'At the airport', title: 'Sân bay', desc: 'Làm thủ tục check-in và hỏi thông tin chuyến bay.' },
  { id: 'hotel', icon: Hotel, tag: 'At a hotel', title: 'Khách sạn', desc: 'Nhận phòng, hỏi tiện nghi và yêu cầu hỗ trợ.' },
  { id: 'interview', icon: Briefcase, tag: 'Job interview', title: 'Phỏng vấn', desc: 'Giới thiệu bản thân và trả lời câu hỏi phỏng vấn.' },
  { id: 'shopping', icon: ShoppingBag, tag: 'Shopping', title: 'Mua sắm', desc: 'Hỏi giá, size và thanh toán khi mua hàng.' },
  { id: 'meeting', icon: Hand, tag: 'Meeting someone new', title: 'Làm quen', desc: 'Chào hỏi và bắt chuyện với người mới gặp.' },
  { id: 'restaurant', icon: UtensilsCrossed, tag: 'At a restaurant', title: 'Nhà hàng', desc: 'Gọi món, hỏi thực đơn và yêu cầu thanh toán.' },
  { id: 'directions', icon: MapPin, tag: 'Asking for directions', title: 'Hỏi đường', desc: 'Hỏi và hiểu chỉ dẫn đường đi.' },
] as const;

type Scenario = (typeof SCENARIOS)[number];

export function CommunicationView() {
  const [active, setActive] = useState<Scenario | null>(null);

  if (active) return <ConversationSession scenario={active} onBack={() => setActive(null)} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Luyện giao tiếp</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Tự tin nói tiếng Anh qua các tình huống thực tế.</p>
      </header>

      <section aria-label="Chọn tình huống">
        <SectionTitle>Chọn tình huống</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s)}
                className="group flex min-h-[200px] flex-col rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s.tag}</span>
                <span className="mt-1 text-base font-bold text-[var(--text-primary)]">{s.title}</span>
                <span className="mt-1 text-sm text-[var(--text-secondary)]">{s.desc}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-violet-600 dark:text-violet-300">
                  <Play className="h-4 w-4" /> Bắt đầu
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ConversationSession({ scenario, onBack }: { scenario: Scenario; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const Icon = scenario.icon;

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col animate-fade-up">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Quay lại danh sách tình huống"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-violet-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-[var(--text-primary)]">{scenario.tag}</h1>
          <p className="truncate text-xs text-[var(--text-muted)]">{scenario.title}</p>
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-6">
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<Info className="h-5 w-5" />}
              title="Hội thoại AI chưa khả dụng"
              description="Tính năng hội thoại cần dịch vụ AI ở phía máy chủ và chưa được kích hoạt. Giao diện đã sẵn sàng, bạn sẽ có thể luyện tập ngay khi dịch vụ được bật."
              action={
                <button onClick={onBack} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text-primary)] hover:border-violet-400">
                  Chọn tình huống khác
                </button>
              }
            />
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4"
            aria-label="Nhập câu trả lời"
          >
            <button type="button" disabled aria-label="Ghi âm câu trả lời (chưa khả dụng)" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-50">
              <Mic className="h-5 w-5" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled
              aria-label="Câu trả lời của bạn"
              placeholder="Nhập câu trả lời..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-sm text-[var(--text-primary)] disabled:opacity-60"
            />
            <button type="submit" disabled aria-label="Gửi câu trả lời" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-40">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        <aside className="hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:block" aria-label="Thông tin phiên">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Thông tin phiên</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Chủ đề</dt>
              <dd className="font-medium text-[var(--text-primary)]">{scenario.tag}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Volume2 className="h-4 w-4" /> Cụm từ gợi ý và từ vựng sẽ hiển thị ở đây khi có dịch vụ hội thoại.
          </p>
        </aside>
      </div>
    </div>
  );
}

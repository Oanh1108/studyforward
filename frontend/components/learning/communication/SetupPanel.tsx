"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, MessageCircle, Mic, RefreshCw, Theater, Zap } from 'lucide-react';
import {
  communicationApi, friendlyError, type CommunicationStatus, type ConvLevel, type ConvMessage, type ConvMode,
  type ConvSession, type CorrectionMode, type SessionListItem,
} from '@/lib/communicationApi';

const MODES: { id: ConvMode; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'free', title: 'Trò chuyện tự do', desc: 'Chat thoải mái về một chủ đề, AI chủ động đặt câu hỏi.', icon: MessageCircle },
  { id: 'roleplay', title: 'Nhập vai', desc: 'AI đóng một nhân vật trong tình huống đời thực.', icon: Theater },
  { id: 'daily', title: 'Luyện phản xạ', desc: 'Câu hỏi nối tiếp theo đúng câu bạn vừa trả lời.', icon: Zap },
];

export const LEVEL_INFO: Record<ConvLevel, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper Intermediate', C1: 'Advanced',
};

const CORRECTIONS: { id: CorrectionMode; title: string; desc: string }[] = [
  { id: 'gentle', title: 'Sửa nhẹ nhàng', desc: 'Chỉ sửa lỗi quan trọng' },
  { id: 'detailed', title: 'Sửa chi tiết', desc: 'Giải thích ngữ pháp và từ vựng' },
  { id: 'none', title: 'Không sửa', desc: 'Chỉ tập trung trò chuyện' },
];

export const topicLabel = (status: CommunicationStatus | null, mode: ConvMode, topic: string) => {
  const list = mode === 'roleplay' ? status?.scenarios : status?.topics;
  return list?.find((t) => t.id === topic)?.label ?? topic;
};

interface Props {
  onStart: (session: ConvSession, messages: ConvMessage[], status: CommunicationStatus) => void;
}

const chip = (active: boolean) =>
  `min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${
    active
      ? 'border-violet-500 bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-violet-300'
  }`;

export function SetupPanel({ onStart }: Props) {
  const [status, setStatus] = useState<CommunicationStatus | null>(null);
  const [recent, setRecent] = useState<SessionListItem | null>(null);
  const [loadError, setLoadError] = useState<ReturnType<typeof friendlyError> | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<ConvMode>('free');
  const [topic, setTopic] = useState<string>('daily-life');
  const [level, setLevel] = useState<ConvLevel>('A2');
  const [correction, setCorrection] = useState<CorrectionMode>('gentle');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<ReturnType<typeof friendlyError> | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [st, list] = await Promise.all([communicationApi.status(), communicationApi.listSessions().catch(() => [])]);
        if (!alive) return;
        setStatus(st);
        setRecent(list.find((x) => x.status === 'active') ?? null);
      } catch (e) {
        if (alive) setLoadError(friendlyError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [reloadKey]);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  // Switching mode swaps the topic list, so pick a valid default for it.
  const chooseMode = (m: ConvMode) => {
    setMode(m);
    setTopic(m === 'roleplay' ? 'coffee-shop' : 'daily-life');
  };

  const start = async () => {
    if (starting || !status) return;
    setStarting(true);
    setStartError(null);
    try {
      const { session, messages } = await communicationApi.createSession({ mode, topic, level, correctionMode: correction });
      onStart(session, messages, status);
    } catch (e) {
      setStartError(friendlyError(e));
    } finally {
      setStarting(false);
    }
  };

  const resume = async () => {
    if (!recent || !status || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const { session, messages } = await communicationApi.getSession(recent.id);
      onStart(session, messages, status);
    } catch (e) {
      setStartError(friendlyError(e));
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--text-secondary)]" role="status">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  if (loadError || !status) {
    return (
      <div className="mx-auto max-w-[520px] rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-3 text-sm text-[var(--text-primary)]">{loadError?.text ?? 'Không tải được dữ liệu.'}</p>
        {loadError?.retryable !== false && (
          <button onClick={load} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        )}
      </div>
    );
  }

  const topics = mode === 'roleplay' ? status.scenarios : status.topics;

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Luyện giao tiếp với AI</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Trò chuyện bằng tiếng Anh với giáo viên AI qua văn bản hoặc giọng nói.</p>
      </header>

      {!status.aiConfigured && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Dịch vụ AI chưa được cấu hình trên máy chủ</p>
            <p className="mt-1">Dành cho quản trị viên: hãy thiết lập biến môi trường <code className="rounded bg-black/10 px-1">GEMINI_API_KEY</code> cho backend rồi khởi động lại. Khi đó bạn có thể bắt đầu luyện tập.</p>
          </div>
        </div>
      )}

      {recent && (
        <button
          onClick={resume}
          disabled={starting}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-left hover:border-violet-500 disabled:opacity-60 dark:border-violet-500/40 dark:bg-violet-500/10"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold text-violet-800 dark:text-violet-200">Tiếp tục phiên đang dở</span>
            <span className="block truncate text-xs text-violet-700/80 dark:text-violet-300/80">
              {topicLabel(status, recent.mode, recent.topic)} · {recent.level} · {new Date(recent.startedAt).toLocaleString('vi-VN')}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 flex-shrink-0 text-violet-600" />
        </button>
      )}

      <section aria-label="Chế độ hội thoại">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">1. Chế độ</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map(({ id, title, desc, icon: Icon }) => (
            <button key={id} onClick={() => chooseMode(id)} aria-pressed={mode === id} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${mode === id ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-violet-300'}`}>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"><Icon className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-bold text-[var(--text-primary)]">{title}</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label={mode === 'roleplay' ? 'Tình huống' : 'Chủ đề'}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">2. {mode === 'roleplay' ? 'Tình huống' : 'Chủ đề'}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {topics.map((t) => (
            <button key={t.id} onClick={() => setTopic(t.id)} aria-pressed={topic === t.id} className={chip(topic === t.id)}>
              <span className="block leading-tight">{t.label}</span>
              <span className="block text-xs font-normal text-[var(--text-muted)]">{t.labelVi}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Trình độ">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">3. Trình độ</h2>
          <div className="grid grid-cols-5 gap-2">
            {status.levels.map((l) => (
              <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l} title={LEVEL_INFO[l]} className={`${chip(level === l)} text-center`}>
                <span className="block font-bold">{l}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{level} – {LEVEL_INFO[level]}</p>
        </section>

        <section aria-label="Cách sửa lỗi">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">4. Cách sửa lỗi</h2>
          <div className="grid grid-cols-3 gap-2">
            {CORRECTIONS.map((c) => (
              <button key={c.id} onClick={() => setCorrection(c.id)} aria-pressed={correction === c.id} className={chip(correction === c.id)}>
                <span className="block text-xs font-bold leading-tight">{c.title}</span>
                <span className="mt-0.5 hidden text-[11px] font-normal text-[var(--text-muted)] sm:block">{c.desc}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {startError && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {startError.adminProblem && <strong className="mr-1">Dành cho quản trị viên:</strong>}
          {startError.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={start}
          disabled={starting || !status.aiConfigured}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white shadow-md hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          {starting ? 'AI đang chuẩn bị...' : 'Bắt đầu trò chuyện'}
        </button>
        <span className="text-xs text-[var(--text-muted)]">Bạn có thể gõ hoặc bấm micro để nói.</span>
      </div>
    </div>
  );
}

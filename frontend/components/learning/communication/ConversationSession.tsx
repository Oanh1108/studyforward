"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, BookOpen, Flag, Lightbulb, Loader2, Mic, Quote, RefreshCw, Send, Square, Volume2, VolumeX, X,
} from 'lucide-react';
import {
  communicationApi, friendlyError, type CommunicationStatus, type ConvMessage, type ConvSession, type SessionResult, type VocabItem,
} from '@/lib/communicationApi';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useVoiceInput } from './useVoiceInput';
import { LEVEL_INFO, topicLabel } from './SetupPanel';

type LocalMessage = ConvMessage & { pending?: boolean };
interface FailedSend { tmpId: string; content: string; inputType: 'text' | 'voice'; text: string; retryable: boolean }

const TIPS: Record<string, string[]> = {
  A1: ['Trả lời bằng cả câu ngắn: "I like coffee."', 'Không biết nói gì? Bấm một câu gợi ý.', 'Nghe lại câu của AI nhiều lần để quen phát âm.'],
  A2: ['Thử thêm lý do: "I like it because ..."', 'Đừng sợ sai, AI sẽ gợi ý cách nói tự nhiên hơn.'],
  B1: ['Trả lời 2–3 câu để cuộc trò chuyện trôi chảy hơn.', 'Dùng từ nối: because, however, for example.'],
  B2: ['Giải thích quan điểm và đưa ví dụ cụ thể.', 'Thử dùng collocations thay cho từ đơn lẻ.'],
  C1: ['Chú ý sắc thái và độ tự nhiên của cách diễn đạt.', 'Thử phản biện hoặc nêu quan điểm ngược lại.'],
};

const pref = (key: string, fallback: boolean) => {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
};
const setPref = (key: string, v: boolean) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* ignore */ } };

const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

interface Props {
  session: ConvSession;
  initialMessages: ConvMessage[];
  status: CommunicationStatus;
  onExit: () => void;
  onComplete: (r: SessionResult) => void;
}

export function ConversationSession({ session, initialMessages, status, onExit, onComplete }: Props) {
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState<FailedSend | null>(null);
  const [draft, setDraft] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(() => pref('sf-comm-autospeak', true));
  const [autoSend, setAutoSend] = useState(() => pref('sf-comm-autosend', true));

  const sendingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const spokenRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));
  const tmpCounter = useRef(0);

  const tts = useSpeechSynthesis(session.level);

  // Keep the composer as tall as its content (and shrink back after sending).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking, failed]);

  // Read the opening message once (a user gesture, the Start button, has already happened).
  const openingSpoken = useRef(false);
  useEffect(() => {
    if (openingSpoken.current || !tts.supported || initialMessages.length !== 1 || initialMessages[0].role !== 'assistant') return;
    openingSpoken.current = true;
    if (autoSpeak) tts.speak(initialMessages[0].id, initialMessages[0].content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.supported]);

  const send = useCallback(async (raw: string, inputType: 'text' | 'voice', retryOf?: string) => {
    const content = raw.trim();
    if (!content || sendingRef.current) return; // blocks double submits (Enter twice, mic + button)
    sendingRef.current = true;
    tts.stop();
    setFailed(null);
    setThinking(true);
    const tmpId = retryOf ?? `tmp-${++tmpCounter.current}`;
    setMessages((m) => (retryOf ? m : [...m, { id: tmpId, role: 'user', content, inputType, meta: null, createdAt: new Date().toISOString(), feedback: null, pending: true }]));
    try {
      const { userMessage, assistantMessage } = await communicationApi.sendMessage(session.id, content, inputType);
      setMessages((m) => [...m.map((x) => (x.id === tmpId ? userMessage : x)), assistantMessage]);
      if (autoSpeak && tts.supported) {
        spokenRef.current.add(assistantMessage.id);
        tts.speak(assistantMessage.id, assistantMessage.content);
      }
    } catch (e) {
      const f = friendlyError(e);
      setFailed({ tmpId, content, inputType, text: f.text, retryable: f.retryable });
    } finally {
      setThinking(false);
      sendingRef.current = false;
    }
  }, [session.id, autoSpeak, tts]);

  const voice = useVoiceInput({
    transcribeOnServer: async (b64, mime) => (await communicationApi.transcribe(session.id, b64, mime)).transcript,
    onTranscript: (text) => {
      if (autoSend) void send(text, 'voice');
      else setDraft((d) => (d ? `${d} ${text}` : text));
    },
  });

  const submitDraft = () => {
    if (!draft.trim() || thinking) return;
    const text = draft;
    setDraft('');
    void send(text, 'text');
  };

  const toggleMic = () => {
    if (voice.state === 'listening') voice.stop();
    else if (voice.state === 'idle' && !thinking) { tts.stop(); voice.start(); }
  };

  const finish = async () => {
    if (completing) return;
    tts.stop();
    voice.cancel();
    setCompleting(true);
    setCompleteError(null);
    try {
      onComplete(await communicationApi.complete(session.id));
    } catch (e) {
      setCompleteError(friendlyError(e).text);
      setCompleting(false);
    }
  };

  // Sidebar knowledge, gathered from the real conversation (deduplicated by term).
  const { vocab, phrases } = useMemo(() => {
    const v = new Map<string, VocabItem>();
    const p = new Set<string>();
    for (const m of messages) {
      m.meta?.vocabulary?.forEach((x) => v.set(x.term.toLowerCase(), x));
      m.feedback?.vocabulary.forEach((x) => v.set(x.term.toLowerCase(), x));
      m.meta?.phrases?.forEach((x) => p.add(x));
    }
    return { vocab: [...v.values()].reverse(), phrases: [...p].reverse() };
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const suggestions = !thinking && !failed && lastMessage?.role === 'assistant' ? lastMessage.meta?.suggestions ?? [] : [];
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const stateLabel = thinking ? 'AI đang suy nghĩ...' : tts.speakingId ? 'AI đang nói...' : voice.state === 'listening' ? 'Đang nghe bạn nói...' : voice.state === 'processing' ? 'Đang nhận diện giọng nói...' : 'Sẵn sàng';
  const label = topicLabel(status, session.mode, session.topic);

  const sidebar = (
    <div className="space-y-5 text-sm">
      <dl className="space-y-2">
        <div className="flex justify-between gap-2"><dt className="text-[var(--text-muted)]">Chủ đề</dt><dd className="text-right font-semibold text-[var(--text-primary)]">{label}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-[var(--text-muted)]">Trình độ</dt><dd className="font-semibold text-[var(--text-primary)]">{session.level} · {LEVEL_INFO[session.level]}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-[var(--text-muted)]">Số lượt</dt><dd className="font-semibold text-[var(--text-primary)]">{userTurns}</dd></div>
      </dl>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"><BookOpen className="h-3.5 w-3.5" /> Từ vựng hữu ích</h3>
        {vocab.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Từ vựng sẽ xuất hiện khi bạn trò chuyện.</p> : (
          <ul className="space-y-1.5">{vocab.slice(0, 12).map((v) => (
            <li key={v.term} className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1.5"><span className="font-semibold text-[var(--text-primary)]">{v.term}</span><span className="text-[var(--text-secondary)]"> — {v.meaning}</span></li>
          ))}</ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"><Quote className="h-3.5 w-3.5" /> Mẫu câu gợi ý</h3>
        {phrases.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Chưa có mẫu câu.</p> : (
          <ul className="space-y-1.5">{phrases.slice(0, 8).map((p) => (
            <li key={p}><button onClick={() => { setDraft(p); setDrawer(false); }} className="w-full rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:border-violet-400">{p}</button></li>
          ))}</ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"><Lightbulb className="h-3.5 w-3.5" /> Mẹo học</h3>
        <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">{(TIPS[session.level] ?? []).map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <section className="space-y-2 border-t border-[var(--border)] pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Giọng nói</h3>
        <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">AI tự đọc câu trả lời
          <input type="checkbox" checked={autoSpeak} onChange={(e) => { setAutoSpeak(e.target.checked); setPref('sf-comm-autospeak', e.target.checked); if (!e.target.checked) tts.stop(); }} className="h-4 w-4" />
        </label>
        <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">Tự gửi khi nói xong
          <input type="checkbox" checked={autoSend} onChange={(e) => { setAutoSend(e.target.checked); setPref('sf-comm-autosend', e.target.checked); }} className="h-4 w-4" />
        </label>
        {tts.voices.length > 1 && (
          <label className="block text-xs text-[var(--text-secondary)]">Giọng đọc
            <select value={tts.voiceName ?? ''} onChange={(e) => tts.chooseVoice(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-2 text-[var(--text-primary)]">
              <option value="">Mặc định</option>
              {tts.voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
        )}
        {!tts.supported && <p className="text-xs text-amber-600">Trình duyệt này không hỗ trợ đọc giọng nói.</p>}
      </section>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] flex-col animate-fade-up">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 sm:gap-3">
        <button onClick={onExit} aria-label="Thoát (có thể tiếp tục sau)" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-violet-400">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-[var(--text-primary)]">{label}</h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-[var(--text-muted)]" role="status" aria-live="polite">
            <span className={`inline-block h-2 w-2 rounded-full ${thinking || tts.speakingId || voice.state !== 'idle' ? 'animate-pulse bg-violet-500' : 'bg-emerald-500'}`} />
            {session.level} · {stateLabel}
          </p>
        </div>
        <button onClick={() => setDrawer(true)} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-violet-400 lg:hidden">
          <Lightbulb className="h-4 w-4" /> Gợi ý
        </button>
        <button onClick={finish} disabled={completing} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60 sm:px-4">
          {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          <span className="hidden sm:inline">Kết thúc</span>
        </button>
      </div>
      {completeError && <p role="alert" className="mb-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{completeError}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* Conversation */}
        <div className="flex min-h-0 min-w-0 flex-col rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-5" role="log" aria-label="Hội thoại">
            {messages.map((m) => (
              <Bubble key={m.id} m={m} speaking={tts.speakingId === m.id} ttsSupported={tts.supported}
                onSpeak={() => (tts.speakingId === m.id ? tts.stop() : tts.speak(m.id, m.content))} />
            ))}
            {failed && (
              <div role="alert" className="ml-auto flex max-w-[90%] items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p>{failed.text}</p>
                  {failed.retryable && (
                    <button onClick={() => void send(failed.content, failed.inputType, failed.tmpId)} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700">
                      <RefreshCw className="h-3.5 w-3.5" /> Gửi lại
                    </button>
                  )}
                </div>
              </div>
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]" role="status">
                <span className="flex gap-1" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
                AI đang suy nghĩ...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="border-t border-[var(--border)] px-3 py-2 sm:px-5">
              <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">Bạn có thể nói:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => void send(s, 'text')} className="min-h-9 rounded-full border border-violet-300 bg-violet-50 px-3 text-left text-sm text-violet-800 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200">{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Voice status */}
          {voice.error && (
            <div role="alert" className="mx-3 mb-2 flex items-start justify-between gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 sm:mx-5">
              <span>{voice.error}</span>
              <button onClick={voice.clearError} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button>
            </div>
          )}
          {voice.state !== 'idle' && (
            <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-violet-50 p-2.5 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-200 sm:mx-5" role="status">
              {voice.state === 'listening' ? (
                <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
                  {[0.5, 0.8, 1, 0.8, 0.5].map((w, i) => <span key={i} className="w-1 rounded bg-violet-500 transition-[height] duration-75" style={{ height: `${Math.max(4, Math.round((voice.level || 0) * 20 * w))}px` }} />)}
                </span>
              ) : <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="min-w-0 flex-1 truncate">{voice.state === 'processing' ? 'Đang nhận diện giọng nói...' : voice.interim || 'Đang nghe... hãy nói tiếng Anh'}</span>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={(e) => { e.preventDefault(); submitDraft(); }} className="flex items-end gap-2 border-t border-[var(--border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4" aria-label="Nhập câu trả lời">
            <button type="button" onClick={toggleMic} disabled={!voice.supported || thinking || voice.state === 'processing'}
              aria-label={voice.state === 'listening' ? 'Dừng ghi âm' : 'Nói bằng micro'} aria-pressed={voice.state === 'listening'}
              title={voice.supported ? undefined : 'Trình duyệt này chưa hỗ trợ micro'}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${voice.state === 'listening' ? 'border-rose-500 bg-rose-500 text-white' : 'border-[var(--border)] text-violet-600 hover:border-violet-400'}`}>
              {voice.state === 'listening' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
            </button>
            <textarea
              value={draft} rows={1} maxLength={1000} disabled={completing}
              ref={inputRef}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submitDraft(); } }}
              aria-label="Câu trả lời của bạn" placeholder="Type your message..."
              className="max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2.5 text-base text-[var(--text-primary)] focus:border-violet-500 focus:outline-none sm:text-sm"
            />
            <button type="submit" disabled={!draft.trim() || thinking || completing} aria-label="Gửi"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
              {thinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>

        {/* Sidebar (desktop) */}
        <aside className="hidden min-h-0 overflow-y-auto rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:block" aria-label="Thông tin phiên">{sidebar}</aside>
      </div>

      {/* Sidebar drawer (mobile / tablet) */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Gợi ý và từ vựng">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[24px] bg-[var(--bg-card)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Gợi ý & từ vựng</h2>
              <button onClick={() => setDrawer(false)} aria-label="Đóng" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[var(--bg-subtle)]"><X className="h-5 w-5" /></button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ m, speaking, ttsSupported, onSpeak }: { m: LocalMessage; speaking: boolean; ttsSupported: boolean; onSpeak: () => void }) {
  if (m.role === 'assistant') {
    return (
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" aria-hidden="true">AI</span>
        <div className="min-w-0 max-w-[88%]">
          <div className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-tl-md bg-[var(--bg-subtle)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--text-primary)]">{m.content}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            {ttsSupported && (
              <button onClick={onSpeak} aria-label={speaking ? 'Dừng đọc' : 'Nghe lại'} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10">
                {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{speaking ? 'Dừng' : 'Nghe lại'}
              </button>
            )}
            <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col items-end">
      <div className={`max-w-[88%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-tr-md bg-violet-600 px-4 py-2.5 text-[15px] leading-relaxed text-white ${m.pending ? 'opacity-70' : ''}`}>{m.content}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
        {m.inputType === 'voice' && <Mic className="h-3 w-3" aria-label="Nhập bằng giọng nói" />}
        <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
      </div>
      {m.feedback && (
        <div className="mt-2 w-full max-w-[88%] rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Cách nói tự nhiên hơn</p>
          <p className="mt-0.5 [overflow-wrap:anywhere] font-semibold text-[var(--text-primary)]">{m.feedback.corrected}</p>
          {m.feedback.explanation && <p className="mt-1 text-xs text-[var(--text-secondary)]">{m.feedback.explanation}</p>}
          {m.feedback.vocabulary.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-[var(--text-secondary)]">
              {m.feedback.vocabulary.map((v) => <li key={v.term}><span className="font-semibold text-[var(--text-primary)]">{v.term}</span> = {v.meaning}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

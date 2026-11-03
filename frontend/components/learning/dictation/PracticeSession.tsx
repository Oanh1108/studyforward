"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';
import { compareWords, type WordComparison } from '@/lib/speechAudio';

import type { PracticeSegment, PracticeSpec, SegmentOutcome } from './types';
import { PracticeSummary } from './PracticeSummary';
import { useSegmentPlayer } from './useSegmentPlayer';
import { translateToVietnamese } from '@/lib/dictation/translate';

interface PracticeSessionProps {
  spec: PracticeSpec;
  onExit: () => void;
  /** Called once when the last sentence has been checked, with the outcome of every sentence in this run. */
  onComplete?: (outcomes: SegmentOutcome[], spec: PracticeSpec) => void;
}

const SPEEDS = [0.5, 0.75, 1];
const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

const tagLabel = (tag?: string) => (tag === 'Q' ? 'Câu hỏi' : tag ? `Lựa chọn ${tag}` : null);
const speakerLabel = (speaker?: string) => {
  if (!speaker) return null;
  const n = speaker.slice(1);
  return `${speaker[0] === 'M' ? 'Nam' : 'Nữ'}${n ? ` ${n}` : ''}`;
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{children}</span>;
}

function ResultView({
  result,
  translation,
  onRetryTranslation,
}: {
  result: WordComparison;
  /** undefined while loading, null when it failed */
  translation: string | null | undefined;
  onRetryTranslation: () => void;
}) {
  const perfect = result.score === 100 && result.extra.length === 0;
  return (
    <div role="status" className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-4 animate-fade-up">
      <p className={`flex items-center gap-2 text-sm font-bold ${perfect ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'}`}>
        {perfect ? <Check className="h-4 w-4" /> : null}
        {perfect ? 'Chính xác hoàn toàn!' : `Bạn nghe đúng ${result.score}% số từ`}
      </p>

      <p className="flex flex-wrap gap-1.5 text-lg leading-relaxed">
        {result.words.map((word, i) => (
          <span
            key={i}
            className={`rounded-lg px-1.5 ${
              word.status === 'wrong'
                ? 'bg-rose-100 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                : word.status === 'correct'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-[var(--text-muted)]'
            }`}
          >
            {word.text}
            {word.status === 'wrong' && <span className="sr-only"> (chưa đúng)</span>}
          </span>
        ))}
      </p>

      {result.extra.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Từ bạn gõ thừa hoặc sai:{' '}
          {result.extra.map((w, i) => (
            <span key={i} className="mr-1.5 inline-block rounded-md bg-amber-100 px-1.5 font-medium text-amber-800 line-through dark:bg-amber-500/15 dark:text-amber-300">
              {w}
            </span>
          ))}
        </p>
      )}

      <div className="space-y-1 border-t border-[var(--border)] pt-3">
        <p className="text-xs font-semibold text-[var(--text-muted)]">Nghĩa tiếng Việt</p>
        {translation === undefined ? (
          <p role="status" className="text-sm text-[var(--text-muted)]">Đang dịch...</p>
        ) : translation === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Chưa dịch được.{' '}
            <button type="button" onClick={onRetryTranslation} className="font-semibold text-[var(--brand-text)] hover:underline">
              Thử lại
            </button>
          </p>
        ) : (
          <p className="text-base text-[var(--text-primary)]">{translation}</p>
        )}
      </div>
    </div>
  );
}

export function PracticeSession({ spec, onExit, onComplete }: PracticeSessionProps) {
  const [queue, setQueue] = useState<PracticeSegment[]>(spec.segments);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<WordComparison | null>(null);
  const [outcomes, setOutcomes] = useState<SegmentOutcome[]>([]);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { play, stop, seek, isPlaying, notice, progress, duration, volume, setVolume } = useSegmentPlayer();
  const [speedOpen, setSpeedOpen] = useState(false);
  // Vietnamese meaning of each checked sentence; a missing entry means loading, null means it failed.
  const [translations, setTranslations] = useState<Record<string, string | null>>({});
  const [retryTick, setRetryTick] = useState(0);

  const segment = queue[index];
  const playSegment = () => segment && play({ text: segment.text, clip: segment.clip, audioSrc: spec.audioSrc, rate: speed });

  // Play each sentence as soon as it comes up, and put the cursor in the answer box.
  useEffect(() => {
    if (finished || !segment) return;
    const timer = setTimeout(() => {
      play({ text: segment.text, clip: segment.clip, audioSrc: spec.audioSrc, rate: speed });
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
    // Only when the sentence changes: changing speed should not restart playback by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment?.id, finished]);

  const check = () => {
    if (!segment || result || !input.trim()) return;
    stop();
    const compared = compareWords(segment.text, input);
    const score = compared.extra.length > 0 && compared.score === 100 ? 99 : compared.score;
    setResult(compared);
    setOutcomes((prev) => [...prev.filter((o) => o.segmentId !== segment.id), { segmentId: segment.id, score }]);
  };

  useEffect(() => {
    if (!result || !segment || segment.translation) return;
    const id = segment.id;
    let cancelled = false;
    translateToVietnamese(segment.text).then(
      (text) => !cancelled && setTranslations((prev) => ({ ...prev, [id]: text })),
      () => !cancelled && setTranslations((prev) => ({ ...prev, [id]: null })),
    );
    return () => {
      cancelled = true;
    };
    // Only when a sentence gets checked (or the user retries), not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, segment?.id, retryTick]);

  const retryTranslation = () => {
    if (!segment) return;
    const id = segment.id;
    setTranslations((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
    setRetryTick((t) => t + 1);
  };

  const next = () => {
    if (!result) return;
    if (index < queue.length - 1) {
      setIndex(index + 1);
      setInput('');
      setResult(null);
    } else {
      stop();
      setFinished(true);
      onComplete?.(outcomes, spec);
    }
  };

  const restart = (segments: PracticeSegment[]) => {
    setQueue(segments);
    setIndex(0);
    setInput('');
    setResult(null);
    setOutcomes([]);
    setFinished(false);
  };

  const exit = () => {
    stop();
    onExit();
  };

  // Enter checks the answer, Enter again moves on. Listens on the window so it
  // still works after the answer box loses focus, but leaves buttons and links to their own Enter.
  // Tapping Ctrl on its own replays the sentence; Ctrl used in a shortcut (Ctrl + C, Ctrl + A...) does not.
  const ctrlAlone = useRef(false);
  useEffect(() => {
    if (finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (!e.repeat) ctrlAlone.current = true;
        return;
      }
      ctrlAlone.current = false;
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === 'TEXTAREA' || target === document.body;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && inField) {
        e.preventDefault();
        if (result) next();
        else check();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Control') return;
      if (ctrlAlone.current) playSegment();
      ctrlAlone.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  if (finished) {
    return (
      <PracticeSummary
        title={spec.title}
        subtitle={spec.subtitle}
        queue={queue}
        outcomes={outcomes}
        onExit={exit}
        onRestartAll={() => restart(spec.segments)}
        onRestartWeak={restart}
      />
    );
  }

  if (!segment) return null;
  const context = [tagLabel(segment.tag), speakerLabel(segment.speaker)].filter(Boolean);

  const words = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full animate-fade-up">
      <header className="mb-4 flex items-center justify-between gap-4">
        <button type="button" onClick={exit} className={`-ml-2 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ${focusRing}`}>
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-extrabold tracking-tight text-[var(--text-primary)] md:text-lg">{spec.title}</h1>
          {spec.subtitle && <p className="truncate text-xs text-[var(--text-muted)]">{spec.subtitle}</p>}
        </div>
        <p className="shrink-0 rounded-full bg-[var(--brand-light)] px-3 py-1.5 text-sm font-bold tabular-nums text-[var(--brand-text)]" aria-label={`Câu ${index + 1} trên ${queue.length}`}>
          {index + 1}<span className="font-semibold opacity-60"> / {queue.length}</span>
        </p>
      </header>

      <ol className="mb-5 flex gap-1.5" aria-label="Tiến độ bài luyện">
        {queue.map((s, i) => {
          const score = outcomes.find((o) => o.segmentId === s.id)?.score;
          const tone =
            score === undefined
              ? i === index
                ? 'bg-[var(--brand)]'
                : 'bg-[var(--bg-muted)]'
              : score >= 100
                ? 'bg-emerald-500'
                : 'bg-amber-400';
          return <li key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${tone}`} aria-current={i === index ? 'step' : undefined} />;
        })}
      </ol>

      <section className="overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)]">
        {/* Listen */}
        <div className="bg-gradient-to-b from-[var(--brand-light)] to-transparent px-5 pb-6 pt-5 md:px-8 lg:flex lg:flex-col lg:bg-gradient-to-br lg:p-8">
          <div className="mb-4 flex min-h-7 flex-wrap items-center justify-between gap-2">
            <p className="flex flex-wrap gap-2">{context.map((c) => <Chip key={c}>{c}</Chip>)}</p>
            {notice && <p role="status" className="text-xs text-amber-600 dark:text-amber-400">{notice}</p>}
          </div>

          <div
            className="relative flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 shadow-[var(--shadow-sm)] md:gap-4 md:px-4"
            onKeyDown={(e) => e.key === 'Escape' && speedOpen && (e.stopPropagation(), setSpeedOpen(false))}
          >
            <button
              type="button"
              onClick={() => (isPlaying ? stop() : playSegment())}
              aria-label={isPlaying ? 'Dừng phát' : 'Nghe câu này'}
              title="Nghe lại (Ctrl)"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--brand-text)] hover:bg-[var(--brand-light)] ${focusRing}`}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>

            <div
              role="slider"
              tabIndex={duration > 0 ? 0 : -1}
              aria-label="Vị trí âm thanh"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-disabled={duration === 0}
              onPointerDown={(e) => {
                if (duration === 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
              onPointerMove={(e) => {
                if (duration === 0 || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const rect = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
              onKeyDown={(e) => {
                if (duration === 0 || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
                e.preventDefault();
                seek(progress + (e.key === 'ArrowRight' ? 0.1 : -0.1));
              }}
              className={`group relative flex h-6 min-w-0 flex-1 touch-none items-center rounded-full ${duration > 0 ? 'cursor-pointer' : ''} ${focusRing}`}
            >
              <div className="relative h-1.5 w-full rounded-full bg-[var(--bg-muted)]">
                {duration > 0 ? (
                  <>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]" style={{ width: `${progress * 100}%` }} />
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--brand)] bg-[var(--bg-card)] shadow-sm transition-transform group-hover:scale-110"
                      style={{ left: `${progress * 100}%` }}
                    />
                  </>
                ) : (
                  isPlaying && <div className="sf-wave-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--brand)]" />
                )}
              </div>
            </div>

            <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]" aria-hidden="true">
              {formatTime(progress * duration)}
              {duration > 0 && <span className="hidden sm:inline"> / {formatTime(duration)}</span>}
            </span>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 1)}
                aria-label={volume > 0 ? 'Tắt tiếng' : 'Bật tiếng'}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] ${focusRing}`}
              >
                {volume > 0 ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Âm lượng"
                className="h-1.5 w-20 cursor-pointer accent-[var(--brand)] md:w-24"
              />
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSpeedOpen((v) => !v)}
                aria-label={`Tốc độ phát, đang ${speed}x`}
                aria-haspopup="true"
                aria-expanded={speedOpen}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] ${focusRing}`}
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
              {speedOpen && (
                <div role="group" aria-label="Tốc độ phát" className="absolute right-0 top-full z-10 mt-2 w-36 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-md)]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={speed === s}
                      onClick={() => {
                        setSpeed(s);
                        setSpeedOpen(false);
                      }}
                      className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold tabular-nums ${focusRing} ${
                        speed === s ? 'bg-[var(--brand-light)] text-[var(--brand-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {s}x {speed === s && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Write */}
        <div className="space-y-4 border-t border-[var(--border)] px-5 pb-5 pt-5 md:px-8 md:pb-6 lg:flex lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:p-8">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label htmlFor="dictation-input" className="text-sm font-semibold text-[var(--text-primary)]">Gõ lại câu bạn nghe được</label>
              <span className="text-xs tabular-nums text-[var(--text-muted)]">{words} từ</span>
            </div>
            <textarea
              id="dictation-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={!!result}
              rows={6}
              autoComplete="off"
              spellCheck={false}
              placeholder="Gõ những gì bạn nghe được..."
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 text-xl leading-9 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:bg-[var(--bg-card)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15 read-only:opacity-80"
            />
          </div>

          {result && <ResultView result={result} translation={segment.translation ?? translations[segment.id]} onRetryTranslation={retryTranslation} />}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={playSegment}
              className={`inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] ${focusRing}`}
            >
              <RotateCcw className="h-4 w-4" /> Nghe lại <kbd className="ml-1 rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--text-muted)]">Ctrl</kbd>
            </button>
            {result ? (
              <button type="button" onClick={next} className={`inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--brand)] px-7 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] hover:brightness-95 ${focusRing}`}>
                {index < queue.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'} <kbd className="rounded-md bg-white/25 px-1.5 py-0.5 font-sans text-[11px] font-semibold">Enter</kbd>
              </button>
            ) : (
              <button type="button" onClick={check} disabled={!input.trim()} className={`inline-flex min-h-12 items-center rounded-full bg-[var(--brand)] px-7 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${focusRing}`}>
                Kiểm tra <kbd className="ml-2 rounded-md bg-white/25 px-1.5 py-0.5 font-sans text-[11px] font-semibold">Enter</kbd>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

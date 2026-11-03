"use client";

import React from 'react';
import { Mic, RotateCcw, Square, Volume2 } from 'lucide-react';
import { Lesson } from '../types';
import { WordComparison } from '@/lib/speechAudio';
import type { useSpeechCapture } from '../useSpeechCapture';
import { ScoreSummary, WordChips } from './ScoreResult';
import { practiceMeaning, practiceText } from './lessonFlow';

interface SpeakStepProps {
  lesson: Lesson;
  /** 1-based position of this step, shown in the heading. */
  part: number;
  speech: ReturnType<typeof useSpeechCapture>;
  comparison: WordComparison | null;
  onPlay: (text: string) => void;
  onPlayWord: (word: string) => void;
}

export function SpeakStep({ lesson, part, speech, comparison, onPlay, onPlayWord }: SpeakStepProps) {
  const score = comparison?.score ?? null;
  const busy = speech.isTranscribing;

  const status = !speech.supported
    ? 'Trình duyệt này chưa hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Safari bản mới.'
    : busy
      ? speech.modelStatus === 'loading'
        ? `Đang tải mô hình nhận diện (lần đầu, ${Math.round(speech.modelProgress)}%)...`
        : 'Đang nhận diện giọng nói...'
      : speech.isRecording
        ? 'Đang ghi âm. Nói xong thì bấm nút để dừng.'
        : score !== null
          ? 'Bấm mic để đọc lại.'
          : 'Bấm mic, đọc to câu trên rồi bấm lần nữa để dừng.';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Phần {part} · Luyện nói</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Đọc to câu sau với ngữ điệu tự nhiên</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        {/* Left: practise */}
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-subtle)] p-5 text-center">
            <p className="text-xl font-extrabold leading-snug text-[var(--text-primary)]">{practiceText(lesson)}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{practiceMeaning(lesson)}</p>
            <button
              type="button"
              onClick={() => onPlay(practiceText(lesson))}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-indigo-200 bg-[var(--bg-card)] px-4 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              <Volume2 className="h-4 w-4" /> Nghe phát âm mẫu
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={speech.toggle}
              disabled={!speech.supported || busy}
              aria-pressed={speech.isRecording}
              aria-label={speech.isRecording ? 'Dừng ghi âm' : score !== null ? 'Ghi âm lại' : 'Bắt đầu ghi âm'}
              style={speech.isRecording ? { boxShadow: `0 0 0 ${6 + speech.level * 18}px rgba(244,63,94,0.18)` } : undefined}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-white transition-[background-color,box-shadow] duration-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 disabled:opacity-50 ${
                speech.isRecording ? 'bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {speech.isRecording ? <Square className="h-7 w-7 fill-current" /> : score !== null ? <RotateCcw className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]" aria-live="polite">{status}</p>
            {speech.error && (
              <p role="alert" className="max-w-sm text-center text-sm font-semibold text-rose-600 dark:text-rose-400">{speech.error}</p>
            )}
          </div>
        </div>

        {/* Right: result */}
        <div className="space-y-5">
          {speech.recordingUrl && !speech.isRecording && (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Bản ghi của bạn</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls src={speech.recordingUrl} className="h-9 w-full" />
            </div>
          )}

          {comparison && score !== null && !speech.isRecording ? (
            <div className="space-y-4 animate-fade-up">
              <ScoreSummary score={score} detail={speech.finalTranscript ? `Máy nghe được: “${speech.finalTranscript}”` : undefined} />
              <WordChips comparison={comparison} onPlayWord={onPlayWord} />
            </div>
          ) : (
            <div className="hidden min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)] md:flex">
              {speech.isRecording ? 'Đang nghe bạn đọc...' : 'Điểm số và các từ cần luyện sẽ hiện ở đây sau khi bạn đọc xong.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

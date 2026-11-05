"use client";

import React from 'react';
import { AlertTriangle, ChevronDown, Headphones, Link2, Loader2, Mic, PlayCircle } from 'lucide-react';
import { extractYouTubeId, type VideoLessonData } from '@/lib/youtubeUtils';

export type PracticeType = 'dictation' | 'shadowing';

interface YouTubeSetupProps {
  practiceType: PracticeType;
  onPracticeTypeChange: (type: PracticeType) => void;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  lessonTitle: string;
  onLessonTitleChange: (title: string) => void;
  showManualInput: boolean;
  onToggleManualInput: () => void;
  rawTranscript: string;
  onRawTranscriptChange: (text: string) => void;
  isFetching: boolean;
  /** Why the automatic subtitle fetch failed, shown with what to do next. */
  fetchError?: string | null;
  onSubmit: () => void;
  savedLessons: VideoLessonData[];
  onSelectSaved: (lesson: VideoLessonData) => void;
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';
const fieldClass = `w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:bg-[var(--bg-card)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15`;

const MODES: { id: PracticeType; title: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dictation', title: 'Chép chính tả', hint: 'Nghe từng đoạn, gõ lại đúng từng từ', icon: Headphones },
  { id: 'shadowing', title: 'Shadowing', hint: 'Nghe một đoạn rồi đọc theo và ghi âm', icon: Mic },
];

function VideoPreview({ videoId, title }: { videoId: string | null; title: string }) {
  if (!videoId) {
    return (
      <div className="hidden aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-dashed md:flex border-[var(--border)] bg-[var(--bg-subtle)] px-6 text-center">
        <PlayCircle className="h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
        <p className="text-sm text-[var(--text-secondary)]">Dán link YouTube để xem trước video ở đây.</p>
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="Ảnh bìa video YouTube" className="aspect-video w-full object-cover" />
      <figcaption className="truncate px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{title.trim() || 'YouTube Practice'}</figcaption>
    </figure>
  );
}

export function YouTubeSetup({
  practiceType,
  onPracticeTypeChange,
  videoUrl,
  onVideoUrlChange,
  lessonTitle,
  onLessonTitleChange,
  showManualInput,
  onToggleManualInput,
  rawTranscript,
  onRawTranscriptChange,
  isFetching,
  fetchError,
  onSubmit,
  savedLessons,
  onSelectSaved,
}: YouTubeSetupProps) {
  const videoId = extractYouTubeId(videoUrl);
  const typed = videoUrl.trim().length > 0;
  const invalid = typed && !videoId;

  return (
    <div className="w-full space-y-8 animate-fade-up">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (videoId && !isFetching) onSubmit();
        }}
        aria-busy={isFetching}
        className="grid gap-6 lg:grid-cols-5 lg:items-start"
      >
        <section aria-labelledby="yt-setup-title" className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 md:p-8 lg:col-span-3">
          <div>
            <h2 id="yt-setup-title" className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Tạo bài luyện tập từ YouTube</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Dán link video, hệ thống tự lấy phụ đề và chia thành từng đoạn ngắn để luyện.</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Kiểu luyện tập</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map(({ id, title, hint, icon: Icon }) => {
                const active = practiceType === id;
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--brand)] ${
                      active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
                    }`}
                  >
                    <input type="radio" name="practice-type" value={id} checked={active} onChange={() => onPracticeTypeChange(id)} className="sr-only" />
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${active ? 'text-[var(--brand-text)]' : 'text-[var(--text-primary)]'}`}>{title}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="yt-url" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">Link YouTube</label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
              <input
                id="yt-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                value={videoUrl}
                onChange={(e) => onVideoUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                aria-invalid={invalid}
                aria-describedby={invalid ? 'yt-url-error' : undefined}
                className={`${fieldClass} pl-11 ${invalid ? 'border-rose-500' : ''}`}
              />
            </div>
            {invalid && (
              <p id="yt-url-error" role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">
                Link này chưa đúng. Hãy dán link dạng youtube.com/watch?v=... hoặc youtu.be/...
              </p>
            )}
          </div>

          <div>
            <label htmlFor="yt-title" className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
              Tiêu đề bài học <span className="font-normal text-[var(--text-muted)]">(không bắt buộc)</span>
            </label>
            <input id="yt-title" type="text" value={lessonTitle} onChange={(e) => onLessonTitleChange(e.target.value)} placeholder="YouTube Practice" className={fieldClass} />
          </div>

          {fetchError && (
            <div role="alert" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div className="min-w-0 space-y-2 text-sm text-[var(--text-primary)]">
                <p className="font-semibold">{fetchError}</p>
                <p className="text-[var(--text-secondary)]">Bạn vẫn luyện được: mở video trên YouTube, bấm <strong>... (Thêm)</strong> &gt; <strong>Hiện bản chép lời</strong>, copy toàn bộ rồi dán vào ô &ldquo;Nhập phụ đề thủ công&rdquo; bên dưới, sau đó bấm Tạo bài nghe chép lại.</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={onToggleManualInput}
              aria-expanded={showManualInput}
              aria-controls="yt-manual"
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ${focusRing}`}
            >
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">Nhập phụ đề thủ công</span>
                <span className="block text-xs text-[var(--text-secondary)]">Dùng khi hệ thống không tự lấy được phụ đề</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${showManualInput ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showManualInput && (
              <div id="yt-manual" className="space-y-2 border-t border-[var(--border)] px-4 py-4">
                <label htmlFor="yt-transcript" className="block text-sm font-semibold text-[var(--text-primary)]">Bản chép lời kèm mốc thời gian</label>
                <textarea
                  id="yt-transcript"
                  value={rawTranscript}
                  onChange={(e) => onRawTranscriptChange(e.target.value)}
                  placeholder={'0:05\nCâu tiếng Anh thứ nhất\n0:10\nCâu thứ hai...'}
                  rows={6}
                  className={`${fieldClass} font-mono text-sm`}
                />
                <p className="text-xs text-[var(--text-muted)]">Dán nguyên bản chép lời copy từ YouTube (mỗi mốc thời gian một dòng, chữ ở dòng dưới), hoặc gõ dạng [00:05] câu thứ nhất.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-2">
          <VideoPreview videoId={videoId} title={lessonTitle} />
          <button
            type="submit"
            disabled={isFetching || !videoId}
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-base font-bold text-[var(--text-inverse)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Đang lấy phụ đề...</span>
              </>
            ) : (
              <span>Tạo bài nghe chép</span>
            )}
          </button>
          <p className="text-center text-xs text-[var(--text-muted)]">{isFetching ? 'Việc này có thể mất vài giây.' : 'Phụ đề sẽ được lấy tự động từ video.'}</p>
        </aside>
      </form>

      {savedLessons.length > 0 && (
        <section aria-labelledby="yt-saved-title">
          <h3 id="yt-saved-title" className="mb-3 text-lg font-bold text-[var(--text-primary)]">Bài học đã lưu</h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {savedLessons.map((lesson) => {
              const correct = lesson.scoreCorrect ?? 0;
              const total = lesson.scoreTotal ?? 0;
              const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSaved(lesson)}
                    className={`flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left transition-colors hover:border-[var(--brand)] ${focusRing}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://img.youtube.com/vi/${lesson.youtubeVideoId}/mqdefault.jpg`} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{lesson.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">Lần trước: {correct}/{total} đoạn · {percent}%</span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]" aria-hidden="true">
                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

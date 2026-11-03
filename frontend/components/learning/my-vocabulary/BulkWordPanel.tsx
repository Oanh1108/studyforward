"use client";

import React, { useMemo, useState } from 'react';
import { BulkImportResponse, myVocabApi } from '@/lib/myVocabApi';
import { SupportedLanguage } from '@/lib/languages';

interface BulkWordPanelProps {
  folderId: number | null;
  language: SupportedLanguage;
  languageName: string;
  onClose: () => void;
  onSuccess: (result: { added: number; skipped: number; folderId: number | null }) => void;
}

interface ParsedLine {
  word: string;
  meaning?: string;
}

const MAX_LINES = 100;
const ENRICH_CHUNK = 15;

/**
 * One entry per line. Accepted forms:
 *   resilient
 *   resilient - kiên cường        (also –, —, :, =, |, tab)
 */
export function parseBulkLines(text: string): ParsedLine[] {
  const seen = new Set<string>();
  const out: ParsedLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)(?:\t|\s+[-–—]\s+|\s*[:=|]\s*)(.+)$/);
    const word = (m ? m[1] : line).trim();
    const meaning = m ? m[2].trim() : undefined;
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue; // dedupe inside the pasted list
    seen.add(key);
    out.push({ word, meaning: meaning || undefined });
  }
  return out;
}

export function BulkWordPanel({ folderId, language, languageName, onClose, onSuccess }: BulkWordPanelProps) {
  const [text, setText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    (BulkImportResponse & { noMeaning: string[] }) | null
  >(null);

  const parsed = useMemo(() => parseBulkLines(text), [text]);
  const tooMany = parsed.length > MAX_LINES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.length === 0 || tooMany) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      // 1. Ask AI/dictionary to fill whatever the user did not type (meaning, reading, POS, example...).
      const enriched: Array<Record<string, any>> = parsed.map((p) => ({ word: p.word, meaning: p.meaning }));
      for (let start = 0; start < parsed.length; start += ENRICH_CHUNK) {
        const chunk = parsed.slice(start, start + ENRICH_CHUNK);
        setProgress(`AI đang bổ sung nghĩa và cách đọc... (${Math.min(start + ENRICH_CHUNK, parsed.length)}/${parsed.length})`);
        try {
          const res = await myVocabApi.enrichBatch(
            chunk.map((p) => ({ word: p.word, meaning: p.meaning })),
            language,
          );
          for (const r of res) {
            const target = enriched[start + r.index];
            if (!target) continue;
            const { index: _ignored, meaning, ...rest } = r;
            Object.assign(target, rest, { meaning: target.meaning || meaning });
          }
        } catch {
          /* keep going: user-typed meanings can still be saved */
        }
      }

      // 2. Only words that ended up with a meaning can be saved.
      const ready = enriched.filter((i) => typeof i.meaning === 'string' && i.meaning.trim());
      const noMeaning = enriched.filter((i) => !(typeof i.meaning === 'string' && i.meaning.trim())).map((i) => i.word as string);

      if (ready.length === 0) {
        setError('AI chưa tìm được nghĩa cho các từ này. Hãy nhập nghĩa theo dạng "từ - nghĩa" ở mỗi dòng.');
        return;
      }

      setProgress(`Đang lưu ${ready.length} từ...`);
      const res = await myVocabApi.bulkImport({
        folderId,
        language,
        items: ready as any,
        duplicateStrategy: 'skip',
      });

      if (res.added > 0) {
        onSuccess({ added: res.added, skipped: res.skipped, folderId: res.folderId ?? folderId });
      }
      setResult({ ...res, noMeaning });
      // Leave only the lines that were not saved so the user can fix and retry.
      if (res.added > 0) {
        const failed = new Set([...noMeaning, ...res.errors.map((er) => er.word)].map((w) => w.toLowerCase()));
        setText(
          text
            .split(/\r?\n/)
            .filter((l) => {
              const p = parseBulkLines(l)[0];
              return p && failed.has(p.word.toLowerCase());
            })
            .join('\n'),
        );
      }
    } catch (err: any) {
      setError(err.message || 'Không thể lưu danh sách từ vựng.');
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
      {error && (
        <div className="text-xs p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">{error}</div>
      )}

      {result && (
        <div className="text-xs p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 space-y-1">
          <p className="font-bold">
            Đã thêm {result.added} từ{result.skipped > 0 ? `, bỏ qua ${result.skipped} từ trùng` : ''}.
          </p>
          {result.noMeaning.length > 0 && (
            <p>Chưa có nghĩa (thêm dạng "từ - nghĩa" rồi thử lại): {result.noMeaning.join(', ')}</p>
          )}
          {result.errors.length > 0 && <p>Lỗi: {result.errors.map((er) => `${er.word} (${er.error})`).join(', ')}</p>}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
          Danh sách từ {languageName} (mỗi dòng một từ)
        </label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={9}
          autoFocus
          disabled={isRunning}
          placeholder={'resilient\nbreakthrough - bước đột phá\nfulfill: hoàn thành'}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans resize-y"
        />
        <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Chỉ cần nhập từ, AI sẽ tự điền nghĩa, từ loại, phiên âm và ví dụ. Muốn tự đặt nghĩa thì viết{' '}
          <code>từ - nghĩa</code> (hoặc <code>từ: nghĩa</code>). Từ đã có trong thư mục sẽ được bỏ qua.
        </p>
        <p className={`mt-1 text-[11px] font-semibold ${tooMany ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {parsed.length} từ{tooMany ? ` — tối đa ${MAX_LINES} từ mỗi lần` : ''}
        </p>
      </div>

      {progress && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium animate-pulse">
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>{progress}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all"
        >
          {result ? 'Đóng' : 'Hủy'}
        </button>
        <button
          type="submit"
          disabled={isRunning || parsed.length === 0 || tooMany}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all"
        >
          {isRunning ? 'Đang xử lý...' : `Thêm ${parsed.length || ''} từ`}
        </button>
      </div>
    </form>
  );
}

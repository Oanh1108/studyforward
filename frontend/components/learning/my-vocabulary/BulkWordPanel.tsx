"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BulkImportResponse, myVocabApi } from '@/lib/myVocabApi';
import { SupportedLanguage } from '@/lib/languages';

interface BulkWordPanelProps {
  folderId: number | null;
  language: SupportedLanguage;
  languageName: string;
  onClose: () => void;
  onSuccess: (result: { added: number; skipped: number; folderId: number | null }) => void;
}

interface Row {
  id: number;
  word: string;
  meaning: string;
  /** Reading, part of speech, example... returned by AI for this word. */
  extra: Record<string, any>;
  loading: boolean;
  /** True once the user typed the meaning themselves; AI must not overwrite it. */
  meaningEdited: boolean;
}

const MAX_ROWS = 100;
const START_ROWS = 3;
const ENRICH_CHUNK = 15;

let nextId = 1;
const newRow = (word = '', meaning = ''): Row => ({
  id: nextId++,
  word,
  meaning,
  extra: {},
  loading: false,
  meaningEdited: !!meaning,
});

/** "word - meaning" / "word: meaning" / "word<TAB>meaning" -> [word, meaning?] */
function splitLine(line: string): [string, string | undefined] {
  const m = line.match(/^(.+?)(?:\t|\s+[-–—]\s+|\s*[:=|]\s*)(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [line.trim(), undefined];
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans';

export function BulkWordPanel({ folderId, language, languageName, onClose, onSuccess }: BulkWordPanelProps) {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: START_ROWS }, () => newRow()));
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(BulkImportResponse & { noMeaning: string[] }) | null>(null);

  const wordRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [focusId, setFocusId] = useState<number | null>(null);
  const lookedUp = useRef<Record<number, string>>({});

  useEffect(() => {
    if (focusId !== null) {
      wordRefs.current[focusId]?.focus();
      setFocusId(null);
    }
  }, [focusId, rows]);

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = (focus = true) => {
    if (rows.length >= MAX_ROWS) return;
    const r = newRow();
    setRows((rs) => [...rs, r]);
    if (focus) setFocusId(r.id);
  };

  const removeRow = (id: number) => setRows((rs) => (rs.length <= 1 ? [newRow()] : rs.filter((r) => r.id !== id)));

  /** Quizlet-style: as soon as a word is typed, fetch its meaning and fill the row. */
  const lookup = async (row: Row) => {
    const word = row.word.trim();
    if (!word || lookedUp.current[row.id] === word.toLowerCase()) return;
    lookedUp.current[row.id] = word.toLowerCase();
    updateRow(row.id, { loading: true });
    try {
      const [res] = await myVocabApi.enrichBatch([{ word, meaning: row.meaningEdited ? row.meaning : undefined }], language);
      setRows((rs) =>
        rs.map((r) => {
          if (r.id !== row.id || r.word.trim().toLowerCase() !== word.toLowerCase()) return { ...r, loading: r.id === row.id ? false : r.loading };
          const { index: _i, meaning, ...extra } = res || ({} as any);
          return {
            ...r,
            loading: false,
            extra,
            meaning: r.meaningEdited ? r.meaning : meaning || r.meaning,
          };
        }),
      );
    } catch {
      updateRow(row.id, { loading: false });
    }
  };

  /** Pasting several lines into a word box turns each line into its own row. */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, row: Row) => {
    const text = e.clipboardData.getData('text');
    if (!/\r?\n/.test(text.trim())) return;
    e.preventDefault();
    const parsed = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map(splitLine);
    const idx = rows.findIndex((r) => r.id === row.id);
    const fresh = parsed.map(([w, m]: [string, string | undefined]) => newRow(w, m || ''));
    // Replace the box pasted into if it was empty, otherwise insert below it.
    const replaceCurrent = !row.word.trim() && !row.meaning.trim();
    const base = replaceCurrent ? rows.filter((r) => r.id !== row.id) : rows;
    const at = replaceCurrent ? idx : idx + 1;
    const next = [...base.slice(0, at), ...fresh, ...base.slice(at)].slice(0, MAX_ROWS);
    setRows(next);
    // Look the pasted words up in the background so meanings appear without extra clicks.
    void lookupMany(next);
  };

  const lookupMany = async (all: Row[]) => {
    const todo = all.filter((r) => r.word.trim() && !r.meaning.trim() && lookedUp.current[r.id] !== r.word.trim().toLowerCase());
    for (let s = 0; s < todo.length; s += ENRICH_CHUNK) {
      const chunk = todo.slice(s, s + ENRICH_CHUNK);
      chunk.forEach((r) => {
        lookedUp.current[r.id] = r.word.trim().toLowerCase();
      });
      setRows((rs) => rs.map((r) => (chunk.some((c) => c.id === r.id) ? { ...r, loading: true } : r)));
      try {
        const res = await myVocabApi.enrichBatch(chunk.map((r) => ({ word: r.word.trim() })), language);
        setRows((rs) =>
          rs.map((r) => {
            const pos = chunk.findIndex((c) => c.id === r.id);
            if (pos < 0) return r;
            const hit = res.find((x) => x.index === pos);
            if (!hit) return { ...r, loading: false };
            const { index: _i, meaning, ...extra } = hit as any;
            return { ...r, loading: false, extra, meaning: r.meaningEdited ? r.meaning : meaning || r.meaning };
          }),
        );
      } catch {
        setRows((rs) => rs.map((r) => (chunk.some((c) => c.id === r.id) ? { ...r, loading: false } : r)));
      }
    }
  };

  const filled = rows.filter((r) => r.word.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filled.length === 0) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      // Anything still missing a meaning (e.g. AI was slow or skipped) gets one last lookup.
      const needAi = rows.filter((r) => r.word.trim() && !r.meaning.trim());
      let current = rows;
      if (needAi.length > 0) {
        setProgress('AI đang bổ sung nghĩa còn thiếu...');
        const patches: Record<number, Partial<Row>> = {};
        for (let s = 0; s < needAi.length; s += ENRICH_CHUNK) {
          const chunk = needAi.slice(s, s + ENRICH_CHUNK);
          try {
            const res = await myVocabApi.enrichBatch(chunk.map((r) => ({ word: r.word.trim() })), language);
            for (const x of res) {
              const target = chunk[x.index];
              if (!target) continue;
              const { index: _i, meaning, ...extra } = x as any;
              patches[target.id] = { extra, meaning: meaning || '' };
            }
          } catch {
            /* handled below as "no meaning" */
          }
        }
        current = rows.map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r));
        setRows(current);
      }

      const withWord = current.filter((r) => r.word.trim());
      const ready = withWord.filter((r) => r.meaning.trim());
      const noMeaning = withWord.filter((r) => !r.meaning.trim());

      if (ready.length === 0) {
        setError('Chưa có từ nào có nghĩa. Hãy nhập nghĩa vào cột bên phải.');
        return;
      }

      setProgress(`Đang lưu ${ready.length} từ...`);
      const res = await myVocabApi.bulkImport({
        folderId,
        language,
        items: ready.map((r) => ({ ...r.extra, word: r.word.trim(), meaning: r.meaning.trim() })) as any,
        duplicateStrategy: 'skip',
      });

      if (res.added > 0) {
        onSuccess({ added: res.added, skipped: res.skipped, folderId: res.folderId ?? folderId });
      }
      setResult({ ...res, noMeaning: noMeaning.map((r) => r.word.trim()) });

      // Keep only rows that were not saved so the user can fix and resubmit.
      const failed = new Set([...noMeaning.map((r) => r.word.trim()), ...res.errors.map((er) => er.word)].map((w) => w.toLowerCase()));
      const rest = current.filter((r) => failed.has(r.word.trim().toLowerCase()));
      if (rest.length === 0 && res.added > 0) {
        // Everything was saved: the parent already toasts the result, so just close.
        onClose();
        return;
      }
      setRows(rest.length > 0 ? rest : Array.from({ length: START_ROWS }, () => newRow()));
    } catch (err: any) {
      setError(err.message || 'Không thể lưu danh sách từ vựng.');
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-4 overflow-y-auto">
      {error && (
        <div className="text-xs p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">{error}</div>
      )}

      {result && (
        <div className="text-xs p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 space-y-1">
          <p className="font-bold">
            Đã thêm {result.added} từ{result.skipped > 0 ? `, bỏ qua ${result.skipped} từ trùng` : ''}.
          </p>
          {result.noMeaning.length > 0 && <p>Còn thiếu nghĩa: {result.noMeaning.join(', ')}</p>}
          {result.errors.length > 0 && <p>Lỗi: {result.errors.map((er) => `${er.word} (${er.error})`).join(', ')}</p>}
        </div>
      )}

      <div className="hidden sm:grid grid-cols-[1.5rem_1fr_1fr_2.25rem] gap-2 px-0.5 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
        <span />
        <span>{languageName}</span>
        <span>Nghĩa tiếng Việt</span>
        <span />
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <div key={row.id} className="grid grid-cols-[1.5rem_1fr_2.25rem] sm:grid-cols-[1.5rem_1fr_1fr_2.25rem] gap-3 items-start">
              <span className="pt-3.5 text-xs font-bold text-[var(--text-muted)] text-center">{i + 1}</span>
              <input
                ref={(el) => {
                  wordRefs.current[row.id] = el;
                }}
                type="text"
                value={row.word}
                disabled={isRunning}
                onChange={(e) => {
                  updateRow(row.id, { word: e.target.value });
                  setError(null);
                }}
                onBlur={() => void lookup(row)}
                onPaste={(e) => handlePaste(e, row)}
                placeholder={`Từ ${languageName}`}
                autoFocus={i === 0}
                className={`${inputCls} font-semibold`}
              />
              <div className="relative col-start-2 sm:col-start-auto row-start-2 sm:row-start-auto col-span-1">
                <textarea
                  rows={1}
                  value={row.meaning}
                  disabled={isRunning}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  onChange={(e) => updateRow(row.id, { meaning: e.target.value, meaningEdited: true })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isLast) addRow();
                      else setFocusId(rows[i + 1].id);
                    }
                  }}
                  placeholder={row.loading ? 'AI đang tìm nghĩa...' : 'AI tự điền, hoặc bạn tự nhập'}
                  className={`${inputCls} resize-none overflow-hidden leading-snug`}
                />
                {row.loading && (
                  <span className="absolute right-3 top-3.5 w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={isRunning}
                aria-label={`Xóa dòng ${i + 1}`}
                className="w-9 h-11 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addRow()}
        disabled={isRunning || rows.length >= MAX_ROWS}
        className="w-full py-3.5 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-400 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 transition-all"
      >
        + Thêm dòng
      </button>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        Gõ từ xong, AI tự điền nghĩa, từ loại, phiên âm và ví dụ. Nhấn <kbd>Enter</kbd> ở ô nghĩa để sang dòng mới. Dán nhiều dòng
        vào ô từ sẽ tự tách thành nhiều dòng (hỗ trợ <code>từ - nghĩa</code>). Từ đã có trong thư mục sẽ được bỏ qua.
      </p>

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
          disabled={isRunning || filled.length === 0}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all"
        >
          {isRunning ? 'Đang xử lý...' : `Thêm ${filled.length || ''} từ`}
        </button>
      </div>
    </form>
  );
}

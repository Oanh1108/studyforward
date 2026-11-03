"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, FolderOpen, RefreshCw, X } from 'lucide-react';
import { ReanalyzeCandidate, myVocabApi } from '@/lib/myVocabApi';
import { SupportedLanguage, getLanguageInfo } from '@/lib/languages';

interface ReanalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: SupportedLanguage;
  onSuccess: (updatedCount: number) => void;
}

export function ReanalyzeModal({
  isOpen,
  onClose,
  currentLanguage,
  onSuccess,
}: ReanalyzeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ReanalyzeCandidate[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);
  const langInfo = getLanguageInfo(currentLanguage);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isApplying && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isApplying, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      setCandidates([]);
      setSelectedIds(new Set());
      setAppliedCount(null);
      setError(null);
    }
  }, [isOpen, currentLanguage]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    setAppliedCount(null);
    try {
      const res = await myVocabApi.reanalyzePreview(currentLanguage);
      setCandidates(res.candidates || []);
      setTotalScanned(res.totalScanned || 0);
      // Select all by default
      const allIds = new Set((res.candidates || []).map((c) => c.id));
      setSelectedIds(allIds);
    } catch (err: any) {
      setError(err.message || 'Không thể tải bản xem trước phân tích lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) {
      setError('Vui lòng chọn ít nhất một từ để áp dụng.');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      const res = await myVocabApi.reanalyzeApply(Array.from(selectedIds));
      setAppliedCount(res.updatedCount);
      onSuccess(res.updatedCount);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật dữ liệu vào database.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const showTable = appliedCount === null && !isLoading && candidates.length > 0;
  const allSelected = selectedIds.size === candidates.length && candidates.length > 0;
  const changeLabel: Record<string, string> = {
    word: 'Tách từ',
    pos: 'Từ loại',
    synonyms: 'Đồng nghĩa',
    antonyms: 'Trái nghĩa',
    folder: 'Thư mục',
  };

  // Portalled to <body>: an ancestor with a transform would otherwise make `fixed` cover only part of the page.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-md animate-fade-in sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !isApplying && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reanalyze-title"
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] animate-scale-up ${
          showTable ? 'max-w-4xl' : 'max-w-sm'
        }`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={isApplying}
          aria-label="Đóng"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header: only above the table; the short states are centred and need no heading block */}
        {showTable && (
          <div className="flex items-start gap-4 px-5 pb-4 pt-5 pr-16 sm:px-6 sm:pr-16">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-[var(--brand-text)]">
              <RefreshCw className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="reanalyze-title" className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
                  Phân tích lại dữ liệu đã nhập
                </h2>
                <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                  {langInfo.flag} {langInfo.name}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Tách từ loại, đồng nghĩa và trái nghĩa bị gộp trong một ô, đồng thời liên kết lại thư mục.
              </p>
            </div>
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 space-y-4 overflow-y-auto ${showTable ? 'px-5 pb-5 sm:px-6' : 'px-6 pb-7 pt-10'}`}>
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {appliedCount !== null ? (
            <div role="status" className="space-y-6 text-center animate-fade-in">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Check className="h-8 w-8" />
              </span>
              <div className="space-y-1.5">
                <h3 id="reanalyze-title" className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Cập nhật hoàn tất</h3>
                <p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-[var(--text-secondary)]">
                  Đã chuẩn hóa <strong className="text-[var(--text-primary)]">{appliedCount}</strong> từ vựng. Tiến độ học và ID của từ được giữ nguyên.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] px-7 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                Xong
              </button>
            </div>
          ) : isLoading ? (
            <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
              <h3 id="reanalyze-title" className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Đang phân tích</h3>
              <p className="max-w-xs text-sm text-[var(--text-secondary)]">
                Đang quét từ vựng {langInfo.name} để tìm chỗ cần tách...
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div role="status" className="space-y-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Check className="h-8 w-8" />
              </span>
              <div className="space-y-1.5">
                <h3 id="reanalyze-title" className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Dữ liệu đã được chuẩn hóa</h3>
                <p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-[var(--text-secondary)]">
                  Đã kiểm tra {totalScanned} từ {langInfo.name}. Không có từ nào dính từ loại, ký hiệu đồng nghĩa hoặc thiếu liên kết thư mục.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--border)] px-7 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{candidates.length} từ</strong> cần chuẩn hóa trên tổng {totalScanned} từ {langInfo.name}
                </p>
                <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAll}
                    className="h-4 w-4 cursor-pointer rounded accent-[var(--brand)]"
                  />
                  Chọn tất cả ({selectedIds.size}/{candidates.length})
                </label>
              </div>

              <div className="max-h-[50vh] overflow-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">Các từ sẽ được chuẩn hóa</caption>
                  <thead className="sticky top-0 z-10 bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                    <tr>
                      <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Chọn</span></th>
                      <th scope="col" className="min-w-[200px] px-3 py-3">Từ gốc → Từ sau khi tách</th>
                      <th scope="col" className="min-w-[90px] px-3 py-3">Từ loại</th>
                      <th scope="col" className="min-w-[130px] px-3 py-3">Đồng nghĩa</th>
                      <th scope="col" className="min-w-[120px] px-3 py-3">Trái nghĩa</th>
                      <th scope="col" className="min-w-[150px] px-3 py-3">Thư mục</th>
                      <th scope="col" className="min-w-[120px] px-3 py-3">Thay đổi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleToggleSelect(item.id)}
                          className={`cursor-pointer border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-subtle)] ${
                            isSelected ? '' : 'opacity-55'
                          }`}
                        >
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.id)}
                              aria-label={`Chọn ${item.cleanWord}`}
                              className="h-4 w-4 cursor-pointer rounded accent-[var(--brand)]"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-xs text-[var(--text-muted)] line-through">{item.originalWord}</p>
                            <p className="mt-0.5 font-bold text-[var(--text-primary)]">{item.cleanWord}</p>
                          </td>
                          <td className="px-3 py-3">
                            {item.newPos ? (
                              <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">{item.newPos}</span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium text-emerald-700 dark:text-emerald-300">
                            {item.newSynonyms || <span className="text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="px-3 py-3 font-medium text-rose-600 dark:text-rose-300">
                            {item.newAntonyms || <span className="text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            {item.targetFolderName ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-text)]">
                                <FolderOpen className="h-4 w-4 shrink-0" />
                                {item.targetFolderName}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">Giữ nguyên</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {item.changeTypes.map((t) => (
                                <span key={t} className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-text)]">
                                  {changeLabel[t] ?? t}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {showTable && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] disabled:opacity-40"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || selectedIds.size === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {isApplying ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  <span>Đang áp dụng...</span>
                </>
              ) : (
                <span>Cập nhật {selectedIds.size} từ</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

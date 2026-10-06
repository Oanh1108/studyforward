"use client";

import React, { useState, useEffect } from 'react';
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

  const langInfo = getLanguageInfo(currentLanguage);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <span>Phân tích lại dữ liệu đã nhập</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  {langInfo.flag} {langInfo.name}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tách từ loại, từ đồng nghĩa/trái nghĩa bị gộp trong ô và liên kết thư mục thực tế từ cơ sở dữ liệu.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {appliedCount !== null ? (
            /* Success State */
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-3xl mx-auto ring-8 ring-emerald-500/5">
                🎉
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Cập nhật hoàn tất!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  Đã chuẩn hóa và liên kết thành công <strong>{appliedCount}</strong> từ vựng. Dữ liệu tiến độ học và ID từ được giữ nguyên vẹn.
                </p>
              </div>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          ) : isLoading ? (
            /* Loading State */
            <div className="py-16 text-center space-y-3">
              <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Đang quét toàn bộ từ vựng {langInfo.name} để tìm ký hiệu cần tách...
              </p>
            </div>
          ) : candidates.length === 0 ? (
            /* No Candidates State */
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
                ✓
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Dữ liệu từ vựng đã chuẩn hóa hoàn toàn!
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Đã kiểm tra {totalScanned} từ. Không có từ nào bị dính từ loại (n), (v), ký hiệu đồng nghĩa (=) hoặc thiếu liên kết thư mục.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:bg-[var(--bg-subtle)]"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            /* Candidate Preview Table */
            <div className="space-y-3">
              {/* Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    🔍 Phát hiện {candidates.length} từ cần chuẩn hóa
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    (trên tổng số {totalScanned} từ {langInfo.name})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === candidates.length && candidates.length > 0}
                      onChange={handleToggleAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Chọn tất cả ({selectedIds.size}/{candidates.length})</span>
                  </label>
                </div>
              </div>

              {/* Table */}
              <div className="border border-[var(--border)] rounded-xl overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold sticky top-0 z-10 border-b border-[var(--border)]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === candidates.length && candidates.length > 0}
                          onChange={handleToggleAll}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="p-2.5 min-w-[150px]">Từ gốc trong CSDL</th>
                      <th className="p-2.5 min-w-[140px]">Từ sau khi tách</th>
                      <th className="p-2.5 min-w-[100px]">Từ loại</th>
                      <th className="p-2.5 min-w-[130px]">Đồng nghĩa</th>
                      <th className="p-2.5 min-w-[120px]">Trái nghĩa</th>
                      <th className="p-2.5 min-w-[160px]">Thư mục liên kết</th>
                      <th className="p-2.5 min-w-[110px]">Thay đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {candidates.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleToggleSelect(item.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/15' : 'opacity-60'
                          } hover:bg-[var(--bg-subtle)]`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.id)}
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                            {item.originalWord}
                          </td>
                          <td className="p-2.5 font-bold text-[var(--text-primary)] font-sans">
                            {item.cleanWord}
                          </td>
                          <td className="p-2.5">
                            {item.newPos ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                {item.newPos}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)]">
                            {item.newSynonyms ? (
                              <span className="text-emerald-600 font-medium">
                                {item.newSynonyms}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)]">
                            {item.newAntonyms ? (
                              <span className="text-rose-500 font-medium">
                                {item.newAntonyms}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400">
                            {item.targetFolderName ? (
                              <span className="flex items-center gap-1">
                                <span>📁</span>
                                <span>{item.targetFolderName}</span>
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] italic">Giữ nguyên</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap gap-1">
                              {item.changeTypes.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)]"
                                >
                                  {t === 'word' && 'Tách từ'}
                                  {t === 'pos' && 'Từ loại'}
                                  {t === 'synonyms' && 'Đồng nghĩa'}
                                  {t === 'antonyms' && 'Trái nghĩa'}
                                  {t === 'folder' && 'Thư mục'}
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
            </div>
          )}
        </div>

        {/* Footer */}
        {appliedCount === null && candidates.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || selectedIds.size === 0}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang áp dụng...</span>
                </>
              ) : (
                <span>Xác nhận cập nhật ({selectedIds.size} từ)</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

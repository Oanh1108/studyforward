"use client";

import React, { useState } from 'react';
import { VocabularyFolder, MyVocabularyWord, myVocabApi } from '@/lib/myVocabApi';
import { Select } from '@/components/ui/Select';

interface MoveWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: MyVocabularyWord | null;
  folders: VocabularyFolder[];
  onSuccess: (updatedWord: MyVocabularyWord) => void;
}

export function MoveWordModal({
  isOpen,
  onClose,
  word,
  folders,
  onSuccess,
}: MoveWordModalProps) {
  const [targetFolderId, setTargetFolderId] = useState<number | null>(word?.folderId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !word) return null;

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await myVocabApi.moveMyWord(word.id, targetFolderId);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể chuyển từ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Chuyển từ sang thư mục khác
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
          >
            ✕
          </button>
        </div>

        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            Từ đang chọn:{' '}
            <strong className="text-[var(--text-primary)] font-bold">{word.word}</strong> ({word.meaning})
          </p>
        </div>

        {error && (
          <div className="text-xs p-2.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleMove} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Chọn thư mục đích
            </label>
            <Select
              value={targetFolderId ?? ''}
              onChange={(val) => setTargetFolderId(val ? Number(val) : null)}
              options={[
                { value: '', label: '📁 Danh sách chung (Chưa phân loại)' },
                ...folders.map((f) => ({
                  value: f.id,
                  label: `📁 ${f.name} ${f.id === word.folderId ? '(Thư mục hiện tại)' : `(${f.wordCount} từ)`}`,
                  disabled: f.id === word.folderId
                }))
              ]}
              className="w-full text-xs md:text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || targetFolderId === word.folderId}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

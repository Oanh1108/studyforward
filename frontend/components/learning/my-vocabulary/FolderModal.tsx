"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, FolderOpen, Trash2, X } from 'lucide-react';
import { VocabularyFolder, myVocabApi } from '@/lib/myVocabApi';
import { useAuth } from '@/lib/authContext';
import { SupportedLanguage, LANGUAGE_LIST, getLanguageInfo } from '@/lib/languages';
import { AlertDialog } from '@/components/ui/AlertDialog';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: VocabularyFolder | null;
  initialMode?: 'edit' | 'delete';
  onSuccess: (updatedFolder?: VocabularyFolder, deletedId?: number) => void;
}

const COLOR_PRESETS = [
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Tím', value: '#8b5cf6' },
  { name: 'Xanh ngọc', value: '#06b6d4' },
  { name: 'Xanh lá', value: '#10b981' },
  { name: 'Cam hổ phách', value: '#f59e0b' },
  { name: 'Đỏ hồng', value: '#ef4444' },
  { name: 'Hồng sen', value: '#ec4899' },
  { name: 'Xám đậm', value: '#64748b' },
];

function FolderModalContent({ isOpen, onClose, folderToEdit, initialMode = 'edit', onSuccess }: FolderModalProps) {
  const { currentLanguage } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation mode
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setDescription(folderToEdit.description || '');
      setColor(folderToEdit.color || '#3b82f6');
      setLanguage(folderToEdit.language || 'en');
    } else {
      setName('');
      setDescription('');
      setColor('#3b82f6');
      setLanguage(currentLanguage || 'en');
    }
    setError(null);
    setShowDeleteConfirm(initialMode === 'delete');
  }, [folderToEdit, isOpen, currentLanguage, initialMode]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasWords = !!(folderToEdit && folderToEdit.wordCount > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên thư mục');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (folderToEdit) {
        const updated = await myVocabApi.updateFolder(folderToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          language: hasWords ? undefined : language,
        });
        onSuccess(updated);
      } else {
        const created = await myVocabApi.createFolder({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          language,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu thư mục. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!folderToEdit) return;
    setIsDeleting(true);
    setError(null);

    try {
      await myVocabApi.deleteFolder(folderToEdit.id);
      onSuccess(undefined, folderToEdit.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể xóa thư mục');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    /* Overlay: fixed inset-0 renders at viewport level since we use a Portal at document.body */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label={showDeleteConfirm ? 'Xác nhận xóa thư mục' : folderToEdit ? 'Chỉnh sửa thư mục' : 'Tạo thư mục mới'}
    >
      {showDeleteConfirm && folderToEdit ? (
        <AlertDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (initialMode === 'delete') onClose();
            else setShowDeleteConfirm(false);
          }}
          onConfirm={handleDelete}
          title="Xóa thư mục?"
          description={
            <div className="space-y-2">
              <p>Bạn có chắc chắn muốn xóa thư mục <strong className="text-[var(--text-primary)] font-bold">"{folderToEdit.name}"</strong>?</p>
              <p className="text-rose-600 dark:text-rose-400 font-semibold">
                Toàn bộ <span className="underline">{folderToEdit.wordCount || 0} từ vựng</span> bên trong thư mục này cũng sẽ bị xóa vĩnh viễn và không thể khôi phục!
              </p>
              {error && <p className="text-rose-500 mt-2">{error}</p>}
            </div>
          }
          isProcessing={isDeleting}
        />
      ) : (
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] animate-scale-up">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 pb-4 pt-6">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white transition-colors"
              style={{ backgroundColor: color }}
            >
              <FolderOpen className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
                {folderToEdit ? 'Chỉnh sửa thư mục' : 'Tạo thư mục mới'}
              </h2>
              <p className="truncate text-sm text-[var(--text-secondary)]">
                {name.trim() || 'Đặt tên, chọn màu và ngôn ngữ học'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-2">
            {error && (
              <div role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="folder-name" className="text-sm font-semibold text-[var(--text-primary)]">
                  Tên thư mục <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">{name.length}/60</span>
              </div>
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: TOEIC, Công việc, Từ mới mỗi ngày"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15"
                autoFocus
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="folder-description" className="text-sm font-semibold text-[var(--text-primary)]">
                Mô tả <span className="font-normal text-[var(--text-muted)]">(tùy chọn)</span>
              </label>
              <textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mục tiêu hoặc chủ đề của thư mục này"
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15"
                maxLength={200}
              />
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-[var(--text-primary)]">Màu nhận diện</legend>
              <div className="flex flex-wrap gap-3">
                {COLOR_PRESETS.map((preset) => {
                  const selected = color === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      title={preset.name}
                      aria-label={preset.name}
                      aria-pressed={selected}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                        selected ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-card)]' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.value }}
                    >
                      {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-[var(--text-primary)]">Ngôn ngữ học</legend>
              {hasWords ? (
                <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <p className="flex items-center gap-2 font-bold">
                    <span>{getLanguageInfo(language).flag}</span>
                    <span>{getLanguageInfo(language).name} ({getLanguageInfo(language).nativeName})</span>
                    <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold">Đã khóa</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Thư mục đang có {folderToEdit?.wordCount} từ nên không thể đổi ngôn ngữ, để tránh sai lệch dữ liệu.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LANGUAGE_LIST.map((l) => {
                    const selected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguage(l.code)}
                        aria-pressed={selected}
                        className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                          selected
                            ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]'
                            : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand)]/50 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className="truncate">{l.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-card)] px-6 py-4">
              {folderToEdit ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:outline-rose-500"
                >
                  <Trash2 className="h-4 w-4" /> Xóa thư mục
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                      <span>Đang lưu...</span>
                    </>
                  ) : folderToEdit ? (
                    'Cập nhật'
                  ) : (
                    'Tạo thư mục'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function FolderModal(props: FolderModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!props.isOpen || !mounted) return null;

  // Render at document.body level via Portal to escape any stacking context
  return createPortal(<FolderModalContent {...props} />, document.body);
}

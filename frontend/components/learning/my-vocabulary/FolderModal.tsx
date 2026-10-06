"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
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
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
              {showDeleteConfirm
                ? 'Xác nhận xóa thư mục'
                : folderToEdit
                ? 'Chỉnh sửa thư mục'
                : 'Tạo thư mục mới'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 overflow-y-auto">
          {error && (
              <div className="text-xs p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">
                {error}
              </div>
            )}

            {/* Folder Name */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Tên thư mục <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: TOEIC, Công việc, Từ mới mỗi ngày..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                autoFocus
                maxLength={60}
              />
            </div>

            {/* Folder Description */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Mô tả (tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú mục tiêu hoặc chủ đề của thư mục này..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                maxLength={200}
              />
            </div>

            {/* Color Tag Picker */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                Màu sắc nhận diện
              </label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    title={preset.name}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                      color === preset.value
                        ? 'scale-110 ring-2 ring-offset-2 ring-blue-500'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  >
                    {color === preset.value && (
                      <span className="text-white text-[11px] font-black">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                Ngôn ngữ học của thư mục
              </label>
              {hasWords ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span>{getLanguageInfo(language).flag}</span>
                    <span>{getLanguageInfo(language).name} ({getLanguageInfo(language).nativeName})</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-black uppercase">
                      Đã khóa
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Thư mục đang chứa {folderToEdit?.wordCount} từ. Không thể đổi ngôn ngữ để tránh sai lệch dữ liệu từ vựng.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LANGUAGE_LIST.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                        language === l.code
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-base leading-none">{l.flag}</span>
                      <span className="truncate">{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-4">
              {folderToEdit ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  🗑️ Xóa thư mục
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

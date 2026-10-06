'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  isProcessing?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  cancelText = 'Hủy',
  confirmText = 'Xóa',
  isProcessing = false,
}: AlertDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus on Cancel button by default
      if (cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isProcessing) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-slide-up"
      >
        <div className="p-5 md:p-6 space-y-4">
          <h2 id="alert-dialog-title" className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <div id="alert-dialog-description" className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </div>
        </div>
        
        <div className="px-5 md:px-6 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border)] flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-base)] border border-transparent hover:border-[var(--border)] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

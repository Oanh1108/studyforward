'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-2xl', 'max-w-4xl'
}

export function ModalDialog({ isOpen, onClose, children, maxWidth = 'max-w-lg' }: ModalDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full ${maxWidth} shadow-2xl flex flex-col overflow-hidden max-h-[96dvh] md:max-h-[92dvh] animate-slide-up`}>
        {children}
      </div>
    </div>,
    document.body
  );
}

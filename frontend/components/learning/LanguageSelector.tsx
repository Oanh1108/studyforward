"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { LANGUAGE_LIST, SupportedLanguage, getLanguageInfo } from '@/lib/languages';

interface LanguageSelectorProps {
  className?: string;
  compactOnMobile?: boolean;
}

export function LanguageSelector({ className = '', compactOnMobile = true }: LanguageSelectorProps) {
  const { currentLanguage, switchLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = getLanguageInfo(currentLanguage);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (code: SupportedLanguage) => {
    setIsOpen(false);
    if (code !== currentLanguage) {
      await switchLanguage(code);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chọn ngôn ngữ học"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--border)]/30 text-[var(--text-primary)] transition-all active:scale-95 shadow-2xs font-semibold text-xs"
      >
        <span className="text-base leading-none">{activeLang.flag}</span>
        {/* Chữ hiển thị tên ngôn ngữ */}
        <span className={compactOnMobile ? "hidden sm:inline font-bold" : "font-bold"}>
          {activeLang.name}
        </span>
        <span className={compactOnMobile ? "sm:hidden font-bold" : "hidden"}>
          {activeLang.name.replace('Tiếng ', '')}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-2 w-52 sm:w-56 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl p-2 z-50 animate-fade-up">
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)] mb-1">
            Ngôn ngữ đang học
          </div>
          <div className="space-y-1">
            {LANGUAGE_LIST.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/40'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <div className="text-left">
                      <div className="leading-tight">{lang.name}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-normal">{lang.nativeName}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

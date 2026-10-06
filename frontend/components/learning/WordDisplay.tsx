import React from 'react';
import { MyVocabularyWord } from '@/lib/myVocabApi';
import { getPrimaryReading } from '@/lib/languages';

interface WordDisplayProps {
  word: MyVocabularyWord;
  isReversed: boolean;
  showPhonetics: boolean;
  hidePhoneticsForTest?: boolean;
  hideWordText?: boolean;
  onPronounce: (word: string, lang?: string, e?: React.MouseEvent) => void;
  size?: 'normal' | 'large';
  className?: string;
}

export function WordDisplay({
  word,
  isReversed,
  showPhonetics,
  hidePhoneticsForTest,
  hideWordText,
  onPronounce,
  size = 'large',
  className = '',
}: WordDisplayProps) {
  // Define helper to get meaning
  const getWordMeaning = (w: MyVocabularyWord) => {
    const val = (w as any).meaning || (w as any).vietnameseMeaning || (w as any).definition || (w as any).translation;
    return typeof val === 'string' ? val.trim() : '';
  };

  const displayText = isReversed ? getWordMeaning(word) : word.word;
  const phonetic = getPrimaryReading(word as any);
  const showPhoneticText = !isReversed && showPhonetics && phonetic && !hidePhoneticsForTest;

  return (
    <div className={`flex flex-col items-center justify-center text-center relative ${className}`}>
      {!hideWordText && (
        <div className="flex flex-wrap items-center gap-2 justify-center mb-1">
          <div className={`font-black text-[var(--text-primary)] ${size === 'large' ? 'text-2xl sm:text-4xl tracking-tight' : 'text-xl sm:text-3xl'}`}>
            {displayText}
          </div>
          {!isReversed && word.partOfSpeech && (
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              {word.partOfSpeech}
            </span>
          )}
        </div>
      )}

      {showPhoneticText && !hideWordText && (
        <div className="text-xs sm:text-sm font-mono text-indigo-600 dark:text-indigo-400 mt-1">
          {phonetic}
        </div>
      )}

      {/* Action Button: Pronounce */}
      <div className="absolute -right-10 top-0 sm:right-auto sm:relative sm:mt-3 flex items-center justify-center">
        <button
          title="Nghe lại — Ctrl"
          type="button"
          onClick={(e) => onPronounce(word.word, word.language, e)}
          className="p-1.5 sm:p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-[var(--text-secondary)] transition-all shadow-sm"
        >
          🔊
        </button>
      </div>
    </div>
  );
}

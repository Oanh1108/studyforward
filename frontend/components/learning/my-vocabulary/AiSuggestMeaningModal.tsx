"use client";

import React, { useState, useEffect } from 'react';
import { MyVocabularyWord, MeaningSuggestion, myVocabApi } from '@/lib/myVocabApi';
import { SupportedLanguage, getLanguageInfo } from '@/lib/languages';

interface AiSuggestMeaningModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: MyVocabularyWord | null;
  currentLanguage: SupportedLanguage;
  onMeaningApplied: (updatedWord: MyVocabularyWord) => void;
}

export function AiSuggestMeaningModal({
  isOpen,
  onClose,
  word,
  currentLanguage,
  onMeaningApplied,
}: AiSuggestMeaningModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MeaningSuggestion[]>([]);
  const [selectedMeaning, setSelectedMeaning] = useState<string>('');
  const [selectedPos, setSelectedPos] = useState<string>('');
  const [customMeaning, setCustomMeaning] = useState<string>('');

  const langInfo = getLanguageInfo(currentLanguage);

  useEffect(() => {
    if (isOpen && word) {
      loadSuggestions(word.word);
    } else {
      setSuggestions([]);
      setSelectedMeaning('');
      setSelectedPos('');
      setCustomMeaning('');
      setError(null);
    }
  }, [isOpen, word]);

  const loadSuggestions = async (wordText: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await myVocabApi.suggestMeanings(wordText, word?.language || currentLanguage);
      const list = res.suggestions || [];
      setSuggestions(list);
      if (list.length > 0) {
        setSelectedMeaning(list[0].meaning);
        setSelectedPos(list[0].partOfSpeech || '');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tra cứu gợi ý AI cho từ này.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!word) return;

    const finalMeaning = customMeaning.trim() || selectedMeaning.trim();
    if (!finalMeaning) {
      setError('Vui lòng chọn hoặc nhập một nghĩa tiếng Việt cho từ.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await myVocabApi.updateMyWord(word.id, {
        meaning: finalMeaning,
        partOfSpeech: selectedPos.trim() || word.partOfSpeech || null,
      });
      onMeaningApplied(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật nghĩa vào cơ sở dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl">
              ✨
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <span>Gợi ý nghĩa tiếng Việt (AI)</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  {langInfo.flag} {langInfo.name}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Xem gợi ý nghĩa và xác nhận trước khi lưu vào CSDL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Target Word Info */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--text-muted)]">Từ cần thêm nghĩa:</span>
              <p className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                {word.word}
              </p>
            </div>
            {word.partOfSpeech && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 uppercase">
                {word.partOfSpeech}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-10 text-center space-y-3">
              <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-muted)]">
                AI đang tìm kiếm các nghĩa tiếng Việt phù hợp nhất...
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Không tìm thấy gợi ý tự động. Bạn có thể tự nhập nghĩa tiếng Việt dưới đây:
              </p>
              <input
                type="text"
                value={customMeaning}
                onChange={(e) => setCustomMeaning(e.target.value)}
                placeholder="Nhập nghĩa tiếng Việt..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-secondary)]">
                Chọn một nghĩa gợi ý hoặc tự điều chỉnh:
              </label>

              <div className="space-y-2">
                {suggestions.map((sug, idx) => {
                  const isChecked = selectedMeaning === sug.meaning && !customMeaning;
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                          : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ai_suggest_meaning"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedMeaning(sug.meaning);
                          setSelectedPos(sug.partOfSpeech || '');
                          setCustomMeaning('');
                        }}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {sug.meaning}
                          </span>
                          {sug.partOfSpeech && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 font-semibold">
                              {sug.partOfSpeech}
                            </span>
                          )}
                        </div>
                        {sug.example && (
                          <p className="text-[11px] text-[var(--text-muted)] italic mt-1">
                            "{sug.example}"
                            {sug.exampleTranslation && ` — ${sug.exampleTranslation}`}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Or enter custom meaning */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Hoặc tự chỉnh sửa nghĩa tiếng Việt khác:
                </label>
                <input
                  type="text"
                  value={customMeaning}
                  onChange={(e) => setCustomMeaning(e.target.value)}
                  placeholder="Ví dụ: dùng bữa tối, ăn tối..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving || isLoading || (!selectedMeaning && !customMeaning.trim())}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
              isSaving || isLoading || (!selectedMeaning && !customMeaning.trim())
                ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu vào CSDL...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Xác nhận & Lưu vào CSDL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

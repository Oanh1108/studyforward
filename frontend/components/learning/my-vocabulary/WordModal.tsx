"use client";

import React, { useState, useEffect, useRef } from 'react';
import { VocabularyFolder, MyVocabularyWord, MeaningSuggestion, myVocabApi } from '@/lib/myVocabApi';
import { speakText } from '../speechHelper';
import { useAuth } from '@/lib/authContext';
import { SupportedLanguage, getLanguageInfo } from '@/lib/languages';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { Select } from '@/components/ui/Select';

interface WordModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordToEdit?: MyVocabularyWord | null;
  folders: VocabularyFolder[];
  activeFolderId?: number | null;
  onSuccess: (word: MyVocabularyWord, isNew: boolean) => void;
}

const POS_OPTIONS = [
  { value: 'danh từ', label: 'Danh từ (Noun / 名词 / 명사)' },
  { value: 'động từ', label: 'Động từ (Verb / 动词 / 동사)' },
  { value: 'tính từ', label: 'Tính từ (Adjective / 形容词 / 형용사)' },
  { value: 'trạng từ', label: 'Trạng từ (Adverb / 副词 / 부사)' },
  { value: 'lượng từ', label: 'Lượng từ (Classifier / 量词)' },
  { value: 'trợ từ', label: 'Trợ từ (Particle / 助词 / 조사)' },
  { value: 'thán từ', label: 'Thán từ (Interjection / 感叹词 / 감탄사)' },
  { value: 'khác', label: 'Khác / Cụm từ (Other / Phrase)' },
];

export function WordModal({
  isOpen,
  onClose,
  wordToEdit,
  folders,
  activeFolderId,
  onSuccess,
}: WordModalProps) {
  const { currentLanguage } = useAuth();

  // Form fields
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [reading, setReading] = useState('');
  const [ipa, setIpa] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [kana, setKana] = useState('');
  const [romaji, setRomaji] = useState('');
  const [romaja, setRomaja] = useState('');
  const [thaiReading, setThaiReading] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('danh từ');
  const [synonyms, setSynonyms] = useState('');
  const [antonyms, setAntonyms] = useState('');
  const [example, setExample] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [notes, setNotes] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [ttsNotification, setTtsNotification] = useState<string | null>(null);

  // AI Suggestion states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<MeaningSuggestion[]>([]);
  const [languageWarning, setLanguageWarning] = useState<string | null>(null);
  const [selectedAiIndices, setSelectedAiIndices] = useState<number[]>([]);
  const lastQueriedWordRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine current active language based on folder, wordToEdit or user currentLanguage
  const selectedFolder = folders.find((f) => f.id === folderId);
  const effectiveLanguage: SupportedLanguage =
    (selectedFolder?.language as SupportedLanguage) ||
    wordToEdit?.language ||
    currentLanguage ||
    'en';

  const langInfo = getLanguageInfo(effectiveLanguage);

  useEffect(() => {
    if (wordToEdit) {
      setWord(wordToEdit.word);
      setMeaning(wordToEdit.meaning || '');
      setReading(wordToEdit.reading || '');
      setIpa(wordToEdit.ipa || '');
      setPinyin(wordToEdit.pinyin || '');
      setKana(wordToEdit.kana || '');
      setRomaji(wordToEdit.romaji || '');
      setRomaja(wordToEdit.romaja || '');
      setThaiReading(wordToEdit.thaiReading || '');
      setPartOfSpeech(wordToEdit.partOfSpeech || 'danh từ');
      setSynonyms(wordToEdit.synonyms || '');
      setAntonyms(wordToEdit.antonyms || '');
      setExample(wordToEdit.example || '');
      setExampleTranslation(wordToEdit.exampleTranslation || '');
      setNotes(wordToEdit.notes || '');
      setFolderId(wordToEdit.folderId ?? null);
      lastQueriedWordRef.current = wordToEdit.word.toLowerCase();
    } else {
      setWord('');
      setMeaning('');
      setReading('');
      setIpa('');
      setPinyin('');
      setKana('');
      setRomaji('');
      setRomaja('');
      setThaiReading('');
      setPartOfSpeech('danh từ');
      setSynonyms('');
      setAntonyms('');
      setExample('');
      setExampleTranslation('');
      setNotes('');
      setFolderId(activeFolderId ?? (folders[0]?.id ?? null));
      lastQueriedWordRef.current = '';
    }
    setError(null);
    setDuplicateWarning(null);
    setLanguageWarning(null);
    setTtsNotification(null);
    setAiSuggestions([]);
    setSelectedAiIndices([]);
  }, [wordToEdit, isOpen, activeFolderId, folders]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const triggerAiSuggestion = async (searchWord: string, force: boolean = false) => {
    const clean = searchWord.trim();
    if (!clean || clean.length < 1) {
      setAiSuggestions([]);
      setLanguageWarning(null);
      return;
    }
    if (!force && clean.toLowerCase() === lastQueriedWordRef.current.toLowerCase()) {
      return;
    }

    lastQueriedWordRef.current = clean.toLowerCase();
    setIsAiLoading(true);
    setLanguageWarning(null);

    try {
      const res = await myVocabApi.suggestMeanings(clean, effectiveLanguage, example || undefined);
      setAiSuggestions(res.suggestions || []);
      if (res.languageWarning) {
        setLanguageWarning(res.languageWarning);
      }
      setSelectedAiIndices([]);
    } catch {
      // Graceful fallback: user can always enter manually
      setAiSuggestions([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleWordChange = (val: string) => {
    setWord(val);
    setError(null);
    setDuplicateWarning(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = val.trim();
    if (clean.length >= 1 && clean.toLowerCase() !== lastQueriedWordRef.current.toLowerCase()) {
      debounceTimerRef.current = setTimeout(() => {
        triggerAiSuggestion(clean);
      }, 700);
    }
  };

  const handleWordBlur = () => {
    const clean = word.trim();
    if (clean.length >= 1 && clean.toLowerCase() !== lastQueriedWordRef.current.toLowerCase()) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      triggerAiSuggestion(clean);
    }
  };

  const toggleAiSuggestion = (index: number) => {
    const item = aiSuggestions[index];
    if (!item) return;

    let newIndices: number[];
    if (selectedAiIndices.includes(index)) {
      newIndices = selectedAiIndices.filter((i) => i !== index);
    } else {
      newIndices = [...selectedAiIndices, index];
    }
    setSelectedAiIndices(newIndices);

    // Populate fields based on checked suggestions
    if (newIndices.length > 0) {
      const selectedMeanings = newIndices.map((i) => aiSuggestions[i].meaning);
      setMeaning(selectedMeanings.join('; '));

      if (item.partOfSpeech) {
        setPartOfSpeech(item.partOfSpeech);
      }
      if (item.ipa && !ipa) setIpa(item.ipa);
      if (item.pinyin && !pinyin) setPinyin(item.pinyin);
      if (item.kana && !kana) setKana(item.kana);
      if (item.romaji && !romaji) setRomaji(item.romaji);
      if (item.romaja && !romaja) setRomaja(item.romaja);
      if (item.thaiReading && !thaiReading) setThaiReading(item.thaiReading);
      if (item.reading && !reading) setReading(item.reading);

      if (!example.trim() && item.example) {
        setExample(item.example);
      }
      if (!exampleTranslation.trim() && item.exampleTranslation) {
        setExampleTranslation(item.exampleTranslation);
      }
    }
  };

  const handleSpeak = async () => {
    if (!word.trim()) return;
    setTtsNotification(null);
    const result = await speakText(word.trim(), effectiveLanguage);
    if (result.message && !result.hasNativeVoice) {
      setTtsNotification(result.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent, allowDuplicateOverride: boolean = false) => {
    e.preventDefault();

    if (!word.trim()) {
      setError(`Vui lòng nhập ${langInfo.wordLabel.toLowerCase()}`);
      return;
    }
    if (!meaning.trim()) {
      setError('Vui lòng nhập nghĩa tiếng Việt');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      if (wordToEdit) {
        const updated = await myVocabApi.updateMyWord(wordToEdit.id, {
          word: word.trim(),
          meaning: meaning.trim(),
          reading: reading.trim() || undefined,
          ipa: ipa.trim() || undefined,
          pinyin: pinyin.trim() || undefined,
          kana: kana.trim() || undefined,
          romaji: romaji.trim() || undefined,
          romaja: romaja.trim() || undefined,
          thaiReading: thaiReading.trim() || undefined,
          partOfSpeech,
          synonyms: synonyms.trim() || undefined,
          antonyms: antonyms.trim() || undefined,
          example: example.trim() || undefined,
          exampleTranslation: exampleTranslation.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        // If folder changed
        if (wordToEdit.folderId !== folderId) {
          await myVocabApi.moveMyWord(wordToEdit.id, folderId);
        }

        onSuccess(updated, false);
        onClose();
      } else {
        const result = await myVocabApi.addMyWord({
          folderId,
          language: effectiveLanguage,
          word: word.trim(),
          meaning: meaning.trim(),
          reading: reading.trim() || undefined,
          ipa: ipa.trim() || undefined,
          pinyin: pinyin.trim() || undefined,
          kana: kana.trim() || undefined,
          romaji: romaji.trim() || undefined,
          romaja: romaja.trim() || undefined,
          thaiReading: thaiReading.trim() || undefined,
          partOfSpeech,
          synonyms: synonyms.trim() || undefined,
          antonyms: antonyms.trim() || undefined,
          example: example.trim() || undefined,
          exampleTranslation: exampleTranslation.trim() || undefined,
          notes: notes.trim() || undefined,
          allowDuplicate: allowDuplicateOverride,
        });

        if (result.isDuplicate && !allowDuplicateOverride) {
          setDuplicateWarning(result.message || 'Từ này đã có trong thư mục hiện tại.');
          setIsSubmitting(false);
          return;
        }

        onSuccess(result.item, true);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Không thể lưu từ vựng. Vui lòng kiểm tra lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{langInfo.flag}</span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                {wordToEdit ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới'}
              </h2>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                {langInfo.name} ({langInfo.nativeName})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e)} className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="text-xs p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">
              {error}
            </div>
          )}

          {ttsNotification && (
            <div className="text-xs p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-2">
              <span>ℹ️</span>
              <span>{ttsNotification}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <span>⚠️</span>
                <span>{duplicateWarning}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Bạn vẫn có thể lưu từ này vào thư mục nếu muốn giữ cả hai phiên bản.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Vẫn lưu từ trùng
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all"
                >
                  Chỉnh sửa lại
                </button>
              </div>
            </div>
          )}

          {/* Script Mismatch AI Warning */}
          {languageWarning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <span>⚠️ Cảnh báo sai hệ chữ</span>
              </div>
              <p className="text-xs leading-relaxed">
                {languageWarning}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                * Thư mục không tự đổi ngôn ngữ để bảo vệ tính toàn vẹn dữ liệu. Vui lòng kiểm tra lại từ vựng hoặc chuyển sang thư mục phù hợp.
              </p>
            </div>
          )}

          {/* Folder Target Selection */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Thư mục lưu trữ
            </label>
            <Select
              value={folderId ?? ''}
              onChange={(val) => setFolderId(val ? Number(val) : null)}
              options={[
                { value: '', label: '📁 Danh sách chung (Chưa phân loại)' },
                ...folders.map((f) => ({
                  value: f.id,
                  label: `📁 ${f.name} (${getLanguageInfo(f.language).name}) (${f.wordCount} từ)`
                }))
              ]}
              className="w-full text-xs md:text-sm"
            />
          </div>

          {/* Word Input & Pronounce */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-secondary)]">
                {langInfo.wordLabel} <span className="text-rose-500">*</span>
              </label>
              {word.trim() && (
                <button
                  type="button"
                  onClick={handleSpeak}
                  className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1 font-semibold"
                >
                  🔊 Phát âm ({langInfo.name})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={word}
                onChange={(e) => handleWordChange(e.target.value)}
                onBlur={handleWordBlur}
                placeholder={langInfo.wordPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans"
                autoFocus
              />
              {word.trim() && (
                <button
                  type="button"
                  onClick={() => triggerAiSuggestion(word, true)}
                  disabled={isAiLoading}
                  className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-all flex items-center gap-1"
                  title="Tìm lại gợi ý nghĩa tiếng Việt"
                >
                  <span>✨</span>
                  <span>Gợi ý AI</span>
                </button>
              )}
            </div>

            {/* AI Status / Indicator */}
            {isAiLoading && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium animate-pulse">
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>AI đang tìm nghĩa tiếng Việt, cách đọc và ví dụ cho {langInfo.name}...</span>
              </div>
            )}

            {/* AI Suggestions Box */}
            {!isAiLoading && aiSuggestions.length > 0 && (
              <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-transparent border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>✨</span>
                    <span>AI gợi ý nghĩa tiếng Việt theo ngữ cảnh ({langInfo.name}):</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    (Chọn để tự động điền)
                  </span>
                </div>

                <div className="space-y-1.5">
                  {aiSuggestions.map((item, idx) => {
                    const isChecked = selectedAiIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleAiSuggestion(idx)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-card)]/80 border-[var(--border)] hover:border-indigo-400/50 text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--text-primary)] text-sm">
                              {item.meaning}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
                              {item.partOfSpeech}
                            </span>
                            {(item.reading || item.pinyin || item.kana || item.romaja || item.thaiReading || item.ipa) && (
                              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                                [{item.pinyin || item.kana || item.romaja || item.thaiReading || item.ipa || item.reading}]
                              </span>
                            )}
                          </div>
                          {item.example && (
                            <p className="text-[11px] text-[var(--text-secondary)] italic">
                              "{item.example}" {item.exampleTranslation ? `— ${item.exampleTranslation}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Vietnamese Meaning (Required) */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Nghĩa tiếng Việt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={meaning}
              onChange={(e) => {
                setMeaning(e.target.value);
                setError(null);
              }}
              placeholder="Nhập nghĩa tiếng Việt hoặc tích chọn gợi ý AI..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Language-Specific Reading Fields */}
          {effectiveLanguage === 'zh' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Phiên âm Pinyin (có dấu thanh: ā, á, ǎ, à)
              </label>
              <input
                type="text"
                value={pinyin}
                onChange={(e) => setPinyin(e.target.value)}
                placeholder="Ví dụ: nǐ hǎo, jiānchí..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}

          {effectiveLanguage === 'ja' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Cách đọc Kana (Hiragana / Katakana)
                </label>
                <input
                  type="text"
                  value={kana}
                  onChange={(e) => setKana(e.target.value)}
                  placeholder="Ví dụ: べんきょう, さくら..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Phiên âm Romaji
                </label>
                <input
                  type="text"
                  value={romaji}
                  onChange={(e) => setRomaji(e.target.value)}
                  placeholder="Ví dụ: benkyou, sakura..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          )}

          {effectiveLanguage === 'ko' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Phiên âm Romaja (Latin Revised)
              </label>
              <input
                type="text"
                value={romaja}
                onChange={(e) => setRomaja(e.target.value)}
                placeholder="Ví dụ: annyeonghaseyo, sarang..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}

          {effectiveLanguage === 'th' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Cách đọc / Phiên âm tiếng Thái (hỗ trợ người Việt)
              </label>
              <input
                type="text"
                value={thaiReading}
                onChange={(e) => setThaiReading(e.target.value)}
                placeholder="Ví dụ: sà-wàt-dee (xa-oát-đi)..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}

          {effectiveLanguage === 'en' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Phiên âm IPA (tùy chọn)
              </label>
              <input
                type="text"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
                placeholder="/rɪˈzɪliənt/"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}

          {/* Part of Speech */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Từ loại (Part of Speech)
            </label>
            <Select
              value={partOfSpeech}
              onChange={(val) => setPartOfSpeech(val as string)}
              options={POS_OPTIONS}
              className="w-full text-xs md:text-sm"
            />
          </div>

          {/* 2 Columns: Synonyms & Antonyms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Từ đồng nghĩa (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={synonyms}
                onChange={(e) => setSynonyms(e.target.value)}
                placeholder="Phân cách bằng dấu phẩy..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Từ trái nghĩa (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={antonyms}
                onChange={(e) => setAntonyms(e.target.value)}
                placeholder="Phân cách bằng dấu phẩy..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Example Sentence & Translation */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Câu ví dụ bằng {langInfo.name} (tùy chọn)
              </label>
              <textarea
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder={`Nhập câu ví dụ bằng ${langInfo.name}...`}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Bản dịch ví dụ tiếng Việt (tùy chọn)
              </label>
              <input
                type="text"
                value={exampleTranslation}
                onChange={(e) => setExampleTranslation(e.target.value)}
                placeholder="Bản dịch nghĩa tiếng Việt của câu ví dụ trên..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Ghi chú riêng của bạn (tùy chọn)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cách nhớ mẹo, ngữ cảnh hay dùng..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : wordToEdit ? (
                'Cập nhật'
              ) : (
                'Thêm từ'
              )}
            </button>
          </div>
        </form>
    </ModalDialog>
  );
}

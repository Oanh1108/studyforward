"use client";

import React, { useState, useEffect } from 'react';
import { systemVocabApi, SystemWord } from '@/lib/systemVocabApi';
import { speakText } from '@/components/learning/speechHelper';
import { IconVolume, IconPlus, IconCheck, IconSearch, IconFilter, IconPlay } from '@/components/learning/icons';

type PracticeMode = 'idle' | 'meaning' | 'fill' | 'recall';

export function DiscoverVocabularyView() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [words, setWords] = useState<SystemWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('idle');
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    if (selectedTopic) {
      loadWords(selectedTopic);
    }
  }, [selectedTopic]);

  const loadTopics = async () => {
    try {
      const data = await systemVocabApi.getTopics('toeic'); // Default to TOEIC English for now
      setTopics(data);
      if (data.length > 0) {
        const firstTopic = typeof data[0] === 'string' ? data[0] : (data[0] as any).topic;
        setSelectedTopic(firstTopic);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadWords = async (topic: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await systemVocabApi.getWords(topic, 'toeic');
      setWords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      if (selectedTopic) loadWords(selectedTopic);
      return;
    }
    setLoading(true);
    setSelectedTopic('');
    try {
      const data = await systemVocabApi.searchWords(searchQuery.trim(), 'toeic');
      setWords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    const res = await speakText(text, 'en');
    if (!res.success && res.message) {
      alert(res.message); // Tell user if no TTS voice available
    }
  };

  const handleAddToNotebook = async (word: SystemWord) => {
    setSavingIds((prev) => new Set(prev).add(word.id));
    try {
      await systemVocabApi.addToMyNotebook(word);
      setSavedIds((prev) => new Set(prev).add(word.id));
    } catch (err) {
      alert('Không thể lưu từ này vào sổ tay. Có thể từ đã tồn tại.');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(word.id);
        return next;
      });
    }
  };

  // Practice logic
  const startPractice = (mode: PracticeMode) => {
    if (words.length === 0) return;
    setPracticeMode(mode);
    setCurrentPracticeIndex(0);
    setUserAnswer('');
    setShowAnswer(false);
  };

  const currentWord = words[currentPracticeIndex];

  const handlePracticeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowAnswer(true);
  };

  const handleNextPractice = () => {
    if (currentPracticeIndex < words.length - 1) {
      setCurrentPracticeIndex((p) => p + 1);
      setUserAnswer('');
      setShowAnswer(false);
    } else {
      setPracticeMode('idle'); // Finished
    }
  };

  const generateOptions = (correctMeaning: string) => {
    const options = [correctMeaning];
    while (options.length < 4 && options.length < words.length) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      if (!options.includes(randomWord.meaning)) {
        options.push(randomWord.meaning);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  // Memoize options so they don't re-shuffle on re-render
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  useEffect(() => {
    if (practiceMode === 'meaning' && currentWord) {
      setCurrentOptions(generateOptions(currentWord.meaning));
    }
  }, [practiceMode, currentPracticeIndex]);

  return (
    <div className="space-y-6">
      {practiceMode !== 'idle' ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm animate-fade-in max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {practiceMode === 'meaning' ? 'Nhận biết nghĩa' : practiceMode === 'fill' ? 'Điền từ vào chỗ trống' : 'Nhớ lại từ'}
            </h2>
            <div className="text-sm text-[var(--text-muted)] font-bold">
              {currentPracticeIndex + 1} / {words.length}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            {practiceMode === 'meaning' && (
              <>
                <div className="text-3xl font-black text-[var(--text-primary)] text-center mb-6">{currentWord.word}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!showAnswer) {
                          setUserAnswer(opt);
                          setShowAnswer(true);
                        }
                      }}
                      className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                        !showAnswer
                          ? 'border-[var(--border)] hover:border-indigo-400 hover:bg-[var(--bg-subtle)]'
                          : opt === currentWord.meaning
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : opt === userAnswer
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-[var(--border)] opacity-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {practiceMode === 'fill' && (
              <form onSubmit={handlePracticeSubmit}>
                <div className="text-lg font-medium text-[var(--text-primary)] mb-6 leading-relaxed bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border)]">
                  {currentWord.example.split(new RegExp(`(${currentWord.word})`, 'i')).map((part, i) =>
                    part.toLowerCase() === currentWord.word.toLowerCase() ? (
                      <span key={i} className="inline-block border-b-2 border-indigo-500 w-24 mx-1"></span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                  <div className="text-sm text-[var(--text-muted)] mt-2">({currentWord.meaning})</div>
                </div>
                
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={showAnswer}
                  placeholder="Gõ từ còn thiếu..."
                  className="input w-full text-center text-lg font-bold tracking-wider"
                  autoFocus
                />
              </form>
            )}

            {practiceMode === 'recall' && (
              <form onSubmit={handlePracticeSubmit} className="text-center">
                <div className="text-xl font-bold text-[var(--text-primary)] mb-2">{currentWord.meaning}</div>
                <div className="text-sm text-[var(--text-muted)] mb-6">Loại từ: {currentWord.partOfSpeech}</div>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={showAnswer}
                  placeholder="Nhập từ tiếng Anh..."
                  className="input w-full text-center text-lg font-bold tracking-wider"
                  autoFocus
                />
              </form>
            )}

            {showAnswer && (
              <div className={`p-4 rounded-xl border ${userAnswer.toLowerCase() === (practiceMode === 'meaning' ? currentWord.meaning.toLowerCase() : currentWord.word.toLowerCase()) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <div className="font-bold flex items-center gap-2 mb-1">
                  {userAnswer.toLowerCase() === (practiceMode === 'meaning' ? currentWord.meaning.toLowerCase() : currentWord.word.toLowerCase()) ? '🎉 Chính xác!' : '💡 Đáp án đúng là:'}
                  <button onClick={() => playAudio(currentWord.word)} className="p-1 rounded-full hover:bg-white/50 text-indigo-600"><IconVolume className="w-5 h-5"/></button>
                </div>
                <div className="text-lg font-black">{currentWord.word} <span className="text-sm font-normal text-slate-500">{currentWord.phonetic}</span></div>
                <div className="text-sm mt-1">{currentWord.meaning}</div>
                <div className="text-xs text-slate-500 italic mt-2">{currentWord.example}</div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
            <button onClick={() => setPracticeMode('idle')} className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Thoát
            </button>
            {showAnswer ? (
              <button onClick={handleNextPractice} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all">
                Tiếp tục
              </button>
            ) : (
              practiceMode !== 'meaning' && (
                <button onClick={handlePracticeSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all">
                  Kiểm tra
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">Kho Từ Vựng</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Khám phá các từ vựng theo chủ đề. Luyện tập và thêm vào sổ tay cá nhân của bạn.
              </p>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Tìm kiếm từ vựng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full md:w-64"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <IconSearch className="w-4 h-4" />
              </div>
              <button type="submit" className="px-4 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl hover:bg-[var(--border)] font-bold text-sm transition-all">
                Tìm
              </button>
            </form>
          </div>

          {/* Topics Filter */}
          {!searchQuery && topics.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap mr-2">Chủ đề:</div>
              {topics.map((t, idx) => {
                const topicName = typeof t === 'string' ? t : (t as any).topic;
                const label = typeof t === 'object' && (t as any).count ? `${topicName} (${(t as any).count})` : topicName;
                return (
                  <button
                    key={topicName || idx}
                    onClick={() => setSelectedTopic(topicName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedTopic === topicName ? 'bg-indigo-600 text-white shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Practice Action Bar */}
          {words.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-indigo-700 dark:text-indigo-400">Luyện tập bộ từ này ({words.length} từ)</h3>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 mt-0.5">Làm các bài tập nhỏ để ghi nhớ nghĩa và cách dùng từ hiệu quả hơn.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startPractice('meaning')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:shadow-md transition-all">
                  Nhận biết nghĩa
                </button>
                <button onClick={() => startPractice('fill')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:shadow-md transition-all">
                  Điền từ
                </button>
                <button onClick={() => startPractice('recall')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:shadow-md transition-all">
                  Nhớ lại từ
                </button>
              </div>
            </div>
          )}

          {/* Word List */}
          {loading ? (
            <div className="text-center py-12 animate-pulse text-indigo-500 font-semibold">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="text-center py-12 text-rose-500 font-semibold">Lỗi: {error}</div>
          ) : words.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-2xl">Không tìm thấy từ vựng nào.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {words.map(word => (
                <div key={word.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-indigo-300 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-[var(--text-primary)]">{word.word}</h3>
                        <button
                          onClick={() => playAudio(word.word)}
                          className="p-1.5 bg-[var(--bg-subtle)] rounded-full text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                          title="Nghe phát âm"
                        >
                          <IconVolume className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-[var(--text-muted)] italic">{word.partOfSpeech}</span>
                        {word.phonetic && <span className="text-xs font-medium text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50">{word.phonetic}</span>}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAddToNotebook(word)}
                      disabled={savingIds.has(word.id) || savedIds.has(word.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        savedIds.has(word.id)
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40'
                      }`}
                    >
                      {savedIds.has(word.id) ? (
                        <><IconCheck className="w-3.5 h-3.5"/> Đã lưu</>
                      ) : savingIds.has(word.id) ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><IconPlus className="w-3.5 h-3.5"/> Sổ tay</>
                      )}
                    </button>
                  </div>
                  
                  <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">{word.meaning}</div>
                  
                  {word.example && (
                    <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] text-sm">
                      <div className="text-[var(--text-primary)] italic" dangerouslySetInnerHTML={{ __html: word.example.replace(new RegExp(`(${word.word})`, 'gi'), '<strong class="text-indigo-600 dark:text-indigo-400">$1</strong>') }} />
                      {word.exampleTranslation && <div className="text-[var(--text-muted)] mt-1">{word.exampleTranslation}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

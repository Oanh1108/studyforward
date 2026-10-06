"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VocabularyFolder, MyVocabularyWord, myVocabApi } from '@/lib/myVocabApi';
import { speakText, isAudioSupported } from '../speechHelper';
import { useAuth } from '@/lib/authContext';
import {
  SupportedLanguage,
  getLanguageInfo,
  getPrimaryReading,
} from '@/lib/languages';
import { isDueForReview } from '@/lib/spacedRepetition';

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'listening';
export type StudyScope = 'all' | 'new' | 'learning' | 'due';
export type WordCountOption = '10' | '20' | '30' | 'all';
export type QuizType = 'meaning' | 'synonym' | 'antonym' | 'mixed';

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: VocabularyFolder[];
  initialFolderId?: number | null;
  allWords: MyVocabularyWord[];
  onProgressSaved?: (newStats?: any) => void;
  onResumeRequested?: boolean;
}

interface SavedSessionState {
  sessionId: string;
  mode: StudyMode;
  language: string;
  folderIds: number[];
  includeUnassigned: boolean;
  scope: StudyScope;
  wordCountSetting: WordCountOption;
  isReversed: boolean;
  isShuffled: boolean;
  showPhonetics: boolean;
  deck: MyVocabularyWord[];
  currentIndex: number;
  studyHistory: Array<{
    word: MyVocabularyWord;
    rating?: number | string;
    isCorrect: boolean;
    userAnswer?: string;
  }>;
  activeSeconds: number;
  timestamp: number;
}

// Helper: Normalize Vietnamese & foreign meanings
function getWordMeaning(item?: MyVocabularyWord | null): string {
  if (!item) return '';
  const val = (item as any).meaning || (item as any).vietnameseMeaning || (item as any).definition || (item as any).translation;
  return typeof val === 'string' ? val.trim() : '';
}

// Helper: Clean string for typing comparison (collapses multiple whitespaces, lowercases)
function normalizeInputString(str: string): string {
  return (str || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function StudySessionModal({
  isOpen,
  onClose,
  folders,
  initialFolderId,
  allWords,
  onProgressSaved,
  onResumeRequested = false,
}: StudySessionModalProps) {
  const { user, currentLanguage } = useAuth();
  const langInfo = getLanguageInfo(currentLanguage);

  // Storage key for resume
  const sessionStorageKey = useMemo(() => {
    const uid = user?.id || (user?.email ? encodeURIComponent(user.email) : 'guest');
    return `sf_active_vocab_session_${uid}_${currentLanguage}`;
  }, [user, currentLanguage]);

  // Phase: 'setup' | 'studying' | 'summary'
  const [phase, setPhase] = useState<'setup' | 'studying' | 'summary'>('setup');

  // Setup options
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [scope, setScope] = useState<StudyScope>('all');
  const [wordCountSetting, setWordCountSetting] = useState<WordCountOption>('20');
  const [isReversed, setIsReversed] = useState(false);
  const [isShuffled, setIsShuffled] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(true);

  // Active study state
  const [sessionId, setSessionId] = useState<string>('');
  const [deck, setDeck] = useState<MyVocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyHistory, setStudyHistory] = useState<
    Array<{
      word: MyVocabularyWord;
      rating?: number | string;
      isCorrect: boolean;
      userAnswer?: string;
    }>
  >([]);

  // Active study time tracking (only when tab is visible)
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  // Quiz sub-type selection
  const [quizType, setQuizType] = useState<QuizType>('meaning');

  // Active quiz question state
  const [quizQuestionType, setQuizQuestionType] = useState<'meaning' | 'synonym' | 'antonym'>('meaning');
  const [quizChoices, setQuizChoices] = useState<string[]>([]);
  // Support for multi-answer (checkbox) questions
  const [quizCorrectAnswers, setQuizCorrectAnswers] = useState<string[]>([]);
  const [selectedQuizIndices, setSelectedQuizIndices] = useState<number[]>([]);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);

  // Typing practice state & IME composition
  const [typingInput, setTypingInput] = useState('');
  const [typingSubmitted, setTypingSubmitted] = useState(false);
  const [isTypingCorrect, setIsTypingCorrect] = useState(false);
  const isComposingRef = useRef(false);

  // Audio / Speech notification
  const [audioFallbackNotice, setAudioFallbackNotice] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Pool fetching
  const [sessionWordPool, setSessionWordPool] = useState<MyVocabularyWord[]>([]);
  const [isFetchingWords, setIsFetchingWords] = useState(false);
  const [savedSessionToResume, setSavedSessionToResume] = useState<SavedSessionState | null>(null);

  // Compatible folders for current language
  const compatibleFolders = useMemo(() => {
    return folders.filter((f) => !f.language || f.language === currentLanguage);
  }, [folders, currentLanguage]);

  // Load words from backend on open
  useEffect(() => {
    if (isOpen) {
      setIsFetchingWords(true);
      myVocabApi
        .getMyWords({ language: currentLanguage })
        .then((res) => {
          setSessionWordPool(Array.isArray(res) ? res : []);
        })
        .catch(() => {
          setSessionWordPool(allWords);
        })
        .finally(() => {
          setIsFetchingWords(false);
        });
    }
  }, [isOpen, currentLanguage, allWords]);

  // Check saved session in localStorage
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(sessionStorageKey);
      if (saved) {
        const parsed: SavedSessionState = JSON.parse(saved);
        if (
          parsed &&
          parsed.deck &&
          parsed.deck.length > 0 &&
          parsed.currentIndex < parsed.deck.length &&
          parsed.language === currentLanguage
        ) {
          setSavedSessionToResume(parsed);
          if (onResumeRequested) {
            resumeSavedSession(parsed);
          }
          return;
        }
      }
    } catch {}
    setSavedSessionToResume(null);
  }, [isOpen, sessionStorageKey, currentLanguage, onResumeRequested]);

  // Initialize folders selection
  useEffect(() => {
    if (isOpen && phase === 'setup' && !savedSessionToResume) {
      if (initialFolderId !== undefined && initialFolderId !== null) {
        setSelectedFolderIds([initialFolderId]);
        setIncludeUnassigned(false);
      } else {
        setSelectedFolderIds(compatibleFolders.map((f) => f.id));
        setIncludeUnassigned(true);
      }
    }
  }, [isOpen, initialFolderId, compatibleFolders, phase, savedSessionToResume]);

  // Active Timer: only tick when visible and in studying phase
  useEffect(() => {
    if (phase !== 'studying' || !isOpen) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setActiveSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isOpen]);

  // Auto-save in-progress session to localStorage
  useEffect(() => {
    if (phase === 'studying' && deck.length > 0 && typeof window !== 'undefined') {
      const stateToSave: SavedSessionState = {
        sessionId: sessionId || `session_${Date.now()}`,
        mode: studyMode,
        language: currentLanguage,
        folderIds: selectedFolderIds,
        includeUnassigned,
        scope,
        wordCountSetting,
        isReversed,
        isShuffled,
        showPhonetics,
        deck,
        currentIndex,
        studyHistory,
        activeSeconds,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(sessionStorageKey, JSON.stringify(stateToSave));
        setSaveStatus('saved');
      } catch {}
    }
  }, [
    phase,
    sessionId,
    studyMode,
    currentLanguage,
    selectedFolderIds,
    includeUnassigned,
    scope,
    wordCountSetting,
    isReversed,
    isShuffled,
    showPhonetics,
    deck,
    currentIndex,
    studyHistory,
    activeSeconds,
    sessionStorageKey,
  ]);

  // Available words filtered by language and selected folders
  const currentPool = sessionWordPool.length > 0 ? sessionWordPool : allWords;

  // Folder filtered pool
  const folderFilteredWords = useMemo(() => {
    return currentPool.filter((w) => {
      if (w.language && w.language !== currentLanguage) return false;
      if (w.folderId === null || w.folderId === undefined) {
        return includeUnassigned;
      }
      return selectedFolderIds.includes(w.folderId);
    });
  }, [currentPool, selectedFolderIds, includeUnassigned, currentLanguage]);

  // Scope filtered pool (All, New, Learning, Due)
  const scopedWords = useMemo(() => {
    return folderFilteredWords.filter((w) => {
      if (scope === 'all') return true;
      if (scope === 'new') {
        return w.status === 'new' || (!w.lastReviewedAt && (w.stage || 1) <= 1);
      }
      if (scope === 'learning') {
        return w.status === 'learning' || ((w.stage || 1) < 4 && w.status !== 'mastered');
      }
      if (scope === 'due') {
        return isDueForReview(w as any);
      }
      return true;
    });
  }, [folderFilteredWords, scope]);

  // Deduplicate and filter out words lacking meaning
  const { validWords, invalidWordsWithoutMeaning } = useMemo(() => {
    const valid: MyVocabularyWord[] = [];
    const invalid: MyVocabularyWord[] = [];
    const seenIds = new Set<number>();
    const seenTexts = new Set<string>();

    for (const w of scopedWords) {
      const cleanText = (w.word || '').trim().toLowerCase();
      // Deduplicate across folders
      if (seenIds.has(w.id) || seenTexts.has(cleanText)) {
        continue;
      }
      seenIds.add(w.id);
      seenTexts.add(cleanText);

      const m = getWordMeaning(w);
      if (!m) {
        invalid.push(w);
      } else {
        valid.push(w);
      }
    }
    return { validWords: valid, invalidWordsWithoutMeaning: invalid };
  }, [scopedWords]);

  // Resume saved session
  const resumeSavedSession = (saved: SavedSessionState) => {
    setSessionId(saved.sessionId);
    setStudyMode(saved.mode);
    setSelectedFolderIds(saved.folderIds || []);
    setIncludeUnassigned(saved.includeUnassigned ?? true);
    setScope(saved.scope || 'all');
    setWordCountSetting(saved.wordCountSetting || 'all');
    setIsReversed(saved.isReversed ?? false);
    setIsShuffled(saved.isShuffled ?? false);
    setShowPhonetics(saved.showPhonetics ?? true);
    setDeck(saved.deck);
    setCurrentIndex(saved.currentIndex || 0);
    setStudyHistory(saved.studyHistory || []);
    setActiveSeconds(saved.activeSeconds || 0);
    setIsFlipped(false);
    setTypingInput('');
    setTypingSubmitted(false);
    setSelectedQuizIndex(null);
    setIsQuizSubmitted(false);
    setSavedSessionToResume(null);
    setPhase('studying');
  };

  // Discard saved session
  const discardSavedSession = () => {
    try {
      localStorage.removeItem(sessionStorageKey);
    } catch {}
    setSavedSessionToResume(null);
  };

  // Play audio pronunciation
  const handlePronounce = useCallback(
    async (textToSpeak: string, wordLang?: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setAudioFallbackNotice(null);
      setIsPlayingAudio(true);

      const targetLang = wordLang || currentLanguage;
      const res = await speakText(textToSpeak, targetLang);
      setIsPlayingAudio(false);

      if (res.message && !res.hasNativeVoice) {
        setAudioFallbackNotice(res.message);
        setTimeout(() => setAudioFallbackNotice(null), 4500);
      }
    },
    [currentLanguage],
  );

  // Start a new session
  const startSession = (customList?: MyVocabularyWord[]) => {
    const sourceList = customList || validWords;
    if (sourceList.length === 0) return;

    let prepared = [...sourceList];
    if (isShuffled) {
      prepared.sort(() => Math.random() - 0.5);
    }

    if (!customList && wordCountSetting !== 'all') {
      const count = parseInt(wordCountSetting, 10);
      if (!isNaN(count) && count > 0) {
        prepared = prepared.slice(0, count);
      }
    }

    const newId = `study_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setSessionId(newId);
    setDeck(prepared);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyHistory([]);
    setActiveSeconds(0);
    setTypingInput('');
    setTypingSubmitted(false);
    setSelectedQuizIndex(null);
    setSelectedQuizIndices([]);
    setIsQuizSubmitted(false);
    setSavedSessionToResume(null);
    setPhase('studying');
  };

  const currentWord = deck[currentIndex];

  // Decide which quiz question type to use for the current card
  const resolveQuizQuestionType = (word: MyVocabularyWord): 'meaning' | 'synonym' | 'antonym' => {
    if (quizType === 'meaning') return 'meaning';
    if (quizType === 'synonym') {
      // Fall back to meaning if no synonyms
      const hasSyn = word.synonyms && word.synonyms.trim().length > 0;
      return hasSyn ? 'synonym' : 'meaning';
    }
    if (quizType === 'antonym') {
      const hasAnt = word.antonyms && word.antonyms.trim().length > 0;
      return hasAnt ? 'antonym' : 'meaning';
    }
    // mixed: randomly pick available type
    const available: Array<'meaning' | 'synonym' | 'antonym'> = ['meaning'];
    if (word.synonyms && word.synonyms.trim().length > 0) available.push('synonym');
    if (word.antonyms && word.antonyms.trim().length > 0) available.push('antonym');
    return available[Math.floor(Math.random() * available.length)];
  };

  // Parse comma/semicolon/slash-separated synonym or antonym list into clean tokens
  const parseWordList = (raw?: string | null): string[] => {
    if (!raw) return [];
    return raw
      .split(/[,;=/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Prepare Quiz choices for current card
  useEffect(() => {
    if (phase !== 'studying' || studyMode !== 'quiz' || !currentWord) return;

    setSelectedQuizIndex(null);
    setSelectedQuizIndices([]);
    setIsQuizSubmitted(false);

    const qType = resolveQuizQuestionType(currentWord);
    setQuizQuestionType(qType);

    // Determine correct answer(s)
    let correctAnswers: string[] = [];

    if (qType === 'meaning') {
      const m = isReversed ? currentWord.word : getWordMeaning(currentWord);
      if (m) correctAnswers = [m];
    } else if (qType === 'synonym') {
      correctAnswers = parseWordList(currentWord.synonyms);
    } else if (qType === 'antonym') {
      correctAnswers = parseWordList(currentWord.antonyms);
    }

    if (correctAnswers.length === 0) {
      // Fallback to meaning
      const m = isReversed ? currentWord.word : getWordMeaning(currentWord);
      correctAnswers = m ? [m] : [];
    }

    setQuizCorrectAnswers(correctAnswers);

    // Build distractor pool depending on question type
    const distractorSet = new Set<string>();
    const otherCandidates = currentPool.filter(
      (w) => w.id !== currentWord.id && (!w.language || w.language === currentLanguage),
    );

    for (const w of otherCandidates) {
      let candidates: string[] = [];
      if (qType === 'meaning') {
        candidates = isReversed ? [w.word] : [getWordMeaning(w)];
      } else if (qType === 'synonym') {
        candidates = parseWordList(w.synonyms);
      } else if (qType === 'antonym') {
        candidates = parseWordList(w.antonyms);
      }
      for (const c of candidates) {
        if (
          c &&
          !correctAnswers.some((a) => normalizeInputString(a) === normalizeInputString(c)) &&
          !distractorSet.has(c)
        ) {
          distractorSet.add(c);
        }
      }
    }

    // If not enough typed distractors, supplement with meanings from other words
    if (distractorSet.size < 3 && qType !== 'meaning') {
      for (const w of otherCandidates) {
        const m = getWordMeaning(w);
        if (
          m &&
          !correctAnswers.some((a) => normalizeInputString(a) === normalizeInputString(m)) &&
          !distractorSet.has(m)
        ) {
          distractorSet.add(m);
          if (distractorSet.size >= 3) break;
        }
      }
    }

    const distractors = Array.from(distractorSet).sort(() => Math.random() - 0.5);
    // Show max 3 distractors + first correct answer = 4 choices total
    const primaryCorrect = correctAnswers[0];
    const chosenDistractors = distractors.slice(0, 3);
    const allChoices = [primaryCorrect, ...chosenDistractors].sort(() => Math.random() - 0.5);

    setQuizChoices(allChoices);
  }, [phase, studyMode, currentIndex, currentWord, isReversed, currentPool, currentLanguage, quizType]);

  // Auto-play audio in 'listening' mode when card appears
  useEffect(() => {
    if (phase === 'studying' && studyMode === 'listening' && currentWord) {
      const timer = setTimeout(() => {
        handlePronounce(currentWord.word, currentWord.language);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, studyMode, currentIndex, currentWord, handlePronounce]);

  // Flashcard SRS rating handler (1: Again, 2: Hard, 3: Good, 4: Easy)
  const handleFlashcardRating = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!currentWord) return;
      const isRemembered = rating >= 3;

      setSaveStatus('saving');
      // Record locally
      setStudyHistory((prev) => [
        ...prev,
        { word: currentWord, rating, isCorrect: isRemembered },
      ]);

      // Save to backend with 4-level SRS
      try {
        await myVocabApi.recordWordStudy(currentWord.id, rating);
      } catch (err) {
        console.warn('Could not save word progress to server:', err);
      }

      setIsFlipped(false);
      if (currentIndex + 1 < deck.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        finishSession();
      }
    },
    [currentWord, currentIndex, deck.length],
  );

  // Quiz choice selection (single-answer for now; multi-select via checkbox handled separately)
  const handleSelectQuizChoice = (idx: number) => {
    if (isQuizSubmitted || !currentWord) return;

    setSelectedQuizIndex(idx);
    setIsQuizSubmitted(true);

    const chosen = quizChoices[idx];
    const isCorrect = quizCorrectAnswers.some(
      (a) => normalizeInputString(a) === normalizeInputString(chosen),
    );
    setIsQuizCorrect(isCorrect);

    // Save result (Rating 3 for correct, 1 for again)
    myVocabApi.recordWordStudy(currentWord.id, isCorrect ? 3 : 1).catch(() => {});

    setStudyHistory((prev) => [
      ...prev,
      { word: currentWord, rating: isCorrect ? 3 : 1, isCorrect, userAnswer: chosen },
    ]);
  };

  const handleNextQuizWord = () => {
    setSelectedQuizIndex(null);
    setSelectedQuizIndices([]);
    setIsQuizSubmitted(false);
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSession();
    }
  };

  // Typing submit handler (IME-protected)
  const handleTypingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isComposingRef.current) return; // Do NOT evaluate during IME composition
    if (!currentWord || typingSubmitted) return;

    const normalizedUser = normalizeInputString(typingInput);
    if (!normalizedUser) return;

    const targetCorrect = isReversed ? getWordMeaning(currentWord) : currentWord.word;
    const normalizedTarget = normalizeInputString(targetCorrect);

    // Accept configured alternative answers (synonyms, reading tokens)
    const acceptable = [normalizedTarget];
    if (!isReversed) {
      if (currentWord.synonyms) {
        currentWord.synonyms
          .split(/[,;=/]+/)
          .map((s) => normalizeInputString(s))
          .filter(Boolean)
          .forEach((s) => acceptable.push(s));
      }
      if (currentWord.romaji) acceptable.push(normalizeInputString(currentWord.romaji));
      if (currentWord.romaja) acceptable.push(normalizeInputString(currentWord.romaja));
      if (currentWord.kana) acceptable.push(normalizeInputString(currentWord.kana));
      if (currentWord.pinyin) acceptable.push(normalizeInputString(currentWord.pinyin));
    }

    const isCorrect = acceptable.includes(normalizedUser);
    setIsTypingCorrect(isCorrect);
    setTypingSubmitted(true);

    // Save to DB
    myVocabApi.recordWordStudy(currentWord.id, isCorrect ? 3 : 1).catch(() => {});

    setStudyHistory((prev) => [
      ...prev,
      { word: currentWord, rating: isCorrect ? 3 : 1, isCorrect, userAnswer: typingInput.trim() },
    ]);
  };

  const handleNextTypingWord = () => {
    setTypingInput('');
    setTypingSubmitted(false);
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSession();
    }
  };

  // Finalize session and send completion record to DB
  const finishSession = async () => {
    setPhase('summary');

    // Remove active in-progress session key
    try {
      localStorage.removeItem(sessionStorageKey);
    } catch {}

    const correctCount = studyHistory.filter((h) => h.isCorrect).length;
    const totalWords = deck.length;

    try {
      const res = await myVocabApi.completeStudySession({
        sessionId: sessionId || `session_${Date.now()}`,
        mode: studyMode,
        language: currentLanguage,
        folderIds: selectedFolderIds,
        totalWords,
        correctCount,
        durationSeconds: activeSeconds,
        details: studyHistory.map((h) => ({
          wordId: h.word.id,
          rating: h.rating,
          isCorrect: h.isCorrect,
          userAnswer: h.userAnswer,
        })),
      });

      if (onProgressSaved) {
        onProgressSaved(res.stats);
      }
    } catch (err) {
      console.warn('Could not record study session completion to backend:', err);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (phase !== 'studying') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Flashcard mode keys
      if (studyMode === 'flashcard') {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        } else if (isFlipped) {
          if (e.code === 'Digit1' || e.code === 'Numpad1') {
            e.preventDefault();
            handleFlashcardRating(1);
          } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
            e.preventDefault();
            handleFlashcardRating(2);
          } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
            e.preventDefault();
            handleFlashcardRating(3);
          } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
            e.preventDefault();
            handleFlashcardRating(4);
          }
        }
      } else if (studyMode === 'quiz') {
        if (!isQuizSubmitted) {
          if ((e.code === 'Digit1' || e.code === 'KeyA') && quizChoices[0]) handleSelectQuizChoice(0);
          else if ((e.code === 'Digit2' || e.code === 'KeyB') && quizChoices[1]) handleSelectQuizChoice(1);
          else if ((e.code === 'Digit3' || e.code === 'KeyC') && quizChoices[2]) handleSelectQuizChoice(2);
          else if ((e.code === 'Digit4' || e.code === 'KeyD') && quizChoices[3]) handleSelectQuizChoice(3);
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleNextQuizWord();
        }
      } else if (studyMode === 'typing' || studyMode === 'listening') {
        if (typingSubmitted && (e.code === 'Enter')) {
          e.preventDefault();
          handleNextTypingWord();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    phase,
    studyMode,
    isFlipped,
    isQuizSubmitted,
    typingSubmitted,
    handleFlashcardRating,
  ]);

  if (!isOpen) return null;

  // Accuracy calculation
  const correctCount = studyHistory.filter((h) => h.isCorrect).length;
  const accuracyPercent = studyHistory.length > 0 ? Math.round((correctCount / studyHistory.length) * 100) : 0;
  const unrememberedWords = studyHistory.filter((h) => !h.isCorrect).map((h) => h.word);

  // Minutes and seconds formatted
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins === 0) return `${rem} giây`;
    return `${mins} phút ${rem > 0 ? `${rem} giây` : ''}`;
  };

  // Audio voice available check
  const audioVoiceAvailable = isAudioSupported(currentLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-all">
        {/* ========================================================
            TOP HEADER BAR (Dedicated, distraction-free)
           ======================================================== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">
              {studyMode === 'flashcard' ? '🗂️' : studyMode === 'quiz' ? '✨' : studyMode === 'typing' ? '⌨️' : '🎧'}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                {phase === 'setup'
                  ? `Cấu hình buổi học từ vựng (${langInfo.name})`
                  : phase === 'studying'
                  ? `${
                      studyMode === 'flashcard'
                        ? 'Thẻ ghi nhớ Flashcard'
                        : studyMode === 'quiz'
                        ? 'Trắc nghiệm từ vựng'
                        : studyMode === 'typing'
                        ? 'Luyện gõ từ vựng'
                        : 'Nghe và viết chính tả'
                    } (${langInfo.name})`
                  : 'Tổng kết kết quả buổi học'}
              </h2>
              {phase === 'studying' && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>
                    Từ {currentIndex + 1} / {deck.length}
                  </span>
                  <span>•</span>
                  <span>⏱️ {formatTime(activeSeconds)}</span>
                  <span className="text-emerald-500 font-medium">✓ Đã lưu</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase === 'studying' ? (
              <button
                type="button"
                onClick={() => setExitConfirmOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Tạm dừng và lưu tiến độ"
              >
                ✕ Thoát
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (during study) */}
        {phase === 'studying' && deck.length > 0 && (
          <div className="w-full bg-[var(--bg-subtle)] h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-300"
              style={{ width: `${Math.round(((currentIndex + 1) / deck.length) * 100)}%` }}
            />
          </div>
        )}

        {/* Audio fallback warning banner */}
        {audioFallbackNotice && (
          <div className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold text-center border-b border-amber-500/20">
            ⚠️ {audioFallbackNotice}
          </div>
        )}

        {/* ========================================================
            MODAL BODY
           ======================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center">
          {/* ========================================================
              PHASE 1: SETUP
             ======================================================== */}
          {phase === 'setup' && (
            <div className="space-y-5 animate-fade-in">
              {/* Resume In-Progress Session Banner */}
              {savedSessionToResume && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📌</span>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        Bạn có phiên học chưa hoàn thành
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Đang học câu {savedSessionToResume.currentIndex + 1} / {savedSessionToResume.deck.length} (
                      {savedSessionToResume.mode === 'flashcard'
                        ? 'Flashcard'
                        : savedSessionToResume.mode === 'quiz'
                        ? 'Trắc nghiệm'
                        : savedSessionToResume.mode === 'typing'
                        ? 'Luyện gõ'
                        : 'Nghe & Viết'}
                      )
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resumeSavedSession(savedSessionToResume)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      Tiếp tục học
                    </button>
                    <button
                      type="button"
                      onClick={discardSavedSession}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-rose-600 transition-colors"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Chọn Thư mục */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    1. Chọn thư mục ({langInfo.name})
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolderIds(compatibleFolders.map((f) => f.id));
                        setIncludeUnassigned(true);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-[var(--text-muted)]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolderIds([]);
                        setIncludeUnassigned(false);
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {compatibleFolders.length === 0 && (
                  <div className="p-3 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
                    Chưa có thư mục nào cho ngôn ngữ {langInfo.name}.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  {compatibleFolders.map((f) => {
                    const isSelected = selectedFolderIds.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--text-primary)] font-bold'
                            : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] opacity-80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedFolderIds(selectedFolderIds.filter((id) => id !== f.id));
                            } else {
                              setSelectedFolderIds([...selectedFolderIds, f.id]);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: f.color }}
                        />
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {f.wordCount} từ
                        </span>
                      </label>
                    );
                  })}

                  {/* Unassigned folder */}
                  <label
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      includeUnassigned
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--text-primary)] font-bold'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] opacity-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={includeUnassigned}
                      onChange={(e) => setIncludeUnassigned(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="truncate flex-1">Chưa phân loại</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {currentPool.filter((w) => !w.folderId && (!w.language || w.language === currentLanguage)).length} từ
                    </span>
                  </label>
                </div>
              </div>

              {/* 2. Chế độ học (4 Chế độ) + Quiz subtype */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  2. Chọn chế độ học
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Flashcard */}
                  <button
                    type="button"
                    onClick={() => setStudyMode('flashcard')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      studyMode === 'flashcard'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xl mb-1">🗂️</div>
                    <div className="font-bold text-xs text-[var(--text-primary)]">Flashcard</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                      Lật thẻ xem nghĩa, đánh giá 4 mức nhớ
                    </div>
                  </button>

                  {/* Trắc nghiệm */}
                  <button
                    type="button"
                    onClick={() => setStudyMode('quiz')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      studyMode === 'quiz'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xl mb-1">✨</div>
                    <div className="font-bold text-xs text-[var(--text-primary)]">Trắc nghiệm</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                      Chọn 1 trong 4 đáp án đúng cùng ngôn ngữ
                    </div>
                  </button>

                  {/* Luyện gõ */}
                  <button
                    type="button"
                    onClick={() => setStudyMode('typing')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      studyMode === 'typing'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xl mb-1">⌨️</div>
                    <div className="font-bold text-xs text-[var(--text-primary)]">Luyện gõ</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                      Gõ từ theo nghĩa, hỗ trợ bộ gõ IME
                    </div>
                  </button>

                  {/* Nghe và viết */}
                  <button
                    type="button"
                    onClick={() => setStudyMode('listening')}
                    disabled={!audioVoiceAvailable}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      studyMode === 'listening'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : !audioVoiceAvailable
                        ? 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-40 cursor-not-allowed'
                        : 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xl mb-1">🎧</div>
                    <div className="font-bold text-xs text-[var(--text-primary)]">Nghe & Viết</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                      Nghe phát âm và gõ lại đúng chính tả
                    </div>
                    {!audioVoiceAvailable && (
                      <span className="absolute top-1 right-1 text-[9px] px-1 bg-amber-500/20 text-amber-600 rounded">
                        Chưa hỗ trợ TTS
                      </span>
                    )}
                  </button>
                </div>

                {/* Quiz subtype picker — only shown when quiz mode is active */}
                {studyMode === 'quiz' && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                      Loại câu hỏi trắc nghiệm
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([
                        { key: 'meaning' as QuizType, icon: '📖', label: 'Chọn nghĩa', desc: 'Nghĩa tiếng Việt' },
                        { key: 'synonym' as QuizType, icon: '🔗', label: 'Đồng nghĩa', desc: 'Chọn từ đồng nghĩa' },
                        { key: 'antonym' as QuizType, icon: '↔️', label: 'Trái nghĩa', desc: 'Chọn từ trái nghĩa' },
                        { key: 'mixed' as QuizType, icon: '🎲', label: 'Trộn cả 3', desc: 'Kết hợp ngẫu nhiên' },
                      ]).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setQuizType(item.key)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            quizType === item.key
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                          }`}
                        >
                          <div className="text-base mb-0.5">{item.icon}</div>
                          <div className="font-bold text-[11px] text-[var(--text-primary)] leading-tight">{item.label}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight hidden sm:block">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                    {(quizType === 'synonym' || quizType === 'antonym') && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>
                          {quizType === 'synonym'
                            ? 'Từ không có đồng nghĩa sẽ tự động chuyển sang câu hỏi chọn nghĩa.'
                            : 'Từ không có trái nghĩa sẽ tự động chuyển sang câu hỏi chọn nghĩa.'}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Phạm vi học & Số lượng từ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phạm vi */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    3. Phạm vi từ
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] text-xs">
                    {(
                      [
                        { key: 'all', label: 'Tất cả' },
                        { key: 'new', label: 'Từ mới' },
                        { key: 'learning', label: 'Chưa nhớ' },
                        { key: 'due', label: 'Đến hạn' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setScope(item.key)}
                        className={`py-1.5 rounded-lg font-semibold transition-all ${
                          scope === item.key
                            ? 'bg-[var(--bg-card)] text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Số lượng câu */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    4. Số từ trong buổi
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] text-xs">
                    {(['10', '20', '30', 'all'] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setWordCountSetting(cnt)}
                        className={`py-1.5 rounded-lg font-semibold transition-all ${
                          wordCountSetting === cnt
                            ? 'bg-[var(--bg-card)] text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {cnt === 'all' ? 'Tất cả' : `${cnt} từ`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Tùy chọn học bổ sung */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={isReversed}
                    onChange={(e) => setIsReversed(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔄 Đảo chiều (Việt → {langInfo.name})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={showPhonetics}
                    onChange={(e) => setShowPhonetics(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>👁️ Hiện cách đọc / Furigana</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={isShuffled}
                    onChange={(e) => setIsShuffled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔀 Xáo trộn thứ tự</span>
                </label>
              </div>

              {/* Warning banner: Words lacking meaning */}
              {invalidWordsWithoutMeaning.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      Có {invalidWordsWithoutMeaning.length} từ chưa có nghĩa tiếng Việt:
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Các từ này đã tự động được loại bỏ để đảm bảo chất lượng bài học cần nghĩa. Bạn có thể bổ sung nghĩa trong danh sách từ vựng.
                  </p>
                </div>
              )}

              {/* Warning banner: Quiz with too few words */}
              {studyMode === 'quiz' && validWords.length < 4 && validWords.length > 0 && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ Thư mục hiện có {validWords.length} từ. Chế độ Trắc nghiệm hoạt động tốt nhất khi có ít nhất 4 từ trở lên để tạo đáp án nhiễu. Bạn cũng có thể chọn thêm thư mục khác hoặc chọn Thẻ ghi nhớ / Luyện gõ.
                </div>
              )}

              {/* Start Button */}
              <div className="pt-1 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => startSession()}
                  disabled={validWords.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🚀 Bắt đầu buổi học ({validWords.length} từ hợp lệ)</span>
                </button>

                {validWords.length === 0 && (
                  <p className="text-xs text-rose-500 font-medium">
                    Không có từ vựng nào phù hợp với phạm vi và thư mục đã chọn. Hãy chọn thêm thư mục hoặc thêm từ mới.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              PHASE 2: STUDYING
             ======================================================== */}
          {phase === 'studying' && currentWord && (
            <div className="space-y-4">
              {/* ==========================================
                  MODE 1: FLASHCARD
                 ========================================== */}
              {studyMode === 'flashcard' && (
                <div className="space-y-4">
                  {/* Stable Card Container */}
                  <div
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="min-h-[260px] sm:min-h-[300px] p-6 rounded-2xl bg-[var(--bg-subtle)] border-2 border-[var(--border)] hover:border-indigo-400 transition-all flex flex-col justify-between items-center text-center cursor-pointer shadow-sm relative group"
                  >
                    {/* Top corner hints */}
                    <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="font-mono text-[11px]">
                        {currentWord.listName || 'Từ vựng'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handlePronounce(currentWord.word, currentWord.language, e)}
                        className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:text-indigo-600 text-[var(--text-primary)] transition-colors"
                        title="Phát âm từ"
                      >
                        🔊
                      </button>
                    </div>

                    {/* Card Front (Unflipped) */}
                    {!isFlipped ? (
                      <div className="my-auto space-y-2.5">
                        <div className="text-2xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                          {isReversed ? getWordMeaning(currentWord) : currentWord.word}
                        </div>

                        {!isReversed && showPhonetics && (
                          <div className="text-xs sm:text-sm font-mono text-indigo-600 dark:text-indigo-400">
                            {getPrimaryReading(currentWord as any) || ''}
                          </div>
                        )}

                        <p className="text-xs text-[var(--text-muted)] pt-3 animate-pulse">
                          Bấm vào thẻ hoặc nhấn [Phím cách] để lật xem đáp án
                        </p>
                      </div>
                    ) : (
                      /* Card Back (Flipped) */
                      <div className="my-auto space-y-3 w-full max-w-md animate-fade-in">
                        <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                          {isReversed ? currentWord.word : getWordMeaning(currentWord)}
                        </div>

                        {showPhonetics && (
                          <div className="text-xs font-mono text-[var(--text-secondary)]">
                            {getPrimaryReading(currentWord as any) || ''}
                          </div>
                        )}

                        {currentWord.partOfSpeech && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            {currentWord.partOfSpeech}
                          </span>
                        )}

                        {currentWord.example && (
                          <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-left space-y-1">
                            <p className="italic text-[var(--text-primary)]">
                              "{currentWord.example}"
                            </p>
                            {currentWord.exampleTranslation && (
                              <p className="text-[var(--text-muted)]">
                                {currentWord.exampleTranslation}
                              </p>
                            )}
                          </div>
                        )}

                        {currentWord.synonyms && (
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Đồng nghĩa: <span className="font-semibold text-[var(--text-secondary)]">{currentWord.synonyms}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom hint */}
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {isFlipped ? 'Chọn mức ghi nhớ bên dưới' : 'Nhấn vào đây để xem mặt sau'}
                    </div>
                  </div>

                  {/* 4 SRS Rating Buttons */}
                  {isFlipped ? (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleFlashcardRating(1)}
                        className="py-2.5 px-1 sm:px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex flex-col items-center gap-0.5"
                      >
                        <span>Chưa nhớ</span>
                        <span className="text-[10px] opacity-75 hidden sm:inline">(Phím 1)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFlashcardRating(2)}
                        className="py-2.5 px-1 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex flex-col items-center gap-0.5"
                      >
                        <span>Khó</span>
                        <span className="text-[10px] opacity-75 hidden sm:inline">(Phím 2)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFlashcardRating(3)}
                        className="py-2.5 px-1 sm:px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex flex-col items-center gap-0.5"
                      >
                        <span>Nhớ</span>
                        <span className="text-[10px] opacity-75 hidden sm:inline">(Phím 3)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFlashcardRating(4)}
                        className="py-2.5 px-1 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex flex-col items-center gap-0.5"
                      >
                        <span>Dễ</span>
                        <span className="text-[10px] opacity-75 hidden sm:inline">(Phím 4)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-xs hover:bg-[var(--bg-card)] transition-colors"
                    >
                      Lật thẻ xem đáp án [Phím cách]
                    </button>
                  )}
                </div>
              )}

              {/* ==========================================
                  MODE 2: TRẮC NGHIỆM (QUIZ)
                 ========================================== */}
              {studyMode === 'quiz' && (
                <div className="space-y-4">
                  {/* Question type label badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                      {quizQuestionType === 'meaning' && <><span>📖</span><span>Chọn nghĩa tiếng Việt</span></>}
                      {quizQuestionType === 'synonym' && <><span>🔗</span><span>Chọn từ đồng nghĩa</span></>}
                      {quizQuestionType === 'antonym' && <><span>↔️</span><span>Chọn từ trái nghĩa</span></>}
                    </span>
                    {currentWord.partOfSpeech && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        {currentWord.partOfSpeech}
                      </span>
                    )}
                  </div>

                  {/* Stable Prompt Container */}
                  <div className="min-h-[140px] p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col items-center justify-center text-center relative">
                    {/* Question prompt label */}
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      {quizQuestionType === 'meaning'
                        ? isReversed ? 'Chọn từ tương ứng nghĩa tiếng Anh' : 'Nghĩa của từ này là gì?'
                        : quizQuestionType === 'synonym'
                        ? `Chọn từ đồng nghĩa với "${currentWord.word}"`
                        : `Chọn từ trái nghĩa với "${currentWord.word}"`}
                    </div>

                    <div className="text-xl sm:text-3xl font-black text-[var(--text-primary)]">
                      {quizQuestionType === 'meaning'
                        ? isReversed ? getWordMeaning(currentWord) : currentWord.word
                        : currentWord.word}
                    </div>

                    {!isReversed && showPhonetics && quizQuestionType === 'meaning' && (
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                        {getPrimaryReading(currentWord as any) || ''}
                      </div>
                    )}

                    {/* Show meaning hint for synonym/antonym questions */}
                    {(quizQuestionType === 'synonym' || quizQuestionType === 'antonym') && getWordMeaning(currentWord) && (
                      <div className="mt-1.5 text-xs text-[var(--text-secondary)] italic">
                        {getWordMeaning(currentWord)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePronounce(currentWord.word, currentWord.language)}
                      className="mt-2 text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:text-indigo-600 text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1"
                    >
                      <span>🔊</span>
                      <span>Nghe phát âm</span>
                    </button>
                  </div>

                  {/* 4 Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {quizChoices.map((choice, idx) => {
                      const letter = ['A', 'B', 'C', 'D'][idx];
                      const isThisCorrect = quizCorrectAnswers.some(
                        (a) => normalizeInputString(a) === normalizeInputString(choice),
                      );
                      const isThisSelected = selectedQuizIndex === idx;

                      let btnStyle = 'bg-[var(--bg-subtle)] border-[var(--border)] hover:border-indigo-400 text-[var(--text-primary)]';
                      let icon: React.ReactNode = null;
                      if (isQuizSubmitted) {
                        if (isThisCorrect) {
                          btnStyle = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                          icon = <span className="text-emerald-500 shrink-0" aria-label="Đúng">✓</span>;
                        } else if (isThisSelected) {
                          btnStyle = 'bg-rose-500/15 border-rose-500 text-[var(--text-primary)]';
                          icon = <span className="text-rose-500 shrink-0" aria-label="Sai">✗</span>;
                        } else {
                          btnStyle = 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-40 text-[var(--text-muted)]';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isQuizSubmitted}
                          onClick={() => handleSelectQuizChoice(idx)}
                          className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-start gap-2.5 ${btnStyle} active:scale-98`}
                        >
                          <span className="w-5 h-5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[11px] font-mono flex items-center justify-center shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1 break-words">{choice}</span>
                          {icon}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback on submit & Next button */}
                  {isQuizSubmitted && (
                    <div className="p-3.5 rounded-xl border bg-[var(--bg-card)] border-[var(--border)] space-y-3 animate-fade-in">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          {isQuizCorrect ? (
                            <span className="flex items-center gap-1.5 text-emerald-600">
                              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                              <span>Chính xác!</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-rose-600">
                              <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">✗</span>
                              <span>Chưa chính xác</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Đáp án đúng:{' '}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {quizCorrectAnswers.join(' / ')}
                          </span>
                        </div>
                        {/* Show word meaning + synonyms/antonyms for context */}
                        {quizQuestionType !== 'meaning' && getWordMeaning(currentWord) && (
                          <div className="text-xs text-[var(--text-muted)]">
                            Nghĩa: <span className="text-[var(--text-secondary)]">{getWordMeaning(currentWord)}</span>
                          </div>
                        )}
                      </div>

                      {currentWord.example && (
                        <p className="text-xs text-[var(--text-secondary)] italic border-t border-[var(--border)] pt-2">
                          "{currentWord.example}"
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleNextQuizWord}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 cursor-pointer"
                        autoFocus
                      >
                        Câu tiếp theo → [Enter]
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ==========================================
                  MODE 3 & 4: LUYỆN GÕ & NGHE VÀ VIẾT
                 ========================================== */}
              {(studyMode === 'typing' || studyMode === 'listening') && (
                <div className="space-y-4">
                  {/* Stable Prompt Container */}
                  <div className="min-h-[140px] p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col items-center justify-center text-center">
                    {studyMode === 'listening' ? (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Nghe và gõ lại đúng từ
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePronounce(currentWord.word, currentWord.language)}
                          disabled={isPlayingAudio}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
                        >
                          <span>🔊</span>
                          <span>{isPlayingAudio ? 'Đang phát âm...' : 'Phát lại âm thanh [Space]'}</span>
                        </button>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Gợi ý loại từ: {currentWord.partOfSpeech || 'từ vựng'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {isReversed ? `Dịch sang tiếng Việt` : `Gõ từ ${langInfo.name}`}
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                          {isReversed ? currentWord.word : getWordMeaning(currentWord)}
                        </div>
                        {currentWord.partOfSpeech && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600">
                            {currentWord.partOfSpeech}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Form with IME Protection */}
                  <form onSubmit={handleTypingSubmit} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={typingInput}
                        onChange={(e) => setTypingInput(e.target.value)}
                        onCompositionStart={() => {
                          isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          isComposingRef.current = false;
                        }}
                        disabled={typingSubmitted}
                        placeholder={
                          isReversed
                            ? 'Nhập nghĩa tiếng Việt...'
                            : `Nhập từ ${langInfo.name} đúng chính tả...`
                        }
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                      />
                    </div>

                    {!typingSubmitted ? (
                      <button
                        type="submit"
                        disabled={!typingInput.trim()}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-40"
                      >
                        Kiểm tra đáp án [Enter]
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-xl border bg-[var(--bg-card)] border-[var(--border)] space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={isTypingCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                            {isTypingCorrect ? '🎉 Bạn đã gõ chính xác!' : '❌ Chưa chính xác!'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 p-2.5 rounded-lg bg-[var(--bg-subtle)] text-left">
                          <div>
                            <span className="text-[var(--text-muted)]">Đáp án đúng: </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {isReversed ? getWordMeaning(currentWord) : currentWord.word}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Nghĩa tiếng Việt: </span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {getWordMeaning(currentWord)}
                            </span>
                          </div>
                          {showPhonetics && getPrimaryReading(currentWord as any) && (
                            <div>
                              <span className="text-[var(--text-muted)]">Cách đọc: </span>
                              <span className="font-mono text-[var(--text-secondary)]">
                                {getPrimaryReading(currentWord as any)}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleNextTypingWord}
                          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                          autoFocus
                        >
                          Câu tiếp theo → [Enter]
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              PHASE 3: SUMMARY
             ======================================================== */}
          {phase === 'summary' && (
            <div className="space-y-5 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-3xl mx-auto ring-8 ring-emerald-500/5">
                🏆
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
                  Hoàn thành buổi học!
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Kết quả và lịch nhắc nhở Spaced Repetition đã được lưu vào database.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Tổng số từ</div>
                  <div className="text-lg sm:text-xl font-black text-[var(--text-primary)] mt-0.5">
                    {deck.length}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Đã nhớ</div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
                    {correctCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Độ chính xác</div>
                  <div className="text-lg sm:text-xl font-black text-blue-600 mt-0.5">
                    {accuracyPercent}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-[10px] font-bold text-purple-600 uppercase">Thời gian</div>
                  <div className="text-xs sm:text-sm font-black text-purple-600 mt-1 truncate">
                    {formatTime(activeSeconds)}
                  </div>
                </div>
              </div>

              {/* Unremembered words to review */}
              {unrememberedWords.length > 0 && (
                <div className="text-left space-y-2 max-w-md mx-auto">
                  <div className="text-xs font-bold text-[var(--text-secondary)]">
                    Từ cần ôn lại ({unrememberedWords.length} từ):
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl bg-[var(--bg-subtle)] p-2">
                    {unrememberedWords.map((w) => (
                      <div key={w.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-primary)]">{w.word}</span>
                        <span className="text-[var(--text-muted)] truncate max-w-[180px]">
                          {getWordMeaning(w)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                {unrememberedWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => startSession(unrememberedWords)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🔄 Ôn lại từ sai ({unrememberedWords.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPhase('setup')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] font-bold text-xs transition-colors cursor-pointer"
                >
                  🎯 Học tiếp buổi mới
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Về thư mục / Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal when user exits mid-session */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl text-center">
            <div className="text-2xl">⏸️</div>
            <h4 className="text-base font-bold text-[var(--text-primary)]">Tạm dừng buổi học?</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Tiến độ câu {currentIndex + 1}/{deck.length} đã được lưu an toàn. Bạn có thể quay lại tiếp tục bất cứ lúc nào từ trang chủ hoặc thư mục.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Học tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmOpen(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Lưu & Thoát ra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

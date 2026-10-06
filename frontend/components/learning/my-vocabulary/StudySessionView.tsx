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
import { WordDisplay } from '../WordDisplay';

const formatPos = (pos: string) => {
  const p = pos.trim().toLowerCase();
  if (p === 'n' || p === 'noun') return 'Danh từ (n)';
  if (p === 'v' || p === 'verb') return 'Động từ (v)';
  if (p === 'adj' || p === 'adjective' || p === 'a') return 'Tính từ (adj)';
  if (p === 'adv' || p === 'adverb') return 'Trạng từ (adv)';
  if (p === 'pron' || p === 'pronoun') return 'Đại từ (pron)';
  if (p === 'prep' || p === 'preposition') return 'Giới từ (prep)';
  if (p === 'conj' || p === 'conjunction') return 'Liên từ (conj)';
  if (p === 'interj' || p === 'interjection') return 'Thán từ (interj)';
  if (p === 'phr' || p === 'phrase') return 'Cụm từ (phr)';
  return pos;
};

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'listening';
export type StudyScope = 'all' | 'new' | 'learning' | 'due';
export type WordCountOption = '10' | '20' | '30' | 'all';
export type QuizType = 'meaning' | 'synonym' | 'antonym' | 'mixed';
export type SynonymTestMode = 'none' | 'one' | 'all';

interface StudySessionViewProps {
  initialFolderId?: number | null;
  onResumeRequested?: boolean;
  initialSessionId?: string;
  onClose?: () => void;
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
    synonymTestMode: SynonymTestMode;
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
  quizGroupChoices?: { meaning: QuizChoice[]; synonym: QuizChoice[]; antonym: QuizChoice[] };
  quizSelections?: { meaning: string[]; synonym: string[]; antonym: string[] };
  quizEvalResult?: any;
  isQuizSubmitted?: boolean;
}

export interface QuizChoice {
  id: string;
  text: string;
}

// Helper: Normalize Vietnamese & foreign meanings
function getWordMeaning(item?: MyVocabularyWord | null): string {
  if (!item) return "";
  const val = (item as any).meaning || (item as any).vietnameseMeaning || (item as any).definition || (item as any).translation;
  return typeof val === 'string' ? val.trim() : "";
}

// Helper: Clean string for typing comparison (collapses multiple whitespaces, lowercases)
function normalizeInputString(str: string): string {
  return (str || "")
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function StudySessionView({
  initialFolderId,
  onResumeRequested = false,
  initialSessionId,
  onClose,
}: StudySessionViewProps) {
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
  const [sessionId, setSessionId] = useState<string>("");
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

  const [isSavingExit, setIsSavingExit] = useState(false);
  const handleExitSave = async () => {
    setIsSavingExit(true);
    try {
      const correctCount = studyHistory.filter((h) => h.isCorrect).length;
      await myVocabApi.completeStudySession({
        sessionId: sessionId || `session_${Date.now()}`,
        mode: studyMode,
        language: currentLanguage,
        folderIds: selectedFolderIds,
        totalWords: deck.length,
        correctCount,
        durationSeconds: activeSeconds,
        isCompleted: false,
        details: studyHistory.map((h) => ({
          wordId: h.word.id,
          rating: h.rating,
          isCorrect: h.isCorrect,
          userAnswer: h.userAnswer,
        })),
      });
      setExitConfirmOpen(false);
      onClose?.();
    } catch (err) {
      console.warn("Could not save session to backend:", err);
      alert("L?i luu ti?n d?. Vui l�ng th? l?i!");
    } finally {
      setIsSavingExit(false);
    }
  };


  // Quiz sub-type selection
  const [quizType, setQuizType] = useState<QuizType>('meaning');
  const [synonymTestMode, setSynonymTestMode] = useState<SynonymTestMode>('none');

  // Unified Quiz State
  const [quizGroupChoices, setQuizGroupChoices] = useState<{ meaning: QuizChoice[]; synonym: QuizChoice[]; antonym: QuizChoice[] }>({ meaning: [], synonym: [], antonym: [] });
  const [quizSelections, setQuizSelections] = useState<{ meaning: string[]; synonym: string[]; antonym: string[] }>({ meaning: [], synonym: [], antonym: [] });
  const [quizEvalResult, setQuizEvalResult] = useState<{
    isPerfect: boolean;
    meaning: { isCorrect: boolean; missing: string[]; wrong: string[] };
    synonym: { isCorrect: boolean; missing: string[]; wrong: string[] };
    antonym: { isCorrect: boolean; missing: string[]; wrong: string[] };
  } | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const ctrlKeyInfo = useRef<{ pressed: boolean, otherKeyPressed: boolean }>({ pressed: false, otherKeyPressed: false });
  const isFetchingPhoneticsRef = useRef<Record<number, boolean>>({});

  // Typing practice state & IME composition
  const [typingInput, setTypingInput] = useState("");
  const [synonymInput, setSynonymInput] = useState("");
  const [synonymChips, setSynonymChips] = useState<string[]>([]);
  const [isSynonymCorrect, setIsSynonymCorrect] = useState(false);
  const [missingSynonyms, setMissingSynonyms] = useState<string[]>([]);
  const [wrongSynonyms, setWrongSynonyms] = useState<string[]>([]);
  const [typingSubmitted, setTypingSubmitted] = useState(false);
  const [isTypingCorrect, setIsTypingCorrect] = useState(false);
  const isComposingRef = useRef(false);
  const lastGeneratedWordId = useRef<number | null>(null);
  const typingInputRef = useRef<HTMLInputElement>(null);
  const lastPronouncedWordId = useRef<number | null>(null);

  // Audio / Speech notification
  const [audioFallbackNotice, setAudioFallbackNotice] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Pool fetching
  const [sessionWordPool, setSessionWordPool] = useState<MyVocabularyWord[]>([]);
  const [isFetchingWords, setIsFetchingWords] = useState(false);
  const [savedSessionToResume, setSavedSessionToResume] = useState<SavedSessionState | null>(null);

  const [folders, setFolders] = useState<VocabularyFolder[]>([]);
  
  // Compatible folders for current language
  const compatibleFolders = useMemo(() => {
    return folders.filter((f) => !f.language || f.language === currentLanguage);
  }, [folders, currentLanguage]);

  // Load words and folders from backend on mount
  useEffect(() => {
    setIsFetchingWords(true);
    Promise.all([
      myVocabApi.getFolders(currentLanguage),
      myVocabApi.getMyWords({ language: currentLanguage })
    ])
      .then(([foldersRes, wordsRes]) => {
        setFolders(foldersRes.folders || []);
        setSessionWordPool(Array.isArray(wordsRes) ? wordsRes : []);
      })
      .catch(() => {
        setSessionWordPool([]);
      })
      .finally(() => {
        setIsFetchingWords(false);
      });
  }, [currentLanguage]);

  // Check saved session in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  }, [sessionStorageKey, currentLanguage, onResumeRequested]);

  // Initialize folders selection
  useEffect(() => {
    if (phase === 'setup' && !savedSessionToResume && folders.length > 0) {
      if (initialFolderId !== undefined && initialFolderId !== null) {
        setSelectedFolderIds([initialFolderId]);
        setIncludeUnassigned(false);
      } else {
        setSelectedFolderIds(compatibleFolders.map((f) => f.id));
        setIncludeUnassigned(true);
      }
    }
  }, [initialFolderId, compatibleFolders, phase, savedSessionToResume, folders]);

  // Active Timer: only tick when visible and in studying phase
  useEffect(() => {
    if (phase !== 'studying') return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setActiveSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

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
        synonymTestMode,
        deck,
        currentIndex,
        studyHistory,
        activeSeconds,
        timestamp: Date.now(),
        quizGroupChoices,
        quizSelections,
        quizEvalResult,
        isQuizSubmitted,
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
    synonymTestMode,
    deck,
    currentIndex,
    studyHistory,
    activeSeconds,
    sessionStorageKey,
    quizGroupChoices,
    quizSelections,
    quizEvalResult,
    isQuizSubmitted,
  ]);

  const currentPool = sessionWordPool;

  // Folder filtered pool
  const folderFilteredWords = useMemo(() => {
    return currentPool.filter((w: MyVocabularyWord) => {
      if (w.language && w.language !== currentLanguage) return false;
      if (w.folderId === null || w.folderId === undefined) {
        return includeUnassigned;
      }
      return selectedFolderIds.includes(w.folderId);
    });
  }, [currentPool, selectedFolderIds, includeUnassigned, currentLanguage]);

  // Scope filtered pool (All, New, Learning, Due)
  const scopedWords = useMemo(() => {
    return folderFilteredWords.filter((w: MyVocabularyWord) => {
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
      const cleanText = (w.word || "").trim().toLowerCase();
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
    setTypingInput("");
    setTypingSubmitted(false);
    // Validate old choices to ensure they are objects, not strings (legacy support)
    const validateChoices = (arr: any[]) => {
      if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
      if (typeof arr[0] === 'string') return []; // Invalid format, force regenerate
      return arr;
    };
    const loadedChoices = saved.quizGroupChoices || { meaning: [], synonym: [], antonym: [] };
    setQuizGroupChoices({
      meaning: validateChoices(loadedChoices.meaning),
      synonym: validateChoices(loadedChoices.synonym),
      antonym: validateChoices(loadedChoices.antonym),
    });
    // Invalidate old string selections (legacy support)
    const validateSelections = (arr: string[], prefix: string) => 
      arr.filter(s => s && s.startsWith(prefix));

    const loadedSelections = saved.quizSelections || { meaning: [], synonym: [], antonym: [] };
    const validSelections = {
      meaning: validateSelections(loadedSelections.meaning, 'm_'),
      synonym: validateSelections(loadedSelections.synonym, 's_'),
      antonym: validateSelections(loadedSelections.antonym, 'a_'),
    };
    
    setQuizSelections(validSelections);
    setQuizEvalResult(saved.quizEvalResult || null);
    setIsQuizSubmitted(saved.isQuizSubmitted || false);
    if (saved.quizGroupChoices) {
      lastGeneratedWordId.current = saved.deck[saved.currentIndex]?.id || null;
    }
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

      if (res.message === 'not-allowed') {
        setIsAudioBlocked(true);
      } else if (res.message && !res.hasNativeVoice) {
        setAudioFallbackNotice(res.message);
        setTimeout(() => setAudioFallbackNotice(null), 4500);
      } else {
        setIsAudioBlocked(false);
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
    setTypingInput("");
    setTypingSubmitted(false);
    setQuizSelections({ meaning: [], synonym: [], antonym: [] });
    setQuizEvalResult(null);
    setIsQuizSubmitted(false);
    setSavedSessionToResume(null);
    lastPronouncedWordId.current = null;
    setPhase('studying');
  };

  const currentWord = deck[currentIndex];

  // Parse comma/semicolon/slash-separated synonym or antonym list into clean tokens
  const parseWordList = (raw?: string | null): string[] => {
    if (!raw) return [];
    return raw
      .split(/[,;=/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Prepare Quiz choices for current card (Unified groups)
  useEffect(() => {
    if (phase !== 'studying' || studyMode !== 'quiz' || !currentWord) return;
    if (lastGeneratedWordId.current === currentWord.id) return;

    setIsQuizSubmitted(false);
    setQuizEvalResult(null);
    setQuizSelections({ meaning: [], synonym: [], antonym: [] });
    lastGeneratedWordId.current = currentWord.id;

    const m = isReversed ? currentWord.word : getWordMeaning(currentWord);
    const trueMeaning = m ? [{ id: `m_${currentWord.id}`, text: m }] : [];
    const trueSynonym = parseWordList(currentWord.synonyms).map((s, i) => ({ id: `s_${currentWord.id}_${i}`, text: s }));
    const trueAntonym = parseWordList(currentWord.antonyms).map((s, i) => ({ id: `a_${currentWord.id}_${i}`, text: s }));

    const otherCandidates = currentPool.filter(
      (w: MyVocabularyWord) => w.id !== currentWord.id && (!w.language || w.language === currentLanguage),
    );

    const buildGroup = (trues: QuizChoice[], extractDistractors: (w: MyVocabularyWord) => QuizChoice[]) => {
      if (trues.length === 0) return [];
      const distractorMap = new Map<string, QuizChoice>();
      const trueTexts = trues.map(t => normalizeInputString(t.text));

      for (const w of otherCandidates) {
        const cands = extractDistractors(w);
        for (const c of cands) {
          if (c && c.text) {
            const norm = normalizeInputString(c.text);
            if (!trueTexts.includes(norm) && !distractorMap.has(norm)) {
              distractorMap.set(norm, c);
            }
          }
        }
      }
      const distractorsList = Array.from(distractorMap.values()).sort(() => Math.random() - 0.5);
      const chosenDistractors = distractorsList.slice(0, Math.max(3, 4 - trues.length));
      return [...trues, ...chosenDistractors].sort(() => Math.random() - 0.5);
    };

    const meaningChoices = buildGroup(trueMeaning, (w: MyVocabularyWord) => {
      const text = isReversed ? w.word : getWordMeaning(w);
      return text ? [{ id: `m_${w.id}`, text }] : [];
    });
    
    const synonymChoices = buildGroup(trueSynonym, (w: MyVocabularyWord) => 
      parseWordList(w.synonyms).map((s, i) => ({ id: `s_${w.id}_${i}`, text: s }))
    );
    
    const antonymChoices = buildGroup(trueAntonym, (w: MyVocabularyWord) => 
      parseWordList(w.antonyms).map((s, i) => ({ id: `a_${w.id}_${i}`, text: s }))
    );

    setQuizGroupChoices({
      meaning: meaningChoices,
      synonym: synonymChoices,
      antonym: antonymChoices,
    });

  }, [phase, studyMode, currentIndex, currentWord, isReversed, currentPool, currentLanguage]);

  // Auto-play audio when card appears
  useEffect(() => {
    if (phase === 'studying' && (studyMode === 'listening' || studyMode === 'flashcard' || (studyMode === 'quiz' && isAutoPlayEnabled)) && currentWord) {
      if (lastPronouncedWordId.current === currentWord.id || isAudioBlocked) return;
      lastPronouncedWordId.current = currentWord.id;
      const timer = setTimeout(() => {
        handlePronounce(currentWord.word, currentWord.language);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, studyMode, currentIndex, currentWord, handlePronounce, isAutoPlayEnabled, isAudioBlocked]);

  // Check and fetch missing phonetics automatically for studying phase
  useEffect(() => {
    if (phase === 'studying' && currentWord && showPhonetics) {
      const phonetic = getPrimaryReading(currentWord as any);
      if (!phonetic && !isFetchingPhoneticsRef.current[currentWord.id]) {
        isFetchingPhoneticsRef.current[currentWord.id] = true;
        myVocabApi.enrichBatch([{ word: currentWord.word, meaning: getWordMeaning(currentWord) }], currentWord.language)
          .then(async (res) => {
            if (res && res[0] && (res[0].ipa || res[0].pinyin || res[0].romaji || res[0].thaiReading)) {
              const enriched = res[0];
              setDeck(prev => prev.map(w => w.id === currentWord.id ? { ...w, ...enriched } as MyVocabularyWord : w));
              await myVocabApi.updateMyWord(currentWord.id, {
                ipa: enriched.ipa, pinyin: enriched.pinyin, kana: enriched.kana, romaji: enriched.romaji, romaja: enriched.romaja, thaiReading: enriched.thaiReading
              }).catch(() => {}); // Ignore error on silent update
            }
          })
          .catch(console.error);
      }
    }
  }, [phase, currentWord, showPhonetics, currentLanguage]);

  // Auto focus on next word for typing/listening
  useEffect(() => {
    if (phase === 'studying' && (studyMode === 'typing' || studyMode === 'listening')) {
      // Small timeout allows input to render after state change
      const t = setTimeout(() => {
        if (typingInputRef.current) {
          typingInputRef.current.focus({ preventScroll: true });
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [phase, studyMode, currentIndex]);

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

  // Unified Quiz choice toggle
  const handleToggleQuizSelection = (group: 'meaning' | 'synonym' | 'antonym', choice: string) => {
    if (isQuizSubmitted) return;
    setQuizSelections(prev => {
      const g = prev[group];
      if (g.includes(choice)) {
        return { ...prev, [group]: g.filter(c => c !== choice) };
      } else {
        return { ...prev, [group]: [...g, choice] };
      }
    });
  };

  const handleSubmitQuiz = async () => {
    if (isQuizSubmitted || !currentWord) return;
    setIsQuizSubmitted(true);
    setSaveStatus('saving');

    try {
      const res = await myVocabApi.evaluateQuiz({
        wordId: currentWord.id,
        selections: quizSelections,
        recordSrs: true,
      });
      setQuizEvalResult(res);

      setStudyHistory((prev) => [
        ...prev,
        { word: currentWord, rating: res.isPerfect ? 3 : 1, isCorrect: res.isPerfect, userAnswer: JSON.stringify(quizSelections) },
      ]);
    } catch (err) {
      console.warn('Quiz evaluation failed', err);
    } finally {
      setSaveStatus('saved');
    }
  };

  const handleNextQuizWord = () => {
    setQuizEvalResult(null);
    setQuizSelections({ meaning: [], synonym: [], antonym: [] });
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
    setTypingInput("");
    setSynonymInput("");
    setSynonymChips([]);
    setMissingSynonyms([]);
    setWrongSynonyms([]);
    setTypingSubmitted(false);
    lastPronouncedWordId.current = -1; // Reset audio state
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

    } catch (err) {
      console.warn('Could not record study session completion to backend:', err);
    }
  };

  // Ctrl key to pronounce (press and release only, no combos)
  useEffect(() => {
    if (phase !== 'studying' || !currentWord) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key === 'Control') {
        if (!e.repeat) {
          ctrlKeyInfo.current = { pressed: true, otherKeyPressed: false };
        }
      } else if (ctrlKeyInfo.current.pressed) {
        ctrlKeyInfo.current.otherKeyPressed = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const info = ctrlKeyInfo.current;
        if (info.pressed && !info.otherKeyPressed) {
          handlePronounce(currentWord.word, currentWord.language);
        }
        ctrlKeyInfo.current = { pressed: false, otherKeyPressed: false };
      }
    };

    const onBlur = () => {
      ctrlKeyInfo.current = { pressed: false, otherKeyPressed: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [phase, currentWord, handlePronounce]);

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
        if (isQuizSubmitted && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          handleNextQuizWord();
        }
      } else if (studyMode === 'typing' || studyMode === 'listening') {
        if (typingSubmitted && e.code === 'Enter' && !e.repeat && !isComposingRef.current) {
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


  // Accuracy calculation
  const correctCount = studyHistory.filter((h) => h.isCorrect).length;
  const accuracyPercent = studyHistory.length > 0 ? Math.round((correctCount / studyHistory.length) * 100) : 0;
  const unrememberedWords = studyHistory.filter((h) => !h.isCorrect).map((h) => h.word);

  // Minutes and seconds formatted
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins === 0) return `${rem} giây`;
    return `${mins} phút ${rem > 0 ? `${rem} giây` : ""}`;
  };

  // Audio voice available check
  const audioVoiceAvailable = isAudioSupported(currentLanguage);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-2rem)] sm:min-h-[85vh] animate-fade-in select-none mt-2 sm:mt-6">
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
                onClick={() => onClose?.()}
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
                      {currentPool.filter((w: MyVocabularyWord) => !w.folderId && (!w.language || w.language === currentLanguage)).length} từ
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

                {/* Synonym Test Mode for Listening */}
                {studyMode === 'listening' && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                      Kiểm tra từ đồng nghĩa
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([
                        { key: 'none' as SynonymTestMode, label: 'Không kiểm tra' },
                        { key: 'one' as SynonymTestMode, label: 'Nhập một từ' },
                        { key: 'all' as SynonymTestMode, label: 'Nhập tất cả từ' },
                      ]).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSynonymTestMode(item.key)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            synonymTestMode === item.key
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                          }`}
                        >
                          <div className="font-bold text-[11px]">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                  {/* Audio Blocked Notice */}
                  {isAudioBlocked && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        Trình duyệt đang chặn tự động phát âm.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAudioBlocked(false);
                          handlePronounce(currentWord.word, currentWord.language);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Kích hoạt âm thanh
                      </button>
                    </div>
                  )}

                  {/* Stable Card Container */}
                  <div
                    onClick={(e) => {
                      setIsFlipped((prev) => !prev);
                      handlePronounce(currentWord.word, currentWord.language, e);
                    }}
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
                      <div className="my-auto w-full flex flex-col items-center">
                        <WordDisplay
                          word={currentWord}
                          isReversed={isReversed}
                          showPhonetics={showPhonetics}
                          onPronounce={handlePronounce}
                        />

                        <p className="text-xs text-[var(--text-muted)] pt-6 animate-pulse">
                          Bấm vào thẻ hoặc nhấn [Phím cách] để lật xem đáp án
                        </p>
                      </div>
                    ) : (
                      /* Card Back (Flipped) */
                      <div className="my-auto space-y-3 w-full max-w-md animate-fade-in flex flex-col items-center">
                        <WordDisplay
                          word={currentWord}
                          isReversed={!isReversed} // Toggle reversed for the back
                          showPhonetics={showPhonetics}
                          onPronounce={handlePronounce}
                          size="normal"
                        />

                        {currentWord.example && (
                          <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-left space-y-1">
                            <p className="italic text-[var(--text-primary)]">
                              &quot;{currentWord.example}&quot;
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
                  {/* Stable Prompt Container */}
                  <div className="min-h-[120px] p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col items-center justify-center text-center relative">
                    <WordDisplay
                      word={currentWord}
                      isReversed={false}
                      showPhonetics={showPhonetics}
                      onPronounce={handlePronounce}
                      size="large"
                    />
                    
                    {currentWord.example && (
                      <p className="mt-4 text-xs text-[var(--text-secondary)] italic">
                        &quot;{currentWord.example}&quot;
                      </p>
                    )}
                  </div>

                  {/* Options Groups */}
                  <div className="space-y-6">
                    {/* Meaning Group */}
                    {quizGroupChoices.meaning.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          📖 Nghĩa tiếng Việt
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {quizGroupChoices.meaning.map((choice, idx) => {
                            const isSelected = quizSelections.meaning.includes(choice.id);
                            let style = 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]';
                            let icon = null;
                            if (isQuizSubmitted && quizEvalResult) {
                              const isWrong = quizEvalResult.meaning.wrong.includes(choice.id);
                              const isMissed = quizEvalResult.meaning.missing.includes(choice.id);
                              const isCorrect = isSelected && !isWrong && !isMissed;
                              if (isWrong) {
                                style = 'bg-rose-500/15 border-rose-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-rose-500 font-bold text-xs"><span className="text-base leading-none">✗</span> Sai</span>;
                              } else if (isCorrect) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">✓</span> Đúng</span>;
                              } else if (isMissed) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">!</span> Chưa chọn</span>;
                              } else {
                                style = 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-40 text-[var(--text-muted)]';
                              }
                            } else if (isSelected) {
                              style = 'bg-indigo-500/10 border-indigo-400 text-indigo-700 dark:text-indigo-300';
                            }
                            
                            return (
                              <button
                                key={idx}
                                disabled={isQuizSubmitted}
                                onClick={() => handleToggleQuizSelection('meaning', choice.id)}
                                className={`p-2.5 min-h-[44px] rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-start gap-2.5 ${style}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizEvalResult) ? (
                                  (quizEvalResult.meaning.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizEvalResult.meaning.wrong.includes(choice.id) && !quizEvalResult.meaning.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizEvalResult.meaning.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
                                  'border-[var(--text-muted)] opacity-40'
                                ) : isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--text-muted)]'}`}>
                                  {isSelected && <span className="text-[10px]">✓</span>}
                                </div>
                                <span className="flex-1 break-words">{choice.text}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Synonym Group */}
                    {quizGroupChoices.synonym.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          🔗 Đồng nghĩa
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {quizGroupChoices.synonym.map((choice, idx) => {
                            const isSelected = quizSelections.synonym.includes(choice.id);
                            let style = 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]';
                            let icon = null;
                            if (isQuizSubmitted && quizEvalResult) {
                              const isWrong = quizEvalResult.synonym.wrong.includes(choice.id);
                              const isMissed = quizEvalResult.synonym.missing.includes(choice.id);
                              const isCorrect = isSelected && !isWrong && !isMissed;
                              if (isWrong) {
                                style = 'bg-rose-500/15 border-rose-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-rose-500 font-bold text-xs"><span className="text-base leading-none">✗</span> Sai</span>;
                              } else if (isCorrect) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">✓</span> Đúng</span>;
                              } else if (isMissed) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">!</span> Chưa chọn</span>;
                              } else {
                                style = 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-40 text-[var(--text-muted)]';
                              }
                            } else if (isSelected) {
                              style = 'bg-indigo-500/10 border-indigo-400 text-indigo-700 dark:text-indigo-300';
                            }
                            
                            return (
                              <button
                                key={idx}
                                disabled={isQuizSubmitted}
                                onClick={() => handleToggleQuizSelection('synonym', choice.id)}
                                className={`p-2.5 min-h-[44px] rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-start gap-2.5 ${style}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizEvalResult) ? (
                                  (quizEvalResult.synonym.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizEvalResult.synonym.wrong.includes(choice.id) && !quizEvalResult.synonym.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizEvalResult.synonym.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
                                  'border-[var(--text-muted)] opacity-40'
                                ) : isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--text-muted)]'}`}>
                                  {isSelected && <span className="text-[10px]">✓</span>}
                                </div>
                                <span className="flex-1 break-words">{choice.text}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Antonym Group */}
                    {quizGroupChoices.antonym.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          ↔️ Trái nghĩa
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {quizGroupChoices.antonym.map((choice, idx) => {
                            const isSelected = quizSelections.antonym.includes(choice.id);
                            let style = 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]';
                            let icon = null;
                            if (isQuizSubmitted && quizEvalResult) {
                              const isWrong = quizEvalResult.antonym.wrong.includes(choice.id);
                              const isMissed = quizEvalResult.antonym.missing.includes(choice.id);
                              const isCorrect = isSelected && !isWrong && !isMissed;
                              if (isWrong) {
                                style = 'bg-rose-500/15 border-rose-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-rose-500 font-bold text-xs"><span className="text-base leading-none">✗</span> Sai</span>;
                              } else if (isCorrect) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">✓</span> Đúng</span>;
                              } else if (isMissed) {
                                style = 'bg-emerald-500/15 border-emerald-500 text-[var(--text-primary)]';
                                icon = <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><span className="text-base leading-none">!</span> Chưa chọn</span>;
                              } else {
                                style = 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-40 text-[var(--text-muted)]';
                              }
                            } else if (isSelected) {
                              style = 'bg-indigo-500/10 border-indigo-400 text-indigo-700 dark:text-indigo-300';
                            }
                            
                            return (
                              <button
                                key={idx}
                                disabled={isQuizSubmitted}
                                onClick={() => handleToggleQuizSelection('antonym', choice.id)}
                                className={`p-2.5 min-h-[44px] rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-start gap-2.5 ${style}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizEvalResult) ? (
                                  (quizEvalResult.antonym.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizEvalResult.antonym.wrong.includes(choice.id) && !quizEvalResult.antonym.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizEvalResult.antonym.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
                                  'border-[var(--text-muted)] opacity-40'
                                ) : isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--text-muted)]'}`}>
                                  {isSelected && <span className="text-[10px]">✓</span>}
                                </div>
                                <span className="flex-1 break-words">{choice.text}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isQuizSubmitted ? (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="w-full py-2.5 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98"
                    >
                      Kiểm tra
                    </button>
                  ) : (
                    <div className="p-3.5 mt-4 rounded-xl border bg-[var(--bg-card)] border-[var(--border)] space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        {quizEvalResult?.isPerfect ? (
                          <span className="flex items-center gap-1.5 text-emerald-600">
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                            <span>Hoàn toàn chính xác!</span>
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-1.5 text-rose-600">
                              <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">✗</span>
                              <span>Chưa chính xác. Đáp án đúng là:</span>
                            </span>
                            <div className="text-[var(--text-secondary)] font-normal text-[11px] pl-5 space-y-0.5">
                              {quizGroupChoices.meaning.filter(c => c.id.startsWith(`m_${currentWord.id}`)).length > 0 && (
                                <div><span className="font-semibold">Nghĩa:</span> {quizGroupChoices.meaning.filter(c => c.id.startsWith(`m_${currentWord.id}`)).map(c => c.text).join(', ')}</div>
                              )}
                              {quizGroupChoices.synonym.filter(c => c.id.startsWith(`s_${currentWord.id}`)).length > 0 && (
                                <div><span className="font-semibold">Đồng nghĩa:</span> {quizGroupChoices.synonym.filter(c => c.id.startsWith(`s_${currentWord.id}`)).map(c => c.text).join(', ')}</div>
                              )}
                              {quizGroupChoices.antonym.filter(c => c.id.startsWith(`a_${currentWord.id}`)).length > 0 && (
                                <div><span className="font-semibold">Trái nghĩa:</span> {quizGroupChoices.antonym.filter(c => c.id.startsWith(`a_${currentWord.id}`)).map(c => c.text).join(', ')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
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
                      <div className="space-y-4 flex flex-col items-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Nghe và gõ lại đúng từ
                        </div>
                        <WordDisplay
                          word={currentWord}
                          isReversed={false}
                          showPhonetics={showPhonetics}
                          hidePhoneticsForTest={true}
                            hideWordText={!typingSubmitted}
                          onPronounce={handlePronounce}
                          size="large"
                        />
                        {currentWord.partOfSpeech && (
                          <p className="text-[12px] text-[var(--text-muted)] mt-2">
                            Gợi ý loại từ: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatPos(currentWord.partOfSpeech)}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 flex flex-col items-center w-full">
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          {isReversed ? `Dịch sang tiếng Việt` : `Gõ từ ${langInfo.name}`}
                        </div>
                        <WordDisplay
                          word={currentWord}
                          isReversed={isReversed}
                          showPhonetics={showPhonetics}
                          onPronounce={handlePronounce}
                          size="large"
                        />
                      </div>
                    )}
                  </div>

                  {/* Input Form with IME Protection */}
                  <form onSubmit={handleTypingSubmit} className="space-y-3">
                    <div>
                        <input
                          ref={typingInputRef}
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.ctrlKey && studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms) {
                              if (isComposingRef.current) return;
                              e.preventDefault();
                              document.getElementById("synonym-input")?.focus();
                            }
                          }}
                          placeholder={
                            studyMode === "listening"
                              ? `Nh?p t? ${langInfo.name} b?n v?a nghe...`
                              : isReversed
                              ? "Nh?p nghia ti?ng Vi?t..."
                              : `Nh?p t? ${langInfo.name} d�ng ch�nh t?...`
                          }
                          autoFocus
                          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                        />
                      </div>

                      {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                        <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
                            <span>Nh?p t? d?ng nghia</span>
                            <span>{synonymTestMode === "one" ? "(C?n 1 t?)" : `(C?n ${currentWord.synonyms.split(/[,;=\/]+/).length} t?)`}</span>
                          </div>
                          
                          {synonymChips.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {synonymChips.map((chip, idx) => (
                                <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                  {chip}
                                  {!typingSubmitted && (
                                     <button type="button" onClick={() => setSynonymChips(chips => chips.filter((_, i) => i !== idx))} className="hover:text-indigo-900 ml-1">?</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!typingSubmitted && (
                            <input
                              id="synonym-input"
                              type="text"
                              value={synonymInput}
                              onChange={e => setSynonymInput(e.target.value)}
                              onCompositionStart={() => { isComposingRef.current = true; }}
                              onCompositionEnd={() => { isComposingRef.current = false; }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (e.ctrlKey) return; // let form submit
                                  e.preventDefault();
                                  if (isComposingRef.current) return;
                                  if (synonymInput.trim()) {
                                    const items = synonymInput.split(/[,;]+|\n/).map(s => s.trim()).filter(Boolean);
                                    setSynonymChips(prev => [...new Set([...prev, ...items])]);
                                    setSynonymInput("");
                                  }
                                }
                              }}
                              placeholder="Nh?p d?ng nghia r?i nh?n Enter... (Ctrl+Enter d? n?p b�i)"
                              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      )}

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
                                <span className="text-[var(--text-muted)]">C�ch d?c: </span>
                                <span className="font-mono text-[var(--text-secondary)]">
                                  {getPrimaryReading(currentWord as any)}
                                </span>
                              </div>
                            )}
                            
                            {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                <div className="font-bold mb-1">
                                  ���?ng nghia: <span className={isSynonymCorrect ? "text-emerald-600" : "text-rose-600"}>{isSynonymCorrect ? "? �?t" : "? Chua d?t"}</span>
                                </div>
                                {missingSynonyms.length > 0 && (
                                  <div>
                                    <span className="text-[var(--text-muted)]">Thi?u: </span>
                                    <span className="font-semibold text-rose-600">{missingSynonyms.join(", ")}</span>
                                  </div>
                                )}
                                {wrongSynonyms.length > 0 && (
                                  <div>
                                    <span className="text-[var(--text-muted)]">Sai: </span>
                                    <span className="font-semibold text-rose-600">{wrongSynonyms.join(", ")}</span>
                                  </div>
                                )}
                                <div>
                                   <span className="text-[var(--text-muted)]">T?t c? d�p �n: </span>
                                   <span className="font-semibold text-[var(--text-primary)]">{currentWord.synonyms}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleNextTypingWord}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 cursor-pointer"
                            autoFocus
                          >
                            C�u ti?p theo ? [Enter]
                          </button>
                        </div>
                      )}
                                        </form>
                  </div>
                )}
              </div>
            )}

            {/* ==========================================
                PHASE 3: SUMMARY
               ========================================== */}
            {phase === "summary" && (
              <div className="space-y-6 animate-fade-in text-center p-6">
                <div className="text-4xl mb-4">??</div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Tuy?t v?i, b?n d� ho�n th�nh!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  K?t qu?: <span className="font-bold text-indigo-600 dark:text-indigo-400">{studyHistory.filter(h => h.isCorrect).length}</span> / {deck.length} c�u d�ng.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setPhase("setup")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] font-bold text-xs transition-colors cursor-pointer"
                  >
                    ?? H?c ti?p bu?i m?i
                  </button>

                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    V? thu m?c / ��ng
                  </button>
                </div>
              </div>
            )}
        </div>
      {/* Confirmation Modal when user exits mid-session */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl text-center">
            <div className="text-2xl">??</div>
            <h4 className="text-base font-bold text-[var(--text-primary)]">T?m d?ng bu?i h?c?</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Ti?n d? c�u {currentIndex + 1}/{deck.length} dang du?c luu. B?n c� th? quay l?i ti?p t?c b?t c? l�c n�o t? trang ch? ho?c thu m?c.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                H?c ti?p
              </button>
              <button
                type="button"
                onClick={handleExitSave}
                disabled={isSavingExit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {isSavingExit ? "�ang luu..." : "Luu v� tho�t"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

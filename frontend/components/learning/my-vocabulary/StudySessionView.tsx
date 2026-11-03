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
import { Select } from '@/components/ui/Select';
import { AlertTriangle, ArrowLeftRight, Eye, Headphones, Info, Keyboard, Layers, ListChecks, Check, Play, RotateCcw, Search, Shuffle, Volume2, X } from 'lucide-react';

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
  const [folderQuery, setFolderQuery] = useState("");
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
      alert("Lỗi lưu tiến độ. Vui lòng thử lại!");
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
  const visibleFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    return q ? compatibleFolders.filter((f) => f.name.toLowerCase().includes(q)) : compatibleFolders;
  }, [compatibleFolders, folderQuery]);

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
    if (phase === 'studying' && (studyMode === 'listening' || studyMode === 'typing' || studyMode === 'flashcard' || (studyMode === 'quiz' && isAutoPlayEnabled)) && currentWord) {
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

  const isTrueQuizChoice = (group: 'meaning' | 'synonym' | 'antonym', c: QuizChoice) => {
    if (!currentWord) return false;
    const t = normalizeInputString(c.text);
    const truth =
      group === 'meaning'
        ? [isReversed ? currentWord.word : getWordMeaning(currentWord)]
        : parseWordList(group === 'synonym' ? currentWord.synonyms : currentWord.antonyms);
    return truth.some((x) => normalizeInputString(x || '') === t);
  };

  /**
   * Grades by the TEXT of the answers, not by generated ids. Ids are index-based and get out of sync with the
   * word (edited synonyms, a restored session...), which marked correct picks as wrong.
   */
  const gradeQuiz = (
    word: MyVocabularyWord,
    selections: { meaning: string[]; synonym: string[]; antonym: string[] },
    choices: { meaning: QuizChoice[]; synonym: QuizChoice[]; antonym: QuizChoice[] },
  ) => {
    const grade = (group: 'meaning' | 'synonym' | 'antonym', trueTexts: string[]) => {
      const truth = new Set(trueTexts.map((t) => normalizeInputString(t)).filter(Boolean));
      const picked = choices[group].filter((c) => selections[group].includes(c.id));
      const wrong = picked.filter((c) => !truth.has(normalizeInputString(c.text))).map((c) => c.id);
      const pickedTexts = new Set(picked.map((c) => normalizeInputString(c.text)));
      const missing = choices[group]
        .filter((c) => truth.has(normalizeInputString(c.text)) && !pickedTexts.has(normalizeInputString(c.text)))
        .map((c) => c.id);
      return { isCorrect: wrong.length === 0 && missing.length === 0, missing, wrong };
    };
    const meaningText = isReversed ? word.word : getWordMeaning(word);
    const meaning = grade('meaning', meaningText ? [meaningText] : []);
    const synonym = grade('synonym', parseWordList(word.synonyms));
    const antonym = grade('antonym', parseWordList(word.antonyms));
    return { isPerfect: meaning.isCorrect && synonym.isCorrect && antonym.isCorrect, meaning, synonym, antonym };
  };

  const handleSubmitQuiz = async () => {
    if (isQuizSubmitted || !currentWord) return;
    setIsQuizSubmitted(true);
    setSaveStatus('saving');

    const result = gradeQuiz(currentWord, quizSelections, quizGroupChoices);
    const isPerfect = result.isPerfect;

    setQuizEvalResult(result);
    setStudyHistory((prev) => [
      ...prev,
      { word: currentWord, rating: isPerfect ? 3 : 1, isCorrect: isPerfect, userAnswer: JSON.stringify(quizSelections) },
    ]);

    // Record SRS progress with the verdict shown to the user (the server must not re-grade it differently)
    try {
      await myVocabApi.recordWordStudy(currentWord.id, isPerfect ? 3 : 1);
    } catch (err) {
      console.warn('Could not save quiz result', err);
    } finally {
      setSaveStatus('saved');
    }
  };

  // Derived so a restored/old saved session can never show "wrong" without the per-option marks.
  const quizResult = isQuizSubmitted && currentWord ? quizEvalResult ?? gradeQuiz(currentWord, quizSelections, quizGroupChoices) : null;

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

    // Reversed (Việt → target language) shows the meaning and expects the word, so the answer is the word either way.
    const targetCorrect = currentWord.word;
    const normalizedTarget = normalizeInputString(targetCorrect);

    // Accept configured alternative answers (synonyms, reading tokens)
    const acceptable = [normalizedTarget];
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

    const isCorrect = acceptable.includes(normalizedUser);
    setIsTypingCorrect(isCorrect);
    setTypingSubmitted(true);

    // Synonym test (Nghe & Viết): compare what was entered, including text not yet confirmed with Enter
    if (studyMode === 'listening' && synonymTestMode !== 'none' && currentWord.synonyms) {
      const required = parseWordList(currentWord.synonyms).map((s) => normalizeInputString(s));
      const requiredLabels = parseWordList(currentWord.synonyms);
      const pending = synonymInput.split(/[,;]+|\n/).map((s) => s.trim()).filter(Boolean);
      const entered = [...new Set([...synonymChips, ...pending])];
      const normalizedEntered = entered.map((s) => normalizeInputString(s));
      const wrong = entered.filter((_, i) => !required.includes(normalizedEntered[i]));
      const missing = requiredLabels.filter((_, i) => !normalizedEntered.includes(required[i]));
      const hit = required.some((r) => normalizedEntered.includes(r));
      setWrongSynonyms(wrong);
      setMissingSynonyms(synonymTestMode === 'all' ? missing : hit ? [] : requiredLabels);
      setIsSynonymCorrect(synonymTestMode === 'all' ? missing.length === 0 && wrong.length === 0 : hit);
    }

    // Read the correct word aloud once the answer is checked, right or wrong
    handlePronounce(currentWord.word, currentWord.language);

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
    <div className={`w-full ${phase === 'setup' ? 'max-w-6xl' : 'max-w-5xl'} mx-auto flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-2rem)] sm:min-h-[85vh] animate-fade-in select-none mt-2 sm:mt-6`}>
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
                  : 'Tổng kết buổi học'}
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                title="Tạm dừng và lưu tiến độ"
                aria-label="Thoát buổi học"
              >
                <X className="h-5 w-5" />
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
            <div className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in">
              {/* Resume In-Progress Session Banner */}
              {savedSessionToResume && (
                <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[var(--brand-light)] p-4 sm:flex-row sm:items-center">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[var(--brand-text)]">Bạn có phiên học chưa hoàn thành</p>
                    <p className="text-sm text-[var(--text-secondary)]">
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
                      className="inline-flex min-h-10 items-center rounded-full bg-[var(--brand)] px-5 text-sm font-bold text-[var(--text-inverse)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    >
                      Tiếp tục học
                    </button>
                    <button
                      type="button"
                      onClick={discardSavedSession}
                      className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-rose-600"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]">
                {/* ---------- Left: what to study ---------- */}
                <section aria-labelledby="study-folders" className="min-w-0 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 id="study-folders" className="whitespace-nowrap text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                      Thư mục {langInfo.name} <span className="text-sm font-medium text-[var(--text-muted)]">({selectedFolderIds.length + (includeUnassigned ? 1 : 0)}/{compatibleFolders.length + 1})</span>
                    </h3>
                    <div className="flex items-center gap-1 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFolderIds(folderQuery ? Array.from(new Set([...selectedFolderIds, ...visibleFolders.map((f) => f.id)])) : compatibleFolders.map((f) => f.id));
                          setIncludeUnassigned(true);
                        }}
                        className="whitespace-nowrap rounded-full px-3 py-1 font-semibold text-[var(--brand-text)] hover:bg-[var(--brand-light)]"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFolderIds([]);
                          setIncludeUnassigned(false);
                        }}
                        className="whitespace-nowrap rounded-full px-3 py-1 font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {compatibleFolders.length === 0 && (
                    <p className="rounded-2xl bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Chưa có thư mục nào cho ngôn ngữ {langInfo.name}.
                    </p>
                  )}

                  {compatibleFolders.length > 3 && (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={folderQuery}
                        onChange={(e) => setFolderQuery(e.target.value)}
                        placeholder="Tìm thư mục..."
                        aria-label="Tìm thư mục"
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15"
                      />
                    </div>
                  )}

                  {folderQuery && visibleFolders.length === 0 && (
                    <p role="status" className="rounded-2xl bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Không có thư mục nào khớp &quot;{folderQuery}&quot;.
                    </p>
                  )}

                  <div className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border border-[var(--border)] p-1.5">
                    {visibleFolders.map((f) => {
                      const isSelected = selectedFolderIds.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            isSelected ? 'bg-[var(--brand-light)] font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
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
                            className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[var(--brand)]"
                          />
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />
                          <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{f.wordCount} từ</span>
                        </label>
                      );
                    })}

                    {/* Unassigned folder */}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        includeUnassigned ? 'bg-[var(--brand-light)] font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includeUnassigned}
                        onChange={(e) => setIncludeUnassigned(e.target.checked)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[var(--brand)]"
                      />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                      <span className="min-w-0 flex-1 truncate">Chưa phân loại</span>
                      <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                        {currentPool.filter((w: MyVocabularyWord) => !w.folderId && (!w.language || w.language === currentLanguage)).length} từ
                      </span>
                    </label>
                  </div>
                </section>

                {/* ---------- Right: how to study ---------- */}
                <div className="min-w-0 space-y-6">
                  <section aria-labelledby="study-mode" className="space-y-3">
                    <h3 id="study-mode" className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                      Chế độ học
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {([
                        { key: 'flashcard' as const, Icon: Layers, title: 'Flashcard', desc: 'Lật thẻ xem nghĩa, đánh giá 4 mức nhớ' },
                        { key: 'quiz' as const, Icon: ListChecks, title: 'Trắc nghiệm', desc: 'Chọn 1 trong 4 đáp án đúng' },
                        { key: 'typing' as const, Icon: Keyboard, title: 'Luyện gõ', desc: 'Gõ từ theo nghĩa, hỗ trợ bộ gõ IME' },
                        { key: 'listening' as const, Icon: Headphones, title: 'Nghe & Viết', desc: 'Nghe phát âm và gõ lại đúng chính tả' },
                      ]).map(({ key, Icon, title, desc }) => {
                        const disabled = key === 'listening' && !audioVoiceAvailable;
                        const active = studyMode === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStudyMode(key)}
                            disabled={disabled}
                            aria-pressed={active}
                            className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                              active
                                ? 'border-[var(--brand)] bg-[var(--brand-light)]'
                                : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand)]/50'
                            } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-[var(--text-primary)]">{title}</span>
                              <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{disabled ? 'Ngôn ngữ này chưa hỗ trợ phát âm' : desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Synonym Test Mode for Listening */}
                    {studyMode === 'listening' && (
                      <div className="space-y-2 rounded-2xl bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Kiểm tra từ đồng nghĩa</p>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kiểm tra từ đồng nghĩa">
                          {([
                            { key: 'none' as SynonymTestMode, label: 'Không kiểm tra' },
                            { key: 'one' as SynonymTestMode, label: 'Nhập một từ' },
                            { key: 'all' as SynonymTestMode, label: 'Nhập tất cả từ' },
                          ]).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setSynonymTestMode(item.key)}
                              aria-pressed={synonymTestMode === item.key}
                              className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
                                synonymTestMode === item.key
                                  ? 'bg-[var(--brand)] text-[var(--text-inverse)]'
                                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz subtype picker — only shown when quiz mode is active */}
                    {studyMode === 'quiz' && (
                      <div className="space-y-2 rounded-2xl bg-[var(--bg-subtle)] p-3.5">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Loại câu hỏi</p>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Loại câu hỏi trắc nghiệm">
                          {([
                            { key: 'meaning' as QuizType, label: 'Chọn nghĩa' },
                            { key: 'synonym' as QuizType, label: 'Đồng nghĩa' },
                            { key: 'antonym' as QuizType, label: 'Trái nghĩa' },
                            { key: 'mixed' as QuizType, label: 'Trộn cả 3' },
                          ]).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setQuizType(item.key)}
                              aria-pressed={quizType === item.key}
                              className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
                                quizType === item.key
                                  ? 'bg-[var(--brand)] text-[var(--text-inverse)]'
                                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        {(quizType === 'synonym' || quizType === 'antonym') && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {quizType === 'synonym'
                              ? 'Từ không có đồng nghĩa sẽ tự động chuyển sang câu hỏi chọn nghĩa.'
                              : 'Từ không có trái nghĩa sẽ tự động chuyển sang câu hỏi chọn nghĩa.'}
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Scope and count */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <section aria-labelledby="study-scope" className="space-y-2">
                      <h3 id="study-scope" className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">Phạm vi từ</h3>
                      <Select
                        value={scope}
                        onChange={(val) => setScope(val)}
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'new', label: 'Từ mới' },
                          { value: 'learning', label: 'Chưa nhớ' },
                          { value: 'due', label: 'Đến hạn ôn' },
                        ]}
                        ariaLabel="Phạm vi từ"
                        variant="filter"
                      />
                    </section>
                    <section aria-labelledby="study-count" className="space-y-2">
                      <h3 id="study-count" className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">Số từ trong buổi</h3>
                      <Select
                        value={wordCountSetting}
                        onChange={(val) => setWordCountSetting(val)}
                        options={[
                          { value: '10', label: '10 từ' },
                          { value: '20', label: '20 từ' },
                          { value: '30', label: '30 từ' },
                          { value: 'all', label: 'Tất cả' },
                        ]}
                        ariaLabel="Số từ trong buổi"
                        variant="filter"
                      />
                    </section>
                  </div>

                  {/* Extra options */}
                  <section aria-label="Tùy chọn thêm" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {([
                      { title: 'Đảo chiều', desc: `Việt → ${langInfo.name}`, Icon: ArrowLeftRight, checked: isReversed, set: setIsReversed },
                      { title: 'Cách đọc', desc: 'Hiện phiên âm / Furigana', Icon: Eye, checked: showPhonetics, set: setShowPhonetics },
                      { title: 'Xáo trộn', desc: 'Đổi thứ tự ngẫu nhiên', Icon: Shuffle, checked: isShuffled, set: setIsShuffled },
                    ]).map(({ title, desc, Icon, checked, set }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => set(!checked)}
                        aria-pressed={checked}
                        className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                          checked
                            ? 'border-[var(--brand)] bg-[var(--brand-light)]'
                            : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--brand)]/50'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${checked ? 'bg-[var(--brand)] text-[var(--text-inverse)]' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-[var(--text-primary)]">{title}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{desc}</span>
                        </span>
                      </button>
                    ))}
                  </section>
                </div>
              </div>

              {/* Warning banner: Words lacking meaning */}
              {invalidWordsWithoutMeaning.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    <strong>{invalidWordsWithoutMeaning.length} từ chưa có nghĩa tiếng Việt</strong> đã được loại khỏi buổi học. Bạn có thể bổ sung nghĩa trong danh sách từ vựng.
                  </p>
                </div>
              )}

              {/* Warning banner: Quiz with too few words */}
              {studyMode === 'quiz' && validWords.length < 4 && validWords.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--brand-light)] px-4 py-3 text-sm text-[var(--brand-text)]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Hiện có {validWords.length} từ. Trắc nghiệm cần ít nhất 4 từ để tạo đáp án nhiễu. Hãy chọn thêm thư mục hoặc dùng Flashcard / Luyện gõ.</p>
                </div>
              )}

              {/* Start */}
              <div className="flex flex-col items-stretch gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
                  {validWords.length > 0 ? (
                    <>
                      Sẵn sàng với <strong className="text-[var(--text-primary)]">{validWords.length} từ</strong>
                    </>
                  ) : (
                    <span className="font-medium text-rose-600 dark:text-rose-400">Chưa có từ nào phù hợp. Hãy chọn thêm thư mục hoặc đổi phạm vi.</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => startSession()}
                  disabled={validWords.length === 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-8 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Bắt đầu buổi học
                </button>
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
                      isReversed={isReversed}
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
                          {isReversed ? `📖 Từ ${langInfo.name} tương ứng` : "📖 Nghĩa tiếng Việt"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {quizGroupChoices.meaning.map((choice, idx) => {
                            const isSelected = quizSelections.meaning.includes(choice.id);
                            let style = 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]';
                            let icon = null;
                            if (isQuizSubmitted && quizResult) {
                              const isWrong = quizResult.meaning.wrong.includes(choice.id);
                              const isMissed = quizResult.meaning.missing.includes(choice.id);
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizResult) ? (
                                  (quizResult.meaning.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizResult.meaning.wrong.includes(choice.id) && !quizResult.meaning.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizResult.meaning.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
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
                            if (isQuizSubmitted && quizResult) {
                              const isWrong = quizResult.synonym.wrong.includes(choice.id);
                              const isMissed = quizResult.synonym.missing.includes(choice.id);
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizResult) ? (
                                  (quizResult.synonym.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizResult.synonym.wrong.includes(choice.id) && !quizResult.synonym.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizResult.synonym.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
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
                            if (isQuizSubmitted && quizResult) {
                              const isWrong = quizResult.antonym.wrong.includes(choice.id);
                              const isMissed = quizResult.antonym.missing.includes(choice.id);
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${(isQuizSubmitted && quizResult) ? (
                                  (quizResult.antonym.wrong.includes(choice.id)) ? 'bg-rose-500 border-rose-500 text-white' :
                                  (isSelected && !quizResult.antonym.wrong.includes(choice.id) && !quizResult.antonym.missing.includes(choice.id)) ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  (quizResult.antonym.missing.includes(choice.id)) ? 'border-emerald-500 text-emerald-500' :
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
                        {quizResult?.isPerfect ? (
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
                              {quizGroupChoices.meaning.filter(c => isTrueQuizChoice('meaning', c)).length > 0 && (
                                <div><span className="font-semibold">Nghĩa:</span> {quizGroupChoices.meaning.filter(c => isTrueQuizChoice('meaning', c)).map(c => c.text).join(', ')}</div>
                              )}
                              {quizGroupChoices.synonym.filter(c => isTrueQuizChoice('synonym', c)).length > 0 && (
                                <div><span className="font-semibold">Đồng nghĩa:</span> {quizGroupChoices.synonym.filter(c => isTrueQuizChoice('synonym', c)).map(c => c.text).join(', ')}</div>
                              )}
                              {quizGroupChoices.antonym.filter(c => isTrueQuizChoice('antonym', c)).length > 0 && (
                                <div><span className="font-semibold">Trái nghĩa:</span> {quizGroupChoices.antonym.filter(c => isTrueQuizChoice('antonym', c)).map(c => c.text).join(', ')}</div>
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
                        Câu tiếp theo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ==========================================
                  MODE 3 & 4: LUYỆN GÕ & NGHE VÀ VIẾT
                 ========================================== */}
              {(studyMode === 'typing' || studyMode === 'listening') && (
                <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                  {/* Stable Prompt Container */}
                  <div className="min-h-[140px] lg:min-h-[340px] p-5 lg:p-8 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col items-center justify-center text-center">
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
                          {isReversed ? `Dịch sang ${langInfo.name}` : `Gõ từ ${langInfo.name}`}
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
                  <form onSubmit={handleTypingSubmit} className="space-y-3 lg:flex lg:flex-col lg:justify-center lg:space-y-4">
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
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleTypingSubmit();
                              return;
                            }
                            if (e.key === "Enter" && !e.ctrlKey && studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms) {
                              if (isComposingRef.current) return;
                              e.preventDefault();
                              document.getElementById("synonym-input")?.focus();
                            }
                          }}
                          placeholder={
                            studyMode === "listening"
                              ? `Nhập từ ${langInfo.name} bạn vừa nghe...`
                              : isReversed
                              ? `Nhập từ ${langInfo.name} tương ứng...`
                              : `Nhập từ ${langInfo.name} đúng chính tả...`
                          }
                          autoFocus
                          className={`w-full px-4 py-3 rounded-xl border-2 text-[var(--text-primary)] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center ${typingSubmitted ? (isTypingCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-rose-500 bg-rose-500/10") : "border-[var(--border)] bg-[var(--bg-card)]"}`}
                        />
                      </div>

                      {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                        <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
                            <span>Nhập từ đồng nghĩa</span>
                            <span>{synonymTestMode === "one" ? "(Cần 1 từ)" : `(Cần ${currentWord.synonyms.split(/[,;=\/]+/).length} từ)`}</span>
                          </div>
                          
                          {synonymChips.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {synonymChips.map((chip, idx) => (
                                <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                  {chip}
                                  {!typingSubmitted && (
                                     <button type="button" onClick={() => setSynonymChips(chips => chips.filter((_, i) => i !== idx))} className="hover:text-indigo-900 ml-1">✕</button>
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
                                  if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                handleTypingSubmit();
                                return;
                              }
                                  e.preventDefault();
                                  if (isComposingRef.current) return;
                                  if (synonymInput.trim()) {
                                    const items = synonymInput.split(/[,;]+|\n/).map(s => s.trim()).filter(Boolean);
                                    setSynonymChips(prev => [...new Set([...prev, ...items])]);
                                    setSynonymInput("");
                                  }
                                }
                              }}
                              placeholder="Nhập đồng nghĩa rồi nhấn Enter... (Ctrl+Enter để nộp bài)"
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
                        Kiểm tra đáp án
                      </button>
                    ) : (
                      <div
                        role="status"
                        aria-live="polite"
                        className={`animate-fade-in space-y-3 rounded-2xl border-2 p-4 ${
                          isTypingCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
                              isTypingCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          >
                            {isTypingCorrect ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-lg font-extrabold ${isTypingCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                              {isTypingCorrect ? 'Chính xác!' : 'Chưa chính xác'}
                            </p>
                            {!isTypingCorrect && typingInput.trim() && (
                              <p className="truncate text-sm text-[var(--text-secondary)]">
                                Bạn gõ: <span className="line-through">{typingInput.trim()}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 rounded-xl bg-[var(--bg-card)] p-3 text-left text-sm">
                          <div>
                            <span className="text-[var(--text-muted)]">Đáp án đúng: </span>
                            <span className="text-base font-extrabold text-[var(--text-primary)]">
                              {currentWord.word}
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
                            
                            {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                <div className="font-bold mb-1">
                                  Đồng nghĩa: <span className={isSynonymCorrect ? "text-emerald-600" : "text-rose-600"}>{isSynonymCorrect ? "✓ Đạt" : "✗ Chưa đạt"}</span>
                                </div>
                                {missingSynonyms.length > 0 && (
                                  <div>
                                    <span className="text-[var(--text-muted)]">Thiếu: </span>
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
                                    <span className="text-[var(--text-muted)]">Tất cả đáp án: </span>
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
                            Câu tiếp theo
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
              <div className="mx-auto w-full max-w-4xl space-y-8 py-4 animate-fade-in">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Score */}
                <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                  <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`Độ chính xác ${accuracyPercent}%`}>
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-[var(--bg-muted)]" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - accuracyPercent / 100)}
                        className={accuracyPercent >= 70 ? 'stroke-emerald-500' : accuracyPercent >= 40 ? 'stroke-amber-400' : 'stroke-rose-500'}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                      {accuracyPercent}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                      {accuracyPercent >= 90 ? 'Xuất sắc!' : accuracyPercent >= 70 ? 'Làm tốt lắm!' : accuracyPercent >= 40 ? 'Cần ôn thêm một chút' : 'Hãy thử lại nhé'}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Bạn nhớ đúng {correctCount} trên {deck.length} từ trong {formatTime(activeSeconds)}.
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <dl className="grid grid-cols-3 gap-3 text-center lg:w-[22rem] lg:shrink-0">
                  <div className="rounded-2xl bg-emerald-500/10 px-3 py-4">
                    <dd className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{correctCount}</dd>
                    <dt className="mt-0.5 text-sm text-[var(--text-secondary)]">Đúng</dt>
                  </div>
                  <div className="rounded-2xl bg-rose-500/10 px-3 py-4">
                    <dd className="text-2xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">{unrememberedWords.length}</dd>
                    <dt className="mt-0.5 text-sm text-[var(--text-secondary)]">Cần ôn</dt>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg-subtle)] px-3 py-4">
                    <dd className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">{deck.length}</dd>
                    <dt className="mt-0.5 text-sm text-[var(--text-secondary)]">Tổng số từ</dt>
                  </div>
                </dl>
                </div>

                {/* Words to review */}
                {unrememberedWords.length > 0 && (
                  <section aria-labelledby="review-words" className="space-y-3">
                    <h4 id="review-words" className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                      Từ cần ôn lại ({unrememberedWords.length})
                    </h4>
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-[var(--border)] p-1.5">
                      {unrememberedWords.map((w) => (
                        <li key={w.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--bg-subtle)]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                            <X className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[var(--text-primary)]">{w.word}</span>
                            <span className="block truncate text-sm text-[var(--text-secondary)]">{getWordMeaning(w)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handlePronounce(w.word, w.language, e)}
                            aria-label={`Nghe ${w.word}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-text)] hover:bg-[var(--brand-light)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                  >
                    Về thư mục
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('setup')}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-6 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                  >
                    <RotateCcw className="h-4 w-4" /> Học buổi mới
                  </button>
                  {unrememberedWords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startSession(unrememberedWords)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-7 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    >
                      Ôn lại {unrememberedWords.length} từ
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>
      {/* Confirmation Modal when user exits mid-session */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl text-center">
            <div className="text-2xl">⏸️</div>
            <h4 className="text-base font-bold text-[var(--text-primary)]">Tạm dừng buổi học?</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Tiến độ câu {currentIndex + 1}/{deck.length} đang được lưu. Bạn có thể quay lại tiếp tục bất cứ lúc nào từ trang chủ hoặc thư mục.
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
                onClick={handleExitSave}
                disabled={isSavingExit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                {isSavingExit ? "Đang lưu..." : "Lưu và thoát"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

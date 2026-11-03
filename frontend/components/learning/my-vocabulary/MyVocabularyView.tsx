"use client";
import { ArrowLeft, Check, ChevronDown, ClipboardList, Trash2, Volume2, Download, Eye, FileSpreadsheet, FolderOpen, Library, MoreVertical, Pencil, Plus, RefreshCw, Search, Target, X } from "lucide-react";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VocabularyFolder, MyVocabularyWord, myVocabApi } from '@/lib/myVocabApi';
import { FolderModal } from './FolderModal';
import { WordModal } from './WordModal';
import { MoveWordModal } from './MoveWordModal';
import { ExcelImportModal } from './ExcelImportModal';
import { StudySessionModal } from './StudySessionModal';
import { ReanalyzeModal } from './ReanalyzeModal';
import { AiSuggestMeaningModal } from './AiSuggestMeaningModal';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { speakText } from '../speechHelper';
import { useAuth } from '@/lib/authContext';
import { toast } from '@/lib/toastStore';
import { SupportedLanguage, getLanguageInfo, getPrimaryReading } from '@/lib/languages';
import { userStatsApi } from '@/lib/userStatsApi';
import { Select } from '@/components/ui/Select';
import { FolderList } from './FolderList';

interface VocabVisibilityConfig {
  showWord: boolean;
  showMeaning: boolean;
  showSynonyms: boolean;
  showAntonyms: boolean;
}

const DEFAULT_VISIBILITY: VocabVisibilityConfig = {
  showWord: true,
  showMeaning: true,
  showSynonyms: true,
  showAntonyms: true,
};

interface MyVocabularyViewProps {
  onOpenStudySession?: (folderId?: number | null) => void;
}

export function MyVocabularyView({ onOpenStudySession }: MyVocabularyViewProps = {}) {
  const { user, currentLanguage, switchLanguage } = useAuth();
  const currentLangInfo = getLanguageInfo(currentLanguage);

  // Data states
  const [folders, setFolders] = useState<VocabularyFolder[]>([]);
  const [hasLoadedFolders, setHasLoadedFolders] = useState<boolean>(false);
  const [unassignedCount, setUnassignedCount] = useState<number>(0);
  const [words, setWords] = useState<MyVocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected folder: null means NO folder is selected yet (initial state from URL or null)
  const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned' | null>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('folderId');
      if (param === 'all') return 'all';
      if (param === 'unassigned') return 'unassigned';
      if (param && !isNaN(Number(param))) return Number(param);
    }
    return null;
  });
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'learning' | 'mastered'>('all');

  // Review visibility config (Show word, meaning, synonyms, antonyms)
  const [visibility, setVisibility] = useState<VocabVisibilityConfig>(DEFAULT_VISIBILITY);
  // Individually revealed items: key is `${wordId}_${field}`
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>({});

  // Race condition tracker for rapid folder switching
  const activeRequestIdRef = useRef<number>(0);

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<VocabularyFolder | null>(null);
  const [folderModalInitialMode, setFolderModalInitialMode] = useState<'edit' | 'delete'>('edit');
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>('');
  const [folderSortBy, setFolderSortBy] = useState<'recent' | 'az' | 'count'>('recent');

  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [wordToEdit, setWordToEdit] = useState<MyVocabularyWord | null>(null);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [wordToMove, setWordToMove] = useState<MyVocabularyWord | null>(null);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isReanalyzeModalOpen, setIsReanalyzeModalOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);

  // AI Suggest Meaning Modal state
  const [isAiMeaningModalOpen, setIsAiMeaningModalOpen] = useState(false);
  const [wordForAiMeaning, setWordForAiMeaning] = useState<MyVocabularyWord | null>(null);

  // Pagination / Load more for long word lists
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Helper to extract Vietnamese meaning from standard and backward-compatible fields
  const getWordMeaning = (item: MyVocabularyWord | any): string => {
    if (!item) return '';
    const val = item.meaning || item.vietnameseMeaning || item.definition || item.translation || item.viMeaning;
    return typeof val === 'string' ? val.trim() : '';
  };

  // LocalStorage storage key for user review visibility preference
  const storageKey = useMemo(() => {
    const userIdentifier = user?.id || (user?.email ? encodeURIComponent(user.email) : 'guest');
    return `sf_vocab_vis_${userIdentifier}`;
  }, [user]);

  // Load saved visibility preferences on mount / user change
  useEffect(() => {
    let isMounted = true;
    if (user) {
      userStatsApi
        .getMyStats()
        .then((stats) => {
          if (isMounted && stats.vocabVisibilityConfig) {
            try {
              const parsed = JSON.parse(stats.vocabVisibilityConfig);
              if (typeof parsed.showWord === 'boolean') {
                setVisibility(parsed);
                return;
              }
            } catch {}
          }
        })
        .catch(() => {});
    }

    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.showWord === 'boolean' &&
          typeof parsed.showMeaning === 'boolean' &&
          typeof parsed.showSynonyms === 'boolean' &&
          typeof parsed.showAntonyms === 'boolean'
        ) {
          setVisibility(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }

    return () => {
      isMounted = false;
    };
  }, [storageKey, user]);

  // Save visibility preferences
  const updateVisibility = (partial: Partial<VocabVisibilityConfig>) => {
    setVisibility((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      if (user) {
        userStatsApi.updateProfile({ vocabVisibilityConfig: JSON.stringify(next) }).catch(() => {});
      }
      return next;
    });
    // Reset individual reveals when global visibility settings change
    setRevealedMap({});
  };

  const handleShowAll = () => {
    const allOn: VocabVisibilityConfig = {
      showWord: true,
      showMeaning: true,
      showSynonyms: true,
      showAntonyms: true,
    };
    setVisibility(allOn);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allOn));
    } catch {}
    if (user) {
      userStatsApi.updateProfile({ vocabVisibilityConfig: JSON.stringify(allOn) }).catch(() => {});
    }
    setRevealedMap({});
  };

  // Toggle reveal for a specific word's field
  const toggleReveal = (wordId: number, field: 'word' | 'meaning' | 'synonyms' | 'antonyms') => {
    const key = `${wordId}_${field}`;
    setRevealedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Fetch Folders filtered by currentLanguage
  const fetchFolders = useCallback(async () => {
    try {
      const data = await myVocabApi.getFolders(currentLanguage);
      setFolders(data.folders);
      setUnassignedCount(data.unassignedCount);
    } catch {
      setFolders([]);
    } finally {
      setHasLoadedFolders(true);
    }
  }, [currentLanguage]);

  // Fetch Words filtered by currentLanguage and selectedFolderId
  const fetchWords = useCallback(async () => {
    if (selectedFolderId === null) {
      setWords([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: any = {
        language: currentLanguage,
      };
      if (selectedFolderId !== 'all') {
        queryParams.folderId = selectedFolderId;
      }
      if (statusFilter !== 'all') {
        queryParams.status = statusFilter;
      }
      if (searchKeyword.trim()) {
        queryParams.search = searchKeyword.trim();
      }

      const list = await myVocabApi.getMyWords(queryParams);
      // Prevent race conditions: ignore if newer request started
      if (requestId !== activeRequestIdRef.current) return;
      setWords(list);
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      setError(err.message || 'Không thể tải danh sách từ vựng.');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedFolderId, statusFilter, searchKeyword, currentLanguage]);

  // Synchronize browser history and popstate events (Browser Back / Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get('folderId');
      if (param === 'all') {
        setSelectedFolderId('all');
      } else if (param === 'unassigned') {
        setSelectedFolderId('unassigned');
      } else if (param && !isNaN(Number(param))) {
        setSelectedFolderId(Number(param));
      } else {
        setSelectedFolderId(null);
      }
      setSearchKeyword('');
      setStatusFilter('all');
      setRevealedMap({});
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When switching folder: reset search, status filter, and individual reveals, and push URL
  const handleSelectFolder = (folderId: number | 'all' | 'unassigned') => {
    setSearchKeyword('');
    setStatusFilter('all');
    setRevealedMap({});
    setSelectedFolderId(folderId);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('folderId', String(folderId));
      window.history.pushState({ folderId }, '', url.toString());
    }
  };

  // Return to folders list (selectedFolderId = null) and clear URL param
  const handleBackToFolders = () => {
    setSelectedFolderId(null);
    setWords([]);
    setSearchKeyword('');
    setStatusFilter('all');
    setRevealedMap({});

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('folderId');
      window.history.pushState(null, '', url.toString());
    }
  };

  // When language switches: clear folder selection, reset words, clear revealedMap, clean URL
  useEffect(() => {
    setSelectedFolderId(null);
    setWords([]);
    setRevealedMap({});
    setSearchKeyword('');
    setStatusFilter('all');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('folderId')) {
        url.searchParams.delete('folderId');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [currentLanguage]);

  // Fetch folders on language change
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Fetch words when folder, search, filter or language change
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Delete word alert state
  const [wordToDelete, setWordToDelete] = useState<MyVocabularyWord | null>(null);
  const [isDeletingWord, setIsDeletingWord] = useState(false);

  // Delete word handler
  const confirmDeleteWord = async () => {
    if (!wordToDelete) return;
    setIsDeletingWord(true);
    try {
      await myVocabApi.deleteMyWord(wordToDelete.id);
      toast.success(`Đã xóa từ "${wordToDelete.word}" thành công`);
      setWordToDelete(null);
      fetchWords();
      fetchFolders();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa từ');
    } finally {
      setIsDeletingWord(false);
    }
  };

  const handleDeleteWord = (word: MyVocabularyWord) => {
    setWordToDelete(word);
  };

  // Active folder object
  const activeFolder = useMemo(() => {
    if (typeof selectedFolderId === 'number') {
      return folders.find((f) => f.id === selectedFolderId) || null;
    }
    return null;
  }, [folders, selectedFolderId]);

  const totalWordsInAllFolders = useMemo(() => {
    return folders.reduce((sum, f) => sum + f.wordCount, 0) + unassignedCount;
  }, [folders, unassignedCount]);

  const selectedFolderTitle = useMemo(() => {
    if (selectedFolderId === 'all') return 'Tất cả từ vựng';
    if (selectedFolderId === 'unassigned') return 'Chưa phân loại';
    if (typeof selectedFolderId === 'number') return activeFolder?.name || 'Thư mục';
    return '';
  }, [selectedFolderId, activeFolder]);

  // Language-specific target word label
  const targetWordLabel = useMemo(() => {
    if (currentLanguage === 'en') return 'Hiện từ tiếng Anh';
    return `Hiện từ ${currentLangInfo.name}`;
  }, [currentLanguage, currentLangInfo.name]);

  const isAnyHidden = useMemo(() => {
    return !visibility.showWord || !visibility.showMeaning || !visibility.showSynonyms || !visibility.showAntonyms;
  }, [visibility]);

  // Reset pagination when folder, search keyword, or status filter changes
  useEffect(() => {
    setVisibleCount(30);
  }, [selectedFolderId, searchKeyword, statusFilter]);

  // Client-side search and sorting for folder list (does NOT mutate original folders data)
  const filteredFolders = useMemo(() => {
    let result = [...folders];

    if (folderSearchQuery.trim()) {
      const q = folderSearchQuery.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (folderSortBy === 'az') {
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
      }
      if (folderSortBy === 'count') {
        return (b.wordCount || 0) - (a.wordCount || 0);
      }
      // 'recent' default: sort by updatedAt or createdAt desc
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || a.id;
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || b.id;
      return timeB - timeA;
    });

    return result;
  }, [folders, folderSearchQuery, folderSortBy]);

  const displayedWords = useMemo(() => {
    return words.slice(0, visibleCount);
  }, [words, visibleCount]);

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-fade-up">

      {/* ========================================================
          RESPONSIVE LAYOUT
          - selectedFolderId === null: Trang danh sách thư mục (State 1)
          - selectedFolderId !== null: Màn hình chi tiết từ vựng của thư mục (State 2)
         ======================================================== */}
      {selectedFolderId === null ? (
        <FolderList
          languageName={currentLangInfo.name}
          languageFlag={currentLangInfo.flag}
          isLoaded={hasLoadedFolders}
          folders={folders}
          visibleFolders={filteredFolders}
          totalWords={totalWordsInAllFolders}
          unassignedCount={unassignedCount}
          query={folderSearchQuery}
          onQueryChange={setFolderSearchQuery}
          sortBy={folderSortBy}
          onSortChange={setFolderSortBy}
          onSelect={handleSelectFolder}
          onCreate={() => {
            setFolderToEdit(null);
            setFolderModalInitialMode('edit');
            setIsFolderModalOpen(true);
          }}
          onEdit={(folder, mode) => {
            setFolderToEdit(folder);
            setFolderModalInitialMode(mode);
            setIsFolderModalOpen(true);
          }}
          onReanalyze={() => setIsReanalyzeModalOpen(true)}
        />
      ) : (
        /* ========================================================
           STATE 2: MÀN HÌNH TỪ VỰNG TRONG THƯ MỤC (RIÊNG BIỆT)
           - Ẩn HOÀN TOÀN danh sách thư mục bên trái (không cột trái).
           - Toàn bộ chiều rộng dành cho nội dung từ vựng.
           - Header phân tầng: Hàng 1 = Quay lại, Hàng 2 = Tên đầy đủ + số từ, Hàng 3 = Thao tác.
           - Không có nút "Tạo thư mục" ở màn hình này.
           - Tên thư mục xuống dòng tự nhiên, không bị ép thành "...".
           ======================================================== */
        <div className="w-full space-y-4 animate-fade-up">
          {typeof selectedFolderId === 'number' && hasLoadedFolders && !activeFolder ? (
            /* Trạng thái lỗi khi thư mục không tồn tại hoặc không thuộc tài khoản */
            <div className="p-8 md:p-12 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto">
                ⚠️
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                  Thư mục không tồn tại
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Thư mục này không tồn tại hoặc bạn không có quyền truy cập vào tài nguyên này.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToFolders}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                ← Quay lại danh sách thư mục
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ========================================================
                  FOLDER HEADER, ACTIONS AND FILTER TOOLBAR
                 ======================================================== */}
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={handleBackToFolders}
                  className="group -ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                  title="Quay lại danh sách thư mục"
                  aria-label="Quay lại danh sách thư mục"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>Quay lại thư mục</span>
                </button>

                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-[var(--brand-text)]">
                        {selectedFolderId === 'all' ? <Library className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
                      </span>
                      <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] sm:text-3xl">
                        {selectedFolderTitle}
                      </h1>
                      {activeFolder && (
                        <button
                          type="button"
                          onClick={() => {
                            setFolderToEdit(activeFolder);
                            setIsFolderModalOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--brand-text)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                          title="Đổi tên thư mục"
                          aria-label="Đổi tên thư mục"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
                      {selectedFolderId === 'all'
                        ? `${totalWordsInAllFolders} từ`
                        : selectedFolderId === 'unassigned'
                        ? `${unassignedCount} từ`
                        : `${activeFolder?.wordCount ?? words.length} từ`}
                      {activeFolder?.description && <span className="text-[var(--text-muted)]"> · {activeFolder.description}</span>}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWordToEdit(null);
                        setIsWordModalOpen(true);
                      }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                      title="Thêm từ mới vào thư mục này"
                      aria-label="Thêm từ mới vào thư mục này"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm từ mới</span>
                    </button>

                    <div className="group relative">
                      <button
                        type="button"
                        aria-haspopup="true"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                      >
                        <Download className="h-4 w-4" />
                        <span>Nhập từ</span>
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                      <div className="absolute right-0 top-full z-50 hidden pt-1 group-focus-within:block group-hover:block">
                        <div className="w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-md)]">
                          <button
                            type="button"
                            onClick={() => setIsPasteModalOpen(true)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                          >
                            <ClipboardList className="h-4 w-4 text-[var(--text-muted)]" /> Dán danh sách
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsExcelModalOpen(true)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-[var(--text-muted)]" /> Nhập Excel
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const targetFolderId = typeof selectedFolderId === 'number' ? selectedFolderId : null;
                        if (onOpenStudySession) {
                          onOpenStudySession(targetFolderId);
                        } else {
                          setIsStudyModalOpen(true);
                        }
                      }}
                      disabled={words.length === 0}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-5 text-sm font-bold text-[var(--text-inverse)] shadow-[0_8px_20px_-8px_var(--brand)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      title="Học flashcard, trắc nghiệm, luyện gõ và nghe viết"
                    >
                      <Target className="h-4 w-4" />
                      <span>Học từ vựng</span>
                    </button>

                    <div className="group relative">
                      <button
                        type="button"
                        aria-haspopup="true"
                        aria-label="Thêm tùy chọn"
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      <div className="absolute right-0 top-full z-50 hidden pt-1 group-focus-within:block group-hover:block">
                        <div className="w-44 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-md)]">
                          <button
                            type="button"
                            onClick={() => setIsReanalyzeModalOpen(true)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                          >
                            <RefreshCw className="h-4 w-4 text-[var(--text-muted)]" /> Phân tích lại
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search, status filter and display options: only when there is something to filter */}
                {(words.length > 0 || searchKeyword !== '' || statusFilter !== 'all') && (
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Tìm kiếm trong thư mục này..."
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-11 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/15"
                        aria-label="Tìm kiếm từ vựng trong thư mục"
                      />
                      {searchKeyword && (
                        <button
                          type="button"
                          onClick={() => setSearchKeyword('')}
                          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                          aria-label="Xóa tìm kiếm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Select
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'new', label: 'Mới' },
                        { value: 'learning', label: 'Đang học' },
                        { value: 'mastered', label: 'Đã thuộc' },
                      ]}
                      ariaLabel="Lọc theo trạng thái"
                      variant="filter"
                      className="w-full lg:w-52"
                    />

                    <div className="group relative self-start lg:self-auto">
                      <button
                        type="button"
                        aria-haspopup="true"
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Hiển thị</span>
                        {isAnyHidden && <span className="h-2 w-2 rounded-full bg-[var(--brand)]" aria-label="Đang ẩn một số nội dung" />}
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                      <div className="absolute right-0 top-full z-50 hidden pt-1 group-focus-within:block group-hover:block">
                        <div className="flex w-64 flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-[var(--shadow-md)]">
                          {[
                            { key: 'showWord', label: targetWordLabel },
                            { key: 'showMeaning', label: 'Nghĩa tiếng Việt' },
                            { key: 'showSynonyms', label: 'Đồng nghĩa' },
                            { key: 'showAntonyms', label: 'Trái nghĩa' },
                          ].map(({ key, label }) => (
                            <label key={key} className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]">
                              <span>{label}</span>
                              <input
                                type="checkbox"
                                checked={visibility[key as 'showWord' | 'showMeaning' | 'showSynonyms' | 'showAntonyms']}
                                onChange={(e) => updateVisibility({ [key]: e.target.checked })}
                                className="h-4 w-4 cursor-pointer rounded accent-[var(--brand)]"
                              />
                            </label>
                          ))}
                          {isAnyHidden && (
                            <button
                              type="button"
                              onClick={handleShowAll}
                              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-light)] px-3 py-2.5 text-sm font-bold text-[var(--brand-text)] hover:brightness-95"
                              title="Hiện lại toàn bộ từ, nghĩa, đồng nghĩa và trái nghĩa"
                              aria-label="Hiện tất cả nội dung bị ẩn"
                            >
                              <Check className="h-4 w-4" /> Hiện tất cả
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

          {/* ========================================================
              WORD LIST / CARDS
             ======================================================== */}
          {isLoading ? (
                <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-2">
                  <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                  <p className="text-xs text-[var(--text-muted)]">Đang tải danh sách từ vựng...</p>
                </div>
              ) : error ? (
                <div className="p-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 space-y-2">
                  <p className="text-xs font-bold">{error}</p>
                  <button
                    onClick={fetchWords}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : words.length === 0 ? (
                <div className="p-8 md:p-12 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-3xl mx-auto">
                    {searchKeyword ? '🔍' : '📝'}
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)]">
                      {searchKeyword
                        ? 'Không tìm thấy từ vựng nào'
                        : 'Thư mục này chưa có từ vựng'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {searchKeyword
                        ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái.'
                        : 'Thêm từ đầu tiên vào thư mục này bằng cách gõ tay hoặc nhập nhanh hàng loạt từ file Excel!'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                    {searchKeyword || statusFilter !== 'all' ? (
                      <button
                        onClick={() => {
                          setSearchKeyword('');
                          setStatusFilter('all');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span>✕</span>
                        <span>Xóa tìm kiếm và bộ lọc</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setWordToEdit(null);
                            setIsWordModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          aria-label="Thêm từ mới vào thư mục"
                        >
                          <span>+</span>
                          <span>Thêm từ mới</span>
                        </button>
                        <button
                          onClick={() => setIsPasteModalOpen(true)}
                          className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          aria-label="Dán danh sách vào thư mục"
                        >
                          <span>📋</span>
                          <span>Dán danh sách</span>
                        </button>
                        <button
                          onClick={() => setIsExcelModalOpen(true)}
                          className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          aria-label="Nhập Excel vào thư mục"
                        >
                          <span>📥</span>
                          <span>Nhập Excel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {displayedWords.map((item) => {
                    const isWordRevealed = !!revealedMap[`${item.id}_word`];
                    const isMeaningRevealed = !!revealedMap[`${item.id}_meaning`];
                    const isSynonymsRevealed = !!revealedMap[`${item.id}_synonyms`];
                    const isAntonymsRevealed = !!revealedMap[`${item.id}_antonyms`];

                    const showTargetWord = visibility.showWord || isWordRevealed;
                    const showMeaning = visibility.showMeaning || isMeaningRevealed;
                    const showSynonyms = visibility.showSynonyms || isSynonymsRevealed;
                    const showAntonyms = visibility.showAntonyms || isAntonymsRevealed;

                    const meaningText = getWordMeaning(item);
                    const hasMeaning = Boolean(meaningText);
                    const hasSynonyms = Boolean(item.synonyms && item.synonyms.trim());
                    const hasAntonyms = Boolean(item.antonyms && item.antonyms.trim());

                    return (
                      <div
                        key={item.id}
                        className={`group space-y-2 rounded-xl border border-l-[3px] border-[var(--border)] bg-[var(--bg-card)] p-3.5 transition-shadow hover:shadow-[var(--shadow-md)] ${item.status === 'mastered' ? 'border-l-emerald-500' : item.status === 'learning' ? 'border-l-amber-400' : 'border-l-[var(--brand)]'}`}
                      >
                        {/* Hàng 1: Từ, Phát âm, Từ loại, Trạng thái học và Icon thao tác */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                            {/* Nút loa phát âm (luôn nghe được ngay cả khi từ bị che) */}
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await speakText(item.word, item.language || currentLanguage);
                                if (res.message && !res.hasNativeVoice) {
                                  toast.error(res.message);
                                }
                              }}
                              className="h-7 w-7 rounded-full bg-[var(--brand-light)] text-[var(--brand-text)] flex items-center justify-center transition-all shrink-0 cursor-pointer hover:brightness-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                              title="Nghe phát âm"
                              aria-label="Nghe phát âm"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>

                            {/* Từ vựng hoặc Nút xem từ khi bị che */}
                            {showTargetWord ? (
                              <div className="inline-flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)] break-words">
                                  {item.word}
                                </span>

                                {!visibility.showWord && (
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(item.id, 'word')}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-semibold border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                                    title="Che lại từ vựng"
                                    aria-label="Che lại từ vựng"
                                  >
                                    <span>👁️‍🗨️</span>
                                    <span>Che</span>
                                  </button>
                                )}

                                {/* Cách đọc / Phiên âm chính (IPA / Pinyin / Kana / Romaji / Thai) */}
                                {getPrimaryReading(item) && (
                                  <span className="text-sm font-medium text-[var(--text-muted)]">
                                    {getPrimaryReading(item)}
                                  </span>
                                )}

                                {/* Loại từ (POS) */}
                                {item.partOfSpeech && (
                                  <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                                    {item.partOfSpeech}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleReveal(item.id, 'word')}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700/60 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title="Bấm để xem từ vựng"
                                aria-label="Xem từ vựng"
                              >
                                <span>👁️</span>
                                <span>Xem {currentLangInfo.name.toLowerCase()}</span>
                              </button>
                            )}
                          </div>

                          {/* Nhóm nút thao tác: Sửa, Chuyển thư mục, Xóa dạng icon kèm tooltip */}
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setWordToEdit(item);
                                setIsWordModalOpen(true);
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                              title="Chỉnh sửa từ vựng"
                              aria-label="Chỉnh sửa từ vựng"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setWordToMove(item);
                                setIsMoveModalOpen(true);
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                              title="Chuyển sang thư mục khác"
                              aria-label="Chuyển thư mục"
                            >
                              <FolderOpen className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Xóa từ vựng"
                              aria-label="Xóa từ vựng"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Hàng 2: Nghĩa tiếng Việt (Dễ đọc, giữ kích thước ổn định, hiển thị đúng trạng thái) */}
                        <div className="flex items-center">
                          {!hasMeaning ? (
                            /* Chỉ hiện "Chưa có nghĩa" khi thực sự thiếu sau khi kiểm tra các trường tương thích */
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                Chưa có nghĩa
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setWordToEdit(item);
                                  setIsWordModalOpen(true);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Tự nhập nghĩa tiếng Việt cho từ này"
                              >
                                <span>✏️</span>
                                <span>Thêm nghĩa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWordForAiMeaning(item);
                                  setIsAiMeaningModalOpen(true);
                                }}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Yêu cầu AI gợi ý nghĩa tiếng Việt và xác nhận trước khi lưu"
                              >
                                <span>✨</span>
                                <span>Gợi ý nghĩa</span>
                              </button>
                            </div>
                          ) : showMeaning ? (
                            /* Có nghĩa và đang bật "Hiện nghĩa tiếng Việt" -> hiển thị ngay dưới từ */
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-[var(--brand-text)] leading-snug break-words">
                                {meaningText}
                              </p>
                              {!visibility.showMeaning && (
                                <button
                                  type="button"
                                  onClick={() => toggleReveal(item.id, 'meaning')}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
                                  title="Che lại nghĩa tiếng Việt"
                                  aria-label="Che lại nghĩa tiếng Việt"
                                >
                                  <span>👁️‍🗨️</span>
                                  <span>Che</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Nghĩa có dữ liệu nhưng đang bị che: Hiển thị trạng thái che và nút "Xem đáp án", KHÔNG ghi "Chưa có nghĩa" */
                            <button
                              type="button"
                              onClick={() => toggleReveal(item.id, 'meaning')}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700/60 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                              title="Bấm để xem đáp án nghĩa tiếng Việt"
                              aria-label="Xem đáp án nghĩa tiếng Việt"
                            >
                              <span>👁️</span>
                              <span>Xem đáp án</span>
                            </button>
                          )}
                        </div>

                        {/* Hàng 3: Đồng nghĩa & Trái nghĩa (CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU) */}
                        {(hasSynonyms || hasAntonyms) && (
                          <div className="flex flex-col gap-1.5 text-xs">
                            {/* Đồng nghĩa */}
                            {hasSynonyms && (
                              <div className="flex items-start gap-1.5 flex-wrap">
                                <strong className="text-emerald-600 font-bold text-[11px] mt-0.5">Đồng nghĩa:</strong>
                                {showSynonyms ? (
                                  <div className="flex items-center flex-wrap gap-1.5 flex-1">
                                    {item.synonyms?.split(/[=,;]+/).map(s => s.trim()).filter(Boolean).map((syn, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 rounded font-medium border border-emerald-100 dark:border-emerald-800/30 break-words text-[11px]">{syn}</span>
                                    ))}
                                    {!visibility.showSynonyms && (
                                      <button
                                        type="button"
                                        onClick={() => toggleReveal(item.id, 'synonyms')}
                                        className="text-[10px] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer border border-transparent hover:border-emerald-200"
                                        title="Che lại đồng nghĩa"
                                        aria-label="Che lại đồng nghĩa"
                                      >
                                        👁️‍🗨️ Che
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(item.id, 'synonyms')}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-dashed border-emerald-300 dark:border-emerald-700 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                                    title="Xem đáp án từ đồng nghĩa"
                                    aria-label="Xem từ đồng nghĩa"
                                  >
                                    <span>👁️</span>
                                    <span>Xem đáp án</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Trái nghĩa */}
                            {hasAntonyms && (
                              <div className="flex items-start gap-1.5 flex-wrap">
                                <strong className="text-rose-500 font-bold text-[11px] mt-0.5">Trái nghĩa:</strong>
                                {showAntonyms ? (
                                  <div className="flex items-center flex-wrap gap-1.5 flex-1">
                                    {item.antonyms?.split(/[=,;]+/).map(a => a.trim()).filter(Boolean).map((ant, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 rounded font-medium border border-rose-100 dark:border-rose-800/30 break-words text-[11px]">{ant}</span>
                                    ))}
                                    {!visibility.showAntonyms && (
                                      <button
                                        type="button"
                                        onClick={() => toggleReveal(item.id, 'antonyms')}
                                        className="text-[10px] px-1.5 py-0.5 rounded text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer border border-transparent hover:border-rose-200"
                                        title="Che lại trái nghĩa"
                                        aria-label="Che lại trái nghĩa"
                                      >
                                        👁️‍🗨️ Che
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleReveal(item.id, 'antonyms')}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-dashed border-rose-300 dark:border-rose-700 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                                    title="Xem đáp án từ trái nghĩa"
                                    aria-label="Xem từ trái nghĩa"
                                  >
                                    <span>👁️</span>
                                    <span>Xem đáp án</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hàng 4: Ví dụ câu (CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU) */}
                        {item.example && (
                          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-3 py-2 rounded-lg space-y-0.5">
                            <p className="italic font-sans">
                              <span className="font-semibold not-italic text-[var(--brand-text)] mr-1.5">Ví dụ:</span>
                              "{item.example}"
                            </p>
                            {item.exampleTranslation && (
                              <p className="text-[11px] text-[var(--text-muted)] pl-5">
                                ↳ {item.exampleTranslation}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Hàng 5: Footer (Ngày học gần nhất lấy từ lịch sử thật; chưa học thì ghi "Chưa học") */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedFolderId === 'all' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-[var(--brand-text)] bg-[var(--brand-light)] px-2.5 py-0.5 rounded-full">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span>{item.folderId ? item.listName : 'Chưa phân loại'}</span>
                              </span>
                            )}
                            {item.notes && (
                              <span className="italic truncate max-w-[200px] sm:max-w-xs">
                                💡 {item.notes}
                              </span>
                            )}
                          </div>
                          <span className="text-xs">
                            Lần học cuối: {item.lastReviewedAt ? new Date(item.lastReviewedAt).toLocaleDateString('vi-VN') : 'Chưa học'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Phân trang / Tải thêm khi danh sách từ dài */}
                  {words.length > visibleCount && (
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 30)}
                        className="px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-blue-400 text-xs font-bold text-[var(--text-primary)] hover:text-blue-600 transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        Xem thêm {Math.min(30, words.length - visibleCount)} từ (Đang hiện {displayedWords.length}/{words.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(words.length)}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-blue-600 underline cursor-pointer"
                      >
                        Hiện toàn bộ {words.length} từ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODALS
         ======================================================== */}
      {/* 1. Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folderToEdit={folderToEdit}
        initialMode={folderModalInitialMode}
        onSuccess={async (updatedFolder, deletedId) => {
          await fetchFolders();
          if (deletedId) {
            toast.success('Đã xóa thư mục và các từ vựng bên trong');
            if (selectedFolderId === deletedId) {
              setSelectedFolderId(null);
            }
            fetchWords();
          } else if (updatedFolder) {
            toast.success(folderToEdit ? 'Đã cập nhật thư mục' : 'Đã tạo thư mục thành công');
            if (!folderToEdit) {
              if (updatedFolder.language && updatedFolder.language !== currentLanguage) {
                await switchLanguage(updatedFolder.language as SupportedLanguage);
              }
              setSelectedFolderId(updatedFolder.id);
            }
            fetchWords();
          }
        }}
      />

      {/* 2. Word Modal */}
      <WordModal
        isOpen={isWordModalOpen}
        onClose={() => setIsWordModalOpen(false)}
        wordToEdit={wordToEdit}
        folders={folders}
        activeFolderId={typeof selectedFolderId === 'number' ? selectedFolderId : null}
        onSuccess={(savedWord, isNew) => {
          toast.success(isNew ? `Đã thêm từ "${savedWord.word}"` : `Đã cập nhật từ "${savedWord.word}"`);
          fetchWords();
          fetchFolders();
          if (savedWord.folderId) {
            setSelectedFolderId(savedWord.folderId);
          } else {
            setSelectedFolderId('all');
          }
        }}
        onBulkSuccess={({ added, skipped, folderId }) => {
          toast.success(`Đã thêm ${added} từ vựng${skipped ? ` (bỏ qua ${skipped} từ trùng)` : ''}`);
          fetchWords();
          fetchFolders();
          setSelectedFolderId(folderId ?? 'all');
        }}
      />

      {/* 3. Move Word Modal */}
      <MoveWordModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        word={wordToMove}
        folders={folders}
        onSuccess={(updated) => {
          toast.success(`Đã chuyển từ "${updated.word}" sang thư mục khác`);
          fetchWords();
          fetchFolders();
        }}
      />

      {/* 4. Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        folders={folders}
        activeFolderId={typeof selectedFolderId === 'number' ? selectedFolderId : null}
        onSuccess={(result) => {
          toast.success(`Đã nhập thành công ${result.count} từ vựng từ Excel!`);
          fetchFolders();
          if (result.folderId) {
            setSelectedFolderId(result.folderId);
          } else {
            fetchWords();
          }
        }}
      />

      {/* 4.5. Paste List Modal (Reusing ExcelImportModal with mode='paste') */}
      <ExcelImportModal
        isOpen={isPasteModalOpen}
        mode="paste"
        onClose={() => setIsPasteModalOpen(false)}
        folders={folders}
        activeFolderId={typeof selectedFolderId === 'number' ? selectedFolderId : null}
        onSuccess={(result) => {
          toast.success(`Đã dán thành công ${result.count} từ vựng!`);
          fetchFolders();
          if (result.folderId) {
            setSelectedFolderId(result.folderId);
          } else {
            fetchWords();
          }
        }}
      />

      {/* 5. Study Session Modal */}
      <StudySessionModal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        folders={folders}
        initialFolderId={typeof selectedFolderId === 'number' ? selectedFolderId : null}
        allWords={words}
        onProgressSaved={() => {
          fetchWords();
          fetchFolders();
        }}
      />

      {/* 6. Reanalyze Modal */}
      <ReanalyzeModal
        isOpen={isReanalyzeModalOpen}
        onClose={() => setIsReanalyzeModalOpen(false)}
        currentLanguage={currentLanguage}
        onSuccess={(count) => {
          toast.success(`Đã chuẩn hóa thành công ${count} từ vựng!`);
          fetchFolders();
          fetchWords();
        }}
      />

      {/* 7. AI Suggest Meaning Modal */}
      <AiSuggestMeaningModal
        isOpen={isAiMeaningModalOpen}
        onClose={() => {
          setIsAiMeaningModalOpen(false);
          setWordForAiMeaning(null);
        }}
        word={wordForAiMeaning}
        currentLanguage={currentLanguage}
        onMeaningApplied={(updated) => {
          toast.success(`Đã lưu nghĩa tiếng Việt cho từ "${updated.word}"`);
          fetchWords();
        }}
      />

      {/* 8. Alert Dialog for Deletion */}
      <AlertDialog
        isOpen={!!wordToDelete}
        onClose={() => setWordToDelete(null)}
        onConfirm={confirmDeleteWord}
        title="Xóa từ vựng?"
        description={
          wordToDelete ? (
            <span>
              Bạn có chắc chắn muốn xóa từ <strong className="text-[var(--text-primary)] font-bold">"{wordToDelete.word}"</strong>?
              <br />
              Từ vựng này sẽ bị xóa khỏi toàn bộ dữ liệu và tiến độ học sẽ bị mất.
            </span>
          ) : null
        }
        cancelText="Hủy"
        confirmText="Xóa"
        isProcessing={isDeletingWord}
      />
    </div>
  );
}

"use client";
import { Search } from "lucide-react";

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
  const [openFolderMenuId, setOpenFolderMenuId] = useState<number | null>(null);

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

  // Close folder menu on click outside
  useEffect(() => {
    if (openFolderMenuId === null) return;
    const handleClickOutside = () => setOpenFolderMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openFolderMenuId]);

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
        /* ========================================================
           STATE 1: DANH SÁCH THƯ MỤC "TỪ VỰNG CỦA TÔI"
           - Tiêu đề gọn gàng: "Từ vựng của tôi", cờ ngôn ngữ, tổng số từ
           - Nút "+ Tạo thư mục" là thao tác chính, "Phân tích lại dữ liệu" là thao tác phụ
           - Mục tổng hợp "Tất cả từ vựng" dạng hàng truy cập gọn phía trên, viền đặc
           - Ô tìm kiếm theo tên thư mục và menu sắp xếp (Cập nhật gần nhất, Tên A-Z, Số từ)
           - Lưới thẻ thư mục gọn gàng, bo tròn tối đa 8px (rounded-lg), menu ba chấm
           ======================================================== */
        <div className="w-full max-w-6xl mx-auto space-y-4 animate-fade-up">
          {/* 1. Header chính rút gọn: 1 tiêu đề duy nhất, không mô tả dài dòng */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl shrink-0">📁</span>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                Từ vựng của tôi
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1 shrink-0">
                <span>{currentLangInfo.flag}</span>
                <span>{currentLangInfo.name}</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                {totalWordsInAllFolders} từ
              </span>
            </div>

            {/* Actions: "Phân tích lại dữ liệu" (thao tác phụ) & "Tạo thư mục" (thao tác chính) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsReanalyzeModalOpen(true)}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                title="Phân tích lại dữ liệu từ vựng đã nhập (có xem trước và xác nhận trước khi lưu)"
                aria-label="Phân tích lại dữ liệu"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Phân tích lại dữ liệu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFolderToEdit(null);
                  setFolderModalInitialMode('edit');
                  setIsFolderModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
                aria-label="Tạo thư mục mới"
              >
                <span className="text-sm font-bold">+</span>
                <span>Tạo thư mục</span>
              </button>
            </div>
          </div>

          {/* 2. Mục tổng hợp: "Tất cả từ vựng" - Hàng truy cập gọn phía trên lưới, viền đặc (không tính vào số thư mục) */}
          <div
            onClick={() => handleSelectFolder('all')}
            className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-500/60 hover:bg-[var(--bg-subtle)]/40 transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] select-none shadow-xs"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectFolder('all');
              }
            }}
            title={`Tất cả từ vựng (${totalWordsInAllFolders} từ)`}
            aria-label={`Tất cả từ vựng (${totalWordsInAllFolders} từ)`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-base shrink-0">
                📚
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                  Tất cả từ vựng
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Tổng hợp
                </span>
                <span className="hidden sm:inline text-xs text-[var(--text-muted)]">
                  • Toàn bộ từ vựng {currentLangInfo.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 whitespace-nowrap">
                {totalWordsInAllFolders} từ
              </span>
              <span className="text-sm font-bold text-[var(--text-muted)] group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </div>

          {/* 3. Thanh tìm kiếm, đếm số thư mục & sắp xếp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {/* Đếm số thư mục cạnh khu vực danh sách */}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Thư mục
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
                {folderSearchQuery.trim() ? `${filteredFolders.length}/${folders.length}` : `${folders.length}`} thư mục
              </span>
            </div>

            {/* Ô tìm kiếm & Menu sắp xếp */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="absolute left-2.5 top-2.5 text-[var(--text-muted)]">
                    <Search size={16} />
                  </span>
                <input
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên thư mục..."
                  className="w-full pl-9 pr-7 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  aria-label="Tìm theo tên thư mục"
                />
                {folderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFolderSearchQuery('')}
                    className="absolute right-2 top-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    aria-label="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="relative shrink-0 w-44">
                <Select
                  value={folderSortBy}
                  onChange={(val) => setFolderSortBy(val as any)}
                  options={[
                    { value: 'recent', label: 'Cập nhật gần nhất' },
                    { value: 'az', label: 'Tên A–Z' },
                    { value: 'count', label: 'Số từ (nhiều nhất)' },
                  ]}
                  ariaLabel="Sắp xếp thư mục"
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>

          {/* 4. Lưới thẻ thư mục: Gọn, không đường phân cách thừa, bo góc 8px (rounded-lg) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleSelectFolder(folder.id)}
                className="relative p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-500/60 hover:shadow-sm focus-within:ring-2 focus-within:ring-blue-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] select-none min-h-[64px]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectFolder(folder.id);
                  }
                }}
                title={folder.name}
                aria-label={`Thư mục ${folder.name} (${folder.wordCount} từ)`}
              >
                {/* Phần trái: Icon màu + Tên tối đa 2 dòng */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-white/10"
                    style={{ backgroundColor: folder.color || '#3b82f6' }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug break-words"
                      title={folder.name}
                    >
                      {folder.name}
                    </h3>
                    {folder.description && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 truncate mt-0.5">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phần phải: Số từ và Nút menu ba chấm */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border)] whitespace-nowrap">
                    {folder.wordCount} từ
                  </span>

                  {/* Menu ba chấm thao tác */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                      title="Tùy chọn thư mục"
                      aria-label={`Tùy chọn thư mục ${folder.name}`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>

                    {/* Menu Dropdown: Đổi tên & Xóa */}
                    {openFolderMenuId === folder.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-8 z-30 w-36 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl text-xs space-y-0.5 animate-scale-in"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFolderMenuId(null);
                            setFolderToEdit(folder);
                            setFolderModalInitialMode('edit');
                            setIsFolderModalOpen(true);
                          }}
                          className="w-full px-3 py-1.5 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span>✏️</span>
                          <span>Đổi tên</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFolderMenuId(null);
                            setFolderToEdit(folder);
                            setFolderModalInitialMode('delete');
                            setIsFolderModalOpen(true);
                          }}
                          className="w-full px-3 py-1.5 text-left font-medium text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span>🗑️</span>
                          <span>Xóa thư mục</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Mục Chưa phân loại (nếu có từ chưa gán thư mục) */}
            {unassignedCount > 0 && !folderSearchQuery.trim() && (
              <div
                onClick={() => handleSelectFolder('unassigned')}
                className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-amber-500/60 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] select-none min-h-[64px]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectFolder('unassigned');
                  }
                }}
                title={`Chưa phân loại (${unassignedCount} từ)`}
                aria-label={`Chưa phân loại (${unassignedCount} từ)`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-base p-1 rounded-md bg-amber-500/10 text-amber-600 shrink-0">
                    📁
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-amber-600 transition-colors">
                      Chưa phân loại
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 truncate mt-0.5">
                      Từ vựng chưa xếp vào thư mục
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 whitespace-nowrap">
                  {unassignedCount} từ
                </span>
              </div>
            )}

            {/* Trạng thái không tìm thấy khi lọc tìm kiếm */}
            {filteredFolders.length === 0 && folderSearchQuery.trim() && (
              <div className="col-span-full p-8 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-lg space-y-3">
                <div className="text-2xl">🔍</div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Không tìm thấy thư mục nào
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Không có thư mục nào khớp với từ khóa "{folderSearchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => setFolderSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            )}

            {/* Trạng thái trống khi tài khoản chưa có thư mục nào */}
            {folders.length === 0 && unassignedCount === 0 && (
              <div className="col-span-full p-8 text-center bg-[var(--bg-card)] border border-dashed border-[var(--border)] rounded-lg space-y-3">
                <div className="text-3xl">📂</div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Chưa có thư mục từ vựng nào
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Hãy tạo thư mục đầu tiên để quản lý từ vựng {currentLangInfo.name} hoặc nhập nhanh danh sách từ file Excel.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFolderToEdit(null);
                    setFolderModalInitialMode('edit');
                    setIsFolderModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  + Tạo thư mục ngay
                </button>
              </div>
            )}
          </div>
        </div>
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
                  UNFRAMED COMPACT HEADER & ACTION TOOLBAR
                 ======================================================== */}
              <div className="space-y-3 pb-1">
                {/* Hàng 1: Nút quay lại thư mục + Nhóm thao tác chính (responsive) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handleBackToFolders}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-400 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs active:scale-95 cursor-pointer group"
                    title="Quay lại danh sách thư mục"
                    aria-label="Quay lại danh sách thư mục"
                  >
                    <span className="text-sm transform group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Quay lại thư mục</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWordToEdit(null);
                        setIsWordModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
                      title="Thêm từ mới vào thư mục này"
                      aria-label="Thêm từ mới vào thư mục này"
                    >
                      <span>+</span>
                      <span>Thêm từ mới</span>
                    </button>

                    <div className="relative group">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <span>📥</span>
                        <span>Nhập từ ▼</span>
                      </button>
                      <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
                        <div className="w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setIsPasteModalOpen(true)}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 transition-colors"
                          >
                            <span>📋</span> Dán danh sách
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsExcelModalOpen(true)}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                          >
                            <span>📊</span> Nhập Excel
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        words.length > 0
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                      }`}
                      title="Học flashcard, trắc nghiệm, luyện gõ và nghe viết"
                    >
                      <span>🎯</span>
                      <span>Học từ vựng</span>
                    </button>

                    <div className="relative group">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-center shadow-xs w-8"
                      >
                        ⋮
                      </button>
                      <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-50">
                        <div className="w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setIsReanalyzeModalOpen(true)}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2 transition-colors"
                          >
                            <span>🔄</span> Phân tích lại
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: Tên thư mục đầy đủ & số lượng từ (Unframed, không ép thành dấu "...") */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl shrink-0">
                      {selectedFolderId === 'all'
                        ? '📚'
                        : selectedFolderId === 'unassigned'
                        ? '📁'
                        : '📂'}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-snug break-words">
                      {selectedFolderTitle}
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                      {selectedFolderId === 'all'
                        ? `${totalWordsInAllFolders} từ`
                        : selectedFolderId === 'unassigned'
                        ? `${unassignedCount} từ`
                        : `${activeFolder?.wordCount ?? words.length} từ`}
                    </span>
                    {activeFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setFolderToEdit(activeFolder);
                          setIsFolderModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-blue-600 hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                        title="Đổi tên thư mục"
                        aria-label="Đổi tên thư mục"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                  {activeFolder?.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 break-words">
                      {activeFolder.description}
                    </p>
                  )}
                </div>

                {/* Hàng 3 & 4: Chỉ hiện khi có từ vựng hoặc đang lọc */}
                {(words.length > 0 || searchKeyword !== '' || statusFilter !== 'all') && (
                  <>
                    {/* Hàng 3: Tìm kiếm & Bộ lọc trạng thái (Unframed) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                      {/* Search Box */}
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[var(--text-muted)]">
                            <Search size={16} />
                          </span>
                        <input
                          type="text"
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          placeholder="Tìm kiếm trong thư mục này..."
                          className="w-full pl-10 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                          aria-label="Tìm kiếm từ vựng trong thư mục"
                        />
                        {searchKeyword && (
                          <button
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2.5 top-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            aria-label="Xóa tìm kiếm"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Learning Status Filter */}
                      <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)] self-start sm:self-auto overflow-x-auto">
                        {[
                          { id: 'all', label: 'Tất cả' },
                          { id: 'new', label: 'Mới' },
                          { id: 'learning', label: 'Đang học' },
                          { id: 'mastered', label: 'Đã thuộc' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                              statusFilter === tab.id
                                ? 'bg-[var(--bg-card)] text-blue-600 shadow-sm'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            aria-label={`Lọc trạng thái ${tab.label}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hàng 4: Điều khiển ẩn / hiện ôn tập */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="relative group">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <span>👁️</span>
                          <span>Tùy chọn hiển thị ▼</span>
                        </button>
                        <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                          <div className="w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col p-3 gap-3">
                            {/* 1. Target Language Word toggle */}
                            <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                              <span className={`font-semibold text-xs transition-colors ${visibility.showWord ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                                {targetWordLabel}
                              </span>
                              <input
                                type="checkbox"
                                checked={visibility.showWord}
                                onChange={(e) => updateVisibility({ showWord: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </label>

                            {/* 2. Meaning toggle */}
                            <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                              <span className={`font-semibold text-xs transition-colors ${visibility.showMeaning ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                                Hiện nghĩa tiếng Việt
                              </span>
                              <input
                                type="checkbox"
                                checked={visibility.showMeaning}
                                onChange={(e) => updateVisibility({ showMeaning: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </label>

                            {/* 3. Synonyms toggle */}
                            <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                              <span className={`font-semibold text-xs transition-colors ${visibility.showSynonyms ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                                Hiện đồng nghĩa
                              </span>
                              <input
                                type="checkbox"
                                checked={visibility.showSynonyms}
                                onChange={(e) => updateVisibility({ showSynonyms: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </label>

                            {/* 4. Antonyms toggle */}
                            <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                              <span className={`font-semibold text-xs transition-colors ${visibility.showAntonyms ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                                Hiện trái nghĩa
                              </span>
                              <input
                                type="checkbox"
                                checked={visibility.showAntonyms}
                                onChange={(e) => updateVisibility({ showAntonyms: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleShowAll}
                        disabled={!isAnyHidden}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isAnyHidden
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95 cursor-pointer'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-50 cursor-default'
                        }`}
                        title="Hiện lại toàn bộ từ, nghĩa, đồng nghĩa và trái nghĩa"
                        aria-label="Hiện tất cả nội dung bị ẩn"
                      >
                        <span>✓</span>
                        <span>Hiện tất cả</span>
                      </button>
                    </div>
              </>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
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
                        className="p-3.5 md:p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-blue-400/40 shadow-xs transition-all space-y-2 group"
                      >
                        {/* Hàng 1: Từ, Phát âm, Từ loại, Trạng thái học và Icon thao tác */}
                        <div className="flex items-center justify-between gap-2 flex-wrap min-h-[30px]">
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
                              className="w-6 h-6 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 text-xs flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95"
                              title="Nghe phát âm"
                              aria-label="Nghe phát âm"
                            >
                              🔊
                            </button>

                            {/* Từ vựng hoặc Nút xem từ khi bị che */}
                            {showTargetWord ? (
                              <div className="inline-flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-base md:text-lg font-black text-[var(--text-primary)] font-sans break-words">
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
                                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/30">
                                    {getPrimaryReading(item)}
                                  </span>
                                )}

                                {/* Loại từ (POS) */}
                                {item.partOfSpeech && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 uppercase tracking-wide">
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

                            {/* Badge trạng thái học */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                item.status === 'mastered'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : item.status === 'learning'
                                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              }`}
                            >
                              {item.status === 'mastered'
                                ? 'Đã thuộc'
                                : item.status === 'learning'
                                ? 'Đang học'
                                : 'Mới'}
                            </span>
                          </div>

                          {/* Nhóm nút thao tác: Sửa, Chuyển thư mục, Xóa dạng icon kèm tooltip */}
                          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setWordToEdit(item);
                                setIsWordModalOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-amber-600 hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                              title="Chỉnh sửa từ vựng"
                              aria-label="Chỉnh sửa từ vựng"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setWordToMove(item);
                                setIsMoveModalOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-blue-600 hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                              title="Chuyển sang thư mục khác"
                              aria-label="Chuyển thư mục"
                            >
                              📂
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Xóa từ vựng"
                              aria-label="Xóa từ vựng"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Hàng 2: Nghĩa tiếng Việt (Dễ đọc, giữ kích thước ổn định, hiển thị đúng trạng thái) */}
                        <div className="min-h-[28px] flex items-center">
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
                              <p className="text-sm md:text-base font-semibold text-indigo-600 dark:text-indigo-400 leading-relaxed break-words">
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
                          <div className="flex flex-col gap-2 text-xs pt-1 mt-1 border-t border-[var(--border-subtle)]">
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
                          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-2.5 rounded-xl border border-[var(--border)] space-y-0.5">
                            <p className="italic font-sans">
                              <span className="font-bold not-italic text-indigo-600 dark:text-indigo-400 mr-1.5">Ví dụ:</span>
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] pt-1.5 border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedFolderId === 'all' && (
                              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/30">
                                <span>📁</span>
                                <span>{item.folderId ? item.listName : 'Chưa phân loại'}</span>
                              </span>
                            )}
                            {item.notes && (
                              <span className="italic truncate max-w-[200px] sm:max-w-xs">
                                💡 {item.notes}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px]">
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

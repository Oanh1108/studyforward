"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getFarmStars } from "@/lib/farmSystem";
import {
  SpacedWordItem,
  DayKey,
  getTodayKey,
  SPACING_INTERVALS,
  getNextSpacedStep,
  SPACED_REPETITION_PRESET_WORDS,
  analyzeWordStructure,
  POS_REGEX,
  recordWordProgressToDb,
  isDueForReview,
  buildSpacedWordPool,
} from "@/lib/spacedRepetition";

interface CustomWord {
  id: number;
  listName: string;
  word: string;
  meaning?: string;
  example?: string;
  stage?: number;
  intervalDays?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

interface ParsedWordItem {
  id: string;
  word: string;
  meaning: string;
  example: string;
}

interface ManualWordEntry {
  id: string;
  word: string;
  meaning: string;
  example: string;
}

export interface PresetTopic {
  id: number;
  day: string;
  name: string;
  category: string;
  words: number;
  icon: string;
  progress: number;
  due: number;
}

const RAW_TOPICS: Omit<PresetTopic, "words">[] = [
  { id: 1,  day: "DAY 01", name: "Thoát cảnh thất nghiệp", category: "Tuyển dụng", icon: "👔", progress: 0, due: 0 },
  { id: 2,  day: "DAY 02", name: "Quy định về trang phục", category: "Phép tắc - Quy định", icon: "📜", progress: 0, due: 0 },
  { id: 3,  day: "DAY 03", name: "Cao thủ chốn văn phòng", category: "Công việc văn phòng (1)", icon: "🏢", progress: 0, due: 0 },
  { id: 4,  day: "DAY 04", name: "Bí quyết kinh doanh", category: "Công việc văn phòng (2)", icon: "💡", progress: 0, due: 0 },
  { id: 5,  day: "DAY 05", name: "Vũ khí bí mật", category: "Công việc văn phòng (3)", icon: "📂", progress: 0, due: 0 },
  { id: 6,  day: "DAY 06", name: "Ngày nghỉ", category: "Thời gian rảnh - Cộng đồng", icon: "🏖️", progress: 0, due: 0 },
  { id: 7,  day: "DAY 07", name: "Chiến lược marketing", category: "Marketing (1)", icon: "📢", progress: 0, due: 0 },
  { id: 8,  day: "DAY 08", name: "Chiến lược marketing", category: "Marketing (2)", icon: "🎯", progress: 0, due: 0 },
  { id: 9,  day: "DAY 09", name: "Hồi sinh nền kinh tế", category: "Kinh tế", icon: "💹", progress: 0, due: 0 },
  { id: 10, day: "DAY 10", name: "Cao thủ mua sắm", category: "Mua sắm", icon: "🛍️", progress: 0, due: 0 },
  { id: 11, day: "DAY 11", name: "Ra mắt sản phẩm mới", category: "Phát triển sản phẩm", icon: "✨", progress: 0, due: 0 },
  { id: 12, day: "DAY 12", name: "Tự động hóa ở nhà máy", category: "Sản xuất", icon: "🏭", progress: 0, due: 0 },
  { id: 13, day: "DAY 13", name: "Khách hàng là thượng đế", category: "Dịch vụ khách hàng", icon: "👑", progress: 0, due: 0 },
  { id: 14, day: "DAY 14", name: "Mục đích chuyến công tác", category: "Du lịch - Sân bay", icon: "✈️", progress: 0, due: 0 },
  { id: 15, day: "DAY 15", name: "Đàm phán hợp đồng", category: "Hợp đồng", icon: "📝", progress: 0, due: 0 },
  { id: 16, day: "DAY 16", name: "Hiệp định thương mại", category: "Giao dịch", icon: "🤝", progress: 0, due: 0 },
  { id: 17, day: "DAY 17", name: "Giao hàng nhanh", category: "Thương mại - Vận chuyển", icon: "🚚", progress: 0, due: 0 },
  { id: 18, day: "DAY 18", name: "Món ăn đặc biệt", category: "Nơi lưu trú - Nhà hàng", icon: "🍽️", progress: 0, due: 0 },
  { id: 19, day: "DAY 19", name: "Tiền thưởng là bao nhiêu", category: "Doanh thu", icon: "💰", progress: 0, due: 0 },
  { id: 20, day: "DAY 20", name: "Tiết kiệm chi tiêu", category: "Kế toán", icon: "🧮", progress: 0, due: 0 },
  { id: 21, day: "DAY 21", name: "Thi đua trong công ty", category: "Xu hướng của doanh nghiệp", icon: "🏆", progress: 0, due: 0 },
  { id: 22, day: "DAY 22", name: "Một cuộc họp khẩn", category: "Hội họp", icon: "👥", progress: 0, due: 0 },
  { id: 23, day: "DAY 23", name: "Nhập vai", category: "Phúc lợi của nhân viên", icon: "🎁", progress: 0, due: 0 },
  { id: 24, day: "DAY 24", name: "Ngày đầu thăng chức", category: "Luân chuyển nhân sự", icon: "🎖️", progress: 0, due: 0 },
  { id: 25, day: "DAY 25", name: "Lái xe", category: "Giao thông", icon: "🚗", progress: 0, due: 0 },
  { id: 26, day: "DAY 26", name: "Số dư tài khoản và lòng hiếu thảo", category: "Ngân hàng", icon: "🏦", progress: 0, due: 0 },
  { id: 27, day: "DAY 27", name: "Bạn bè và cổ phiếu", category: "Đầu tư", icon: "📈", progress: 0, due: 0 },
  { id: 28, day: "DAY 28", name: "Cổ điển", category: "Tòa nhà - Nhà", icon: "🏢", progress: 0, due: 0 },
  { id: 29, day: "DAY 29", name: "Dự báo thời tiết", category: "Môi trường", icon: "🌦️", progress: 0, due: 0 },
  { id: 30, day: "DAY 30", name: "Bệnh nặng", category: "Sức khỏe", icon: "🏥", progress: 0, due: 0 },
];

export const topics: PresetTopic[] = RAW_TOPICS.map((t) => ({
  ...t,
  words: SPACED_REPETITION_PRESET_WORDS.filter(
    (w) => (w.topic || "").trim().toLowerCase() === t.name.trim().toLowerCase()
  ).length,
}));

const SAMPLE_TEXT = `inventory (n) => do inventory = make inventory (v) hàng tồn kho => kiểm kê
exposition = exhibit (n) buổi triển lãm
stitch = sew (n) khâu
edge (n) mép
manuscript (n) bản thảo
editor (n) Biên tập viên/ người biên tập
office supplies (n) văn phòng phẩm
election (n) cuộc bầu cử
hand out = distribute (v) phân phát
renovation = remodeling (n) việc tu sửa/ nâng cấp`;

const VIETNAMESE_CHAR_REGEX = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/i;

export default function VocabularyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [customWords, setCustomWords] = useState<CustomWord[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"bulk" | "excel" | "quizlet" | "single">("bulk");
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [quizletText, setQuizletText] = useState("");
  const [quizletFileName, setQuizletFileName] = useState<string | null>(null);
  const quizletFileInputRef = useRef<HTMLInputElement>(null);
  const [quizletTermSep, setQuizletTermSep] = useState<"tab" | "comma" | "dash" | "auto">("tab");
  const [quizletRowSep, setQuizletRowSep] = useState<"newline" | "semicolon">("newline");
  const [viewLayout, setViewLayout] = useState<"table" | "cards">("table");
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Manual word entry state (nhập từng từ với nút thêm dòng)
  const [listName, setListName] = useState("Danh sách của tôi");
  const [manualWords, setManualWords] = useState<ManualWordEntry[]>([
    { id: "row-1", word: "", meaning: "", example: "" },
  ]);

  // Bulk input state
  const [bulkListName, setBulkListName] = useState("ETS 2023 - test 10 - part 2");
  const [bulkText, setBulkText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedWordItem[]>([]);

  interface EditingWordState {
    id: number;
    headword: string;
    pos: string;
    synonym: string;
    collocation: string;
    meaning: string;
    example: string;
  }

  // Farm Stars state
  const [farmStars, setFarmStars] = useState<number>(getFarmStars());

  useEffect(() => {
    const handleStarsUpdate = (e: any) => {
      if (typeof e.detail === "number") setFarmStars(e.detail);
      else setFarmStars(getFarmStars());
    };
    window.addEventListener("farm-stars-updated", handleStarsUpdate);
    return () => window.removeEventListener("farm-stars-updated", handleStarsUpdate);
  }, []);

  // Edit individual word state
  const [editingWordItem, setEditingWordItem] = useState<EditingWordState | null>(null);
  const [isUpdatingWord, setIsUpdatingWord] = useState(false);
  const [isWordEditMode, setIsWordEditMode] = useState(false);

  // Search & UI state
  const [searchFilter, setSearchFilter] = useState("");
  const [customError, setCustomError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [renameModalFolder, setRenameModalFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteFolderModal, setDeleteFolderModal] = useState<{ folderName: string; wordCount: number } | null>(null);
  const [deleteWordModal, setDeleteWordModal] = useState<{ id: number; wordTitle: string } | null>(null);

  // Auto-dismiss success notification toast
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Audio state
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  // Self-study masking controls (Hide/Show English, Vietnamese, Synonyms)
  const [hideEnglish, setHideEnglish] = useState(false);
  const [hideVietnamese, setHideVietnamese] = useState(false);
  const [hideSynonyms, setHideSynonyms] = useState(false);
  const [revealedEnglishIds, setRevealedEnglishIds] = useState<Set<number>>(new Set());
  const [revealedVietnameseIds, setRevealedVietnameseIds] = useState<Set<number>>(new Set());
  const [revealedSynonymIds, setRevealedSynonymIds] = useState<Set<number>>(new Set());

  // Shuffle / Random order state
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const handleShuffleWords = () => {
    setIsShuffled(true);
    setShuffleSeed((prev) => prev + 1);
  };

  const handleResetOrder = () => {
    setIsShuffled(false);
  };

  const toggleRevealEnglish = (id: number) => {
    setRevealedEnglishIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRevealVietnamese = (id: number) => {
    setRevealedVietnameseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRevealSynonym = (id: number) => {
    setRevealedSynonymIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate dynamic learning progress for each topic based on stored stages & custom words
  const topicsWithProgress = useMemo(() => {
    let savedStages: Record<string, any> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("spaced_vocab_stages");
        if (raw) savedStages = JSON.parse(raw);
      } catch {}
    }

    return topics.map((t) => {
      const topicLower = t.name.trim().toLowerCase();
      const customInTopic = customWords.filter(
        (cw) => (cw.listName || "").trim().toLowerCase() === topicLower
      );
      const presetInTopic = SPACED_REPETITION_PRESET_WORDS.filter(
        (pw) => (pw.topic || "").trim().toLowerCase() === topicLower
      );

      const totalTopicWords = Math.max(t.words, customInTopic.length, presetInTopic.length);

      let learned = 0;
      let due = 0;

      presetInTopic.forEach((pw) => {
        const s = savedStages[pw.id];
        if (s && s.stage >= 2) learned++;
        if (s && (s.stage === 1 || s.intervalDays === 1)) due++;
      });

      customInTopic.forEach((cw) => {
        const s = savedStages[`custom-${cw.id}`];
        const stage = s?.stage ?? cw.stage ?? 1;
        if (stage >= 2) learned++;
        if (isDueForReview(cw)) due++;
      });

      const uniqueLearned = Math.min(learned, totalTopicWords);
      const progress = totalTopicWords > 0 ? Math.round((uniqueLearned / totalTopicWords) * 100) : 0;

      return {
        ...t,
        words: totalTopicWords,
        progress,
        due,
      };
    });
  }, [customWords]);

  const totalWords = topicsWithProgress.reduce((a, t) => a + t.words, 0);
  const learnedWords = topicsWithProgress.reduce((a, t) => a + Math.round((t.words * t.progress) / 100), 0);
  const totalDue = topicsWithProgress.reduce((a, t) => a + t.due, 0);

  // Pronounce word via Web Speech API
  const playPronunciation = (rawWord: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = analyzeWordStructure(rawWord).cleanForSpeech;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    setSpeakingWord(clean);
    utterance.onend = () => setSpeakingWord(null);
    utterance.onerror = () => setSpeakingWord(null);
    window.speechSynthesis.speak(utterance);
  };

  // Smart parser for multiple flexible note formats
  const parseSingleLine = (rawLine: string, index: number): ParsedWordItem | null => {
    let line = rawLine.trim();
    if (!line) return null;

    line = line.replace(/\s+ví dụ cho lần nhập.*$/i, "").trim();
    if (!line) return null;

    // 1. Explicit delimiter: Tab
    if (line.includes("\t")) {
      const parts = line.split("\t");
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        example: parts.slice(2).join(" - ").trim(),
      };
    }

    // 2. Explicit delimiter: " - " or " : "
    if (line.includes(" - ")) {
      const parts = line.split(" - ");
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        example: parts.slice(2).join(" - ").trim(),
      };
    }

    if (line.includes(" : ")) {
      const parts = line.split(" : ");
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        example: parts.slice(2).join(" - ").trim(),
      };
    }

    // 3. Natural pattern: part-of-speech tag like (n), (v), (adj)... followed by Vietnamese meaning
    const posMatches = [...line.matchAll(POS_REGEX)];
    if (posMatches.length > 0) {
      for (let i = posMatches.length - 1; i >= 0; i--) {
        const match = posMatches[i];
        const splitIndex = (match.index ?? 0) + match[0].length;
        const after = line.slice(splitIndex).trim();
        if (after.length > 0) {
          const before = line.slice(0, splitIndex).trim();
          return {
            id: `bulk-${index}-${Date.now()}`,
            word: before,
            meaning: after,
            example: "",
          };
        }
      }
    }

    // 4. Pattern: Generic parentheses followed by Vietnamese meaning
    const parenMatch = line.match(/^(.*?\))\s+([^\(\)]+)$/);
    if (parenMatch) {
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parenMatch[1].trim(),
        meaning: parenMatch[2].trim(),
        example: "",
      };
    }

    // 5. Pattern: Delimiter ":" or ";"
    if (line.includes(":")) {
      const parts = line.split(":");
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        example: parts.slice(2).join(" - ").trim(),
      };
    }

    if (line.includes(";")) {
      const parts = line.split(";");
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: parts[0]?.trim() || "",
        meaning: parts[1]?.trim() || "",
        example: parts.slice(2).join(" - ").trim(),
      };
    }

    // 6. Natural pattern: English words followed by Vietnamese accented words
    const tokens = line.split(/\s+/);
    let firstVnIndex = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (VIETNAMESE_CHAR_REGEX.test(tokens[i])) {
        firstVnIndex = i;
        break;
      }
    }
    if (firstVnIndex > 0) {
      const wordPart = tokens.slice(0, firstVnIndex).join(" ").trim();
      const meaningPart = tokens.slice(firstVnIndex).join(" ").trim();
      return {
        id: `bulk-${index}-${Date.now()}`,
        word: wordPart,
        meaning: meaningPart,
        example: "",
      };
    }

    // 7. Fallback: single word
    return {
      id: `bulk-${index}-${Date.now()}`,
      word: line,
      meaning: "",
      example: "",
    };
  };

  const parseLines = (text: string): ParsedWordItem[] => {
    const rawLines = text.split(/\r?\n/);
    const items: ParsedWordItem[] = [];

    rawLines.forEach((rawLine, index) => {
      const parsed = parseSingleLine(rawLine, index);
      if (parsed && parsed.word) {
        items.push(parsed);
      }
    });

    return items;
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    setParsedItems(parseLines(text));
  };

  const handleUpdateParsedItem = (index: number, field: "word" | "meaning" | "example", value: string) => {
    setParsedItems((prev) => {
      const clone = [...prev];
      if (clone[index]) {
        clone[index] = { ...clone[index], [field]: value };
      }
      return clone;
    });
  };

  const handleRemoveParsedItem = (indexToRemove: number) => {
    setParsedItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleLoadSample = () => {
    handleBulkTextChange(SAMPLE_TEXT);
    setCustomError("");
  };

  const handleClearBulk = () => {
    setBulkText("");
    setParsedItems([]);
    setCustomError("");
  };

  const handleClearExcel = () => {
    setParsedItems([]);
    setExcelFileName(null);
    if (excelFileInputRef.current) {
      excelFileInputRef.current.value = "";
    }
    setCustomError("");
  };

  const parseQuizletContent = (
    text: string,
    termSep: "tab" | "comma" | "dash" | "auto" = quizletTermSep,
    rowSep: "newline" | "semicolon" = quizletRowSep
  ): ParsedWordItem[] => {
    if (!text.trim()) return [];

    let rawLines: string[] = [];
    if (rowSep === "semicolon") {
      rawLines = text.split(";");
    } else {
      rawLines = text.split(/\r?\n/);
    }

    const items: ParsedWordItem[] = [];

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let term = "";
      let def = "";

      if (termSep === "tab") {
        const parts = trimmed.split("\t");
        term = parts[0]?.trim() || "";
        def = parts.slice(1).join("\t").trim();
      } else if (termSep === "comma") {
        const commaIdx = trimmed.indexOf(",");
        if (commaIdx !== -1) {
          term = trimmed.substring(0, commaIdx).trim();
          def = trimmed.substring(commaIdx + 1).trim();
        } else {
          term = trimmed;
        }
      } else if (termSep === "dash") {
        const match = trimmed.match(/\s*[-—–]\s*/);
        if (match && match.index !== undefined) {
          term = trimmed.substring(0, match.index).trim();
          def = trimmed.substring(match.index + match[0].length).trim();
        } else {
          term = trimmed;
        }
      } else {
        // Auto-detect
        if (trimmed.includes("\t")) {
          const parts = trimmed.split("\t");
          term = parts[0]?.trim() || "";
          def = parts.slice(1).join("\t").trim();
        } else if (/\s+[-—–]\s+/.test(trimmed)) {
          const match = trimmed.match(/\s+[-—–]\s+/);
          if (match && match.index !== undefined) {
            term = trimmed.substring(0, match.index).trim();
            def = trimmed.substring(match.index + match[0].length).trim();
          }
        } else if (trimmed.includes(",")) {
          const commaIdx = trimmed.indexOf(",");
          term = trimmed.substring(0, commaIdx).trim();
          def = trimmed.substring(commaIdx + 1).trim();
        } else if (trimmed.includes(":")) {
          const colonIdx = trimmed.indexOf(":");
          term = trimmed.substring(0, colonIdx).trim();
          def = trimmed.substring(colonIdx + 1).trim();
        } else {
          term = trimmed;
        }
      }

      if (term) {
        items.push({
          id: `quizlet-${Date.now()}-${idx}`,
          word: term,
          meaning: def,
          example: "",
        });
      }
    });

    return items;
  };

  const handleQuizletTextChange = (
    text: string,
    termSep: "tab" | "comma" | "dash" | "auto" = quizletTermSep,
    rowSep: "newline" | "semicolon" = quizletRowSep
  ) => {
    setQuizletText(text);
    setParsedItems(parseQuizletContent(text, termSep, rowSep));
  };

  const handleQuizletFileUpload = (file: File) => {
    setQuizletFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setQuizletText(content);
      setParsedItems(parseQuizletContent(content, quizletTermSep, quizletRowSep));
      setCustomError("");
    };
    reader.onerror = () => {
      setCustomError("Không thể đọc file Quizlet. Vui lòng kiểm tra lại định dạng file.");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleClearQuizlet = () => {
    setQuizletText("");
    setQuizletFileName(null);
    setParsedItems([]);
    if (quizletFileInputRef.current) {
      quizletFileInputRef.current.value = "";
    }
    setCustomError("");
  };

  const handleLoadSampleQuizlet = () => {
    const sample = `accommodate\tcung cấp chỗ nghỉ ngơi, đáp ứng nhu cầu
itinerary\tlịch trình chuyến đi, kế hoạch hành trình
reimburse\thoàn tiền, thanh toán lại chi phí
expedite\txúc tiến, đẩy nhanh tiến độ xử lý
inventory\thàng tồn kho, kiểm kê hàng hóa
overhead\tchi phí hoạt động cố định
retention\tsự giữ chân khách hàng
candidate\tứng viên nộp hồ sơ xin việc`;
    setQuizletTermSep("tab");
    setQuizletRowSep("newline");
    handleQuizletTextChange(sample, "tab", "newline");
    setCustomError("");
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        "Từ vựng (*)": "inventory",
        "Loại từ": "n",
        "Đồng nghĩa / Cụm từ": "make inventory = do inventory (v)",
        "Nghĩa tiếng Việt (*)": "hàng tồn kho => kiểm kê",
        "Ví dụ (Example)": "We need to do an inventory check every month.",
      },
      {
        "Từ vựng (*)": "exposition",
        "Loại từ": "n",
        "Đồng nghĩa / Cụm từ": "exhibit",
        "Nghĩa tiếng Việt (*)": "buổi triển lãm",
        "Ví dụ (Example)": "The art exposition attracted thousands of visitors.",
      },
      {
        "Từ vựng (*)": "renovation",
        "Loại từ": "n",
        "Đồng nghĩa / Cụm từ": "remodeling",
        "Nghĩa tiếng Việt (*)": "việc tu sửa/ nâng cấp",
        "Ví dụ (Example)": "The hotel is closed for renovation.",
      },
      {
        "Từ vựng (*)": "hand out",
        "Loại từ": "v",
        "Đồng nghĩa / Cụm từ": "distribute",
        "Nghĩa tiếng Việt (*)": "phân phát",
        "Ví dụ (Example)": "The teacher will hand out the exam papers.",
      },
      {
        "Từ vựng (*)": "edge",
        "Loại từ": "n",
        "Đồng nghĩa / Cụm từ": "border",
        "Nghĩa tiếng Việt (*)": "mép, cạnh, bờ vực",
        "Ví dụ (Example)": "He stood near the edge of the cliff.",
      },
      {
        "Từ vựng (*)": "stitch",
        "Loại từ": "n",
        "Đồng nghĩa / Cụm từ": "sew",
        "Nghĩa tiếng Việt (*)": "khâu, đường khâu",
        "Ví dụ (Example)": "She put a stitch in the hem of her dress.",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 18 }, // Từ vựng
      { wch: 10 }, // Loại từ
      { wch: 32 }, // Đồng nghĩa / Cụm từ
      { wch: 32 }, // Nghĩa tiếng Việt
      { wch: 48 }, // Ví dụ
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TuVungMau");
    XLSX.writeFile(workbook, "mau_nhap_tu_vung_studyforward.xlsx");
  };

  const handleExcelFileUpload = (file: File) => {
    setCustomError("");
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) {
          throw new Error("Không thể đọc nội dung file Excel.");
        }

        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("File Excel không có trang tính (sheet) nào.");
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          throw new Error("File Excel trống hoặc không có dữ liệu hàng nào.");
        }

        // Helper to find column case-insensitively
        const findVal = (row: Record<string, any>, possibleKeys: string[]) => {
          const rowKeys = Object.keys(row);
          for (const target of possibleKeys) {
            const matchedKey = rowKeys.find((k) => k.trim().toLowerCase() === target.toLowerCase());
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
              return String(row[matchedKey]).trim();
            }
          }
          for (const target of possibleKeys) {
            const matchedKey = rowKeys.find((k) => k.trim().toLowerCase().includes(target.toLowerCase()));
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
              return String(row[matchedKey]).trim();
            }
          }
          return "";
        };

        const importedItems: ParsedWordItem[] = [];

        rawRows.forEach((row, index) => {
          const wordRaw = findVal(row, ["Từ vựng (*)", "Từ vựng", "Word", "English", "Term", "Từ mới", "Từ", "Tu vung"]);
          const posRaw = findVal(row, ["Loại từ", "POS", "Part of speech", "Type", "Từ loại", "Loai tu"]);
          const synRaw = findVal(row, ["Đồng nghĩa / Cụm từ", "Đồng nghĩa", "Synonym", "Synonyms", "Collocation", "Cụm từ", "Dong nghia"]);
          const meaningRaw = findVal(row, ["Nghĩa tiếng Việt (*)", "Nghĩa tiếng Việt", "Nghĩa", "Meaning", "Vietnamese", "Dịch", "Nghia"]);
          const exampleRaw = findVal(row, ["Ví dụ (Example)", "Ví dụ", "Example", "Sentences", "Sentence", "Vi du"]);

          if (!wordRaw && !meaningRaw) return;

          let fullWord = wordRaw;
          if (synRaw && !fullWord.includes("=") && !fullWord.includes(synRaw)) {
            fullWord = `${fullWord} = ${synRaw}`;
          }
          if (posRaw && !fullWord.includes(`(${posRaw})`)) {
            const cleanPos = posRaw.replace(/[()]/g, "").trim();
            if (cleanPos) {
              fullWord = `${fullWord} (${cleanPos})`;
            }
          }

          importedItems.push({
            id: `excel-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            word: fullWord || "Word",
            meaning: meaningRaw,
            example: exampleRaw,
          });
        });

        if (importedItems.length === 0) {
          throw new Error("Không tìm thấy cột từ vựng hoặc dữ liệu hợp lệ trong file. Vui lòng tải file mẫu để kiểm tra.");
        }

        setParsedItems(importedItems);
        setExcelFileName(file.name);
      } catch (err: any) {
        setCustomError(err.message || "Lỗi khi xử lý file Excel. Vui lòng thử lại với file mẫu.");
      }
    };

    reader.onerror = () => {
      setCustomError("Đã xảy ra lỗi khi đọc file từ máy tính.");
    };

    reader.readAsArrayBuffer(file);
  };

  // Group words by folder name (Loại trừ các chủ đề TOEIC có sẵn để không lẫn vào Thư mục cá nhân)
  const folderGroups = useMemo(() => {
    const presetNames = new Set(topics.map((t) => t.name.trim().toLowerCase()));
    const map = new Map<string, CustomWord[]>();
    customWords.forEach((item) => {
      const folderName = item.listName?.trim() || "Danh sách của tôi";
      if (presetNames.has(folderName.toLowerCase())) {
        return; // Bỏ qua các chủ đề TOEIC có sẵn
      }
      if (!map.has(folderName)) {
        map.set(folderName, []);
      }
      map.get(folderName)!.push(item);
    });

    return Array.from(map.entries()).map(([name, words]) => ({
      name,
      words,
      count: words.length,
      sampleWords: words.slice(0, 4).map((w) => analyzeWordStructure(w.word).headword),
    }));
  }, [customWords]);

  const handleOpenModal = (presetFolderName?: string, defaultMode?: "bulk" | "excel" | "single") => {
    let target = "";
    if (presetFolderName) {
      target = presetFolderName;
      setIsCreatingNewFolder(false);
    } else if (selectedFolder) {
      target = selectedFolder;
      setIsCreatingNewFolder(false);
    } else if (folderGroups.length > 0) {
      target = folderGroups[0].name;
      setIsCreatingNewFolder(false);
    } else {
      target = "Danh sách của tôi";
      setIsCreatingNewFolder(true);
    }

    setBulkListName(target);
    setListName(target);
    setIsFolderDropdownOpen(false);

    if (defaultMode) {
      setInputMode(defaultMode);
    }
    setIsModalOpen(true);
    setCustomError("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreatingNewFolder(false);
    setIsFolderDropdownOpen(false);
    setExcelFileName(null);
    setQuizletFileName(null);
    setQuizletText("");
    if (excelFileInputRef.current) {
      excelFileInputRef.current.value = "";
    }
    if (quizletFileInputRef.current) {
      quizletFileInputRef.current.value = "";
    }
    setCustomError("");
  };

  // Close folder dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(e.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };
    if (isFolderDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isFolderDropdownOpen]);

  // Reusable folder selector with custom dropdown styled like user's request
  const renderFolderSelector = () => {
    const currentVal = inputMode === "single" ? listName : bulkListName;
    const hasExistingFolders = folderGroups.length > 0;

    const handleValueChange = (newVal: string) => {
      setBulkListName(newVal);
      setListName(newVal);
    };

    if (!hasExistingFolders || isCreatingNewFolder) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Tên bộ đề / thư mục lưu trữ:
            </label>
            {hasExistingFolders && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewFolder(false);
                  const fallback = selectedFolder || folderGroups[0]?.name || "Danh sách của tôi";
                  handleValueChange(fallback);
                }}
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <span>📁</span>
                <span>Chọn thư mục có sẵn</span>
              </button>
            )}
          </div>

          <input
            className="input py-2 text-sm font-medium w-full"
            placeholder="Nhập tên thư mục mới (ví dụ: ETS 2023 - test 10)..."
            value={currentVal}
            onChange={(e) => handleValueChange(e.target.value)}
            autoFocus={isCreatingNewFolder && hasExistingFolders}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            💡 Thư mục mới sẽ được tạo tự động khi bạn lưu từ vựng.
          </p>
        </div>
      );
    }

    const selectedFolderObj = folderGroups.find((f) => f.name === currentVal);

    return (
      <div className="w-full relative" ref={folderDropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Tên bộ đề / thư mục lưu trữ:
          </label>
          <button
            type="button"
            onClick={() => {
              setIsCreatingNewFolder(true);
              setIsFolderDropdownOpen(false);
              handleValueChange("");
            }}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
          >
            <span>➕</span>
            <span>Tạo thư mục mới</span>
          </button>
        </div>

        {/* Custom Dropdown Trigger & Seamless Menu (matching screenshot 2) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFolderDropdownOpen((prev) => !prev)}
            className={`w-full py-2.5 px-3.5 text-sm font-semibold transition-all flex items-center justify-between text-left cursor-pointer rounded-xl border shadow-xs ${
              isFolderDropdownOpen
                ? "border-blue-500 ring-2 ring-blue-500/20 bg-[var(--bg-card)]"
                : "border-gray-200 dark:border-gray-700 hover:border-blue-400 bg-[var(--bg-subtle)]"
            }`}
            style={{
              borderColor: isFolderDropdownOpen ? undefined : "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <span className="truncate pr-2">
              {currentVal ? (
                <>
                  <span className="font-bold">{currentVal}</span>
                  {selectedFolderObj && (
                    <span className="ml-1.5 opacity-60 font-normal text-xs">
                      ({selectedFolderObj.count} từ)
                    </span>
                  )}
                </>
              ) : (
                <span className="opacity-50">-- Chọn thư mục lưu trữ --</span>
              )}
            </span>
            <span className="text-blue-500 text-[11px] shrink-0 font-bold ml-2">
              {isFolderDropdownOpen ? "▲" : "▼"}
            </span>
          </button>

          {/* Custom Dropdown Menu (Floating hiện đại, bóng đổ mềm) */}
          {isFolderDropdownOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-2xl border shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin"
              style={{
                background: "var(--bg-card)",
                borderColor: "rgba(59, 130, 246, 0.35)",
                boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
              }}
            >
              {folderGroups.map((f) => {
                const isSelected = f.name === currentVal;
                return (
                  <div
                    key={f.name}
                    onClick={() => {
                      handleValueChange(f.name);
                      setIsFolderDropdownOpen(false);
                    }}
                    className={`px-3 py-2 text-sm rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-500/12 text-blue-700 dark:text-blue-300 font-bold"
                        : "text-[var(--text-primary)] hover:bg-blue-500/8 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-base shrink-0">📁</span>
                      <span className="truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-normal opacity-60">({f.count} từ)</span>
                      {isSelected && <span className="text-xs font-black text-blue-600 dark:text-blue-400">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
          Từ vựng sẽ được thêm vào thư mục <strong>{currentVal || "đã chọn"}</strong>.
        </p>
      </div>
    );
  };

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || localStorage.getItem("token")
        : null;
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
    fetch(`${apiUrl}/api/vocabulary/custom`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: CustomWord[]) => {
        setCustomWords(data);
        if (typeof window !== "undefined" && Array.isArray(data)) {
          try {
            const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
            const parsed = JSON.parse(raw);
            let changed = false;
            data.forEach((cw) => {
              const key = `custom-${cw.id}`;
              if (
                cw.intervalDays &&
                cw.intervalDays > 1 &&
                (!parsed[key] || parsed[key].intervalDays < cw.intervalDays)
              ) {
                parsed[key] = {
                  intervalDays: cw.intervalDays,
                  stage: cw.stage || 1,
                  lastReviewedAt: cw.lastReviewedAt,
                  nextReviewAt: cw.nextReviewAt,
                };
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));
            }
          } catch {}
        }
      })
      .catch(() => setCustomError("Không thể tải danh sách từ của bạn."));
  }, []);

  const handleAddManualWordRow = () => {
    setManualWords((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, word: "", meaning: "", example: "" },
    ]);
  };

  const handleUpdateManualWord = (index: number, field: keyof ManualWordEntry, value: string) => {
    setManualWords((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveManualWordRow = (index: number) => {
    setManualWords((prev) => {
      if (prev.length <= 1) {
        return [{ id: `row-${Date.now()}`, word: "", meaning: "", example: "" }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Save manual words (nhập từng từ một với nút thêm)
  const handleSaveManualWords = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    const validItems = manualWords.filter((i) => i.word.trim().length > 0);
    if (validItems.length === 0) {
      setCustomError("Vui lòng nhập ít nhất 1 từ vựng (Từ mới bắt buộc có nội dung).");
      return;
    }

    setCustomError("");
    setSuccessMessage("");
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setCustomError("Vui lòng đăng nhập để lưu từ vựng.");
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const targetFolder = listName.trim() || bulkListName.trim() || "Danh sách của tôi";
      const itemsToSave = validItems.map((item) => ({
        word: item.word.trim(),
        meaning: item.meaning.trim() || undefined,
        example: item.example.trim() || undefined,
      }));

      const response = await fetch(`${apiUrl}/api/vocabulary/custom/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listName: targetFolder,
          items: itemsToSave,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Không thể lưu từ vựng.");

      const savedItems: CustomWord[] = data.items || [];
      const savedIds = new Set(savedItems.map((item) => item.id));
      setCustomWords((current) => [...savedItems, ...current.filter((item) => !savedIds.has(item.id))]);

      setSelectedFolder(targetFolder);
      setActiveTab("custom");
      setSuccessMessage(
        `🎉 Đã lưu thành công ${savedItems.length} từ vào thư mục "${targetFolder}"!`
      );
      setManualWords([{ id: `row-${Date.now()}`, word: "", meaning: "", example: "" }]);
      setIsModalOpen(false);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "Không thể lưu từ vựng.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save bulk list
  const handleSaveBulk = async () => {
    const validItems = parsedItems.filter((i) => i.word.trim());
    if (validItems.length === 0) {
      setCustomError("Vui lòng nhập hoặc kiểm tra ít nhất 1 từ vựng hợp lệ.");
      return;
    }

    setCustomError("");
    setSuccessMessage("");
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setCustomError("Vui lòng đăng nhập để lưu danh sách từ vựng.");
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const targetFolderName = bulkListName.trim() || "Danh sách của tôi";
      const itemsToSave = validItems.map((item) => ({
        word: item.word.trim(),
        meaning: item.meaning.trim() || undefined,
        example: item.example.trim() || undefined,
      }));

      const response = await fetch(`${apiUrl}/api/vocabulary/custom/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          listName: targetFolderName,
          items: itemsToSave,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Không thể lưu danh sách từ vựng.");

      const savedItems: CustomWord[] = data.items || [];
      const savedIds = new Set(savedItems.map((item) => item.id));
      setCustomWords((current) => [...savedItems, ...current.filter((item) => !savedIds.has(item.id))]);

      setSelectedFolder(targetFolderName);
      setActiveTab("custom");
      setSuccessMessage(
        `🎉 Đã lưu thành công ${savedItems.length} từ vào thư mục "${targetFolderName}"! (Mới: ${data.added ?? savedItems.length}, Cập nhật: ${data.updated ?? 0})`
      );
      setBulkText("");
      setParsedItems([]);
      setIsModalOpen(false);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "Không thể lưu danh sách từ vựng.");
    } finally {
      setIsSaving(false);
    }
  };

  // Edit a custom word
  const handleOpenEditWord = (item: { id: number; word: string; meaning?: string; example?: string }) => {
    const analysis = analyzeWordStructure(item.word);
    let headword = analysis.headword || item.word;
    let synonym = analysis.synonym || "";
    let collocation = analysis.collocation || "";
    let pos = analysis.posTags.length > 0 ? analysis.posTags[0] : "";
    let meaning = (item.meaning || "").trim();

    // Extract POS from headword if not caught
    const posMatch = headword.match(/\((n|v|adj|adv|prep|conj|pron|num|art|phrase|phr v|phr|v,\s*n|n,\s*v|a)\)/i);
    if (posMatch && !pos) {
      pos = posMatch[0];
      headword = headword.replace(posMatch[0], "").trim();
    }

    // Smart extraction: check if synonym was accidentally embedded in meaning (e.g. "= eat: ăn tại chỗ" or "= eat - ăn tại chỗ")
    if (!synonym) {
      const synInMeaningColon = meaning.match(/^\s*=\s*([^:\-–—\n]+)\s*[:\-–—]\s*(.*)$/);
      if (synInMeaningColon) {
        synonym = synInMeaningColon[1].trim();
        meaning = synInMeaningColon[2].trim();
      } else {
        const synInMeaningOnly = meaning.match(/^\s*=\s*([a-zA-Z\s,'-]+)$/);
        if (synInMeaningOnly) {
          synonym = synInMeaningOnly[1].trim();
          meaning = "";
        }
      }
    }

    setEditingWordItem({
      id: item.id,
      headword,
      pos,
      synonym,
      collocation,
      meaning,
      example: item.example || "",
    });
  };

  const handleSaveEditWord = async () => {
    if (!editingWordItem) return;
    if (!editingWordItem.headword.trim()) {
      setCustomError("Từ vựng không được để trống.");
      return;
    }

    let cleanHead = editingWordItem.headword.trim();
    let cleanSyn = editingWordItem.synonym.trim();
    let cleanPos = editingWordItem.pos.trim();
    const cleanColloc = editingWordItem.collocation.trim();

    // If user accidentally included "=" in headword
    if (cleanHead.includes("=")) {
      const parts = cleanHead.split("=");
      cleanHead = parts[0].trim();
      if (!cleanSyn) {
        cleanSyn = parts.slice(1).join("=").trim();
      }
    }

    // Normalize POS
    if (cleanPos && !cleanPos.startsWith("(")) {
      cleanPos = `(${cleanPos})`;
    }

    // Reconstruct word string: "headword = synonym (pos) => collocation"
    let finalWord = cleanHead;
    if (cleanSyn) {
      const strippedSyn = cleanSyn.replace(/^=\s*/, "").trim();
      finalWord += ` = ${strippedSyn}`;
    }
    if (cleanPos) {
      finalWord += ` ${cleanPos}`;
    }
    if (cleanColloc) {
      const strippedColloc = cleanColloc.replace(/^=>\s*/, "").trim();
      finalWord += ` => ${strippedColloc}`;
    }

    const finalMeaning = editingWordItem.meaning.trim();
    const finalExample = editingWordItem.example.trim() || undefined;

    const token = localStorage.getItem("accessToken");
    setIsUpdatingWord(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      if (token) {
        const response = await fetch(`${apiUrl}/api/vocabulary/custom/${editingWordItem.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            word: finalWord,
            meaning: finalMeaning,
            example: finalExample,
          }),
        });
        if (!response.ok) throw new Error("Không thể cập nhật từ vựng trên máy chủ.");
      }

      setCustomWords((prev) =>
        prev.map((w) =>
          w.id === editingWordItem.id
            ? {
                ...w,
                word: finalWord,
                meaning: finalMeaning,
                example: finalExample,
              }
            : w
        )
      );
      setSuccessMessage(`Đã cập nhật từ "${finalWord}".`);
      setEditingWordItem(null);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : "Lỗi khi cập nhật từ.");
    } finally {
      setIsUpdatingWord(false);
    }
  };

  // Open delete custom word modal
  const handleOpenDeleteWordModal = (id: number, wordTitle: string) => {
    setDeleteWordModal({ id, wordTitle });
  };

  // Confirm delete custom word
  const handleConfirmDeleteWord = async () => {
    if (!deleteWordModal) return;
    const { id, wordTitle } = deleteWordModal;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setCustomError("Vui lòng đăng nhập để thực hiện.");
      return;
    }

    setDeletingId(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/vocabulary/custom/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Không thể xoá từ vựng.");

      setCustomWords((current) => current.filter((item) => item.id !== id));
      setSuccessMessage(`Đã xoá từ "${wordTitle}".`);
      setDeleteWordModal(null);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "Lỗi khi xoá từ.");
    } finally {
      setDeletingId(null);
    }
  };

  // Open delete folder modal
  const handleOpenDeleteFolderModal = (folderName: string, wordCount: number) => {
    setDeleteFolderModal({ folderName, wordCount });
  };

  // Legacy/direct delete handler (now opens modal)
  const handleDeleteFolder = (folderName: string, wordCount?: number) => {
    const count = wordCount ?? customWords.filter((w) => (w.listName?.trim() || "Danh sách của tôi") === folderName).length;
    handleOpenDeleteFolderModal(folderName, count);
  };

  // Confirm delete folder
  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderModal) return;
    const { folderName } = deleteFolderModal;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setCustomError("Vui lòng đăng nhập để thực hiện.");
      return;
    }

    setIsDeletingList(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/vocabulary/custom/list/${encodeURIComponent(folderName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Không thể xoá thư mục từ vựng.");

      setCustomWords((current) => current.filter((item) => (item.listName?.trim() || "Danh sách của tôi") !== folderName));
      if (selectedFolder === folderName) {
        setSelectedFolder(null);
      }
      setSuccessMessage(`Đã xoá thư mục "${folderName}".`);
      setDeleteFolderModal(null);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "Lỗi khi xoá thư mục.");
    } finally {
      setIsDeletingList(false);
    }
  };

  // Open rename modal
  const handleOpenRenameFolder = (folderName: string) => {
    setRenameModalFolder(folderName);
    setNewFolderName(folderName);
    setCustomError("");
  };

  // Confirm rename folder / set
  const handleConfirmRenameFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameModalFolder) return;
    const trimmedNew = newFolderName.trim();
    if (!trimmedNew) {
      setCustomError("Tên thư mục / file không được để trống.");
      return;
    }
    if (trimmedNew === renameModalFolder) {
      setRenameModalFolder(null);
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setCustomError("Vui lòng đăng nhập để thực hiện.");
      return;
    }

    setIsRenamingList(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/vocabulary/custom/list/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldName: renameModalFolder, newName: trimmedNew }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Không thể đổi tên thư mục.");
      }

      setCustomWords((prev) =>
        prev.map((item) =>
          (item.listName?.trim() || "Danh sách của tôi") === renameModalFolder
            ? { ...item, listName: trimmedNew }
            : item
        )
      );

      if (selectedFolder === renameModalFolder) {
        setSelectedFolder(trimmedNew);
      }

      setSuccessMessage(`Đã đổi tên thành công sang "${trimmedNew}".`);
      setRenameModalFolder(null);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "Lỗi khi đổi tên thư mục.");
    } finally {
      setIsRenamingList(false);
    }
  };



  // Words inside the currently selected folder
  const currentFolderWords = useMemo(() => {
    if (!selectedFolder) return [];
    let list = customWords.filter((w) => (w.listName?.trim() || "Danh sách của tôi") === selectedFolder);
    if (list.length === 0) {
      const presets = SPACED_REPETITION_PRESET_WORDS.filter((w) => (w.topic || "").toLowerCase() === selectedFolder.toLowerCase());
      if (presets.length > 0) {
        list = presets.map((pw, idx) => ({
          id: idx + 900000,
          listName: pw.topic || selectedFolder,
          word: pw.word,
          meaning: pw.meaning,
          example: pw.example,
        }));
      }
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (item) =>
          item.word.toLowerCase().includes(q) ||
          (item.meaning && item.meaning.toLowerCase().includes(q))
      );
    }

    if (isShuffled) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    return list;
  }, [customWords, selectedFolder, searchFilter, isShuffled, shuffleSeed]);

  // Check if current active folder is a preset Hacker TOEIC curriculum topic
  const isPresetSelected = useMemo(
    () => topics.some((t) => t.name.toLowerCase() === (selectedFolder || "").toLowerCase()),
    [selectedFolder]
  );
  const selectedPresetTopicObj = useMemo(
    () => topics.find((t) => t.name.toLowerCase() === (selectedFolder || "").toLowerCase()),
    [selectedFolder]
  );

  // Filtered folder groups when in folder overview mode
  const filteredFolderGroups = useMemo(() => {
    if (!searchFilter.trim()) return folderGroups;
    const q = searchFilter.toLowerCase();
    return folderGroups.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.words.some((w) => w.word.toLowerCase().includes(q) || (w.meaning && w.meaning.toLowerCase().includes(q)))
    );
  }, [folderGroups, searchFilter]);

  // Flashcard controls
  const flashcardWords = useMemo(() => {
    if (currentFolderWords.length > 0) {
      return currentFolderWords;
    }
    if (selectedFolder) {
      return customWords.filter((w) => (w.listName?.trim() || "Danh sách của tôi") === selectedFolder);
    }
    return customWords;
  }, [customWords, selectedFolder, currentFolderWords]);

  const handleStartFlashcard = (folderName?: string) => {
    if (folderName) {
      setSelectedFolder(folderName);
    }
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsFlashcardOpen(true);
    setTimeout(() => {
      const words = folderName
        ? customWords.filter((w) => (w.listName?.trim() || "Danh sách của tôi") === folderName)
        : (currentFolderWords.length > 0 ? currentFolderWords : customWords);
      if (words[0]) {
        playPronunciation(words[0].word);
      }
    }, 200);
  };

  const handleNextFlashcard = () => {
    const cur = flashcardWords[flashcardIndex];
    if (cur) {
      recordWordProgressToDb({
        word: cur.word,
        meaning: cur.meaning,
        example: cur.example,
        listName: cur.listName || selectedFolder || undefined,
        isCorrect: true,
      });
    }

    setIsFlipped(false);
    const nextIdx = (flashcardIndex + 1) % flashcardWords.length;
    setFlashcardIndex(nextIdx);
    if (flashcardWords[nextIdx]) {
      playPronunciation(flashcardWords[nextIdx].word);
    }
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    const prevIdx = (flashcardIndex - 1 + flashcardWords.length) % flashcardWords.length;
    setFlashcardIndex(prevIdx);
    if (flashcardWords[prevIdx]) {
      playPronunciation(flashcardWords[prevIdx].word);
    }
  };

  // Keyboard navigation for Folder Flashcard Modal (Space: Flip & Speak, ←: Prev, →: Next, Esc: Close)
  useEffect(() => {
    if (!isFlashcardOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        if (flashcardWords[flashcardIndex]) {
          playPronunciation(flashcardWords[flashcardIndex].word);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevFlashcard();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextFlashcard();
      } else if (e.key === "Escape") {
        setIsFlashcardOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlashcardOpen, flashcardIndex, flashcardWords]);

  // ==========================================================
  // SPACED REPETITION (ÔN TẬP NGẮT QUÃNG) - REAL DUE WORDS TODAY
  // ==========================================================
  const [reviewUpdateTick, setReviewUpdateTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setReviewUpdateTick((t) => t + 1);
    window.addEventListener("spaced-review-completed", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("spaced-review-completed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const isReviewedToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const isTodayFinished = useMemo(() => {
    if (typeof window === "undefined") return false;
    const todayKey = getTodayKey();
    const todayDateStr = new Date().toISOString().split("T")[0];
    return (
      localStorage.getItem(`spaced_finished_${todayKey}`) === todayDateStr ||
      localStorage.getItem("spaced_finished_today") === todayDateStr
    );
  }, [reviewUpdateTick]);

  const { actualDueCount, completedTodayCount, totalAvailableVocab } = useMemo(() => {
    let savedStages: Record<string, any> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("spaced_vocab_stages");
        if (raw) savedStages = JSON.parse(raw);
      } catch {}
    }

    // Nút "Ôn ngay ➔" dẫn tới /vocabulary/review?due=true (với nguồn từ là Tất cả: Từ cá nhân + Chu kỳ TOEIC).
    // Sử dụng chung hàm buildSpacedWordPool và isDueForReview để đảm bảo số từ đến hạn 100% đồng nhất giữa 2 trang.
    const pool = buildSpacedWordPool(customWords, savedStages, "all", "all");

    let due = 0;
    let completed = 0;

    pool.forEach((w) => {
      if (isDueForReview(w)) {
        due++;
      } else {
        completed++;
      }
    });

    const totalAvailable = pool.length;

    // If today is marked finished, zero out due words and set completed
    if (isTodayFinished) {
      return {
        actualDueCount: 0,
        completedTodayCount: Math.max(completed, totalAvailable),
        totalAvailableVocab: totalAvailable,
      };
    }

    return {
      actualDueCount: due,
      completedTodayCount: completed,
      totalAvailableVocab: totalAvailable,
    };
  }, [customWords, isTodayFinished, reviewUpdateTick]);

  const isFinishedTodayState = isTodayFinished || (completedTodayCount > 0 && actualDueCount === 0);

  const handleStartSpacedRepetition = (
    source: "all" | "custom" | "preset" = "all",
    folder?: string
  ) => {
    const params = new URLSearchParams();
    if (source !== "all") params.set("source", source);
    if (folder) params.set("folder", folder);
    const query = params.toString() ? `?${params.toString()}` : "";
    router.push(`/vocabulary/review${query}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-subtle)" }}>
      {/* Top Header */}
      <header
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        className="sticky top-0 z-20 backdrop-blur-md w-full"
      >
        <div className="w-full px-6 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="font-bold text-sm" style={{ color: "var(--brand)" }}>
                StudyForward
              </span>
            </Link>
            <Link href="/dashboard" className="text-sm transition-colors hover:text-blue-500" style={{ color: "var(--text-muted)" }}>
              ← Dashboard
            </Link>
            <Link href="/listening" className="text-sm font-semibold transition-colors hover:text-blue-500 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <span>🎧</span> Luyện nghe
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <LogoutButton bgVariant="subtle" />
            <ThemeToggle variant="subtle" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Main Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Học từ vựng
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Ôn luyện từ vựng theo chủ đề đề thi & quản lý các thư mục từ vựng riêng của bạn
            </p>
          </div>
          {/* Real Spaced Repetition Due Banner */}
          <div className="card px-4 py-2.5 flex items-center gap-3 self-start md:self-auto shadow-sm">
            <span className={`text-2xl ${actualDueCount > 0 && !isFinishedTodayState ? "animate-bounce" : ""}`}>
              {isFinishedTodayState ? "🎉" : actualDueCount > 0 ? "🔔" : totalAvailableVocab > 0 ? "✨" : "📁"}
            </span>
            <div>
              <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                {isFinishedTodayState
                  ? "Đã hoàn thành hôm nay!"
                  : actualDueCount > 0
                  ? `${actualDueCount} từ cần ôn tập`
                  : totalAvailableVocab > 0
                  ? `Sẵn sàng ôn tập (${totalAvailableVocab} từ)`
                  : "Chưa có từ vựng nào"}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {isFinishedTodayState
                  ? `Đã ôn xong ${completedTodayCount > 0 ? completedTodayCount : actualDueCount} từ lịch học hôm nay`
                  : actualDueCount > 0
                  ? "hôm nay (lặp lại ngắt quãng Leitner)"
                  : totalAvailableVocab > 0
                  ? "Chưa có từ đến hạn • Ôn tự do bất cứ lúc nào"
                  : "Tạo bộ từ đầu tiên để bắt đầu học"}
              </div>
            </div>
            {isFinishedTodayState ? (
              <Link
                href="/vocabulary/review"
                className="btn-primary px-3 py-1 text-xs ml-1 hover:shadow-md transition-all active:scale-95 inline-flex items-center cursor-pointer"
                title="Ôn lại thêm phiên nữa"
              >
                Ôn lại
              </Link>
            ) : actualDueCount > 0 ? (
              <Link
                href="/vocabulary/review?due=true"
                className="btn-primary px-3 py-1 text-xs ml-1 hover:shadow-md transition-all active:scale-95 inline-flex items-center cursor-pointer"
                title="Bắt đầu phiên ôn tập các từ đến hạn hôm nay (Spaced Repetition)"
              >
                Ôn ngay ➔
              </Link>
            ) : totalAvailableVocab > 0 ? (
              <Link
                href="/vocabulary/review"
                className="btn-primary px-3 py-1 text-xs ml-1 hover:shadow-md transition-all active:scale-95 inline-flex items-center cursor-pointer"
                title="Vào ôn tập tự do hoặc chơi game ôn từ vựng"
              >
                Ôn tự do ➔
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenModal(undefined, "bulk")}
                className="btn-primary px-3 py-1 text-xs ml-1 hover:shadow-md transition-all active:scale-95 inline-flex items-center cursor-pointer"
                title="Tạo bộ từ vựng mới"
              >
                Thêm từ ➔
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB SWITCHER: TỪ VỰNG CÓ SẴN & TỰ SOẠN                 */}
        {/* ======================================================== */}
        <div
          className="flex items-center gap-2 mb-8 p-1.5 rounded-2xl border max-w-fit shadow-xs"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "preset"
                ? "shadow-sm text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            }`}
            style={activeTab === "preset" ? { background: "var(--brand)" } : {}}
          >
            <span>📚</span>
            <span>Từ vựng có sẵn</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: activeTab === "preset" ? "rgba(255,255,255,0.25)" : "var(--bg-muted)",
                color: activeTab === "preset" ? "#ffffff" : "var(--text-muted)",
              }}
            >
              {topics.length} chủ đề
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "custom"
                ? "shadow-sm text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            }`}
            style={activeTab === "custom" ? { background: "var(--brand)" } : {}}
          >
            <span>✍️</span>
            <span>Từ vựng tự soạn</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: activeTab === "custom" ? "rgba(255,255,255,0.25)" : "var(--bg-muted)",
                color: activeTab === "custom" ? "#ffffff" : "var(--text-muted)",
              }}
            >
              {folderGroups.length} bộ từ
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: TỪ VỰNG CÓ SẴN                                  */}
        {/* ======================================================== */}
        {activeTab === "preset" && (
          <div className="animate-fade-up">
            {/* Overall progress */}
            <div className="card p-5 mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--text-secondary)" }}>
                  Tiến độ học 30 Ngày Từ Vựng Hacker TOEIC
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>
                  {learnedWords} / {totalWords} từ ({totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalWords > 0 ? (learnedWords / totalWords) * 100 : 0}%`, background: "var(--brand)" }}
                />
              </div>
            </div>

            {/* Topics Grid: 30 Ngày Hacker TOEIC */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {topicsWithProgress.map((topic) => (
                <div
                  key={topic.id}
                  className="card card-hover p-4 flex flex-col justify-between gap-3 group relative rounded-2xl border transition-all"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: "var(--brand-light)" }}
                    >
                      {topic.icon}
                    </div>

                    <div
                      className={`min-w-0 flex-1 ${topic.words > 0 ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => {
                        if (topic.words > 0) {
                          setSelectedFolder(topic.name);
                          setActiveTab("custom");
                        }
                      }}
                      title={topic.words > 0 ? `Mở danh sách từ ${topic.day}: ${topic.name}` : `Chưa có từ vựng`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {topic.day}
                        </span>
                        <span className="text-[11px] font-semibold truncate text-[var(--text-muted)]" title={topic.category}>
                          {topic.category}
                        </span>
                      </div>

                      <h3
                        className={`font-bold text-sm truncate transition-colors ${
                          topic.words > 0 ? "hover:text-blue-500" : ""
                        }`}
                        style={{ color: "var(--text-primary)" }}
                        title={topic.name}
                      >
                        {topic.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        {topic.words > 0 ? (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {topic.words} từ vựng
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            Chưa có từ (0 từ)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t mt-1 flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                        <span>Tiến độ</span>
                        <span>{topic.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${topic.progress}%`,
                            background: topic.progress === 0 ? "var(--border)" : "var(--brand)",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {topic.words > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFolder(topic.name);
                              setActiveTab("custom");
                            }}
                            className="btn-ghost py-1.5 px-2.5 text-xs font-bold border shrink-0 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer hover:bg-[var(--bg-muted)]"
                            style={{ borderColor: "var(--border)" }}
                            title={`Xem danh sách từ ${topic.day}: ${topic.name}`}
                          >
                            <span>📖</span>
                            <span>Xem từ</span>
                          </button>

                          <Link
                            href={`/vocabulary/review?source=preset&folder=${encodeURIComponent(topic.name)}`}
                            className="btn-primary py-1.5 px-2.5 text-xs font-bold shrink-0 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                            title={`Luyện ôn tập ${topic.day}: ${topic.name}`}
                          >
                            <span>Học thẻ</span>
                            <span>→</span>
                          </Link>
                        </>
                      ) : (
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-dashed text-[var(--text-muted)] bg-[var(--bg-subtle)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          Chờ cập nhật
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TỪ VỰNG TỰ SOẠN                                  */}
        {/* ======================================================== */}
        {activeTab === "custom" && (
        <section className="card p-6 md:p-8 shadow-sm animate-fade-up">

          {/* ======================================================== */}
          {/* LEVEL 1: FOLDERS DIRECTORY VIEW (When no folder open)    */}
          {/* ======================================================== */}
          {!selectedFolder ? (
            <div>
              {/* Directory Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📁</span>
                    <h2 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                      Thư mục từ vựng cá nhân
                    </h2>
                    <span className="badge" style={{ background: "var(--brand-light)", color: "var(--brand-text)" }}>
                      {folderGroups.length} bộ thư mục
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    Chọn thư mục bên dưới để bắt đầu học và luyện flashcard, hoặc tạo thêm thư mục mới.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/vocabulary/review?source=custom"
                    className="btn-ghost border px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[var(--bg-muted)] transition-all shadow-xs"
                    style={{ borderColor: "var(--border)" }}
                    title="Luyện ôn tập ngắt quãng toàn bộ từ trong các thư mục cá nhân của bạn"
                  >
                    <span>⚡</span>
                    <span>Ôn tập ngắt quãng</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(undefined, "bulk")}
                    className="btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <span>➕</span>
                    <span>Tạo bộ từ / Thêm từ vựng</span>
                  </button>
                </div>
              </div>

              {/* Search Folders */}
              {folderGroups.length > 0 && (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="relative max-w-sm w-full">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      className="input py-2 text-xs"
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="Tìm kiếm thư mục hoặc từ vựng..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                    />
                    {searchFilter && (
                      <button
                        type="button"
                        onClick={() => setSearchFilter("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {folderGroups.reduce((acc, f) => acc + f.count, 0)} từ vựng đã lưu
                  </span>
                </div>
              )}

              {/* FOLDERS GRID */}
              <div className="mt-5">
                {folderGroups.length === 0 ? (
                  <div
                    className="text-center py-16 px-4 rounded-2xl border border-dashed flex flex-col items-center justify-center"
                    style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
                  >
                    <div className="text-5xl mb-3">📁</div>
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      Chưa có thư mục từ vựng nào
                    </h3>
                    <p className="text-xs mt-1.5 mb-5 max-w-md" style={{ color: "var(--text-secondary)" }}>
                      Nhấn vào nút &quot;Tạo bộ từ&quot; để dán danh sách ghi chú (ví dụ: <code>ETS 2023 - test 10 - part 2</code>) và bắt đầu học nhé!
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(undefined, "bulk")}
                        className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg"
                      >
                        <span>➕</span>
                        <span>Tạo bộ từ vựng đầu tiên</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(undefined, "excel")}
                        className="btn-ghost px-5 py-2.5 text-xs font-bold flex items-center gap-2 border shadow-sm text-emerald-600 dark:text-emerald-400"
                        style={{ borderColor: "rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.08)" }}
                      >
                        <span>📗</span>
                        <span>Nhập từ file Excel</span>
                      </button>
                    </div>
                  </div>
                ) : filteredFolderGroups.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    Không tìm thấy thư mục nào khớp với &quot;{searchFilter}&quot;.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredFolderGroups.map((folder) => (
                      <div
                        key={folder.name}
                        className="card p-5 rounded-2xl flex flex-col justify-between hover:shadow-lg hover:border-blue-500/50 transition-all group relative border"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                      >
                        <div>
                          {/* Folder Top Bar */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: "var(--brand-light)" }}>
                              📁
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRenameFolder(folder.name);
                                }}
                                disabled={isDeletingList || isRenamingList}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-50 hover:opacity-100 hover:bg-blue-500/10 text-blue-500 transition-all cursor-pointer"
                                title="Đổi tên thư mục"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteFolderModal(folder.name, folder.count);
                                }}
                                disabled={isDeletingList || isRenamingList}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-30 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                                title="Xóa cả thư mục này"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Folder Name */}
                          <h3
                            onClick={() => setSelectedFolder(folder.name)}
                            className="font-bold text-base line-clamp-1 cursor-pointer hover:text-blue-500 transition-colors"
                            style={{ color: "var(--text-primary)" }}
                            title={folder.name}
                          >
                            {folder.name}
                          </h3>

                          {/* Word Count Badge */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="badge" style={{ background: "var(--brand-light)", color: "var(--brand-text)" }}>
                              {folder.count} từ vựng
                            </span>
                          </div>
                        </div>

                        {/* Folder Action Buttons */}
                        <div className="mt-5 pt-4 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                          <button
                            type="button"
                            onClick={() => handleStartFlashcard(folder.name)}
                            className="btn-primary py-2 px-3 text-xs font-bold flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                            title="Lật thẻ ôn tập bộ từ này"
                          >
                            <span>🎴</span>
                            <span>Học thẻ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedFolder(folder.name)}
                            className="btn-ghost py-2 px-3 text-xs font-bold flex-1 flex items-center justify-center gap-1"
                            title="Xem chi tiết các từ"
                          >
                            <span>📖</span>
                            <span>Mở xem</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* LEVEL 2: INSIDE A SPECIFIC FOLDER (Study & Word Table)   */
            /* ======================================================== */
            <div>
              {/* Back to Folders Navigation */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      const wasPreset = isPresetSelected;
                      setSelectedFolder(null);
                      setSearchFilter("");
                      setIsShuffled(false);
                      if (wasPreset) {
                        setActiveTab("preset");
                      }
                    }}
                    className="text-xs font-bold flex items-center gap-1.5 text-blue-500 hover:underline mb-2 cursor-pointer"
                  >
                    <span>←</span>
                    <span>{isPresetSelected ? "Tất cả chủ đề Hacker TOEIC" : "Tất cả thư mục"}</span>
                  </button>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl">{selectedPresetTopicObj?.icon || "📁"}</span>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
                      {selectedPresetTopicObj ? `${selectedPresetTopicObj.day}: ${selectedFolder}` : selectedFolder}
                    </h2>
                    {selectedPresetTopicObj && (
                      <span className="badge text-[11px] font-bold py-0.5 px-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md shrink-0">
                        {selectedPresetTopicObj.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Folder Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 overflow-x-auto py-1">
                  <button
                    type="button"
                    onClick={() => handleStartFlashcard()}
                    className="btn-primary px-3 sm:px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <span>🎴</span>
                    <span>Học Flashcard</span>
                  </button>

                  <Link
                    href={`/vocabulary/review?source=${isPresetSelected ? "preset" : "custom"}&folder=${encodeURIComponent(selectedFolder || "")}`}
                    className="btn-ghost border px-2.5 sm:px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--bg-muted)] transition-all shadow-xs shrink-0 whitespace-nowrap"
                    style={{ borderColor: "var(--border)" }}
                    title="Luyện ôn tập ngắt quãng toàn bộ từ trong thư mục này"
                  >
                    <span>⚡</span>
                    <span>Ôn ngắt quãng</span>
                  </Link>

                  {!isPresetSelected && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(selectedFolder, "bulk")}
                        className="btn-ghost border px-2.5 sm:px-3 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-[var(--bg-muted)] transition-all cursor-pointer whitespace-nowrap"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <span>➕</span>
                        <span>Thêm từ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(selectedFolder, "excel")}
                        className="btn-ghost border px-2.5 sm:px-3 py-2 text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0 transition-all cursor-pointer whitespace-nowrap"
                        style={{ borderColor: "var(--border)" }}
                        title="Nhập thêm từ vào thư mục này từ file Excel"
                      >
                        <span>📗</span>
                        <span>Import Excel</span>
                      </button>
                    </>
                  )}

                  {/* View Layout Switcher */}
                  <div className="flex items-center rounded-xl p-0.5 border shrink-0 whitespace-nowrap" style={{ background: "var(--bg-muted)", borderColor: "var(--border)" }}>
                    <button
                      type="button"
                      onClick={() => setViewLayout("table")}
                      className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        viewLayout === "table" ? "shadow-sm" : "opacity-60"
                      }`}
                      style={{
                        background: viewLayout === "table" ? "var(--bg-card)" : "transparent",
                        color: viewLayout === "table" ? "var(--brand)" : "var(--text-secondary)",
                      }}
                      title="Dạng Bảng"
                    >
                      📑
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewLayout("cards")}
                      className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        viewLayout === "cards" ? "shadow-sm" : "opacity-60"
                      }`}
                      style={{
                        background: viewLayout === "cards" ? "var(--bg-card)" : "transparent",
                        color: viewLayout === "cards" ? "var(--brand)" : "var(--text-secondary)",
                      }}
                      title="Dạng Thẻ"
                    >
                      🗂️
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Inside Folder & Self-Study Controls */}
              <div className="mt-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                {/* Compact Search Box */}
                <div className="relative w-48 sm:w-56 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    className="input py-1.5 text-xs w-full"
                    style={{ paddingLeft: "2.1rem" }}
                    placeholder="Tìm từ vựng..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Self-Study Filter Controls: Ẩn tiếng Anh, Ẩn tiếng Việt, Ẩn từ đồng nghĩa */}
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setHideEnglish(!hideEnglish);
                      setRevealedEnglishIds(new Set());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      hideEnglish
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border-[var(--border)]"
                    }`}
                    title="Ẩn từ tiếng Anh (bấm vào từ để xem đáp án)"
                  >
                    <span>{hideEnglish ? "🙈" : "👁️"}</span>
                    <span>Ẩn tiếng Anh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHideVietnamese(!hideVietnamese);
                      setRevealedVietnameseIds(new Set());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      hideVietnamese
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border-[var(--border)]"
                    }`}
                    title="Ẩn nghĩa tiếng Việt (bấm vào nghĩa để xem đáp án)"
                  >
                    <span>{hideVietnamese ? "🙈" : "👁️"}</span>
                    <span>Ẩn tiếng Việt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHideSynonyms(!hideSynonyms);
                      setRevealedSynonymIds(new Set());
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      hideSynonyms
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border-[var(--border)]"
                    }`}
                    title="Ẩn từ đồng nghĩa (bấm vào để xem đáp án)"
                  >
                    <span>{hideSynonyms ? "🙈" : "👁️"}</span>
                    <span>Ẩn từ đồng nghĩa</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShuffleWords}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      isShuffled
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] border-[var(--border)]"
                    }`}
                    title={isShuffled ? "Bấm để xáo trộn lại thứ tự ngẫu nhiên mới" : "Trộn ngẫu nhiên thứ tự các từ trong thư mục để tự kiểm tra"}
                  >
                    <span>{isShuffled ? "🎲" : "🔀"}</span>
                    <span>{isShuffled ? "Trộn lại ngẫu nhiên" : "Trộn ngẫu nhiên"}</span>
                  </button>

                  {isShuffled && (
                    <button
                      type="button"
                      onClick={handleResetOrder}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-500/10 hover:bg-gray-500/20 text-[var(--text-secondary)] border border-[var(--border)] cursor-pointer flex items-center gap-1 transition-all whitespace-nowrap"
                      title="Quay lại thứ tự ban đầu"
                    >
                      <span>↩️</span>
                      <span>Thứ tự gốc</span>
                    </button>
                  )}

                  {(revealedEnglishIds.size > 0 || revealedVietnameseIds.size > 0 || revealedSynonymIds.size > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRevealedEnglishIds(new Set());
                        setRevealedVietnameseIds(new Set());
                        setRevealedSynonymIds(new Set());
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer flex items-center gap-1 transition-all shadow-sm whitespace-nowrap"
                      title="Che lại tất cả các từ/nghĩa đã mở để tự kiểm tra lại"
                    >
                      <span>🔄</span>
                      <span>Ẩn lại tất cả ({revealedEnglishIds.size + revealedVietnameseIds.size + revealedSynonymIds.size})</span>
                    </button>
                  )}

                  {!isPresetSelected && (
                    <button
                      type="button"
                      onClick={() => setIsWordEditMode(!isWordEditMode)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-2xs ${
                        isWordEditMode
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-[var(--bg-card)] hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-400/50"
                      }`}
                      title={isWordEditMode ? "Tắt chế độ chỉnh sửa từ" : "Chỉnh sửa từ vựng trong danh sách"}
                    >
                      <span>✏️</span>
                      <span>{isWordEditMode ? "Đang sửa từ" : "Sửa từ"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CONTENT VIEW INSIDE FOLDER */}
              {currentFolderWords.length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  Không tìm thấy từ vựng nào khớp với từ khóa tìm kiếm.
                </div>
              ) : viewLayout === "table" ? (
                /* TABLE VIEW */
                <div className="overflow-x-auto rounded-2xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="py-3 px-3 font-semibold w-10 text-center">#</th>
                        <th className="py-3 px-4 font-bold text-left min-w-[200px]">Từ vựng & Phát âm</th>
                        <th className="py-3 px-3 font-semibold text-center w-24">Loại từ</th>
                        <th className="py-3 px-3 font-semibold min-w-[160px]">Đồng nghĩa / Cụm mở rộng</th>
                        <th className="py-3 px-4 font-bold text-left min-w-[240px]">Nghĩa tiếng Việt</th>
                        {!isPresetSelected && (
                          <th className="py-3 px-3 font-semibold w-24 text-center">Thao tác</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {currentFolderWords.map((item, idx) => {
                        const analysis = analyzeWordStructure(item.word);
                        const isSpeaking = speakingWord === analysis.cleanForSpeech;

                        return (
                          <tr key={item.id} className="hover:bg-blue-500/5 transition-colors group" style={{ color: "var(--text-primary)" }}>
                            <td className="py-3 px-3 font-mono opacity-50 text-center align-middle text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => playPronunciation(item.word)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                                    isSpeaking
                                      ? "bg-blue-500 text-white scale-110 shadow-sm"
                                      : "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"
                                  }`}
                                  title="Nghe phát âm"
                                >
                                  {isSpeaking ? "🔊" : "🔈"}
                                </button>
                                {hideEnglish ? (
                                  revealedEnglishIds.has(item.id) ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span
                                        onClick={() => toggleRevealEnglish(item.id)}
                                        className="font-extrabold text-sm tracking-wide cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{ color: "var(--brand)" }}
                                        title="Bấm để ẩn lại"
                                      >
                                        {analysis.headword}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRevealEnglish(item.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 cursor-pointer transition-all hover:scale-110"
                                        title="Bấm để ẩn lại"
                                      >
                                        🙈
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealEnglish(item.id)}
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 cursor-pointer hover:scale-110 transition-all"
                                      title="Bấm để xem từ tiếng Anh"
                                    >
                                      👁️
                                    </button>
                                  )
                                ) : (
                                  <span className="font-extrabold text-sm tracking-wide" style={{ color: "var(--brand)" }}>
                                    {analysis.headword}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center align-middle">
                              {analysis.posTags.length > 0 ? (
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {analysis.posTags.map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase bg-blue-500/15 text-blue-500"
                                    >
                                      {tag.replace(/[\(\)]/g, "")}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle">
                              {analysis.synonym || analysis.collocation ? (
                                <div className="flex flex-col gap-1">
                                  {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                                    hideSynonyms ? (
                                      revealedSynonymIds.has(item.id) ? (
                                        <div className="inline-flex items-center gap-1.5 w-fit flex-wrap">
                                          <div
                                            onClick={() => toggleRevealSynonym(item.id)}
                                            className="inline-flex items-center gap-1.5 flex-wrap px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-pointer hover:opacity-80 transition-all text-[11px]"
                                            title="Bấm để ẩn lại"
                                          >
                                            <span className="font-semibold">=</span>
                                            {analysis.synonymsWithPhonetic.map((synItem, synIdx) => (
                                              <span key={synIdx} className="inline-flex items-center gap-1">
                                                {synIdx > 0 && <span className="opacity-40">,</span>}
                                                <span className="font-medium">{synItem.word}</span>
                                                {synItem.phonetic && (
                                                  <span className="font-mono text-[10px] opacity-75">{synItem.phonetic}</span>
                                                )}
                                              </span>
                                            ))}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => toggleRevealSynonym(item.id)}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 cursor-pointer transition-all hover:scale-110"
                                            title="Bấm để ẩn lại"
                                          >
                                            🙈
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => toggleRevealSynonym(item.id)}
                                          className="h-6 px-2 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer hover:scale-105 transition-all inline-flex items-center gap-1"
                                          title="Bấm để xem từ đồng nghĩa"
                                        >
                                          <span>=</span>
                                          <span>👁️</span>
                                        </button>
                                      )
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit flex-wrap">
                                        <span className="font-semibold">=</span>
                                        {analysis.synonymsWithPhonetic.map((synItem, synIdx) => (
                                          <span key={synIdx} className="inline-flex items-center gap-1">
                                            {synIdx > 0 && <span className="opacity-40">,</span>}
                                            <span className="font-medium">{synItem.word}</span>
                                            {synItem.phonetic && (
                                              <span className="font-mono text-[10px] opacity-75">{synItem.phonetic}</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  )}
                                  {analysis.collocation && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 w-fit">
                                      {analysis.collocation}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 align-middle">
                              {hideVietnamese ? (
                                revealedVietnameseIds.has(item.id) ? (
                                  <div className="inline-flex items-center gap-2">
                                    <span
                                      onClick={() => toggleRevealVietnamese(item.id)}
                                      className="font-semibold text-xs leading-relaxed cursor-pointer hover:opacity-80 transition-opacity"
                                      style={{ color: "var(--text-primary)" }}
                                      title="Bấm để ẩn lại"
                                    >
                                      {item.meaning || <span className="opacity-40 italic">Chưa có nghĩa</span>}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealVietnamese(item.id)}
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 cursor-pointer transition-all hover:scale-110 shrink-0"
                                      title="Bấm để ẩn lại nghĩa"
                                    >
                                      🙈
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealVietnamese(item.id)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 cursor-pointer hover:scale-110 transition-all"
                                    title="Bấm để xem nghĩa tiếng Việt"
                                  >
                                    👁️
                                  </button>
                                )
                              ) : (
                                <>
                                  <span className="font-semibold text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                    {item.meaning || <span className="opacity-40 italic">Chưa có nghĩa</span>}
                                  </span>
                                  {item.example && (
                                    <p className="mt-1 text-[11px] italic opacity-70 line-clamp-1">
                                      &ldquo;{item.example}&rdquo;
                                    </p>
                                  )}
                                </>
                              )}
                            </td>
                            {!isPresetSelected && (
                              <td className="py-3 px-3 text-center align-middle">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditWord(item)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ${
                                      isWordEditMode
                                        ? "bg-blue-500 text-white shadow-xs scale-105"
                                        : "opacity-60 group-hover:opacity-100 hover:bg-blue-500/10 text-blue-500"
                                    }`}
                                    title={`Chỉnh sửa từ "${item.word}"`}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteWordModal(item.id, item.word)}
                                    disabled={deletingId === item.id}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-40 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                                    title="Xóa từ này"
                                  >
                                    {deletingId === item.id ? "⏳" : "🗑️"}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* CARDS VIEW */
                <div className="grid gap-3.5 md:grid-cols-2">
                  {currentFolderWords.map((item) => {
                    const analysis = analyzeWordStructure(item.word);
                    const isSpeaking = speakingWord === analysis.cleanForSpeech;

                    return (
                      <div
                        key={item.id}
                        className="card p-4 flex flex-col justify-between hover:shadow-md hover:border-blue-500/40 transition-all rounded-2xl group border"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => playPronunciation(item.word)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
                                    isSpeaking
                                      ? "bg-blue-500 text-white scale-110"
                                      : "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"
                                  }`}
                                  title="Nghe phát âm"
                                >
                                  {isSpeaking ? "🔊" : "🔈"}
                                </button>

                                {hideEnglish ? (
                                  revealedEnglishIds.has(item.id) ? (
                                    <div className="inline-flex items-center gap-2">
                                      <h3
                                        onClick={() => toggleRevealEnglish(item.id)}
                                        className="font-extrabold text-base tracking-wide cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{ color: "var(--brand)" }}
                                        title="Bấm để ẩn lại"
                                      >
                                        {analysis.headword}
                                      </h3>
                                      <button
                                        type="button"
                                        onClick={() => toggleRevealEnglish(item.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 cursor-pointer transition-all hover:scale-110"
                                        title="Bấm để ẩn lại"
                                      >
                                        🙈
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealEnglish(item.id)}
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 cursor-pointer hover:scale-110 transition-all"
                                      title="Bấm để xem từ tiếng Anh"
                                    >
                                      👁️
                                    </button>
                                  )
                                ) : (
                                  <h3 className="font-extrabold text-base tracking-wide" style={{ color: "var(--brand)" }}>
                                    {analysis.headword}
                                  </h3>
                                )}

                                {analysis.posTags.map((tag, tIdx) => (
                                  <span key={tIdx} className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    {tag.replace(/[\(\)]/g, "")}
                                  </span>
                                ))}
                              </div>

                              {(analysis.synonym || analysis.collocation) && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                  {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                                    hideSynonyms ? (
                                      revealedSynonymIds.has(item.id) ? (
                                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                                          <div
                                            onClick={() => toggleRevealSynonym(item.id)}
                                            className="inline-flex items-center gap-1.5 flex-wrap px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-pointer hover:opacity-80 transition-all text-[11px]"
                                            title="Bấm để ẩn lại"
                                          >
                                            <span className="font-semibold">=</span>
                                            {analysis.synonymsWithPhonetic.map((synItem, synIdx) => (
                                              <span key={synIdx} className="inline-flex items-center gap-1">
                                                {synIdx > 0 && <span className="opacity-40">,</span>}
                                                <span className="font-medium">{synItem.word}</span>
                                                {synItem.phonetic && (
                                                  <span className="font-mono text-[10px] opacity-75">{synItem.phonetic}</span>
                                                )}
                                              </span>
                                            ))}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => toggleRevealSynonym(item.id)}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 cursor-pointer transition-all hover:scale-110"
                                            title="Bấm để ẩn lại"
                                          >
                                            🙈
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => toggleRevealSynonym(item.id)}
                                          className="h-6 px-2 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer hover:scale-105 transition-all inline-flex items-center gap-1"
                                          title="Bấm để xem từ đồng nghĩa"
                                        >
                                          <span>=</span>
                                          <span>👁️</span>
                                        </button>
                                      )
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-wrap">
                                        <span className="font-semibold">=</span>
                                        {analysis.synonymsWithPhonetic.map((synItem, synIdx) => (
                                          <span key={synIdx} className="inline-flex items-center gap-1">
                                            {synIdx > 0 && <span className="opacity-40">,</span>}
                                            <span className="font-medium">{synItem.word}</span>
                                            {synItem.phonetic && (
                                              <span className="font-mono text-[10px] opacity-75">{synItem.phonetic}</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    )
                                  )}
                                  {analysis.collocation && (
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                      {analysis.collocation}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {!isPresetSelected && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditWord(item)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ${
                                    isWordEditMode
                                      ? "bg-blue-500 text-white shadow-xs scale-105"
                                      : "opacity-60 group-hover:opacity-100 hover:bg-blue-500/10 text-blue-500"
                                  }`}
                                  title={`Chỉnh sửa từ "${item.word}"`}
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteWordModal(item.id, item.word)}
                                  disabled={deletingId === item.id}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-40 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                                  title="Xóa từ này"
                                >
                                  {deletingId === item.id ? "⏳" : "🗑️"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                            {hideVietnamese ? (
                              revealedVietnameseIds.has(item.id) ? (
                                <div>
                                  <div className="inline-flex items-center gap-2 mb-1">
                                    <p
                                      onClick={() => toggleRevealVietnamese(item.id)}
                                      className="text-sm font-semibold leading-relaxed cursor-pointer hover:opacity-80 transition-opacity"
                                      style={{ color: "var(--text-primary)" }}
                                      title="Bấm để ẩn lại"
                                    >
                                      {item.meaning || <span className="opacity-40 italic">Chưa có nghĩa</span>}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealVietnamese(item.id)}
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 cursor-pointer transition-all hover:scale-110 shrink-0"
                                      title="Bấm để ẩn lại"
                                    >
                                      🙈
                                    </button>
                                  </div>
                                  {item.example && (
                                    <p className="mt-2 text-xs italic pl-2 border-l-2 border-blue-500/40" style={{ color: "var(--text-secondary)" }}>
                                      &ldquo;{item.example}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleRevealVietnamese(item.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 cursor-pointer hover:scale-110 transition-all"
                                  title="Bấm để xem nghĩa tiếng Việt"
                                >
                                  👁️
                                </button>
                              )
                            ) : (
                              <>
                                <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                  {item.meaning || <span className="opacity-40 italic">Chưa có nghĩa</span>}
                                </p>
                                {item.example && (
                                  <p className="mt-2 text-xs italic pl-2 border-l-2 border-blue-500/40" style={{ color: "var(--text-secondary)" }}>
                                    &ldquo;{item.example}&rdquo;
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 flex justify-end text-[11px] opacity-40 font-mono">
                          #{item.id}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. INTERACTIVE FLASHCARD MODAL (Study Folder Words)      */}
      {/* ======================================================== */}
      {isFlashcardOpen && flashcardWords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-up">
          <div
            className="card max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 flex flex-col items-center shadow-2xl relative rounded-3xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {/* Header controls */}
            <div className="w-full flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎴</span>
                <div>
                  <div className="font-extrabold text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>
                    Luyện Flashcard: {selectedFolder || "Tất cả từ"}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    Thẻ {flashcardIndex + 1} / {flashcardWords.length}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFlashcardOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold opacity-60 hover:opacity-100 hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Flashcard Box */}
            {(() => {
              const currentItem = flashcardWords[flashcardIndex];
              if (!currentItem) return null;
              const analysis = analyzeWordStructure(currentItem.word);

              return (
                <div
                  onClick={() => {
                    setIsFlipped((prev) => !prev);
                    playPronunciation(currentItem.word);
                  }}
                  className="w-full min-h-[340px] sm:min-h-[400px] my-6 p-8 sm:p-12 rounded-3xl border-2 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:border-blue-500/50 shadow-inner group"
                  style={{
                    borderColor: isFlipped ? "var(--brand)" : "var(--border)",
                    background: "var(--bg-subtle)",
                  }}
                >
                  {!isFlipped ? (
                    /* Front side: English Word */
                    <div className="space-y-4 animate-fade-up">
                      <span className="text-xs uppercase tracking-wider font-extrabold opacity-50 block">
                        Mặt trước • Bấm để lật xem nghĩa
                      </span>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: "var(--brand)" }}>
                          {analysis.headword}
                        </h2>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playPronunciation(currentItem.word);
                          }}
                          className="w-11 h-11 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center text-lg transition-all shadow-xs cursor-pointer hover:scale-105"
                          title="Nghe phát âm"
                        >
                          🔈
                        </button>
                      </div>

                      {/* Phiên âm quốc tế IPA */}
                      {analysis.phonetic && (
                        <div className="flex items-center justify-center pt-0.5">
                          <span className="font-mono text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 bg-[var(--bg-subtle)] px-3 py-0.5 rounded-full border border-[var(--border)]">
                            {analysis.phonetic}
                          </span>
                        </div>
                      )}

                      {analysis.posTags.length > 0 && (
                        <div className="flex justify-center gap-1.5 flex-wrap pt-1">
                          {analysis.posTags.map((tag, tIdx) => (
                            <span key={tIdx} className="px-3 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold uppercase bg-blue-500/15 text-blue-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-amber-500">
                            Đồng nghĩa: =
                          </span>
                          {analysis.synonymsWithPhonetic.map((item, synIdx) => (
                            <button
                              key={synIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPronunciation(item.word);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 group shadow-2xs"
                              title={`Bấm để nghe phát âm từ đồng nghĩa: "${item.word}" ${item.phonetic}`}
                            >
                              <span>{item.word}</span>
                              {item.phonetic && (
                                <span className="font-mono text-[11px] font-normal text-amber-600/80 dark:text-amber-300/80 bg-amber-500/10 px-1 py-0.2 rounded">
                                  {item.phonetic}
                                </span>
                              )}
                              <span className="text-[10px] opacity-50 group-hover:opacity-100">🔊</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Back side: Meaning & Examples */
                    <div className="space-y-4 animate-fade-up max-w-xl mx-auto">
                      <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 block">
                        Mặt sau • Nghĩa tiếng Việt
                      </span>
                      <h3 className="text-2xl sm:text-4xl font-black" style={{ color: "var(--text-primary)" }}>
                        {currentItem.meaning || "Chưa có nghĩa"}
                      </h3>

                      {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-xs sm:text-sm font-semibold text-amber-500">
                            Đồng nghĩa: =
                          </span>
                          {analysis.synonymsWithPhonetic.map((item, synIdx) => (
                            <button
                              key={synIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPronunciation(item.word);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 group shadow-2xs"
                              title={`Bấm để nghe phát âm: "${item.word}" ${item.phonetic}`}
                            >
                              <span>{item.word}</span>
                              {item.phonetic && (
                                <span className="font-mono text-[10px] font-normal text-amber-600/80 dark:text-amber-400/80 bg-amber-500/10 px-1 py-0.2 rounded">
                                  {item.phonetic}
                                </span>
                              )}
                              <span className="text-[10px] opacity-40 group-hover:opacity-100">🔊</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {analysis.collocation && (
                        <p className="text-sm sm:text-base font-bold text-purple-400">
                          {analysis.collocation}
                        </p>
                      )}
                      {currentItem.example && (
                        <p className="text-xs sm:text-sm italic opacity-85 leading-relaxed px-4 py-2.5 rounded-xl border bg-[var(--bg-card)] mt-2" style={{ borderColor: "var(--border)" }}>
                          &ldquo;{currentItem.example}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Navigation buttons */}
            <div className="w-full flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrevFlashcard}
                className="btn-ghost px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-xl cursor-pointer"
              >
                <span>←</span>
                <span>Từ trước</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFlipped((prev) => !prev);
                  if (flashcardWords[flashcardIndex]) {
                    playPronunciation(flashcardWords[flashcardIndex].word);
                  }
                }}
                className="btn-ghost px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 rounded-xl cursor-pointer"
              >
                <span>🔄</span>
                <span>Lật thẻ</span>
              </button>

              <button
                type="button"
                onClick={handleNextFlashcard}
                className="btn-primary px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md rounded-xl cursor-pointer"
              >
                <span>Từ kế</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* 4. MODAL POPUP FOR CREATING / IMPORTING VOCABULARY       */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-up">
          <div
            className="card max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {/* Modal Header */}
            <div
              className="p-4 sm:p-5 border-b flex items-center justify-between gap-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                  Thêm từ vựng vào bộ đề / thư mục
                </h3>
                <p className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  Dán nhanh cả danh sách ghi chú hoặc nhập từng từ riêng lẻ
                </p>
              </div>

              {/* Tabs & Close button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: "var(--bg-muted)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("bulk");
                      setCustomError("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      inputMode === "bulk" ? "shadow-sm" : "hover:opacity-80"
                    }`}
                    style={{
                      background: inputMode === "bulk" ? "var(--bg-card)" : "transparent",
                      color: inputMode === "bulk" ? "var(--brand)" : "var(--text-secondary)",
                    }}
                  >
                    📋 Nhập danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("excel");
                      setCustomError("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      inputMode === "excel" ? "shadow-sm" : "hover:opacity-80"
                    }`}
                    style={{
                      background: inputMode === "excel" ? "var(--bg-card)" : "transparent",
                      color: inputMode === "excel" ? "var(--success, #10b981)" : "var(--text-secondary)",
                    }}
                  >
                    <span>📗</span>
                    <span>Nhập từ Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("quizlet");
                      setCustomError("");
                      if (quizletText) {
                        setParsedItems(parseQuizletContent(quizletText, quizletTermSep, quizletRowSep));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      inputMode === "quizlet" ? "shadow-sm" : "hover:opacity-80"
                    }`}
                    style={{
                      background: inputMode === "quizlet" ? "var(--bg-card)" : "transparent",
                      color: inputMode === "quizlet" ? "#2563eb" : "var(--text-secondary)",
                    }}
                  >
                    <span className="font-black text-blue-600 dark:text-blue-400">⚡</span>
                    <span>Nhập từ Quizlet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("single");
                      setCustomError("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      inputMode === "single" ? "shadow-sm" : "hover:opacity-80"
                    }`}
                    style={{
                      background: inputMode === "single" ? "var(--bg-card)" : "transparent",
                      color: inputMode === "single" ? "var(--brand)" : "var(--text-secondary)",
                    }}
                  >
                    <span>✏️</span>
                    <span>Nhập từng từ</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {customError && (
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm"
                  style={{
                    background: "var(--danger-light)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    color: "var(--danger)",
                  }}
                  role="alert"
                >
                  <span>⚠️ {customError}</span>
                  <button
                    onClick={() => setCustomError("")}
                    className="text-xs font-bold opacity-60 hover:opacity-100 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* BULK MODE */}
              {inputMode === "bulk" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                      {renderFolderSelector()}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleLoadSample}
                        className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5"
                        title="Dán nhanh danh sách từ vựng thực tế để thử nghiệm"
                      >
                        <span>⚡</span>
                        <span>Dán mẫu thử thực tế</span>
                      </button>
                      {bulkText && (
                        <button
                          type="button"
                          onClick={handleClearBulk}
                          className="btn-ghost px-3 py-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Xóa ô nhập</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Format tip */}
                  <div
                    className="p-3 rounded-xl text-xs flex flex-col md:flex-row gap-2 md:items-center justify-between"
                    style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        💡 Tự động phân tích thông minh:
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        Dán dạng <code>edge (n) mép</code>, <code>word = syn (v) nghĩa</code>, hoặc copy trực tiếp nhiều dòng từ <strong>Excel / Google Sheets</strong>.
                      </div>
                    </div>
                    <div className="text-[11px] font-mono p-1.5 rounded shrink-0 self-start md:self-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      từ (loại_từ) nghĩa_tiếng_Việt
                    </div>
                  </div>

                  {/* Textarea */}
                  <div>
                    <textarea
                      className="input font-mono text-sm leading-relaxed"
                      rows={6}
                      placeholder={`Dán danh sách ghi chú của bạn vào đây, ví dụ:\ninventory (n) => do inventory = make inventory (v) hàng tồn kho => kiểm kê\nexposition = exhibit (n) buổi triển lãm\nstitch = sew (n) khâu\nedge (n) mép`}
                      value={bulkText}
                      onChange={(e) => handleBulkTextChange(e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  {/* Live Preview Section */}
                  {parsedItems.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                            Xem trước ({parsedItems.length} từ đã nhận diện):
                          </span>
                          <span className="badge" style={{ background: "var(--success-light)", color: "var(--success)" }}>
                            Hợp lệ
                          </span>
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Có thể click trực tiếp vào ô để sửa hoặc nhấn ✕ để xóa bớt
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                        <table className="w-full text-left text-xs">
                          <thead style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                            <tr>
                              <th className="py-2 px-2.5 font-semibold w-7">#</th>
                              <th className="py-2 px-2.5 font-semibold w-5/12">Từ / Cụm từ (Word)</th>
                              <th className="py-2 px-2.5 font-semibold w-5/12">Nghĩa tiếng Việt (Meaning)</th>
                              <th className="py-2 px-2 font-semibold w-8 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                            {parsedItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-opacity-50 transition-colors" style={{ color: "var(--text-primary)" }}>
                                <td className="py-1.5 px-2.5 font-mono opacity-50 align-middle">{idx + 1}</td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border font-bold text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--brand)",
                                    }}
                                    value={item.word}
                                    onChange={(e) => handleUpdateParsedItem(idx, "word", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--text-primary)",
                                    }}
                                    value={item.meaning}
                                    placeholder="Nhập nghĩa..."
                                    onChange={(e) => handleUpdateParsedItem(idx, "meaning", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedItem(idx)}
                                    className="w-6 h-6 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500 font-bold transition-colors"
                                    title="Bỏ dòng này"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EXCEL MODE */}
              {inputMode === "excel" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                      {renderFolderSelector()}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={downloadExcelTemplate}
                        className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                        title="Tải file mẫu Excel chuẩn để điền từ vựng"
                      >
                        <span>📥</span>
                        <span>Tải file Excel mẫu (.xlsx)</span>
                      </button>
                      {parsedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearExcel}
                          className="btn-ghost px-3 py-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Xóa dữ liệu</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelFileUpload(file);
                    }}
                  />

                  {/* Upload Dropzone / File Picker Card */}
                  {!excelFileName ? (
                    <div
                      onClick={() => excelFileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-500/5 group flex flex-col items-center justify-center gap-2.5"
                      style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                        📊
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          Nhấp để chọn file Excel hoặc kéo thả vào đây
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Hỗ trợ định dạng <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>
                        </div>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20">
                        <span>📁</span>
                        <span>Chọn file từ máy tính</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-4 rounded-2xl border flex items-center justify-between gap-3 flex-wrap"
                      style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-emerald-500 text-white font-bold shadow-md">
                          📗
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                            <span>{excelFileName}</span>
                            <span className="badge bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px]">
                              {parsedItems.length} từ nhận diện
                            </span>
                          </div>
                          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            Đã đọc thành công dữ liệu từ file Excel của bạn.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => excelFileInputRef.current?.click()}
                          className="btn-ghost px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50"
                        >
                          🔄 Đổi file khác
                        </button>
                        <button
                          type="button"
                          onClick={handleClearExcel}
                          className="btn-ghost px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Hủy bỏ file này"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Format tips & Columns guide */}
                  <div
                    className="p-3.5 rounded-xl text-xs flex flex-col md:flex-row gap-3 md:items-center justify-between"
                    style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}
                  >
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <span>💡</span>
                        <span>Cột trong file Excel được hỗ trợ tự động:</span>
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        Cột tối thiểu cần có: <strong>Từ vựng</strong> và <strong>Nghĩa tiếng Việt</strong>. Có thể thêm cột <em>Loại từ (n, v...)</em>, <em>Đồng nghĩa</em>, <em>Ví dụ</em>.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-500/25 shrink-0 self-start md:self-auto flex items-center gap-1 transition-colors"
                    >
                      <span>📥</span>
                      <span>Tải file mẫu chuẩn</span>
                    </button>
                  </div>

                  {/* Live Preview Section */}
                  {parsedItems.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                            Xem trước dữ liệu Excel ({parsedItems.length} từ):
                          </span>
                          <span className="badge" style={{ background: "var(--success-light)", color: "var(--success)" }}>
                            Sẵn sàng lưu
                          </span>
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Có thể click trực tiếp vào ô để sửa hoặc nhấn ✕ để loại bỏ dòng
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                        <table className="w-full text-left text-xs">
                          <thead style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                            <tr>
                              <th className="py-2 px-2.5 font-semibold w-7">#</th>
                              <th className="py-2 px-2.5 font-semibold w-4/12">Từ / Đồng nghĩa (Word)</th>
                              <th className="py-2 px-2.5 font-semibold w-4/12">Nghĩa tiếng Việt (Meaning)</th>
                              <th className="py-2 px-2.5 font-semibold w-4/12">Ví dụ (Example)</th>
                              <th className="py-2 px-2 font-semibold w-8 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                            {parsedItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-opacity-50 transition-colors" style={{ color: "var(--text-primary)" }}>
                                <td className="py-1.5 px-2.5 font-mono opacity-50 align-middle">{idx + 1}</td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border font-bold text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--brand)",
                                    }}
                                    value={item.word}
                                    onChange={(e) => handleUpdateParsedItem(idx, "word", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--text-primary)",
                                    }}
                                    value={item.meaning}
                                    placeholder="Nhập nghĩa..."
                                    onChange={(e) => handleUpdateParsedItem(idx, "meaning", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--text-secondary)",
                                    }}
                                    value={item.example || ""}
                                    placeholder="Ví dụ minh họa..."
                                    onChange={(e) => handleUpdateParsedItem(idx, "example", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedItem(idx)}
                                    className="w-6 h-6 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500 font-bold transition-colors"
                                    title="Bỏ dòng này"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QUIZLET MODE */}
              {inputMode === "quizlet" && (
                <div className="space-y-4">
                  {/* Row 1: Folder Selector & Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex-1 max-w-md">
                      {renderFolderSelector()}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleLoadSampleQuizlet}
                        className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                        title="Dán dữ liệu mẫu từ Quizlet để thử nghiệm ngay"
                      >
                        <span>⚡</span>
                        <span>Dán mẫu thử Quizlet</span>
                      </button>
                      {(parsedItems.length > 0 || quizletText) && (
                        <button
                          type="button"
                          onClick={handleClearQuizlet}
                          className="btn-ghost px-3 py-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>Xóa dữ liệu</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hidden Quizlet File Input */}
                  <input
                    ref={quizletFileInputRef}
                    type="file"
                    accept=".txt, .csv, .tsv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleQuizletFileUpload(file);
                    }}
                  />

                  {/* Quizlet Settings Bar: Ký tự phân cách */}
                  <div
                    className="p-3 sm:p-3.5 rounded-2xl border flex flex-col md:flex-row gap-3 md:items-center justify-between"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {/* Term & Definition separator */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-secondary)]">Giữa Từ & Nghĩa:</span>
                        <div className="inline-flex rounded-xl p-0.5 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                          {[
                            { id: "tab", label: "Tab (Chuẩn Quizlet)" },
                            { id: "comma", label: "Phẩy (,)" },
                            { id: "dash", label: "Gạch ngang (-)" },
                            { id: "auto", label: "Tự động" },
                          ].map((sep) => (
                            <button
                              key={sep.id}
                              type="button"
                              onClick={() => {
                                const newSep = sep.id as "tab" | "comma" | "dash" | "auto";
                                setQuizletTermSep(newSep);
                                if (quizletText) {
                                  setParsedItems(parseQuizletContent(quizletText, newSep, quizletRowSep));
                                }
                              }}
                              className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                                quizletTermSep === sep.id
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              {sep.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Row separator */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-secondary)]">Giữa các thẻ:</span>
                        <div className="inline-flex rounded-xl p-0.5 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                          {[
                            { id: "newline", label: "Xuống dòng" },
                            { id: "semicolon", label: "Chấm phẩy (;)" },
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                const newRow = r.id as "newline" | "semicolon";
                                setQuizletRowSep(newRow);
                                if (quizletText) {
                                  setParsedItems(parseQuizletContent(quizletText, quizletTermSep, newRow));
                                }
                              }}
                              className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                                quizletRowSep === r.id
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upload File trigger button */}
                    <button
                      type="button"
                      onClick={() => quizletFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--bg-card)] transition-colors self-start md:self-auto cursor-pointer"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      <span>📂</span>
                      <span>{quizletFileName ? `Đổi file: ${quizletFileName}` : "Tải file Quizlet (.txt, .csv)"}</span>
                    </button>
                  </div>

                  {/* Quizlet Textarea Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Dán nội dung sao chép từ Quizlet:</span>
                      </label>
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {parsedItems.length > 0 ? `Đã nhận diện: ${parsedItems.length} thẻ` : "Chưa có dữ liệu"}
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      className="w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-mono leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      style={{
                        background: "var(--bg-subtle)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                      placeholder={`1. Trên Quizlet: Vào học phần -> Bấm '...' -> Chọn 'Xuất' (Export)\n2. Sao chép toàn bộ văn bản và dán vào đây\n\nVí dụ:\naccommodate\tcung cấp chỗ nghỉ ngơi, đáp ứng nhu cầu\nitinerary\tlịch trình chuyến đi, kế hoạch hành trình\nreimburse\thoàn tiền, thanh toán chi phí`}
                      value={quizletText}
                      onChange={(e) => handleQuizletTextChange(e.target.value)}
                    />
                  </div>

                  {/* Hướng dẫn xuất từ Quizlet 3 bước */}
                  <div
                    className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    style={{ background: "rgba(59, 130, 246, 0.05)", borderColor: "rgba(59, 130, 246, 0.2)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black bg-blue-600 text-white shrink-0 shadow-sm">
                        Q
                      </div>
                      <div>
                        <div className="font-bold text-blue-700 dark:text-blue-300">
                          Cách xuất từ Quizlet cực nhanh trong 5 giây:
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Mở học phần Quizlet → Bấm nút <strong>...</strong> (Thêm) → Chọn <strong>Xuất (Export)</strong> → Bấm <strong>Sao chép văn bản</strong> → Dán vào đây!
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLoadSampleQuizlet}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shrink-0 shadow-xs cursor-pointer"
                    >
                      Dán mẫu thử Quizlet
                    </button>
                  </div>

                  {/* Live Preview Table */}
                  {parsedItems.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                            Xem trước dữ liệu Quizlet ({parsedItems.length} thẻ):
                          </span>
                          <span className="badge" style={{ background: "var(--success-light)", color: "var(--success)" }}>
                            Sẵn sàng lưu
                          </span>
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Có thể click trực tiếp vào ô để sửa hoặc nhấn ✕ để loại bỏ dòng
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                        <table className="w-full text-left text-xs">
                          <thead style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                            <tr>
                              <th className="py-2 px-2.5 font-semibold w-7">#</th>
                              <th className="py-2 px-2.5 font-semibold w-5/12">Thuật ngữ / Từ vựng (Term)</th>
                              <th className="py-2 px-2.5 font-semibold w-6/12">Định nghĩa / Nghĩa (Definition)</th>
                              <th className="py-2 px-2 font-semibold w-8 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                            {parsedItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-opacity-50 transition-colors" style={{ color: "var(--text-primary)" }}>
                                <td className="py-1.5 px-2.5 font-mono opacity-50 align-middle">{idx + 1}</td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border font-bold text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--brand)",
                                    }}
                                    value={item.word}
                                    onChange={(e) => handleUpdateParsedItem(idx, "word", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 align-middle">
                                  <input
                                    className="w-full px-2 py-1 rounded-md border text-xs"
                                    style={{
                                      background: "var(--bg-subtle)",
                                      borderColor: "var(--border)",
                                      color: "var(--text-primary)",
                                    }}
                                    value={item.meaning}
                                    placeholder="Nhập nghĩa..."
                                    onChange={(e) => handleUpdateParsedItem(idx, "meaning", e.target.value)}
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedItem(idx)}
                                    className="w-6 h-6 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500 font-bold transition-colors"
                                    title="Bỏ dòng này"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL WORDS ENTRY MODE (Nhập từng từ) */}
              {inputMode === "single" && (
                <div className="space-y-4">
                  <div>{renderFolderSelector()}</div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        Danh sách từ vựng đang nhập ({manualWords.length} từ):
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Nhấp nút bên dưới để thêm nhiều từ trước khi lưu
                      </span>
                    </div>

                    <div className="space-y-3">
                      {manualWords.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="p-3.5 sm:p-4 rounded-2xl border transition-all relative"
                          style={{
                            background: "var(--bg-subtle)",
                            borderColor: "var(--border)",
                          }}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between pb-2 mb-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                style={{ background: "var(--brand)" }}
                              >
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                                {entry.word.trim() ? entry.word.trim() : `Từ thứ ${index + 1}`}
                              </span>
                            </div>

                            {manualWords.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualWordRow(index)}
                                className="text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 transition-colors"
                                title="Xóa từ này"
                              >
                                <span>✕</span>
                                <span>Xóa</span>
                              </button>
                            )}
                          </div>

                          {/* Inputs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                                Từ mới (Word) <span className="text-red-500">*</span>:
                              </label>
                              <input
                                className="input py-2 text-sm font-semibold"
                                placeholder="Ví dụ: ubiquitous (adj), take over..."
                                value={entry.word}
                                onChange={(e) => handleUpdateManualWord(index, "word", e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                                Nghĩa tiếng Việt <span className="text-red-500">*</span>:
                              </label>
                              <input
                                className="input py-2 text-sm"
                                placeholder="Ví dụ: phổ biến, có mặt khắp nơi..."
                                value={entry.meaning}
                                onChange={(e) => handleUpdateManualWord(index, "meaning", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                              Ví dụ sử dụng (không bắt buộc):
                            </label>
                            <input
                              className="input py-2 text-xs"
                              placeholder="Ví dụ: Smartphones have become ubiquitous in daily life."
                              value={entry.example}
                              onChange={(e) => handleUpdateManualWord(index, "example", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add More Word Button */}
                    <button
                      type="button"
                      onClick={handleAddManualWordRow}
                      className="w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/20 active:scale-[0.99] cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                        background: "var(--bg-card)",
                      }}
                    >
                      <span className="text-base text-blue-500">➕</span>
                      <span>Thêm từ tiếp theo (Từ #{manualWords.length + 1})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="p-4 border-t flex items-center justify-end gap-3"
              style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-ghost px-4 py-2 text-xs font-semibold"
                disabled={isSaving}
              >
                Hủy bỏ
              </button>

              {inputMode === "bulk" || inputMode === "excel" || inputMode === "quizlet" ? (
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={isSaving || parsedItems.length === 0}
                  className="btn-primary px-5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin inline-block">⏳</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>
                        {parsedItems.length > 0
                          ? `Lưu ${parsedItems.length} từ ${inputMode === "quizlet" ? "Quizlet " : ""}vào thư mục`
                          : "Lưu danh sách"}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveManualWords()}
                  disabled={isSaving || manualWords.filter((w) => w.word.trim()).length === 0}
                  className="btn-primary px-5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin inline-block">⏳</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>
                        {manualWords.filter((w) => w.word.trim()).length > 0
                          ? `Lưu ${manualWords.filter((w) => w.word.trim()).length} từ vào thư mục`
                          : "Lưu từ vựng"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi tên Thư mục / File */}
      {renameModalFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!isRenamingList) setRenameModalFolder(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border p-6 animate-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Đổi tên thư mục / file
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameModalFolder(null)}
                disabled={isRenamingList}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRenameFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Tên thư mục mới:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nhập tên thư mục mới..."
                  className="input w-full py-2.5 px-3 text-sm font-medium"
                  disabled={isRenamingList}
                />
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  Tên hiện tại: <strong>{renameModalFolder}</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModalFolder(null)}
                  disabled={isRenamingList}
                  className="btn-ghost px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isRenamingList || !newFolderName.trim() || newFolderName.trim() === renameModalFolder}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRenamingList ? (
                    <>
                      <span className="animate-spin inline-block">⏳</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Lưu tên mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN XOÁ THƯ MỤC                               */}
      {/* ======================================================== */}
      {deleteFolderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeletingList) setDeleteFolderModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border p-6 animate-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shadow-inner">
                  🗑️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    Xác nhận xoá thư mục
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Hành động này không thể hoàn tác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteFolderModal(null)}
                disabled={isDeletingList}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Bạn có chắc chắn muốn xoá toàn bộ thư mục này cùng tất cả từ vựng bên trong?
              </p>

              {/* Folder Info Box */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-inner"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">📁</span>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-[var(--text-primary)] truncate">
                      {deleteFolderModal.folderName}
                    </div>
                    <div className="text-[11px] font-semibold text-rose-500 mt-0.5">
                      Chứa {deleteFolderModal.wordCount} từ vựng
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black shrink-0 border border-rose-500/20">
                  Xoá vĩnh viễn
                </span>
              </div>

              {/* Warning note */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5 leading-relaxed">
                <span className="text-base shrink-0">⚠️</span>
                <span>
                  Toàn bộ <strong>{deleteFolderModal.wordCount} từ vựng</strong> và tiến độ học tập thuộc thư mục <strong>&ldquo;{deleteFolderModal.folderName}&rdquo;</strong> sẽ bị xoá vĩnh viễn khỏi tài khoản của bạn.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setDeleteFolderModal(null)}
                disabled={isDeletingList}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-all cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                disabled={isDeletingList}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
              >
                {isDeletingList ? (
                  <>
                    <span className="animate-spin inline-block">⏳</span>
                    <span>Đang xoá thư mục...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Xác nhận xoá thư mục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN XOÁ TỪ VỰNG                                */}
      {/* ======================================================== */}
      {deleteWordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingId) setDeleteWordModal(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border p-5 animate-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 pb-3 border-b mb-3" style={{ borderColor: "var(--border)" }}>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center text-base">
                🗑️
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  Xoá từ vựng
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Xoá khỏi danh sách cá nhân
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              Bạn có chắc muốn xoá từ <strong className="text-rose-500 font-extrabold">&ldquo;{deleteWordModal.wordTitle}&rdquo;</strong>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteWordModal(null)}
                disabled={deletingId !== null}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-all cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWord}
                disabled={deletingId !== null}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingId !== null ? "Đang xoá..." : "Xoá từ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Happy Farm Link (Chỉ hiển thị xe 🚜) */}
      <Link
        href="/farm"
        className="fixed bottom-5 right-5 z-40 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[var(--bg-card)]/95 backdrop-blur-md border-2 border-emerald-500/40 shadow-xl hover:shadow-2xl hover:border-emerald-500 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-emerald-500/20 group"
        title="Đến Nông Trại Tri Thức (Happy Farm)"
      >
        <span className="group-hover:scale-115 transition-transform select-none">🚜</span>
      </Link>

      {/* Toast Notification (Popup hiển thị ở góc dưới cạnh widget nông trại) */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-20 sm:right-22 z-50 max-w-sm sm:max-w-md p-3 sm:p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.25), 0 0 15px rgba(16, 185, 129, 0.15)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black shrink-0">
              ✓
            </span>
            <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {successMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs opacity-50 hover:opacity-100 hover:bg-[var(--bg-muted)] transition-all cursor-pointer shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL POPUP FOR EDITING INDIVIDUAL WORD               */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 6. MODAL POPUP FOR EDITING INDIVIDUAL WORD               */}
      {/* ======================================================== */}
      {editingWordItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-up">
          <div
            className="card max-w-xl w-full flex flex-col overflow-hidden shadow-2xl border rounded-3xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg">✏️</span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg" style={{ color: "var(--text-primary)" }}>
                    Chỉnh sửa từ vựng
                  </h3>
                  <p className="text-xs text-muted">
                    Chỉnh sửa từ vựng, từ loại, từ đồng nghĩa và hiển thị trên bảng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWordItem(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold opacity-60 hover:opacity-100 hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditWord();
              }}
              className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Row 1: Word & POS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Từ vựng chính (Word / Headword) <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={editingWordItem.headword}
                    onChange={(e) => setEditingWordItem({ ...editingWordItem, headword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="Ví dụ: dine, inventory, opening..."
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Từ loại (POS):
                  </label>
                  <input
                    type="text"
                    value={editingWordItem.pos}
                    onChange={(e) => setEditingWordItem({ ...editingWordItem, pos: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-center"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="(n), (v)..."
                  />
                </div>
              </div>

              {/* Quick POS tags */}
              <div className="flex items-center gap-1.5 flex-wrap -mt-2">
                <span className="text-[11px] opacity-60">Chọn nhanh:</span>
                {["(n)", "(v)", "(adj)", "(adv)", "(phrase)", "(v, n)"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setEditingWordItem({ ...editingWordItem, pos: tag })}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border cursor-pointer transition-all ${
                      editingWordItem.pos === tag
                        ? "bg-blue-500 text-white border-blue-500 shadow-xs"
                        : "bg-blue-500/5 text-blue-500 border-blue-500/20 hover:bg-blue-500/15"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {editingWordItem.pos && (
                  <button
                    type="button"
                    onClick={() => setEditingWordItem({ ...editingWordItem, pos: "" })}
                    className="text-[10px] text-gray-400 hover:text-red-500 px-1 cursor-pointer"
                    title="Xóa từ loại"
                  >
                    ✕ Xóa
                  </button>
                )}
              </div>

              {/* Row 2: Synonym */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Từ đồng nghĩa (Synonyms) — Cột &ldquo;= Đồng nghĩa&rdquo;:
                  </label>
                  <span className="text-[10px] opacity-60">Tách dấu phẩy nếu có nhiều từ</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-amber-500 text-sm select-none">=</span>
                  <input
                    type="text"
                    value={editingWordItem.synonym}
                    onChange={(e) => setEditingWordItem({ ...editingWordItem, synonym: e.target.value.replace(/^=\s*/, "") })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="Ví dụ: eat, feast, take food (hiển thị ở cột Đồng nghĩa)"
                  />
                </div>
              </div>

              {/* Row 3: Vietnamese Meaning */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nghĩa tiếng Việt (Meaning) <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={editingWordItem.meaning}
                  onChange={(e) => setEditingWordItem({ ...editingWordItem, meaning: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  placeholder="Ví dụ: ăn tại chỗ, dùng bữa..."
                  required
                />
              </div>

              {/* Row 4: Collocation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Cụm mở rộng / Phái sinh (Collocation - tùy chọn):
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-purple-500 text-xs select-none">=&gt;</span>
                  <input
                    type="text"
                    value={editingWordItem.collocation}
                    onChange={(e) => setEditingWordItem({ ...editingWordItem, collocation: e.target.value.replace(/^=>\s*/, "") })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="Ví dụ: dine out, dine in, dining room..."
                  />
                </div>
              </div>

              {/* Row 5: Example sentence */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Ví dụ câu (Example - tùy chọn):
                </label>
                <textarea
                  value={editingWordItem.example || ""}
                  onChange={(e) => setEditingWordItem({ ...editingWordItem, example: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
                  style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  placeholder="Ví dụ: Would you like to take your food with you?"
                />
              </div>

              {/* Row 6: Live Table Preview */}
              <div
                className="p-3.5 rounded-2xl border text-xs space-y-1.5"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <span>👁️ Xem trước hiển thị trên bảng từ:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm" style={{ color: "var(--brand)" }}>
                    {editingWordItem.headword.trim() || "(Từ vựng)"}
                  </span>
                  {editingWordItem.pos.trim() && (
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {editingWordItem.pos.replace(/[\(\)]/g, "")}
                    </span>
                  )}
                  {editingWordItem.synonym.trim() && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                      = {editingWordItem.synonym.trim()}
                    </span>
                  )}
                  {editingWordItem.collocation.trim() && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      =&gt; {editingWordItem.collocation.trim()}
                    </span>
                  )}
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="font-medium text-xs" style={{ color: "var(--text-primary)" }}>
                    {editingWordItem.meaning.trim() || <span className="opacity-40 italic">(Nghĩa tiếng Việt)</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setEditingWordItem(null)}
                  className="btn-ghost px-4 py-2 text-xs font-bold border rounded-xl cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingWord || !editingWordItem.headword.trim()}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingWord ? "Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

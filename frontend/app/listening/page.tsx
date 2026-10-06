"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { TOEIC_YEARS_CONFIG, TOEIC_PARTS_INFO, type ToeicYear } from '@/lib/toeicListeningData';
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  SPACED_REPETITION_PRESET_WORDS,
  analyzeWordStructure,
  recordWordProgressToDb,
  SpacedWordItem,
} from "@/lib/spacedRepetition";

interface CustomWord {
  id: number;
  listName: string;
  word: string;
  meaning?: string;
  example?: string;
}

// Web Audio API Sound Effects
function playEffectSound(type: "correct" | "wrong" | "victory" | "click", enabled: boolean = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "victory") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.28);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.28);
      });
    } else if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch {
    // Ignore audio context restriction
  }
}

// Helper to clean words for comparison
function cleanWord(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function ListeningPracticePage() {
  // 2 Thư mục chọn: "vocab" (Thư mục Từ vựng) | "toeic" (Thư mục Chép TOEIC)
  const [categoryMode, setCategoryMode] = useState<"vocab" | "toeic">("vocab");
  // Chế độ hiển thị: "hub" (Màn hình 2 thư mục chọn) | "practice" (Trang luyện chép)
  const [viewMode, setViewMode] = useState<"hub" | "practice">("hub");

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Custom Words from backend DB
  const [customWords, setCustomWords] = useState<CustomWord[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  // Dictation States
  const [dictationIndex, setDictationIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWordCorrect, setIsWordCorrect] = useState<boolean | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [resultsMap, setResultsMap] = useState<Record<number, boolean>>({});

  const correctCount = useMemo(
    () => Object.values(resultsMap).filter((v) => v === true).length,
    [resultsMap]
  );
  const wrongCount = useMemo(
    () => Object.values(resultsMap).filter((v) => v === false).length,
    [resultsMap]
  );
  const totalAnswered = correctCount + wrongCount;
  const accuracyRate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const inputRef = useRef<HTMLInputElement>(null);
  const folderDropdownRef = useRef<HTMLDivElement>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const readyForNextRef = useRef<boolean>(false);

    // 3 Thư mục năm thi TOEIC: 2023 | 2024 | 2026
  const [selectedToeicYear, setSelectedToeicYear] = useState<ToeicYear>("2024");
  const [selectedTest, setSelectedTest] = useState<number>(1);

  const handleSelectToeicYear = (year: ToeicYear) => {
    setSelectedToeicYear(year);
    playEffectSound("click", soundEnabled);
  };

  // 1. Fetch custom words on mount
  useEffect(() => {
    const fetchCustom = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken") || localStorage.getItem("token")
            : null;
        if (!token) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        const res = await fetch(`${apiUrl}/api/vocabulary/custom`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: CustomWord[] = await res.json();
          setCustomWords(data);
        }
      } catch (err) {
        console.error("Failed to fetch custom words:", err);
      }
    };
    fetchCustom();
  }, []);

  // 2. Build full available word pool (all user custom vocabulary + preset topics)
  const allWordPool = useMemo(() => {
    const customItems: SpacedWordItem[] = customWords.map((cw) => ({
      id: `custom-${cw.id}`,
      word: cw.word,
      meaning: cw.meaning || "",
      example: cw.example || "",
      topic: cw.listName || "Thư mục cá nhân",
    }));

    return [...customItems, ...SPACED_REPETITION_PRESET_WORDS];
  }, [customWords]);

  // 3. Extract all folders with counts
  const availableFolders = useMemo(() => {
    const map = new Map<string, { name: string; count: number; source: "preset" | "custom" }>();

    // Add preset topics
    SPACED_REPETITION_PRESET_WORDS.forEach((pw) => {
      const topicName = pw.topic || "Chu kỳ TOEIC";
      const cur = map.get(topicName);
      if (cur) cur.count++;
      else map.set(topicName, { name: topicName, count: 1, source: "preset" });
    });

    // Add custom folders (including user's ETS 2023 - test 10 - part 2)
    customWords.forEach((cw) => {
      const folderName = cw.listName || "Thư mục cá nhân";
      const cur = map.get(folderName);
      if (cur) cur.count++;
      else map.set(folderName, { name: folderName, count: 1, source: "custom" });
    });

    return Array.from(map.values());
  }, [customWords]);

  // Tất cả các bộ từ vựng cá nhân (kể cả ETS 2023 - test 10 - part 2) và Hacker TOEIC đều thuộc Thư mục Từ Vựng
  const vocabFolders = availableFolders;

  // Chọn thư mục từ vựng và chuyển thẳng vào trang chép
  const handleSelectFolder = (folderName: string) => {
    setCategoryMode("vocab");
    setSelectedFolder(folderName);
    setDictationIndex(0);
    setViewMode("practice");
    playEffectSound("click", soundEnabled);
  };

  // 5. Filter deck based on selectedFolder
  const dictationDeck = useMemo(() => {
    if (!selectedFolder || selectedFolder === "all") {
      return allWordPool;
    }
    const filtered = allWordPool.filter(
      (w) => (w.topic || "").toLowerCase() === selectedFolder.toLowerCase()
    );
    return filtered.length > 0 ? filtered : allWordPool;
  }, [allWordPool, selectedFolder]);

  // Current active word item
  const currentWordItem = dictationDeck[dictationIndex] || dictationDeck[0];
  const targetStructure = currentWordItem ? analyzeWordStructure(currentWordItem.word) : null;
  const targetHeadword = targetStructure ? targetStructure.headword : "";

  // Target audio for dictation
  const currentAudioTarget = targetStructure?.cleanForSpeech || currentWordItem?.word || "";

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

  // Reset inputs when switching word
  useEffect(() => {
    setUserInput("");
    setIsChecked(false);
    setShowScript(false);
    setShowHint(false);
    setIsWordCorrect(null);
  }, [dictationIndex, selectedFolder]);

  // Reset results tally when switching folders
  useEffect(() => {
    setResultsMap({});
  }, [selectedFolder]);

  // Speech Synthesis Controller
  const speakText = useCallback((text: string, rate: number = speechRate) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en-") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
      ) || voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [speechRate]);

  const handlePlayCurrentAudio = (rate?: number) => {
    if (currentAudioTarget) {
      speakText(currentAudioTarget, rate ?? speechRate);
    }
  };

  // Check dictation
  const handleCheckDictation = useCallback((giveUp: boolean = false) => {
    if (!currentWordItem) return;
    lastCheckTimeRef.current = Date.now();
    readyForNextRef.current = false; // Block instant advance until keyup

    const userClean = cleanWord(userInput);
    const targetClean = cleanWord(targetHeadword);
    const synonymClean = targetStructure?.synonym ? cleanWord(targetStructure.synonym) : "";
    const correct =
      !giveUp &&
      userClean.length > 0 &&
      (userClean === targetClean || (synonymClean.length > 0 && userClean === synonymClean));

    setIsWordCorrect(correct);
    setIsChecked(true);
    setResultsMap((prev) => ({ ...prev, [dictationIndex]: correct }));

    if (correct) {
      playEffectSound("correct", soundEnabled);
      setCompletedCount((prev) => prev + 1);
    } else {
      playEffectSound("wrong", soundEnabled);
    }

    // Auto-play the correct word pronunciation so the user hears it immediately
    setTimeout(() => {
      if (targetStructure?.cleanForSpeech) {
        speakText(targetStructure.cleanForSpeech, speechRate);
      }
    }, 120);

    // Save word progress to DB
    recordWordProgressToDb({
      word: currentWordItem.word,
      meaning: currentWordItem.meaning,
      example: currentWordItem.example,
      listName: currentWordItem.topic || selectedFolder,
      isCorrect: correct,
    });
  }, [currentWordItem, userInput, targetHeadword, targetStructure, soundEnabled, dictationIndex, selectedFolder, speakText, speechRate]);

  // Next / Prev navigation
  const handleNextDictation = useCallback(() => {
    readyForNextRef.current = false;
    const nextIdx = (dictationIndex + 1) % dictationDeck.length;
    setDictationIndex(nextIdx);
    setUserInput("");
    setIsChecked(false);
    setShowScript(false);
    setShowHint(false);
    setIsWordCorrect(null);

    setTimeout(() => {
      const nextWord = dictationDeck[nextIdx];
      if (nextWord) {
        const nextAudio = analyzeWordStructure(nextWord.word).cleanForSpeech || nextWord.word;
        speakText(nextAudio, speechRate);
      }
      inputRef.current?.focus();
    }, 150);
  }, [dictationIndex, dictationDeck, speechRate, speakText]);

  // KeyUp listener: arm readyForNextRef ONLY after the user releases Enter
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isChecked) {
        readyForNextRef.current = true;
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [isChecked]);

  // Global Enter listener: Enter 1 = Check & Display Answer; Enter 2 (after release) = Next Word
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isDictating = viewMode === "practice" && categoryMode === "vocab";

      if (e.key === "Enter" && !e.shiftKey && isDictating) {
        if (e.repeat) return;

        if (!isChecked) {
          e.preventDefault();
          handleCheckDictation(!userInput.trim());
        } else {
          // If already checked, only advance if user released Enter previously
          if (!readyForNextRef.current) return;
          if (Date.now() - lastCheckTimeRef.current < 350) return;
          e.preventDefault();
          readyForNextRef.current = false;
          handleNextDictation();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isChecked, viewMode, categoryMode, userInput, handleCheckDictation, handleNextDictation]);

  const handlePrevDictation = () => {
    if (dictationIndex > 0) {
      setDictationIndex((prev) => prev - 1);
    }
  };

  // Hint generator
  const hintText = useMemo(() => {
    return targetHeadword
      ? targetHeadword.split("").map((c, i) => (i === 0 ? c : "_")).join(" ")
      : "";
  }, [targetHeadword]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-subtle)" }}>
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
            <Link
              href="/dashboard"
              className="text-sm transition-colors hover:text-blue-500"
              style={{ color: "var(--text-muted)" }}
            >
              ← Dashboard
            </Link>
            <Link
              href="/vocabulary"
              className="text-sm font-semibold transition-colors hover:text-blue-500 flex items-center gap-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <span>📚</span> Học từ vựng
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sound Toggle (Icon only) */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playEffectSound("click", !soundEnabled);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-2xs transition-all text-base cursor-pointer hover:border-blue-400/50"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
              }}
              title={soundEnabled ? "Âm thanh: Đang bật" : "Âm thanh: Đang tắt"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            <LogoutButton />
            <ThemeToggle variant="subtle" />
          </div>
        </div>
      </header>

      {/* Main Content Area (Full Width, Centered, Max 1440px) */}
      <main className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        {/* ========================================================= */}
        {/* VIEW 1: MÀN HÌNH CHỌN 2 THƯ MỤC (HUB)                     */}
        {/* ========================================================= */}
        {viewMode === "hub" && (
          <div className="space-y-8 animate-fade-up max-w-5xl mx-auto py-2">
            {/* Header */}
            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <span>🎧</span> CHỌN HÌNH THỨC LUYỆN CHÉP CHÍNH TẢ
              </div>
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>
                Bạn muốn luyện chép nội dung nào hôm nay?
              </h2>
              <p className="text-xs sm:text-sm max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
                Hệ thống chia làm 2 thư mục chính bên dưới. Hãy chọn 1 thư mục để vào trang chép tương ứng:
              </p>
            </div>

            {/* 2 Thư Mục Chọn (Folder Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* THƯ MỤC 1: THƯ MỤC TỪ VỰNG */}
              <div
                className="rounded-3xl border p-6 sm:p-7 flex flex-col justify-between gap-6 transition-all hover:shadow-xl hover:border-blue-400/80 group relative overflow-hidden"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xs">
                      📁
                    </div>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                      {vocabFolders.length} bộ từ vựng
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      THƯ MỤC 1
                    </div>
                    <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                      Thư mục Từ vựng
                    </h3>
                    <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>
                      Luyện nghe phát âm từng từ, gõ chính tả tiếng Anh, xem phiên âm IPA, từ đồng nghĩa, từ loại và collocations theo các chủ đề hoặc danh sách cá nhân.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectFolder(vocabFolders[0]?.name || "all")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-y-[-1px]"
                >
                  <span>Vào trang Chép Từ Vựng</span>
                  <span>➔</span>
                </button>
              </div>

              {/* THƯ MỤC 2: THƯ MỤC CHÉP TOEIC */}
              <div
                className="rounded-3xl border p-6 sm:p-7 flex flex-col justify-between gap-6 transition-all hover:shadow-xl hover:border-amber-400/80 group relative overflow-hidden"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xs">
                      🎯
                    </div>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      3 Thư mục Năm (2023 · 2024 · 2026)
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      THƯ MỤC 2
                    </div>
                    <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                      Thư mục Chép TOEIC
                    </h3>
                    <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>
                      Luyện nghe trắc nghiệm & chép chính tả đề thi TOEIC chuẩn format ETS với 3 thư mục năm đề thi (2023, 2024, 2026), mỗi năm gồm đầy đủ 4 Part (Tranh ảnh, Hỏi đáp, Hội thoại, Bài nói ngắn).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCategoryMode("toeic");
                    setViewMode("practice");
                    playEffectSound("click", soundEnabled);
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:translate-y-[-1px]"
                >
                  <span>Vào Luyện đề TOEIC (2023 · 2024 · 2026)</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: TRANG LUYỆN CHÉP (PRACTICE)                       */}
        {/* ========================================================= */}
        {viewMode === "practice" && (
          <div className="space-y-6 animate-fade-up">
            {/* Top Navigation: Return to Hub */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              {/* Button quay lại màn hình chọn 2 thư mục */}
              <button
                type="button"
                onClick={() => {
                  setViewMode("hub");
                  playEffectSound("click", soundEnabled);
                }}
                className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm bg-[var(--bg-card)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-indigo-600 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0"
                style={{ borderColor: "var(--border)" }}
                title="Đổi thư mục chọn (Quay lại Hub)"
              >
                <span className="font-extrabold text-sm leading-none">←</span>
              </button>
            </div>

            {/* DICTATION LAYOUT (Dành riêng cho Thư mục Từ Vựng) */}
            {categoryMode === "vocab" && currentWordItem && (
              <div className="space-y-6 animate-fade-up">
                {/* Top Toolbar: Folder Selector, Speed Controls & Progress */}
                <div
                  className="p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Folder Dropdown Trigger */}
                    <div className="flex items-center gap-3 flex-wrap relative" ref={folderDropdownRef}>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                        <span>📁</span> Bộ từ vựng:
                      </label>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsFolderDropdownOpen((prev) => !prev)}
                          className="px-4 py-2 rounded-xl border shadow-xs font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer hover:border-blue-400"
                          style={{
                            background: "var(--bg-subtle)",
                            borderColor: isFolderDropdownOpen ? "var(--brand)" : "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <span className="truncate max-w-[200px] sm:max-w-[280px]">
                            {selectedFolder === "all" ? "⚡ Tất cả từ vựng" : `📚 ${selectedFolder}`}
                          </span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black">
                            {dictationDeck.length} từ
                          </span>
                          <span className="text-[10px] opacity-70">{isFolderDropdownOpen ? "▲" : "▼"}</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isFolderDropdownOpen && (
                          <div
                            className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-2xl border shadow-xl z-50 p-2 space-y-1 animate-fade-up"
                            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                          >
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-3 py-1.5 flex items-center justify-between">
                              <span>Danh Sách Bộ Từ Vựng:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode("hub");
                                  setIsFolderDropdownOpen(false);
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                Đổi sang Chép TOEIC
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFolder("all");
                                setDictationIndex(0);
                                setIsFolderDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                selectedFolder === "all"
                                  ? "bg-blue-600 text-white"
                                  : "hover:bg-[var(--bg-muted)] text-[var(--text-primary)]"
                              }`}
                            >
                              <span>⚡ Tất cả từ vựng</span>
                              <span className="text-[11px] opacity-80">({allWordPool.length} từ)</span>
                            </button>

                            {vocabFolders.map((f) => (
                              <button
                                key={f.name}
                                type="button"
                                onClick={() => {
                                  setSelectedFolder(f.name);
                                  setDictationIndex(0);
                                  setIsFolderDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                  selectedFolder === f.name
                                    ? "bg-blue-600 text-white"
                                    : "hover:bg-[var(--bg-muted)] text-[var(--text-primary)]"
                                }`}
                              >
                                <span className="truncate pr-2">📖 {f.name}</span>
                                <span className="text-[11px] opacity-80 shrink-0">({f.count} từ)</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="text-xs font-bold text-[var(--text-muted)] mr-1">Tốc độ:</span>
                  {[0.75, 1.0, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSpeechRate(rate)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        speechRate === rate
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                      }`}
                      style={{ borderColor: speechRate === rate ? "transparent" : "var(--border)" }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Progress bar & Correct/Wrong Tally */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevDictation}
                      disabled={dictationIndex <= 0}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      style={{ borderColor: "var(--border)" }}
                      title="Từ trước"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Từ {dictationIndex + 1}/{dictationDeck.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextDictation}
                      disabled={dictationIndex >= dictationDeck.length - 1}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      style={{ borderColor: "var(--border)" }}
                      title="Từ tiếp theo"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Badges Đúng / Sai */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                      <span>✅</span>
                      <span>{correctCount} đúng</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-2xs">
                      <span>❌</span>
                      <span>{wrongCount} sai</span>
                    </span>
                    {totalAnswered > 0 && (
                      <span className="text-[11px] font-bold text-[var(--text-muted)] hidden sm:inline-block">
                        ({accuracyRate}% chính xác)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold text-[var(--text-muted)]">
                  Chủ đề: <span className="text-blue-600 dark:text-blue-400">{currentWordItem.topic || selectedFolder}</span>
                </div>
              </div>
            </div>

            {/* 2-COLUMN GRID: 1 BÊN NGHE & NHẬP, 1 BÊN HIỂN THỊ KẾT QUẢ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* ========================================================= */}
              {/* CỘT 1: BÊN NGHE & NHẬP LIỆU                               */}
              {/* ========================================================= */}
              <div
                className="p-5 sm:p-6 rounded-2xl border space-y-5 shadow-xs"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎧</span>
                    <h2 className="font-extrabold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                      Luyện Nghe & Gõ Từ Vựng
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                    BƯỚC 1: NGHE & NHẬP
                  </span>
                </div>

                {/* Big Audio Player Control */}
                <div
                  className="p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
                  style={{
                    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handlePlayCurrentAudio()}
                      className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-2xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-blue-500/20 shrink-0"
                      title="Bấm để nghe phát âm"
                    >
                      {isSpeaking ? "🔊" : "▶️"}
                    </button>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                        Bấm để nghe phát âm từ vựng
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Lắng nghe trọng âm và âm đuôi để gõ lại từ vựng chính xác
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-[var(--bg-card)] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    <span>💡</span>
                    <span>{showHint ? "Ẩn gợi ý" : "Gợi ý chữ đầu"}</span>
                  </button>
                </div>

                {/* Hint Display */}
                {showHint && (
                  <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono text-sm tracking-wider">
                    💡 Gợi ý: {hintText}
                  </div>
                )}

                {/* Clue: Meaning and POS */}
                <div className="p-4 rounded-xl border space-y-1.5" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                  <div className="text-[10px] font-extrabold uppercase text-[var(--text-muted)] flex items-center justify-between">
                    <span>Gợi ý nghĩa tiếng Việt:</span>
                    {targetStructure?.posTags && targetStructure.posTags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {targetStructure.posTags.map((p, i) => (
                          <span key={i} className="px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/15 text-blue-500">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>
                    {currentWordItem.meaning || "Từ vựng TOEIC"}
                  </div>
                </div>

                {/* Typing Input */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                    <span>Nhập từ vựng tiếng Anh bạn nghe được:</span>
                    <span className="text-[11px] font-semibold text-blue-500 lowercase opacity-90">
                      {isChecked ? "Nhấn Enter ↵ để sang từ tiếp theo" : "Nhấn Enter ↵ để kiểm tra đáp án"}
                    </span>
                  </label>

                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (e.repeat) return;
                        e.preventDefault();
                        if (!isChecked) {
                          handleCheckDictation(!userInput.trim());
                        } else {
                          if (readyForNextRef.current && Date.now() - lastCheckTimeRef.current >= 350) {
                            readyForNextRef.current = false;
                            handleNextDictation();
                          }
                        }
                      }
                    }}
                    placeholder="Gõ từ vựng tiếng Anh tại đây... (Nhấn Enter để kiểm tra)"
                    readOnly={isChecked}
                    className={`w-full p-4 rounded-xl border text-base font-bold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none ${
                      isChecked
                        ? isWordCorrect
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300"
                        : ""
                    }`}
                    style={{
                      background: isChecked ? undefined : "var(--bg-card)",
                      borderColor: isChecked ? undefined : "var(--border)",
                      color: isChecked ? undefined : "var(--text-primary)",
                    }}
                    autoFocus
                  />
                </div>

                {/* Action Buttons in Column 1 */}
                <div className="flex items-center gap-3 pt-2">
                  {!isChecked ? (
                    <button
                      type="button"
                      onClick={() => handleCheckDictation(!userInput.trim())}
                      className="flex-1 py-3 px-6 rounded-xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-101 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Kiểm tra đáp án</span>
                      <span className="text-xs font-normal opacity-85">(Enter ↵)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextDictation}
                      className="flex-1 py-3 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:scale-101 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Từ tiếp theo</span>
                      <span>➔</span>
                      <span className="text-xs font-normal opacity-85">(Enter ↵)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePlayCurrentAudio()}
                    className="px-4 py-3 rounded-xl border text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    title="Nghe lại phát âm từ vựng"
                  >
                    <span>🔊</span>
                    <span className="hidden sm:inline">Nghe lại</span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* CỘT 2: BÊN HIỂN THỊ KẾT QUẢ & ĐỐI CHIẾU                   */}
              {/* ========================================================= */}
              <div
                className="p-5 sm:p-6 rounded-2xl border space-y-5 shadow-xs min-h-[420px]"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <h2 className="font-extrabold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                      Kết Quả & Phân Tích Chi Tiết
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScript(!showScript)}
                    className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    {showScript ? "Ẩn đáp án" : "👁️ Xem trước đáp án"}
                  </button>
                </div>

                {!isChecked && !showScript ? (
                  /* Placeholder state when waiting for user to check */
                  <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-3xl">
                      🎧
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <div className="font-black text-base" style={{ color: "var(--text-primary)" }}>
                        Chưa có kết quả đối chiếu
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        Hãy nghe phát âm ở bên trái, gõ từ bạn nghe được và nhấn <strong className="text-blue-500 font-bold">Enter ↵</strong>. Kết quả đúng/sai cùng phiên âm, ví dụ và cụm từ sẽ xuất hiện ngay tại đây!
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-[var(--bg-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1.5 text-left w-full max-w-sm" style={{ borderColor: "var(--border)" }}>
                      <div className="font-bold text-[var(--text-primary)]">💡 Thao tác tiện lợi:</div>
                      <div>• <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-mono">Enter ↵</kbd>: Kiểm tra hoặc bỏ qua từ để xem đáp án.</div>
                      <div>• <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-mono">Enter ↵</kbd> lần 2: Sang từ tiếp theo.</div>
                    </div>
                  </div>
                ) : (
                  /* Checked / Answer Revealed State */
                  <div className="space-y-4 animate-fade-up">
                    {isChecked && (
                      <div
                        className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                          isWordCorrect
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                            : "bg-rose-500/15 border-rose-500/40 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-sm flex items-center gap-1.5">
                            <span>{isWordCorrect ? "🎉 Chính xác tuyệt đối!" : "❌ Chưa chính xác!"}</span>
                            {!isWordCorrect && (
                              <span className="font-normal opacity-85 text-xs">
                                {userInput.trim() ? `(Bạn đã nhập: "${userInput}")` : "(Bạn chưa nhập từ này)"}
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-black mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase font-extrabold opacity-75">Đáp án đúng:</span>
                            <span className="text-blue-600 dark:text-blue-400 font-mono tracking-wide underline decoration-2">
                              {targetHeadword}
                            </span>
                            {targetStructure?.synonym && (
                              <span className="text-xs font-semibold opacity-85 text-[var(--text-secondary)]">
                                (hoặc: {targetStructure.synonym})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleNextDictation}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 self-start sm:self-center cursor-pointer transition-all hover:scale-102 shrink-0"
                        >
                          <span>Từ tiếp theo</span>
                          <span>➔</span>
                          <span className="text-[10px] font-normal opacity-90">(Enter ↵)</span>
                        </button>
                      </div>
                    )}

                    {/* Breakdown Card */}
                    <div className="p-4 rounded-xl border space-y-3.5 bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)" }}>
                      {/* Target Word & Speaker */}
                      <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                            🎯 Từ vựng chuẩn:
                          </div>
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-2.5">
                            <span>{targetHeadword}</span>
                            {targetStructure?.synonym && (
                              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                                = {targetStructure.synonym}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => speakText(targetStructure?.cleanForSpeech || "")}
                              className="w-8 h-8 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm transition-all cursor-pointer"
                              title="Phát lại âm thanh từ vựng"
                            >
                              🔊
                            </button>
                          </div>
                        </div>
                        {targetStructure?.posTags && targetStructure.posTags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {targetStructure.posTags.map((p, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md text-xs font-mono font-black uppercase bg-blue-500/15 text-blue-500">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Meaning */}
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Nghĩa tiếng Việt:</div>
                        <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                          {currentWordItem.meaning || "Từ vựng TOEIC"}
                        </div>
                      </div>

                      {/* Real example sentence with audio */}
                      {currentWordItem.example && (
                        <div className="p-3.5 rounded-xl border bg-[var(--bg-card)] space-y-1.5" style={{ borderColor: "var(--border)" }}>
                          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                            <span>Câu ví dụ thực tế:</span>
                            <button
                              type="button"
                              onClick={() => speakText(currentWordItem.example!)}
                              className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>🔊</span>
                              <span>Nghe câu ví dụ</span>
                            </button>
                          </div>
                          <div className="text-sm font-semibold italic" style={{ color: "var(--text-primary)" }}>
                            &ldquo;{currentWordItem.example}&rdquo;
                          </div>
                        </div>
                      )}

                      {targetStructure?.collocation && (
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                          <span>🔗 Cụm liên quan:</span>
                          <span className="font-bold">{targetStructure.collocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LUYỆN ĐỀ THEO PART (PART 1 - 4) KHI Ở THƯ MỤC CHÉP TOEIC  */}
        {/* ========================================================= */}
        {categoryMode === "toeic" && (
          <div className="space-y-6 animate-fade-up">
            {/* 3 Thư mục năm thi: 2023, 2024, 2026 */}
            <div className="p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                  <span>📁</span>
                  <span>3 Thư mục năm đề thi TOEIC:</span>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25">
                  Đang luyện: <strong>{selectedToeicYear}</strong> (4 Part)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TOEIC_YEARS_CONFIG.map((y) => {
                  const isSelected = selectedToeicYear === y.year;
                  return (
                    <button
                      key={y.year}
                      type="button"
                      onClick={() => handleSelectToeicYear(y.year)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? y.activeColor
                          : "border-[var(--border)] bg-[var(--bg-subtle)] hover:border-amber-400 text-[var(--text-secondary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{y.icon}</span>
                        <div>
                          <div className="text-xs font-black">
                            {y.title}
                          </div>
                          <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                            {y.badge}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-[var(--bg-card)] text-amber-600 dark:text-amber-400 border border-[var(--border)]"}`}>
                        {isSelected ? "Đang chọn ✓" : "Chọn ➔"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10 Đề thi (Test 1 - Test 10) của năm thi */}
            <div className="p-4 sm:p-5 rounded-2xl border space-y-3.5 shadow-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                  <span>📝</span>
                  <span>10 Đề thi của ETS TOEIC {selectedToeicYear}:</span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/25">
                  Đang chọn: <strong>Test {selectedTest < 10 ? `0${selectedTest}` : selectedTest}</strong> ({selectedToeicYear})
                </span>
              </div>

              {/* 10 Test buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((tNum) => {
                  const isTestActive = selectedTest === tNum;
                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => {
                        setSelectedTest(tNum);
                        playEffectSound("click", soundEnabled);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isTestActive
                          ? "bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-400/30"
                          : "border-[var(--border)] bg-[var(--bg-subtle)] hover:border-blue-400 text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      <span className="text-xs font-black">
                        Test {tNum < 10 ? `0${tNum}` : tNum}
                      </span>
                      <span className={`text-[10px] ${isTestActive ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                        4 Part
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Thư Mục / Part Folders Grid của Test đang chọn */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>📂</span>
                  <span>4 Thư mục Part của Test {selectedTest < 10 ? `0${selectedTest}` : selectedTest} (ETS {selectedToeicYear}):</span>
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Bấm vào thư mục Part để vào trang làm bài
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOEIC_PARTS_INFO.map((p) => {
                  return (
                    <Link
                      key={p.part}
                      href={`/listening/part/${p.part}?year=${selectedToeicYear}&test=${selectedTest}`}
                      className="p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 group hover:shadow-lg hover:border-amber-400 bg-[var(--bg-card)] border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                          <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            {p.folderCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-amber-600/90 dark:text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Chưa có câu (0 câu)
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-base font-extrabold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          <span>{p.icon}</span>
                          <span>{p.title}</span>
                        </div>
                        <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {p.subtitle}
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400" style={{ borderColor: 'var(--border)' }}>
                        <span>Vào thư mục {p.folderCode}</span>
                        <span className="group-hover:translate-x-1 transition-transform">➔</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </main>
</div>
);
}

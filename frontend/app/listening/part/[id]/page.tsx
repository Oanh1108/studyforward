"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  TOEIC_YEARS_CONFIG,
  TOEIC_PARTS_INFO,
  TOEIC_DATA_BY_YEAR,
  type ToeicYear,
} from "@/lib/toeicListeningData";
import { getPart2StudyDetails, getPart2AudioTimestamp } from "@/lib/toeicPart2StudyData";

interface WordDiffItem {
  expectedWord: string;
  userWord?: string;
  status: "correct" | "typo" | "missing" | "extra";
}

function cleanWord(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function renderHint(text: string) {
  return text
    .split(/\s+/)
    .map((word) => {
      const clean = cleanWord(word);
      if (clean.length <= 1) return word;
      return word[0] + "_".repeat(Math.max(1, word.length - 1));
    })
    .join(" ");
}

function wordSimilarity(a: string, b: string): number {
  const ca = cleanWord(a);
  const cb = cleanWord(b);
  if (ca === cb) return 1;
  if (!ca || !cb) return 0;

  const lenA = ca.length;
  const lenB = cb.length;
  const d: number[][] = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) d[i][0] = i;
  for (let j = 0; j <= lenB; j++) d[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = ca[i - 1] === cb[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  const maxLen = Math.max(lenA, lenB);
  return 1 - d[lenA][lenB] / maxLen;
}

function computeDictationDiff(expectedText: string, userInput: string) {
  const expectedTokens = expectedText.trim().split(/\s+/).filter(Boolean);
  const userTokens = userInput.trim().split(/\s+/).filter(Boolean);

  if (expectedTokens.length === 0) {
    return { items: [] as WordDiffItem[], accuracy: 0, totalWords: 0, correctWords: 0 };
  }

  const m = expectedTokens.length;
  const n = userTokens.length;

  const MATCH = 3;
  const MISMATCH = 0;
  const INDEL = -2;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i * INDEL;
  for (let j = 0; j <= n; j++) dp[0][j] = j * INDEL;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const isExact = cleanWord(expectedTokens[i - 1]) === cleanWord(userTokens[j - 1]);
      const sim = wordSimilarity(expectedTokens[i - 1], userTokens[j - 1]);
      const score = isExact ? MATCH : (sim > 0.4 ? 1 : MISMATCH);

      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + score,
        dp[i - 1][j] + INDEL,
        dp[i][j - 1] + INDEL
      );
    }
  }

  let i = m;
  let j = n;
  const alignedExpected: (string | null)[] = [];
  const alignedUser: (string | null)[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isExact = cleanWord(expectedTokens[i - 1]) === cleanWord(userTokens[j - 1]);
      const sim = wordSimilarity(expectedTokens[i - 1], userTokens[j - 1]);
      const score = isExact ? MATCH : (sim > 0.4 ? 1 : MISMATCH);

      if (dp[i][j] === dp[i - 1][j - 1] + score) {
        alignedExpected.unshift(expectedTokens[i - 1]);
        alignedUser.unshift(userTokens[j - 1]);
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + INDEL)) {
      alignedExpected.unshift(expectedTokens[i - 1]);
      alignedUser.unshift(null);
      i--;
    } else {
      alignedExpected.unshift(null);
      alignedUser.unshift(userTokens[j - 1]);
      j--;
    }
  }

  const items: WordDiffItem[] = [];
  let correctWords = 0;

  for (let k = 0; k < alignedExpected.length; k++) {
    const exp = alignedExpected[k];
    const usr = alignedUser[k];

    if (exp && usr) {
      const isMatch = cleanWord(exp) === cleanWord(usr);
      if (isMatch) {
        correctWords++;
        items.push({ expectedWord: exp, userWord: usr, status: "correct" });
      } else {
        items.push({ expectedWord: exp, userWord: usr, status: "typo" });
      }
    } else if (exp && !usr) {
      items.push({ expectedWord: exp, status: "missing" });
    } else if (!exp && usr) {
      items.push({ expectedWord: "", userWord: usr, status: "extra" });
    }
  }

  const accuracy = Math.round((correctWords / expectedTokens.length) * 100);

  return { items, accuracy, totalWords: expectedTokens.length, correctWords };
}

export default function ToeicPartPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const partNumber = (Number(rawId) || 1) as 1 | 2 | 3 | 4;

  const initialYear = (searchParams.get("year") as ToeicYear) || "2024";
  const initialTest = Number(searchParams.get("test")) || 1;
  const [selectedYear, setSelectedYear] = useState<ToeicYear>(
    ["2023", "2024", "2026"].includes(initialYear) ? initialYear : "2024"
  );
  const [selectedTest, setSelectedTest] = useState<number>(
    initialTest >= 1 && initialTest <= 10 ? initialTest : 1
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sound effect helper
  const playEffectSound = (type: "correct" | "wrong" | "click") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "correct") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "wrong") {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Ignore audio restriction
    }
  };

  // Text-to-speech
  const speakText = (text: string, rate = 0.95) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const yearDataset = useMemo(() => {
    return TOEIC_DATA_BY_YEAR[selectedYear] || TOEIC_DATA_BY_YEAR["2024"];
  }, [selectedYear]);

  const PART1_DATA = yearDataset.part1;
  const PART2_DATA = yearDataset.part2;
  const PART3_DATA = yearDataset.part3;
  const PART4_DATA = yearDataset.part4;

  const partInfo = useMemo(() => {
    return (
      TOEIC_PARTS_INFO.find((p) => p.part === partNumber) ||
      TOEIC_PARTS_INFO[0]
    );
  }, [partNumber]);

  // Drill states
  // Part 1
  const [part1Index, setPart1Index] = useState(0);
  const [part1Selected, setPart1Selected] = useState<string | null>(null);
  const [part1Revealed, setPart1Revealed] = useState(false);
  const [part1DictationInput, setPart1DictationInput] = useState("");
  const [part1DictationChecked, setPart1DictationChecked] = useState(false);
  const [part1PlaybackSpeed, setPart1PlaybackSpeed] = useState<number>(1.0);
  const [part1ShowHint, setPart1ShowHint] = useState(false);

  // Part 2
  const [part2Index, setPart2Index] = useState(0);
  const [part2Selected, setPart2Selected] = useState<string | null>(null);
  const [part2Revealed, setPart2Revealed] = useState(false);
  const [part2ShowExplanation, setPart2ShowExplanation] = useState(false);
  const [part2InDictation, setPart2InDictation] = useState(false);
  const [part2Stage, setPart2Stage] = useState<number>(0);
  const [part2StageInputs, setPart2StageInputs] = useState<Record<number, string>>({ 0: "", 1: "", 2: "", 3: "" });
  const [part2StageChecked, setPart2StageChecked] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });
  const [part2StageHint, setPart2StageHint] = useState(false);
  const [part2PlaybackSpeed, setPart2PlaybackSpeed] = useState<number>(1.0);
  const [part2ShowQuestionPalette, setPart2ShowQuestionPalette] = useState(false);

  // Part 2 Persistent Store: Auto-save & Restore progress across reloads / restarts
  const [part2QuestionsStore, setPart2QuestionsStore] = useState<
    Record<
      number,
      {
        selected: string | null;
        revealed: boolean;
        inDictation: boolean;
        stage: number;
        stageInputs: Record<number, string>;
        stageChecked: Record<number, boolean>;
      }
    >
  >({});
  const [part2Hydrated, setPart2Hydrated] = useState(false);

  // Khôi phục bài làm chép chính tả từ localStorage khi mở trang
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `studyforward_p2_${selectedYear}_t${selectedTest}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.questionsStore) {
          setPart2QuestionsStore(data.questionsStore);
        }
        const lastIdx = typeof data.lastIndex === "number" ? data.lastIndex : 0;
        const qProg = data.questionsStore?.[lastIdx];
        if (qProg) {
          setPart2Index(lastIdx);
          setPart2Selected(qProg.selected ?? null);
          setPart2Revealed(qProg.revealed ?? false);
          setPart2InDictation(qProg.inDictation ?? false);
          setPart2Stage(qProg.stage ?? 0);
          setPart2StageInputs(qProg.stageInputs ?? { 0: "", 1: "", 2: "", 3: "" });
          setPart2StageChecked(qProg.stageChecked ?? { 0: false, 1: false, 2: false, 3: false });
        }
      }
    } catch {
      // Ignore json parse error
    } finally {
      setPart2Hydrated(true);
    }
  }, [selectedYear, selectedTest]);

  // Tự động lưu tiến độ vào localStorage mỗi khi gõ phím hoặc đổi trạng thái
  useEffect(() => {
    if (typeof window === "undefined" || !part2Hydrated || partNumber !== 2) return;
    const storageKey = `studyforward_p2_${selectedYear}_t${selectedTest}`;
    try {
      const updatedStore = {
        ...part2QuestionsStore,
        [part2Index]: {
          selected: part2Selected,
          revealed: part2Revealed,
          inDictation: part2InDictation,
          stage: part2Stage,
          stageInputs: part2StageInputs,
          stageChecked: part2StageChecked,
        },
      };
      setPart2QuestionsStore(updatedStore);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          lastIndex: part2Index,
          questionsStore: updatedStore,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore quota error
    }
  }, [
    part2Hydrated,
    partNumber,
    selectedYear,
    selectedTest,
    part2Index,
    part2Selected,
    part2Revealed,
    part2InDictation,
    part2Stage,
    part2StageInputs,
    part2StageChecked,
  ]);

  // Part 2 Custom Audio Player
  const part2AudioRef = useRef<HTMLAudioElement | null>(null);
  const [part2AudioPlaying, setPart2AudioPlaying] = useState(false);
  const [part2AudioCurrentTime, setPart2AudioCurrentTime] = useState(0);
  const [part2AudioDuration, setPart2AudioDuration] = useState(15);
  const [part2AudioSpeed, setPart2AudioSpeed] = useState(1.0);
  const [part2AudioMenuOpen, setPart2AudioMenuOpen] = useState(false);
  const part2AudioMenuRef = useRef<HTMLDivElement | null>(null);
  const part2ActionButtonsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (partNumber === 2 && part2InDictation && part2StageChecked[part2Stage]) {
      part2ActionButtonsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [partNumber, part2InDictation, part2StageChecked, part2Stage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (part2AudioMenuRef.current && !part2AudioMenuRef.current.contains(e.target as Node)) {
        setPart2AudioMenuOpen(false);
      }
    };
    if (part2AudioMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [part2AudioMenuOpen]);

  const togglePart2PlayAudio = () => {
    if (!part2AudioRef.current) return;
    if (part2AudioPlaying) {
      part2AudioRef.current.pause();
      setPart2AudioPlaying(false);
    } else {
      part2AudioRef.current.playbackRate = part2AudioSpeed;
      part2AudioRef.current.play().then(() => {
        setPart2AudioPlaying(true);
      }).catch(() => {});
    }
  };

  const restartPart2Audio = () => {
    if (!part2AudioRef.current) return;
    part2AudioRef.current.currentTime = 0;
    setPart2AudioCurrentTime(0);
    part2AudioRef.current.playbackRate = part2AudioSpeed;
    part2AudioRef.current.play().then(() => {
      setPart2AudioPlaying(true);
    }).catch(() => {});
  };

  // Phím tắt Ctrl để phát/đọc lại audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Control" || e.code === "ControlLeft" || e.code === "ControlRight") && !e.repeat) {
        if (partNumber === 2) {
          restartPart2Audio();
        } else if (partNumber === 1) {
          const currOpt = PART1_DATA[part1Index]?.options.find((o) => o.key === part1Selected) || PART1_DATA[part1Index]?.options[0];
          if (currOpt) speakText(currOpt.text, part1PlaybackSpeed);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [partNumber, part2AudioSpeed, part1Index, part1Selected, part1PlaybackSpeed]);

  const handlePart2AudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPart2AudioCurrentTime(val);
    if (part2AudioRef.current) {
      part2AudioRef.current.currentTime = val;
    }
  };

  const formatAudioTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
  };

  // Part 3
  const [part3Answers, setPart3Answers] = useState<Record<number, string>>({});
  const [part3Revealed, setPart3Revealed] = useState(false);

  // Part 4
  const [part4Index, setPart4Index] = useState(0);
  const [part4Answers, setPart4Answers] = useState<Record<number, string>>({});
  const [part4Revealed, setPart4Revealed] = useState(false);

  const goToPart1Question = (idx: number) => {
    setPart1Index(idx);
    setPart1Selected(null);
    setPart1Revealed(false);
    setPart1DictationInput("");
    setPart1DictationChecked(false);
    setPart1ShowHint(false);
    playEffectSound("click");
  };

  const goToPart2Question = (idx: number, startInDictation = false) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (part2AudioRef.current) {
      part2AudioRef.current.pause();
      part2AudioRef.current.currentTime = 0;
    }
    setPart2AudioPlaying(false);
    setPart2AudioCurrentTime(0);
    setPart2Index(idx);
    setPart2ShowExplanation(false);

    // Lưu lại tiến độ câu hiện tại trước khi chuyển câu
    const prevEntry = {
      selected: part2Selected,
      revealed: part2Revealed,
      inDictation: part2InDictation,
      stage: part2Stage,
      stageInputs: part2StageInputs,
      stageChecked: part2StageChecked,
    };
    const currentStore = {
      ...part2QuestionsStore,
      [part2Index]: prevEntry,
    };
    setPart2QuestionsStore(currentStore);

    const saved = currentStore[idx];
    if (saved) {
      setPart2Selected(saved.selected);
      setPart2Revealed(saved.revealed);
      setPart2InDictation(startInDictation || saved.inDictation);
      setPart2Stage(saved.stage);
      setPart2StageInputs(saved.stageInputs);
      setPart2StageChecked(saved.stageChecked);
    } else {
      setPart2Selected(null);
      setPart2Revealed(false);
      setPart2InDictation(startInDictation);
      setPart2Stage(0);
      setPart2StageInputs({ 0: "", 1: "", 2: "", 3: "" });
      setPart2StageChecked({ 0: false, 1: false, 2: false, 3: false });
    }
    setPart2StageHint(false);
    playEffectSound("click");
  };

  const resetPart2Progress = () => {
    if (typeof window !== "undefined") {
      const storageKey = `studyforward_p2_${selectedYear}_t${selectedTest}`;
      localStorage.removeItem(storageKey);
    }
    setPart2QuestionsStore({});
    setPart2Index(0);
    setPart2Selected(null);
    setPart2Revealed(false);
    setPart2InDictation(false);
    setPart2Stage(0);
    setPart2StageInputs({ 0: "", 1: "", 2: "", 3: "" });
    setPart2StageChecked({ 0: false, 1: false, 2: false, 3: false });
    setPart2StageHint(false);
    playEffectSound("click");
  };


  const handleSelectYear = (year: ToeicYear) => {
    setSelectedYear(year);
    setPart1Index(0);
    setPart1Selected(null);
    setPart1Revealed(false);
    setPart1DictationInput("");
    setPart1DictationChecked(false);
    setPart1ShowHint(false);

    setPart2Index(0);
    setPart2Selected(null);
    setPart2Revealed(false);
    setPart2ShowExplanation(false);
    setPart2InDictation(false);
    setPart2Stage(0);
    setPart2StageInputs({ 0: "", 1: "", 2: "", 3: "" });
    setPart2StageChecked({ 0: false, 1: false, 2: false, 3: false });
    setPart2StageHint(false);

    setPart3Answers({});
    setPart3Revealed(false);
    setPart4Index(0);
    setPart4Answers({});
    setPart4Revealed(false);
    playEffectSound("click");
  };

  const handleSelectTest = (tNum: number) => {
    setSelectedTest(tNum);
    setPart1Index(0);
    setPart1Selected(null);
    setPart1Revealed(false);
    setPart1DictationInput("");
    setPart1DictationChecked(false);
    setPart1ShowHint(false);

    setPart2Index(0);
    setPart2Selected(null);
    setPart2Revealed(false);
    setPart2InDictation(false);
    setPart2Stage(0);
    setPart2StageInputs({ 0: "", 1: "", 2: "", 3: "" });
    setPart2StageChecked({ 0: false, 1: false, 2: false, 3: false });
    setPart2StageHint(false);

    setPart3Answers({});
    setPart3Revealed(false);
    setPart4Index(0);
    setPart4Answers({});
    setPart4Revealed(false);
    playEffectSound("click");
  };


  const currentPartList =
    partNumber === 1
      ? PART1_DATA
      : partNumber === 2
      ? PART2_DATA
      : partNumber === 3
      ? PART3_DATA
      : PART4_DATA;
  const hasQuestions = currentPartList && currentPartList.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-subtle)" }}>
      {/* Top Header */}
      <header
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        className="sticky top-0 z-20 backdrop-blur-md w-full"
      >
        <div className="w-full px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span className="text-xl">🎓</span>
              <span className="font-bold text-sm hidden sm:inline" style={{ color: "var(--brand)" }}>
                StudyForward
              </span>
            </Link>

            <div className="h-4 w-px bg-[var(--border)] shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <Link
                href="/listening"
                className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm hover:bg-[var(--bg-card)] hover:border-blue-400 hover:text-blue-500 transition-all cursor-pointer shrink-0"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                title="Quay lại danh sách thư mục"
              >
                ←
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black" style={{ color: "var(--text-primary)" }}>
                  {partInfo.folderCode}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  ETS {selectedYear}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  Test {selectedTest < 10 ? `0${selectedTest}` : selectedTest}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl border text-xs cursor-pointer hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              title={soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            <LogoutButton />
            <ThemeToggle variant="subtle" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex-1 space-y-4">

        {/* Empty State when no questions */}
        {!hasQuestions && (
          <div
            className="p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-3xl border shadow-xs"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl">
              📂
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                Thư mục chưa có câu hỏi
              </h2>
              <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
                Bộ đề <strong>ETS {selectedYear} - Test {selectedTest < 10 ? `0${selectedTest}` : selectedTest} ({partInfo.folderCode}: {partInfo.title})</strong> hiện chưa có câu hỏi nào.
              </p>
            </div>
            <Link
              href="/listening"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all cursor-pointer mt-2"
            >
              ← Quay lại danh sách thư mục
            </Link>
          </div>
        )}

        {/* ======================================================== */}
        {/* PART 1 DRILL                                             */}
        {/* ======================================================== */}
        {partNumber === 1 && PART1_DATA[part1Index] && (
          <div className="card p-6 md:p-8 space-y-6 shadow-sm border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  PART 1 - CÂU {part1Index + 1}/{PART1_DATA.length}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  {PART1_DATA[part1Index].sceneTitle}
                </span>
              </div>
            </div>

            {/* Scenario Illustration */}
            <div
              className="p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-3 border"
              style={{
                background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05), rgba(59, 130, 246, 0.05))",
                borderColor: "var(--border)",
              }}
            >
              <span className="text-7xl">{PART1_DATA[part1Index].icon}</span>
              <div className="max-w-md">
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Bối cảnh bức tranh:
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {PART1_DATA[part1Index].sceneDescription}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullAudio = PART1_DATA[part1Index].options
                    .map((o) => `Option ${o.key}: ${o.text}`)
                    .join(". ");
                  speakText(fullAudio);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer mt-2"
              >
                <span>🔊</span>
                <span>Nghe cả 4 phương án (A, B, C, D)</span>
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase text-[var(--text-muted)]">
                Chọn phương án miêu tả đúng nhất bức tranh:
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {PART1_DATA[part1Index].options.map((opt) => {
                  const isSelected = part1Selected === opt.key;
                  const isRight = opt.isCorrect;
                  let badgeStyle = "border-[var(--border)] hover:border-purple-400 bg-[var(--bg-card)]";

                  if (part1Revealed) {
                    if (isRight) {
                      badgeStyle =
                        "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20";
                    } else if (isSelected && !isRight) {
                      badgeStyle = "bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400";
                    }
                  } else if (isSelected) {
                    badgeStyle = "bg-purple-600 text-white border-purple-500 ring-2 ring-purple-400/30";
                  }

                  return (
                    <div
                      key={opt.key}
                      onClick={() => {
                        if (!part1Revealed) setPart1Selected(opt.key);
                      }}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${badgeStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center bg-black/10 dark:bg-white/10">
                          {opt.key}
                        </span>
                        <div>
                          <div className="text-sm font-semibold">{opt.text}</div>
                          {part1Revealed && (
                            <div className="text-xs mt-0.5 opacity-80 italic">
                              {opt.translation}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(opt.text);
                        }}
                        className="w-8 h-8 rounded-full border flex items-center justify-center text-xs hover:bg-[var(--bg-subtle)] transition-all shrink-0 cursor-pointer"
                        style={{ borderColor: "var(--border)" }}
                        title="Nghe riêng phương án này"
                      >
                        🔊
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* PART 1 DICTATION                                         */}
            {/* ======================================================== */}
            {!part1Selected ? (
              <div
                className="p-4 rounded-2xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✍️</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <strong>Bước 2 (Chép chính tả):</strong> Hãy chọn 1 phương án miêu tả bức tranh (<strong>(A)</strong>, <strong>(B)</strong>, <strong>(C)</strong> hoặc <strong>(D)</strong>) ở trên để mở chế độ nghe & chép chính tả!
                  </span>
                </div>
                <span className="px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  Chờ bạn chọn đáp án...
                </span>
              </div>
            ) : (
              <div
                className="p-5 sm:p-6 rounded-2xl border space-y-4 animate-fade-up shadow-sm"
                style={{
                  background: "linear-gradient(180deg, rgba(147, 51, 234, 0.04) 0%, var(--bg-card) 100%)",
                  borderColor: "rgba(147, 51, 234, 0.35)",
                }}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md text-xs font-black bg-purple-600 text-white shadow-xs flex items-center gap-1.5">
                        <span>✍️</span>
                        <span>BƯỚC 2: CHÉP CHÍNH TẢ (DICTATION)</span>
                      </span>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        • Đang chép phương án ({part1Selected})
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Nghe lại phương án miêu tả bạn đã chọn và gõ chính xác từng từ tiếng Anh vào ô bên dưới.
                    </p>
                  </div>
                </div>

                {(() => {
                  const currOpt = PART1_DATA[part1Index].options.find((o) => o.key === part1Selected) || PART1_DATA[part1Index].options[0];
                  const targetText = currOpt.text;
                  const targetTrans = currOpt.translation;

                  return (
                    <div className="space-y-4">
                      {/* Audio Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => speakText(targetText, part1PlaybackSpeed)}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-102"
                          >
                            <span>🔊</span>
                            <span>Nghe câu cần chép (Phương án {currOpt.key})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => speakText(targetText, 0.75)}
                            className="px-3 py-2 rounded-xl border bg-[var(--bg-card)] text-xs font-bold hover:border-purple-400 transition-all cursor-pointer flex items-center gap-1.5"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          >
                            <span>🐢</span>
                            <span>Nghe chậm (0.75x)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[var(--text-muted)] mr-1">Tốc độ:</span>
                          {[0.75, 1.0, 1.25].map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => setPart1PlaybackSpeed(speed)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                part1PlaybackSpeed === speed
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-purple-400"
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hint row */}
                      {part1ShowHint && (
                        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-xs font-mono tracking-wider flex items-center justify-between text-amber-700 dark:text-amber-300">
                          <div>
                            <span className="font-bold mr-2">💡 Gợi ý chữ cái đầu:</span>
                            <span>{renderHint(targetText)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPart1ShowHint(false)}
                            className="text-xs hover:underline cursor-pointer opacity-70"
                          >
                            Ẩn
                          </button>
                        </div>
                      )}

                      {/* Text Input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={part1DictationInput}
                            onChange={(e) => {
                              setPart1DictationInput(e.target.value);
                              if (part1DictationChecked) setPart1DictationChecked(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (part1DictationInput.trim()) {
                                  setPart1DictationChecked(true);
                                  playEffectSound("click");
                                }
                              }
                            }}
                            placeholder="👉 Nghe và gõ lại câu miêu tả tiếng Anh bạn nghe được tại đây (sau đó bấm 'Kiểm tra chính tả')..."
                            className="w-full p-4 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none"
                            style={{
                              background: "var(--bg-card)",
                              borderColor: "var(--border)",
                              color: "var(--text-primary)",
                            }}
                          />
                          {part1DictationInput && (
                            <button
                              type="button"
                              onClick={() => {
                                setPart1DictationInput("");
                                setPart1DictationChecked(false);
                              }}
                              className="absolute top-3 right-3 text-xs opacity-50 hover:opacity-100 p-1 cursor-pointer"
                              title="Xóa nội dung"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!part1DictationInput.trim()}
                              onClick={() => {
                                setPart1DictationChecked(true);
                                playEffectSound("click");
                              }}
                              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                                part1DictationInput.trim()
                                  ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:scale-102"
                                  : "opacity-40 cursor-not-allowed bg-gray-400 text-white"
                              }`}
                            >
                              <span>🔍</span>
                              <span>Kiểm tra chính tả (Enter)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPart1ShowHint(!part1ShowHint)}
                              className="px-3.5 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer flex items-center gap-1.5"
                              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                            >
                              <span>💡</span>
                              <span>{part1ShowHint ? "Ẩn gợi ý" : "Gợi ý chữ đầu"}</span>
                            </button>
                          </div>

                          <div className="text-xs text-[var(--text-muted)] font-mono">
                            {part1DictationInput.trim() ? `${part1DictationInput.trim().split(/\s+/).length} từ đã gõ` : "0 từ"}
                          </div>
                        </div>
                      </div>

                      {/* Result Diff */}
                      {part1DictationChecked && (
                        <div className="p-4 sm:p-5 rounded-2xl border space-y-4 animate-fade-up" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                          {(() => {
                            const diff = computeDictationDiff(targetText, part1DictationInput);
                            const isPerfect = diff.accuracy === 100;
                            return (
                              <>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">{isPerfect ? "🏆" : diff.accuracy >= 75 ? "🌟" : "💪"}</span>
                                    <div>
                                      <div className="text-sm font-black flex items-center gap-2">
                                        <span className={isPerfect ? "text-emerald-600 dark:text-emerald-400" : diff.accuracy >= 75 ? "text-purple-600 dark:text-purple-400" : "text-amber-600 dark:text-amber-400"}>
                                          {diff.accuracy}% Chính xác ({diff.correctWords}/{diff.totalWords} từ)
                                        </span>
                                      </div>
                                      <div className="text-xs text-[var(--text-muted)]">
                                        {isPerfect ? "Tuyệt vời! Bạn chép chính xác 100% câu miêu tả tranh!" : diff.accuracy >= 75 ? "Rất tốt! Bạn nghe bắt âm rất chuẩn." : "Hãy nghe lại vài lần để nhận diện rõ từng từ nhé."}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => speakText(targetText, part1PlaybackSpeed)}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-[var(--bg-card)] transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                                  >
                                    <span>🔊</span>
                                    <span>Nghe lại câu chuẩn</span>
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">
                                    Đối chiếu chi tiết từng từ:
                                  </div>
                                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--bg-card)] border" style={{ borderColor: "var(--border)" }}>
                                    {diff.items.map((item, idx) => {
                                      if (item.status === "correct") {
                                        return (
                                          <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1"
                                          >
                                            <span>{item.expectedWord}</span>
                                            <span className="text-[10px]">✓</span>
                                          </span>
                                        );
                                      }
                                      if (item.status === "typo") {
                                        return (
                                          <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5"
                                          >
                                            <span className="line-through opacity-70">{item.userWord}</span>
                                            <span>➔</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 underline">{item.expectedWord}</span>
                                          </span>
                                        );
                                      }
                                      if (item.status === "missing") {
                                        return (
                                          <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 border-dashed inline-flex items-center gap-1"
                                          >
                                            <span className="opacity-60">+</span>
                                            <span>{item.expectedWord}</span>
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          key={idx}
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-500/15 text-gray-500 border border-gray-500/30 line-through"
                                        >
                                          {item.userWord}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t text-xs" style={{ borderColor: "var(--border)" }}>
                                  <div className="flex items-start gap-2">
                                    <span className="font-bold text-[var(--text-muted)] shrink-0 w-24">Bạn đã gõ:</span>
                                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{part1DictationInput}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0 w-24">Đáp án chuẩn:</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{targetText}</span>
                                  </div>
                                  {targetTrans && (
                                    <div className="flex items-start gap-2">
                                      <span className="font-bold text-[var(--text-muted)] shrink-0 w-24">Dịch nghĩa:</span>
                                      <span className="italic" style={{ color: "var(--text-secondary)" }}>{targetTrans}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Explanation box */}
            {part1Revealed && (
              <div className="p-4 rounded-xl border bg-purple-500/10 border-purple-500/30 space-y-1.5 animate-fade-up">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  💡 Giải thích chi tiết & Phân tích bẫy tranh:
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {PART1_DATA[part1Index].explanation}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                disabled={!part1Selected}
                onClick={() => {
                  setPart1Revealed(true);
                  const chosen = PART1_DATA[part1Index].options.find(
                    (o) => o.key === part1Selected
                  );
                  if (chosen?.isCorrect) playEffectSound("correct");
                  else playEffectSound("wrong");
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                  part1Selected
                    ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:scale-102"
                    : "opacity-40 cursor-not-allowed bg-gray-400 text-white"
                }`}
              >
                Kiểm tra đáp án
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = (part1Index + 1) % PART1_DATA.length;
                  goToPart1Question(next);
                }}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer flex items-center gap-1.5"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <span>Câu tiếp theo</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PART 2 DRILL                                             */}
        {partNumber === 2 && PART2_DATA[part2Index] && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* CỘT 1 (BÊN TRÁI - 7 COLS): SỐ CÂU HỎI, AUDIO, ĐÁP ÁN & DICTATION */}
            <div className="lg:col-span-7 card p-4 sm:p-5 space-y-4 shadow-sm border" style={{ borderColor: "var(--border)" }}>
            {/* Hidden audio element synced with custom player */}
            <audio
              ref={part2AudioRef}
              preload="auto"
              src={`/audio/part2/${PART2_DATA[part2Index]?.id}.mp3`}
              onPlay={() => setPart2AudioPlaying(true)}
              onPause={() => setPart2AudioPlaying(false)}
              onEnded={() => {
                setPart2AudioPlaying(false);
                setPart2AudioCurrentTime(0);
              }}
              onTimeUpdate={(e) => {
                setPart2AudioCurrentTime(e.currentTarget.currentTime);
              }}
              onLoadedMetadata={(e) => {
                setPart2AudioDuration(e.currentTarget.duration || 15);
                e.currentTarget.playbackRate = part2AudioSpeed;
              }}
              className="hidden"
            />

            {!part2InDictation ? (
              <>
                {/* Header info bar */}
                <div className="flex items-center pb-3 border-b border-[var(--border)]">
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 tracking-wider">
                    CÂU {part2Index + 7} / 31
                  </span>
                </div>

                {/* Custom Compact Audio Player */}
                <div
                  className="px-3.5 py-2 rounded-xl border transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, var(--bg-card) 100%)",
                    borderColor: "rgba(99, 102, 241, 0.2)",
                  }}
                >
                  {/* Player Scrubber & Controls */}
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={togglePart2PlayAudio}
                      className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center justify-center text-xs shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                      title={part2AudioPlaying ? "Tạm dừng" : "Phát âm thanh"}
                    >
                      {part2AudioPlaying ? "⏸" : "▶"}
                    </button>

                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium shrink-0 select-none">
                      {formatAudioTime(part2AudioCurrentTime)}
                    </span>

                    <input
                      type="range"
                      min={0}
                      max={part2AudioDuration || 15}
                      step={0.05}
                      value={part2AudioCurrentTime}
                      onChange={handlePart2AudioSeek}
                      className="flex-1 h-1.5 rounded-lg bg-[var(--bg-subtle)] appearance-none cursor-pointer accent-indigo-600"
                    />

                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium shrink-0 select-none">
                      {formatAudioTime(part2AudioDuration)}
                    </span>

                    {/* 3-dots Menu Button */}
                    <div className="relative" ref={part2AudioMenuRef}>
                      <button
                        type="button"
                        onClick={() => setPart2AudioMenuOpen((prev) => !prev)}
                        className={`w-7 h-7 rounded-lg hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-all cursor-pointer ${
                          part2AudioMenuOpen
                            ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                            : "text-[var(--text-secondary)] hover:text-blue-600"
                        } shrink-0`}
                        title="Tùy chọn audio"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {part2AudioMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Tùy chọn phát
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              restartPart2Audio();
                              setPart2AudioMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="text-sm font-bold">↺</span>
                              <span>Phát lại từ đầu</span>
                            </span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-muted)] shadow-2xs">
                              Ctrl
                            </kbd>
                          </button>

                          <div className="my-1.5 border-t border-[var(--border)]" />

                          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Tốc độ phát
                          </div>

                          <div className="space-y-0.5 mt-1">
                            {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                              <button
                                key={spd}
                                type="button"
                                onClick={() => {
                                  setPart2AudioSpeed(spd);
                                  if (part2AudioRef.current) part2AudioRef.current.playbackRate = spd;
                                  setPart2AudioMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                  part2AudioSpeed === spd
                                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <span>{spd === 1.0 ? "1.0x (Chuẩn)" : `${spd}x`}</span>
                                {part2AudioSpeed === spd && <span className="text-xs font-bold">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answer Options A, B, C */}
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">
                    Chọn phương án bạn nghe được:
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {PART2_DATA[part2Index].options.map((opt) => {
                      const isSelected = part2Selected === opt.key;
                      const isRight = opt.isCorrect;

                      let cardStyle = "border-[var(--border)] bg-[var(--bg-card)] hover:border-indigo-400/80 hover:bg-indigo-50/20";
                      let badgeStyle = "bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)]";

                      if (part2Revealed) {
                        if (isRight) {
                          cardStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20";
                          badgeStyle = "bg-emerald-600 text-white border-emerald-600 font-black";
                        } else if (isSelected && !isRight) {
                          cardStyle = "bg-rose-500/10 border-rose-500/50 text-rose-700 dark:text-rose-300";
                          badgeStyle = "bg-rose-500 text-white border-rose-500 font-black";
                        }
                      } else if (isSelected) {
                        cardStyle = "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs";
                        badgeStyle = "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black";
                      }

                      return (
                        <div
                          key={opt.key}
                          onClick={() => {
                            if (!part2Revealed) {
                              setPart2Selected(opt.key);
                              setPart2Revealed(true);
                              if (opt.isCorrect) playEffectSound("correct");
                              else playEffectSound("wrong");
                            }
                          }}
                          className={`py-3 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center transition-all shrink-0 ${badgeStyle}`}>
                              {opt.key}
                            </span>
                            {part2Revealed && (
                              <div className="space-y-0.5">
                                <div className="text-sm font-semibold flex items-center gap-2">
                                  <span>{opt.text}</span>
                                  {isRight && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      ✓ Đáp án đúng
                                    </span>
                                  )}
                                  {isSelected && !isRight && (
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      ✕ Bạn đã chọn
                                    </span>
                                  )}
                                </div>
                                {opt.translation && (
                                  <div className="text-xs italic text-[var(--text-secondary)]">
                                    {opt.translation}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {part2Revealed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakText(opt.text, part2PlaybackSpeed);
                              }}
                              className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs hover:text-blue-600 hover:bg-[var(--bg-subtle)] transition-all shrink-0 cursor-pointer"
                              style={{ borderColor: "var(--border)" }}
                              title="Nghe lại đáp án này"
                            >
                              🔊
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions for Step 1 */}
                <div className="flex items-center justify-between pt-4 border-t gap-3 flex-wrap" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={part2Index === 0}
                      onClick={() => goToPart2Question(Math.max(0, part2Index - 1))}
                      className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      <span>←</span>
                      <span>Câu trước</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = (part2Index + 1) % PART2_DATA.length;
                        goToPart2Question(next);
                      }}
                      className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer flex items-center gap-1.5"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      <span>Câu tiếp theo</span>
                      <span>➔</span>
                    </button>
                  </div>

                  {!part2Revealed ? (
                    <button
                      type="button"
                      disabled={!part2Selected}
                      onClick={() => {
                        if (part2Selected) {
                          setPart2Revealed(true);
                          const chosen = PART2_DATA[part2Index].options.find((o) => o.key === part2Selected);
                          if (chosen?.isCorrect) playEffectSound("correct");
                          else playEffectSound("wrong");
                        }
                      }}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                        part2Selected
                          ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)] cursor-pointer hover:scale-102"
                          : "opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      Kiểm tra đáp án
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPart2InDictation(true);
                        playEffectSound("click");
                      }}
                      className="px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer hover:scale-102 flex items-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
                    >
                      <span>Tiếp tục: Chép chính tả (Dictation) ➔</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* BƯỚC 2: CHÉP CHÍNH TẢ TOÀN BỘ (CÂU HỎI & 3 ĐÁP ÁN) */
              <div
                className="p-3 sm:p-4 rounded-xl border space-y-3 animate-fade-up shadow-sm"
                style={{
                  background: "linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, var(--bg-card) 100%)",
                  borderColor: "rgba(99, 102, 241, 0.2)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPart2InDictation(false);
                        playEffectSound("click");
                      }}
                      className="w-7 h-7 rounded-lg border text-xs font-bold bg-[var(--bg-card)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-indigo-600 transition-all cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
                      style={{ borderColor: "var(--border)" }}
                      title="Quay lại câu chọn đáp án (Bước 1)"
                    >
                      <span className="font-extrabold text-sm leading-none">←</span>
                    </button>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs flex items-center gap-1.5">
                      <span className="text-amber-500">⚡</span>
                      <span>BƯỚC 2: CHÉP CHÍNH TẢ (DICTATION)</span>
                    </span>
                  </div>
                </div>

                {/* Master Audio Player with Running Scrubber */}
                <div
                  className="px-3 py-1.5 rounded-xl border transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, var(--bg-card) 100%)",
                    borderColor: "rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={togglePart2PlayAudio}
                      className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center justify-center text-[11px] shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                      title={part2AudioPlaying ? "Tạm dừng" : "Phát âm thanh"}
                    >
                      {part2AudioPlaying ? "⏸" : "▶"}
                    </button>

                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium shrink-0 select-none">
                      {formatAudioTime(part2AudioCurrentTime)}
                    </span>

                    <input
                      type="range"
                      min={0}
                      max={part2AudioDuration || 15}
                      step={0.05}
                      value={part2AudioCurrentTime}
                      onChange={handlePart2AudioSeek}
                      className="flex-1 h-1.5 rounded-lg bg-[var(--bg-subtle)] appearance-none cursor-pointer accent-indigo-600"
                    />

                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium shrink-0 select-none">
                      {formatAudioTime(part2AudioDuration)}
                    </span>

                    {/* 3-dots Menu Button */}
                    <div className="relative" ref={part2AudioMenuRef}>
                      <button
                        type="button"
                        onClick={() => setPart2AudioMenuOpen((prev) => !prev)}
                        className={`w-7 h-7 rounded-lg hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-all cursor-pointer ${
                          part2AudioMenuOpen
                            ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                            : "text-[var(--text-secondary)] hover:text-blue-600"
                        } shrink-0`}
                        title="Tùy chọn audio"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {part2AudioMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Tùy chọn phát
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              restartPart2Audio();
                              setPart2AudioMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="text-sm font-bold">↺</span>
                              <span>Phát lại từ đầu</span>
                            </span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-muted)] shadow-2xs">
                              Ctrl
                            </kbd>
                          </button>

                          <div className="my-1.5 border-t border-[var(--border)]" />

                          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Tốc độ phát
                          </div>

                          <div className="space-y-0.5 mt-1">
                            {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                              <button
                                key={spd}
                                type="button"
                                onClick={() => {
                                  setPart2AudioSpeed(spd);
                                  setPart2PlaybackSpeed(spd);
                                  if (part2AudioRef.current) part2AudioRef.current.playbackRate = spd;
                                  setPart2AudioMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                  part2AudioSpeed === spd
                                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <span>{spd === 1.0 ? "1.0x (Chuẩn)" : `${spd}x`}</span>
                                {part2AudioSpeed === spd && <span className="text-xs font-bold">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progressive Sequential Dictation (Question -> Option A -> Option B -> Option C) */}
                {(() => {
                  const currQ = PART2_DATA[part2Index];
                  const optA = currQ.options.find((o) => o.key === "A") || currQ.options[0];
                  const optB = currQ.options.find((o) => o.key === "B") || currQ.options[1];
                  const optC = currQ.options.find((o) => o.key === "C") || currQ.options[2];

                  const stages = [
                    {
                      step: 0,
                      badge: "🎯 CÂU HỎI",
                      title: "Câu hỏi phản xạ",
                      shortTitle: "Câu hỏi",
                      targetText: currQ.questionAudio,
                      translation: currQ.questionTranslation,
                      placeholder: "👉 Nghe và gõ lại câu hỏi bạn nghe được... (phím Ctrl để đọc lại)",
                      nextLabel: "Tiếp theo ➔",
                      isCorrect: undefined,
                    },
                    {
                      step: 1,
                      badge: "A.",
                      title: "Lựa chọn (A)",
                      shortTitle: "A.",
                      targetText: optA.text,
                      translation: optA.translation,
                      placeholder: "👉 Nghe và gõ lại đáp án (A)... (phím Ctrl để đọc lại)",
                      nextLabel: "Tiếp theo ➔",
                      isCorrect: optA.isCorrect,
                    },
                    {
                      step: 2,
                      badge: "B.",
                      title: "Lựa chọn (B)",
                      shortTitle: "B.",
                      targetText: optB.text,
                      translation: optB.translation,
                      placeholder: "👉 Nghe và gõ lại đáp án (B)... (phím Ctrl để đọc lại)",
                      nextLabel: "Tiếp theo ➔",
                      isCorrect: optB.isCorrect,
                    },
                    {
                      step: 3,
                      badge: "C.",
                      title: "Lựa chọn (C)",
                      shortTitle: "C.",
                      targetText: optC.text,
                      translation: optC.translation,
                      placeholder: "👉 Nghe và gõ lại đáp án (C)... (phím Ctrl để đọc lại)",
                      nextLabel: part2Index < PART2_DATA.length - 1 ? "Tiếp theo ➔" : "Hoàn thành bài luyện 🎉",
                      isCorrect: optC.isCorrect,
                    },
                  ];

                  const currentStage = stages[part2Stage];
                  const currentVal = part2StageInputs[part2Stage] || "";
                  const isChecked = !!part2StageChecked[part2Stage];
                  const diff = isChecked ? computeDictationDiff(currentStage.targetText, currentVal) : null;

                  return (
                    <div className="space-y-3.5">
                      {/* Previously Completed Stages Summary */}
                      {stages.filter((st) => st.step < part2Stage && part2StageChecked[st.step]).length > 0 && (
                        <div className="px-3.5 py-2 rounded-xl border bg-[var(--bg-card)] space-y-1.5 text-xs sm:text-sm" style={{ borderColor: "var(--border)" }}>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Nội dung đã chép xong:
                          </div>
                          <div className="space-y-1.5">
                            {stages
                              .filter((st) => st.step < part2Stage && part2StageChecked[st.step])
                              .map((st) => (
                                <div key={st.step} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-black text-xs text-blue-600 shrink-0">{st.badge}</span>
                                    <span className="font-semibold text-xs sm:text-sm truncate" style={{ color: "var(--text-primary)" }}>{st.targetText}</span>
                                    {st.isCorrect && (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                                        ✓ Đáp án đúng
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => speakText(st.targetText, part2PlaybackSpeed)}
                                    className="w-6 h-6 rounded-md border flex items-center justify-center text-[11px] hover:text-blue-600 cursor-pointer shrink-0"
                                    style={{ borderColor: "var(--border)" }}
                                    title="Nghe lại"
                                  >
                                    🔊
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Active Stage Dictation Card */}
                      <div
                        className="p-4 sm:p-5 rounded-xl border bg-[var(--bg-card)] space-y-3 transition-all shadow-xs"
                        style={{ borderColor: "rgba(99, 102, 241, 0.2)" }}
                      >
                        {/* Active Stage Header & Action Tools */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {part2Stage === 0 ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs flex items-center gap-1.5">
                                <span>🎯</span>
                                <span>CÂU HỎI</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-2xs min-w-[28px] text-center">
                                {currentStage.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPart2StageHint((prev) => !prev)}
                              className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                part2StageHint
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60"
                              }`}
                              title="Xem gợi ý chữ cái đầu"
                            >
                              <span>💡</span>
                              <span>{part2StageHint ? "Ẩn gợi ý" : "Gợi ý"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Hint Box */}
                        {part2StageHint && (
                          <div className="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-xs sm:text-sm font-mono text-amber-800 dark:text-amber-300 animate-fade-in">
                            <span className="font-bold mr-1.5">Gợi ý chữ cái đầu:</span>
                            <span>{renderHint(currentStage.targetText)}</span>
                          </div>
                        )}

                        {/* Text Input for Current Stage */}
                        <div className="relative">
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => {
                              const text = e.target.value;
                              setPart2StageInputs((prev) => ({ ...prev, [part2Stage]: text }));
                              if (isChecked) {
                                setPart2StageChecked((prev) => ({ ...prev, [part2Stage]: false }));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!isChecked) {
                                  setPart2StageChecked((prev) => ({ ...prev, [part2Stage]: true }));
                                  playEffectSound("click");
                                } else if (part2Stage < 3) {
                                  setPart2Stage(part2Stage + 1);
                                  setPart2StageHint(false);
                                  playEffectSound("click");
                                } else {
                                  if (part2Index < PART2_DATA.length - 1) {
                                    goToPart2Question(part2Index + 1, false);
                                  }
                                }
                              }
                            }}
                            placeholder={currentStage.placeholder}
                            className="w-full px-3.5 py-2.5 rounded-xl border text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all bg-[var(--bg-subtle)]"
                            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                            autoFocus
                          />
                          {currentVal && (
                            <button
                              type="button"
                              onClick={() => {
                                setPart2StageInputs((prev) => ({ ...prev, [part2Stage]: "" }));
                                setPart2StageChecked((prev) => ({ ...prev, [part2Stage]: false }));
                              }}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs opacity-40 hover:opacity-100 cursor-pointer"
                              title="Xóa nội dung"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Senior UX: Clear, readable diff & answer results */}
                        {diff && (
                          <div className="pt-2.5 border-t border-[var(--border)] space-y-2 text-xs sm:text-sm animate-fade-up">
                            <div
                              className="p-3 sm:p-3.5 rounded-xl border bg-[var(--bg-subtle)] space-y-2.5 text-xs sm:text-sm"
                              style={{ borderColor: "var(--border)" }}
                            >
                              {/* Visual Word-by-Word Sentence Alignment */}
                              <div className="leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm">
                                {diff.items.map((it, idx) => {
                                  if (it.status === "correct") {
                                    return (
                                      <span
                                        key={idx}
                                        className="font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base"
                                      >
                                        {it.expectedWord}
                                      </span>
                                    );
                                  }
                                  if (it.status === "missing") {
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold"
                                        title="Từ này bạn bị thiếu"
                                      >
                                        <span>+{it.expectedWord}</span>
                                        <span className="text-[10px] sm:text-[11px] opacity-75 font-normal">(thiếu)</span>
                                      </span>
                                    );
                                  }
                                  if (it.status === "extra") {
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/30 text-slate-500 line-through text-xs sm:text-sm"
                                        title="Từ bạn gõ thừa"
                                      >
                                        <span>{it.userWord}</span>
                                        <span className="text-[10px] sm:text-[11px]">(thừa)</span>
                                      </span>
                                    );
                                  }
                                  // Typo / Wrong substitution: show userWord in red crossed out -> expectedWord in bold green
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs sm:text-sm"
                                      title={`Bạn gõ "${it.userWord}", từ đúng là "${it.expectedWord}"`}
                                    >
                                      <span className="line-through text-rose-600 dark:text-rose-400 font-bold">{it.userWord}</span>
                                      <span className="text-slate-400 font-bold">➔</span>
                                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{it.expectedWord}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Standard Sentence & Translation */}
                              <div className="pt-2.5 border-t flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
                                <div className="flex items-start gap-2">
                                  <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 text-xs sm:text-sm">Đáp án chuẩn:</span>
                                  <span className="font-bold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>{currentStage.targetText}</span>
                                </div>
                                {currentStage.translation && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-bold text-[var(--text-muted)] shrink-0 text-xs sm:text-sm">Dịch nghĩa:</span>
                                    <span className="italic text-xs sm:text-sm text-[var(--text-secondary)]">{currentStage.translation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Check OR (Làm lại [Left] & Tiếp tục [Right]) */}
                        <div ref={part2ActionButtonsRef} className="flex flex-wrap items-center justify-between gap-3 pt-1.5">
                          {!isChecked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPart2StageChecked((prev) => ({ ...prev, [part2Stage]: true }));
                                playEffectSound("click");
                              }}
                              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(79,70,229,0.35)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] flex items-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98"
                            >
                              <span>🔍</span>
                              <span>Kiểm tra</span>
                            </button>
                          ) : (
                            <>
                              {/* Vị trí ô đỏ: Làm lại ở góc trái bên dưới */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPart2StageChecked((prev) => ({ ...prev, [part2Stage]: false }));
                                }}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer bg-[var(--bg-card)] shadow-2xs"
                              >
                                Làm lại
                              </button>

                              {/* Vị trí ô vàng: Tiếp tục ở góc phải bên dưới */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (part2Stage < 3) {
                                    setPart2Stage(part2Stage + 1);
                                    setPart2StageHint(false);
                                    playEffectSound("click");
                                  } else {
                                    if (part2Index < PART2_DATA.length - 1) {
                                      goToPart2Question(part2Index + 1, false);
                                    }
                                  }
                                }}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.45)] flex items-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98 ml-auto"
                              >
                                <span>{part2Stage === 3 && part2Index < PART2_DATA.length - 1 ? "Câu tiếp theo ➔" : currentStage.nextLabel}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

            {/* ---------------------------------------------------- */}
            {/* CỘT 2 (BÊN PHẢI - 5 COLS):                           */}
            {/* ĐÁP ÁN ĐÚNG, TRANSCRIPT SONG NGỮ, TỪ VỰNG, COLLOCATIONS */}
            {/* ---------------------------------------------------- */}
            <div
              className="lg:col-span-5 card p-5 sm:p-6 space-y-5 shadow-sm border lg:sticky lg:top-20 max-h-[calc(100vh-5rem)] overflow-y-auto"
              style={{ borderColor: "var(--border)" }}
            >
              {(() => {
                const currQ = PART2_DATA[part2Index];
                const studyData = getPart2StudyDetails(currQ.id);

                return (
                  <>
                    {/* Header Cột 2 */}
                    <div className="flex items-center justify-between pb-3 border-b gap-2 flex-wrap" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📖</span>
                        <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                          Phân tích câu {part2Index + 7}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Button hiển thị số câu đang làm: Chỉ icon số câu hình tròn */}
                        <button
                          type="button"
                          onClick={() => setPart2ShowQuestionPalette(!part2ShowQuestionPalette)}
                          className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0 ${
                            part2ShowQuestionPalette
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                          }`}
                          title={part2ShowQuestionPalette ? "Đóng danh sách câu hỏi" : `Câu ${part2Index + 7} / 31 (Bấm để chọn câu khác)`}
                        >
                          {part2Index + 7 < 10 ? `0${part2Index + 7}` : part2Index + 7}
                        </button>

                        {/* Nút Ẩn/Hiện giải thích */}
                        <button
                          type="button"
                          onClick={() => setPart2ShowExplanation(!part2ShowExplanation)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-102 active:scale-98 ${
                            part2ShowExplanation
                              ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60"
                          }`}
                          title={part2ShowExplanation ? "Ẩn giải thích chi tiết" : "Mở giải thích chi tiết"}
                        >
                          <span>{part2ShowExplanation ? "🔒 Ẩn giải thích" : "👁️ Mở giải thích"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Danh sách 25 câu hỏi khi được mở */}
                    {part2ShowQuestionPalette && (
                      <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5 animate-fade-down shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider">
                            Chọn nhanh câu hỏi (07 - 31):
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            Đang làm: Câu {part2Index + 7}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PART2_DATA.map((_, idx) => {
                            const qNum = idx + 7;
                            const isCurrent = part2Index === idx;
                            const isDone = !!part2QuestionsStore[idx]?.stageChecked?.[3];
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  goToPart2Question(idx);
                                  setPart2ShowQuestionPalette(false);
                                }}
                                className={`w-9 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                                  isCurrent
                                    ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/50 scale-105 font-black"
                                    : isDone
                                    ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                    : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-indigo-400 hover:text-indigo-600"
                                }`}
                                title={isDone ? `Câu ${qNum} (Đã chép xong)` : `Câu ${qNum}`}
                              >
                                <span>{qNum < 10 ? `0${qNum}` : qNum}</span>
                                {isDone && !isCurrent && <span className="text-[9px] text-emerald-600">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Reset / Clear Progress Option */}
                        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-muted)] font-medium">
                            Đã xong: <strong className="text-emerald-600">{Object.values(part2QuestionsStore).filter((q) => q.stageChecked?.[3]).length}</strong>/{PART2_DATA.length} câu
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Bạn có chắc chắn muốn xóa bài làm và chép lại từ đầu không?")) {
                                resetPart2Progress();
                                setPart2ShowQuestionPalette(false);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer"
                          >
                            Làm lại từ đầu ↺
                          </button>
                        </div>
                      </div>
                    )}

                    {/* KHỐI GIẢI THÍCH CHI TIẾT (Được điều khiển bởi nút Ẩn/Hiện giải thích) */}
                    {part2ShowExplanation && (
                      <div className="space-y-5 animate-fade-in">
                        {/* 2. KHỐI TRANSCRIPT TOÀN BỘ CÂU HỎI & 3 ĐÁP ÁN */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
                        <span>📜</span>
                        <span>Transcript & Bản dịch song ngữ:</span>
                      </div>
                      <div className="space-y-2 p-3 rounded-2xl bg-[var(--bg-subtle)] border text-xs" style={{ borderColor: "var(--border)" }}>
                        {/* Question */}
                        <div className="pb-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">
                              Câu {part2Index + 7}: {currQ.questionAudio}
                            </span>
                            <button
                              type="button"
                              onClick={() => speakText(currQ.questionAudio)}
                              className="w-6 h-6 rounded-md border flex items-center justify-center text-[10px] shrink-0 hover:bg-[var(--bg-card)] cursor-pointer"
                              style={{ borderColor: "var(--border)" }}
                              title="Nghe câu hỏi"
                            >
                              🔊
                            </button>
                          </div>
                          <div className="text-[11px] italic text-[var(--text-muted)] mt-0.5">
                            ➔ Dịch: {currQ.questionTranslation}
                          </div>
                        </div>

                        {/* Options A, B, C */}
                        {currQ.options.map((opt) => (
                          <div
                            key={opt.key}
                            className={`p-2.5 rounded-xl transition-all ${
                              opt.isCorrect
                                ? "bg-emerald-500/10 border border-emerald-500/30 shadow-xs"
                                : "hover:bg-[var(--bg-card)] border border-transparent"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                                  opt.isCorrect ? "bg-emerald-600 text-white" : "bg-black/10 dark:bg-white/10"
                                }`}>
                                  {opt.key}
                                </span>
                                <span className={`font-semibold ${opt.isCorrect ? "text-emerald-700 dark:text-emerald-300 font-bold" : ""}`}>
                                  {opt.text}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {opt.isCorrect && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-xs">
                                    Đúng
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => speakText(opt.text)}
                                  className="w-6 h-6 rounded-md border flex items-center justify-center text-[10px] hover:bg-[var(--bg-card)] cursor-pointer"
                                  style={{ borderColor: "var(--border)" }}
                                  title={`Nghe phương án ${opt.key}`}
                                >
                                  🔊
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] italic text-[var(--text-muted)] ml-7 mt-0.5">
                              ➔ Dịch: {opt.translation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. KHỐI TỪ VỰNG TRỌNG TÂM (VOCABULARY) */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
                        <span>📚</span>
                        <span>Từ vựng trọng tâm (Vocabulary):</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {studyData.vocabulary.map((vocab, vIdx) => (
                          <div
                            key={vIdx}
                            className="p-2.5 rounded-xl border bg-[var(--bg-card)] flex items-start justify-between gap-2 text-xs hover:border-blue-300 transition-all"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                  {vocab.word}
                                </span>
                                {vocab.pos && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    {vocab.pos}
                                  </span>
                                )}
                                {vocab.phonetic && (
                                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                    {vocab.phonetic}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                                {vocab.meaning}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => speakText(vocab.word)}
                              className="w-6 h-6 rounded-md border flex items-center justify-center text-[10px] shrink-0 hover:bg-[var(--bg-subtle)] cursor-pointer"
                              style={{ borderColor: "var(--border)" }}
                              title={`Nghe phát âm: ${vocab.word}`}
                            >
                              🔊
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. KHỐI CÁC CỤM TỪ ĂN ĐIỂM (COLLOCATIONS) */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
                        <span>🔗</span>
                        <span>Cụm từ & Collocations TOEIC:</span>
                      </div>
                      <div className="space-y-2">
                        {studyData.collocations.map((colloc, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2.5 rounded-xl border bg-amber-500/5 border-amber-500/20 text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-amber-700 dark:text-amber-300">
                                ✦ {colloc.phrase}
                              </span>
                              <button
                                type="button"
                                onClick={() => speakText(colloc.phrase)}
                                className="w-5 h-5 rounded-md border border-amber-500/30 flex items-center justify-center text-[9px] shrink-0 hover:bg-amber-500/15 cursor-pointer"
                                title={`Nghe cụm từ: ${colloc.phrase}`}
                              >
                                🔊
                              </button>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              ➔ {colloc.meaning}
                            </div>
                            {colloc.note && (
                              <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 italic">
                                💡 {colloc.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5. KHỐI GIẢI THÍCH CHI TIẾT & BẪY PART 2 */}
                    <div className="p-3.5 rounded-2xl border bg-blue-500/5 border-blue-500/20 space-y-2 text-xs">
                      <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>Giải thích đáp án & Nhận diện bẫy:</span>
                      </div>
                      <div className="leading-relaxed" style={{ color: "var(--text-primary)" }}>
                        {currQ.explanation}
                      </div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 pt-1.5 border-t border-amber-500/20">
                        ⚠️ Lưu ý bẫy: {currQ.trapNote}
                      </div>
                    </div>
                  </div>
                )}
              </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PART 3 DRILL                                             */}
        {/* ======================================================== */}
        {partNumber === 3 && PART3_DATA[0] && (
          <div className="card p-6 md:p-8 space-y-6 shadow-sm border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  PART 3 - ĐOẠN HỘI THOẠI (3 CÂU HỎI)
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  {PART3_DATA[0].scenario}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullDialogue = PART3_DATA[0].audioDialogue
                    .map((d) => `${d.speaker} says: ${d.text}`)
                    .join(". ");
                  speakText(fullDialogue);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>🔊</span>
                <span>Phát hội thoại</span>
              </button>
            </div>

            <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
              {PART3_DATA[0].title}
            </h2>

            {/* Script collapsible */}
            <div className="p-4 rounded-xl border bg-[var(--bg-subtle)] space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">
                  LỜI THOẠI HỘI THOẠI (TRANSCRIPT):
                </span>
                <button
                  type="button"
                  onClick={() => setPart3Revealed(!part3Revealed)}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  {part3Revealed ? "Ẩn transcript" : "👁️ Xem toàn bộ lời thoại"}
                </button>
              </div>

              {part3Revealed && (
                <div className="space-y-2.5 pt-2 border-t text-xs leading-relaxed animate-fade-up" style={{ borderColor: "var(--border)" }}>
                  {PART3_DATA[0].audioDialogue.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="font-bold text-indigo-600 shrink-0">{item.speaker}:</span>
                      <div>
                        <span style={{ color: "var(--text-primary)" }}>{item.text}</span>
                        <div className="text-[11px] italic mt-0.5 opacity-80" style={{ color: "var(--text-muted)" }}>
                          ({item.vi})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3 Questions */}
            <div className="space-y-6">
              {PART3_DATA[0].questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-2.5 p-4 rounded-xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <span className="w-6 h-6 rounded-md bg-indigo-500/15 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                      {qIdx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = part3Answers[qIdx] === opt.key;
                      const isRight = opt.isCorrect;
                      let badge = "border-[var(--border)] hover:border-indigo-400 bg-[var(--bg-subtle)]";

                      if (part3Revealed) {
                        if (isRight) badge = "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 font-bold";
                        else if (isSelected && !isRight) badge = "bg-rose-500/15 border-rose-500/50 text-rose-600";
                      } else if (isSelected) {
                        badge = "bg-indigo-600 text-white border-indigo-600 font-bold";
                      }

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            if (!part3Revealed) {
                              setPart3Answers((prev) => ({ ...prev, [qIdx]: opt.key }));
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2.5 transition-all cursor-pointer ${badge}`}
                        >
                          <span className="w-5 h-5 rounded-md flex items-center justify-center font-black bg-black/10 dark:bg-white/10 shrink-0">
                            {opt.key}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {part3Revealed && (
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 pt-1.5 border-t border-indigo-500/15">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  setPart3Revealed(true);
                  let correctCount = 0;
                  PART3_DATA[0].questions.forEach((q, qIdx) => {
                    const correctOpt = q.options.find((o) => o.isCorrect);
                    if (part3Answers[qIdx] === correctOpt?.key) correctCount++;
                  });
                  if (correctCount >= 2) playEffectSound("correct");
                  else playEffectSound("wrong");
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition-all hover:scale-102"
              >
                Kiểm tra đáp án & Dẫn chứng
              </button>

              <button
                type="button"
                onClick={() => {
                  setPart3Answers({});
                  setPart3Revealed(false);
                }}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer flex items-center gap-1.5"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <span>Làm lại đoạn này</span>
                <span>🔄</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PART 4 DRILL                                             */}
        {/* ======================================================== */}
        {partNumber === 4 && PART4_DATA[part4Index] && (
          <div className="card p-6 md:p-8 space-y-6 shadow-sm border" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  PART 4 - BÀI {part4Index + 1}/{PART4_DATA.length}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  {PART4_DATA[part4Index].category}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullMonologue = PART4_DATA[part4Index].audioMonologue
                    .map((m) => m.text)
                    .join(". ");
                  speakText(fullMonologue);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>📢</span>
                <span>Phát bài nói Part 4</span>
              </button>
            </div>

            <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
              {PART4_DATA[part4Index].title}
            </h2>

            {/* Script collapsible */}
            <div className="p-4 rounded-xl border bg-[var(--bg-subtle)] space-y-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">
                  LỜI THOẠI BÀI NÓI (SCRIPT):
                </span>
                <button
                  type="button"
                  onClick={() => setPart4Revealed(!part4Revealed)}
                  className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  {part4Revealed ? "Ẩn script" : "👁️ Xem toàn bộ lời thoại"}
                </button>
              </div>

              {part4Revealed && (
                <div className="space-y-2.5 pt-2 border-t text-xs leading-relaxed animate-fade-up" style={{ borderColor: "var(--border)" }}>
                  {PART4_DATA[part4Index].audioMonologue.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div style={{ color: "var(--text-primary)" }}>{item.text}</div>
                      <div className="text-[11px] italic opacity-80" style={{ color: "var(--text-muted)" }}>
                        ({item.vi})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3 Questions */}
            <div className="space-y-6">
              {PART4_DATA[part4Index].questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-2.5 p-4 rounded-xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <span className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 flex items-center justify-center text-xs font-black shrink-0">
                      {qIdx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = part4Answers[qIdx] === opt.key;
                      const isRight = opt.isCorrect;
                      let badge = "border-[var(--border)] hover:border-amber-400 bg-[var(--bg-subtle)]";

                      if (part4Revealed) {
                        if (isRight) badge = "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 font-bold";
                        else if (isSelected && !isRight) badge = "bg-rose-500/15 border-rose-500/50 text-rose-600";
                      } else if (isSelected) {
                        badge = "bg-amber-600 text-white border-amber-600 font-bold";
                      }

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            if (!part4Revealed) {
                              setPart4Answers((prev) => ({ ...prev, [qIdx]: opt.key }));
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2.5 transition-all cursor-pointer ${badge}`}
                        >
                          <span className="w-5 h-5 rounded-md flex items-center justify-center font-black bg-black/10 dark:bg-white/10 shrink-0">
                            {opt.key}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {part4Revealed && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 pt-1.5 border-t border-amber-500/15">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  setPart4Revealed(true);
                  let correctCount = 0;
                  PART4_DATA[part4Index].questions.forEach((q, qIdx) => {
                    const correctOpt = q.options.find((o) => o.isCorrect);
                    if (part4Answers[qIdx] === correctOpt?.key) correctCount++;
                  });
                  if (correctCount >= 2) playEffectSound("correct");
                  else playEffectSound("wrong");
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer transition-all hover:scale-102"
              >
                Kiểm tra đáp án & Dẫn chứng
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = (part4Index + 1) % PART4_DATA.length;
                  setPart4Index(next);
                  setPart4Answers({});
                  setPart4Revealed(false);
                }}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer flex items-center gap-1.5"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <span>Bài tiếp</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

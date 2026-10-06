"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { Select } from "@/components/ui/Select";
import {
  getFarmStars,
  addFarmStars,
} from "@/lib/farmSystem";
import {
  SpacedWordItem,
  SPACING_INTERVALS,
  getNextSpacedStep,
  SPACED_REPETITION_PRESET_WORDS,
  analyzeWordStructure,
  recordWordProgressToDb,
  isDueForReview,
  buildSpacedWordPool,
  getTodayKey,
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

// ==========================================
// Web Audio API Sound Effects (Zero-latency)
// ==========================================
function playEffectSound(type: "correct" | "wrong" | "victory" | "click" | "flip", enabled: boolean = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
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
    } else if (type === "click" || type === "flip") {
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
    // Ignore audio error
  }
}

// ==========================================
// GAME 1: MATCH PAIRS (GHÉP CẶP THẺ)
// ==========================================
interface MatchCard {
  id: string;
  wordId: string;
  type: "en" | "vi";
  text: string;
  subText?: string;
  rawWord?: string;
  isMatched: boolean;
}

function MatchPairsGame({
  wordPool,
  soundEnabled,
  onSpeech,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [wrongCards, setWrongCards] = useState<string[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRoundWon, setIsRoundWon] = useState(false);

  const [pairsPerRound, setPairsPerRound] = useState<4 | 6 | 8>(6);
  const totalRounds = Math.max(1, Math.ceil(wordPool.length / pairsPerRound));

  const startNewRound = useCallback(
    (roundNum: number, currentPairsCount: number = pairsPerRound) => {
      if (wordPool.length === 0) return;
      const startIndex = ((roundNum - 1) * currentPairsCount) % wordPool.length;
      let roundWords = wordPool.slice(startIndex, startIndex + currentPairsCount);
      if (roundWords.length < currentPairsCount && wordPool.length >= currentPairsCount) {
        roundWords = [...roundWords, ...wordPool.slice(0, currentPairsCount - roundWords.length)];
      }

      const generated: MatchCard[] = [];
      roundWords.forEach((item, idx) => {
        const itemAnalysis = analyzeWordStructure(item.word);
        generated.push({
          id: `en-${item.id}-${idx}`,
          wordId: item.id,
          type: "en",
          text: itemAnalysis.headword,
          subText: itemAnalysis.posTags.join(" "),
          rawWord: item.word,
          isMatched: false,
        });
        generated.push({
          id: `vi-${item.id}-${idx}`,
          wordId: item.id,
          type: "vi",
          text: item.meaning || "Không có nghĩa",
          subText: itemAnalysis.synonym ? `= ${itemAnalysis.synonym}` : undefined,
          rawWord: item.word,
          isMatched: false,
        });
      });

      // Fisher-Yates shuffle
      for (let i = generated.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generated[i], generated[j]] = [generated[j], generated[i]];
      }

      setCards(generated);
      setSelectedCards([]);
      setWrongCards([]);
      setMatchedCount(0);
      setMoves(0);
      setIsRoundWon(false);
      setSeconds(0);
    },
    [wordPool, pairsPerRound]
  );

  useEffect(() => {
    startNewRound(round, pairsPerRound);
  }, [round, pairsPerRound, startNewRound]);

  // Timer
  useEffect(() => {
    if (isRoundWon || cards.length === 0) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRoundWon, cards]);

  const handleCardClick = (card: MatchCard) => {
    if (card.isMatched || selectedCards.some((c) => c.id === card.id) || selectedCards.length >= 2) {
      return;
    }

    playEffectSound("click", soundEnabled);
    if (card.rawWord) {
      onSpeech(card.rawWord);
    }

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = nextSelected;

      // Check if one is 'en' and the other is 'vi' and both belong to the same wordId
      if (first.wordId === second.wordId && first.type !== second.type) {
        // MATCH!
        playEffectSound("correct", soundEnabled);
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        const addedScore = 100 * nextStreak + Math.max(10, 50 - seconds);
        setScore((s) => s + addedScore);

        setCards((prev) =>
          prev.map((c) => (c.wordId === first.wordId ? { ...c, isMatched: true } : c))
        );
        setSelectedCards([]);

        // Record successful pair match into DB & advance Leitner stage
        const matchedItem = wordPool.find((w) => w.id === first.wordId);
        if (matchedItem) {
          if (onWordAnswered) {
            onWordAnswered(matchedItem, true);
          } else {
            recordWordProgressToDb({
              word: matchedItem.word,
              meaning: matchedItem.meaning,
              example: matchedItem.example,
              listName: matchedItem.topic,
              isCorrect: true,
            });
          }
        }

        const newMatched = matchedCount + 1;
        setMatchedCount(newMatched);

        const totalPairsInRound = Math.floor(cards.length / 2);
        if (newMatched >= totalPairsInRound) {
          setIsRoundWon(true);
          playEffectSound("victory", soundEnabled);
          onGameComplete?.();
        }
      } else {
        // MISMATCH!
        playEffectSound("wrong", soundEnabled);
        setStreak(0);
        setWrongCards([first.id, second.id]);
        setTimeout(() => {
          setSelectedCards([]);
          setWrongCards([]);
        }, 700);
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const totalPairsInRound = Math.floor(cards.length / 2);
  const currentWordStart = (round - 1) * pairsPerRound + 1;
  const currentWordEnd = Math.min(round * pairsPerRound, wordPool.length);

  return (
    <div className="w-full space-y-5 animate-fade-up">
      {/* Top Multi-round Navigation & Settings */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Round Pagination & Jump */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setRound((r) => Math.max(1, r - 1))}
            disabled={round <= 1}
            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            style={{ borderColor: "var(--border)" }}
            title="Hiệp trước"
          >
            ◀
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span style={{ color: "var(--text-primary)" }}>Hiệp</span>
            <Select
              value={round}
              onChange={(val) => setRound(Number(val))}
              options={Array.from({ length: totalRounds }).map((_, i) => ({
                value: i + 1,
                label: `Hiệp ${i + 1} / ${totalRounds} (Từ ${i * pairsPerRound + 1} - ${Math.min((i + 1) * pairsPerRound, wordPool.length)})`
              }))}
              className="w-48 text-xs font-bold"
            />
          </div>

          <button
            type="button"
            onClick={() => setRound((r) => Math.min(totalRounds, r + 1))}
            disabled={round >= totalRounds}
            className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            style={{ borderColor: "var(--border)" }}
            title="Hiệp tiếp theo"
          >
            ▶
          </button>

          <span className="text-[11px] font-semibold text-[var(--text-muted)] ml-1 hidden sm:inline">
            (Đang chơi từ {currentWordStart} - {currentWordEnd} trên tổng {wordPool.length} từ)
          </span>
        </div>

        {/* Pairs per round switcher & Shuffle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)]">
            <span>Số cặp/hiệp:</span>
            {([4, 6, 8] as const).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setPairsPerRound(count);
                  setRound(1);
                }}
                className={`px-2 py-1 rounded-lg transition-all text-xs font-bold cursor-pointer ${
                  pairsPerRound === count
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                }`}
                style={{ borderColor: pairsPerRound === count ? "transparent" : "var(--border)" }}
              >
                {count}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => startNewRound(round, pairsPerRound)}
            className="px-2.5 py-1 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center gap-1 cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            title="Xáo lại hiệp này"
          >
            <span>🔄</span>
            <span>Xáo lại</span>
          </button>
        </div>
      </div>

      {/* Game Stats Bar */}
      <div
        className="p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Thời gian</div>
              <div className="font-mono text-base font-extrabold" style={{ color: "var(--text-primary)" }}>
                {formatTime(seconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Điểm số</div>
              <div className="font-mono text-base font-extrabold text-amber-500">{score}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Combo Streak</div>
              <div className="font-mono text-base font-extrabold text-rose-500">
                {streak > 1 ? `x${streak} Combo!` : `${streak}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Đã ghép</div>
              <div className="font-mono text-base font-extrabold text-emerald-500">
                {matchedCount} / {totalPairsInRound} cặp
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress bar of current round */}
          <div className="flex items-center gap-2">
            <div className="w-24 sm:w-32 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${(matchedCount / (totalPairsInRound || 1)) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-muted)]">
              {Math.round((matchedCount / (totalPairsInRound || 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 select-none">
        {cards.map((card) => {
          const isSelected = selectedCards.some((c) => c.id === card.id);
          const isWrong = wrongCards.includes(card.id);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`min-h-[105px] sm:min-h-[120px] p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
                card.isMatched
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 opacity-60 scale-95 pointer-events-none"
                  : isWrong
                  ? "bg-rose-500/20 border-rose-500 text-rose-600 animate-shake"
                  : isSelected
                  ? "bg-blue-500/15 border-blue-500 ring-4 ring-blue-400/25 scale-102 shadow-md"
                  : "hover:scale-102 hover:border-blue-500/40 active:scale-98"
              }`}
              style={{
                background: card.isMatched
                  ? undefined
                  : isSelected || isWrong
                  ? undefined
                  : "var(--bg-card)",
                borderColor: card.isMatched || isSelected || isWrong ? undefined : "var(--border)",
              }}
            >
              {/* Type badge */}
              <div className="absolute top-2 left-2.5 flex items-center gap-1">
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                    card.type === "en"
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {card.type === "en" ? "🇬🇧 EN" : "🇻🇳 VI"}
                </span>
              </div>

              {card.type === "en" && card.rawWord && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (card.rawWord) onSpeech(card.rawWord);
                  }}
                  className="absolute top-2 right-2 text-xs opacity-40 group-hover:opacity-100 hover:scale-110 transition-all"
                  title="Nghe phát âm"
                >
                  🔊
                </button>
              )}

              {/* Main text */}
              <p
                className={`text-sm sm:text-base font-extrabold mt-2 leading-snug line-clamp-2 ${
                  card.type === "en" ? "text-blue-600 dark:text-blue-400" : ""
                }`}
                style={{ color: card.type === "en" ? undefined : "var(--text-primary)" }}
              >
                {card.text}
              </p>

              {/* Subtext (pos or synonym) */}
              {card.subText && (
                <span className="text-[11px] font-medium opacity-65 mt-1 block line-clamp-1">
                  {card.subText}
                </span>
              )}

              {card.isMatched && (
                <span className="absolute bottom-1 right-2 text-xs text-emerald-500 font-bold">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Victory Modal */}
      {isRoundWon && (
        <div className="p-6 sm:p-8 rounded-3xl border text-center space-y-5 animate-fade-up shadow-xl" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-3xl mx-auto animate-bounce">
            🎉
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black" style={{ color: "var(--text-primary)" }}>
              Hoàn thành hiệp {round}!
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Thời gian: <strong>{formatTime(seconds)}</strong> • Số lần lật thẻ: <strong>{moves}</strong> • Điểm đạt được: <strong className="text-amber-500">+{score} pts</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => startNewRound(round)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              🔄 Chơi lại hiệp này
            </button>
            <button
              type="button"
              onClick={() => {
                const next = round < totalRounds ? round + 1 : 1;
                setRound(next);
                startNewRound(next);
              }}
              className="w-full sm:w-auto btn-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:scale-102 active:scale-98 transition-transform cursor-pointer"
            >
              {round < totalRounds ? `Hiệp tiếp theo (${round + 1}/${totalRounds}) ➔` : "Chơi lại từ đầu ➔"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 2: SPEED QUIZ (TRẮC NGHIỆM TỐC ĐỘ 10S)
// ==========================================
interface SpeedQuizOption {
  text: string;
  englishWord: string;
}

interface QuizQuestion {
  wordItem: SpacedWordItem;
  options: SpeedQuizOption[];
  correctAnswer: string;
}

function SpeedQuizGame({
  wordPool,
  soundEnabled,
  onSpeech,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [questionLimit, setQuestionLimit] = useState<number | "all">(10);

  const initQuiz = useCallback(() => {
    if (wordPool.length === 0) return;

    const count = questionLimit === "all" ? wordPool.length : Math.min(questionLimit, wordPool.length);

    // Shuffle pool to pick questions
    const shuffledPool = [...wordPool].sort(() => Math.random() - 0.5);
    const chosenWords = shuffledPool.slice(0, count);

    const generated: QuizQuestion[] = chosenWords.map((target) => {
      const correct = target.meaning || target.word;
      const correctOpt: SpeedQuizOption = {
        text: correct,
        englishWord: target.word,
      };

      // Pick 3 distractors from rest of pool
      const distractors: SpeedQuizOption[] = wordPool
        .filter((w) => w.id !== target.id && (w.meaning || w.word) !== correct)
        .map((w) => ({
          text: w.meaning || w.word,
          englishWord: w.word,
        }));

      const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
      const allOptions = [correctOpt, ...shuffledDistractors].sort(() => Math.random() - 0.5);

      return {
        wordItem: target,
        options: allOptions,
        correctAnswer: correct,
      };
    });

    setQuestions(generated);
    setQIndex(0);
    setSelectedOption(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setWrongQuestions([]);
    setIsFinished(false);
    setTimeLeft(10);
  }, [wordPool, questionLimit]);

  useEffect(() => {
    initQuiz();
  }, [initQuiz]);

  const currentQ = questions[qIndex];

  // Auto speech on new question
  useEffect(() => {
    if (currentQ?.wordItem?.word) {
      onSpeech(currentQ.wordItem.word);
    }
  }, [currentQ, onSpeech]);

  const nextTimerRef = useRef<NodeJS.Timeout | null>(null);

  const advanceToNext = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setSelectedOption(null);
      setTimeLeft(10);
    } else {
      setIsFinished(true);
      playEffectSound("victory", soundEnabled);
      onGameComplete?.();
    }
  }, [qIndex, questions.length, soundEnabled]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    if (selectedOption !== null || isFinished || !currentQ) return;
    playEffectSound("wrong", soundEnabled);
    setSelectedOption("__TIMEOUT__");
    setStreak(0);
    setWrongQuestions((prev) => [...prev, currentQ]);

    // Save timeout (wrong answer) to DB & Leitner
    if (currentQ?.wordItem) {
      if (onWordAnswered) {
        onWordAnswered(currentQ.wordItem, false);
      } else {
        recordWordProgressToDb({
          word: currentQ.wordItem.word,
          meaning: currentQ.wordItem.meaning,
          example: currentQ.wordItem.example,
          listName: currentQ.wordItem.topic,
          isCorrect: false,
        });
      }
    }

    nextTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, 3200);
  }, [selectedOption, isFinished, currentQ, soundEnabled, advanceToNext]);

  // 10s Timer per question
  useEffect(() => {
    if (isFinished || selectedOption !== null || !currentQ) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, selectedOption, currentQ, handleTimeout]);

  const handleSelectOption = (opt: SpeedQuizOption) => {
    if (selectedOption !== null || isFinished || !currentQ) return;

    if (opt.englishWord) {
      onSpeech(opt.englishWord);
    }
    setSelectedOption(opt.text);
    const isCorrect = opt.text === currentQ.correctAnswer;

    // Record quiz answer directly to DB & Leitner
    if (currentQ?.wordItem) {
      if (onWordAnswered) {
        onWordAnswered(currentQ.wordItem, isCorrect);
      } else {
        recordWordProgressToDb({
          word: currentQ.wordItem.word,
          meaning: currentQ.wordItem.meaning,
          example: currentQ.wordItem.example,
          listName: currentQ.wordItem.topic,
          isCorrect,
        });
      }
    }

    if (isCorrect) {
      playEffectSound("correct", soundEnabled);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
      setCorrectCount((c) => c + 1);
      const points = 100 + timeLeft * 10 + nextStreak * 20;
      setScore((s) => s + points);

      nextTimerRef.current = setTimeout(() => {
        advanceToNext();
      }, 900);
    } else {
      playEffectSound("wrong", soundEnabled);
      setStreak(0);
      setWrongQuestions((prev) => [...prev, currentQ]);

      // Give user time to see the answer, or they can click Next immediately
      nextTimerRef.current = setTimeout(() => {
        advanceToNext();
      }, 3500);
    }
  };

  if (!currentQ && !isFinished) return null;

  if (isFinished) {
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <div
        className="w-full max-w-2xl mx-auto p-8 rounded-3xl border text-center space-y-6 animate-fade-up shadow-xl"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-4xl mx-auto animate-bounce shadow-inner">
          {accuracy >= 80 ? "🏆" : accuracy >= 50 ? "🎖️" : "🌱"}
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
            {accuracy >= 80 ? "Chiến Thần Tốc Độ!" : accuracy >= 50 ? "Kết Quả Rất Tốt!" : "Cố Lên, Luyện Thêm Nhé!"}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Bạn đã hoàn thành phiên trắc nghiệm 10s tốc độ.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Tổng điểm</div>
            <div className="text-xl font-black text-amber-500">{score}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Độ chính xác</div>
            <div className="text-xl font-black text-emerald-500">
              {correctCount}/{questions.length} ({accuracy}%)
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Max Combo</div>
            <div className="text-xl font-black text-rose-500">🔥 x{maxStreak}</div>
          </div>
        </div>

        {wrongQuestions.length > 0 && (
          <div className="text-left space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Từ vựng cần ôn lại ({wrongQuestions.length}):
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border bg-[var(--bg-subtle)]" style={{ borderColor: "var(--border)" }}>
              {wrongQuestions.map((q, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSpeech(q.wordItem.word)}
                      className="text-xs opacity-75 hover:opacity-100"
                    >
                      🔊
                    </button>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      {analyzeWordStructure(q.wordItem.word).headword}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    {q.correctAnswer}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={initQuiz}
            className="w-full sm:w-auto btn-primary px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:scale-102 active:scale-98 transition-transform cursor-pointer"
          >
            🔄 Chơi lại lượt mới
          </button>
        </div>
      </div>
    );
  }

  const analysis = analyzeWordStructure(currentQ.wordItem.word);

  return (
    <div className="w-full space-y-5 animate-fade-up">
      {/* Top Header stats & question count selector */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-xs font-bold text-[var(--text-muted)]">
            Câu {qIndex + 1}/{questions.length}
          </span>
          <span className="text-xs font-bold text-amber-500">⭐ {score} pts</span>
          {streak > 1 && <span className="text-xs font-extrabold text-rose-500 animate-pulse">🔥 x{streak}</span>}
          
          <div className="flex items-center gap-1 pl-2 border-l" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Số câu:</span>
            {[10, 20, "all" as const].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionLimit(cnt)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  questionLimit === cnt
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                }`}
                style={{ borderColor: questionLimit === cnt ? "transparent" : "var(--border)" }}
              >
                {cnt === "all" ? `Tất cả (${wordPool.length})` : `${cnt} câu`}
              </button>
            ))}
          </div>
        </div>

        {/* 10s Timer Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: timeLeft <= 3 ? "#ef4444" : "var(--text-primary)" }}>
            ⏱️ {timeLeft}s
          </span>
          <div className="w-28 h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 3 ? "bg-rose-500" : timeLeft <= 6 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${(timeLeft / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target Word Card */}
      <div
        className="p-8 sm:p-12 rounded-3xl border text-center space-y-4 relative shadow-md min-h-[220px] sm:min-h-[260px] flex flex-col justify-center items-center"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => onSpeech(currentQ.wordItem.word)}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-base hover:scale-110 transition-transform shadow-xs"
          title="Nghe phát âm"
        >
          🔊
        </button>

        <span className="text-xs uppercase tracking-widest font-extrabold opacity-40 block">
          Chọn nghĩa đúng của từ
        </span>

        <h3 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: "var(--brand)" }}>
          {analysis.headword}
        </h3>

        {analysis.posTags.length > 0 && (
          <div className="flex justify-center gap-2 flex-wrap">
            {analysis.posTags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {analysis.collocation && (
          <p className="text-sm font-semibold text-purple-500">{analysis.collocation}</p>
        )}
      </div>

      {/* 4 Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {currentQ.options.map((opt, idx) => {
          const isChosen = selectedOption === opt.text;
          const isCorrect = opt.text === currentQ.correctAnswer;
          const showAnswer = selectedOption !== null;

          let btnClass = "border hover:border-blue-500/50 hover:bg-[var(--bg-muted)]";
          let styleBg = "var(--bg-card)";
          let styleBorder = "var(--border)";

          if (showAnswer) {
            if (isCorrect) {
              btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40 font-black scale-101";
              styleBg = "";
              styleBorder = "";
            } else if (isChosen) {
              btnClass = "bg-rose-500 text-white border-rose-600 shadow-md font-bold scale-99";
              styleBg = "";
              styleBorder = "";
            } else {
              btnClass = "opacity-40 border";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={showAnswer}
              onClick={() => handleSelectOption(opt)}
              className={`p-4 sm:p-5 rounded-2xl text-left transition-all text-sm sm:text-base font-bold flex items-center justify-between gap-3.5 cursor-pointer shadow-2xs ${btnClass}`}
              style={{ background: styleBg || undefined, borderColor: styleBorder || undefined }}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs sm:text-sm font-black font-mono shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="line-clamp-2 leading-snug">{opt.text}</span>
                  {showAnswer && opt.englishWord && opt.englishWord.toLowerCase() !== opt.text.toLowerCase() && (
                    <span className="block text-xs opacity-90 font-mono mt-0.5 font-normal">
                      🇬🇧 {opt.englishWord}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (opt.englishWord) onSpeech(opt.englishWord);
                  }}
                  className="w-7 h-7 rounded-full bg-blue-500/15 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  title={`Nghe phát âm: ${opt.englishWord}`}
                >
                  🔊
                </button>
                {showAnswer && isCorrect && <span className="text-lg">✓</span>}
                {showAnswer && isChosen && !isCorrect && <span className="text-lg">✕</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Wrong Feedback: Show Correct Answer Callout */}
      {selectedOption !== null && selectedOption !== currentQ.correctAnswer && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-fade-up">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-2 flex-wrap">
              <span>{selectedOption === "__TIMEOUT__" ? "⏱️ Hết thời gian 10s!" : "❌ Chưa chính xác!"}</span>
              <span>Đáp án đúng:</span>
              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl font-black text-sm sm:text-base">
                {currentQ.correctAnswer}
              </span>
            </div>
            {currentQ.wordItem.example && (
              <p className="text-xs text-[var(--text-secondary)] italic">
                Ví dụ: &ldquo;{currentQ.wordItem.example}&rdquo;
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={advanceToNext}
            className="btn-primary px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shrink-0 self-end sm:self-auto cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-transform"
          >
            Câu tiếp theo ➔
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 3: WORD SCRAMBLE (XẾP CHỮ ĐOÁN TỪ)
// ==========================================
function WordScrambleGame({
  wordPool,
  soundEnabled,
  onSpeech,
  gameInfo,
  onBackToSetup,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  gameInfo?: {
    gameName: string;
    folderName: string;
    totalWords: number;
  };
  onBackToSetup?: () => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState<{ id: string; char: string }[]>([]);
  const [userLetters, setUserLetters] = useState<{ id: string; char: string }[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  // Filter pool to valid single words (3-15 chars, only a-z)
  const validWords = useMemo(() => {
    return wordPool
      .filter((w) => {
        const head = analyzeWordStructure(w.word).headword.toLowerCase().trim();
        return head.length >= 3 && head.length <= 15 && /^[a-z]+$/.test(head);
      })
      .sort(() => Math.random() - 0.5);
  }, [wordPool]);

  const currentItem = validWords[index];
  const targetWord = currentItem ? analyzeWordStructure(currentItem.word).headword.toUpperCase() : "";

  const initWord = useCallback(() => {
    if (!targetWord) return;
    const chars = targetWord.split("").map((c, i) => ({ id: `${c}-${i}-${Date.now()}`, char: c }));
    // Shuffle
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    setScrambledLetters(shuffled);
    setUserLetters([]);
    setIsSuccess(false);
    setIsWrong(false);
    setIsAnswerRevealed(false);
  }, [targetWord]);

  useEffect(() => {
    initWord();
  }, [initWord]);

  // Click letter to place into answer
  const handleSelectLetter = (item: { id: string; char: string }) => {
    if (isSuccess || isAnswerRevealed) return;
    playEffectSound("click", soundEnabled);
    setIsWrong(false);
    setScrambledLetters((prev) => prev.filter((l) => l.id !== item.id));
    const nextUser = [...userLetters, item];
    setUserLetters(nextUser);

    // Check if full word formed
    if (nextUser.length === targetWord.length) {
      const spelled = nextUser.map((l) => l.char).join("");
      if (spelled === targetWord) {
        setIsSuccess(true);
        setIsWrong(false);
        playEffectSound("correct", soundEnabled);
        if (currentItem) {
          onSpeech(currentItem.word);
          // Save correct scramble to DB & Leitner
          if (onWordAnswered) {
            onWordAnswered(currentItem, true);
          } else {
            recordWordProgressToDb({
              word: currentItem.word,
              meaning: currentItem.meaning,
              example: currentItem.example,
              listName: currentItem.topic,
              isCorrect: true,
            });
          }
        }
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setScore((s) => s + 100 * nextStreak);
      } else {
        setIsWrong(true);
        playEffectSound("wrong", soundEnabled);
        if (currentItem) {
          onSpeech(currentItem.word);
          // Save wrong scramble to DB & Leitner
          if (onWordAnswered) {
            onWordAnswered(currentItem, false);
          } else {
            recordWordProgressToDb({
              word: currentItem.word,
              meaning: currentItem.meaning,
              example: currentItem.example,
              listName: currentItem.topic,
              isCorrect: false,
            });
          }
        }
        setStreak(0);
      }
    }
  };

  // Click letter in answer to return back
  const handleReturnLetter = (item: { id: string; char: string }) => {
    if (isSuccess || isAnswerRevealed) return;
    playEffectSound("click", soundEnabled);
    setIsWrong(false);
    setUserLetters((prev) => prev.filter((l) => l.id !== item.id));
    setScrambledLetters((prev) => [...prev, item]);
  };

  // Give 1 hint letter
  const handleHint = () => {
    if (isSuccess || isAnswerRevealed || userLetters.length >= targetWord.length) return;
    const nextCharIndex = userLetters.length;
    const expectedChar = targetWord[nextCharIndex];

    const availableIndex = scrambledLetters.findIndex((l) => l.char === expectedChar);
    if (availableIndex !== -1) {
      const item = scrambledLetters[availableIndex];
      handleSelectLetter(item);
    }
  };

  // Xem đáp án khi sai hoặc bí từ
  const handleRevealAnswer = () => {
    if (isSuccess) return;
    setIsAnswerRevealed(true);
    setIsWrong(false);
    playEffectSound("flip", soundEnabled);
    if (currentItem) {
      onSpeech(currentItem.word);
      // Save revealed answer (marked needs review) to DB & Leitner
      if (onWordAnswered) {
        onWordAnswered(currentItem, false);
      } else {
        recordWordProgressToDb({
          word: currentItem.word,
          meaning: currentItem.meaning,
          example: currentItem.example,
          listName: currentItem.topic,
          isCorrect: false,
        });
      }
    }
  };

  // Thử xếp lại từ hiện tại
  const handleRetryCurrentWord = () => {
    setIsAnswerRevealed(false);
    setIsWrong(false);
    initWord();
  };

  const nextWord = () => {
    setIsAnswerRevealed(false);
    setIsWrong(false);
    if (index + 1 < validWords.length) {
      setIndex((i) => i + 1);
    } else {
      setIndex(0);
      onGameComplete?.();
    }
  };

  if (!currentItem) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
        Không đủ từ vựng phù hợp cho trò chơi xếp chữ (cần các từ từ 3-15 ký tự).
      </div>
    );
  }

  const analysis = analyzeWordStructure(currentItem.word);

  // Xóa toàn bộ chữ đã xếp để chọn lại từ đầu
  const handleClearUserLetters = () => {
    if (isSuccess || isAnswerRevealed || userLetters.length === 0) return;
    playEffectSound("click", soundEnabled);
    setIsWrong(false);
    setScrambledLetters((prev) => [...prev, ...userLetters]);
    setUserLetters([]);
  };

  // Kích thước ô chữ đồng bộ 100% hình vuông bo góc cho cả ô ghép (trên) và phím bấm (dưới)
  const tileSizeClass = useMemo(() => {
    const len = targetWord.length;
    if (len <= 6) return "w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl rounded-2xl";
    if (len <= 8) return "w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg rounded-xl sm:rounded-2xl";
    if (len <= 11) return "w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base rounded-xl";
    return "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-xl";
  }, [targetWord.length]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 sm:gap-6 items-stretch animate-fade-up">
      {/* =========================================
          CỘT 1 (BÊN TRÁI): TOÀN BỘ KHU VỰC LÀM BÀI
          ========================================= */}
      <div className="space-y-3.5 flex flex-col justify-between h-full">
        {/* Thanh Thông Tin Game & Đổi Thiết Lập (Nằm bên trái để cột kết quả lên đều) */}
        {gameInfo && onBackToSetup && (
          <div
            className="p-3 sm:p-3.5 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-2.5"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                {gameInfo.gameName}
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span style={{ color: "var(--text-primary)" }}>
                📁 {gameInfo.folderName}
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-purple-600 dark:text-purple-400 font-black">
                {gameInfo.totalWords} từ
              </span>
            </div>

            <button
              type="button"
              onClick={onBackToSetup}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              title="Quay về màn hình chọn thư mục và cài đặt"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Đổi thiết lập / Chọn lại</span>
            </button>
          </div>
        )}

        {/* Thanh Điều Hướng & Trạng Thái Câu Hỏi */}
        <div
          className="p-3 sm:p-3.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAnswerRevealed(false);
                setIsWrong(false);
                setIndex((i) => Math.max(0, i - 1));
              }}
              disabled={index <= 0}
              className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              style={{ borderColor: "var(--border)" }}
              title="Từ trước"
            >
              ◀
            </button>

            <span className="text-xs font-bold text-[var(--text-muted)]">
              Từ {index + 1}/{validWords.length}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsAnswerRevealed(false);
                setIsWrong(false);
                setIndex((i) => Math.min(validWords.length - 1, i + 1));
              }}
              disabled={index >= validWords.length - 1}
              className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              style={{ borderColor: "var(--border)" }}
              title="Từ tiếp theo"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500">⭐ {score} pts</span>
            {streak > 1 && <span className="text-xs font-extrabold text-rose-500 animate-pulse">🔥 x{streak}</span>}
          </div>
        </div>
          {/* Nghĩa tiếng Việt & Gợi ý từ loại */}
          <div
            className="p-5 sm:p-6 rounded-3xl border text-center space-y-2.5 shadow-sm"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-purple-600 dark:text-purple-400">
                Nghĩa tiếng Việt
              </span>
              {analysis.posTags.length > 0 && (
                <div className="flex items-center gap-1">
                  {analysis.posTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>
              {currentItem.meaning || "Không có nghĩa"}
            </h3>

            {currentItem.example && (
              <p className="text-xs sm:text-sm italic opacity-75 max-w-md mx-auto line-clamp-2">
                &ldquo;{currentItem.example}&rdquo;
              </p>
            )}
          </div>

          {/* Ô Ghép Chữ & Bảng Phím Chữ Cái */}
          <div
            className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 flex-1 flex flex-col justify-between"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {/* Header ô ghép */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-[var(--text-muted)]">
                Ô ghép chữ ({userLetters.length}/{targetWord.length} chữ cái):
              </span>
              {userLetters.length > 0 && !isSuccess && !isAnswerRevealed && (
                <button
                  type="button"
                  onClick={handleClearUserLetters}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
                >
                  ✕ Xóa tất cả
                </button>
              )}
            </div>

            {/* Answer Slots */}
            <div
              className="flex flex-nowrap justify-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-2xl border transition-colors bg-[var(--bg-subtle)] min-h-[70px] items-center overflow-x-auto"
              style={{
                borderColor: isWrong ? "#ef4444" : isAnswerRevealed ? "#10b981" : isSuccess ? "#10b981" : "var(--border)",
              }}
            >
              {Array.from({ length: targetWord.length }).map((_, i) => {
                const letter = isAnswerRevealed
                  ? { id: `revealed-${i}`, char: targetWord[i] }
                  : userLetters[i];

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isAnswerRevealed || isSuccess}
                    onClick={() => letter && !isAnswerRevealed && handleReturnLetter(letter)}
                    className={`${tileSizeClass} shrink-0 border-2 font-mono font-black flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      letter
                        ? isSuccess || isAnswerRevealed
                          ? "bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-400/40"
                          : isWrong
                          ? "bg-rose-500 text-white border-rose-600 animate-shake"
                          : "bg-blue-600 text-white border-blue-500 hover:scale-105"
                        : "border-dashed border-gray-300 dark:border-gray-700 bg-transparent text-transparent"
                    }`}
                    title={letter && !isAnswerRevealed ? "Bấm vào ô này để gỡ chữ" : undefined}
                  >
                    {letter?.char || "·"}
                  </button>
                );
              })}
            </div>

            {/* Scrambled Letter Palette (Bàn phím chọn chữ cái) */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-center text-[var(--text-muted)]">
                {!isSuccess && !isAnswerRevealed ? "Bấm chọn các chữ cái bên dưới:" : "Đã hoàn thành từ này"}
              </div>

              <div className="flex flex-nowrap justify-center gap-1.5 sm:gap-2 min-h-[52px] items-center overflow-x-auto py-1">
                {!isSuccess && !isAnswerRevealed ? (
                  scrambledLetters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectLetter(item)}
                      className={`${tileSizeClass} shrink-0 border-2 font-mono font-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer hover:border-blue-500 hover:bg-blue-500/10`}
                      style={{
                        background: "var(--bg-subtle)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.char}
                    </button>
                  ))
                ) : (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Bạn đã mở khóa từ vựng thành công! Xem chi tiết ở cột bên phải.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            CỘT 2 (BÊN PHẢI): HIỂN THỊ KẾT QUẢ & TRỢ GIÚP
            ========================================= */}
        <div className="h-full flex flex-col">
          {/* TRƯỜNG HỢP 1: LÀM ĐÚNG (SUCCESS) */}
          {isSuccess && (
            <div
              className="p-6 sm:p-8 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/35 text-center space-y-5 h-full flex flex-col justify-between shadow-sm animate-fade-up"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                  🎉 Xuất sắc! Chính xác
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2.5">
                    <span>{targetWord}</span>
                    <button
                      type="button"
                      onClick={() => currentItem && onSpeech(currentItem.word)}
                      className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-sm hover:scale-110 transition-transform cursor-pointer"
                      title="Nghe phát âm chuẩn"
                    >
                      🔊
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-emerald-500/20 text-left space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="font-extrabold text-[var(--text-primary)]">{currentItem.word}:</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentItem.meaning}</span>
                  </div>
                  {currentItem.example && (
                    <p className="italic opacity-80 text-xs text-[var(--text-secondary)]">
                      &ldquo;{currentItem.example}&rdquo;
                    </p>
                  )}
                </div>

                <div className="inline-block px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 font-bold text-xs">
                  ⭐ +{100 * streak} điểm (Chuỗi: x{streak})
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={nextWord}
                  className="w-full btn-primary py-3.5 rounded-2xl font-bold text-sm shadow-md hover:scale-102 transition-transform cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Tiếp tục</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 2: ĐANG XEM ĐÁP ÁN (ANSWER REVEALED) */}
          {isAnswerRevealed && !isSuccess && (
            <div
              className="p-6 sm:p-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/35 text-center space-y-5 h-full flex flex-col justify-between shadow-sm animate-fade-up"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                  📖 Đáp án chi tiết
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2.5">
                    <span>{targetWord}</span>
                    <button
                      type="button"
                      onClick={() => currentItem && onSpeech(currentItem.word)}
                      className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center text-sm hover:scale-110 transition-transform cursor-pointer"
                      title="Nghe phát âm chuẩn"
                    >
                      🔊
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-amber-500/20 text-left space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="font-extrabold text-[var(--text-primary)]">{currentItem.word}:</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentItem.meaning}</span>
                  </div>
                  {currentItem.example && (
                    <p className="italic opacity-80 text-xs text-[var(--text-secondary)]">
                      &ldquo;{currentItem.example}&rdquo;
                    </p>
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Bạn có thể bấm &quot;Làm lại&quot; để xếp lại từ này hoặc bấm &quot;Tiếp tục&quot; để qua từ mới.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRetryCurrentWord}
                  className="w-full py-3 rounded-2xl border hover:bg-[var(--bg-muted)] text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  🔄 Làm lại
                </button>
                <button
                  type="button"
                  onClick={nextWord}
                  className="w-full btn-primary py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:scale-102 transition-transform cursor-pointer"
                >
                  Tiếp tục ➔
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 3: XẾP SAI (WRONG) - HIỂN THỊ XEM KẾT QUẢ, NÚT LÀM LẠI & TIẾP TỤC */}
          {isWrong && !isSuccess && !isAnswerRevealed && (
            <div
              className="p-6 sm:p-8 rounded-3xl bg-rose-500/10 border-2 border-rose-500/35 text-center space-y-5 h-full flex flex-col justify-between shadow-sm animate-fade-up"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
                  ❌ Chưa chính xác
                </div>

                <div className="space-y-1">
                  <div className="text-xs uppercase font-bold tracking-wider text-rose-500">
                    Đáp án đúng là:
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2.5">
                    <span>{targetWord}</span>
                    <button
                      type="button"
                      onClick={() => currentItem && onSpeech(currentItem.word)}
                      className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center text-sm hover:scale-110 transition-transform cursor-pointer"
                      title="Nghe lại phát âm chuẩn"
                    >
                      🔊
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-rose-500/20 text-left space-y-2 text-xs sm:text-sm">
                  <div>
                    <span className="font-extrabold text-[var(--text-primary)]">{currentItem.word}:</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentItem.meaning}</span>
                  </div>
                  {currentItem.example && (
                    <p className="italic opacity-80 text-xs text-[var(--text-secondary)]">
                      &ldquo;{currentItem.example}&rdquo;
                    </p>
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Bạn có thể bấm &quot;Làm lại&quot; để xếp lại từ này hoặc bấm &quot;Tiếp tục&quot; để sang từ mới.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRetryCurrentWord}
                  className="w-full py-3 rounded-2xl border hover:bg-[var(--bg-muted)] text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  🔄 Làm lại
                </button>
                <button
                  type="button"
                  onClick={nextWord}
                  className="w-full btn-primary py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:scale-102 transition-transform cursor-pointer"
                >
                  Tiếp tục ➔
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 4: ĐANG LÀM BÀI BÌNH THƯỜNG (IN-PROGRESS) */}
          {!isSuccess && !isAnswerRevealed && !isWrong && (
            <div
              className="p-6 sm:p-8 rounded-3xl border text-center space-y-5 h-full flex flex-col justify-between shadow-sm"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
                  🎯 Bảng kết quả & Trợ giúp
                </div>

                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    Đã ghép: {userLetters.length} / {targetWord.length} chữ cái
                  </div>
                </div>

                <div className="text-left p-4 rounded-2xl bg-[var(--bg-subtle)] space-y-2 text-xs text-[var(--text-secondary)]">
                  <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>📌</span>
                    <span>Quy tắc làm bài:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 opacity-85">
                    <li>Nhấp vào chữ cái ở cột bên trái để điền vào ô trống.</li>
                    <li>Nhấp trực tiếp vào ô chữ đã điền nếu muốn gỡ bỏ.</li>
                    <li>Khi ghép đủ tất cả ký tự, kết quả đúng/sai sẽ hiện ngay tại khung này!</li>
                  </ul>
                </div>
              </div>

              {/* Các nút hỗ trợ */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={userLetters.length >= targetWord.length}
                  className="py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  title="Mở 1 chữ cái gợi ý (-20pts)"
                >
                  <span>💡</span>
                  <span>Gợi ý (-20pts)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRevealAnswer}
                  className="py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  title="Xem đáp án của từ này"
                >
                  <span>👁️</span>
                  <span>Xem đáp án</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

// ==========================================
// GAME 4: LISTENING DICTATION (LUYỆN NGHE TỪ VỰNG)
// ==========================================
function ListeningVocabGame({
  wordPool,
  soundEnabled,
  onSpeech,
  gameInfo,
  onBackToSetup,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  gameInfo?: {
    gameName: string;
    folderName: string;
    totalWords: number;
  };
  onBackToSetup?: () => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [speechSpeed, setSpeechSpeed] = useState<0.8 | 1.0>(1.0);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [farmStars, setFarmStars] = useState<number>(getFarmStars());

  useEffect(() => {
    const handleStarsUpdate = (e: any) => {
      if (typeof e.detail === "number") setFarmStars(e.detail);
      else setFarmStars(getFarmStars());
    };
    window.addEventListener("farm-stars-updated", handleStarsUpdate);
    return () => window.removeEventListener("farm-stars-updated", handleStarsUpdate);
  }, []);

  const currentItem = wordPool[index];
  const targetStructure = currentItem ? analyzeWordStructure(currentItem.word) : null;
  const targetHeadword = targetStructure ? targetStructure.headword.trim() : "";

  // Auto-play audio when switching word
  useEffect(() => {
    if (currentItem) {
      setUserInput("");
      setIsAnswerRevealed(false);
      setIsCorrect(null);
      setShowHint(false);
      const timer = setTimeout(() => {
        playWordAudio(currentItem.word, speechSpeed);
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [index, currentItem]);

  const playWordAudio = (rawWord: string, rate: number = 1.0) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = analyzeWordStructure(rawWord).cleanForSpeech;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => v.lang.startsWith("en-") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleCheck = () => {
    if (!currentItem || isAnswerRevealed) return;
    if (!userInput.trim()) return;
    const userClean = userInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetClean = targetHeadword.toLowerCase().replace(/[^a-z0-9]/g, "");

    const correct = userClean === targetClean;
    setIsCorrect(correct);
    setIsAnswerRevealed(true);

    if (correct) {
      playEffectSound("correct", soundEnabled);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const earned = 100 * Math.min(nextStreak, 5);
      setScore((s) => s + earned);
      addFarmStars(earned);
    } else {
      playEffectSound("wrong", soundEnabled);
      setStreak(0);
    }

    // Persist to Database & Leitner
    if (onWordAnswered) {
      onWordAnswered(currentItem, correct);
    } else {
      recordWordProgressToDb({
        word: currentItem.word,
        meaning: currentItem.meaning,
        example: currentItem.example,
        listName: currentItem.topic,
        isCorrect: correct,
      });
    }
  };

  const handleNext = () => {
    if (index < wordPool.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setIndex(0);
      onGameComplete?.();
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  // Keyboard shortcuts:
  // - Ctrl: Replay pronunciation audio
  // - Enter: Check answer (if typing) / Go to next word (if revealed)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Replay audio on pressing Ctrl
      if (e.key === "Control") {
        if (currentItem) {
          playWordAudio(currentItem.word, speechSpeed);
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isAnswerRevealed) {
          e.preventDefault();
          handleNext();
        } else if (userInput.trim()) {
          e.preventDefault();
          handleCheck();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isAnswerRevealed, userInput, index, wordPool.length, currentItem, speechSpeed]);

  if (!currentItem) {
    return (
      <div className="p-8 text-center text-sm font-semibold">
        Không có từ vựng nào trong danh sách.
      </div>
    );
  }

  // Hint text: First letter + underscores
  const hintText = targetHeadword
    ? targetHeadword.split("").map((c, i) => (i === 0 ? c : "_")).join(" ")
    : "";

  return (
    <div className="w-full space-y-4 animate-fade-up">
      {/* Top Playing Toolbar */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
            🎧 Luyện Nghe Từ Vựng
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span style={{ color: "var(--text-primary)" }}>
            📁 {gameInfo?.folderName || "Tất cả thư mục"}
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-blue-600 dark:text-blue-400 font-black">
            {wordPool.length} từ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/farm"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-green-500/15 to-amber-500/15 hover:from-emerald-500/25 hover:via-green-500/25 hover:to-amber-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            title="Đến Nông Trại Tri Thức (Happy Farm)"
          >
            <span className="text-base animate-bounce">🌾</span>
            <span>⭐ {farmStars.toLocaleString()} sao</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xs">
              🚜 Nông Trại
            </span>
          </Link>
        </div>

        {onBackToSetup && (
          <button
            type="button"
            onClick={onBackToSetup}
            className="px-3.5 py-1.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            title="Quay về màn hình chọn thư mục và cài đặt"
          >
            <span>⚙️</span>
            <span>Đổi thiết lập / Chọn lại</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Column: Audio & Dictation Input */}
        <div className="flex flex-col gap-4">
          {/* Top Word Navigation Bar */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={index <= 0}
                className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                style={{ borderColor: "var(--border)" }}
                title="Từ trước"
              >
                ◀
              </button>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                Từ {index + 1}/{wordPool.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={index >= wordPool.length - 1}
                className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                style={{ borderColor: "var(--border)" }}
                title="Từ tiếp theo"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/farm"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-105"
                title="Bấm để đến Nông Trại Tri Thức"
              >
                <span>🌾</span>
                <span>⭐ {farmStars.toLocaleString()}</span>
                <span className="text-[10px] bg-gradient-to-r from-emerald-600 to-green-600 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">
                  🚜 Nông Trại
                </span>
              </Link>

              {streak > 1 && (
                <span className="text-xs font-extrabold text-rose-500 animate-pulse">
                  🔥 x{streak}
                </span>
              )}
            </div>
          </div>

          {/* Big Audio Listening Card */}
          <div
            className="p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(37, 99, 235, 0.07), rgba(124, 58, 237, 0.07))",
              borderColor: "var(--border)",
            }}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Lắng nghe phát âm từ vựng
            </div>

            <button
              type="button"
              onClick={() => playWordAudio(currentItem.word, speechSpeed)}
              className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-3xl shadow-xl hover:scale-108 active:scale-95 transition-all cursor-pointer ring-4 ring-blue-500/20"
              title="Nghe lại phát âm (Phím tắt: Ctrl)"
            >
              🔊
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 opacity-80 -mt-1">
              <span>💡 Bấm</span>
              <kbd className="px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-blue-500/15 border border-blue-500/30 font-bold">Ctrl</kbd>
              <span>để nghe lại</span>
            </div>

            {/* Speed Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)]">Tốc độ phát:</span>
              {[
                { rate: 0.8 as const, label: "0.8x Chậm" },
                { rate: 1.0 as const, label: "1.0x Chuẩn" },
              ].map((s) => (
                <button
                  key={s.rate}
                  type="button"
                  onClick={() => {
                    setSpeechSpeed(s.rate);
                    playWordAudio(currentItem.word, s.rate);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    speechSpeed === s.rate
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                  }`}
                  style={{ borderColor: speechSpeed === s.rate ? "transparent" : "var(--border)" }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Meaning hint */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Nghĩa tiếng Việt:</div>
              <div className="text-base sm:text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {currentItem.meaning || "Từ vựng TOEIC"}
              </div>
              {targetStructure?.posTags && targetStructure.posTags.length > 0 && (
                <div className="flex items-center justify-center gap-1 pt-0.5">
                  {targetStructure.posTags.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/15 text-blue-500">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dictation Input Card */}
          <div
            className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Gõ lại từ tiếng Anh bạn nghe được:
              </label>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-bold text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>💡</span>
                <span>{showHint ? "Ẩn gợi ý" : "Gợi ý chữ cái"}</span>
              </button>
            </div>

            {showHint && (
              <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono text-sm tracking-widest text-center">
                {hintText} ({targetHeadword.length} chữ cái)
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Control") {
                    if (currentItem) playWordAudio(currentItem.word, speechSpeed);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!isAnswerRevealed) handleCheck();
                    else handleNext();
                  }
                }}
                readOnly={isAnswerRevealed}
                placeholder="Nhập từ vựng tiếng Anh..."
                className={`input flex-1 py-3 px-4 text-base font-bold focus:ring-2 focus:ring-blue-500/30 transition-all ${
                  isAnswerRevealed ? "opacity-85 cursor-default bg-[var(--bg-subtle)]" : ""
                }`}
                autoFocus
              />

              {!isAnswerRevealed ? (
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                  className="btn-primary py-3 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:scale-102 active:scale-98 transition-transform cursor-pointer shrink-0 disabled:opacity-50"
                >
                  Kiểm tra ➔
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-3 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-102 active:scale-98 transition-transform cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <span>Từ tiếp ➔</span>
                  <span className="text-[10px] opacity-80 font-mono bg-white/20 px-1.5 py-0.5 rounded">Enter ↵</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Result Reveal & Key Context */}
        <div className="h-full flex flex-col">
          {isAnswerRevealed ? (
            <div
              className={`p-6 sm:p-8 rounded-3xl border-2 text-center space-y-5 h-full flex flex-col justify-between shadow-sm animate-fade-up ${
                isCorrect
                  ? "bg-emerald-500/10 border-emerald-500/35"
                  : "bg-rose-500/10 border-rose-500/35"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-3xl p-2 rounded-2xl bg-amber-500/15 text-amber-500 animate-bounce">
                    {isCorrect ? "🌾" : "🌱"}
                  </div>
                  <div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isCorrect ? "🎉 Chính xác tuyệt đối!" : "❌ Chưa chính xác"}
                    </div>
                    {isCorrect && (
                      <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                        +{(100 * Math.min(streak, 5)).toLocaleString()} ⭐ gửi vào Nông Trại Tri Thức!
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2.5">
                    <span>{targetHeadword}</span>
                    <button
                      type="button"
                      onClick={() => playWordAudio(currentItem.word, speechSpeed)}
                      className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center text-base hover:scale-110 transition-transform cursor-pointer"
                      title="Nghe lại"
                    >
                      🔊
                    </button>
                  </div>
                  {targetStructure?.collocation && (
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      Cụm đi kèm: {targetStructure.collocation}
                    </div>
                  )}
                </div>

                <div
                  className="p-4 rounded-2xl border text-left space-y-2 text-xs sm:text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div>
                    <span className="font-extrabold text-[var(--text-primary)]">Nghĩa tiếng Việt:</span>{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {currentItem.meaning}
                    </span>
                  </div>
                  {currentItem.example && (
                    <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-between">
                        <span>Ví dụ thực tế:</span>
                        <button
                          type="button"
                          onClick={() => playWordAudio(currentItem.example!, 1.0)}
                          className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                        >
                          🔊 Nghe cả câu
                        </button>
                      </div>
                      <p className="italic opacity-85 text-xs text-[var(--text-secondary)] mt-1">
                        &ldquo;{currentItem.example}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="inline-block px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 font-bold text-xs">
                  {isCorrect ? `⭐ +${100 * Math.min(streak, 5)} điểm (Chuỗi: x${streak})` : "💾 Đã lưu vào database để nhắc ôn lại"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAnswerRevealed(false);
                    setIsCorrect(null);
                    setUserInput("");
                    setTimeout(() => {
                      playWordAudio(currentItem.word, speechSpeed);
                      inputRef.current?.focus();
                    }, 200);
                  }}
                  className="w-full py-3 px-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-102 active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <span className="text-base">🔄</span>
                  <span>Nghe & Làm lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full btn-primary py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:scale-102 transition-transform cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Từ tiếp theo ➔</span>
                  <span className="text-[11px] opacity-80 font-mono bg-white/20 px-1.5 py-0.5 rounded">Enter ↵</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-5 sm:p-6 rounded-3xl border text-center space-y-4 h-full flex flex-col justify-between shadow-sm"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
                    🎧 Đồng Hành Cùng Bạn
                  </div>

                  <Link
                    href="/farm"
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>🌾 Nông Trại Tri Thức ➔</span>
                  </Link>
                </div>

                {/* Farm Shortcut Banner */}
                <Link
                  href="/farm"
                  className="p-3 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-amber-500/10 hover:border-emerald-500/40 transition-all group flex items-center justify-between gap-3"
                  style={{ borderColor: "var(--border)" }}
                  title="Bấm để đến Nông Trại Tri Thức trồng cây & mở đất"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="text-2xl p-2 rounded-xl bg-emerald-500/20 group-hover:scale-110 transition-transform">
                      🚜
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors">
                        🌾 Nông Trại Tri Thức
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        ⭐ {farmStars.toLocaleString()} sao • Mua giống cây, đất, phân &amp; nước
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    Vào Farm →
                  </span>
                </Link>

                <div className="text-left p-3.5 rounded-2xl bg-[var(--bg-subtle)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>📌</span>
                    <span>Mẹo luyện nghe &amp; tích sao nông trại ⭐:</span>
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-[11px] leading-relaxed">
                    <li>Nhấn phím <kbd className="px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 font-mono text-[9px] font-bold">Ctrl</kbd> để nghe lại phát âm bất cứ lúc nào.</li>
                    <li>Gõ xong nhấn <kbd className="px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 font-mono text-[9px] font-bold">Enter</kbd> để kiểm tra đáp án và chuyển từ tiếp theo.</li>
                    <li>Mỗi từ đúng nhận +100 ⭐. Dùng sao mua giống cây, mở thêm đất, phân bón &amp; nước tưới!</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAnswerRevealed(true);
                  setIsCorrect(false);
                  playEffectSound("wrong", soundEnabled);
                  recordWordProgressToDb({
                    word: currentItem.word,
                    meaning: currentItem.meaning,
                    example: currentItem.example,
                    listName: currentItem.topic,
                    isCorrect: false,
                  });
                }}
                className="py-3 px-4 rounded-2xl border text-xs sm:text-sm font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <span>👁️</span>
                <span>Bỏ qua & Xem đáp án từ này</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// GAME: SYNONYM BLOCK BLAST (NỔ KHỐI ĐỒNG NGHĨA)
// ==========================================

// Built-in English & TOEIC Synonym Dictionary for guaranteed high-quality gameplay
const TOEIC_SYNONYM_PAIRS: { w1: string; w2: string; meaning: string }[] = [
  { w1: "opening", w2: "vacancy", meaning: "vị trí trống, việc làm cần tuyển" },
  { w1: "requirement", w2: "prerequisite", meaning: "điều kiện tiên quyết, yêu cầu" },
  { w1: "meet", w2: "satisfy", meaning: "thỏa mãn, đáp ứng yêu cầu" },
  { w1: "qualified", w2: "certified", meaning: "đủ trình độ, có chứng nhận" },
  { w1: "candidate", w2: "applicant", meaning: "ứng viên xin việc" },
  { w1: "purchase", w2: "buy", meaning: "mua sắm, mua hàng" },
  { w1: "commence", w2: "start", meaning: "bắt đầu, khởi đầu" },
  { w1: "terminate", w2: "end", meaning: "chấm dứt, kết thúc" },
  { w1: "annual", w2: "yearly", meaning: "hàng năm, thường niên" },
  { w1: "obtain", w2: "acquire", meaning: "đạt được, thu được" },
  { w1: "notify", w2: "inform", meaning: "thông báo cho ai đó" },
  { w1: "permit", w2: "allow", meaning: "cho phép làm gì" },
  { w1: "finish", w2: "complete", meaning: "hoàn thành, xong" },
  { w1: "expand", w2: "enlarge", meaning: "mở rộng quy mô" },
  { w1: "provide", w2: "supply", meaning: "cung cấp, tiếp tế" },
  { w1: "assist", w2: "help", meaning: "trợ giúp, hỗ trợ" },
  { w1: "modify", w2: "change", meaning: "thay đổi, chỉnh sửa" },
  { w1: "revenue", w2: "income", meaning: "doanh thu, thu nhập" },
  { w1: "client", w2: "customer", meaning: "khách hàng" },
  { w1: "objective", w2: "goal", meaning: "mục tiêu phấn đấu" },
  { w1: "evaluate", w2: "assess", meaning: "đánh giá, thẩm định" },
  { w1: "propose", w2: "suggest", meaning: "đề xuất, gợi ý" },
  { w1: "reduce", w2: "decrease", meaning: "giảm thiểu, hạ bớt" },
  { w1: "contract", w2: "agreement", meaning: "hợp đồng, thỏa thuận" },
  { w1: "policy", w2: "regulation", meaning: "chính sách, quy định" },
  { w1: "deadline", w2: "due date", meaning: "hạn chót hoàn thành" },
  { w1: "colleague", w2: "coworker", meaning: "đồng nghiệp công ty" },
  { w1: "guideline", w2: "instruction", meaning: "hướng dẫn, chỉ dẫn" },
  { w1: "confirm", w2: "verify", meaning: "xác nhận, kiểm chứng" },
  { w1: "cancel", w2: "call off", meaning: "hủy bỏ lịch trình" },
  { w1: "renovate", w2: "repair", meaning: "sửa chữa, tân trang" },
  { w1: "reimburse", w2: "refund", meaning: "hoàn tiền, bồi hoàn" },
  { w1: "mandatory", w2: "compulsory", meaning: "bắt buộc, cưỡng chế" },
  { w1: "exhibit", w2: "display", meaning: "trưng bày, triển lãm" },
  { w1: "oversee", w2: "supervise", meaning: "giám sát, quản lý" },
  { w1: "emphasize", w2: "highlight", meaning: "nhấn mạnh, làm nổi bật" },
  { w1: "achieve", w2: "accomplish", meaning: "đạt được thành tựu" },
  { w1: "rapid", w2: "fast", meaning: "nhanh chóng, tốc độ" },
  { w1: "sufficient", w2: "enough", meaning: "đầy đủ, thỏa đáng" },
  { w1: "opportunity", w2: "chance", meaning: "cơ hội, thời cơ" },
];

interface BlockTile {
  id: string;
  word: string;
  meaning: string;
  groupId: string;
  colorIndex: number;
  state: "normal" | "selected" | "blasting" | "hinted";
}

const BLOCK_COLORS = [
  {
    bg: "from-purple-500 to-indigo-600 border-indigo-700 shadow-purple-500/25",
    glow: "ring-purple-400 text-white",
  },
  {
    bg: "from-emerald-400 to-teal-600 border-teal-700 shadow-emerald-500/25",
    glow: "ring-emerald-400 text-white",
  },
  {
    bg: "from-amber-400 to-orange-500 border-orange-700 shadow-amber-500/25",
    glow: "ring-amber-400 text-white",
  },
  {
    bg: "from-blue-500 to-cyan-600 border-blue-700 shadow-blue-500/25",
    glow: "ring-blue-400 text-white",
  },
  {
    bg: "from-rose-500 to-pink-600 border-pink-700 shadow-rose-500/25",
    glow: "ring-rose-400 text-white",
  },
];

function SynonymBlockBlastGame({
  wordPool,
  soundEnabled,
  onSpeech,
  gameInfo,
  onBackToSetup,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  gameInfo?: { gameName: string; folderName: string; totalWords: number };
  onBackToSetup?: () => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [blocks, setBlocks] = useState<BlockTile[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [blastedPairsCount, setBlastedPairsCount] = useState(0);
  const [starsEarned, setStarsEarned] = useState(0);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ word: string; meaning: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [bombsRemaining, setBombsRemaining] = useState(2);

  const TARGET_PAIRS = 12; // Complete stage after 12 blasts

  // 1. Extract synonym pairs from current wordPool + fallback to TOEIC synonyms
  const availableSynonymPairs = useMemo(() => {
    const list: { w1: string; w2: string; meaning: string }[] = [];
    const seen = new Set<string>();

    // Step A: Extract directly from pool words that have "=" (e.g. opening = vacancy)
    wordPool.forEach((item) => {
      const parsed = analyzeWordStructure(item.word);
      if (parsed.synonym && parsed.headword) {
        const h = parsed.headword.toLowerCase().trim();
        const s = parsed.synonym.toLowerCase().trim();
        const key = [h, s].sort().join("<->");
        if (h && s && h !== s && !seen.has(key)) {
          seen.add(key);
          list.push({ w1: h, w2: s, meaning: item.meaning || "Từ đồng nghĩa" });
        }
      }
    });

    // Step B: Match wordPool words against TOEIC_SYNONYM_PAIRS
    const poolWordSet = new Set(
      wordPool.map((w) => analyzeWordStructure(w.word).headword.toLowerCase().trim())
    );

    TOEIC_SYNONYM_PAIRS.forEach((p) => {
      const key = [p.w1, p.w2].sort().join("<->");
      if (!seen.has(key)) {
        if (poolWordSet.has(p.w1) || poolWordSet.has(p.w2) || list.length < TARGET_PAIRS) {
          seen.add(key);
          list.push(p);
        }
      }
    });

    // Supplement with remaining pairs if needed
    TOEIC_SYNONYM_PAIRS.forEach((p) => {
      const key = [p.w1, p.w2].sort().join("<->");
      if (!seen.has(key) && list.length < 24) {
        seen.add(key);
        list.push(p);
      }
    });

    return list.sort(() => Math.random() - 0.5);
  }, [wordPool]);

  // Queue of remaining synonym pairs to drop into the board
  const pairQueueRef = useRef<{ w1: string; w2: string; meaning: string }[]>([]);

  // 2. Initialize Game Board (16 blocks: 8 pairs)
  const initBoard = useCallback(() => {
    const pairs = [...availableSynonymPairs].sort(() => Math.random() - 0.5);
    const initialPairs = pairs.slice(0, 8);
    pairQueueRef.current = pairs.slice(8);

    const newTiles: BlockTile[] = [];
    initialPairs.forEach((pair, idx) => {
      const colorIndex = idx % BLOCK_COLORS.length;
      const groupId = `grp-${Date.now()}-${idx}-${Math.random()}`;

      newTiles.push({
        id: `tile-${groupId}-1`,
        word: pair.w1,
        meaning: pair.meaning,
        groupId,
        colorIndex,
        state: "normal",
      });
      newTiles.push({
        id: `tile-${groupId}-2`,
        word: pair.w2,
        meaning: pair.meaning,
        groupId,
        colorIndex,
        state: "normal",
      });
    });

    // Shuffle the 16 blocks on the board
    setBlocks([...newTiles].sort(() => Math.random() - 0.5));
    setSelectedBlockId(null);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setBlastedPairsCount(0);
    setStarsEarned(0);
    setComboBanner(null);
    setActiveTooltip(null);
    setIsGameOver(false);
    setHintsRemaining(3);
    setBombsRemaining(2);
  }, [availableSynonymPairs]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // 3. Handle Tile Click / Selection
  const handleBlockClick = (clickedBlock: BlockTile) => {
    if (clickedBlock.state === "blasting" || isGameOver) return;

    playEffectSound("click", soundEnabled);
    onSpeech(clickedBlock.word);
    setActiveTooltip({ word: clickedBlock.word, meaning: clickedBlock.meaning });

    // If no block currently selected, select this one
    if (!selectedBlockId) {
      setSelectedBlockId(clickedBlock.id);
      setBlocks((prev) =>
        prev.map((b) => (b.id === clickedBlock.id ? { ...b, state: "selected" } : b))
      );
      return;
    }

    // If clicking same block, deselect
    if (selectedBlockId === clickedBlock.id) {
      setSelectedBlockId(null);
      setBlocks((prev) =>
        prev.map((b) => (b.id === clickedBlock.id ? { ...b, state: "normal" } : b))
      );
      return;
    }

    // Two blocks chosen! Check if they are synonyms (same groupId)
    const firstBlock = blocks.find((b) => b.id === selectedBlockId);
    if (!firstBlock) return;

    if (firstBlock.groupId === clickedBlock.groupId) {
      // 💥 MATCH! BLOCK BLAST!
      playEffectSound("correct", soundEnabled);

      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      const comboMultiplier = Math.min(newCombo, 5);
      const points = 100 * comboMultiplier;
      setScore((s) => s + points);
      setBlastedPairsCount((c) => c + 1);

      const stars = 20 * comboMultiplier;
      setStarsEarned((st) => st + stars);
      addFarmStars(stars);

      // Record to DB & Leitner
      const matchedItem = wordPool.find(
        (w) =>
          w.word.toLowerCase().includes(firstBlock.word.toLowerCase()) ||
          w.word.toLowerCase().includes(clickedBlock.word.toLowerCase())
      );
      if (matchedItem && onWordAnswered) {
        onWordAnswered(matchedItem, true);
      } else {
        recordWordProgressToDb({
          word: `${firstBlock.word} = ${clickedBlock.word}`,
          meaning: clickedBlock.meaning,
          isCorrect: true,
        });
      }

      // Announce Combo
      if (newCombo >= 4) {
        setComboBanner(`💎 MEGA BLAST x${newCombo}! +${points} pts`);
      } else if (newCombo >= 2) {
        setComboBanner(`🔥 COMBO BLAST x${newCombo}! +${points} pts`);
      } else {
        setComboBanner(`💥 BLAST! +${points} pts`);
      }
      setTimeout(() => setComboBanner(null), 1400);

      // Play blasting animation
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === firstBlock.id || b.id === clickedBlock.id
            ? { ...b, state: "blasting" }
            : b
        )
      );
      setSelectedBlockId(null);

      // Pronounce synonym word
      setTimeout(() => {
        onSpeech(clickedBlock.word);
      }, 350);

      // Replenish new pair after blast animation
      setTimeout(() => {
        const nextBlastedTotal = blastedPairsCount + 1;
        if (nextBlastedTotal >= TARGET_PAIRS) {
          setIsGameOver(true);
          playEffectSound("victory", soundEnabled);
          onGameComplete?.();
          return;
        }

        // Get a new pair from queue or fallback
        let nextPair = pairQueueRef.current.shift();
        if (!nextPair) {
          // Recycle from available pairs
          const fresh = [...availableSynonymPairs].sort(() => Math.random() - 0.5);
          nextPair = fresh[0];
          pairQueueRef.current = fresh.slice(1);
        }

        const newGroupId = `grp-rep-${Date.now()}-${Math.random()}`;
        const colorIndex = Math.floor(Math.random() * BLOCK_COLORS.length);

        const newTileA: BlockTile = {
          id: `tile-${newGroupId}-A`,
          word: nextPair.w1,
          meaning: nextPair.meaning,
          groupId: newGroupId,
          colorIndex,
          state: "normal",
        };
        const newTileB: BlockTile = {
          id: `tile-${newGroupId}-B`,
          word: nextPair.w2,
          meaning: nextPair.meaning,
          groupId: newGroupId,
          colorIndex,
          state: "normal",
        };

        setBlocks((prev) => {
          const filtered = prev.filter(
            (b) => b.id !== firstBlock.id && b.id !== clickedBlock.id
          );
          // Drop into board at random positions
          const updated = [...filtered];
          const insertIdx1 = Math.floor(Math.random() * (updated.length + 1));
          updated.splice(insertIdx1, 0, newTileA);
          const insertIdx2 = Math.floor(Math.random() * (updated.length + 1));
          updated.splice(insertIdx2, 0, newTileB);
          return updated;
        });
      }, 400);
    } else {
      // ❌ WRONG! Not a synonym pair
      playEffectSound("wrong", soundEnabled);
      setCombo(0);

      // Shake animation
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === firstBlock.id || b.id === clickedBlock.id
            ? { ...b, state: "normal" }
            : b
        )
      );
      setSelectedBlockId(null);
    }
  };

  // Booster: 💡 Gợi ý 1 cặp từ
  const handleUseHint = () => {
    if (hintsRemaining <= 0 || isGameOver) return;
    playEffectSound("click", soundEnabled);
    setHintsRemaining((h) => h - 1);

    // Find any existing group with 2 blocks on the board
    const groupMap = new Map<string, BlockTile[]>();
    blocks.forEach((b) => {
      const arr = groupMap.get(b.groupId) || [];
      arr.push(b);
      groupMap.set(b.groupId, arr);
    });

    const matchingGroup = Array.from(groupMap.values()).find((arr) => arr.length >= 2);
    if (matchingGroup) {
      const [b1, b2] = matchingGroup;
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === b1.id || b.id === b2.id ? { ...b, state: "hinted" } : b
        )
      );
      setActiveTooltip({
        word: `${b1.word} = ${b2.word}`,
        meaning: `Cặp từ đồng nghĩa: ${b1.meaning}`,
      });
      setTimeout(() => {
        setBlocks((prev) =>
          prev.map((b) => (b.state === "hinted" ? { ...b, state: "normal" } : b))
        );
      }, 2500);
    }
  };

  // Booster: 💣 Bom nổ ngẫu nhiên 1 cặp
  const handleUseBomb = () => {
    if (bombsRemaining <= 0 || isGameOver) return;
    playEffectSound("click", soundEnabled);
    setBombsRemaining((b) => b - 1);

    const groupMap = new Map<string, BlockTile[]>();
    blocks.forEach((b) => {
      const arr = groupMap.get(b.groupId) || [];
      arr.push(b);
      groupMap.set(b.groupId, arr);
    });

    const matchingGroup = Array.from(groupMap.values()).find((arr) => arr.length >= 2);
    if (matchingGroup) {
      const [b1, b2] = matchingGroup;
      setSelectedBlockId(b1.id);
      handleBlockClick(b2);
    }
  };

  // Booster: 🔄 Đảo khối trên bảng
  const handleShuffleBoard = () => {
    playEffectSound("click", soundEnabled);
    setSelectedBlockId(null);
    setBlocks((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  // Victory Game Over Screen
  if (isGameOver) {
    return (
      <div
        className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-3xl border shadow-2xl text-center space-y-6 animate-fade-up my-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-purple-600 text-white flex items-center justify-center text-4xl mx-auto shadow-lg shadow-purple-500/30 animate-bounce">
          💥
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500">
            CHIẾN THẮNG BLOCK BLAST!
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Bạn đã nổ tung {blastedPairsCount} cặp từ đồng nghĩa với chuỗi combo cực đỉnh!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">{score}</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)]">Điểm số</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-black text-amber-500">🔥 x{maxCombo}</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)]">Combo cao nhất</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-black text-emerald-500">+{starsEarned} ⭐</span>
            <span className="text-[11px] font-bold text-[var(--text-muted)]">Sao nông trại</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={initBoard}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-102 active:scale-98"
          >
            <span>🔄</span>
            <span>Chơi vòng mới</span>
          </button>
          {onBackToSetup && (
            <button
              type="button"
              onClick={onBackToSetup}
              className="w-full sm:flex-1 py-3.5 rounded-xl border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ borderColor: "var(--border)" }}
            >
              <span>⚙️</span>
              <span>Đổi trò chơi</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-up">
      {/* Top Header stats toolbar */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 relative overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs sm:text-sm font-extrabold">
          <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center gap-1.5 shadow-2xs">
            <span>💥 Block Blast Đồng Nghĩa</span>
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-[var(--text-primary)]">
            🎯 Đã nổ: <strong className="text-purple-600 dark:text-purple-400">{blastedPairsCount}/{TARGET_PAIRS}</strong> cặp
          </span>
          {combo > 1 && (
            <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs animate-bounce shadow-xs">
              🔥 x{combo}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[var(--text-muted)] block">ĐIỂM</span>
            <span className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400">
              {score}
            </span>
          </div>
          {onBackToSetup && (
            <button
              type="button"
              onClick={onBackToSetup}
              className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer px-2 py-1 rounded-lg border border-[var(--border)]"
              title="Đổi thiết lập / Thoát game"
            >
              ⚙️ Thoát
            </button>
          )}
        </div>

        {/* Dynamic Combo Floating Banner */}
        {comboBanner && (
          <div className="absolute inset-0 bg-purple-600/90 backdrop-blur-xs flex items-center justify-center text-white font-black text-base sm:text-lg tracking-wider animate-in zoom-in-75 duration-150 z-30 shadow-lg">
            {comboBanner}
          </div>
        )}
      </div>

      {/* Progress Bar towards Stage Target */}
      <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, (blastedPairsCount / TARGET_PAIRS) * 100)}%` }}
        />
      </div>

      {/* Main Block Blast Game Board (Chunky 3D Block Grid) */}
      <div
        className="p-4 sm:p-6 rounded-3xl border shadow-xl relative select-none space-y-4"
        style={{
          background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-subtle) 100%)",
          borderColor: "var(--border)",
        }}
      >
        {/* Instruction pill */}
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] px-1">
          <span className="flex items-center gap-1">
            <span>👉</span> Chọn 2 khối chứa <strong>từ đồng nghĩa</strong> để kích hoạt nổ!
          </span>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-extrabold">
            +{starsEarned} ⭐
          </span>
        </div>

        {/* 4x4 Grid of Chunky 3D Word Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {blocks.map((b) => {
            const isSelected = selectedBlockId === b.id;
            const isBlasting = b.state === "blasting";
            const isHinted = b.state === "hinted";
            const styleColor = BLOCK_COLORS[b.colorIndex % BLOCK_COLORS.length];

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleBlockClick(b)}
                className={`relative min-h-[76px] sm:min-h-[88px] p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 group overflow-hidden ${
                  isBlasting
                    ? "scale-115 rotate-3 bg-white text-purple-700 ring-4 ring-amber-400 animate-ping opacity-75"
                    : isSelected
                    ? `bg-gradient-to-b ${styleColor.bg} ring-4 ring-white shadow-2xl scale-106 -translate-y-1.5 z-20`
                    : isHinted
                    ? `bg-gradient-to-b from-amber-400 to-yellow-500 border-b-4 border-yellow-700 text-slate-900 ring-4 ring-amber-300 animate-pulse scale-104 z-10`
                    : `bg-gradient-to-b ${styleColor.bg} hover:scale-103 hover:-translate-y-1 active:scale-95 active:translate-y-0.5`
                }`}
                title={`Bấm để chọn: "${b.word}"`}
              >
                {/* Shiny top glass highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-2xl" />

                {/* English Word */}
                <span className="font-black text-xs sm:text-sm tracking-wide capitalize z-10 drop-shadow-sm line-clamp-2 px-1">
                  {b.word}
                </span>

                {/* Selected or Hinted Badge */}
                {isSelected && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/30 px-2 py-0.2 rounded-full mt-1 z-10">
                    Đang chọn
                  </span>
                )}
                {isHinted && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-white px-2 py-0.2 rounded-full mt-1 z-10">
                    Gợi ý 💡
                  </span>
                )}

                {/* Sparkle burst decoration on blast */}
                {isBlasting && (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl animate-spin pointer-events-none">
                    ✨
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tooltip & Word Meaning Banner */}
        <div
          className="p-3 sm:p-3.5 rounded-2xl border text-center transition-all min-h-[50px] flex items-center justify-center shadow-inner"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
        >
          {activeTooltip ? (
            <div className="text-xs sm:text-sm animate-fade-up">
              <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase">
                &ldquo;{activeTooltip.word}&rdquo;
              </span>
              <span className="text-[var(--text-muted)] mx-1.5">•</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {activeTooltip.meaning}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)] italic">
              Bấm vào bất kỳ khối nào để nghe phát âm và xem nghĩa tiếng Việt
            </span>
          )}
        </div>

        {/* Boosters & Power-ups */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            {/* Gợi ý Booster */}
            <button
              type="button"
              onClick={handleUseHint}
              disabled={hintsRemaining <= 0 || isGameOver}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              style={{ borderColor: "var(--border)" }}
              title="Tìm và soi sáng 1 cặp từ đồng nghĩa trên bảng"
            >
              <span>💡 Gợi ý</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                {hintsRemaining}
              </span>
            </button>

            {/* Bom nổ Booster */}
            <button
              type="button"
              onClick={handleUseBomb}
              disabled={bombsRemaining <= 0 || isGameOver}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              style={{ borderColor: "var(--border)" }}
              title="Kích nổ tự động 1 cặp từ đồng nghĩa bất kỳ"
            >
              <span>💣 Bom nổ</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-black">
                {bombsRemaining}
              </span>
            </button>
          </div>

          {/* Đảo bảng Booster */}
          <button
            type="button"
            onClick={handleShuffleBoard}
            className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-[var(--bg-muted)] shadow-2xs"
            style={{ borderColor: "var(--border)" }}
            title="Xáo trộn lại vị trí các khối trên bảng"
          >
            <span>🔄 Đảo bảng</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// GAME: MULTI-SELECT QUIZ (TRẮC NGHIỆM ĐA ĐÁP ÁN)
// ==========================================

const COMMON_EXTRA_SYNONYMS: Record<string, { synonyms: string[]; viMeanings: string[] }> = {
  "mobile phone": {
    synonyms: ["cellphone", "cellular phone", "smartphone"],
    viMeanings: ["điện thoại di động", "thiết bị di động cầm tay", "điện thoại cầm tay"],
  },
  cellphone: {
    synonyms: ["mobile phone", "cellular phone", "smartphone"],
    viMeanings: ["điện thoại di động", "điện thoại cầm tay"],
  },
  smartphone: {
    synonyms: ["mobile phone", "cellphone"],
    viMeanings: ["điện thoại thông minh", "điện thoại di động"],
  },
  opening: {
    synonyms: ["vacancy", "job opportunity"],
    viMeanings: ["vị trí tuyển dụng", "vị trí còn trống", "cơ hội việc làm"],
  },
  requirement: {
    synonyms: ["prerequisite", "condition"],
    viMeanings: ["điều kiện tiên quyết", "yêu cầu bắt buộc"],
  },
  meet: {
    synonyms: ["satisfy", "fulfill"],
    viMeanings: ["thỏa mãn yêu cầu", "đáp ứng tiêu chuẩn"],
  },
  purchase: {
    synonyms: ["buy", "acquire"],
    viMeanings: ["mua sắm", "mua hàng", "tậu về"],
  },
  commence: {
    synonyms: ["start", "begin", "launch"],
    viMeanings: ["bắt đầu", "khởi đầu", "khai mạc"],
  },
  terminate: {
    synonyms: ["end", "conclude", "cease"],
    viMeanings: ["chấm dứt", "kết thúc", "dừng lại"],
  },
  annual: {
    synonyms: ["yearly", "every year"],
    viMeanings: ["hàng năm", "thường niên", "mỗi năm một lần"],
  },
  obtain: {
    synonyms: ["acquire", "get", "gain"],
    viMeanings: ["đạt được", "thu được", "giành được"],
  },
  notify: {
    synonyms: ["inform", "advise"],
    viMeanings: ["thông báo", "báo tin", "cho biết"],
  },
  permit: {
    synonyms: ["allow", "authorize"],
    viMeanings: ["cho phép", "cấp phép", "chấp thuận"],
  },
  finish: {
    synonyms: ["complete", "finalize"],
    viMeanings: ["hoàn thành", "xong xuôi", "kết thúc"],
  },
  expand: {
    synonyms: ["enlarge", "extend", "broaden"],
    viMeanings: ["mở rộng", "phát triển thêm", "nới rộng"],
  },
  provide: {
    synonyms: ["supply", "give", "furnish"],
    viMeanings: ["cung cấp", "tiếp tế", "trang bị"],
  },
  assist: {
    synonyms: ["help", "support", "aid"],
    viMeanings: ["trợ giúp", "hỗ trợ", "giúp đỡ"],
  },
  modify: {
    synonyms: ["change", "alter", "adjust"],
    viMeanings: ["thay đổi", "chỉnh sửa", "điều chỉnh"],
  },
  revenue: {
    synonyms: ["income", "earnings", "turnover"],
    viMeanings: ["doanh thu", "thu nhập", "tiền lời thu về"],
  },
  client: {
    synonyms: ["customer", "patron", "buyer"],
    viMeanings: ["khách hàng", "đối tác mua hàng"],
  },
  objective: {
    synonyms: ["goal", "target", "aim"],
    viMeanings: ["mục tiêu", "đích đến", "chỉ tiêu phấn đấu"],
  },
  evaluate: {
    synonyms: ["assess", "appraise", "estimate"],
    viMeanings: ["đánh giá", "thẩm định", "xét định"],
  },
  propose: {
    synonyms: ["suggest", "recommend"],
    viMeanings: ["đề xuất", "gợi ý", "kiến nghị"],
  },
  reduce: {
    synonyms: ["decrease", "cut down", "diminish"],
    viMeanings: ["giảm bớt", "hạ thấp", "cắt giảm"],
  },
  contract: {
    synonyms: ["agreement", "deal", "compact"],
    viMeanings: ["hợp đồng", "thỏa thuận", "giao kèo"],
  },
  policy: {
    synonyms: ["regulation", "rule", "guideline"],
    viMeanings: ["chính sách", "quy định", "điều lệ"],
  },
  deadline: {
    synonyms: ["due date", "time limit"],
    viMeanings: ["hạn chót", "thời hạn hoàn thành", "ngày đến hạn"],
  },
  colleague: {
    synonyms: ["coworker", "peer", "workmate"],
    viMeanings: ["đồng nghiệp", "bạn cùng cơ quan", "người làm cùng"],
  },
  guideline: {
    synonyms: ["instruction", "direction", "protocol"],
    viMeanings: ["hướng dẫn", "chỉ dẫn", "nguyên tắc định hướng"],
  },
  confirm: {
    synonyms: ["verify", "validate", "check"],
    viMeanings: ["xác nhận", "kiểm chứng", "chứng thực"],
  },
  cancel: {
    synonyms: ["call off", "abort", "revoke"],
    viMeanings: ["hủy bỏ", "bãi bỏ", "hủy lịch"],
  },
  renovate: {
    synonyms: ["repair", "remodel", "refurbish"],
    viMeanings: ["sửa chữa", "tân trang", "nâng cấp"],
  },
  reimburse: {
    synonyms: ["refund", "repay", "compensate"],
    viMeanings: ["hoàn tiền", "bồi hoàn", "thanh toán lại"],
  },
  mandatory: {
    synonyms: ["compulsory", "obligatory", "required"],
    viMeanings: ["bắt buộc", "cưỡng chế", "bắt buộc phải theo"],
  },
  exhibit: {
    synonyms: ["display", "show", "showcase"],
    viMeanings: ["trưng bày", "triển lãm", "trình chiếu"],
  },
  oversee: {
    synonyms: ["supervise", "manage", "monitor"],
    viMeanings: ["giám sát", "quản lý", "trông coi"],
  },
  emphasize: {
    synonyms: ["highlight", "stress", "underline"],
    viMeanings: ["nhấn mạnh", "làm nổi bật", "chú trọng"],
  },
  achieve: {
    synonyms: ["accomplish", "attain", "reach"],
    viMeanings: ["đạt được", "hoàn thành mục tiêu", "gặt hái"],
  },
  rapid: {
    synonyms: ["fast", "quick", "speedy"],
    viMeanings: ["nhanh chóng", "thần tốc", "chóng vánh"],
  },
  sufficient: {
    synonyms: ["enough", "adequate", "satisfactory"],
    viMeanings: ["đầy đủ", "thỏa đáng", "vừa đủ"],
  },
  opportunity: {
    synonyms: ["chance", "occasion", "opening"],
    viMeanings: ["cơ hội", "thời cơ", "dịp thuận lợi"],
  },
};

interface MultiSelectOption {
  id: string;
  text: string;
  englishWord: string;
  phonetic?: string;
  isCorrect: boolean;
  type: "meaning" | "synonym" | "distractor";
  badgeLabel?: string;
}

interface MultiSelectQuestion {
  targetWord: SpacedWordItem;
  options: MultiSelectOption[];
  correctAnswersCount: number;
}

function MultiSelectQuizGame({
  wordPool,
  soundEnabled,
  onSpeech,
  gameInfo,
  onBackToSetup,
  onWordAnswered,
  onGameComplete,
}: {
  wordPool: SpacedWordItem[];
  soundEnabled: boolean;
  onSpeech: (word: string) => void;
  gameInfo?: { gameName: string; folderName: string; totalWords: number };
  onBackToSetup?: () => void;
  onWordAnswered?: (wordItem: SpacedWordItem, isCorrect: boolean) => void;
  onGameComplete?: () => void;
}) {
  const [questions, setQuestions] = useState<MultiSelectQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<"perfect" | "partial" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [farmStarsEarned, setFarmStarsEarned] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // 1. Build questions list from wordPool
  const initQuestions = useCallback(() => {
    if (!wordPool || wordPool.length === 0) return;

    // Use full wordPool selected by user (e.g. 5, 10, 20, 30, 50, or all 65+)
    const chosenTargets = [...wordPool].sort(() => Math.random() - 0.5);

    const generated: MultiSelectQuestion[] = chosenTargets.map((target) => {
      const analysis = analyzeWordStructure(target.word);
      const headLower = analysis.headword.toLowerCase().trim();

      // Collect correct options
      const correctPool: { text: string; englishWord: string; phonetic?: string; type: "meaning" | "synonym"; badgeLabel?: string }[] = [];

      // A. Meaning chunks from target.meaning
      if (target.meaning) {
        const parts = target.meaning
          .split(/[,;/]|(\s+hoặc\s+)|(\s+và\s+)/)
          .map((p) => (p || "").trim())
          .filter((p) => p.length >= 2 && !["hoặc", "và"].includes(p.toLowerCase()));
        parts.forEach((p) => {
          if (!correctPool.some((c) => c.text.toLowerCase() === p.toLowerCase())) {
            correctPool.push({
              text: p,
              englishWord: target.word,
              phonetic: analysis.phonetic,
              type: "meaning",
              badgeLabel: "Nghĩa tiếng Việt",
            });
          }
        });
      }

      // B. Synonyms from analyzeWordStructure
      if (analysis.synonym) {
        const synParts = analysis.synonym
          .split(/[,;/=]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 2);
        synParts.forEach((sp) => {
          if (!correctPool.some((c) => c.text.toLowerCase() === sp.toLowerCase())) {
            correctPool.push({
              text: sp,
              englishWord: sp,
              type: "synonym",
              badgeLabel: "Từ đồng nghĩa",
            });
          }
        });
      }

      // C. Built-in extra synonyms / collocations dictionary
      const dictEntry = COMMON_EXTRA_SYNONYMS[headLower];
      if (dictEntry) {
        dictEntry.viMeanings.forEach((vm) => {
          if (!correctPool.some((c) => c.text.toLowerCase() === vm.toLowerCase())) {
            correctPool.push({
              text: vm,
              englishWord: target.word,
              phonetic: analysis.phonetic,
              type: "meaning",
              badgeLabel: "Nghĩa tiếng Việt",
            });
          }
        });
        dictEntry.synonyms.forEach((syn) => {
          if (!correctPool.some((c) => c.text.toLowerCase() === syn.toLowerCase())) {
            correctPool.push({
              text: syn,
              englishWord: syn,
              type: "synonym",
              badgeLabel: "Từ đồng nghĩa (EN)",
            });
          }
        });
      }

      // D. TOEIC synonym pairs
      TOEIC_SYNONYM_PAIRS.forEach((pair) => {
        if (pair.w1.toLowerCase() === headLower) {
          if (!correctPool.some((c) => c.text.toLowerCase() === pair.w2.toLowerCase())) {
            correctPool.push({
              text: pair.w2,
              englishWord: pair.w2,
              type: "synonym",
              badgeLabel: "Từ đồng nghĩa TOEIC",
            });
          }
        } else if (pair.w2.toLowerCase() === headLower) {
          if (!correctPool.some((c) => c.text.toLowerCase() === pair.w1.toLowerCase())) {
            correctPool.push({
              text: pair.w1,
              englishWord: pair.w1,
              type: "synonym",
              badgeLabel: "Từ đồng nghĩa TOEIC",
            });
          }
        }
      });

      // Ensure at least 1 correct option
      if (correctPool.length === 0) {
        correctPool.push({
          text: target.meaning || target.word,
          englishWord: target.word,
          phonetic: analysis.phonetic,
          type: "meaning",
          badgeLabel: "Nghĩa chuẩn",
        });
      }

      // Filter and clean duplicate entries
      const uniqueCorrect: { text: string; englishWord: string; phonetic?: string; type: "meaning" | "synonym"; badgeLabel?: string }[] = [];
      correctPool.forEach((item) => {
        const cleanText = item.text.trim();
        if (!cleanText) return;
        if (!uniqueCorrect.some((c) => c.text.toLowerCase() === cleanText.toLowerCase())) {
          uniqueCorrect.push({ ...item, text: cleanText });
        }
      });

      // Genuine correct answers: If the word has 1 meaning/synonym, only 1 answer is correct!
      // If it has multiple real meanings or synonyms, pick up to 3.
      const shuffledCorrect = [...uniqueCorrect].sort(() => Math.random() - 0.5);
      const chosenCorrect = shuffledCorrect.slice(0, Math.min(3, uniqueCorrect.length));

      // Collect distractors from other words in pool
      const distractorCandidates: { text: string; englishWord: string; phonetic?: string }[] = [];
      wordPool.forEach((other) => {
        if (other.id === target.id) return;
        const otherAnalysis = analyzeWordStructure(other.word);
        const otherHead = otherAnalysis.headword.toLowerCase().trim();
        if (otherHead === headLower) return;

        if (other.meaning && !chosenCorrect.some((c) => c.text.toLowerCase() === other.meaning.toLowerCase().trim())) {
          distractorCandidates.push({
            text: other.meaning.trim(),
            englishWord: other.word,
            phonetic: otherAnalysis.phonetic,
          });
        }
        if (otherHead && !chosenCorrect.some((c) => c.text.toLowerCase() === otherHead)) {
          distractorCandidates.push({
            text: otherHead,
            englishWord: other.word,
            phonetic: otherAnalysis.phonetic,
          });
        }
      });

      // Dedup distractors: 3 distractors if 1 correct answer (4 total options); 2-3 if multiple
      const uniqueDistractors: { text: string; englishWord: string; phonetic?: string }[] = [];
      const seenDistractors = new Set<string>();
      [...distractorCandidates].sort(() => Math.random() - 0.5).forEach((d) => {
        const lower = d.text.toLowerCase();
        if (!seenDistractors.has(lower)) {
          seenDistractors.add(lower);
          uniqueDistractors.push(d);
        }
      });
      const neededDistractors = chosenCorrect.length === 1 ? 3 : Math.min(3, Math.max(2, 5 - chosenCorrect.length));
      const chosenDistractors = uniqueDistractors.slice(0, neededDistractors);

      // Combine options
      const finalOptions: MultiSelectOption[] = [
        ...chosenCorrect.map((c, i) => ({
          id: `opt-correct-${i}-${Date.now()}-${Math.random()}`,
          text: c.text,
          englishWord: c.englishWord || (c.type === "synonym" ? c.text : target.word),
          phonetic: c.phonetic,
          isCorrect: true,
          type: c.type,
          badgeLabel: c.badgeLabel,
        })),
        ...chosenDistractors.map((d, i) => ({
          id: `opt-wrong-${i}-${Date.now()}-${Math.random()}`,
          text: d.text,
          englishWord: d.englishWord,
          phonetic: d.phonetic,
          isCorrect: false,
          type: "distractor" as const,
          badgeLabel: "Đáp án nhiễu",
        })),
      ].sort(() => Math.random() - 0.5);

      return {
        targetWord: target,
        options: finalOptions,
        correctAnswersCount: chosenCorrect.length,
      };
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setSelectedIds([]);
    setIsSubmitted(false);
    setSubmissionResult(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setFarmStarsEarned(0);
    setPerfectCount(0);
    setIsGameOver(false);
  }, [wordPool]);

  useEffect(() => {
    initQuestions();
  }, [initQuestions]);

  const currentQ = questions[currentIndex];

  // Auto pronounce target word when switching question
  useEffect(() => {
    if (currentQ?.targetWord) {
      onSpeech(currentQ.targetWord.word);
    }
  }, [currentIndex, currentQ?.targetWord, onSpeech]);

  // Handle option toggle & pronounce English word when selected
  const toggleOption = (id: string) => {
    if (isSubmitted || isGameOver) return;
    playEffectSound("click", soundEnabled);

    const targetOpt = currentQ?.options.find((o) => o.id === id);

    if (currentQ?.correctAnswersCount === 1) {
      // Khi câu hỏi chỉ có 1 đáp án đúng: chọn ngay đáp án đó
      const willBeSelected = !selectedIds.includes(id);
      setSelectedIds(willBeSelected ? [id] : []);
      if (willBeSelected && targetOpt) {
        onSpeech(targetOpt.englishWord || targetOpt.text);
      }
    } else {
      const willBeSelected = !selectedIds.includes(id);
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      if (willBeSelected && targetOpt) {
        onSpeech(targetOpt.englishWord || targetOpt.text);
      }
    }
  };

  // Keyboard shortcut support: 1..5 to toggle, Enter to submit/next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (!isSubmitted) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= (currentQ?.options.length || 0)) {
          e.preventDefault();
          toggleOption(currentQ!.options[num - 1].id);
        } else if (e.key === "Enter" && selectedIds.length > 0) {
          e.preventDefault();
          handleSubmitAnswer();
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (isSubmitted || !currentQ || selectedIds.length === 0) return;

    setIsSubmitted(true);

    const correctOptions = currentQ.options.filter((o) => o.isCorrect);
    const correctIds = new Set(correctOptions.map((o) => o.id));

    const selectedCorrectCount = selectedIds.filter((id) => correctIds.has(id)).length;
    const selectedWrongCount = selectedIds.filter((id) => !correctIds.has(id)).length;

    const isAllCorrect =
      selectedCorrectCount === correctOptions.length && selectedWrongCount === 0;
    const isPartial = selectedCorrectCount > 0 && selectedWrongCount === 0;

    if (isAllCorrect) {
      playEffectSound("correct", soundEnabled);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      const comboMult = nextStreak >= 3 ? 2 : 1;
      const points = 100 * comboMult;
      setScore((s) => s + points);
      const stars = 15;
      setFarmStarsEarned((f) => f + stars);
      addFarmStars(stars);
      setPerfectCount((p) => p + 1);
      setSubmissionResult("perfect");
    } else if (isPartial) {
      playEffectSound("correct", soundEnabled);
      setStreak(1);
      setScore((s) => s + 50);
      const stars = 5;
      setFarmStarsEarned((f) => f + stars);
      addFarmStars(stars);
      setSubmissionResult("partial");
    } else {
      playEffectSound("wrong", soundEnabled);
      setStreak(0);
      setSubmissionResult("wrong");
    }

    // Persist to DB & Leitner
    if (currentQ?.targetWord) {
      if (onWordAnswered) {
        onWordAnswered(currentQ.targetWord, isAllCorrect);
      } else {
        recordWordProgressToDb({
          word: currentQ.targetWord.word,
          meaning: currentQ.targetWord.meaning,
          example: currentQ.targetWord.example,
          listName: currentQ.targetWord.topic,
          isCorrect: isAllCorrect,
        });
      }
    }
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedIds([]);
      setIsSubmitted(false);
      setSubmissionResult(null);
    } else {
      // Game completed! Bonus farm stars
      setIsGameOver(true);
      playEffectSound("victory", soundEnabled);
      addFarmStars(30);
      setFarmStarsEarned((s) => s + 30);
      onGameComplete?.();
    }
  };

  if (!currentQ && !isGameOver) {
    return (
      <div className="p-8 text-center text-sm font-bold text-[var(--text-muted)] animate-pulse">
        Đang khởi tạo các câu hỏi trắc nghiệm đa đáp án...
      </div>
    );
  }

  // GAME OVER VIEW
  if (isGameOver) {
    const accuracy = Math.round((perfectCount / Math.max(1, questions.length)) * 100);
    return (
      <div
        className="p-6 sm:p-10 rounded-3xl border shadow-lg text-center max-w-xl mx-auto space-y-6 animate-fade-up"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 mx-auto flex items-center justify-center text-4xl shadow-lg ring-8 ring-amber-500/20">
          🏆
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            Hoàn Thành Vòng Ôn Tập!
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Bạn đã xuất sắc vượt qua toàn bộ câu hỏi trắc nghiệm đa đáp án.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Điểm số</div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{score}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Chính xác</div>
            <div className="text-xl font-black text-emerald-500 mt-0.5">{accuracy}%</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Chuỗi đỉnh cao</div>
            <div className="text-xl font-black text-rose-500 mt-0.5">🔥 x{maxStreak}</div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--bg-muted)] border" style={{ borderColor: "var(--border)" }}>
            <div className="text-[11px] font-bold text-[var(--text-muted)]">Sao nông trại</div>
            <div className="text-xl font-black text-amber-500 mt-0.5">⭐ +{farmStarsEarned}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={initQuestions}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🔄 Chơi lại vòng mới</span>
          </button>
          {onBackToSetup && (
            <button
              type="button"
              onClick={onBackToSetup}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border hover:bg-[var(--bg-muted)] font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              <span>⚙️ Đổi chế độ chơi</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const analysis = analyzeWordStructure(currentQ.targetWord.word);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-fade-up">
      {/* 1. TOP STATUS BAR */}
      <div
        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] bg-[var(--bg-muted)] px-3 py-1 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            Câu {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500">⭐ {score} pts</span>
            {streak > 1 && (
              <span className="text-xs font-extrabold text-rose-500 animate-pulse">🔥 x{streak}</span>
            )}
            {farmStarsEarned > 0 && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/15">
                +{farmStarsEarned} ⭐
              </span>
            )}
          </div>

          {onBackToSetup && (
            <button
              type="button"
              onClick={onBackToSetup}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all cursor-pointer shadow-2xs"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              title="Quay về màn hình chọn trò chơi"
            >
              ⚙️ Thoát
            </button>
          )}
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* 2. TARGET WORD CARD */}
      <div
        className="p-6 sm:p-7 rounded-3xl border shadow-sm text-center space-y-3 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05), rgba(59, 130, 246, 0.05))",
          borderColor: "var(--border)",
        }}
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wide">
          <span>🎯 CHỌN {currentQ.correctAnswersCount} ĐÁP ÁN ĐÚNG</span>
        </div>

        {/* Word Display & Audio Button */}
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            {analysis.headword}
          </h2>
          <button
            type="button"
            onClick={() => onSpeech(currentQ.targetWord.word)}
            className="w-10 h-10 rounded-full bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95"
            title="Nghe phát âm từ vựng"
          >
            🔊
          </button>
        </div>

        {/* Phonetics & Tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
          {analysis.phonetic && (
            <span className="font-mono text-[var(--text-muted)] bg-[var(--bg-muted)] px-2.5 py-0.5 rounded-lg border" style={{ borderColor: "var(--border)" }}>
              {analysis.phonetic}
            </span>
          )}
          {analysis.posTags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold uppercase font-mono text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>

        {currentQ.targetWord.example && (
          <p className="text-xs sm:text-sm italic opacity-75 max-w-lg mx-auto line-clamp-2 pt-1 text-[var(--text-secondary)]">
            &ldquo;{currentQ.targetWord.example}&rdquo;
          </p>
        )}
      </div>

      {/* 3. MULTI-SELECT OPTIONS LIST */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-1 font-bold text-[var(--text-muted)]">
          <span>Gợi ý: Nhấn phím [1 - {currentQ.options.length}] hoặc click chuột để chọn</span>
          <span>Đã chọn: {selectedIds.length} đáp án</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedIds.includes(opt.id);

            // Styling states
            let cardClasses = "p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1.5 text-left relative overflow-hidden ";
            let indicator = null;

            if (!isSubmitted) {
              if (isSelected) {
                cardClasses += "border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-400/30";
              } else {
                cardClasses += "border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700 hover:bg-[var(--bg-muted)]";
              }
            } else {
              // After Submit State
              if (opt.isCorrect && isSelected) {
                cardClasses += "border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-400/40 shadow-sm";
                indicator = (
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ✓ Chính xác
                  </span>
                );
              } else if (opt.isCorrect && !isSelected) {
                cardClasses += "border-amber-500 border-dashed bg-amber-500/10 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400/30";
                indicator = (
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ⚠️ Bị bỏ sót
                  </span>
                );
              } else if (!opt.isCorrect && isSelected) {
                cardClasses += "border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/40 shadow-sm";
                indicator = (
                  <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ✕ Chọn sai
                  </span>
                );
              } else {
                cardClasses += "border-[var(--border)] opacity-40 bg-[var(--bg-card)]";
                indicator = (
                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                    ✕ Sai
                  </span>
                );
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id)}
                disabled={isSubmitted}
                className={cardClasses}
                style={{
                  background: !isSelected && !isSubmitted ? "var(--bg-card)" : undefined,
                }}
              >
                {/* Hàng 1: Phím số, Checkbox, Từ chính & Nút loa / Kết quả */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Phím số tắt [1-4] */}
                    <span
                      className="w-5 h-5 bg-[var(--bg-muted)] border text-[10px] font-black text-[var(--text-muted)] flex items-center justify-center select-none shrink-0"
                      style={{ borderColor: "var(--border)", borderRadius: "4px" }}
                      title={`Nhấn phím ${idx + 1} trên bàn phím`}
                    >
                      {idx + 1}
                    </span>

                    {/* Checkbox box: RÕ RÀNG HÌNH VUÔNG CHUẨN CHECKBOX (border-radius: 4px) */}
                    <div
                      className={`w-5.5 h-5.5 border-2 flex items-center justify-center transition-all shrink-0 ${
                        isSubmitted
                          ? opt.isCorrect && isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : opt.isCorrect && !isSelected
                            ? "border-amber-500 bg-amber-500/15 text-amber-600 border-dashed"
                            : !opt.isCorrect && isSelected
                            ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                            : "border-[var(--border)] bg-[var(--bg-subtle)] opacity-40"
                          : isSelected
                          ? "bg-purple-600 border-purple-600 text-white shadow-xs scale-105"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-500 shadow-2xs"
                      }`}
                      style={{ borderRadius: "4px" }}
                    >
                      {isSubmitted ? (
                        opt.isCorrect && isSelected ? (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : opt.isCorrect && !isSelected ? (
                          <span className="text-[10px] font-black text-amber-600">✓</span>
                        ) : !opt.isCorrect && isSelected ? (
                          <span className="text-xs font-black text-white">✕</span>
                        ) : null
                      ) : isSelected ? (
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </div>

                    {/* Từ vựng chính */}
                    <span className="font-extrabold text-sm sm:text-base leading-snug break-words">
                      {opt.text}
                    </span>
                  </div>

                  {/* Nút loa & Nhãn kết quả bên phải */}
                  <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpeech(opt.englishWord || opt.text);
                      }}
                      className="w-7 h-7 rounded-full bg-purple-500/10 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-2xs"
                      title={`Nghe phát âm tiếng Anh: "${opt.englishWord || opt.text}"`}
                    >
                      🔊
                    </button>
                    {indicator}
                  </div>
                </div>

                {/* Hàng 2 (khi đã nộp bài): Toàn bộ thông tin giải nghĩa TRÊN CÙNG 1 HÀNG */}
                {isSubmitted && (opt.englishWord || opt.phonetic || opt.badgeLabel) && (
                  <div className="flex items-center gap-2 pl-9 text-xs flex-wrap pt-0.5">
                    {opt.englishWord && opt.englishWord.toLowerCase() !== opt.text.toLowerCase() && (
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono flex items-center gap-1 shrink-0">
                        <span>🇬🇧</span>
                        <span>{opt.englishWord}</span>
                      </span>
                    )}

                    {opt.phonetic && (
                      <span className="font-mono text-[11px] text-[var(--text-muted)] opacity-80 shrink-0">
                        {opt.phonetic}
                      </span>
                    )}

                    {opt.badgeLabel && (
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] px-2 py-0.5 rounded-full bg-[var(--bg-muted)] border shrink-0" style={{ borderColor: "var(--border)" }}>
                        {opt.badgeLabel}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SUBMISSION FEEDBACK & ACTION BUTTONS */}
      {!isSubmitted ? (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] font-medium">
            💡 Chọn {currentQ.correctAnswersCount} đáp án đúng, sau đó bấm Xác nhận.
          </div>
          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={selectedIds.length === 0}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm text-white shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-102 active:scale-98 ring-2 ring-purple-400/30"
          >
            <span>Xác nhận đáp án ➔</span>
          </button>
        </div>
      ) : (
        <div
          className="p-5 rounded-2xl border space-y-3 animate-fade-up"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Result Banner */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {submissionResult === "perfect" ? "🎉" : submissionResult === "partial" ? "⚡" : "❌"}
              </span>
              <div>
                <h4 className="font-black text-sm sm:text-base">
                  {submissionResult === "perfect"
                    ? currentQ.correctAnswersCount === 1
                      ? "CHÍNH XÁC! (+15 ⭐)"
                      : "CHÍNH XÁC TUYỆT ĐỐI! (+15 ⭐)"
                    : submissionResult === "partial"
                    ? "ĐÚNG MỘT PHẦN! (+5 ⭐)"
                    : "CHƯA CHÍNH XÁC!"}
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {submissionResult === "perfect"
                    ? currentQ.correctAnswersCount === 1
                      ? "Bạn đã chọn chính xác đáp án đúng!"
                      : `Bạn đã tìm đúng tất cả ${currentQ.correctAnswersCount} đáp án chính xác!`
                    : submissionResult === "partial"
                    ? "Bạn đã chọn đúng một số đáp án nhưng còn bỏ sót hoặc chưa đầy đủ."
                    : "Hãy quan sát đáp án đúng được viền xanh và ghi nhớ nhé."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-sm text-white shadow-md bg-purple-600 hover:bg-purple-700 hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{currentIndex + 1 < questions.length ? "Câu tiếp theo ➔" : "Xem tổng kết 🏆"}</span>
              <span className="text-xs opacity-75 font-mono">(Enter)</span>
            </button>
          </div>

          {/* Target Word Explanation Summary */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-muted)] border text-xs space-y-1.5" style={{ borderColor: "var(--border)" }}>
            <div className="font-bold flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-400 font-black">Giải nghĩa đầy đủ:</span>
              <span className="font-extrabold">{currentQ.targetWord.meaning || "Không có nghĩa"}</span>
            </div>
            {analysis.synonym && (
              <div className="text-[var(--text-muted)]">
                <b>Đồng nghĩa / tương đương:</b> {analysis.synonym}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// CUSTOM FOLDER DROPDOWN (Khớp kiểu dáng Hình 2)
// ==========================================
interface CustomFolderDropdownProps {
  value: string;
  onChange: (val: string) => void;
  availableFolders: { name: string; count: number; source: "custom" | "preset" }[];
  customFolders: { name: string; count: number; source: "custom" | "preset" }[];
  presetFolders: { name: string; count: number; source: "custom" | "preset" }[];
  accentColor?: "purple" | "blue";
  source?: "all" | "custom" | "preset";
  className?: string;
}

function CustomFolderDropdown({
  value,
  onChange,
  availableFolders,
  customFolders,
  presetFolders,
  accentColor = "purple",
  source = "all",
  className = "",
}: CustomFolderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalAllWords = useMemo(
    () => availableFolders.reduce((sum, f) => sum + f.count, 0),
    [availableFolders]
  );

  const currentLabel = useMemo(() => {
    if (value === "all") {
      if (source === "custom") return `📁 Tất cả từ cá nhân (${totalAllWords} từ)`;
      if (source === "preset") return `📚 Tất cả chủ đề TOEIC (${totalAllWords} từ)`;
      return `⚡ Toàn bộ từ vựng (${totalAllWords} từ)`;
    }
    const foundCustom = customFolders.find((f) => f.name === value);
    if (foundCustom) return `📁 ${foundCustom.name} (${foundCustom.count} từ)`;
    const foundPreset = presetFolders.find((f) => f.name === value);
    if (foundPreset) return `📚 ${foundPreset.name} (${foundPreset.count} từ)`;
    return `📁 ${value}`;
  }, [value, totalAllWords, source, customFolders, presetFolders]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const isPurple = accentColor === "purple";
  const borderActive = isPurple ? "border-purple-500" : "border-blue-500";
  const ringActive = isPurple ? "ring-2 ring-purple-400/20" : "ring-2 ring-blue-400/20";
  const textAccent = isPurple ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400";
  const bgSelected = isPurple
    ? "bg-purple-500/12 text-purple-700 dark:text-purple-300 font-bold"
    : "bg-blue-500/12 text-blue-700 dark:text-blue-300 font-bold";
  const hoverItem = isPurple
    ? "hover:bg-purple-500/8 hover:text-purple-600 dark:hover:text-purple-400"
    : "hover:bg-blue-500/8 hover:text-blue-600 dark:hover:text-blue-400";

  // Filter folders by search query
  const filteredCustomFolders = useMemo(() => {
    if (!searchQuery.trim()) return customFolders;
    const q = searchQuery.toLowerCase().trim();
    return customFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [customFolders, searchQuery]);

  const filteredPresetFolders = useMemo(() => {
    if (!searchQuery.trim()) return presetFolders;
    const q = searchQuery.toLowerCase().trim();
    return presetFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [presetFolders, searchQuery]);

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Trigger: Nút bấm hiện đại, bo tròn tự nhiên */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={currentLabel}
        className={`w-full px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold bg-[var(--bg-card)] transition-all cursor-pointer select-none text-left rounded-xl border shadow-xs ${
          isOpen
            ? `${borderActive} ${ringActive}`
            : "hover:border-purple-400/70 dark:hover:border-purple-500/70"
        }`}
        style={{
          borderColor: isOpen ? undefined : "var(--border)",
          color: "var(--text-primary)",
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate pr-2 font-bold" title={currentLabel}>{currentLabel}</span>
        <span className={`text-[11px] ${textAccent} transition-transform duration-200 shrink-0 font-bold ml-1.5`}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown panel: Rộng rãi, không cắt chữ, hỗ trợ tìm kiếm nhanh */}
      {isOpen && (
        <div
          className={`absolute left-0 sm:left-auto right-0 top-full mt-1.5 z-50 w-full sm:w-[460px] max-w-[95vw] bg-[var(--bg-card)] border rounded-2xl shadow-2xl overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-150`}
          style={{
            background: "var(--bg-card)",
            borderColor: isPurple ? "rgba(168, 85, 247, 0.35)" : "rgba(59, 130, 246, 0.35)",
            boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.22), 0 6px 16px -2px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Ô tìm kiếm nhanh thư mục khi có nhiều thư mục */}
          {(customFolders.length + presetFolders.length > 2) && (
            <div className="p-1 mb-1.5 border-b border-[var(--border)]">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Gõ tìm nhanh tên thư mục..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-[var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] opacity-50">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-thin">
            {/* 1. NÚT CHỌN: TẤT CẢ */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                title={source === "custom" ? "Tất cả từ cá nhân" : source === "preset" ? "Tất cả chủ đề TOEIC" : "Toàn bộ từ vựng"}
                className={`w-full px-3 py-2 flex items-center justify-between text-xs sm:text-sm text-left rounded-xl transition-all cursor-pointer ${
                  value === "all" ? bgSelected : `text-[var(--text-primary)] ${hoverItem}`
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-base shrink-0">
                    {source === "preset" ? "📚" : source === "custom" ? "📁" : "⚡"}
                  </span>
                  <span className="font-bold">
                    {source === "custom"
                      ? "Tất cả từ cá nhân"
                      : source === "preset"
                      ? "Tất cả chủ đề TOEIC"
                      : "Toàn bộ từ vựng"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)]">
                    {totalAllWords} từ
                  </span>
                  {value === "all" && <span className={`text-xs font-black ${textAccent}`}>✓</span>}
                </div>
              </button>
            )}

            {/* 2. NHÓM: THƯ MỤC CÁ NHÂN */}
            {filteredCustomFolders.length > 0 && (
              <div className="pt-1">
                <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  <span>Thư mục cá nhân ({filteredCustomFolders.length})</span>
                  <span>{filteredCustomFolders.reduce((s, c) => s + c.count, 0)} từ</span>
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {filteredCustomFolders.map((f) => {
                    const isSelected = value === f.name;
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => handleSelect(f.name)}
                        title={f.name}
                        className={`w-full px-3 py-2 flex items-start justify-between text-xs sm:text-sm text-left rounded-xl transition-all cursor-pointer group ${
                          isSelected ? bgSelected : `text-[var(--text-primary)] ${hoverItem}`
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2 flex-1">
                          <span className="text-base shrink-0 mt-0.5">📁</span>
                          <span
                            className={`break-words leading-snug ${
                              isSelected ? "font-bold text-purple-700 dark:text-purple-300" : "font-medium"
                            }`}
                          >
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2 self-center">
                          <span className="text-[11px] font-semibold opacity-75 whitespace-nowrap bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                            {f.count} từ
                          </span>
                          {isSelected && <span className={`text-xs font-black ${textAccent}`}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. NHÓM: CHỦ ĐỀ BÀI HỌC TOEIC */}
            {filteredPresetFolders.length > 0 && (
              <div className="pt-2 mt-1 border-t border-[var(--border)]">
                <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  <span>Chủ đề TOEIC ({filteredPresetFolders.length})</span>
                  <span>{filteredPresetFolders.reduce((s, c) => s + c.count, 0)} từ</span>
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {filteredPresetFolders.map((f) => {
                    const isSelected = value === f.name;
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => handleSelect(f.name)}
                        title={f.name}
                        className={`w-full px-3 py-2 flex items-start justify-between text-xs sm:text-sm text-left rounded-xl transition-all cursor-pointer group ${
                          isSelected ? bgSelected : `text-[var(--text-primary)] ${hoverItem}`
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2 flex-1">
                          <span className="text-base shrink-0 mt-0.5">📚</span>
                          <span
                            className={`break-words leading-snug ${
                              isSelected ? "font-bold text-purple-700 dark:text-purple-300" : "font-medium"
                            }`}
                          >
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2 self-center">
                          <span className="text-[11px] font-semibold opacity-75 whitespace-nowrap bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                            {f.count} từ
                          </span>
                          {isSelected && <span className={`text-xs font-black ${textAccent}`}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Không tìm thấy kết quả */}
            {searchQuery && filteredCustomFolders.length === 0 && filteredPresetFolders.length === 0 && (
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                Không tìm thấy thư mục nào chứa &quot;<span className="font-bold">{searchQuery}</span>&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN SPACED REVIEW COMPONENT
// ==========================================
function SpacedReviewContent() {
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") as "leitner" | "game" | null;
  const initialSourceParam = searchParams.get("source") as "all" | "custom" | "preset" | null;
  const initialFolderParam = searchParams.get("folder");
  const dueParam = searchParams.get("due") === "true" || searchParams.get("dueOnly") === "true";

  // Mode: Leitner (Spaced Repetition) or Game (Gamified Learning)
  const [reviewMode, setReviewMode] = useState<"leitner" | "game">(
    modeParam === "game" ? "game" : "leitner"
  );

  // Sub-game choice in Game mode
  const [activeGame, setActiveGame] = useState<"match" | "quiz" | "scramble" | "listen" | "blockblast" | "multichoice">("match");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Backend Custom words
  const [customWords, setCustomWords] = useState<CustomWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [source, setSource] = useState<"all" | "custom" | "preset">(initialSourceParam || "all");
  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolderParam || "all");
  const [intervalFilter, setIntervalFilter] = useState<number | "all" | "due">(
    dueParam ? "due" : "all"
  );
  const [wordLimit, setWordLimit] = useState<number | "all">("all");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLeitnerStarted, setIsLeitnerStarted] = useState(false);

  // Farm stars state
  const [farmStars, setFarmStars] = useState<number>(getFarmStars());

  useEffect(() => {
    const handleStarsUpdate = (e: any) => {
      if (typeof e.detail === "number") setFarmStars(e.detail);
      else setFarmStars(getFarmStars());
    };
    window.addEventListener("farm-stars-updated", handleStarsUpdate);
    return () => window.removeEventListener("farm-stars-updated", handleStarsUpdate);
  }, []);

  // Current session deck
  const [deck, setDeck] = useState<SpacedWordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rememberedIds, setRememberedIds] = useState<Set<string>>(new Set());
  const [forgottenIds, setForgottenIds] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  // Available folders / topics extracted dynamically from custom & preset words
  const availableFolders = useMemo(() => {
    const map = new Map<string, { name: string; count: number; source: "custom" | "preset" }>();

    const allowCustom = source === "all" || source === "custom";
    const allowPreset = source === "all" || source === "preset" || (source === "custom" && customWords.length === 0);

    if (allowCustom && customWords.length > 0) {
      customWords.forEach((cw) => {
        const name = cw.listName || "Thư mục cá nhân";
        const cur = map.get(name);
        if (cur) cur.count++;
        else map.set(name, { name, count: 1, source: "custom" });
      });
    }

    if (allowPreset) {
      SPACED_REPETITION_PRESET_WORDS.forEach((pw) => {
        const name = pw.topic || "Chu kỳ TOEIC";
        const cur = map.get(name);
        if (cur) cur.count++;
        else map.set(name, { name, count: 1, source: "preset" });
      });
    }

    return Array.from(map.values());
  }, [source, customWords]);

  const customFolders = useMemo(() => availableFolders.filter((f) => f.source === "custom"), [availableFolders]);
  const presetFolders = useMemo(() => availableFolders.filter((f) => f.source === "preset"), [availableFolders]);

  // Helper to extract root word ID ignoring retry suffixes
  const extractRawWordId = (idStr: string): string => {
    const retryIdx = idStr.indexOf("-retry-");
    return retryIdx !== -1 ? idStr.substring(0, retryIdx) : idStr;
  };

  // Helper to sync progress to database backend for ANY word
  const syncWordProgress = async (
    rawId: string,
    stage: number,
    intervalDays: number,
    isCorrect?: boolean,
    wordItem?: SpacedWordItem
  ) => {
    // 1. If it's a custom word, update in-memory state
    if (rawId.startsWith("custom-")) {
      const numId = parseInt(rawId.replace("custom-", ""), 10);
      if (!isNaN(numId)) {
        setCustomWords((prev) =>
          prev.map((cw) => (cw.id === numId ? { ...cw, stage, intervalDays } : cw))
        );
      }
    }

    // 2. Persist to server database for ANY word (both custom and preset)
    const targetWord = wordItem || deck.find((w) => extractRawWordId(w.id) === rawId);
    if (targetWord) {
      await recordWordProgressToDb({
        word: targetWord.word,
        meaning: targetWord.meaning,
        example: targetWord.example,
        listName: targetWord.topic,
        stage,
        intervalDays,
        isCorrect,
      });
    }
  };

  // Callback for minigames to update spaced repetition (Leitner) progress for answered words
  const recordGameWordResult = useCallback(
    (item: SpacedWordItem, isCorrect: boolean) => {
      if (!item) return;
      const rawId = extractRawWordId(item.id);
      const nextStep = isCorrect
        ? getNextSpacedStep(item.intervalDays || 1)
        : { nextDays: 1, nextStage: 1, label: "1 ngày" };

      item.intervalDays = nextStep.nextDays;
      item.stage = nextStep.nextStage;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
          const parsed = JSON.parse(raw);
          const nowStr = new Date().toISOString();
          const nextReviewStr = new Date(Date.now() + nextStep.nextDays * 86400000).toISOString();
          const stageData = {
            intervalDays: nextStep.nextDays,
            stage: nextStep.nextStage,
            lastReviewedAt: nowStr,
            nextReviewAt: nextReviewStr,
          };
          parsed[rawId] = stageData;
          parsed[`word-${item.word.trim().toLowerCase()}`] = stageData;
          localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));

          if (isCorrect) {
            const currentCount = parseInt(localStorage.getItem("spaced_completed_count") || "0", 10);
            localStorage.setItem("spaced_completed_count", String(currentCount + 1));
          }
        } catch {}
      }

      syncWordProgress(rawId, nextStep.nextStage, nextStep.nextDays, isCorrect, item);
    },
    []
  );

  // Callback when a minigame session is fully completed
  const handleGameComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const todayKey = getTodayKey();
        const todayDateStr = new Date().toISOString().split("T")[0];
        localStorage.setItem(`spaced_finished_${todayKey}`, todayDateStr);
        localStorage.setItem("spaced_finished_today", todayDateStr);
        window.dispatchEvent(new CustomEvent("spaced-review-completed", { detail: { date: todayDateStr } }));
      } catch {}
    }
  }, []);

  // Counts of words per Leitner cycle interval for the current category & folder
  const intervalCounts = useMemo(() => {
    let savedStages: Record<string, any> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("spaced_vocab_stages");
        if (raw) savedStages = JSON.parse(raw);
      } catch {}
    }

    const pool = buildSpacedWordPool(customWords, savedStages, source, selectedFolder);

    const counts: Record<number, number> = { 1: 0, 3: 0, 7: 0, 14: 0, 30: 0 };
    let dueCount = 0;
    pool.forEach((w) => {
      const d = w.intervalDays || 1;
      if (counts[d] !== undefined) counts[d]++;
      else counts[1]++;
      if (isDueForReview(w)) dueCount++;
    });

    return { total: pool.length, counts, dueCount };
  }, [source, selectedFolder, customWords]);

  // Total matching words before applying wordLimit slice
  const totalBeforeWordLimit = useMemo(() => {
    if (intervalFilter === "all") {
      return intervalCounts.total;
    }
    if (intervalFilter === "due") {
      return intervalCounts.dueCount;
    }
    return intervalCounts.counts[intervalFilter] || 0;
  }, [intervalCounts, intervalFilter]);

  // Target word count for the configured session
  const sessionTargetCount = useMemo(() => {
    if (wordLimit === "all") return totalBeforeWordLimit;
    return Math.min(typeof wordLimit === "number" ? wordLimit : totalBeforeWordLimit, totalBeforeWordLimit);
  }, [wordLimit, totalBeforeWordLimit]);

  // Ref to keep current customWords without triggering deck rebuild during active review
  const customWordsRef = useRef<CustomWord[]>([]);
  customWordsRef.current = customWords;

  // 1. Fetch custom words from backend
  useEffect(() => {
    const fetchCustom = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken") || localStorage.getItem("token")
            : null;
        if (!token) {
          setIsLoading(false);
          return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002');
        const res = await fetch(`${apiUrl}/api/vocabulary/custom`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: CustomWord[] = await res.json();
          customWordsRef.current = data;
          setCustomWords(data);

          // Restore stages to localStorage from DB server values
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
              const parsed = JSON.parse(raw);
              let changed = false;
              data.forEach((cw) => {
                const key = `custom-${cw.id}`;
                if (cw.intervalDays && cw.intervalDays > 1 && (!parsed[key] || parsed[key].intervalDays < cw.intervalDays)) {
                  parsed[key] = { intervalDays: cw.intervalDays, stage: cw.stage || 1 };
                  changed = true;
                }
              });
              if (changed) {
                localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));
              }
            } catch {}
          }

          if (data.length === 0 && source === "custom") {
            setSource("all");
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom words:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustom();
  }, []);

  // 2. Build Deck helper (only runs on filter changes or initial load)
  const buildDeck = useCallback(() => {
    let savedStages: Record<string, any> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("spaced_vocab_stages");
        if (raw) savedStages = JSON.parse(raw);
      } catch {}
    }

    let pool = buildSpacedWordPool(customWordsRef.current, savedStages, source, selectedFolder);

    // Filter by intervalDays or due
    if (intervalFilter === "due") {
      pool = pool.filter((w) => isDueForReview(w));
    } else if (intervalFilter !== "all") {
      pool = pool.filter((w) => (w.intervalDays || 1) === intervalFilter);
    }

    // Slice by wordLimit (Số từ để ôn)
    if (wordLimit !== "all" && typeof wordLimit === "number") {
      pool = pool.slice(0, wordLimit);
    }

    setDeck(pool);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRememberedIds(new Set());
    setForgottenIds(new Set());
    setIsFinished(false);
    return pool;
  }, [source, selectedFolder, intervalFilter, wordLimit, customWords]);

  // Tự động đồng bộ từ vựng theo bộ lọc khi đang ở sảnh chờ
  useEffect(() => {
    if (!isLeitnerStarted && !isGameStarted) {
      buildDeck();
    }
  }, [buildDeck, isLeitnerStarted, isGameStarted]);

  // Helper to start the Leitner flashcard session
  const handleStartLeitner = useCallback(() => {
    buildDeck();
    setIsLeitnerStarted(true);
  }, [buildDeck]);

  // Helper to start Game session
  const handleStartGame = useCallback(() => {
    const currentPool = buildDeck();
    if (currentPool.length >= 4) {
      setIsGameStarted(true);
      playEffectSound("click", soundEnabled);
    }
  }, [buildDeck, soundEnabled]);


  // Audio pronunciation via Web Speech API
  const playPronunciation = useCallback((rawWord: string) => {
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
  }, []);

  // Leitner Actions
  const handleRemembered = () => {
    if (deck.length === 0 || currentIndex >= deck.length) return;
    const cur = deck[currentIndex];

    if (cur) {
      addFarmStars(50); // +50 ⭐ for farm
      playEffectSound("correct", soundEnabled);
      const rawId = extractRawWordId(cur.id);
      setRememberedIds((prev) => new Set(prev).add(cur.id));
      const nextStep = getNextSpacedStep(cur.intervalDays || 1);
      cur.intervalDays = nextStep.nextDays;
      cur.stage = nextStep.nextStage;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
          const parsed = JSON.parse(raw);
          const nowStr = new Date().toISOString();
          const nextReviewStr = new Date(Date.now() + nextStep.nextDays * 86400000).toISOString();
          const stageData = {
            intervalDays: nextStep.nextDays,
            stage: nextStep.nextStage,
            lastReviewedAt: nowStr,
            nextReviewAt: nextReviewStr,
          };
          parsed[rawId] = stageData;
          parsed[`word-${cur.word.trim().toLowerCase()}`] = stageData;
          localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));

          const currentCount = parseInt(localStorage.getItem("spaced_completed_count") || "0", 10);
          localStorage.setItem("spaced_completed_count", String(currentCount + 1));
        } catch {}
      }

      // Sync progress to server database (without triggering deck reset)
      syncWordProgress(rawId, nextStep.nextStage, nextStep.nextDays, true, cur);
    }

    if (currentIndex + 1 < deck.length) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      playEffectSound("victory", soundEnabled);
      if (typeof window !== "undefined") {
        try {
          const todayKey = getTodayKey();
          const todayDateStr = new Date().toISOString().split("T")[0];
          localStorage.setItem(`spaced_finished_${todayKey}`, todayDateStr);
          localStorage.setItem("spaced_finished_today", todayDateStr);
          window.dispatchEvent(new CustomEvent("spaced-review-completed", { detail: { date: todayDateStr } }));
        } catch {}
      }
    }
  };

  const handleForgot = () => {
    if (deck.length === 0 || currentIndex >= deck.length) return;
    const cur = deck[currentIndex];

    if (cur) {
      playEffectSound("wrong", soundEnabled);
      const rawId = extractRawWordId(cur.id);
      setForgottenIds((prev) => new Set(prev).add(cur.id));
      cur.intervalDays = 1;
      cur.stage = 1;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
          const parsed = JSON.parse(raw);
          const nowStr = new Date().toISOString();
          const nextReviewStr = new Date(Date.now() + 1 * 86400000).toISOString();
          const stageData = {
            intervalDays: 1,
            stage: 1,
            lastReviewedAt: nowStr,
            nextReviewAt: nextReviewStr,
          };
          parsed[rawId] = stageData;
          parsed[`word-${cur.word.trim().toLowerCase()}`] = stageData;
          localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));
        } catch {}
      }

      // Sync progress to server database (without triggering deck reset)
      syncWordProgress(rawId, 1, 1, false, cur);

      // Add to end of deck
      setDeck((prev) => [...prev, { ...cur, id: `${rawId}-retry-${Date.now()}` }]);
    }

    if (currentIndex + 1 < deck.length + 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRetryForgotten = () => {
    const retryItems = deck.filter((w) => forgottenIds.has(w.id));
    if (retryItems.length === 0) return;
    setDeck(retryItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRememberedIds(new Set());
    setForgottenIds(new Set());
    setIsFinished(false);
  };

  // Keyboard navigation for Leitner Flashcards: Space (Flip), 1/ArrowLeft (Chưa nhớ), 2/ArrowRight (Đã nhớ)
  useEffect(() => {
    if (reviewMode !== "leitner" || !isLeitnerStarted || isFinished || deck.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        const cur = deck[currentIndex];
        if (cur) playPronunciation(cur.word);
      } else if (e.key === "1" || e.key === "ArrowLeft") {
        e.preventDefault();
        handleForgot();
      } else if (e.key === "2" || e.key === "ArrowRight") {
        e.preventDefault();
        handleRemembered();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewMode, isFinished, currentIndex, deck, playPronunciation]);

  const currentWord = deck[currentIndex];
  const analysis = currentWord ? analyzeWordStructure(currentWord.word) : null;
  const currentDays = currentWord?.intervalDays || 1;
  const nextStep = getNextSpacedStep(currentDays);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-subtle)" }}>
      {/* ======================================================== */}
      {/* 1. TOP HEADER & NAVIGATION                               */}
      {/* ======================================================== */}
      <header
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        className="sticky top-0 z-30 backdrop-blur-md w-full"
      >
        <div className="w-full px-6 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/vocabulary"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border hover:bg-[var(--bg-muted)] transition-all text-xs font-bold shadow-2xs group"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              title="Quay về kho từ vựng"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Kho từ vựng</span>
            </Link>

            <div className="h-5 w-px bg-[var(--border)] hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xl">{reviewMode === "leitner" ? "⚡" : "🎮"}</span>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <span>{reviewMode === "leitner" ? "Ôn tập ngắt quãng" : "Ôn tập bằng Game"}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      reviewMode === "leitner"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {reviewMode === "leitner" ? "Spaced Repetition" : "Gamified Vocab"}
                  </span>
                </h1>
                <p className="text-[11px] hidden sm:block" style={{ color: "var(--text-muted)" }}>
                  {reviewMode === "leitner"
                    ? "Ghi nhớ dài hạn theo chu kỳ tối ưu (1 - 3 - 7 - 14 ngày)"
                    : "Học từ vựng qua Minigame: Ghép cặp, Trắc nghiệm phản xạ, Xếp chữ"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {reviewMode === "leitner" && !isFinished && deck.length > 0 && (
              <div
                className="hidden md:flex items-center gap-3 text-xs font-bold px-3 py-1.5 rounded-xl border bg-[var(--bg-subtle)]"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-emerald-500 flex items-center gap-1">
                  <span>🟢 Lượt này:</span> {rememberedIds.size} đã nhớ
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  <span>🔴</span> {forgottenIds.size} cần ôn lại
                </span>
              </div>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-9 h-9 rounded-xl border flex items-center justify-center text-sm hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              style={{ borderColor: "var(--border)" }}
              title={soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MODE SWITCHER: LEITNER VS GAME MODE                    */}
      {/* ======================================================== */}
      {(!isGameStarted || reviewMode === "leitner") && (
        <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 pb-1">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-2xl border shadow-xs"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {/* Option 1: Leitner (Intervals) */}
            <button
              type="button"
              onClick={() => setReviewMode("leitner")}
              className={`py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl text-left transition-all flex items-center gap-2.5 border cursor-pointer h-full ${
                reviewMode === "leitner"
                  ? "bg-blue-600 text-white shadow-md border-blue-500 ring-2 ring-blue-400/30"
                  : "hover:bg-[var(--bg-muted)] border-transparent"
              }`}
            >
              <span className="text-lg p-1.5 rounded-lg bg-white/10 shrink-0 leading-none">⏱️</span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-xs sm:text-sm flex items-center justify-between gap-2">
                  <span className="truncate">Chế độ 1: Chu kỳ Leitner</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      reviewMode === "leitner"
                        ? "bg-white/20 text-white"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    1 - 3 - 7 - 14 ngày
                  </span>
                </div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    reviewMode === "leitner" ? "text-blue-100" : "text-[var(--text-muted)]"
                  }`}
                >
                  Ghi nhớ tăng tiến: Từ chưa nhớ về Hộp 1, đã nhớ tăng chu kỳ
                </div>
              </div>
            </button>

            {/* Option 2: Game Mode */}
            <button
              type="button"
              onClick={() => setReviewMode("game")}
              className={`py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl text-left transition-all flex items-center gap-2.5 border cursor-pointer h-full ${
                reviewMode === "game"
                  ? "bg-purple-600 text-white shadow-md border-purple-500 ring-2 ring-purple-400/30"
                  : "hover:bg-[var(--bg-muted)] border-transparent"
              }`}
            >
              <span className="text-lg p-1.5 rounded-lg bg-white/10 shrink-0 leading-none">🎮</span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-xs sm:text-sm flex items-center justify-between gap-2">
                  <span className="truncate">Chế độ 2: Ôn tập bằng Game</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      reviewMode === "game"
                        ? "bg-white/20 text-white"
                        : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    Minigames Tương tác
                  </span>
                </div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    reviewMode === "game" ? "text-purple-100" : "text-[var(--text-muted)]"
                  }`}
                >
                  Ghép cặp thẻ, Trắc nghiệm phản xạ & Xếp chữ tăng ghi nhớ
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE / STUDY VIEW                           */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">Đang tải thẻ ôn tập ngắt quãng...</p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* ==================================================== */}
            {/* VIEW A: CHẾ ĐỘ 1: CHU KỲ LEITNER                     */}
            {/* ==================================================== */}
            {reviewMode === "leitner" ? (
              <div className="w-full max-w-2xl sm:max-w-3xl mx-auto space-y-6 animate-fade-up">
                {!isLeitnerStarted ? (
                  /* === KHUNG VÀNG: BỘ LỌC & CẤU HÌNH THẺ (HIỂN THỊ BAN ĐẦU) === */
                  <div
                    className="p-5 sm:p-7 rounded-3xl border shadow-md space-y-4 animate-fade-up"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚙️</span>
                        <h3 className="font-extrabold text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>
                          Bộ lọc & Cấu hình thẻ
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                        {isLeitnerStarted ? `${deck.length} từ đang học` : `${sessionTargetCount} từ`}
                      </span>
                    </div>

                    {/* Section 1: Nguồn từ */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Nguồn từ:
                      </label>
                      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                        {SPACED_REPETITION_PRESET_WORDS.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSource("all");
                              setSelectedFolder("all");
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              source === "all"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] border"
                            }`}
                            style={{ borderColor: source === "all" ? "transparent" : "var(--border)" }}
                          >
                            ⚡ Tất cả ({SPACED_REPETITION_PRESET_WORDS.length + customWords.length})
                          </button>
                        )}
                        {customWords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSource("custom");
                              setSelectedFolder("all");
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              source === "custom" || (SPACED_REPETITION_PRESET_WORDS.length === 0 && source === "all")
                                ? "bg-blue-600 text-white shadow-xs"
                                : "hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] border"
                            }`}
                            style={{ borderColor: (source === "custom" || (SPACED_REPETITION_PRESET_WORDS.length === 0 && source === "all")) ? "transparent" : "var(--border)" }}
                          >
                            📁 Từ cá nhân ({customWords.length})
                          </button>
                        )}
                        {SPACED_REPETITION_PRESET_WORDS.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSource("preset");
                              setSelectedFolder("all");
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              source === "preset"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] border"
                            }`}
                            style={{ borderColor: source === "preset" ? "transparent" : "var(--border)" }}
                          >
                            📚 Chu kỳ TOEIC ({SPACED_REPETITION_PRESET_WORDS.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Chọn Thư mục / Chủ đề */}
                    <div className="space-y-2 relative z-20">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                        <span>📁</span> Thư mục:
                      </label>
                      <CustomFolderDropdown
                        value={selectedFolder}
                        onChange={setSelectedFolder}
                        availableFolders={availableFolders}
                        customFolders={customFolders}
                        presetFolders={presetFolders}
                        accentColor="blue"
                        source={source}
                      />
                    </div>

                    {/* Section 3: Chọn Số từ để ôn (Word Limit) */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                          <span>🔢</span> Số từ để ôn:
                        </label>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          Khả dụng: {totalBeforeWordLimit} từ
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                        {[5, 10, 20, 30, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setWordLimit(num)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                              wordLimit === num
                                ? "bg-purple-600 text-white shadow-xs"
                                : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                            }`}
                            style={{ borderColor: wordLimit === num ? "transparent" : "var(--border)" }}
                          >
                            {num} từ
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setWordLimit("all")}
                          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                            wordLimit === "all"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                          }`}
                          style={{ borderColor: wordLimit === "all" ? "transparent" : "var(--border)" }}
                        >
                          Tất cả ({totalBeforeWordLimit})
                        </button>
                      </div>
                    </div>

                    {/* Section 4: Chu kỳ filter tabs */}
                    <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Chu kỳ Leitner:
                      </label>
                      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                        <button
                          type="button"
                          onClick={() => setIntervalFilter("due")}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                            intervalFilter === "due"
                              ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30"
                              : "border hover:bg-[var(--bg-muted)] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          }`}
                        >
                          <span>📅</span>
                          <span>Đến hạn ({intervalCounts.dueCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntervalFilter("all")}
                          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                            intervalFilter === "all"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                          }`}
                          style={{ borderColor: intervalFilter === "all" ? "transparent" : "var(--border)" }}
                        >
                          Tất cả ({intervalCounts.total})
                        </button>
                        {[
                          { days: 1, label: "1 ngày", icon: "🔥", color: "bg-amber-600" },
                          { days: 3, label: "3 ngày", icon: "⚡", color: "bg-blue-600" },
                          { days: 7, label: "7 ngày", icon: "🌿", color: "bg-indigo-600" },
                          { days: 14, label: "14 ngày", icon: "💎", color: "bg-emerald-600" },
                        ].map((item) => (
                          <button
                            key={item.days}
                            type="button"
                            onClick={() => setIntervalFilter(item.days)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                              intervalFilter === item.days
                                ? `${item.color} text-white shadow-xs`
                                : "border hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                            }`}
                            style={{ borderColor: intervalFilter === item.days ? "transparent" : "var(--border)" }}
                          >
                            <span>{item.icon}</span>
                            <span>
                              {item.label} ({intervalCounts.counts[item.days] || 0})
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Direct Minigame Launcher for Due Words */}
                      <div className="mt-3 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 space-y-2.5 animate-fade-up">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg">🎮</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                              Chơi Minigame ôn tập ({sessionTargetCount} từ {intervalFilter === "due" ? "đến hạn" : ""}):
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                            Bấm để bắt đầu chơi ngay ➔
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { key: "match", icon: "🧩", name: "Ghép Cặp Thẻ" },
                            { key: "quiz", icon: "⚡", name: "Trắc Nghiệm 10s" },
                            { key: "multichoice", icon: "🎯", name: "Đa Đáp Án" },
                            { key: "scramble", icon: "🔤", name: "Xếp Chữ Đoán Từ" },
                            { key: "listen", icon: "🎧", name: "Luyện Nghe" },
                            { key: "blockblast", icon: "💥", name: "Block Blast" },
                          ].map((g) => (
                            <button
                              key={g.key}
                              type="button"
                              onClick={() => {
                                setActiveGame(g.key as any);
                                setReviewMode("game");
                                const pool = buildDeck();
                                if (pool.length >= 4) {
                                  setIsGameStarted(true);
                                  playEffectSound("click", soundEnabled);
                                }
                              }}
                              disabled={sessionTargetCount < 4}
                              className="p-2.5 rounded-xl border border-emerald-500/25 bg-[var(--bg-card)] hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-left transition-all cursor-pointer flex items-center gap-2 group shadow-2xs hover:scale-102 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={`Chơi trò ${g.name} với ${sessionTargetCount} từ này`}
                            >
                              <span className="text-base shrink-0 group-hover:scale-115 transition-transform">{g.icon}</span>
                              <span className="text-xs font-black truncate">{g.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Nút Bắt đầu ôn tập */}
                    <div className="pt-3 border-t space-y-2.5" style={{ borderColor: "var(--border)" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={handleStartLeitner}
                          disabled={sessionTargetCount === 0}
                          className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                            sessionTargetCount > 0
                              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          }`}
                          title={sessionTargetCount === 0 ? "Không có từ nào phù hợp với bộ lọc" : "Bắt đầu học phiên này bằng Flashcard"}
                        >
                          <span className="text-lg">🚀</span>
                          <span>Ôn Flashcard ({sessionTargetCount} từ)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReviewMode("game");
                          }}
                          disabled={sessionTargetCount < 4}
                          className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                            sessionTargetCount >= 4
                              ? "bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/25 ring-2 ring-purple-400/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          }`}
                          title={sessionTargetCount < 4 ? "Cần ít nhất 4 từ để chơi game" : `Chuyển sang sảnh minigame với ${sessionTargetCount} từ này`}
                        >
                          <span className="text-lg">🎮</span>
                          <span>Sảnh Minigame ({sessionTargetCount} từ)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* === KHUNG HỒNG: FLASHCARD HỌC TẬP (THAY THẾ HOÀN TOÀN KHUNG VÀNG KHI ĐÃ BẤM BẮT ĐẦU) === */
                  <div className="w-full">
                    {!isFinished && deck.length > 0 && currentWord && analysis ? (
                    <div className="w-full flex flex-col items-center space-y-3 sm:space-y-3.5 animate-fade-up">
                      {/* Session Progress bar */}
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--text-primary)" }}>
                              Thẻ {currentIndex + 1} / {deck.length} ({Math.round(((currentIndex + 1) / deck.length) * 100)}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsLeitnerStarted(false)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 rounded-md hover:bg-blue-500/10 transition-all cursor-pointer"
                              title="Tạm dừng phiên và đổi cấu hình bộ lọc"
                            >
                              ⚙️ Đổi bộ lọc
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsLeitnerStarted(false);
                                setReviewMode("game");
                              }}
                              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1"
                              title="Chuyển sang chơi minigame với các từ trong phiên này"
                            >
                              <span>🎮</span>
                              <span>Chơi Game</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-500 font-bold">🟢 Lượt này: {rememberedIds.size} đã nhớ</span>
                            <span className="text-rose-500 font-bold">🔴 {forgottenIds.size} cần ôn</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${((currentIndex + 1) / deck.length) * 100}%`,
                              background: "linear-gradient(90deg, #3b82f6, #10b981)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Leitner Stepper Track */}
                      <div
                        className="w-full p-2 sm:p-2.5 rounded-2xl border shadow-2xs flex items-center justify-between text-xs font-bold"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                      >
                        {[
                          { days: 1, label: "1 ngày", icon: "🔥", title: "Hộp 1" },
                          { days: 3, label: "3 ngày", icon: "⚡", title: "Hộp 2" },
                          { days: 7, label: "7 ngày", icon: "🌿", title: "Hộp 3" },
                          { days: 14, label: "14 ngày", icon: "💎", title: "Hộp 4" },
                        ].map((step, idx) => {
                          const isCurrent = currentDays === step.days;
                          const isPassed = currentDays > step.days;
                          return (
                            <div key={step.days} className="flex items-center gap-1 flex-1 justify-center">
                              <div
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-xs ${
                                  isCurrent
                                    ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/40 font-black"
                                    : isPassed
                                    ? "bg-emerald-500/15 text-emerald-600 font-bold"
                                    : "text-[var(--text-muted)] opacity-50"
                                }`}
                                title={`${step.title}: Ôn lại sau ${step.label}`}
                              >
                                <span>{step.icon}</span>
                                <span className="hidden sm:inline">{step.label}</span>
                              </div>
                              {idx < 3 && <span className="opacity-30 text-[11px]">➔</span>}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-1 pl-1">
                          <span className="opacity-30 text-[11px]">➔</span>
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-xs ${
                              currentDays >= 30
                                ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/40 font-black"
                                : "text-[var(--text-muted)] opacity-40"
                            }`}
                            title="Thành thạo (30 ngày)"
                          >
                            <span>⭐</span>
                            <span className="hidden sm:inline">Thành thạo</span>
                          </div>
                        </div>
                      </div>

                      {/* Flashcard (Compact & Sleek) */}
                      <div
                        onClick={() => {
                          setIsFlipped((prev) => !prev);
                          playPronunciation(currentWord.word);
                        }}
                        className="w-full min-h-[250px] sm:min-h-[280px] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:border-blue-500/50 shadow-md relative group"
                        style={{
                          borderColor: isFlipped ? "var(--brand)" : "var(--border)",
                          background: "var(--bg-card)",
                        }}
                      >
                        {/* Top Badges */}
                        <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {currentWord.topic && (
                              <span
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
                              >
                                {currentWord.topic}
                              </span>
                            )}
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Hộp {currentWord.stage || 1}: {currentDays} ngày
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playPronunciation(currentWord.word);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all shadow-xs ${
                              speakingWord === analysis.cleanForSpeech
                                ? "bg-blue-600 text-white ring-3 ring-blue-400/40 scale-105"
                                : "bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white"
                            }`}
                            title="Nghe phát âm chuẩn [R]"
                          >
                            🔈
                          </button>
                        </div>

                        {/* Card Content */}
                        {!isFlipped ? (
                          /* Mặt trước */
                          <div className="space-y-2.5 my-auto pt-5 animate-fade-up">
                            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold opacity-40 block">
                              Mặt trước • Bấm thẻ hoặc [Space] để xem nghĩa
                            </span>

                            <h2
                              className="text-2xl sm:text-4xl font-black tracking-tight inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-85 transition-all group mx-auto"
                              style={{ color: "var(--brand)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                playPronunciation(analysis.headword);
                              }}
                              title={`Bấm để nghe phát âm: "${analysis.headword}"`}
                            >
                              <span>{analysis.headword}</span>
                              <span className="text-sm opacity-0 group-hover:opacity-60 transition-opacity">🔈</span>
                            </h2>

                            {/* Phiên âm quốc tế IPA */}
                            {analysis.phonetic && (
                              <div className="flex items-center justify-center my-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playPronunciation(analysis.headword);
                                  }}
                                  className="font-mono text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-[var(--bg-subtle)] hover:bg-blue-500/10 px-3 py-0.5 rounded-full border border-[var(--border)] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 inline-flex items-center gap-1.5 group"
                                  title={`Nghe phát âm chuẩn: ${analysis.phonetic}`}
                                >
                                  <span>{analysis.phonetic}</span>
                                  <span className="text-xs opacity-50 group-hover:opacity-100">🔈</span>
                                </button>
                              </div>
                            )}

                            {analysis.posTags.length > 0 && (
                              <div className="flex justify-center gap-1.5 flex-wrap">
                                {analysis.posTags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-2.5 py-0.5 rounded-md font-mono text-[11px] font-extrabold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                  Đồng nghĩa: =
                                </span>
                                {analysis.synonymsWithPhonetic.map((item, synIdx) => {
                                  const isSpeaking = speakingWord === analyzeWordStructure(item.word).cleanForSpeech;
                                  return (
                                    <button
                                      key={synIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playPronunciation(item.word);
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group ${
                                        isSpeaking
                                          ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40"
                                          : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                      }`}
                                      title={`Bấm để nghe phát âm từ đồng nghĩa: "${item.word}" ${item.phonetic}`}
                                    >
                                      <span>{item.word}</span>
                                      {item.phonetic && (
                                        <span className={`font-mono text-[10px] font-normal px-1 py-0.2 rounded ${
                                          isSpeaking
                                            ? "text-amber-100 bg-amber-600/40"
                                            : "text-amber-700/80 dark:text-amber-300/80 bg-amber-500/10"
                                        }`}>
                                          {item.phonetic}
                                        </span>
                                      )}
                                      <span className={`text-[10px] transition-opacity ${isSpeaking ? "opacity-100 animate-pulse" : "opacity-50 group-hover:opacity-100"}`}>
                                        🔊
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {analysis.collocation && (() => {
                              const collocParts = analysis.collocation.includes("=>")
                                ? analysis.collocation.split("=>").map((p) => p.trim()).filter(Boolean)
                                : [analysis.collocation];

                              return (
                                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                                  {collocParts.map((part, pIdx) => {
                                    const isSpeaking = speakingWord === analyzeWordStructure(part).cleanForSpeech;
                                    return (
                                      <span key={pIdx} className="inline-flex items-center gap-1.5">
                                        {pIdx > 0 && <span className="text-purple-400 font-extrabold text-xs">⇒</span>}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            playPronunciation(part);
                                          }}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95 group ${
                                            isSpeaking
                                              ? "bg-purple-500 text-white border-purple-600 ring-2 ring-purple-400/40"
                                              : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/25 text-purple-600 dark:text-purple-300"
                                          }`}
                                          title={`Bấm để nghe phát âm cụm từ: "${part}"`}
                                        >
                                          <span>{part}</span>
                                          <span className={`text-[9px] transition-opacity ${isSpeaking ? "opacity-100 animate-pulse" : "opacity-40 group-hover:opacity-100"}`}>
                                            🔊
                                          </span>
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          /* Mặt sau */
                          <div className="space-y-3 my-auto pt-5 animate-fade-up w-full max-w-xl mx-auto">
                            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 block">
                              Mặt sau • Nghĩa & Ngữ cảnh
                            </span>

                            {/* Headword & Phiên âm nhắc lại ở mặt sau */}
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-extrabold text-base sm:text-lg text-blue-600 dark:text-blue-400">
                                {analysis.headword}
                              </span>
                              {analysis.phonetic && (
                                <span className="font-mono text-xs sm:text-sm text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-0.5 rounded-full border border-[var(--border)]">
                                  {analysis.phonetic}
                                </span>
                              )}
                            </div>

                            <h3
                              className="text-xl sm:text-2xl font-extrabold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {currentWord.meaning || "Chưa có nghĩa"}
                            </h3>

                            {analysis.synonymsWithPhonetic && analysis.synonymsWithPhonetic.length > 0 && (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
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
                              <p className="text-xs sm:text-sm font-bold text-purple-500">
                                {analysis.collocation}
                              </p>
                            )}

                            {currentWord.example && (
                              <p
                                className="text-xs sm:text-sm italic opacity-90 max-w-lg mx-auto leading-relaxed px-3.5 py-2 rounded-xl border bg-[var(--bg-subtle)]"
                                style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                              >
                                &ldquo;{currentWord.example}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions Bar */}
                      <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          onClick={handleForgot}
                          className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-2xs cursor-pointer"
                          title="Chưa nhớ - Luyện lại cuối phiên [Phím 1 hoặc ←]"
                        >
                          <span className="flex items-center gap-1">❌ Chưa nhớ</span>
                          <span className="text-[10px] font-normal opacity-75">Hộp 1 [1]</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsFlipped(!isFlipped);
                            playPronunciation(currentWord.word);
                          }}
                          className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 text-blue-600 hover:bg-blue-500/10 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-2xs cursor-pointer"
                          style={{ borderColor: "var(--border)" }}
                          title="Phím tắt: Space"
                        >
                          <span className="flex items-center gap-1">🔄 Lật thẻ</span>
                          <span className="text-[10px] font-normal opacity-75">[Space]</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemembered}
                          className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-xs cursor-pointer"
                          title="Đã nhớ [Phím 2 hoặc →]"
                        >
                          <span className="flex items-center gap-1">✅ Đã nhớ</span>
                          <span className="text-[10px] font-normal opacity-90">
                            Ôn sau: {nextStep.label} [2]
                          </span>
                        </button>
                      </div>

                      {/* Keyboard hints */}
                      <p className="text-[11px] text-[var(--text-muted)] text-center">
                        💡 Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-mono">Space</kbd> Lật thẻ •{" "}
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-mono">1</kbd> Chưa nhớ •{" "}
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-mono">2</kbd> Đã nhớ
                      </p>
                    </div>
              ) : !isFinished && deck.length === 0 ? (
                /* Empty deck state */
                <div
                  className="w-full p-8 sm:p-10 rounded-3xl border text-center space-y-5 my-auto shadow-md animate-fade-up"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                    📚
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                      Không có từ nào trong bộ lọc này
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                      Bạn đã hoàn thành hoặc chưa có từ vựng nào thuộc chu kỳ này.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSource("all");
                        setIntervalFilter("all");
                      }}
                      className="btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
                    >
                      Xem tất cả các từ
                    </button>
                    <Link
                      href="/vocabulary"
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border hover:bg-[var(--bg-muted)] transition-all inline-flex items-center justify-center cursor-pointer"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      ← Quay lại kho từ vựng
                    </Link>
                  </div>
                </div>
              ) : (
                /* Leitner Session Finished State */
                <div
                  className="w-full p-8 sm:p-10 rounded-3xl border text-center space-y-6 animate-fade-up shadow-xl my-auto"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="w-20 h-20 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-4xl mx-auto shadow-inner animate-bounce">
                    🏆
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>
                      Hoàn thành phiên ôn tập ngắt quãng!
                    </h2>
                    <p className="text-xs sm:text-sm max-w-lg mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      Xuất sắc! Các từ bạn ghi nhớ đã được nâng chu kỳ trong bộ nhớ dài hạn.
                    </p>
                  </div>

                  {/* Score Summary */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-2xl mx-auto my-6">
                    <div
                      className="p-4 rounded-2xl border flex flex-col items-center"
                      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                    >
                      <span className="text-2xl sm:text-3xl font-black text-emerald-500">
                        {rememberedIds.size}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-muted)] mt-1">Đã ghi nhớ</span>
                    </div>

                    <div
                      className="p-4 rounded-2xl border flex flex-col items-center"
                      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                    >
                      <span className="text-2xl sm:text-3xl font-black text-rose-500">
                        {forgottenIds.size}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-muted)] mt-1">Cần ôn lại</span>
                    </div>

                    <div
                      className="p-4 rounded-2xl border flex flex-col items-center"
                      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                    >
                      <span className="text-2xl sm:text-3xl font-black text-blue-500">
                        {Math.round((rememberedIds.size / (rememberedIds.size + forgottenIds.size || 1)) * 100)}%
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-muted)] mt-1">Chính xác</span>
                    </div>
                  </div>

                  {/* Final Actions */}
                  <div className="w-full max-w-2xl mx-auto space-y-3 pt-2">
                    {forgottenIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleRetryForgotten}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                      >
                        <span>🔁</span>
                        <span>Ôn lại ngay {forgottenIds.size} từ chưa nhớ</span>
                      </button>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLeitnerStarted(false);
                          setIsFinished(false);
                        }}
                        className="w-full sm:flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm border hover:bg-[var(--bg-muted)] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        <span>⚙️</span>
                        <span>Đổi bộ lọc & Cấu hình</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentIndex(0);
                          setIsFlipped(false);
                          setRememberedIds(new Set());
                          setForgottenIds(new Set());
                          setIsFinished(false);
                        }}
                        className="w-full sm:flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm border hover:bg-[var(--bg-muted)] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <span>🔄</span>
                        <span>Ôn lại toàn bộ ({deck.length} từ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewMode("game")}
                        className="w-full sm:flex-1 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 shadow-md hover:scale-102 active:scale-98 transition-transform cursor-pointer"
                      >
                        <span>🎮</span>
                        <span>Chơi Game ôn lại từ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
              /* ==================================================== */
              /* VIEW B: CHẾ ĐỘ 2: ÔN TẬP BẰNG GAME                   */
              /* ==================================================== */
              <div className="w-full space-y-6 animate-fade-up">
                {!isGameStarted ? (
                  /* ==================================================== */
                  /* 1. GAME LOBBY / SETUP SCREEN (CHỌN TRƯỚC KHI CHƠI)  */
                  /* ==================================================== */
                  <div className="w-full">
                    {/* Grid 2 cột: Cột trái (Hình 1) & Cột phải (Hình 2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-start">
                      {/* === CỘT BÊN TRÁI (HÌNH 1): Bước 1 Chọn trò chơi === */}
                      <div className="flex flex-col gap-3 sm:gap-3.5 w-full">
                        {/* Bước 1: Chọn trò chơi ôn tập */}
                        <div
                          className="p-3.5 sm:p-4 rounded-2xl border shadow-xs space-y-2.5"
                          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] font-black">
                              1
                            </span>
                            <h3 className="font-extrabold text-xs sm:text-sm" style={{ color: "var(--text-primary)" }}>
                              Chọn trò chơi ôn tập
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 gap-2 pt-0.5">
                            {[
                              { key: "match", icon: "🧩", name: "Ghép Cặp Thẻ (Match)", desc: "Lật và nối từ tiếng Anh với nghĩa tiếng Việt, tích combo điểm." },
                              { key: "quiz", icon: "⚡", name: "Trắc Nghiệm 10s (Quiz)", desc: "10 giây phản xạ chọn nghĩa đúng, thử thách độ nhạy bén." },
                              { key: "multichoice", icon: "🎯", name: "Trắc Nghiệm Đa Đáp Án (Multi-Select)", desc: "Tích chọn TẤT CẢ các đáp án đúng (nhiều nghĩa / từ đồng nghĩa) cho một từ vựng." },
                              { key: "scramble", icon: "🔤", name: "Xếp Chữ Đoán Từ", desc: "Xếp các ô chữ cái tạo thành từ vựng hoàn chỉnh theo nghĩa." },
                              { key: "listen", icon: "🎧", name: "Luyện Nghe Từ Vựng (Dictation)", desc: "Nghe phát âm chuẩn, gõ lại từ vựng & luyện phản xạ âm thanh." },
                              { key: "blockblast", icon: "💥", name: "Block Blast Từ Đồng Nghĩa", desc: "Nổ tung các khối từ đồng nghĩa (synonyms), kích hoạt chuỗi combo nổ rực rỡ!" },
                            ].map((g) => {
                              const isSelected = activeGame === g.key;
                              return (
                                <button
                                  key={g.key}
                                  type="button"
                                  onClick={() => setActiveGame(g.key as any)}
                                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? "bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-400/30"
                                      : "border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700 hover:bg-[var(--bg-muted)]"
                                  }`}
                                  style={{ background: isSelected ? undefined : "var(--bg-subtle)" }}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-2xl shrink-0">{g.icon}</span>
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-xs sm:text-sm leading-tight">{g.name}</div>
                                      <div className={`text-[11px] mt-0.5 leading-snug ${isSelected ? "text-purple-100" : "text-[var(--text-muted)]"}`}>
                                        {g.desc}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {isSelected ? (
                                      <span className="text-[10px] font-extrabold bg-white/25 text-white px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap">
                                        ✓ Đang chọn
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full opacity-60 whitespace-nowrap">
                                        Bấm để chọn
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* === CỘT BÊN PHẢI (HÌNH 2): Bước 2, Bước 3 & Nút Bắt đầu chơi ngay === */}
                      <div className="flex flex-col gap-3 sm:gap-3.5 w-full">
                        {/* Bước 2: Chọn Thư mục & Nguồn từ */}
                        <div
                          className="p-3.5 sm:p-4 rounded-2xl border shadow-xs space-y-2.5"
                          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] font-black">
                              2
                            </span>
                            <h3 className="font-extrabold text-xs sm:text-sm" style={{ color: "var(--text-primary)" }}>
                              Chọn thư mục & nguồn từ vựng
                            </h3>
                          </div>

                          <div className="space-y-2">
                            {/* Nguồn từ Box: Nằm ngang trên 1 dòng */}
                            <div
                              className="px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                            >
                              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                                <span>⚡</span> Nguồn từ:
                              </label>
                              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                                {SPACED_REPETITION_PRESET_WORDS.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => { setSource("all"); setSelectedFolder("all"); }}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                      source === "all" ? "bg-blue-600 text-white shadow-xs" : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                    }`}
                                    style={{ borderColor: source === "all" ? "transparent" : "var(--border)" }}
                                  >
                                    ⚡ Tất cả ({SPACED_REPETITION_PRESET_WORDS.length + customWords.length})
                                  </button>
                                )}
                                {customWords.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => { setSource("custom"); setSelectedFolder("all"); }}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                      source === "custom" || (SPACED_REPETITION_PRESET_WORDS.length === 0 && source === "all") ? "bg-blue-600 text-white shadow-xs" : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                    }`}
                                    style={{ borderColor: (source === "custom" || (SPACED_REPETITION_PRESET_WORDS.length === 0 && source === "all")) ? "transparent" : "var(--border)" }}
                                  >
                                    📁 Từ cá nhân ({customWords.length})
                                  </button>
                                )}
                                {SPACED_REPETITION_PRESET_WORDS.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => { setSource("preset"); setSelectedFolder("all"); }}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                      source === "preset" ? "bg-blue-600 text-white shadow-xs" : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                    }`}
                                    style={{ borderColor: source === "preset" ? "transparent" : "var(--border)" }}
                                  >
                                    📚 Chu kỳ TOEIC ({SPACED_REPETITION_PRESET_WORDS.length})
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Thư mục Box: Nằm ngang trên 1 dòng */}
                            <div
                              className="px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-20"
                              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                            >
                              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                                <span>📁</span> Chọn Thư mục / Chủ đề:
                              </label>
                              <div className="w-full sm:flex-1 sm:max-w-md sm:ml-2">
                                <CustomFolderDropdown
                                  value={selectedFolder}
                                  onChange={setSelectedFolder}
                                  availableFolders={availableFolders}
                                  customFolders={customFolders}
                                  presetFolders={presetFolders}
                                  accentColor="purple"
                                  source={source}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bước 3: Chọn Số từ để chơi & Chu kỳ */}
                        <div
                          className="p-3.5 sm:p-4 rounded-2xl border shadow-xs space-y-2.5"
                          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] font-black">
                              3
                            </span>
                            <h3 className="font-extrabold text-xs sm:text-sm" style={{ color: "var(--text-primary)" }}>
                              Chọn số lượng từ muốn ôn & Chu kỳ
                            </h3>
                          </div>

                          <div className="space-y-2">
                            {/* Dòng 1: Giới hạn số từ - Toàn bộ nút trên 1 hàng */}
                            <div
                              className="px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                            >
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                                  <span>🔢</span> Giới hạn số từ:
                                </label>
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                  ({totalBeforeWordLimit} từ)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                                {[5, 10, 20, 30, 50].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => setWordLimit(num)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                      wordLimit === num
                                        ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/30"
                                        : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                    }`}
                                    style={{ borderColor: wordLimit === num ? "transparent" : "var(--border)" }}
                                  >
                                    {num} từ
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setWordLimit("all")}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                    wordLimit === "all"
                                      ? "bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/30"
                                      : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                  }`}
                                  style={{ borderColor: wordLimit === "all" ? "transparent" : "var(--border)" }}
                                >
                                  Tất cả ({totalBeforeWordLimit})
                                </button>
                              </div>
                            </div>

                            {/* Dòng 2: Chu kỳ Leitner - Toàn bộ nút trên 1 hàng */}
                            <div
                              className="px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                            >
                              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                                <span>🔁</span> Chu kỳ Leitner:
                              </label>
                              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar pb-0.5">
                                <button
                                  type="button"
                                  onClick={() => setIntervalFilter("due")}
                                  className={`px-3 py-1 rounded-lg font-bold text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                                    intervalFilter === "due"
                                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30"
                                      : "border hover:bg-[var(--bg-card)] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                  }`}
                                >
                                  <span>📅</span>
                                  <span>Đến hạn ({intervalCounts.dueCount})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIntervalFilter("all")}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                    intervalFilter === "all"
                                      ? "bg-amber-600 text-white shadow-xs"
                                      : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                  }`}
                                  style={{ borderColor: intervalFilter === "all" ? "transparent" : "var(--border)" }}
                                >
                                  Tất cả ({intervalCounts.total})
                                </button>
                                {[
                                  { days: 1, label: "1 ngày", icon: "🔥", color: "bg-amber-600" },
                                  { days: 3, label: "3 ngày", icon: "⚡", color: "bg-blue-600" },
                                  { days: 7, label: "7 ngày", icon: "🌿", color: "bg-indigo-600" },
                                  { days: 14, label: "14 ngày", icon: "💎", color: "bg-emerald-600" },
                                ].map((item) => (
                                  <button
                                    key={item.days}
                                    type="button"
                                    onClick={() => setIntervalFilter(item.days)}
                                    className={`px-2 py-1 rounded-lg font-bold text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                                      intervalFilter === item.days
                                        ? `${item.color} text-white shadow-xs`
                                        : "border hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                                    }`}
                                    style={{ borderColor: intervalFilter === item.days ? "transparent" : "var(--border)" }}
                                  >
                                    <span>{item.icon}</span>
                                    <span>{item.label} ({intervalCounts.counts[item.days] || 0})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bước 4: Tóm tắt cấu hình & Nút BẮT ĐẦU CHƠI NGAY */}
                        <div
                          className="p-3.5 sm:p-4 rounded-2xl border shadow-md text-center space-y-2.5 animate-fade-up"
                          style={{
                            background: "linear-gradient(135deg, rgba(147, 51, 234, 0.08), rgba(59, 130, 246, 0.08))",
                            borderColor: "var(--border)",
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-card)] border shadow-2xs text-[11px]">
                              🎮 {activeGame === "match" ? "Ghép Cặp Thẻ" : activeGame === "quiz" ? "Trắc Nghiệm 10s" : activeGame === "multichoice" ? "Trắc Nghiệm Đa Đáp Án" : activeGame === "scramble" ? "Xếp Chữ Đoán Từ" : activeGame === "listen" ? "Luyện Nghe Từ Vựng" : "Block Blast Đồng Nghĩa"}
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-full bg-[var(--bg-card)] border shadow-2xs text-[11px] max-w-[280px] sm:max-w-[420px] truncate"
                              title={selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}
                            >
                              📁 {selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}
                            </span>
                            {intervalFilter === "due" && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] flex items-center gap-1">
                                <span>📅</span> Đến hạn hôm nay ({intervalCounts.dueCount} từ)
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-card)] border shadow-2xs text-purple-600 dark:text-purple-400 font-black text-[11px]">
                              🔢 {deck.length > 0 ? deck.length : sessionTargetCount} từ vựng
                            </span>
                          </div>

                          {(deck.length > 0 ? deck.length : sessionTargetCount) < 4 ? (
                            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold max-w-md mx-auto">
                              ⚠️ Cần ít nhất 4 từ vựng để bắt đầu trò chơi. Vui lòng chọn thư mục khác hoặc tăng số từ ôn!
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={handleStartGame}
                                className="w-full sm:w-auto py-2.5 sm:py-3 px-7 rounded-xl font-black text-xs sm:text-sm shadow-lg hover:scale-103 active:scale-97 transition-all inline-flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white ring-3 ring-purple-500/25"
                              >
                                <span>🚀 BẮT ĐẦU CHƠI NGAY</span>
                                <span>➔</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ==================================================== */
                  /* 2. GAME ACTIVE IN-PLAY VIEW                          */
                  /* ==================================================== */
                  <div className="w-full space-y-5 animate-fade-up">
                    {/* Top Playing Status Toolbar (Chỉ hiện khi chơi Match/Quiz, còn Xếp Chữ, Luyện Nghe, Đa Đáp Án và Block Blast đưa vào cột riêng) */}
                    {activeGame !== "scramble" && activeGame !== "listen" && activeGame !== "blockblast" && activeGame !== "multichoice" && (
                      <div
                        className="p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold flex-wrap">
                          <span className="px-3 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            {activeGame === "match" ? "🧩 Ghép Cặp Thẻ" : "⚡ Trắc Nghiệm 10s"}
                          </span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span style={{ color: "var(--text-primary)" }}>
                            📁 {selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}
                          </span>
                          {intervalFilter === "due" && (
                            <>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                                <span>📅</span> Đến hạn
                              </span>
                            </>
                          )}
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-purple-600 dark:text-purple-400 font-black">
                            {deck.length} từ
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsGameStarted(false)}
                          className="px-3.5 py-1.5 rounded-xl border text-xs font-bold hover:bg-[var(--bg-muted)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          title="Quay về màn hình chọn thư mục và cài đặt"
                        >
                          <span>⚙️</span>
                          <span>Đổi thiết lập / Chọn lại</span>
                        </button>
                      </div>
                    )}

                    {/* Active Game Component */}
                    {activeGame === "match" ? (
                      <MatchPairsGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    ) : activeGame === "quiz" ? (
                      <SpeedQuizGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    ) : activeGame === "scramble" ? (
                      <WordScrambleGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        gameInfo={{
                          gameName: "🔤 Xếp Chữ",
                          folderName: `${selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}${intervalFilter === "due" ? " • 📅 Đến hạn" : ""}`,
                          totalWords: deck.length,
                        }}
                        onBackToSetup={() => setIsGameStarted(false)}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    ) : activeGame === "listen" ? (
                      <ListeningVocabGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        gameInfo={{
                          gameName: "🎧 Luyện Nghe",
                          folderName: `${selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}${intervalFilter === "due" ? " • 📅 Đến hạn" : ""}`,
                          totalWords: deck.length,
                        }}
                        onBackToSetup={() => setIsGameStarted(false)}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    ) : activeGame === "multichoice" ? (
                      <MultiSelectQuizGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        gameInfo={{
                          gameName: "Đa Đáp Án",
                          folderName: `${selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}${intervalFilter === "due" ? " • 📅 Đến hạn" : ""}`,
                          totalWords: deck.length,
                        }}
                        onBackToSetup={() => setIsGameStarted(false)}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    ) : (
                      <SynonymBlockBlastGame
                        wordPool={deck}
                        soundEnabled={soundEnabled}
                        onSpeech={playPronunciation}
                        gameInfo={{
                          gameName: "💥 Block Blast Đồng Nghĩa",
                          folderName: `${selectedFolder === "all" ? "Tất cả thư mục" : selectedFolder}${intervalFilter === "due" ? " • 📅 Đến hạn" : ""}`,
                          totalWords: deck.length,
                        }}
                        onBackToSetup={() => setIsGameStarted(false)}
                        onWordAnswered={recordGameWordResult}
                        onGameComplete={handleGameComplete}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Farm Widget (Chỉ hiển thị xe 🚜) */}
      <div className="fixed bottom-5 right-5 z-40">
        <Link
          href="/farm"
          className="group w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[var(--bg-card)]/95 backdrop-blur-md border-2 border-emerald-500/40 shadow-xl hover:shadow-2xl hover:border-emerald-500 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-emerald-500/20"
          title={`Nông Trại Tri Thức (⭐ ${farmStars.toLocaleString()} sao)`}
        >
          <span className="group-hover:scale-115 transition-transform select-none">🚜</span>
        </Link>
      </div>
    </div>
  );
}

export default function SpacedReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SpacedReviewContent />
    </Suspense>
  );
}

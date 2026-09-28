"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import {
  FARM_CROPS,
  FarmCrop,
  FarmPlot,
  FarmState,
  getFarmState,
  saveFarmState,
  getFarmStars,
  addFarmStars,
  plantSeedOnPlot,
  waterPlot,
  waterAllPlots,
  applyOrganicFertilizer,
  applySuperFertilizer,
  harvestPlot,
  harvestAllReadyPlots,
  unlockPlot,
  buySeed,
  buySupply,
  refillWaterFree,
  sellCropFromInventory,
  sellAllCropsFromInventory,
  calculatePlotProgress,
  EXP_PER_LEVEL,
} from "@/lib/farmSystem";

// Web Audio API zero-latency sound effects
function playFarmSound(type: "plant" | "water" | "fertilize" | "harvest" | "coins" | "levelup" | "click", enabled: boolean = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "water") {
      // Bubbling water sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "plant") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "fertilize") {
      // Magic sparkle sound
      [523, 659, 783, 1046].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.15);
        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.15);
      });
    } else if (type === "harvest") {
      // Cheerful pop & chord
      [523, 659, 783].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.25);
        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.25);
      });
    } else if (type === "coins") {
      [987, 1318].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.2);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
      });
    } else if (type === "levelup") {
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    }
  } catch {}
}

const FARM_LEVEL_TITLES: Record<number, string> = {
  1: "Nông Dân Tập Sự",
  2: "Nông Dân Chăm Chỉ",
  3: "Chủ Trang Trại Xanh",
  4: "Bậc Thầy Trồng Trọt",
  5: "Đại Gia Nông Nghiệp Tri Thức",
};

export default function HappyFarmPage() {
  const [stars, setStars] = useState<number>(500);
  const [farmState, setFarmState] = useState<FarmState>(getFarmState());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"farm" | "shop" | "barn" | "earn">("farm");
  const [selectedSeedForPlant, setSelectedSeedForPlant] = useState<string>("wheat");
  const [activePlotForPlanting, setActivePlotForPlanting] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  // Sync state & stars on load and events
  useEffect(() => {
    setStars(getFarmStars());
    setFarmState(getFarmState());

    const handleStarsUpdate = (e: any) => {
      if (typeof e.detail === "number") setStars(e.detail);
      else setStars(getFarmStars());
    };

    const handleFarmUpdate = (e: any) => {
      if (e.detail) setFarmState(e.detail);
      else setFarmState(getFarmState());
    };

    window.addEventListener("farm-stars-updated", handleStarsUpdate);
    window.addEventListener("farm-state-updated", handleFarmUpdate);

    // Timer loop to update crop countdowns
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      window.removeEventListener("farm-stars-updated", handleStarsUpdate);
      window.removeEventListener("farm-state-updated", handleFarmUpdate);
      clearInterval(timer);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Compute plots with progress
  const plotsWithProgress = useMemo(() => {
    return farmState.plots.map((plot) => {
      const progress = calculatePlotProgress(plot);
      const crop = plot.cropId ? FARM_CROPS.find((c) => c.id === plot.cropId) : null;
      return {
        ...plot,
        progress,
        crop,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmState.plots, tick]);

  // Count ready crops
  const readyCropsCount = useMemo(() => {
    return plotsWithProgress.filter((p) => p.isUnlocked && p.cropId && p.progress.isReady).length;
  }, [plotsWithProgress]);

  // Count unwatered crops
  const unwateredCropsCount = useMemo(() => {
    return plotsWithProgress.filter((p) => p.isUnlocked && p.cropId && !p.isWatered).length;
  }, [plotsWithProgress]);

  // Total crops in barn
  const totalBarnCropsCount = useMemo(() => {
    return Object.values(farmState.inventory).reduce((acc, count) => acc + count, 0);
  }, [farmState.inventory]);

  // Level progress
  const nextExpNeeded = EXP_PER_LEVEL[farmState.level] || 999999;
  const prevExpBase = EXP_PER_LEVEL[farmState.level - 1] || 0;
  const expProgressPercent = Math.min(
    100,
    Math.max(0, ((farmState.exp - prevExpBase) / (nextExpNeeded - prevExpBase)) * 100)
  );

  // Handlers
  const handleOpenPlantModal = (plotId: number) => {
    playFarmSound("click", soundEnabled);
    setActivePlotForPlanting(plotId);
  };

  const handlePlant = (plotId: number, cropId: string) => {
    const res = plantSeedOnPlot(plotId, cropId);
    if (res.success) {
      playFarmSound("plant", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
      setActivePlotForPlanting(null);
    } else {
      showToast(res.message);
    }
  };

  const handleWater = (plotId: number) => {
    const res = waterPlot(plotId);
    if (res.success) {
      playFarmSound("water", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleWaterAll = () => {
    const res = waterAllPlots();
    if (res.success) {
      playFarmSound("water", soundEnabled);
      setFarmState({ ...res.state });
      showToast(`Đã tưới nước cho ${res.wateredCount} ô cây xanh tươi! 💧🌱`);
    } else {
      showToast("Không có ô cây nào cần tưới nước hoặc đã hết nước!");
    }
  };

  const handleOrganicFert = (plotId: number) => {
    const res = applyOrganicFertilizer(plotId);
    if (res.success) {
      playFarmSound("fertilize", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleSuperFert = (plotId: number) => {
    const res = applySuperFertilizer(plotId);
    if (res.success) {
      playFarmSound("fertilize", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleHarvest = (plotId: number) => {
    const res = harvestPlot(plotId);
    if (res.success) {
      playFarmSound("harvest", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
      if (res.didLevelUp && res.newLevel) {
        playFarmSound("levelup", soundEnabled);
        setLevelUpModal(res.newLevel);
      }
    } else {
      showToast(res.message);
    }
  };

  const handleHarvestAll = () => {
    const res = harvestAllReadyPlots();
    if (res.harvestedTotal > 0) {
      playFarmSound("harvest", soundEnabled);
      setFarmState({ ...res.state });
      showToast(`Đã thu hoạch thành công toàn bộ ${res.harvestedTotal} nông sản! (+${res.totalExp} EXP) ✨🌾`);
      if (res.didLevelUp) {
        playFarmSound("levelup", soundEnabled);
        setLevelUpModal(res.state.level);
      }
    } else {
      showToast("Chưa có cây nào chín để thu hoạch!");
    }
  };

  const handleUnlockPlot = (plotId: number) => {
    const res = unlockPlot(plotId);
    if (res.success) {
      playFarmSound("coins", soundEnabled);
      setFarmState({ ...res.state });
      setStars(getFarmStars());
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleBuySeed = (cropId: string, quantity: number = 1) => {
    const res = buySeed(cropId, quantity);
    if (res.success) {
      playFarmSound("coins", soundEnabled);
      setFarmState({ ...res.state });
      setStars(getFarmStars());
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleBuySupply = (type: "water" | "organic_fert" | "super_fert") => {
    const res = buySupply(type);
    if (res.success) {
      playFarmSound("coins", soundEnabled);
      setFarmState({ ...res.state });
      setStars(getFarmStars());
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleRefillWaterFree = () => {
    const res = refillWaterFree();
    if (res.success) {
      playFarmSound("water", soundEnabled);
      setFarmState({ ...res.state });
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleSellCrop = (cropId: string) => {
    const res = sellCropFromInventory(cropId);
    if (res.success) {
      playFarmSound("coins", soundEnabled);
      setFarmState({ ...res.state });
      setStars(getFarmStars());
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleSellAll = () => {
    const res = sellAllCropsFromInventory();
    if (res.success) {
      playFarmSound("coins", soundEnabled);
      setFarmState({ ...res.state });
      setStars(getFarmStars());
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-amber-50/30 to-emerald-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-[var(--text-primary)] transition-colors select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 font-bold text-xs sm:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Level Up Celebration Modal */}
      {levelUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-amber-500 shadow-2xl text-center space-y-4">
            <div className="text-5xl animate-bounce">🏆🎉</div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-500">Chúc mừng bạn thăng cấp!</span>
              <h2 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Nông Trại Cấp {levelUpModal}
              </h2>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {FARM_LEVEL_TITLES[levelUpModal] || "Bậc Thầy Nông Dân"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1 text-left">
              <div className="font-extrabold text-amber-800 dark:text-amber-300">Phần thưởng thăng cấp:</div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <span>⭐</span> +{(200 * levelUpModal).toLocaleString()} sao thưởng nóng
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span>💧</span> Đầy bình nước tưới (20/20)
              </div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <span>🌱</span> Mở khóa giống cây trồng mới trong Cửa Hàng
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLevelUpModal(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 transition-all"
            >
              Tiếp tục canh tác 🌾
            </button>
          </div>
        </div>
      )}

      {/* Plant Seed Selection Modal */}
      {activePlotForPlanting !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Chọn Hạt Giống Gieo Trồng</h3>
                  <p className="text-xs text-[var(--text-muted)]">Gieo hạt vào Ô đất #{activePlotForPlanting}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePlotForPlanting(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-muted)] hover:bg-[var(--border)] flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {FARM_CROPS.map((crop) => {
                const owned = farmState.seedInventory[crop.id] || 0;
                const isLocked = farmState.level < crop.minFarmLevel;

                return (
                  <div
                    key={crop.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isLocked
                        ? "opacity-60 bg-zinc-100 dark:bg-zinc-800/40 border-dashed border-zinc-300 dark:border-zinc-700"
                        : owned > 0
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500"
                        : "bg-[var(--bg-card)] border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="text-3xl p-1.5 rounded-xl bg-white/80 dark:bg-zinc-800 shrink-0 shadow-xs">
                        {crop.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-xs sm:text-sm truncate">{crop.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                            ⏱️ {crop.growTimeSeconds}s
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Thu hoạch: <strong className="text-emerald-600">{crop.harvestYield}x</strong> ({crop.sellPricePerUnit * crop.harvestYield} ⭐)
                        </div>
                        {isLocked ? (
                          <div className="text-[10px] font-bold text-rose-500 mt-1">🔒 Mở ở Cấp {crop.minFarmLevel}</div>
                        ) : (
                          <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Trong túi: {owned} túi hạt
                          </div>
                        )}
                      </div>
                    </div>

                    {!isLocked && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border)]">
                        {owned > 0 ? (
                          <button
                            type="button"
                            onClick={() => handlePlant(activePlotForPlanting, crop.id)}
                            className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            Gieo ngay (1 túi)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuySeed(crop.id, 1)}
                            className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            <span>Mua {crop.seedCost} ⭐ & Gieo</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP NAVBAR / FARM PANORAMA HUD                         */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-[var(--border)] shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/vocabulary/review"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-all text-xs font-bold shadow-2xs group"
              title="Quay lại phòng Ôn tập từ vựng"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span>
              <span className="hidden sm:inline">Phòng Ôn Tập</span>
            </Link>

            <div className="h-5 w-px bg-[var(--border)] hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-2xl animate-pulse">🌾</span>
              <div>
                <h1 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 bg-clip-text text-transparent">
                    Nông Trại Tri Thức
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    Happy Farm
                  </span>
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] hidden md:block">
                  Học từ vựng tích sao ⭐ đổi giống cây, mở đất & chăm sóc nông trại
                </p>
              </div>
            </div>
          </div>

          {/* Right: Currency & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Star Counter */}
            <div
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-105 transition-all"
              onClick={() => setActiveTab("earn")}
              title="Số sao tích lũy. Bấm để xem cách kiếm thêm sao!"
            >
              <span className="text-sm sm:text-base animate-bounce">⭐</span>
              <span>{stars.toLocaleString()}</span>
              <span className="text-[10px] text-amber-500 font-bold hidden sm:inline">+Kiếm sao</span>
            </div>

            {/* Water Tank */}
            <div
              className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-500/20 transition-all"
              onClick={handleRefillWaterFree}
              title="Bình nước tưới cây. Bấm để múc nước từ giếng!"
            >
              <span>💧</span>
              <span>{farmState.waterCurrent}/{farmState.waterMax}</span>
              <span className="text-[10px] hidden md:inline text-blue-500 font-extrabold">+Múc</span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-sm hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
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
      {/* 2. FARM LEVEL & NAVIGATION BAR                            */}
      {/* ======================================================== */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 pb-1">
        <div className="p-3 sm:p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Level badge & EXP Bar */}
          <div className="w-full md:w-auto flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black flex flex-col items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <span className="text-[10px] uppercase leading-none opacity-90">CẤP</span>
              <span className="text-xl leading-none">{farmState.level}</span>
            </div>
            <div className="flex-1 md:w-60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {FARM_LEVEL_TITLES[farmState.level] || "Nông Dân Chăm Chỉ"}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {farmState.exp} / {nextExpNeeded} EXP
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                  style={{ width: `${expProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="w-full md:w-auto flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-muted)]/70 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("farm")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "farm"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              }`}
            >
              <span>🏡</span>
              <span>Khu Vườn</span>
              {readyCropsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-zinc-900 font-extrabold animate-pulse">
                  {readyCropsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shop")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "shop"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                  : "hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              }`}
            >
              <span>🏪</span>
              <span>Cửa Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("barn")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "barn"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              }`}
            >
              <span>🌾</span>
              <span>Kho Nông Sản</span>
              {totalBarnCropsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 text-purple-900 font-extrabold">
                  {totalBarnCropsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("earn")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "earn"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
              }`}
            >
              <span>🎓</span>
              <span>Kiếm Sao ⭐</span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE / CONTENT TABS                          */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col items-center">
        {/* ====================================================== */}
        {/* VIEW 1: FARM GARDEN (KHU VƯỜN CANH TÁC)                */}
        {/* ====================================================== */}
        {activeTab === "farm" && (
          <div className="w-full space-y-4">
            {/* Quick Actions Ribbon */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-[var(--border)] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚜</span>
                <span className="text-xs sm:text-sm font-extrabold">
                  {readyCropsCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 animate-pulse">
                      ✨ Có {readyCropsCount} cây chín mọng đã sẵn sàng thu hoạch!
                    </span>
                  ) : (
                    <span>Cây đang phát triển xanh tốt trên các luống đất màu mỡ.</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {unwateredCropsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleWaterAll}
                    className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>💧</span>
                    <span>Tưới tất cả ({unwateredCropsCount})</span>
                  </button>
                )}

                {readyCropsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleHarvestAll}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer animate-bounce"
                  >
                    <span>✨</span>
                    <span>Thu hoạch tất cả ({readyCropsCount})</span>
                  </button>
                )}

                {/* Stash of Fertilizers */}
                <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                  <span title="Phân bón sinh học (-50% thời gian lớn)">🧪 {farmState.fertilizerOrganic}</span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span title="Phân bón thần tốc (Chín tức thì)">⚡ {farmState.fertilizerSuper}</span>
                </div>
              </div>
            </div>

            {/* Farm Soil Grid (12 Plots) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {plotsWithProgress.map((plot) => {
                if (!plot.isUnlocked) {
                  return (
                    <div
                      key={plot.id}
                      className="p-5 rounded-3xl border-2 border-dashed border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 flex flex-col items-center justify-center text-center gap-3 transition-all min-h-[220px]"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                        🔒
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-sm text-amber-800 dark:text-amber-300">
                          Mảnh đất #{plot.id}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">Cần khai hoang thêm đất canh tác</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlockPlot(plot.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Mở đất</span>
                        <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded-md">
                          ⭐ {plot.unlockCost}
                        </span>
                      </button>
                    </div>
                  );
                }

                // Plot is unlocked
                const isEmpty = !plot.cropId;
                const isReady = plot.progress.isReady;

                return (
                  <div
                    key={plot.id}
                    className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col justify-between min-h-[220px] shadow-xs group ${
                      isEmpty
                        ? "bg-amber-100/50 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-900/60 hover:border-emerald-500"
                        : isReady
                        ? "bg-gradient-to-b from-amber-100/70 to-emerald-100/60 dark:from-amber-950/30 dark:to-emerald-950/30 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30"
                        : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60"
                    }`}
                  >
                    {/* Plot Header */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                      <span className="font-bold text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <span>🌱</span> Ô #{plot.id}
                      </span>
                      {plot.crop && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            isReady
                              ? "bg-amber-500 text-white animate-bounce"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {isReady ? "✨ CHÍN RỒI" : `${plot.progress.remainingSeconds}s`}
                        </span>
                      )}
                    </div>

                    {/* Plot Center Stage */}
                    <div className="flex-1 flex flex-col items-center justify-center py-3 text-center">
                      {isEmpty ? (
                        <div
                          onClick={() => handleOpenPlantModal(plot.id)}
                          className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer group-hover:scale-105 transition-transform"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-amber-200/50 dark:bg-amber-900/40 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
                            🪴
                          </div>
                          <span className="font-extrabold text-xs text-amber-800 dark:text-amber-300">
                            Đất trống • Bấm để gieo hạt
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full flex flex-col items-center">
                          {/* Animated Crop Graphic */}
                          <div
                            className={`text-5xl transition-transform ${
                              isReady
                                ? "scale-125 animate-bounce drop-shadow-md"
                                : plot.progress.stage === "growing"
                                ? "scale-105"
                                : "scale-90 opacity-80"
                            }`}
                          >
                            {isReady
                              ? plot.crop?.icon
                              : plot.progress.stage === "growing"
                              ? "🌿"
                              : "🌱"}
                          </div>

                          <div className="font-black text-sm">{plot.crop?.name}</div>

                          {/* Progress bar */}
                          <div className="w-full max-w-[160px] h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isReady
                                  ? "bg-amber-500"
                                  : "bg-gradient-to-r from-emerald-500 to-green-500"
                              }`}
                              style={{ width: `${plot.progress.progressPercent}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                            <span>{plot.isWatered ? "💧 Đã tưới" : "⚠️ Cần tưới"}</span>
                            <span>•</span>
                            <span>+{plot.crop?.harvestYield} {plot.crop?.icon}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Plot Actions Footer */}
                    <div className="pt-2 border-t border-[var(--border)] flex items-center gap-1.5">
                      {isEmpty ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPlantModal(plot.id)}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Gieo hạt giống 🌱
                        </button>
                      ) : isReady ? (
                        <button
                          type="button"
                          onClick={() => handleHarvest(plot.id)}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:scale-[1.02] text-white font-black text-xs shadow-md shadow-amber-500/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>✨</span>
                          <span>Thu hoạch (+{plot.crop?.harvestYield} {plot.crop?.name})</span>
                        </button>
                      ) : (
                        <div className="w-full flex items-center gap-1">
                          {/* Water button */}
                          <button
                            type="button"
                            onClick={() => handleWater(plot.id)}
                            disabled={plot.isWatered}
                            className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1 transition-all ${
                              plot.isWatered
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default"
                                : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer active:scale-95 shadow-xs"
                            }`}
                          >
                            <span>💧</span>
                            <span>{plot.isWatered ? "Đã tưới" : "Tưới nước"}</span>
                          </button>

                          {/* Organic Fertilizer button */}
                          <button
                            type="button"
                            onClick={() => handleOrganicFert(plot.id)}
                            className="p-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
                            title="Bón phân sinh học: Giảm 50% thời gian lớn (-50%)"
                          >
                            🧪
                          </button>

                          {/* Super Fertilizer button */}
                          <button
                            type="button"
                            onClick={() => handleSuperFert(plot.id)}
                            className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
                            title="Phân bón thần tốc: Chín tức thì ngay lập tức!"
                          >
                            ⚡
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* VIEW 2: FARM SHOP (CỬA HÀNG HẠT GIỐNG & NÔNG CỤ)       */}
        {/* ====================================================== */}
        {activeTab === "shop" && (
          <div className="w-full max-w-5xl space-y-6">
            {/* Supplies Row (Nước & Phân bón) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-[var(--border)] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧰</span>
                <h3 className="font-black text-sm sm:text-base">Nông Cụ, Nước Tưới & Phân Bón</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Water Refill */}
                <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
                      💧
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-blue-700 dark:text-blue-300">Bình Nước Đầy</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Bơm đầy 20/20 giọt nước mát</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuySupply("water")}
                    className="w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <span>Mua 40 ⭐</span>
                  </button>
                </div>

                {/* Organic Fert */}
                <div className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                      🧪
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-purple-700 dark:text-purple-300">Phân Sinh Học</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Rút ngắn 50% thời gian lớn</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuySupply("organic_fert")}
                    className="w-full py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <span>Mua 50 ⭐ (Có: {farmState.fertilizerOrganic})</span>
                  </button>
                </div>

                {/* Super Fert */}
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                      ⚡
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-amber-700 dark:text-amber-300">Phân Thần Tốc</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Cây chín và thu hoạch tức thì</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuySupply("super_fert")}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <span>Mua 120 ⭐ (Có: {farmState.fertilizerSuper})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Seeds Catalog */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-[var(--border)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏪</span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base">Kho Hạt Giống Nông Nghiệp</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Đổi sao tích lũy từ bài học để mua hạt giống có lợi nhuận cao</p>
                  </div>
                </div>
                <div className="text-xs font-black text-amber-500">
                  Số dư: ⭐ {stars.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {FARM_CROPS.map((crop) => {
                  const isLocked = farmState.level < crop.minFarmLevel;
                  const owned = farmState.seedInventory[crop.id] || 0;
                  const profit = crop.sellPricePerUnit * crop.harvestYield - crop.seedCost;

                  return (
                    <div
                      key={crop.id}
                      className={`p-4 rounded-3xl border flex flex-col justify-between gap-3 transition-all ${
                        isLocked
                          ? "bg-zinc-100 dark:bg-zinc-800/40 opacity-70 border-dashed border-zinc-300 dark:border-zinc-700"
                          : "bg-[var(--bg-card)] border-[var(--border)] hover:border-amber-500 hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl p-1.5 rounded-2xl bg-[var(--bg-muted)] shadow-xs">
                            {crop.icon}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            ⏱️ {crop.growTimeSeconds}s
                          </span>
                        </div>

                        <div>
                          <div className="font-black text-sm">{crop.name}</div>
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                            {crop.description}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[11px] space-y-1">
                          <div className="flex justify-between text-[var(--text-secondary)]">
                            <span>Sản lượng:</span>
                            <strong>+{crop.harvestYield} {crop.icon}</strong>
                          </div>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                            <span>Lợi nhuận sao:</span>
                            <span>+{profit} ⭐</span>
                          </div>
                          <div className="flex justify-between text-purple-600 dark:text-purple-400">
                            <span>Kinh nghiệm:</span>
                            <span>+{crop.expPerHarvest} EXP</span>
                          </div>
                        </div>
                      </div>

                      {isLocked ? (
                        <div className="w-full py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-bold text-xs text-center">
                          🔒 Yêu cầu Cấp {crop.minFarmLevel}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-center font-bold text-[var(--text-muted)]">
                            Đang có: {owned} túi hạt
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBuySeed(crop.id, 1)}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>Mua 1 túi ({crop.seedCost} ⭐)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* VIEW 3: BARN / SILO (KHO NÔNG SẢN & BÁN LẤY SAO)        */}
        {/* ====================================================== */}
        {activeTab === "barn" && (
          <div className="w-full max-w-4xl space-y-5">
            <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-[var(--border)] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌾</span>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Kho Nông Sản (Silo)</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Nông sản thu hoạch được lưu trữ tại đây. Hãy xuất kho bán lấy lượng sao ⭐ khổng lồ!
                  </p>
                </div>
              </div>

              {totalBarnCropsCount > 0 && (
                <button
                  type="button"
                  onClick={handleSellAll}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 hover:scale-105 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>💰</span>
                  <span>Bán Tất Cả Nông Sản Lấy Sao ⭐</span>
                </button>
              )}
            </div>

            {totalBarnCropsCount === 0 ? (
              <div className="p-10 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] text-center space-y-3">
                <div className="text-5xl">🌾</div>
                <div className="space-y-1">
                  <div className="font-extrabold text-base">Kho nông sản hiện đang trống</div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Hãy vào Khu Vườn để gieo hạt, tưới nước và thu hoạch nông sản đầu tiên của bạn!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("farm")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Đến Khu Vườn Trồng Cây →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {FARM_CROPS.map((crop) => {
                  const count = farmState.inventory[crop.id] || 0;
                  if (count <= 0) return null;
                  const totalSellValue = count * crop.sellPricePerUnit;

                  return (
                    <div
                      key={crop.id}
                      className="p-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs flex flex-col justify-between gap-3 hover:border-emerald-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-4xl p-2 rounded-2xl bg-[var(--bg-subtle)]">
                          {crop.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-sm">{crop.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            Số lượng trong kho: <strong className="text-emerald-600">{count}</strong>
                          </div>
                          <div className="text-xs font-black text-amber-500 mt-0.5">
                            Giá trị: ⭐ {totalSellValue.toLocaleString()} sao
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSellCrop(crop.id)}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Bán hết ({count} {crop.name}) → +{totalSellValue.toLocaleString()} ⭐</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================== */}
        {/* VIEW 4: EARN STARS (ÔN BÀI ĐỂ KIẾM SAO)                 */}
        {/* ====================================================== */}
        {activeTab === "earn" && (
          <div className="w-full max-w-3xl space-y-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-[var(--border)] shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <h3 className="font-black text-base sm:text-lg">Khu Vườn Tri Thức - Ôn Bài Tích Sao ⭐</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Bạn cần thêm sao để mua đất mở rộng nông trại hay giống cây quý hiếm? Hãy ôn luyện từ vựng! Càng chăm chỉ học, nông trại của bạn càng trù phú phát đạt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Dictation Listening */}
              <Link
                href="/vocabulary/review?mode=game"
                className="p-4 rounded-3xl border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-white/80 dark:bg-zinc-800 shadow-xs">🎧</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      +100 ⭐ / từ đúng
                    </span>
                  </div>
                  <div className="font-black text-sm sm:text-base group-hover:text-purple-600 transition-colors">
                    Luyện Nghe Từ Vựng (Dictation)
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Nghe phát âm chuẩn, gõ lại từ vựng đúng chính tả để nhận combo sao thưởng cực lớn.
                  </p>
                </div>
                <div className="text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <span>Chơi ngay</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>

              {/* Leitner Spaced Review */}
              <Link
                href="/vocabulary/review?mode=leitner"
                className="p-4 rounded-3xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-white/80 dark:bg-zinc-800 shadow-xs">⏱️</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      +50 ⭐ / từ nhớ
                    </span>
                  </div>
                  <div className="font-black text-sm sm:text-base group-hover:text-blue-600 transition-colors">
                    Ôn Tập Thẻ Leitner (Spaced Repetition)
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Lật thẻ flashcard theo chu kỳ tối ưu 1 - 3 - 7 - 14 ngày giúp nhớ từ vựng vĩnh viễn.
                  </p>
                </div>
                <div className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span>Vào phòng ôn</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>

              {/* Match Game */}
              <Link
                href="/vocabulary/review?mode=game"
                className="p-4 rounded-3xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-white/80 dark:bg-zinc-800 shadow-xs">🧩</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      +100 ⭐ / vòng
                    </span>
                  </div>
                  <div className="font-black text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
                    Ghép Cặp Thẻ Từ Vựng
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Nhanh tay lật và ghép cặp từ tiếng Anh với nghĩa tiếng Việt để nhận sao thưởng.
                  </p>
                </div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>Chơi ngay</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>

              {/* Scramble Words */}
              <Link
                href="/vocabulary"
                className="p-4 rounded-3xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-white/80 dark:bg-zinc-800 shadow-xs">📚</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      Kho từ vựng
                    </span>
                  </div>
                  <div className="font-black text-sm sm:text-base group-hover:text-amber-600 transition-colors">
                    Kho Từ Vựng Cá Nhân
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Thêm các từ vựng bạn muốn học, tạo thư mục và theo dõi tiến độ ghi nhớ.
                  </p>
                </div>
                <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span>Về kho từ vựng</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

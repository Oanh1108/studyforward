// ==========================================
// HAPPY STUDY FARM SYSTEM (NÔNG TRẠI TRI THỨC)
// ==========================================

export interface FarmCrop {
  id: string;
  name: string;
  category: "grain" | "vegetable" | "fruit" | "flower" | "rare";
  seedCost: number; // Star cost to buy seed
  growTimeSeconds: number; // Time to fully grow
  harvestYield: number; // Number of items produced
  sellPricePerUnit: number; // Stars earned per harvested unit
  expPerHarvest: number; // Farm EXP earned
  icon: string;
  seedIcon: string;
  description: string;
  minFarmLevel: number;
}

export interface FarmPlot {
  id: number;
  isUnlocked: boolean;
  unlockCost: number;
  cropId: string | null;
  plantedAt: number | null; // timestamp in ms
  growthDurationMs: number; // duration in ms
  isWatered: boolean;
  wateredAt: number | null;
  fertilizedBonusMs: number; // time reduction applied
}

export interface FarmInventory {
  [cropId: string]: number; // Harvested crops in Silo/Barn
}

export interface SeedInventory {
  [cropId: string]: number; // Seeds owned ready to plant
}

export interface FarmState {
  level: number;
  exp: number;
  waterCurrent: number;
  waterMax: number;
  lastWaterRefillAt: number;
  fertilizerOrganic: number; // -50% growth time
  fertilizerSuper: number; // Instant harvest
  plots: FarmPlot[];
  inventory: FarmInventory;
  seedInventory: SeedInventory;
  stats: {
    totalHarvests: number;
    totalStarsEarned: number;
    totalSeedsPlanted: number;
  };
}

export const FARM_CROPS: FarmCrop[] = [
  {
    id: "wheat",
    name: "Lúa Mì Vàng",
    category: "grain",
    seedCost: 40,
    growTimeSeconds: 25,
    harvestYield: 2,
    sellPricePerUnit: 35, // 2 * 35 = 70 stars (profit +30)
    expPerHarvest: 15,
    icon: "🌾",
    seedIcon: "🌰",
    description: "Cây trồng cơ bản, lớn cực nhanh và dễ chăm sóc.",
    minFarmLevel: 1,
  },
  {
    id: "carrot",
    name: "Cà Rốt Ngọt",
    category: "vegetable",
    seedCost: 80,
    growTimeSeconds: 50,
    harvestYield: 3,
    sellPricePerUnit: 50, // 3 * 50 = 150 stars (profit +70)
    expPerHarvest: 30,
    icon: "🥕",
    seedIcon: "🌱",
    description: "Củ cà rốt tươi ngon giòn rụm, giàu vitamin.",
    minFarmLevel: 1,
  },
  {
    id: "strawberry",
    name: "Dâu Tây Mọng Nước",
    category: "fruit",
    seedCost: 150,
    growTimeSeconds: 90,
    harvestYield: 3,
    sellPricePerUnit: 100, // 3 * 100 = 300 stars (profit +150)
    expPerHarvest: 60,
    icon: "🍓",
    seedIcon: "🫐",
    description: "Trái dâu tây chín đỏ ngọt lịm, rất được ưa chuộng.",
    minFarmLevel: 2,
  },
  {
    id: "sunflower",
    name: "Hoa Hướng Dương",
    category: "flower",
    seedCost: 260,
    growTimeSeconds: 150,
    harvestYield: 3,
    sellPricePerUnit: 180, // 3 * 180 = 540 stars (profit +280)
    expPerHarvest: 110,
    icon: "🌻",
    seedIcon: "🌼",
    description: "Bông hoa rực rỡ luôn hướng về ánh mặt trời tri thức.",
    minFarmLevel: 2,
  },
  {
    id: "tomato",
    name: "Cà Chua Bi",
    category: "vegetable",
    seedCost: 420,
    growTimeSeconds: 220,
    harvestYield: 4,
    sellPricePerUnit: 220, // 4 * 220 = 880 stars (profit +460)
    expPerHarvest: 170,
    icon: "🍅",
    seedIcon: "🪴",
    description: "Cà chua sai trĩu cành, năng suất thu hoạch vượt trội.",
    minFarmLevel: 3,
  },
  {
    id: "apple",
    name: "Cây Táo Thần Kỳ",
    category: "fruit",
    seedCost: 800,
    growTimeSeconds: 360,
    harvestYield: 4,
    sellPricePerUnit: 420, // 4 * 420 = 1680 stars (profit +880)
    expPerHarvest: 350,
    icon: "🍎",
    seedIcon: "🌳",
    description: "Cây táo tri thức mang lại lượng sao khổng lồ.",
    minFarmLevel: 3,
  },
  {
    id: "watermelon",
    name: "Dưa Hấu Khổng Lồ",
    category: "fruit",
    seedCost: 1600,
    growTimeSeconds: 500,
    harvestYield: 3,
    sellPricePerUnit: 1200, // 3 * 1200 = 3600 stars (profit +2000)
    expPerHarvest: 750,
    icon: "🍉",
    seedIcon: "🍈",
    description: "Quả dưa hấu siêu to khổng lồ, thơm ngọt thanh mát.",
    minFarmLevel: 4,
  },
  {
    id: "lotus",
    name: "Hoa Sen Tri Thức",
    category: "rare",
    seedCost: 3500,
    growTimeSeconds: 800,
    harvestYield: 2,
    sellPricePerUnit: 4200, // 2 * 4200 = 8400 stars (profit +4900)
    expPerHarvest: 1800,
    icon: "🪷",
    seedIcon: "✨",
    description: "Cây hoa sen huyền thoại biểu tượng cho học vấn tinh hoa.",
    minFarmLevel: 5,
  },
];

export const PLOT_UNLOCK_COSTS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 250,
  6: 500,
  7: 900,
  8: 1500,
  9: 2500,
  10: 4000,
  11: 6500,
  12: 10000,
};

export const EXP_PER_LEVEL = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000];

const STORAGE_STARS_KEY = "studyforward_stars_v1";
const STORAGE_FARM_KEY = "studyforward_farm_v1";

// ==========================================
// STAR CURRENCY HELPERS
// ==========================================
export function getFarmStars(): number {
  if (typeof window === "undefined") return 500;
  try {
    const raw = localStorage.getItem(STORAGE_STARS_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) return parsed;
    }
    // Also check older character key if present to preserve previous earnings
    const oldChar = localStorage.getItem("studyforward_character_profile_v1");
    if (oldChar) {
      try {
        const p = JSON.parse(oldChar);
        if (typeof p.totalStars === "number") {
          localStorage.setItem(STORAGE_STARS_KEY, String(p.totalStars));
          return p.totalStars;
        }
      } catch {}
    }
  } catch {}
  localStorage.setItem(STORAGE_STARS_KEY, "500");
  return 500;
}

export function saveFarmStars(stars: number): void {
  if (typeof window === "undefined") return;
  try {
    const safeStars = Math.max(0, Math.floor(stars));
    localStorage.setItem(STORAGE_STARS_KEY, String(safeStars));
    window.dispatchEvent(new CustomEvent("farm-stars-updated", { detail: safeStars }));
  } catch {}
}

export function addFarmStars(amount: number): number {
  const current = getFarmStars();
  const next = current + Math.max(0, Math.floor(amount));
  saveFarmStars(next);
  return next;
}

export function spendFarmStars(amount: number): boolean {
  const current = getFarmStars();
  if (current < amount) return false;
  saveFarmStars(current - amount);
  return true;
}

// ==========================================
// FARM STATE INITIALIZATION & PERSISTENCE
// ==========================================
export function getInitialFarmState(): FarmState {
  const defaultPlots: FarmPlot[] = Array.from({ length: 12 }, (_, i) => {
    const plotId = i + 1;
    const isUnlocked = plotId <= 4; // Start with 4 plots
    return {
      id: plotId,
      isUnlocked,
      unlockCost: PLOT_UNLOCK_COSTS[plotId] || 1000,
      cropId: null,
      plantedAt: null,
      growthDurationMs: 0,
      isWatered: false,
      wateredAt: null,
      fertilizedBonusMs: 0,
    };
  });

  return {
    level: 1,
    exp: 0,
    waterCurrent: 20,
    waterMax: 20,
    lastWaterRefillAt: Date.now(),
    fertilizerOrganic: 3, // Starter bonus: 3 organic fertilizers
    fertilizerSuper: 1, // Starter bonus: 1 super fertilizer
    plots: defaultPlots,
    inventory: {},
    seedInventory: {
      wheat: 5, // Starter bonus: 5 wheat seeds
      carrot: 2, // Starter bonus: 2 carrot seeds
    },
    stats: {
      totalHarvests: 0,
      totalStarsEarned: 0,
      totalSeedsPlanted: 0,
    },
  };
}

export function getFarmState(): FarmState {
  if (typeof window === "undefined") return getInitialFarmState();
  try {
    const raw = localStorage.getItem(STORAGE_FARM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate structure & plots length
      if (parsed && Array.isArray(parsed.plots) && parsed.plots.length === 12) {
        return parsed;
      }
    }
  } catch {}

  const initial = getInitialFarmState();
  saveFarmState(initial);
  return initial;
}

export function saveFarmState(state: FarmState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_FARM_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("farm-state-updated", { detail: state }));
  } catch {}
}

// ==========================================
// FARM LOGIC & ACTIONS
// ==========================================

export function calculatePlotProgress(plot: FarmPlot): {
  progressPercent: number;
  remainingSeconds: number;
  isReady: boolean;
  stage: "empty" | "sprout" | "growing" | "mature";
} {
  if (!plot.cropId || !plot.plantedAt) {
    return { progressPercent: 0, remainingSeconds: 0, isReady: false, stage: "empty" };
  }

  const now = Date.now();
  const effectiveElapsed = (now - plot.plantedAt) + (plot.fertilizedBonusMs || 0);
  const totalDuration = plot.growthDurationMs;

  if (totalDuration <= 0) {
    return { progressPercent: 100, remainingSeconds: 0, isReady: true, stage: "mature" };
  }

  const percent = Math.min(100, Math.max(0, (effectiveElapsed / totalDuration) * 100));
  const remainingMs = Math.max(0, totalDuration - effectiveElapsed);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isReady = remainingMs <= 0;

  let stage: "empty" | "sprout" | "growing" | "mature" = "sprout";
  if (isReady) {
    stage = "mature";
  } else if (percent >= 50) {
    stage = "growing";
  } else {
    stage = "sprout";
  }

  return { progressPercent: percent, remainingSeconds, isReady, stage };
}

export function checkLevelUp(currentLevel: number, currentExp: number): {
  newLevel: number;
  didLevelUp: boolean;
  expNeeded: number;
} {
  let lvl = currentLevel;
  while (lvl < EXP_PER_LEVEL.length - 1 && currentExp >= EXP_PER_LEVEL[lvl]) {
    lvl++;
  }
  const expNeeded = EXP_PER_LEVEL[lvl] || 999999;
  return { newLevel: lvl, didLevelUp: lvl > currentLevel, expNeeded };
}

// Plant seed into empty plot
export function plantSeedOnPlot(plotId: number, cropId: string): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);
  const crop = FARM_CROPS.find((c) => c.id === cropId);

  if (!plot || !crop) return { success: false, message: "Ô đất hoặc cây trồng không tồn tại.", state };
  if (!plot.isUnlocked) return { success: false, message: "Ô đất chưa được mở khóa.", state };
  if (plot.cropId) return { success: false, message: "Ô đất này đã được gieo hạt.", state };

  const seedsOwned = state.seedInventory[cropId] || 0;
  if (seedsOwned <= 0) return { success: false, message: "Bạn không có hạt giống này trong túi.", state };

  // Deduct 1 seed
  state.seedInventory[cropId] = seedsOwned - 1;

  // Plant
  plot.cropId = cropId;
  plot.plantedAt = Date.now();
  plot.growthDurationMs = crop.growTimeSeconds * 1000;
  plot.isWatered = true; // Auto water first time on planting
  plot.wateredAt = Date.now();
  plot.fertilizedBonusMs = 0;

  state.stats.totalSeedsPlanted++;
  saveFarmState(state);
  return { success: true, message: `Đã gieo ${crop.name}!`, state };
}

// Water a plot
export function waterPlot(plotId: number): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);

  if (!plot || !plot.isUnlocked || !plot.cropId) {
    return { success: false, message: "Không thể tưới nước cho ô này.", state };
  }
  if (state.waterCurrent <= 0) {
    return { success: false, message: "Hết nước tưới! Hãy múc nước từ giếng hoặc mua thêm nước.", state };
  }

  state.waterCurrent = Math.max(0, state.waterCurrent - 1);
  plot.isWatered = true;
  plot.wateredAt = Date.now();

  saveFarmState(state);
  return { success: true, message: "Đã tưới nước mát cho cây! 💧", state };
}

// Water all unwatered planted plots
export function waterAllPlots(): { success: boolean; wateredCount: number; state: FarmState } {
  const state = getFarmState();
  let wateredCount = 0;

  for (const plot of state.plots) {
    if (plot.isUnlocked && plot.cropId && !plot.isWatered && state.waterCurrent > 0) {
      state.waterCurrent--;
      plot.isWatered = true;
      plot.wateredAt = Date.now();
      wateredCount++;
    }
  }

  saveFarmState(state);
  return { success: wateredCount > 0, wateredCount, state };
}

// Apply Organic Fertilizer (-50% time)
export function applyOrganicFertilizer(plotId: number): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);

  if (!plot || !plot.cropId) return { success: false, message: "Ô này chưa trồng cây.", state };
  if (state.fertilizerOrganic <= 0) return { success: false, message: "Bạn đã hết phân bón sinh học.", state };

  state.fertilizerOrganic--;
  // Fast forward 50% of total growth time
  plot.fertilizedBonusMs += Math.floor(plot.growthDurationMs * 0.5);

  saveFarmState(state);
  return { success: true, message: "Đã bón phân sinh học! Cây lớn nhanh thêm 50% 🧪", state };
}

// Apply Super Fertilizer (Instant growth)
export function applySuperFertilizer(plotId: number): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);

  if (!plot || !plot.cropId) return { success: false, message: "Ô này chưa trồng cây.", state };
  if (state.fertilizerSuper <= 0) return { success: false, message: "Bạn đã hết phân bón thần tốc.", state };

  state.fertilizerSuper--;
  // Instantly mature
  plot.fertilizedBonusMs += plot.growthDurationMs;

  saveFarmState(state);
  return { success: true, message: "Phân bón thần tốc! Cây đã chín và sẵn sàng thu hoạch ngay ⚡", state };
}

// Harvest a single plot
export function harvestPlot(plotId: number): {
  success: boolean;
  cropName?: string;
  yieldCount?: number;
  expEarned?: number;
  didLevelUp?: boolean;
  newLevel?: number;
  message: string;
  state: FarmState;
} {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);

  if (!plot || !plot.cropId) return { success: false, message: "Không có gì để thu hoạch.", state };

  const crop = FARM_CROPS.find((c) => c.id === plot.cropId);
  if (!crop) return { success: false, message: "Không tìm thấy thông tin cây trồng.", state };

  const progress = calculatePlotProgress(plot);
  if (!progress.isReady) {
    return { success: false, message: `Cây chưa chín, còn ${progress.remainingSeconds} giây nữa!`, state };
  }

  // Add to inventory
  const currentCount = state.inventory[crop.id] || 0;
  state.inventory[crop.id] = currentCount + crop.harvestYield;

  // Add EXP
  state.exp += crop.expPerHarvest;
  const levelCheck = checkLevelUp(state.level, state.exp);
  const didLevelUp = levelCheck.didLevelUp;
  if (didLevelUp) {
    state.level = levelCheck.newLevel;
    // Level up reward: +200 stars and free water refill
    addFarmStars(200 * state.level);
    state.waterCurrent = state.waterMax;
  }

  // Reset plot to empty
  plot.cropId = null;
  plot.plantedAt = null;
  plot.growthDurationMs = 0;
  plot.isWatered = false;
  plot.wateredAt = null;
  plot.fertilizedBonusMs = 0;

  state.stats.totalHarvests++;
  saveFarmState(state);

  return {
    success: true,
    cropName: crop.name,
    yieldCount: crop.harvestYield,
    expEarned: crop.expPerHarvest,
    didLevelUp,
    newLevel: state.level,
    message: `Thu hoạch thành công +${crop.harvestYield} ${crop.name}! (+${crop.expPerHarvest} EXP)`,
    state,
  };
}

// Harvest all ready plots
export function harvestAllReadyPlots(): {
  harvestedTotal: number;
  totalExp: number;
  didLevelUp: boolean;
  state: FarmState;
} {
  const state = getFarmState();
  let harvestedTotal = 0;
  let totalExp = 0;

  for (const plot of state.plots) {
    if (plot.isUnlocked && plot.cropId) {
      const progress = calculatePlotProgress(plot);
      if (progress.isReady) {
        const crop = FARM_CROPS.find((c) => c.id === plot.cropId);
        if (crop) {
          const currentCount = state.inventory[crop.id] || 0;
          state.inventory[crop.id] = currentCount + crop.harvestYield;
          totalExp += crop.expPerHarvest;
          harvestedTotal += crop.harvestYield;

          // Clear plot
          plot.cropId = null;
          plot.plantedAt = null;
          plot.growthDurationMs = 0;
          plot.isWatered = false;
          plot.wateredAt = null;
          plot.fertilizedBonusMs = 0;
          state.stats.totalHarvests++;
        }
      }
    }
  }

  state.exp += totalExp;
  const levelCheck = checkLevelUp(state.level, state.exp);
  const didLevelUp = levelCheck.didLevelUp;
  if (didLevelUp) {
    state.level = levelCheck.newLevel;
    addFarmStars(200 * state.level);
    state.waterCurrent = state.waterMax;
  }

  saveFarmState(state);
  return { harvestedTotal, totalExp, didLevelUp, state };
}

// Unlock a new plot
export function unlockPlot(plotId: number): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const plot = state.plots.find((p) => p.id === plotId);

  if (!plot) return { success: false, message: "Không tìm thấy ô đất.", state };
  if (plot.isUnlocked) return { success: false, message: "Ô đất đã được mở khóa rồi.", state };

  const cost = plot.unlockCost;
  if (getFarmStars() < cost) {
    return { success: false, message: `Bạn cần ${cost} ⭐ để mở rộng ô đất này. Hãy ôn bài để nhận thêm sao!`, state };
  }

  spendFarmStars(cost);
  plot.isUnlocked = true;

  // Bonus EXP for expanding land
  state.exp += 100;
  const levelCheck = checkLevelUp(state.level, state.exp);
  if (levelCheck.didLevelUp) {
    state.level = levelCheck.newLevel;
  }

  saveFarmState(state);
  return { success: true, message: `Chúc mừng! Bạn đã mở rộng thêm 1 ô đất màu mỡ (+100 EXP)! 🚜`, state };
}

// Buy seeds with stars
export function buySeed(cropId: string, quantity: number = 1): { success: boolean; message: string; state: FarmState } {
  const crop = FARM_CROPS.find((c) => c.id === cropId);
  const state = getFarmState();

  if (!crop) return { success: false, message: "Không tìm thấy giống cây này.", state };
  if (state.level < crop.minFarmLevel) {
    return { success: false, message: `Yêu cầu Nông Trại Cấp ${crop.minFarmLevel} để mở khóa hạt giống này.`, state };
  }

  const totalCost = crop.seedCost * quantity;
  if (getFarmStars() < totalCost) {
    return { success: false, message: `Không đủ sao ⭐. Cần ${totalCost} ⭐ để mua ${quantity} túi hạt giống.`, state };
  }

  spendFarmStars(totalCost);
  const currentSeeds = state.seedInventory[cropId] || 0;
  state.seedInventory[cropId] = currentSeeds + quantity;

  saveFarmState(state);
  return { success: true, message: `Đã mua thành công ${quantity} túi hạt ${crop.name}!`, state };
}

// Buy supplies (water, fertilizer)
export function buySupply(type: "water" | "organic_fert" | "super_fert"): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  let cost = 0;

  if (type === "water") {
    cost = 40; // 40 stars = refill water tank to full (20)
    if (getFarmStars() < cost) return { success: false, message: "Không đủ sao để bơm nước giếng.", state };
    spendFarmStars(cost);
    state.waterCurrent = state.waterMax;
    saveFarmState(state);
    return { success: true, message: "Đã bơm đầy bình nước tưới (20/20)! 💧", state };
  }

  if (type === "organic_fert") {
    cost = 50; // 50 stars = 1 organic fertilizer
    if (getFarmStars() < cost) return { success: false, message: "Không đủ sao mua phân bón sinh học.", state };
    spendFarmStars(cost);
    state.fertilizerOrganic++;
    saveFarmState(state);
    return { success: true, message: "Đã mua 1 gói Phân Bón Sinh Học 🧪 (-50% thời gian lớn)!", state };
  }

  if (type === "super_fert") {
    cost = 120; // 120 stars = 1 super fertilizer
    if (getFarmStars() < cost) return { success: false, message: "Không đủ sao mua phân bón thần tốc.", state };
    spendFarmStars(cost);
    state.fertilizerSuper++;
    saveFarmState(state);
    return { success: true, message: "Đã mua 1 bình Phân Bón Thần Tốc ⚡ (Chín cây tức thì)!", state };
  }

  return { success: false, message: "Vật phẩm không hợp lệ.", state };
}

// Refill water for free (cooldown or free well)
export function refillWaterFree(): { success: boolean; message: string; state: FarmState } {
  const state = getFarmState();
  const now = Date.now();
  const elapsedMinutes = (now - (state.lastWaterRefillAt || 0)) / (1000 * 60);

  if (state.waterCurrent >= state.waterMax) {
    return { success: false, message: "Bình nước tưới đã đầy!", state };
  }

  // Free refill gives +5 water
  const refillAmount = 5;
  state.waterCurrent = Math.min(state.waterMax, state.waterCurrent + refillAmount);
  state.lastWaterRefillAt = now;

  saveFarmState(state);
  return { success: true, message: `Đã múc thêm +${refillAmount} gáo nước từ giếng ngọc! 💧`, state };
}

// Sell single crop type from barn
export function sellCropFromInventory(cropId: string, quantity?: number): {
  success: boolean;
  earnedStars: number;
  message: string;
  state: FarmState;
} {
  const state = getFarmState();
  const crop = FARM_CROPS.find((c) => c.id === cropId);
  const count = state.inventory[cropId] || 0;

  if (!crop || count <= 0) return { success: false, earnedStars: 0, message: "Không có nông sản này để bán.", state };

  const sellCount = quantity ? Math.min(count, quantity) : count;
  const earned = sellCount * crop.sellPricePerUnit;

  state.inventory[cropId] = count - sellCount;
  state.stats.totalStarsEarned += earned;
  addFarmStars(earned);

  saveFarmState(state);
  return {
    success: true,
    earnedStars: earned,
    message: `Đã bán ${sellCount} ${crop.name} thu về +${earned.toLocaleString()} ⭐! 💰`,
    state,
  };
}

// Sell ALL harvested crops in barn
export function sellAllCropsFromInventory(): {
  success: boolean;
  earnedStars: number;
  soldCount: number;
  message: string;
  state: FarmState;
} {
  const state = getFarmState();
  let totalStars = 0;
  let totalItems = 0;

  for (const [cropId, count] of Object.entries(state.inventory)) {
    if (count > 0) {
      const crop = FARM_CROPS.find((c) => c.id === cropId);
      if (crop) {
        totalStars += count * crop.sellPricePerUnit;
        totalItems += count;
        state.inventory[cropId] = 0;
      }
    }
  }

  if (totalItems <= 0) {
    return { success: false, earnedStars: 0, soldCount: 0, message: "Kho nông sản trống, hãy thu hoạch thêm cây trồng!", state };
  }

  state.stats.totalStarsEarned += totalStars;
  addFarmStars(totalStars);
  saveFarmState(state);

  return {
    success: true,
    earnedStars: totalStars,
    soldCount: totalItems,
    message: `Đã xuất kho ${totalItems} nông sản thu về +${totalStars.toLocaleString()} ⭐! 💰🎉`,
    state,
  };
}

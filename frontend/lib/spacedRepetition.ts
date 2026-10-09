export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayScheduleConfig {
  key: DayKey;
  dayNumber: number; // 1 = Mon ... 7 = Sun
  label: string; // "Thứ 2", "Thứ 3", etc.
  shortLabel: string; // "T2", "T3", etc.
  englishLabel: string;
  icon: string;
  badgeColor: string;
}

export const DAYS_OF_WEEK: DayScheduleConfig[] = [
  { key: "mon", dayNumber: 1, label: "Thứ 2", shortLabel: "T2", englishLabel: "Monday", icon: "🚀", badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { key: "tue", dayNumber: 2, label: "Thứ 3", shortLabel: "T3", englishLabel: "Tuesday", icon: "⚡", badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  { key: "wed", dayNumber: 3, label: "Thứ 4", shortLabel: "T4", englishLabel: "Wednesday", icon: "🌿", badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { key: "thu", dayNumber: 4, label: "Thứ 5", shortLabel: "T5", englishLabel: "Thursday", icon: "🔥", badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { key: "fri", dayNumber: 5, label: "Thứ 6", shortLabel: "T6", englishLabel: "Friday", icon: "💎", badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  { key: "sat", dayNumber: 6, label: "Thứ 7", shortLabel: "T7", englishLabel: "Saturday", icon: "✨", badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  { key: "sun", dayNumber: 7, label: "Chủ nhật", shortLabel: "CN", englishLabel: "Sunday", icon: "👑", badgeColor: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
];

export function getTodayKey(): DayKey {
  const day = new Date().getDay();
  switch (day) {
    case 1: return "mon";
    case 2: return "tue";
    case 3: return "wed";
    case 4: return "thu";
    case 5: return "fri";
    case 6: return "sat";
    case 0: return "sun";
    default: return "mon";
  }
}

export function getNextDayOccurrence(dayKey: DayKey): string {
  const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.key === dayKey);
  const targetDay = dayIndex === 6 ? 0 : dayIndex + 1; // 1 for Mon, 0 for Sun
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = (targetDay - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // Next week's occurrence
  const nextDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  return nextDate.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export interface SpacedWordItem {
  id: string;
  word: string;
  meaning: string;
  example: string;
  topic?: string;
  stage?: number;
  intervalDays?: number;
  dayOfWeek?: DayKey;
  isNewThisWeek?: boolean;
  createdAt?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export function isDueForReview(item: {
  nextReviewAt?: string | null;
  lastReviewedAt?: string | null;
  intervalDays?: number;
  stage?: number;
}): boolean {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  // 1. If already reviewed today, it is NOT due again today
  if (item.lastReviewedAt) {
    const d = new Date(item.lastReviewedAt);
    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    ) {
      return false;
    }
  }

  // 2. If nextReviewAt timestamp exists, check if due on or before end of today
  if (item.nextReviewAt) {
    return new Date(item.nextReviewAt).getTime() <= endOfToday;
  }

  // 3. If lastReviewedAt exists, calculate future due time from intervalDays
  if (item.lastReviewedAt) {
    const days = item.intervalDays || 1;
    const dueTime = new Date(item.lastReviewedAt).getTime() + days * 86400000;
    return dueTime <= endOfToday;
  }

  // 4. If word is already at higher stage (stage >= 2) but has no timestamp, it's resting in cycle
  if (item.stage && item.stage >= 2) {
    return false;
  }

  // 5. Unreviewed / new word (stage 1) -> ready for review
  return true;
}

export function buildSpacedWordPool(
  customWords: { id: number; word: string; meaning?: string; example?: string; stage?: number; intervalDays?: number; lastReviewedAt?: string; nextReviewAt?: string; listName?: string }[],
  savedStages: Record<string, any> = {},
  source: "all" | "custom" | "preset" = "all",
  selectedFolder: string = "all"
): SpacedWordItem[] {
  const customItems: SpacedWordItem[] = customWords.map((cw) => {
    const cleanWord = cw.word ? cw.word.trim().toLowerCase() : "";
    const key = `custom-${cw.id}`;
    const saved =
      savedStages[key] ||
      (cleanWord ? savedStages[`word-${cleanWord}`] : undefined);
    const stage = saved?.stage ?? cw.stage ?? 1;
    const intervalDays = saved?.intervalDays ?? cw.intervalDays ?? 1;
    return {
      id: key,
      word: cw.word,
      meaning: cw.meaning || "",
      example: cw.example || "",
      topic: cw.listName || "Thư mục cá nhân",
      stage,
      intervalDays,
      lastReviewedAt: saved?.lastReviewedAt ?? cw.lastReviewedAt,
      nextReviewAt: saved?.nextReviewAt ?? cw.nextReviewAt,
    };
  });

  const presetItems: SpacedWordItem[] = SPACED_REPETITION_PRESET_WORDS.map((w) => {
    const cleanWord = w.word ? w.word.trim().toLowerCase() : "";
    const saved =
      savedStages[w.id] ||
      savedStages[`preset-${w.id}`] ||
      (cleanWord ? savedStages[`word-${cleanWord}`] : undefined);
    return saved
      ? {
          ...w,
          intervalDays: saved.intervalDays ?? w.intervalDays ?? 1,
          stage: saved.stage ?? w.stage ?? 1,
          lastReviewedAt: saved.lastReviewedAt ?? w.lastReviewedAt,
          nextReviewAt: saved.nextReviewAt ?? w.nextReviewAt,
        }
      : w;
  });

  let pool: SpacedWordItem[] = [];
  if (source === "custom") {
    pool = customItems.length > 0 ? customItems : presetItems;
  } else if (source === "preset") {
    pool = presetItems;
  } else {
    pool = [...customItems, ...presetItems];
  }

  if (selectedFolder !== "all") {
    pool = pool.filter((w) => (w.topic || "").toLowerCase() === selectedFolder.toLowerCase());
  }

  return pool;
}

export const SPACING_INTERVALS = [
  { stage: 1, days: 1, label: "1 ngày", title: "Mới học / Ôn lại", icon: "🔥", badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { stage: 2, days: 3, label: "3 ngày", title: "Ghi nhớ cơ bản", icon: "⚡", badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { stage: 3, days: 7, label: "7 ngày", title: "Ghi nhớ trung hạn", icon: "🌿", badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  { stage: 4, days: 14, label: "14 ngày", title: "Ghi nhớ bền vững", icon: "💎", badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { stage: 5, days: 30, label: "Thành thạo", title: "Bộ nhớ dài hạn", icon: "⭐", badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
] as const;

export function getNextSpacedStep(currentDays: number = 1): { nextDays: number; nextStage: number; label: string } {
  if (currentDays <= 1) return { nextDays: 3, nextStage: 2, label: "3 ngày" };
  if (currentDays <= 3) return { nextDays: 7, nextStage: 3, label: "7 ngày" };
  if (currentDays <= 7) return { nextDays: 14, nextStage: 4, label: "14 ngày" };
  return { nextDays: 30, nextStage: 5, label: "Thành thạo (30 ngày)" };
}

import { getWordPhonetic } from "./phoneticDictionary";
export { getWordPhonetic };

export const POS_REGEX = /\((n|v|adj|adv|prep|conj|pron|num|art|phrase|phr v|phr|v,\s*n|n,\s*v|a)\)/gi;

// Smart breakdown of word structure for rich UI rendering
export function analyzeWordStructure(rawWord: string) {
  const text = (rawWord || "").trim();

  // Extract POS tags
  const posMatches = [...text.matchAll(POS_REGEX)];
  const posTags = posMatches.map((m) => m[0]);

  // Check for collocations like "=> do inventory = make inventory (v)"
  let mainPart = text;
  let collocation = "";
  if (text.includes("=>")) {
    const splitArrow = text.split("=>");
    mainPart = splitArrow[0].trim();
    collocation = splitArrow.slice(1).join("=>").trim();
  }

  // Check for synonyms like "exposition = exhibit"
  let headword = mainPart;
  let synonym = "";
  if (mainPart.includes("=")) {
    const splitEq = mainPart.split("=");
    headword = splitEq[0].trim();
    synonym = splitEq.slice(1).join("=").trim();
  }

  // Clean primary headword for TTS audio pronunciation
  const cleanHeadword = headword.replace(/\([^\)]*\)/g, "").trim();
  const phonetic = getWordPhonetic(cleanHeadword || text);

  // Parse synonym tokens with phonetic IPA
  const cleanSynonym = synonym.replace(/\([^\)]*\)/g, "").trim();
  const synTokens = cleanSynonym
    ? cleanSynonym
        .split(/[,;/=]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const synonymsWithPhonetic = synTokens.map((syn) => ({
    word: syn,
    phonetic: getWordPhonetic(syn),
  }));

  return {
    original: text,
    headword: headword.replace(/\([^\)]*\)/g, "").trim() || headword,
    synonym: cleanSynonym,
    synonymsWithPhonetic,
    collocation,
    posTags: posTags.length > 0 ? posTags : [],
    cleanForSpeech: cleanHeadword || text,
    phonetic,
  };
}

// Danh sách từ vựng có sẵn (Hacker TOEIC 30 Ngày)
export const SPACED_REPETITION_PRESET_WORDS: SpacedWordItem[] = [
  {
    id: "preset-d01-01",
    word: "résumé (n)",
    meaning: "sơ yếu lý lịch",
    example: "Fax your résumé and cover letter to the above number. (Hãy gửi sơ yếu lý lịch và đơn xin việc của bạn qua fax đến số bên trên.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-02",
    word: "opening = vacancy (n)",
    meaning: "vị trí trống, sự mở cửa, lễ khai trương (khoảng trống, vị trí trống)",
    example: "There are several job openings at the restaurant right now. (Ngay bây giờ đang có một vài vị trí công việc còn trống ở nhà hàng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-03",
    word: "applicant (n) => apply (v) => application (n)",
    meaning: "ứng viên, người xin việc (đơn đăng ký, ứng tuyển)",
    example: "Applicants are required to submit a résumé. (Các ứng viên cần phải nộp sơ yếu lý lịch.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-04",
    word: "requirement = prerequisite (n)",
    meaning: "điều kiện cần thiết, yêu cầu (điều kiện tiên quyết)",
    example: "A driver's license is a requirement of this job. (Giấy phép lái xe là một điều kiện cần cho công việc này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-05",
    word: "meet = satisfy = fulfill (v)",
    meaning: "thỏa mãn, đáp ứng (yêu cầu, điều kiện)",
    example: "Applicants must meet all the requirements for the job. (Các ứng viên phải đáp ứng tất cả yêu cầu của công việc.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-06",
    word: "qualified = certified (adj)",
    meaning: "đủ khả năng, trình độ, điều kiện (được chứng nhận)",
    example: "People with master's degrees are qualified for the research position. (Những người có bằng thạc sĩ thì đủ điều kiện cho vị trí nghiên cứu này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-07",
    word: "candidate = applicant (n)",
    meaning: "thí sinh, ứng viên",
    example: "Five candidates will be selected for final interviews. (Năm ứng viên sẽ được chọn vào vòng phỏng vấn cuối cùng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-08",
    word: "confidence (n) => confident (adj)",
    meaning: "sự tự tin, sự tin tưởng, lòng tin",
    example: "We have confidence that she can handle the position. (Chúng tôi có lòng tin rằng cô ấy có thể đảm đương được vị trí này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-09",
    word: "highly (adv)",
    meaning: "rất, hết sức (highly qualified/competent/recommended)",
    example: "Mr. Monroe's experience makes him highly qualified for the job. (Kinh nghiệm của Monroe khiến ông ấy rất phù hợp với công việc này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-10",
    word: "professional (adj, n) => profession (n)",
    meaning: "có tính chuyên môn, chuyên nghiệp, lành nghề; chuyên gia",
    example: "Jeff is known as a professional photographer. (Jeff được biết đến như một nhiếp ảnh gia chuyên nghiệp.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-11",
    word: "interview (n, v)",
    meaning: "cuộc phỏng vấn; phỏng vấn",
    example: "The interviews are being held in meeting room three. (Các cuộc phỏng vấn đang được thực hiện tại phòng họp số 3.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-12",
    word: "hire (v)",
    meaning: "thuê mướn, tuyển dụng",
    example: "The company expects to hire several new employees next month. (Công ty kỳ vọng sẽ tuyển được vài nhân viên mới vào tháng tới.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-13",
    word: "training (n)",
    meaning: "sự đào tạo, huấn luyện (on-the-job training)",
    example: "This company offers on-the-job training for new staff. (Công ty này cung cấp chương trình đào tạo tại chỗ cho nhân viên mới.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-14",
    word: "reference (n) => refer (v)",
    meaning: "sự giới thiệu, sự tham khảo, thư giới thiệu (reference letter)",
    example: "Philip asked his previous employer to write a reference letter for him. (Philip nhờ quản lý cũ của mình viết một lá thư giới thiệu cho anh ấy.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-15",
    word: "position (n, v)",
    meaning: "chức vụ, vị trí (công việc); định vị, đặt vào vị trí",
    example: "The advertised position provides health care and other benefits. (Vị trí được quảng cáo đó cung cấp dịch vụ chăm sóc sức khỏe và các phúc lợi khác.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-16",
    word: "achievement (n) => achieve (v)",
    meaning: "thành tựu, thành tích, sự đạt được",
    example: "List all of your achievements from previous jobs on your résumé. (Hãy liệt kê tất cả những thành tích của bạn trong công việc trước vào bản sơ yếu lý lịch.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-17",
    word: "impressed (adj) => impressive (adj)",
    meaning: "có ấn tượng, cảm phục (bị ấn tượng bởi ai/cái gì)",
    example: "The CEO was impressed by his assistant's organizing skills. (Vị giám đốc điều hành đã bị ấn tượng bởi kỹ năng tổ chức của viên thư ký đó.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-18",
    word: "excellent (adj)",
    meaning: "xuất sắc, vượt trội, ưu tú (excellent managerial skills)",
    example: "Because of her excellent managerial skills, Erin was hired for the job. (Nhờ kỹ năng quản lý xuất sắc của mình, Erin đã được tuyển dụng làm công việc này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-19",
    word: "eligible (adj) => eligibility (n)",
    meaning: "có đủ tư cách, thích hợp (be eligible for / be eligible to do)",
    example: "The part-time workers are also eligible for paid holidays. (Các nhân viên bán thời gian cũng đủ điều kiện để được nghỉ phép có trả lương.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-20",
    word: "identify (v) => identification (n)",
    meaning: "nhận diện, nhận ra (giấy tờ chứng minh, chứng minh thư)",
    example: "Staff members wear uniforms so that they are easy for customers to identify. (Các nhân viên mặc đồng phục để khách hàng dễ dàng nhận ra họ.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-21",
    word: "associate (v, n, adj) => association (n)",
    meaning: "liên kết, kết giao; đồng minh, cộng sự (be associated with / in association with)",
    example: "Two of the applicants were associated with a competitor. (Hai trong số các ứng viên có liên kết với một đối thủ.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-22",
    word: "condition (n)",
    meaning: "điều kiện (conditions of employment: điều kiện làm việc/tuyển dụng)",
    example: "The conditions of employment are listed in the job. (Những điều kiện của công việc được liệt kê trong thông báo tuyển dụng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-23",
    word: "employment (n) => employ (v)",
    meaning: "việc làm, sự thuê mướn (employee, employer, unemployment)",
    example: "The company announced employment opportunities in personnel department. (Công ty đã thông báo những cơ hội việc làm ở phòng nhân sự.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-24",
    word: "lack (v, n)",
    meaning: "thiếu, không có; sự thiếu hụt (lack of funds)",
    example: "Carl lacked the ability to get along well with his coworkers. (Carl không có khả năng hòa nhập với các đồng nghiệp của mình.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-25",
    word: "managerial = supervisory (adj)",
    meaning: "thuộc về quản lý (managerial staff/experience: nhân viên/kinh nghiệm quản lý)",
    example: "Mike is seeking a managerial position in the accounting field. (Mike đang tìm kiếm một vị trí quản lý trong ngành kế toán.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-26",
    word: "diligent (adj) => diligence (n)",
    meaning: "siêng năng, cần cù (diligently: một cách chăm chỉ)",
    example: "Carmen is one of the most diligent workers in the company. (Carmen là một trong những nhân viên siêng năng nhất ở công ty này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-27",
    word: "familiar (adj) => familiarize (v)",
    meaning: "quen thuộc, thuần thục (be familiar with: quen thuộc với, nắm rõ)",
    example: "Staff must review the handbook to become familiar with it. (Nhân viên phải xem lại sổ tay hướng dẫn để nắm rõ nó.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-28",
    word: "proficiency (n) => proficient (adj)",
    meaning: "sự thông thạo, sự thành thạo (proficiency in a language)",
    example: "Overseas workers need proof of proficiency in a second language. (Người lao động ở nước ngoài cần phải chứng minh sự thông thạo một ngôn ngữ thứ hai.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-29",
    word: "prospective (adj) => prospect (n)",
    meaning: "có triển vọng, có tiềm năng, có tương lai (prospective employees)",
    example: "Prospective employees were asked to come in for a second interview. (Các nhân viên tiềm năng được yêu cầu đến phỏng vấn vòng hai.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-30",
    word: "appeal = attract (v)",
    meaning: "kêu gọi, lôi cuốn, hấp dẫn (appeal to: lôi cuốn ai/điều gì)",
    example: "The 10 percent pay increase appealed to the staff. (Mức tăng lương 10% đã hấp dẫn các nhân viên.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-31",
    word: "specialize (v)",
    meaning: "chuyên làm về, học chuyên về (specialize in)",
    example: "Most of the programmers specialized in software design in college. (Hầu hết các lập trình viên đều học chuyên về thiết kế phần mềm ở trường đại học.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-32",
    word: "apprehensive = concerned (adj)",
    meaning: "lo lắng, e sợ (apprehensive before an interview)",
    example: "Many people feel apprehensive before an important job interview. (Nhiều người cảm thấy lo lắng trước một cuộc phỏng vấn tuyển dụng quan trọng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-33",
    word: "consultant (n) => consult (v)",
    meaning: "người tư vấn, cố vấn (consultation: sự tư vấn; consult with)",
    example: "Emma currently works in London as an interior design consultant. (Emma hiện đang làm việc ở London trong vai trò một người tư vấn thiết kế nội thất.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-34",
    word: "entitle (v)",
    meaning: "cho quyền làm gì (be entitled to: được hưởng, có quyền)",
    example: "Executives are entitled to additional benefits. (Các ủy viên ban quản trị được hưởng những quyền lợi bổ sung.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-35",
    word: "degree (n)",
    meaning: "trình độ, bằng cấp (bằng cử nhân, thạc sĩ...)",
    example: "A bachelor's degree in engineering is a requirement for this position. (Bằng cử nhân về kỹ thuật là một điều kiện cần thiết cho vị trí này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-36",
    word: "payroll (n)",
    meaning: "bảng lương, tổng quỹ lương (on the payroll: được tuyển dụng)",
    example: "Fifteen new employees were added to the payroll last month. (Mười lăm nhân viên mới đã được bổ sung vào bảng lương tháng trước.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-37",
    word: "recruit (v, n) => recruitment (n)",
    meaning: "tuyển dụng, chiêu mộ; nhân viên mới (recruiter: người tuyển dụng)",
    example: "The firm recruits promising graduates on a yearly basis. (Hàng năm, công ty tuyển dụng những sinh viên mới tốt nghiệp đầy triển vọng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-38",
    word: "certification (n) => certify (v)",
    meaning: "sự chứng nhận, giấy chứng nhận (certified, certificate)",
    example: "Obtaining accounting certification takes approximately a year. (Mất xấp xỉ một năm để có được giấy chứng nhận kế toán.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-39",
    word: "occupation = job = vocation (n)",
    meaning: "nghề nghiệp (occupy, occupational, occupant)",
    example: "Journalism is an interesting and challenging occupation. (Làm báo là một nghề thú vị và đầy thử thách.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-40",
    word: "wage (n)",
    meaning: "tiền lương, tiền công (tính theo giờ hoặc tuần; khác salary, compensation)",
    example: "Workers with formal education may earn higher wages than those without. (Người lao động được đào tạo chính quy có thể nhận được mức lương cao hơn những người không có trình độ.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-41",
    word: "application form (phr)",
    meaning: "mẫu đơn xin việc",
    example: "Please fill out this application form and attach your photo. (Vui lòng điền vào mẫu đơn xin việc này và đính kèm ảnh của bạn.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-42",
    word: "career (n)",
    meaning: "sự nghiệp, nghề nghiệp",
    example: "She is pursuing a successful career in international finance. (Cô ấy đang theo đuổi một sự nghiệp thành công trong ngành tài chính quốc tế.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-43",
    word: "completion (n)",
    meaning: "sự hoàn thành",
    example: "You will receive a certificate upon completion of the course. (Bạn sẽ nhận được chứng chỉ sau khi hoàn thành khóa học.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-44",
    word: "fair (adj)",
    meaning: "công bằng, hợp lý",
    example: "The hiring manager ensured a fair selection process for all candidates. (Trưởng phòng tuyển dụng đã đảm bảo một quy trình chọn lọc công bằng cho mọi ứng viên.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-45",
    word: "graduation (n)",
    meaning: "sự tốt nghiệp",
    example: "He applied for the job immediately after graduation. (Anh ấy đã nộp đơn xin việc ngay sau khi tốt nghiệp.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-46",
    word: "in fact (phr)",
    meaning: "trong thực tế",
    example: "In fact, many applicants already have relevant work experience. (Trong thực tế, nhiều ứng viên đã có kinh nghiệm làm việc liên quan.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-47",
    word: "job fair (phr)",
    meaning: "hội chợ việc làm",
    example: "Students attended the annual job fair to meet prospective employers. (Các sinh viên đã tham dự hội chợ việc làm thường niên để gặp gỡ các nhà tuyển dụng tiềm năng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-48",
    word: "job offer (phr)",
    meaning: "lời mời làm việc",
    example: "She received an attractive job offer from a multinational corporation. (Cô ấy đã nhận được một lời mời làm việc hấp dẫn từ một tập đoàn đa quốc gia.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-49",
    word: "list (n, v)",
    meaning: "danh sách; liệt kê",
    example: "Please check the list of candidates shortlisted for the interview. (Vui lòng kiểm tra danh sách các ứng viên được chọn vào vòng phỏng vấn.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-50",
    word: "newcomer (n)",
    meaning: "người mới đến, nhân viên mới",
    example: "The company held an orientation meeting to welcome the newcomers. (Công ty đã tổ chức một buổi định hướng để chào đón các nhân viên mới.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-51",
    word: "part-time (adj)",
    meaning: "bán thời gian",
    example: "He took a part-time job while completing his degree. (Anh ấy đã làm một công việc bán thời gian trong khi hoàn thành bằng cấp của mình.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-52",
    word: "previous job (phr)",
    meaning: "công việc trước đây",
    example: "She mentioned her previous job experiences during the interview. (Cô ấy đã đề cập đến các kinh nghiệm công việc trước đây trong buổi phỏng vấn.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-53",
    word: "secretary (n)",
    meaning: "thư ký",
    example: "The secretary scheduled the interviews for next Monday. (Thư ký đã lên lịch các buổi phỏng vấn cho thứ Hai tuần tới.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-54",
    word: "send in (phr)",
    meaning: "nộp, giao",
    example: "All applicants must send in their résumés before the deadline. (Tất cả ứng viên phải nộp sơ yếu lý lịch của mình trước hạn chót.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-55",
    word: "tidy (adj)",
    meaning: "gọn gàng, ngăn nắp",
    example: "Keep your desk and workspace tidy at all times. (Hãy luôn giữ bàn làm việc và không gian làm việc của bạn gọn gàng.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-56",
    word: "trainee (n)",
    meaning: "thực tập sinh, người được đào tạo",
    example: "The senior supervisor is training a group of new trainees. (Người giám sát cấp cao đang hướng dẫn một nhóm thực tập sinh mới.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-57",
    word: "apply for (phr)",
    meaning: "ứng tuyển vào",
    example: "Over two hundred candidates applied for the managerial position. (Hơn hai trăm ứng viên đã nộp đơn ứng tuyển vào vị trí quản lý.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-58",
    word: "aptitude (n)",
    meaning: "năng khiếu, năng lực",
    example: "The pre-employment test measures the candidate's technical aptitude. (Bài kiểm tra trước tuyển dụng đo lường năng khiếu kỹ thuật của ứng viên.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-59",
    word: "be admitted to (phr)",
    meaning: "được nhận vào",
    example: "Only top candidates will be admitted to the training program. (Chỉ những ứng viên xuất sắc nhất mới được nhận vào chương trình đào tạo.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-60",
    word: "be advised to do (phr)",
    meaning: "được khuyên làm",
    example: "Applicants are advised to arrive ten minutes before their interview. (Các ứng viên được khuyên nên đến trước mười phút trước giờ phỏng vấn.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-61",
    word: "criteria (n)",
    meaning: "tiêu chuẩn (dạng số nhiều của criterion)",
    example: "The selection criteria include communication skills and leadership. (Các tiêu chuẩn chọn lựa bao gồm kỹ năng giao tiếp và khả năng lãnh đạo.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-62",
    word: "decade (n)",
    meaning: "thập kỷ",
    example: "He has worked in human resources recruitment for over a decade. (Ông ấy đã làm việc trong ngành tuyển dụng nhân sự hơn một thập kỷ.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-63",
    word: "employ (v)",
    meaning: "thuê, mướn",
    example: "The factory employs more than five hundred skilled workers. (Nhà máy thuê hơn năm trăm công nhân lành nghề.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-64",
    word: "insufficient (adj)",
    meaning: "không đủ, thiếu",
    example: "His application was rejected due to insufficient work experience. (Đơn ứng tuyển của anh ấy bị từ chối do thiếu kinh nghiệm làm việc.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-65",
    word: "minimum (n, adj)",
    meaning: "mức tối thiểu; tối thiểu",
    example: "Two years of experience is the minimum requirement for the position. (Hai năm kinh nghiệm là yêu cầu tối thiểu cho vị trí này.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-66",
    word: "party (n)",
    meaning: "bữa tiệc, nhóm, tổ chức, bên tham gia",
    example: "Both parties agreed to the terms outlined in the employment contract. (Cả hai bên đã đồng ý với các điều khoản nêu trong hợp đồng lao động.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-67",
    word: "plentiful (adj)",
    meaning: "dồi dào",
    example: "Career opportunities are plentiful in the growing technology sector. (Cơ hội nghề nghiệp rất dồi dào trong lĩnh vực công nghệ đang phát triển.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
  {
    id: "preset-d01-68",
    word: "profession (n)",
    meaning: "nghề nghiệp",
    example: "Teaching is considered a highly respected and noble profession. (Dạy học được coi là một nghề nghiệp được kính trọng và cao quý.)",
    topic: "Thoát cảnh thất nghiệp",
    stage: 1,
    intervalDays: 1,
  },
];

// Helper to record learning progress for ANY word into database backend across all modes
export async function recordWordProgressToDb(payload: {
  word: string;
  meaning?: string;
  example?: string;
  listName?: string;
  stage?: number;
  intervalDays?: number;
  isCorrect?: boolean;
}): Promise<boolean> {
  // Update local spaced_vocab_stages cache immediately
  if (typeof window !== "undefined" && payload.word) {
    try {
      const raw = localStorage.getItem("spaced_vocab_stages") || "{}";
      const parsed = JSON.parse(raw);
      const nowStr = new Date().toISOString();
      const intervalDays = payload.intervalDays ?? (payload.isCorrect ? 3 : 1);
      const stage = payload.stage ?? (payload.isCorrect ? 2 : 1);
      const nextReviewStr = new Date(Date.now() + intervalDays * 86400000).toISOString();

      const wordKey = `word-${payload.word.trim().toLowerCase()}`;
      parsed[wordKey] = {
        intervalDays,
        stage,
        lastReviewedAt: nowStr,
        nextReviewAt: nextReviewStr,
      };
      localStorage.setItem("spaced_vocab_stages", JSON.stringify(parsed));
    } catch {}
  }

  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (!token) return true;

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');
  try {
    const res = await fetch(`${apiUrl}/api/vocabulary/record-learning`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to record word learning to DB:", err);
    return false;
  }
}

export async function recordWordsBatchToDb(
  items: Array<{
    word: string;
    meaning?: string;
    example?: string;
    listName?: string;
    stage?: number;
    intervalDays?: number;
    isCorrect?: boolean;
  }>
): Promise<boolean> {
  if (typeof window === "undefined" || items.length === 0) return false;
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (!token) return false;

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');
  try {
    const res = await fetch(`${apiUrl}/api/vocabulary/record-learning/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Failed to record words batch to DB:", err);
    return false;
  }
}


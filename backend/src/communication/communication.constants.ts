export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export const MODES = ['free', 'roleplay', 'daily'] as const;
export type Mode = (typeof MODES)[number];

export const CORRECTION_MODES = ['gentle', 'detailed', 'none'] as const;
export type CorrectionMode = (typeof CORRECTION_MODES)[number];

/** Topics for Free Conversation and Daily Speaking Practice. */
export const TOPICS = [
  { id: 'daily-life', label: 'Daily life', labelVi: 'Cuộc sống hằng ngày' },
  { id: 'hobbies', label: 'Hobbies', labelVi: 'Sở thích' },
  { id: 'food', label: 'Food', labelVi: 'Ẩm thực' },
  { id: 'travel', label: 'Travel', labelVi: 'Du lịch' },
  { id: 'movies', label: 'Movies', labelVi: 'Phim ảnh' },
  { id: 'technology', label: 'Technology', labelVi: 'Công nghệ' },
  { id: 'work', label: 'Work', labelVi: 'Công việc' },
  { id: 'education', label: 'Education', labelVi: 'Giáo dục' },
] as const;

/** Role-play situations. `aiRole` / `userRole` are given to the model so it keeps the character. */
export const SCENARIOS = [
  { id: 'coffee-shop', label: 'At a coffee shop', labelVi: 'Quán cà phê', aiRole: 'a friendly barista', userRole: 'a customer ordering a drink' },
  { id: 'job-interview', label: 'At a job interview', labelVi: 'Phỏng vấn xin việc', aiRole: 'a professional interviewer', userRole: 'a job candidate' },
  { id: 'airport', label: 'At an airport', labelVi: 'Sân bay', aiRole: 'an airport staff member', userRole: 'a passenger' },
  { id: 'hotel', label: 'Hotel check-in', labelVi: 'Nhận phòng khách sạn', aiRole: 'a hotel receptionist', userRole: 'a guest checking in' },
  { id: 'shopping', label: 'Shopping', labelVi: 'Mua sắm', aiRole: 'a shop assistant', userRole: 'a customer' },
  { id: 'restaurant', label: 'Restaurant', labelVi: 'Nhà hàng', aiRole: 'a waiter or waitress', userRole: 'a customer having a meal' },
  { id: 'directions', label: 'Asking for directions', labelVi: 'Hỏi đường', aiRole: 'a helpful local person', userRole: 'a lost visitor asking for directions' },
  { id: 'meeting-people', label: 'Meeting new people', labelVi: 'Làm quen', aiRole: 'a friendly person the user has just met', userRole: 'someone introducing themselves' },
  { id: 'ordering-food', label: 'Ordering food', labelVi: 'Gọi món', aiRole: 'a fast-food counter worker', userRole: 'a customer ordering food' },
] as const;

export const MAX_MESSAGE_LENGTH = 1000;
/** How many previous messages are sent to the model on each turn. */
export const HISTORY_LIMIT = 30;
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

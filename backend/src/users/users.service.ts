import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity.js';
import { UserActivityLog } from './user-activity-log.entity.js';
import { CustomVocabulary, CustomWordStatus } from '../vocabulary/custom-vocabulary.entity.js';
import { UserVocabulary, LearningStatus } from '../vocabulary/user-vocabulary.entity.js';

export class UpdateUserProfileDto {
  name?: string;
  avatar?: string;
  coverImage?: string;
  currentLevel?: string;
  dailyGoalMinutes?: number;
  reminderEnabled?: boolean;
  reminderTime?: string;
  vocabVisibilityConfig?: string;
  weeklyTargetDays?: number;
  studyPurpose?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(UserActivityLog)
    private activityRepo: Repository<UserActivityLog>,
    @InjectRepository(CustomVocabulary)
    private customVocabRepo: Repository<CustomVocabulary>,
    @InjectRepository(UserVocabulary)
    private userVocabRepo: Repository<UserVocabulary>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(name: string, email: string, password: string, goal = 600): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(password, 10);
    const user = this.repo.create({
      name,
      email,
      password: hashed,
      goal,
      role: UserRole.USER,
      isLocked: false,
      currentLanguage: 'en',
      avatar: '',
      currentLevel: 'B1 - Intermediate',
      streakDays: 0,
      todayMinutes: 0,
      dailyGoalMinutes: 25,
      totalHours: 0,
      xpPoints: 0,
      reminderEnabled: true,
      reminderTime: '20:30',
      lastActiveDate: '',
      vocabVisibilityConfig: '',
      weeklyTargetDays: 7,
    });
    return this.repo.save(user);
  }

  async createGoogleUser(name: string, email: string, googleId: string, avatar: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const user = this.repo.create({
      name,
      email,
      googleId,
      avatar,
      goal: 600,
      role: UserRole.USER,
      isLocked: false,
      currentLanguage: 'en',
      currentLevel: 'B1 - Intermediate',
      streakDays: 0,
      todayMinutes: 0,
      dailyGoalMinutes: 25,
      totalHours: 0,
      xpPoints: 0,
      reminderEnabled: true,
      reminderTime: '20:30',
      lastActiveDate: '',
      vocabVisibilityConfig: '',
      weeklyTargetDays: 7,
    });
    return this.repo.save(user);
  }

  async updateCurrentLanguage(userId: number, language: string): Promise<User> {
    const validLanguages = ['en', 'th', 'ko', 'zh', 'ja'];
    const lang = validLanguages.includes(language) ? language : 'en';
    await this.repo.update(userId, { currentLanguage: lang });
    const user = await this.findById(userId);
    return user!;
  }

  async updateProfile(userId: number, dto: UpdateUserProfileDto): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    if (dto.coverImage !== undefined) user.coverImage = dto.coverImage;
    if (dto.currentLevel !== undefined) user.currentLevel = dto.currentLevel;
    if (dto.dailyGoalMinutes !== undefined) user.dailyGoalMinutes = dto.dailyGoalMinutes;
    if (dto.reminderEnabled !== undefined) user.reminderEnabled = dto.reminderEnabled;
    if (dto.reminderTime !== undefined) user.reminderTime = dto.reminderTime;
    if (dto.vocabVisibilityConfig !== undefined) user.vocabVisibilityConfig = dto.vocabVisibilityConfig;
    if (dto.weeklyTargetDays !== undefined) user.weeklyTargetDays = dto.weeklyTargetDays;
    if (dto.studyPurpose !== undefined) user.studyPurpose = dto.studyPurpose;

    return this.repo.save(user);
  }

  async updatePasswordDirect(userId: number, hashedPassword: string): Promise<void> {
    await this.repo.update(userId, { password: hashedPassword });
  }

  async getUserStats(userId: number, language: string = 'en') {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    // Count actual mastered words from database
    const customMasteredCount = await this.customVocabRepo.count({
      where: {
        userId,
        status: 'mastered' as string,
        language: language || user.currentLanguage || 'en',
      },
    });

    const userVocabMasteredCount = await this.userVocabRepo.count({
      where: {
        userId,
        status: LearningStatus.MASTERED,
      },
    });

    const totalWordsLearned = customMasteredCount + userVocabMasteredCount;

    // Check today date and reset todayMinutes if new day
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If last active was before yesterday, streak is broken
    let effectiveStreak = user.streakDays || 0;
    if (user.lastActiveDate && user.lastActiveDate !== todayStr && user.lastActiveDate !== yesterday) {
      effectiveStreak = 0;
    }

    // Generate weekly calendar activity (Monday to Sunday)
    // Find Monday of the current week
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    // Query activity logs for this week
    const weeklyLogs = await this.activityRepo
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .andWhere('a.date IN (:...dates)', { dates: weekDates })
      .getMany();

    const activityByDate = new Map<string, UserActivityLog>();
    for (const log of weeklyLogs) {
      activityByDate.set(log.date, log);
    }

    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const weeklyDays = weekDates.map((dateStr, idx) => {
      const log = activityByDate.get(dateStr);
      const dayNum = dateStr.split('-')[2];
      const isToday = dateStr === todayStr;
      const isCompleted = log ? log.minutes > 0 || log.wordsLearned > 0 || log.xpEarned > 0 : false;
      return {
        day: dayLabels[idx],
        date: dayNum,
        completed: isCompleted,
        active: isToday,
      };
    });

    const weeklyCompletedDays = weeklyDays.filter((d) => d.completed).length;

    // Today minutes from activity log if present
    const todayLog = activityByDate.get(todayStr);
    const todayMinutes = todayLog ? todayLog.minutes : (user.lastActiveDate === todayStr ? user.todayMinutes : 0);

    // Default avatar if user has none
    const avatar = user.avatar && user.avatar.trim()
      ? user.avatar
      : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      avatar,
      coverImage: user.coverImage || '',
      hasPassword: !!user.password,
      currentLevel: user.currentLevel || 'B1 - Intermediate',
      streakDays: effectiveStreak,
      todayMinutes,
      dailyGoalMinutes: user.dailyGoalMinutes || 25,
      totalHours: user.totalHours || 0,
      wordsLearned: totalWordsLearned,
      totalWordsGoal: user.goal || 500,
      xpPoints: user.xpPoints || 0,
      weeklyTargetDays: user.weeklyTargetDays || 7,
      studyPurpose: user.studyPurpose || 'communication',
      weeklyCompletedDays,
      reminderEnabled: user.reminderEnabled ?? true,
      reminderTime: user.reminderTime || '20:30',
      vocabVisibilityConfig: user.vocabVisibilityConfig || '',
      weeklyDays,
    };
  }

  async getActivityHistory(userId: number): Promise<UserActivityLog[]> {
    return this.activityRepo.find({
      where: { userId },
      order: { date: 'DESC' }
    });
  }

  async logActivity(userId: number, minutes: number, xp: number = 0, wordsCount: number = 0) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Update streak
    if (!user.lastActiveDate || user.lastActiveDate === '') {
      user.streakDays = 1;
    } else if (user.lastActiveDate === yesterday) {
      user.streakDays = (user.streakDays || 0) + 1;
    } else if (user.lastActiveDate !== todayStr) {
      user.streakDays = 1;
    }
    user.lastActiveDate = todayStr;

    user.todayMinutes = (user.todayMinutes || 0) + minutes;
    user.totalHours = parseFloat(((user.totalHours || 0) + minutes / 60).toFixed(1));
    user.xpPoints = (user.xpPoints || 0) + xp;

    await this.repo.save(user);

    // Record activity log in DB
    let activity = await this.activityRepo.findOne({
      where: { userId, date: todayStr },
    });
    if (!activity) {
      activity = this.activityRepo.create({
        userId,
        date: todayStr,
        minutes,
        xpEarned: xp,
        wordsLearned: wordsCount,
      });
    } else {
      activity.minutes += minutes;
      activity.xpEarned += xp;
      activity.wordsLearned += wordsCount;
    }
    await this.activityRepo.save(activity);

    return {
      success: true,
      todayMinutes: user.todayMinutes,
      totalHours: user.totalHours,
      xpPoints: user.xpPoints,
      streakDays: user.streakDays,
    };
  }
}

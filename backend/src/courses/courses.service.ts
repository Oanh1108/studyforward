import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, CourseLevel, SkillType } from './lesson.entity.js';
import { UserLessonProgress } from './user-lesson-progress.entity.js';
import { User } from '../users/user.entity.js';
import { UserActivityLog } from '../users/user-activity-log.entity.js';

const INITIAL_LESSONS: Partial<Lesson>[] = [
  {
    id: 'les-1',
    unit: 1,
    title: 'Self-Introduction & Elevator Pitch',
    subtitle: 'Giới thiệu bản thân ấn tượng trong 30 giây',
    durationMin: 10,
    xpReward: 30,
    skill: 'speaking',
    level: 'B1',
    language: 'en',
    orderIndex: 1,
  },
  {
    id: 'les-2',
    unit: 1,
    title: 'Email Etiquette for Daily Work',
    subtitle: 'Viết email chuyên nghiệp, súc tích và lịch sự',
    durationMin: 12,
    xpReward: 40,
    skill: 'writing',
    level: 'B1',
    language: 'en',
    orderIndex: 2,
  },
  {
    id: 'les-3',
    unit: 2,
    title: 'Workplace Negotiation & Compromise',
    subtitle: 'Thương lượng điều khoản và tìm tiếng nói chung',
    durationMin: 15,
    xpReward: 50,
    skill: 'listening',
    level: 'B1',
    language: 'en',
    orderIndex: 3,
  },
  {
    id: 'les-4',
    unit: 2,
    title: 'Mastering Conditionals in Business',
    subtitle: 'Ngữ pháp câu điều kiện loại 2, 3 và hỗn hợp',
    durationMin: 14,
    xpReward: 45,
    skill: 'grammar',
    level: 'B1',
    language: 'en',
    orderIndex: 4,
  },
  {
    id: 'les-5',
    unit: 3,
    title: 'Essential Marketing & Sales Collocations',
    subtitle: 'Bộ 25 cụm từ vàng trong tiếp thị và bán hàng',
    durationMin: 12,
    xpReward: 35,
    skill: 'vocab',
    level: 'B1',
    language: 'en',
    orderIndex: 5,
  },
  {
    id: 'les-6',
    unit: 3,
    title: 'Handling Complaints & Angry Customers',
    subtitle: 'Xử lý khéo léo tình huống khiếu nại qua điện thoại',
    durationMin: 16,
    xpReward: 50,
    skill: 'speaking',
    level: 'B2',
    language: 'en',
    orderIndex: 6,
  },
  {
    id: 'les-a1-1',
    unit: 1,
    title: 'Greetings & Common Expressions',
    subtitle: 'Chào hỏi tự tin và làm quen bước đầu',
    durationMin: 8,
    xpReward: 25,
    skill: 'speaking',
    level: 'A1',
    language: 'en',
    orderIndex: 7,
  },
  {
    id: 'les-a2-1',
    unit: 1,
    title: 'Daily Routine & Office Habits',
    subtitle: 'Mô tả thói quen làm việc và lịch trình hàng ngày',
    durationMin: 10,
    xpReward: 30,
    skill: 'speaking',
    level: 'A2',
    language: 'en',
    orderIndex: 8,
  },
  {
    id: 'les-biz-1',
    unit: 1,
    title: 'Executive Presentation Skills',
    subtitle: 'Thuyết trình chiến lược trước ban lãnh đạo',
    durationMin: 20,
    xpReward: 60,
    skill: 'speaking',
    level: 'Business',
    language: 'en',
    orderIndex: 9,
  },
];

@Injectable()
export class CoursesService implements OnModuleInit {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(UserLessonProgress)
    private progressRepo: Repository<UserLessonProgress>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserActivityLog)
    private activityRepo: Repository<UserActivityLog>,
  ) {}

  async onModuleInit() {
    // Seed default lessons if none exist
    const count = await this.lessonRepo.count();
    if (count === 0) {
      for (const item of INITIAL_LESSONS) {
        await this.lessonRepo.save(this.lessonRepo.create(item));
      }
    }
  }

  async getLessons(userId: number, level?: string, skill?: string, language: string = 'en') {
    const query = this.lessonRepo.createQueryBuilder('l');
    if (language) {
      query.andWhere('(l.language = :language OR l.language = :defaultLang)', { language, defaultLang: 'en' });
    }
    if (level && level !== 'Business') {
      query.andWhere('l.level = :level', { level });
    } else if (level === 'Business') {
      query.andWhere('l.level = :level', { level: 'Business' });
    }
    if (skill && skill !== 'all') {
      query.andWhere('l.skill = :skill', { skill });
    }

    query.orderBy('l.orderIndex', 'ASC');
    const lessons = await query.getMany();

    // Fetch user progress for these lessons
    const progressList = await this.progressRepo.find({
      where: { userId },
    });
    const progressMap = new Map<string, UserLessonProgress>();
    for (const p of progressList) {
      progressMap.set(p.lessonId, p);
    }

    let hasUnlockedNext = false;
    return lessons.map((l, index) => {
      const p = progressMap.get(l.id);
      if (p) {
        return {
          ...l,
          status: p.status,
          score: p.score,
          stars: p.stars,
          progress: p.progress,
        };
      }

      // Default progressive unlocking logic:
      // First lesson is unlocked/in_progress, next lessons unlocked if previous is completed
      if (index === 0 && !hasUnlockedNext) {
        return {
          ...l,
          status: 'in_progress',
          score: 0,
          stars: 0,
          progress: 0,
        };
      }

      const prevLesson = lessons[index - 1];
      const prevProgress = prevLesson ? progressMap.get(prevLesson.id) : null;
      if (prevProgress && prevProgress.status === 'completed' && !hasUnlockedNext) {
        hasUnlockedNext = true;
        return {
          ...l,
          status: 'in_progress',
          score: 0,
          stars: 0,
          progress: 0,
        };
      }

      return {
        ...l,
        status: 'locked',
        score: 0,
        stars: 0,
        progress: 0,
      };
    });
  }

  async updateProgress(userId: number, lessonId: string, progress: number) {
    let userProgress = await this.progressRepo.findOne({
      where: { userId, lessonId },
    });
    if (!userProgress) {
      userProgress = this.progressRepo.create({
        userId,
        lessonId,
        status: 'in_progress',
        progress: Math.min(100, Math.max(0, progress)),
      });
    } else {
      userProgress.progress = Math.max(userProgress.progress, Math.min(100, progress));
      if (userProgress.status === 'locked') {
        userProgress.status = 'in_progress';
      }
    }
    return this.progressRepo.save(userProgress);
  }

  async completeLesson(userId: number, lessonId: string, score: number = 100, stars: number = 3) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Lesson not found: ${lessonId}`);
    }

    let userProgress = await this.progressRepo.findOne({
      where: { userId, lessonId },
    });

    const isFirstTimeCompleted = !userProgress || userProgress.status !== 'completed';

    if (!userProgress) {
      userProgress = this.progressRepo.create({
        userId,
        lessonId,
        status: 'completed',
        score,
        stars,
        progress: 100,
        completedAt: new Date(),
      });
    } else {
      userProgress.status = 'completed';
      userProgress.score = Math.max(userProgress.score, score);
      userProgress.stars = Math.max(userProgress.stars, stars);
      userProgress.progress = 100;
      if (!userProgress.completedAt) {
        userProgress.completedAt = new Date();
      }
    }
    await this.progressRepo.save(userProgress);

    // Update user stats in database
    const user = await this.userRepo.findOne({ where: { id: userId } });
    let earnedXp = 0;
    if (user) {
      // Award XP once (prevent duplicate exploit)
      if (isFirstTimeCompleted) {
        earnedXp = lesson.xpReward || 30;
        user.xpPoints = (user.xpPoints || 0) + earnedXp;
      }

      // Add minutes and total hours
      const studyMins = lesson.durationMin || 10;
      user.todayMinutes = (user.todayMinutes || 0) + studyMins;
      user.totalHours = parseFloat(((user.totalHours || 0) + studyMins / 60).toFixed(1));

      // Calculate streak
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (!user.lastActiveDate || user.lastActiveDate === '') {
        user.streakDays = 1;
      } else if (user.lastActiveDate === yesterday) {
        user.streakDays = (user.streakDays || 0) + 1;
      } else if (user.lastActiveDate !== todayStr) {
        user.streakDays = 1;
      }
      user.lastActiveDate = todayStr;

      await this.userRepo.save(user);

      // Record daily activity log
      let activity = await this.activityRepo.findOne({
        where: { userId, date: todayStr },
      });
      if (!activity) {
        activity = this.activityRepo.create({
          userId,
          date: todayStr,
          minutes: studyMins,
          xpEarned: earnedXp,
          wordsLearned: 0,
        });
      } else {
        activity.minutes += studyMins;
        activity.xpEarned += earnedXp;
      }
      await this.activityRepo.save(activity);
    }

    return {
      success: true,
      lessonId,
      earnedXp,
      isFirstTimeCompleted,
      totalXp: user?.xpPoints || 0,
      streakDays: user?.streakDays || 1,
    };
  }
}

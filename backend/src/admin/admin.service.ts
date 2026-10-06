import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '../users/user.entity.js';
import { AdminLog, AdminAction } from './admin-log.entity.js';
import { Vocabulary, CourseType } from '../vocabulary/vocabulary.entity.js';
import { CustomVocabulary } from '../vocabulary/custom-vocabulary.entity.js';
import { VocabularyFolder } from '../vocabulary/vocabulary-folder.entity.js';
import { UserVocabulary } from '../vocabulary/user-vocabulary.entity.js';

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isLocked: boolean;
  goal: number;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AdminLog)
    private logRepo: Repository<AdminLog>,
    @InjectRepository(Vocabulary)
    private vocabRepo: Repository<Vocabulary>,
    @InjectRepository(CustomVocabulary)
    private customVocabRepo: Repository<CustomVocabulary>,
    @InjectRepository(VocabularyFolder)
    private folderRepo: Repository<VocabularyFolder>,
    @InjectRepository(UserVocabulary)
    private userVocabRepo: Repository<UserVocabulary>,
    private dataSource: DataSource,
  ) {}

  // Helper to record an audit log entry
  async recordLog(
    admin: { id: number; email: string; name: string },
    action: string,
    targetType: string,
    targetId: string | number | null,
    details?: any,
  ) {
    try {
      const log = this.logRepo.create({
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      });
      await this.logRepo.save(log);
    } catch (err) {
      this.logger.error(`Failed to record admin log: ${err}`);
    }
  }

  // ==========================================
  // 1. STATS / OVERVIEW (AGGREGATE LEVEL ONLY)
  // ==========================================
  async getOverviewStats() {
    const [
      totalUsers,
      totalAdmins,
      totalLockedUsers,
      totalFolders,
      totalCustomWords,
      totalCurriculumWords,
      totalStudyRecords,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
      this.userRepo.count({ where: { isLocked: true } }),
      this.folderRepo.count(),
      this.customVocabRepo.count(),
      this.vocabRepo.count(),
      this.userVocabRepo.count(),
    ]);

    const recentLogs = await this.logRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalUsers,
      totalAdmins,
      totalLockedUsers,
      totalFolders,
      totalCustomWords,
      totalCurriculumWords,
      totalStudyRecords,
      recentLogs,
    };
  }

  // ==========================================
  // 2. USER MANAGEMENT
  // ==========================================
  async getUsers(params: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u');

    if (params.search && params.search.trim()) {
      const kw = `%${params.search.trim()}%`;
      qb.andWhere('(u.name ILIKE :kw OR u.email ILIKE :kw)', { kw });
    }

    if (params.role && params.role !== 'all') {
      qb.andWhere('u.role = :role', { role: params.role });
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'locked') {
        qb.andWhere('u.isLocked = :locked', { locked: true });
      } else if (params.status === 'active') {
        qb.andWhere('u.isLocked = :locked', { locked: false });
      }
    }

    qb.orderBy('u.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [rawUsers, total] = await qb.getManyAndCount();

    // Sanitize user: never leak password!
    const users: AdminUserListItem[] = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isLocked: u.isLocked,
      goal: u.goal,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Set user lock status (Lock / Unlock)
  async setUserLockStatus(
    admin: { id: number; email: string; name: string },
    targetUserId: number,
    isLocked: boolean,
  ) {
    // Run in transaction to prevent race conditions when checking last active admin
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const targetUser = await userRepo.findOne({ where: { id: targetUserId } });

      if (!targetUser) {
        throw new NotFoundException('Không tìm thấy tài khoản người dùng');
      }

      // Check protection of last active admin
      if (isLocked && targetUser.role === UserRole.ADMIN && !targetUser.isLocked) {
        const activeAdminsCount = await userRepo.count({
          where: { role: UserRole.ADMIN, isLocked: false },
        });

        if (activeAdminsCount <= 1) {
          throw new BadRequestException(
            'Không thể khóa Admin hoạt động cuối cùng của hệ thống.',
          );
        }
      }

      targetUser.isLocked = isLocked;
      const saved = await userRepo.save(targetUser);

      await this.recordLog(
        admin,
        isLocked ? AdminAction.LOCK_USER : AdminAction.UNLOCK_USER,
        'user',
        targetUserId,
        { targetEmail: targetUser.email, targetName: targetUser.name },
      );

      return {
        success: true,
        user: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          role: saved.role,
          isLocked: saved.isLocked,
        },
        message: isLocked ? 'Đã khóa tài khoản thành công' : 'Đã mở khóa tài khoản thành công',
      };
    });
  }

  // Change User Role (USER <-> ADMIN)
  async changeUserRole(
    admin: { id: number; email: string; name: string },
    targetUserId: number,
    newRole: UserRole,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const targetUser = await userRepo.findOne({ where: { id: targetUserId } });

      if (!targetUser) {
        throw new NotFoundException('Không tìm thấy tài khoản người dùng');
      }

      if (targetUser.role === newRole) {
        return {
          success: true,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            isLocked: targetUser.isLocked,
          },
          message: 'Vai trò của tài khoản không đổi',
        };
      }

      // Demoting an admin to user: protect last active admin
      if (targetUser.role === UserRole.ADMIN && newRole === UserRole.USER) {
        const activeAdminsCount = await userRepo.count({
          where: { role: UserRole.ADMIN, isLocked: false },
        });

        if (activeAdminsCount <= 1) {
          throw new BadRequestException(
            'Không thể hạ quyền Admin hoạt động cuối cùng của hệ thống.',
          );
        }
      }

      const oldRole = targetUser.role;
      targetUser.role = newRole;
      const saved = await userRepo.save(targetUser);

      await this.recordLog(
        admin,
        AdminAction.CHANGE_ROLE,
        'user',
        targetUserId,
        { oldRole, newRole, targetEmail: targetUser.email },
      );

      return {
        success: true,
        user: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          role: saved.role,
          isLocked: saved.isLocked,
        },
        message: `Đã thay đổi vai trò tài khoản thành ${newRole.toUpperCase()}`,
      };
    });
  }

  // Delete user (with last admin guard)
  async deleteUser(
    admin: { id: number; email: string; name: string },
    targetUserId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const targetUser = await userRepo.findOne({ where: { id: targetUserId } });

      if (!targetUser) {
        throw new NotFoundException('Không tìm thấy tài khoản người dùng');
      }

      // Check last admin guard
      if (targetUser.role === UserRole.ADMIN) {
        const activeAdminsCount = await userRepo.count({
          where: { role: UserRole.ADMIN, isLocked: false },
        });

        if (activeAdminsCount <= 1) {
          throw new BadRequestException(
            'Không thể xóa Admin hoạt động cuối cùng của hệ thống.',
          );
        }
      }

      await userRepo.remove(targetUser);

      await this.recordLog(
        admin,
        'DELETE_USER',
        'user',
        targetUserId,
        { email: targetUser.email, name: targetUser.name },
      );

      return { success: true, message: 'Đã xóa tài khoản thành công' };
    });
  }

  // ==========================================
  // 3. CURRICULUM VOCABULARY MANAGEMENT
  // ==========================================
  async getCurriculumWords(params: {
    search?: string;
    topic?: string;
    course?: CourseType;
    language?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 15, 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.vocabRepo.createQueryBuilder('v');

    if (params.language && params.language !== 'all') {
      qb.andWhere('v.language = :lang', { lang: params.language });
    }

    if (params.course) {
      qb.andWhere('v.course = :course', { course: params.course });
    }

    if (params.topic && params.topic !== 'all') {
      qb.andWhere('v.topic = :topic', { topic: params.topic });
    }

    if (params.search && params.search.trim()) {
      const kw = `%${params.search.trim()}%`;
      qb.andWhere('(v.word ILIKE :kw OR v.meaning ILIKE :kw OR v.pinyin ILIKE :kw OR v.kana ILIKE :kw)', { kw });
    }

    qb.orderBy('v.id', 'ASC');
    qb.skip(skip).take(limit);

    const [words, total] = await qb.getManyAndCount();

    return {
      words,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCurriculumWord(
    admin: { id: number; email: string; name: string },
    dto: {
      course?: CourseType;
      topic: string;
      word: string;
      meaning: string;
      language?: string;
      reading?: string;
      ipa?: string;
      pinyin?: string;
      kana?: string;
      romaji?: string;
      romaja?: string;
      thaiReading?: string;
      partOfSpeech?: string;
      exampleEn?: string;
      exampleVi?: string;
    },
  ) {
    if (!dto.word?.trim()) throw new BadRequestException('Từ vựng không được để trống');
    if (!dto.meaning?.trim()) throw new BadRequestException('Nghĩa không được để trống');
    if (!dto.topic?.trim()) throw new BadRequestException('Chủ đề không được để trống');

    const item = this.vocabRepo.create({
      language: dto.language?.trim() || 'en',
      course: dto.course || CourseType.TOEIC,
      topic: dto.topic.trim(),
      word: dto.word.trim(),
      meaning: dto.meaning.trim(),
      phonetic: dto.ipa?.trim() || '',
      reading: dto.reading?.trim() || dto.ipa?.trim() || dto.pinyin?.trim() || dto.kana?.trim() || dto.romaji?.trim() || dto.romaja?.trim() || dto.thaiReading?.trim() || null,
      pinyin: dto.pinyin?.trim() || null,
      kana: dto.kana?.trim() || null,
      romaji: dto.romaji?.trim() || null,
      romaja: dto.romaja?.trim() || null,
      thaiReading: dto.thaiReading?.trim() || null,
      partOfSpeech: dto.partOfSpeech?.trim() || '',
      example: dto.exampleEn?.trim() || '',
      exampleTranslation: dto.exampleVi?.trim() || '',
      frequency: 3,
    });

    const saved = await this.vocabRepo.save(item);

    await this.recordLog(
      admin,
      AdminAction.CREATE_SHARED_VOCAB,
      'shared_vocab',
      saved.id,
      { word: saved.word, topic: saved.topic, language: saved.language },
    );

    return saved;
  }

  async updateCurriculumWord(
    admin: { id: number; email: string; name: string },
    id: number,
    dto: Partial<{
      course: CourseType;
      topic: string;
      word: string;
      meaning: string;
      language: string;
      reading: string;
      ipa: string;
      pinyin: string;
      kana: string;
      romaji: string;
      romaja: string;
      thaiReading: string;
      partOfSpeech: string;
      exampleEn: string;
      exampleVi: string;
    }>,
  ) {
    const item = await this.vocabRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy từ vựng dùng chung');

    if (dto.word !== undefined) item.word = dto.word.trim();
    if (dto.meaning !== undefined) item.meaning = dto.meaning.trim();
    if (dto.topic !== undefined) item.topic = dto.topic.trim();
    if (dto.language !== undefined) item.language = dto.language.trim();
    if (dto.reading !== undefined) item.reading = dto.reading.trim();
    if (dto.ipa !== undefined) item.phonetic = dto.ipa.trim();
    if (dto.pinyin !== undefined) item.pinyin = dto.pinyin.trim();
    if (dto.kana !== undefined) item.kana = dto.kana.trim();
    if (dto.romaji !== undefined) item.romaji = dto.romaji.trim();
    if (dto.romaja !== undefined) item.romaja = dto.romaja.trim();
    if (dto.thaiReading !== undefined) item.thaiReading = dto.thaiReading.trim();
    if (dto.partOfSpeech !== undefined) item.partOfSpeech = dto.partOfSpeech.trim();
    if (dto.exampleEn !== undefined) item.example = dto.exampleEn.trim();
    if (dto.exampleVi !== undefined) item.exampleTranslation = dto.exampleVi.trim();
    if (dto.course !== undefined) item.course = dto.course;

    const saved = await this.vocabRepo.save(item);

    await this.recordLog(
      admin,
      AdminAction.UPDATE_SHARED_VOCAB,
      'shared_vocab',
      saved.id,
      { word: saved.word, language: saved.language },
    );

    return saved;
  }

  async deleteCurriculumWord(
    admin: { id: number; email: string; name: string },
    id: number,
  ) {
    const item = await this.vocabRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy từ vựng dùng chung');

    const wordName = item.word;
    await this.vocabRepo.remove(item);

    await this.recordLog(
      admin,
      AdminAction.DELETE_SHARED_VOCAB,
      'shared_vocab',
      id,
      { word: wordName },
    );

    return { success: true, message: `Đã xóa từ vựng "${wordName}"` };
  }

  // ==========================================
  // 4. AUDIT LOGS
  // ==========================================
  async getAuditLogs(params: { page?: number; limit?: number }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

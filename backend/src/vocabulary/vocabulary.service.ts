import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vocabulary, CourseType } from './vocabulary.entity.js';
import { UserVocabulary, LearningStatus } from './user-vocabulary.entity.js';
import { CustomVocabulary } from './custom-vocabulary.entity.js';

const PRESET_TOPIC_NAMES = new Set([
  'thoát cảnh thất nghiệp',
  'quy định về trang phục',
  'cao thủ chốn văn phòng',
  'bí quyết kinh doanh',
  'vũ khí bí mật',
  'ngày nghỉ',
  'chiến lược marketing',
  'hồi sinh nền kinh tế',
  'cao thủ mua sắm',
  'ra mắt sản phẩm mới',
  'tự động hóa ở nhà máy',
  'khách hàng là thượng đế',
  'mục đích chuyến công tác',
  'đàm phán hợp đồng',
  'hiệp định thương mại',
  'giao hàng nhanh',
  'món ăn đặc biệt',
  'tiền thưởng là bao nhiêu',
  'tiết kiệm chi tiêu',
  'thi đua trong công ty',
  'một cuộc họp khẩn',
  'nhập vai',
  'ngày đầu thăng chức',
  'lái xe',
  'số dư tài khoản và lòng hiếu thảo',
  'bạn bè và cổ phiếu',
  'cổ điển',
  'dự báo thời tiết',
  'bệnh nặng',
]);

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(Vocabulary)
    private vocabRepo: Repository<Vocabulary>,
    @InjectRepository(UserVocabulary)
    private userVocabRepo: Repository<UserVocabulary>,
    @InjectRepository(CustomVocabulary)
    private customVocabRepo: Repository<CustomVocabulary>,
  ) {}

  // Get all topics for a course
  async getTopics(course: CourseType): Promise<{ topic: string; count: number }[]> {
    const rows = await this.vocabRepo
      .createQueryBuilder('v')
      .select('v.topic', 'topic')
      .addSelect('COUNT(*)', 'count')
      .where('v.course = :course', { course })
      .groupBy('v.topic')
      .getRawMany();
    return rows.map((r) => ({ topic: r.topic, count: Number(r.count) }));
  }

  // Get words by topic
  getByTopic(course: CourseType, topic: string): Promise<Vocabulary[]> {
    return this.vocabRepo.find({ where: { course, topic }, order: { frequency: 'DESC' } });
  }

  // Get user's progress per topic
  async getUserProgress(userId: number, course: CourseType) {
    const topics = await this.getTopics(course);
    const progress = await Promise.all(
      topics.map(async (t) => {
        const total = t.count;
        const mastered = await this.userVocabRepo
          .createQueryBuilder('uv')
          .innerJoin('uv.vocabulary', 'v')
          .where('uv.userId = :userId', { userId })
          .andWhere('v.course = :course', { course })
          .andWhere('v.topic = :topic', { topic: t.topic })
          .andWhere('uv.status = :status', { status: LearningStatus.MASTERED })
          .getCount();
        const learned = await this.userVocabRepo
          .createQueryBuilder('uv')
          .innerJoin('uv.vocabulary', 'v')
          .where('uv.userId = :userId', { userId })
          .andWhere('v.course = :course', { course })
          .andWhere('v.topic = :topic', { topic: t.topic })
          .getCount();
        return { topic: t.topic, total, learned, mastered };
      }),
    );
    return progress;
  }

  // Get words due for review today (SRS)
  getDueWords(userId: number): Promise<UserVocabulary[]> {
    return this.userVocabRepo
      .createQueryBuilder('uv')
      .leftJoinAndSelect('uv.vocabulary', 'v')
      .where('uv.userId = :userId', { userId })
      .andWhere('uv.nextReviewAt <= :now', { now: new Date() })
      .andWhere('uv.status != :status', { status: LearningStatus.MASTERED })
      .orderBy('uv.nextReviewAt', 'ASC')
      .take(20)
      .getMany();
  }

  // Mark word result after flashcard
  async markResult(userId: number, vocabularyId: number, correct: boolean): Promise<UserVocabulary> {
    let uv = await this.userVocabRepo.findOne({ where: { userId, vocabularyId } });

    if (!uv) {
      uv = this.userVocabRepo.create({ userId, vocabularyId, status: LearningStatus.LEARNING });
    }

    if (correct) {
      uv.correctCount += 1;
      uv.status = uv.correctCount >= 5 ? LearningStatus.MASTERED : LearningStatus.REVIEW;
      // SRS: next review in 1, 3, 7, 14, 30 days
      const days = [1, 3, 7, 14, 30];
      const idx = Math.min(uv.correctCount - 1, days.length - 1);
      uv.nextReviewAt = new Date(Date.now() + days[idx] * 86400000);
    } else {
      uv.incorrectCount += 1;
      uv.status = LearningStatus.LEARNING;
      uv.nextReviewAt = new Date(Date.now() + 3600000); // review in 1 hour
    }

    return this.userVocabRepo.save(uv);
  }

  // Search words
  search(course: CourseType, keyword: string): Promise<Vocabulary[]> {
    return this.vocabRepo
      .createQueryBuilder('v')
      .where('v.course = :course', { course })
      .andWhere('(v.word ILIKE :kw OR v.meaning ILIKE :kw)', { kw: `%${keyword}%` })
      .take(20)
      .getMany();
  }

  async getCustomWords(userId: number): Promise<CustomVocabulary[]> {
    try {
      await this.customVocabRepo
        .createQueryBuilder()
        .delete()
        .from(CustomVocabulary)
        .where('userId = :userId', { userId })
        .andWhere('LOWER(TRIM(listName)) IN (:...presetNames)', {
          presetNames: Array.from(PRESET_TOPIC_NAMES),
        })
        .execute();
    } catch {}

    const list = await this.customVocabRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return list.filter((item) => !PRESET_TOPIC_NAMES.has((item.listName || '').trim().toLowerCase()));
  }

  async addCustomWord(userId: number, listName: string, word: string, meaning?: string, example?: string): Promise<CustomVocabulary> {
    const normalizedListName = listName.trim() || 'Danh sách của tôi';
    const normalizedWord = word.trim();
    let existing = await this.customVocabRepo.findOne({ where: { userId, word: normalizedWord } });
    if (existing) {
      existing.listName = normalizedListName;
      if (meaning !== undefined) existing.meaning = meaning.trim();
      if (example !== undefined) existing.example = example.trim();
      return this.customVocabRepo.save(existing);
    }

    return this.customVocabRepo.save(
      this.customVocabRepo.create({
        userId,
        listName: normalizedListName,
        word: normalizedWord,
        meaning: meaning?.trim() || undefined,
        example: example?.trim() || undefined,
      }),
    );
  }

  async addCustomWordsBulk(
    userId: number,
    listName: string,
    items: Array<{ word: string; meaning?: string; example?: string }>,
  ): Promise<{ added: number; updated: number; items: CustomVocabulary[] }> {
    const normalizedListName = listName.trim() || 'Danh sách của tôi';
    const result: CustomVocabulary[] = [];
    let added = 0;
    let updated = 0;

    for (const item of items) {
      const normalizedWord = item.word?.trim();
      if (!normalizedWord) continue;

      let existing = await this.customVocabRepo.findOne({
        where: { userId, word: normalizedWord },
      });

      if (existing) {
        existing.listName = normalizedListName;
        if (item.meaning !== undefined && item.meaning.trim() !== '') {
          existing.meaning = item.meaning.trim();
        }
        if (item.example !== undefined && item.example.trim() !== '') {
          existing.example = item.example.trim();
        }
        existing = await this.customVocabRepo.save(existing);
        result.push(existing);
        updated++;
      } else {
        const created = await this.customVocabRepo.save(
          this.customVocabRepo.create({
            userId,
            listName: normalizedListName,
            word: normalizedWord,
            meaning: item.meaning?.trim() || undefined,
            example: item.example?.trim() || undefined,
          }),
        );
        result.push(created);
        added++;
      }
    }

    return { added, updated, items: result };
  }

  async updateCustomWord(
    userId: number,
    id: number,
    data: { word?: string; meaning?: string; example?: string },
  ): Promise<CustomVocabulary> {
    const item = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!item) {
      throw new BadRequestException('Không tìm thấy từ vựng');
    }
    if (data.word !== undefined) item.word = data.word.trim();
    if (data.meaning !== undefined) item.meaning = data.meaning.trim();
    if (data.example !== undefined) item.example = data.example.trim();
    return this.customVocabRepo.save(item);
  }

  async deleteCustomWord(userId: number, id: number): Promise<{ success: boolean }> {
    const word = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!word) {
      return { success: false };
    }
    await this.customVocabRepo.remove(word);
    return { success: true };
  }

  async deleteCustomList(userId: number, listName: string): Promise<{ success: boolean; deletedCount: number }> {
    const result = await this.customVocabRepo.delete({ userId, listName });
    return { success: true, deletedCount: result.affected || 0 };
  }

  async renameCustomList(
    userId: number,
    oldName: string,
    newName: string,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const normalizedOld = (oldName || '').trim() || 'Danh sách của tôi';
    const normalizedNew = (newName || '').trim();
    if (!normalizedNew) {
      throw new BadRequestException('Tên thư mục mới không được để trống');
    }
    const result = await this.customVocabRepo.update(
      { userId, listName: normalizedOld },
      { listName: normalizedNew },
    );
    return { success: true, updatedCount: result.affected || 0 };
  }

  async updateCustomWordProgress(
    userId: number,
    id: number,
    stage: number,
    intervalDays: number,
  ): Promise<CustomVocabulary> {
    const item = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException('Từ vựng không tồn tại');
    }
    item.stage = stage;
    item.intervalDays = intervalDays;
    item.lastReviewedAt = new Date();
    item.nextReviewAt = new Date(Date.now() + intervalDays * 86400000);
    return this.customVocabRepo.save(item);
  }

  // Unified learning progress saver: works for ANY word from ANY study mode
  async recordWordLearning(
    userId: number,
    dto: {
      word: string;
      meaning?: string;
      example?: string;
      listName?: string;
      stage?: number;
      intervalDays?: number;
      isCorrect?: boolean;
    },
  ): Promise<CustomVocabulary> {
    const normalizedWord = dto.word?.trim();
    if (!normalizedWord) {
      throw new BadRequestException('Từ vựng không hợp lệ');
    }

    const listName = (dto.listName || '').trim() || 'Danh sách của tôi';
    if (PRESET_TOPIC_NAMES.has(listName.toLowerCase())) {
      // Do not create custom vocabulary rows for preset curriculum topics
      return this.customVocabRepo.create({
        userId,
        listName,
        word: normalizedWord,
        meaning: dto.meaning?.trim() || undefined,
        example: dto.example?.trim() || undefined,
      });
    }
    let item = await this.customVocabRepo.findOne({
      where: { userId, word: normalizedWord },
    });

    const now = new Date();

    if (!item) {
      let stage = dto.stage ?? 1;
      let intervalDays = dto.intervalDays ?? 1;
      if (dto.isCorrect !== undefined) {
        stage = dto.isCorrect ? 2 : 1;
        intervalDays = dto.isCorrect ? 3 : 1;
      }

      item = this.customVocabRepo.create({
        userId,
        listName,
        word: normalizedWord,
        meaning: dto.meaning?.trim() || undefined,
        example: dto.example?.trim() || undefined,
        stage,
        intervalDays,
        lastReviewedAt: now,
        nextReviewAt: new Date(now.getTime() + intervalDays * 86400000),
      });
    } else {
      if (dto.listName && (!item.listName || item.listName === 'Danh sách của tôi')) {
        item.listName = listName;
      }
      if (dto.meaning && !item.meaning) {
        item.meaning = dto.meaning.trim();
      }
      if (dto.example && !item.example) {
        item.example = dto.example.trim();
      }

      if (dto.stage !== undefined && dto.intervalDays !== undefined) {
        item.stage = dto.stage;
        item.intervalDays = dto.intervalDays;
      } else if (dto.isCorrect !== undefined) {
        if (dto.isCorrect) {
          const stagesMap: Record<number, { nextStage: number; nextDays: number }> = {
            1: { nextStage: 2, nextDays: 3 },
            2: { nextStage: 3, nextDays: 7 },
            3: { nextStage: 4, nextDays: 14 },
            4: { nextStage: 5, nextDays: 30 },
            5: { nextStage: 6, nextDays: 60 },
            6: { nextStage: 6, nextDays: 60 },
          };
          const curStage = item.stage || 1;
          const next = stagesMap[curStage] || { nextStage: Math.min(curStage + 1, 6), nextDays: 60 };
          item.stage = next.nextStage;
          item.intervalDays = next.nextDays;
        } else {
          item.stage = 1;
          item.intervalDays = 1;
        }
      }

      item.lastReviewedAt = now;
      item.nextReviewAt = new Date(now.getTime() + (item.intervalDays || 1) * 86400000);
    }

    return this.customVocabRepo.save(item);
  }

  async recordWordsLearningBatch(
    userId: number,
    items: Array<{
      word: string;
      meaning?: string;
      example?: string;
      listName?: string;
      stage?: number;
      intervalDays?: number;
      isCorrect?: boolean;
    }>,
  ) {
    const results: CustomVocabulary[] = [];
    for (const item of items) {
      try {
        const saved = await this.recordWordLearning(userId, item);
        results.push(saved);
      } catch (err) {
        // Skip invalid item, continue
      }
    }
    return { success: true, count: results.length, items: results };
  }
}

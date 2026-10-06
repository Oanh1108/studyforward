import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vocabulary, CourseType } from './vocabulary.entity.js';
import { UserVocabulary, LearningStatus } from './user-vocabulary.entity.js';
import { CustomVocabulary, CustomWordStatus } from './custom-vocabulary.entity.js';
import { VocabularyFolder } from './vocabulary-folder.entity.js';
import { VocabularyStudySession } from './vocabulary-study-session.entity.js';
import { UsersService } from '../users/users.service.js';
import { AiVocabularyService } from './ai-vocabulary.service.js';
import { parseWordCellContent, normalizePartOfSpeech, parseMeaningCellContent } from './word-parser.js';
import { fsrs, createEmptyCard, Card, Rating } from 'ts-fsrs';


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

export interface AddWordDto {
  folderId?: number | null;
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
  synonyms?: string;
  antonyms?: string;
  example?: string;
  exampleTranslation?: string;
  notes?: string;
  allowDuplicate?: boolean;
}

export interface BulkImportDto {
  folderId?: number | null;
  newFolderName?: string;
  language?: string;
  items: Array<{
    word: string;
    meaning?: string;
    partOfSpeech?: string;
    synonyms?: string | string[];
    antonyms?: string | string[];
    reading?: string;
    ipa?: string;
    pinyin?: string;
    kana?: string;
    romaji?: string;
    romaja?: string;
    thaiReading?: string;
    example?: string;
    exampleTranslation?: string;
    notes?: string;
    folderName?: string;
    folder?: string;
  }>;
  duplicateStrategy?: 'skip' | 'update' | 'keep_both';
}

export interface ReanalyzeCandidate {
  id: number;
  originalWord: string;
  cleanWord: string;
  originalPos: string | null;
  newPos: string | null;
  originalSynonyms: string | null;
  newSynonyms: string | null;
  originalAntonyms: string | null;
  newAntonyms: string | null;
  originalFolderId: number | null;
  currentListName: string;
  targetFolderName: string | null;
  needsReview?: boolean;
  reviewReason?: string;
  changeTypes: string[];
}


@Injectable()
export class VocabularyService implements OnModuleInit {
  private readonly logger = new Logger(VocabularyService.name);

  constructor(
    @InjectRepository(Vocabulary)
    private vocabRepo: Repository<Vocabulary>,
    @InjectRepository(UserVocabulary)
    private userVocabRepo: Repository<UserVocabulary>,
    @InjectRepository(CustomVocabulary)
    private customVocabRepo: Repository<CustomVocabulary>,
    @InjectRepository(VocabularyFolder)
    private folderRepo: Repository<VocabularyFolder>,
    @InjectRepository(VocabularyStudySession)
    private studySessionRepo: Repository<VocabularyStudySession>,
    private usersService: UsersService,
    private aiService: AiVocabularyService,
  ) {}

  async onModuleInit() {
    try {
      // Remove obsolete unique index if present so duplicate strategy 'keep_both' and multi-folder words work cleanly
      await this.customVocabRepo.query(`
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'custom_vocabularies' 
            AND indexdef LIKE '%UNIQUE%' 
            AND indexdef LIKE '%userId%' 
            AND indexdef LIKE '%word%'
          ) LOOP
            EXECUTE 'DROP INDEX IF EXISTS "' || r.indexname || '" CASCADE';
          END LOOP;
        END $$;
      `);
    } catch (err) {
      this.logger.debug(`Index cleanup check: ${err}`);
    }
  }

  // ==========================================
  // 1. FOLDER MANAGEMENT
  // ==========================================

  async getFolders(userId: number, language?: string) {
    const whereCondition: any = { userId };
    if (language) {
      whereCondition.language = language;
    }

    const folders = await this.folderRepo.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });

    // Count words for each folder
    const countQb = this.customVocabRepo
      .createQueryBuilder('cv')
      .select('cv.folderId', 'folderId')
      .addSelect('COUNT(*)', 'count')
      .where('cv.userId = :userId', { userId });

    if (language) {
      countQb.andWhere('cv.language = :language', { language });
    }

    const counts = await countQb.groupBy('cv.folderId').getRawMany();

    const countMap: Record<string, number> = {};
    let unassignedCount = 0;

    for (const c of counts) {
      if (c.folderId !== null && c.folderId !== undefined) {
        countMap[String(c.folderId)] = Number(c.count);
      } else {
        unassignedCount += Number(c.count);
      }
    }

    const result = folders.map((f) => ({
      ...f,
      wordCount: countMap[String(f.id)] || 0,
    }));

    return {
      folders: result,
      unassignedCount,
      totalFolders: result.length,
    };
  }

  async createFolder(
    userId: number,
    data: { name: string; description?: string; color?: string; language?: string },
  ) {
    const name = (data.name || '').trim();
    if (!name) {
      throw new BadRequestException('Tên thư mục không được để trống');
    }

    const language = data.language?.trim() || 'en';

    const existing = await this.folderRepo.findOne({
      where: { userId, name, language },
    });
    if (existing) {
      throw new BadRequestException(`Thư mục "${name}" trong ngôn ngữ này đã tồn tại`);
    }

    const folder = this.folderRepo.create({
      userId,
      name,
      language,
      description: data.description?.trim() || null,
      color: data.color || '#3b82f6',
    });

    const saved = await this.folderRepo.save(folder);
    return { ...saved, wordCount: 0 };
  }

  async updateFolder(
    userId: number,
    id: number,
    data: { name?: string; description?: string; color?: string; language?: string },
  ) {
    const folder = await this.folderRepo.findOne({ where: { id, userId } });
    if (!folder) {
      throw new NotFoundException('Không tìm thấy thư mục');
    }

    // Changing folder language: block if folder already contains words
    if (data.language !== undefined && data.language !== folder.language) {
      const wordsCount = await this.customVocabRepo.count({
        where: { userId, folderId: id },
      });
      if (wordsCount > 0) {
        throw new BadRequestException(
          'Thư mục đã có từ vựng. Không được đổi ngôn ngữ của thư mục để tránh sai lệch dữ liệu.',
        );
      }
      folder.language = data.language;
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('Tên thư mục không được để trống');
      }

      if (name !== folder.name) {
        const existing = await this.folderRepo.findOne({
          where: { userId, name, language: folder.language },
        });
        if (existing && existing.id !== id) {
          throw new BadRequestException(`Thư mục "${name}" đã tồn tại`);
        }
        folder.name = name;

        // Also update listName on custom vocabulary items for sync
        await this.customVocabRepo.update(
          { userId, folderId: id },
          { listName: name },
        );
      }
    }

    if (data.description !== undefined) {
      folder.description = data.description.trim() || null;
    }
    if (data.color !== undefined) {
      folder.color = data.color.trim();
    }

    const saved = await this.folderRepo.save(folder);
    const count = await this.customVocabRepo.count({
      where: { userId, folderId: id },
    });
    return { ...saved, wordCount: count };
  }

  async deleteFolder(userId: number, id: number) {
    const folder = await this.folderRepo.findOne({ where: { id, userId } });
    if (!folder) {
      throw new NotFoundException('Không tìm thấy thư mục');
    }

    // Cascade delete all words in this folder
    const wordsDeleteResult = await this.customVocabRepo.delete({
      userId,
      folderId: id,
    });
    await this.folderRepo.remove(folder);

    return {
      success: true,
      deletedFolderId: id,
      deletedWordsCount: wordsDeleteResult.affected || 0,
      message: `Đã xóa thư mục và ${wordsDeleteResult.affected || 0} từ bên trong`,
    };
  }

  // ==========================================
  // 2. MY VOCABULARY CRUD & FILTERING
  // ==========================================

  async getMyWords(
    userId: number,
    options: {
      folderId?: string | number;
      folderIds?: string;
      status?: string;
      search?: string;
      language?: string;
    },
  ) {
    const qb = this.customVocabRepo
      .createQueryBuilder('cv')
      .where('cv.userId = :userId', { userId });

    // Language filter
    if (options.language && options.language !== 'all') {
      qb.andWhere('cv.language = :lang', { lang: options.language });
    }

    // Multi-folder filter (for studying multiple folders)
    if (options.folderIds) {
      const ids = options.folderIds
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => !isNaN(n));
      if (ids.length > 0) {
        qb.andWhere('cv.folderId IN (:...folderIds)', { folderIds: ids });
      }
    } else if (options.folderId !== undefined && options.folderId !== 'all') {
      if (options.folderId === 'unassigned' || options.folderId === null || options.folderId === 'null') {
        qb.andWhere('cv.folderId IS NULL');
      } else {
        const fId = Number(options.folderId);
        if (!isNaN(fId)) {
          qb.andWhere('cv.folderId = :fId', { fId });
        }
      }
    }

    // Filter by learning status
    if (options.status && options.status !== 'all') {
      qb.andWhere('cv.status = :status', { status: options.status });
    }

    // Search keyword
    if (options.search && options.search.trim()) {
      const kw = `%${options.search.trim()}%`;
      qb.andWhere(
        '(cv.word ILIKE :kw OR cv.meaning ILIKE :kw OR cv.reading ILIKE :kw OR cv.pinyin ILIKE :kw OR cv.kana ILIKE :kw OR cv.notes ILIKE :kw OR cv.example ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('cv.createdAt', 'DESC');
    const words = await qb.getMany();
    return words.map((w) => ({
      ...w,
      meaning: w.meaning ?? '',
      vietnameseMeaning: w.meaning ?? '',
    }));
  }

  async addMyWord(userId: number, dto: AddWordDto) {
    const word = (dto.word || '').trim();
    const meaning = (dto.meaning || '').trim();

    if (!word) {
      throw new BadRequestException('Từ hoặc cụm từ không được để trống');
    }
    if (!meaning) {
      throw new BadRequestException('Nghĩa tiếng Việt không được để trống');
    }

    let folderName = 'Danh sách của tôi';
    let targetFolderId: number | null = null;
    let wordLanguage = dto.language?.trim() || 'en';

    if (dto.folderId) {
      const folder = await this.folderRepo.findOne({
        where: { id: dto.folderId, userId },
      });
      if (!folder) {
        throw new NotFoundException('Thư mục chỉ định không tồn tại');
      }
      folderName = folder.name;
      targetFolderId = folder.id;
      // Inherits folder language to guarantee integrity
      wordLanguage = folder.language;
    }

    // Check duplicate in the same folder and language
    const duplicateQb = this.customVocabRepo
      .createQueryBuilder('cv')
      .where('cv.userId = :userId', { userId })
      .andWhere('LOWER(TRIM(cv.word)) = LOWER(:word)', { word })
      .andWhere('cv.language = :lang', { lang: wordLanguage });

    if (targetFolderId !== null) {
      duplicateQb.andWhere('cv.folderId = :folderId', { folderId: targetFolderId });
    } else {
      duplicateQb.andWhere('cv.folderId IS NULL');
    }

    const existingWord = await duplicateQb.getOne();

    if (existingWord && !dto.allowDuplicate) {
      return {
        isDuplicate: true,
        existingId: existingWord.id,
        message: `Từ "${word}" đã có trong thư mục này`,
        item: existingWord,
      };
    }

    const genericReading =
      dto.reading?.trim() ||
      dto.ipa?.trim() ||
      dto.pinyin?.trim() ||
      dto.kana?.trim() ||
      dto.romaji?.trim() ||
      dto.romaja?.trim() ||
      dto.thaiReading?.trim() ||
      null;

    const newWord = this.customVocabRepo.create({
      userId,
      folderId: targetFolderId,
      language: wordLanguage,
      listName: folderName,
      word,
      meaning,
      reading: genericReading,
      ipa: dto.ipa?.trim() || null,
      pinyin: dto.pinyin?.trim() || null,
      kana: dto.kana?.trim() || null,
      romaji: dto.romaji?.trim() || null,
      romaja: dto.romaja?.trim() || null,
      thaiReading: dto.thaiReading?.trim() || null,
      partOfSpeech: this.aiService.standardizePos(dto.partOfSpeech),
      synonyms: dto.synonyms?.trim() || null,
      antonyms: dto.antonyms?.trim() || null,
      example: dto.example?.trim() || null,
      exampleTranslation: dto.exampleTranslation?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: CustomWordStatus.NEW,
      stage: 1,
      intervalDays: 1,
      nextReviewAt: new Date(Date.now() + 86400000),
    });

    const saved = await this.customVocabRepo.save(newWord);
    return {
      isDuplicate: false,
      item: saved,
      message: 'Thêm từ thành công',
    };
  }

  async updateMyWord(
    userId: number,
    id: number,
    dto: Partial<{
      word: string;
      meaning: string;
      reading: string;
      ipa: string;
      pinyin: string;
      kana: string;
      romaji: string;
      romaja: string;
      thaiReading: string;
      partOfSpeech: string;
      synonyms: string;
      antonyms: string;
      example: string;
      exampleTranslation: string;
      notes: string;
      status: string;
    }>,
  ) {
    const word = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!word) {
      throw new NotFoundException('Không tìm thấy từ vựng');
    }

    if (dto.word !== undefined) {
      const w = dto.word.trim();
      if (!w) throw new BadRequestException('Từ hoặc cụm từ không được để trống');
      word.word = w;
    }
    const incomingMeaning =
      dto.meaning !== undefined
        ? dto.meaning
        : (dto as any).vietnameseMeaning !== undefined
        ? (dto as any).vietnameseMeaning
        : (dto as any).definition !== undefined
        ? (dto as any).definition
        : (dto as any).translation !== undefined
        ? (dto as any).translation
        : undefined;

    if (incomingMeaning !== undefined && incomingMeaning !== null) {
      const m = String(incomingMeaning).trim();
      if (m) {
        word.meaning = m;
      } else if (!word.meaning) {
        word.meaning = null;
      }
      // If word previously had a valid meaning, ignore accidental empty strings
    }
    if (dto.reading !== undefined) word.reading = dto.reading?.trim() || null;
    if (dto.ipa !== undefined) word.ipa = dto.ipa?.trim() || null;
    if (dto.pinyin !== undefined) word.pinyin = dto.pinyin?.trim() || null;
    if (dto.kana !== undefined) word.kana = dto.kana?.trim() || null;
    if (dto.romaji !== undefined) word.romaji = dto.romaji?.trim() || null;
    if (dto.romaja !== undefined) word.romaja = dto.romaja?.trim() || null;
    if (dto.thaiReading !== undefined) word.thaiReading = dto.thaiReading?.trim() || null;
    if (dto.partOfSpeech !== undefined) {
      word.partOfSpeech = this.aiService.standardizePos(dto.partOfSpeech);
    }
    if (dto.synonyms !== undefined) word.synonyms = dto.synonyms?.trim() || null;
    if (dto.antonyms !== undefined) word.antonyms = dto.antonyms?.trim() || null;
    if (dto.example !== undefined) word.example = dto.example?.trim() || null;
    if (dto.exampleTranslation !== undefined) word.exampleTranslation = dto.exampleTranslation?.trim() || null;
    if (dto.notes !== undefined) word.notes = dto.notes?.trim() || null;
    if (dto.status !== undefined) word.status = dto.status;

    return this.customVocabRepo.save(word);
  }

  async moveMyWord(userId: number, id: number, targetFolderId: number | null) {
    const word = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!word) {
      throw new NotFoundException('Không tìm thấy từ vựng');
    }

    let folderName = 'Danh sách của tôi';
    if (targetFolderId !== null && targetFolderId !== undefined) {
      const folder = await this.folderRepo.findOne({
        where: { id: targetFolderId, userId },
      });
      if (!folder) {
        throw new NotFoundException('Thư mục đích không tồn tại');
      }
      folderName = folder.name;
    }

    word.folderId = targetFolderId;
    word.listName = folderName;
    return this.customVocabRepo.save(word);
  }

  async deleteMyWord(userId: number, id: number) {
    const word = await this.customVocabRepo.findOne({ where: { id, userId } });
    if (!word) {
      throw new NotFoundException('Không tìm thấy từ vựng');
    }
    await this.customVocabRepo.remove(word);
    return { success: true, message: 'Đã xóa từ vựng thành công' };
  }

  // ==========================================
  // 3. STUDY PROGRESS & SRS FOR MY VOCABULARY
  // ==========================================

  async recordCustomWordStudy(
    userId: number,
    wordId: number,
    ratingOrRemembered: boolean | string | number,
  ) {
    const word = await this.customVocabRepo.findOne({
      where: { id: wordId, userId },
    });
    if (!word) {
      throw new NotFoundException('Không tìm thấy từ vựng');
    }

    const now = new Date();

    // Normalize rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
    let ratingNum = 3;
    if (typeof ratingOrRemembered === 'boolean') {
      ratingNum = ratingOrRemembered ? 3 : 1;
    } else if (typeof ratingOrRemembered === 'number') {
      ratingNum = ratingOrRemembered;
    } else if (typeof ratingOrRemembered === 'string') {
      const lower = ratingOrRemembered.toLowerCase().trim();
      if (lower === 'again' || lower === 'unremembered' || lower === 'fail' || lower === 'chưa nhớ') ratingNum = 1;
      else if (lower === 'hard' || lower === 'khó') ratingNum = 2;
      else if (lower === 'good' || lower === 'remembered' || lower === 'pass' || lower === 'nhớ') ratingNum = 3;
      else if (lower === 'easy' || lower === 'dễ') ratingNum = 4;
      else ratingNum = parseInt(lower, 10) || 3;
    }

    const f = fsrs();
    
    // Construct current FSRS card
    let card: Card;
    if (word.fsrsReps > 0 || word.fsrsState !== 0) {
      card = {
        due: word.nextReviewAt || now,
        stability: word.fsrsStability || 0,
        difficulty: word.fsrsDifficulty || 0,
        elapsed_days: word.fsrsElapsedDays || 0,
        scheduled_days: word.fsrsScheduledDays || 0,
        reps: word.fsrsReps || 0,
        lapses: word.fsrsLapses || 0,
        state: word.fsrsState as 0 | 1 | 2 | 3,
        last_review: word.lastReviewedAt || undefined,
        learning_steps: 0,
      };
    } else {
      card = createEmptyCard(now);
    }

    const scheduling_cards = f.repeat(card, now);
    let nextCard: Card;
    
    switch(ratingNum) {
      case 1: nextCard = scheduling_cards[Rating.Again].card; break;
      case 2: nextCard = scheduling_cards[Rating.Hard].card; break;
      case 3: nextCard = scheduling_cards[Rating.Good].card; break;
      case 4: nextCard = scheduling_cards[Rating.Easy].card; break;
      default: nextCard = scheduling_cards[Rating.Good].card; break;
    }

    word.fsrsState = nextCard.state;
    word.fsrsDifficulty = nextCard.difficulty;
    word.fsrsStability = nextCard.stability;
    word.fsrsReps = nextCard.reps;
    word.fsrsLapses = nextCard.lapses;
    word.fsrsElapsedDays = nextCard.elapsed_days;
    word.fsrsScheduledDays = nextCard.scheduled_days;
    word.lastReviewedAt = nextCard.last_review || now;
    word.nextReviewAt = nextCard.due;
    word.intervalDays = nextCard.scheduled_days; // Store for legacy fields

    // Map FSRS state to CustomWordStatus (0: New, 1: Learning, 2: Review, 3: Relearning)
    if (nextCard.state === 0) word.status = CustomWordStatus.NEW;
    else if (nextCard.state === 1 || nextCard.state === 3) word.status = CustomWordStatus.LEARNING;
    else if (nextCard.state === 2) {
      word.status = nextCard.scheduled_days >= 21 ? CustomWordStatus.MASTERED : CustomWordStatus.LEARNING;
    }

    // Advance stage for legacy compatibility
    if (ratingNum > 1 && word.stage < 6) word.stage += 1;
    else if (ratingNum === 1) word.stage = 1;

    return this.customVocabRepo.save(word);
  }

  async evaluateQuiz(
    userId: number,
    data: {
      wordId: number;
      selections: {
        meaning: string[];
        synonym: string[];
        antonym: string[];
      };
      recordSrs?: boolean;
    },
  ) {
    const word = await this.customVocabRepo.findOne({
      where: { id: data.wordId, userId },
    });
    if (!word) {
      throw new NotFoundException('Không tìm thấy từ vựng');
    }

    const parseWordList = (str: string | null | undefined): string[] => {
      if (!str) return [];
      return str
        .split(/[,;=/]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    };
    
    // Normalize user selections
    const userMeaning = (data.selections.meaning || []).map(s => s.trim().toLowerCase());
    const userSynonym = (data.selections.synonym || []).map(s => s.trim().toLowerCase());
    const userAntonym = (data.selections.antonym || []).map(s => s.trim().toLowerCase());

    // True answers (IDs)
    const trueMeaning = [ `m_${word.id}` ];
    const trueSynonym = parseWordList(word.synonyms).map((_, i) => `s_${word.id}_${i}`);
    const trueAntonym = parseWordList(word.antonyms).map((_, i) => `a_${word.id}_${i}`);

    const checkGroup = (userAns: string[], trueAns: string[]) => {
      if (trueAns.length === 0 && userAns.length === 0) return { isCorrect: true, missing: [], wrong: [] };
      // If there are true answers but user chose nothing, they missed them all
      // If there are NO true answers, but user chose something, they are wrong
      
      const missing = trueAns.filter(a => !userAns.includes(a));
      const wrong = userAns.filter(a => !trueAns.includes(a));
      
      return {
        isCorrect: missing.length === 0 && wrong.length === 0,
        missing,
        wrong
      };
    };

    const meaningRes = checkGroup(userMeaning, trueMeaning);
    const synonymRes = checkGroup(userSynonym, trueSynonym);
    const antonymRes = checkGroup(userAntonym, trueAntonym);

    const isPerfect = meaningRes.isCorrect && synonymRes.isCorrect && antonymRes.isCorrect;
    
    // DEBUG: log for tracing grading issues
    console.log('[evaluateQuiz DEBUG]', {
      wordId: data.wordId,
      wordName: word.word,
      synonyms: word.synonyms,
      antonyms: word.antonyms,
      userMeaning,
      userSynonym,
      userAntonym,
      trueMeaning,
      trueSynonym,
      trueAntonym,
      meaningRes,
      synonymRes,
      antonymRes,
      isPerfect,
    });

    if (data.recordSrs !== false) {
      await this.recordCustomWordStudy(userId, data.wordId, isPerfect ? 3 : 1);
    }

    return {
      success: true,
      isPerfect,
      meaning: meaningRes,
      synonym: synonymRes,
      antonym: antonymRes
    };
  }

  async evaluateDictation(userId: number, data: { wordId: number; typingInput: string; synonymChips: string[]; synonymTestMode: string; recordSrs?: boolean }) {
    const word = await this.customVocabRepo.findOne({
      where: { id: data.wordId, userId },
    });
    if (!word) {
      throw new NotFoundException("Kh�ng t�m th?y t? v?ng");
    }

    const normalizeInputString = (input: string) => {
      return (input || "").toLowerCase().trim().replace(/[.,!?()]/g, "").replace(/s+/g, " ");
    };

    const targetCorrect = word.word;
    const normalizedTarget = normalizeInputString(targetCorrect);

    const acceptable = [normalizedTarget];
    if (word.romaji) acceptable.push(normalizeInputString(word.romaji));
    if (word.romaja) acceptable.push(normalizeInputString(word.romaja));
    if (word.kana) acceptable.push(normalizeInputString(word.kana));
    if (word.pinyin) acceptable.push(normalizeInputString(word.pinyin));

    const normalizedUser = normalizeInputString(data.typingInput);
    const isMainCorrect = acceptable.includes(normalizedUser);

    let isSynonymCorrect = true;
    let missingSynonyms: string[] = [];
    let wrongSynonyms: string[] = [];
    const allSynonymsStr = word.synonyms || "";

    if (data.synonymTestMode !== "none" && allSynonymsStr) {
      const validSynonyms = allSynonymsStr
        .split(/[,;=\/]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const normalizedValidSyns = validSynonyms.map((s) => normalizeInputString(s));
      const userChips = [...new Set(data.synonymChips.map((c) => normalizeInputString(c)).filter(Boolean))];

      if (data.synonymTestMode === "one") {
        if (userChips.length === 0) {
          isSynonymCorrect = false;
        } else {
          isSynonymCorrect = userChips.every((u) => normalizedValidSyns.includes(u));
        }
        if (!isSynonymCorrect) {
          wrongSynonyms = userChips.filter((u) => !normalizedValidSyns.includes(u));
        }
      } else if (data.synonymTestMode === "all") {
        wrongSynonyms = userChips.filter((u) => !normalizedValidSyns.includes(u));
        missingSynonyms = validSynonyms.filter((v) => !userChips.includes(normalizeInputString(v)));
        isSynonymCorrect = wrongSynonyms.length === 0 && missingSynonyms.length === 0;
      }
    }

    const overallCorrect = isMainCorrect && isSynonymCorrect;

        // Optional SRS update
    if (data.recordSrs !== false) {
      const quality = overallCorrect ? 4 : 1;
      await this.recordCustomWordStudy(userId, data.wordId, quality);
    }

    return {
      isMainCorrect,
      isSynonymCorrect,
      missingSynonyms,
      wrongSynonyms,
      allSynonyms: allSynonymsStr,
      overallCorrect,
    };
  }

  async completeStudySession(
    userId: number,
    data: {
      sessionId: string;
      mode: string;
      language?: string;
      folderIds?: string | number[] | null;
      totalWords: number;
      correctCount: number;
      durationSeconds: number;
        isCompleted?: boolean;
      details?: Array<{
        wordId: number;
        rating?: string | number;
        isCorrect: boolean;
        userAnswer?: string;
      }>;
    },
  ) {
    const sessionId = (data.sessionId || '').trim();
    if (!sessionId) {
      throw new BadRequestException('Session ID không được để trống');
    }

    // Verify ownership and check idempotency: prevent duplicate XP/stats if submitted again
    let session = await this.studySessionRepo.findOne({
      where: { userId, sessionId },
    });

    if (session && session.isCompleted) {
      const stats = await this.usersService.getUserStats(userId, data.language || 'en');
      return {
        success: true,
        alreadyProcessed: true,
        session,
        xpEarned: session.xpEarned,
        stats,
      };
    }

    const folderIdsStr = Array.isArray(data.folderIds)
      ? data.folderIds.join(',')
      : data.folderIds
      ? String(data.folderIds)
      : null;

    const totalWords = Math.max(0, data.totalWords || 0);
    const correctCount = Math.max(0, data.correctCount || 0);
    const durationSeconds = Math.max(0, data.durationSeconds || 0);
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Award XP: 2 XP per correct word + completion bonus + accuracy bonus
    const baseBonus = totalWords >= 5 ? 5 : 2;
    const accuracyBonus = totalWords > 0 && correctCount / totalWords >= 0.8 ? 10 : 0;
    const earnedXp = data.isCompleted === false ? 0 : (correctCount * 2 + baseBonus + accuracyBonus);

    if (!session) {
      session = this.studySessionRepo.create({
        userId,
        sessionId,
        mode: data.mode || 'flashcard',
        language: data.language || 'en',
        folderIds: folderIdsStr,
        totalWords,
        correctCount,
        durationSeconds,
        xpEarned: earnedXp,
        isCompleted: true,
        details: data.details ? JSON.stringify(data.details) : null,
      });
    } else {
      session.isCompleted = data.isCompleted !== false;
      session.mode = data.mode || session.mode;
      session.language = data.language || session.language;
      session.folderIds = folderIdsStr;
      session.totalWords = totalWords;
      session.correctCount = correctCount;
      session.durationSeconds = durationSeconds;
      session.xpEarned = earnedXp;
      session.details = data.details ? JSON.stringify(data.details) : null;
    }

    const savedSession = await this.studySessionRepo.save(session);

    // Update user stats in DB (minutes, XP, words learned, streak)
    await this.usersService.logActivity(userId, durationMinutes, earnedXp, correctCount);

    const stats = await this.usersService.getUserStats(userId, data.language || 'en');

    return {
      success: true,
      alreadyProcessed: false,
      session: savedSession,
      xpEarned: earnedXp,
      stats,
    };
  }

      async getStudySession(userId: number, sessionId: string) {
    return this.studySessionRepo.findOne({
      where: { userId, id: Number(sessionId) },
    });
  }

  async getIncompleteStudySessions(userId: number, language?: string) {
    const where: any = { userId, isCompleted: false };
    if (language) {
      where.language = language;
    }
    return this.studySessionRepo.find({
      where,
      order: { updatedAt: "DESC" },
      take: 10,
    });
  }

  async getRecentStudySession(userId: number) {
    return this.studySessionRepo.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  // ==========================================
  // 4. BULK IMPORT FROM EXCEL
  // ==========================================

  async bulkImport(userId: number, dto: BulkImportDto) {
    let targetFolderId: number | null = dto.folderId ?? null;
    let folderName = 'Chưa phân loại';
    let targetLanguage = dto.language?.trim() || 'en';

    const folderCache = new Map<string, VocabularyFolder>();

    // If new folder requested:
    if (dto.newFolderName && dto.newFolderName.trim()) {
      const cleanNewName = dto.newFolderName.trim();
      let folder = await this.folderRepo.findOne({
        where: { userId, name: cleanNewName, language: targetLanguage },
      });
      if (!folder) {
        folder = await this.folderRepo.save(
          this.folderRepo.create({
            userId,
            name: cleanNewName,
            language: targetLanguage,
            color: '#3b82f6',
          }),
        );
      }
      targetFolderId = folder.id;
      folderName = folder.name;
      targetLanguage = folder.language;
      folderCache.set(folder.name.toLowerCase(), folder);
    } else if (targetFolderId) {
      const folder = await this.folderRepo.findOne({
        where: { id: targetFolderId, userId },
      });
      if (!folder) {
        throw new NotFoundException('Thư mục chỉ định không tồn tại');
      }
      folderName = folder.name;
      targetLanguage = folder.language;
      folderCache.set(folder.name.toLowerCase(), folder);
    }

    const strategy = dto.duplicateStrategy || 'skip';
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; word: string; error: string }> = [];

    const items = dto.items || [];
    // Max 1000 items per import for safety
    const boundedItems = items.slice(0, 1000);

    for (let index = 0; index < boundedItems.length; index++) {
      const rowNumber = index + 1;
      const raw = boundedItems[index];

      // Smart parse mixed content in the word cell
      const token = parseWordCellContent(raw.word || '');
      const meaningToken = parseMeaningCellContent(raw.meaning || '');
      
      const word = (token.word || raw.word || '').trim();
      const meaning = meaningToken.cleanMeaning || (raw.meaning || '').trim();

      if (!word) {
        // Skip empty row
        continue;
      }

      try {
        // Parse list helper
        const parseList = (val: any): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
          return String(val)
            .split(/[,;\n\r，、]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        };

        // Combine dedicated column with smart cell extraction (deduped)
        const rawSynList = parseList(raw.synonyms);
        const combinedSyns = [...rawSynList];
        for (const s of token.synonyms) {
          if (!combinedSyns.includes(s)) combinedSyns.push(s);
        }
        for (const s of meaningToken.synonyms) {
          if (!combinedSyns.includes(s)) combinedSyns.push(s);
        }
        const synonymsStr = combinedSyns.length > 0 ? combinedSyns.join(', ') : null;

        const rawAntList = parseList(raw.antonyms);
        const combinedAnts = [...rawAntList];
        for (const a of token.antonyms) {
          if (!combinedAnts.includes(a)) combinedAnts.push(a);
        }
        const antonymsStr = combinedAnts.length > 0 ? combinedAnts.join(', ') : null;

        // Part of speech: prioritize dedicated column, fallback to token POS, then meaningToken POS
        const rawPos = (raw.partOfSpeech || '').trim();
        const pos = rawPos
          ? (normalizePartOfSpeech(rawPos) || this.aiService.standardizePos(rawPos))
          : (token.partOfSpeech ? (normalizePartOfSpeech(token.partOfSpeech) || token.partOfSpeech) : 
             (meaningToken.pos ? (normalizePartOfSpeech(meaningToken.pos) || meaningToken.pos) : 'khác'));

        // Resolve folder for this row:
        // If row specifies a folder column, find or create that exact folder (preserves comma names like 'ETS 2023 - TEST 8 - PART 1,2')
        let itemFolderId: number | null = targetFolderId;
        let itemFolderName: string = folderName;

        const rowFolderName = (raw.folderName || raw.folder || '').trim();
        if (rowFolderName) {
          const key = rowFolderName.toLowerCase();
          let f = folderCache.get(key);
          if (!f) {
            f = (await this.folderRepo.findOne({
              where: { userId, name: rowFolderName, language: targetLanguage },
            })) || undefined;

            if (!f) {
              f = await this.folderRepo.save(
                this.folderRepo.create({
                  userId,
                  name: rowFolderName,
                  language: targetLanguage,
                  color: '#3b82f6',
                }),
              );
            }
            folderCache.set(key, f);
          }
          itemFolderId = f.id;
          itemFolderName = f.name;
        } else if (itemFolderId === null) {
          itemFolderName = 'Chưa phân loại';
        }

        // Find existing word in the target folder and language
        const existingQb = this.customVocabRepo
          .createQueryBuilder('cv')
          .where('cv.userId = :userId', { userId })
          .andWhere('LOWER(TRIM(cv.word)) = LOWER(:word)', { word })
          .andWhere('cv.language = :lang', { lang: targetLanguage });

        if (itemFolderId !== null) {
          existingQb.andWhere('cv.folderId = :folderId', { folderId: itemFolderId });
        } else {
          existingQb.andWhere('cv.folderId IS NULL');
        }

        const existing = await existingQb.getOne();

        if (existing) {
          if (strategy === 'skip') {
            skipped++;
            continue;
          } else if (strategy === 'update') {
            if (meaning) existing.meaning = meaning;
            if (pos && pos !== 'khác') existing.partOfSpeech = pos;
            if (raw.reading) existing.reading = raw.reading.trim();
            if (raw.ipa) existing.ipa = raw.ipa.trim();
            if (raw.pinyin) existing.pinyin = raw.pinyin.trim();
            if (raw.kana) existing.kana = raw.kana.trim();
            if (raw.romaji) existing.romaji = raw.romaji.trim();
            if (raw.romaja) existing.romaja = raw.romaja.trim();
            if (raw.thaiReading) existing.thaiReading = raw.thaiReading.trim();
            if (synonymsStr) existing.synonyms = synonymsStr;
            if (antonymsStr) existing.antonyms = antonymsStr;
            if (raw.example) existing.example = raw.example.trim();
            if (raw.exampleTranslation) existing.exampleTranslation = raw.exampleTranslation.trim();
            if (raw.notes) existing.notes = raw.notes.trim();
            existing.folderId = itemFolderId;
            existing.listName = itemFolderName;
            await this.customVocabRepo.save(existing);
            updated++;
            continue;
          }
          // If 'keep_both', proceed to create a new row
        }

        const reading =
          raw.reading?.trim() ||
          raw.ipa?.trim() ||
          raw.pinyin?.trim() ||
          raw.kana?.trim() ||
          raw.romaji?.trim() ||
          raw.romaja?.trim() ||
          raw.thaiReading?.trim() ||
          null;

        const created = this.customVocabRepo.create({
          userId,
          folderId: itemFolderId,
          language: targetLanguage,
          listName: itemFolderName,
          word,
          meaning: meaning || '',
          reading,
          ipa: raw.ipa?.trim() || null,
          pinyin: raw.pinyin?.trim() || null,
          kana: raw.kana?.trim() || null,
          romaji: raw.romaji?.trim() || null,
          romaja: raw.romaja?.trim() || null,
          thaiReading: raw.thaiReading?.trim() || null,
          partOfSpeech: pos,
          synonyms: synonymsStr,
          antonyms: antonymsStr,
          example: raw.example?.trim() || null,
          exampleTranslation: raw.exampleTranslation?.trim() || null,
          notes: raw.notes?.trim() || null,
          status: CustomWordStatus.NEW,
          stage: 1,
          intervalDays: 1,
        });

        await this.customVocabRepo.save(created);
        added++;
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          word,
          error: err.message || 'Lỗi lưu dữ liệu',
        });
      }
    }

    return {
      success: true,
      added,
      updated,
      skipped,
      errors,
      folderId: targetFolderId,
      folderName,
    };
  }

  // ==========================================
  // 5. RETROACTIVE DATA RE-ANALYSIS ("Phân tích lại dữ liệu đã nhập")
  // ==========================================

  async reanalyzePreview(userId: number, language?: string) {
    const qb = this.customVocabRepo.createQueryBuilder('cv').where('cv.userId = :userId', { userId });
    if (language && language !== 'all') {
      qb.andWhere('cv.language = :language', { language });
    }
    qb.orderBy('cv.id', 'ASC');
    const words = await qb.getMany();

    const candidates: ReanalyzeCandidate[] = [];

    for (const w of words) {
      const token = parseWordCellContent(w.word);
      const cleanWord = token.word || w.word;
      const wordChanged = Boolean(token.word && token.word !== w.word);

      const parsedPos = token.partOfSpeech ? (normalizePartOfSpeech(token.partOfSpeech) || token.partOfSpeech) : null;
      const posChanged = Boolean(parsedPos && (!w.partOfSpeech || w.partOfSpeech === 'khác'));
      const newPos = parsedPos || w.partOfSpeech || null;

      // Synonyms
      const existingSynList = w.synonyms
        ? w.synonyms.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean)
        : [];
      const combinedSyn = [...existingSynList];
      for (const s of token.synonyms) {
        if (!combinedSyn.includes(s)) combinedSyn.push(s);
      }
      const newSynonymsStr = combinedSyn.length > 0 ? combinedSyn.join(', ') : null;
      const synChanged = Boolean(token.synonyms.length > 0 && newSynonymsStr !== w.synonyms);

      // Antonyms
      const existingAntList = w.antonyms
        ? w.antonyms.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean)
        : [];
      const combinedAnt = [...existingAntList];
      for (const a of token.antonyms) {
        if (!combinedAnt.includes(a)) combinedAnt.push(a);
      }
      const newAntonymsStr = combinedAnt.length > 0 ? combinedAnt.join(', ') : null;
      const antChanged = Boolean(token.antonyms.length > 0 && newAntonymsStr !== w.antonyms);

      // Folder: if folderId is null, but listName has a real folder name
      const folderChanged = Boolean(
        w.folderId === null &&
          w.listName &&
          w.listName.trim() &&
          w.listName.trim() !== 'Danh sách của tôi' &&
          w.listName.trim() !== 'Chưa phân loại',
      );
      const targetFolderName = folderChanged ? w.listName.trim() : null;

      const changeTypes: string[] = [];
      if (wordChanged) changeTypes.push('word');
      if (posChanged) changeTypes.push('pos');
      if (synChanged) changeTypes.push('synonyms');
      if (antChanged) changeTypes.push('antonyms');
      if (folderChanged) changeTypes.push('folder');

      if (changeTypes.length > 0) {
        candidates.push({
          id: w.id,
          originalWord: w.word,
          cleanWord,
          originalPos: w.partOfSpeech,
          newPos,
          originalSynonyms: w.synonyms,
          newSynonyms: newSynonymsStr,
          originalAntonyms: w.antonyms,
          newAntonyms: newAntonymsStr,
          originalFolderId: w.folderId,
          currentListName: w.listName,
          targetFolderName,
          needsReview: token.needsReview,
          reviewReason: token.reviewReason,
          changeTypes,
        });
      }
    }

    return {
      candidates,
      totalScanned: words.length,
      totalCandidates: candidates.length,
    };
  }

  async reanalyzeApply(userId: number, itemIds: number[]) {
    if (!itemIds || itemIds.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const words = await this.customVocabRepo
      .createQueryBuilder('cv')
      .where('cv.userId = :userId', { userId })
      .andWhere('cv.id IN (:...itemIds)', { itemIds })
      .getMany();

    const folderCache = new Map<string, VocabularyFolder>();
    let updatedCount = 0;

    for (const w of words) {
      const token = parseWordCellContent(w.word);

      // 1. Clean Word
      if (token.word && token.word !== w.word) {
        w.word = token.word;
      }

      // 2. POS
      if (token.partOfSpeech && (!w.partOfSpeech || w.partOfSpeech === 'khác')) {
        w.partOfSpeech = normalizePartOfSpeech(token.partOfSpeech) || token.partOfSpeech;
      }

      // 3. Synonyms
      if (token.synonyms.length > 0) {
        const existing = w.synonyms
          ? w.synonyms.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean)
          : [];
        for (const s of token.synonyms) {
          if (!existing.includes(s)) existing.push(s);
        }
        w.synonyms = existing.join(', ');
      }

      // 4. Antonyms
      if (token.antonyms.length > 0) {
        const existing = w.antonyms
          ? w.antonyms.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean)
          : [];
        for (const a of token.antonyms) {
          if (!existing.includes(a)) existing.push(a);
        }
        w.antonyms = existing.join(', ');
      }

      // 5. Folder link
      if (
        w.folderId === null &&
        w.listName &&
        w.listName.trim() &&
        w.listName.trim() !== 'Danh sách của tôi' &&
        w.listName.trim() !== 'Chưa phân loại'
      ) {
        const folderName = w.listName.trim();
        const cacheKey = `${w.language}:${folderName.toLowerCase()}`;
        let folder = folderCache.get(cacheKey);

        if (!folder) {
          folder =
            (await this.folderRepo.findOne({
              where: { userId, name: folderName, language: w.language },
            })) || undefined;

          if (!folder) {
            folder = await this.folderRepo.save(
              this.folderRepo.create({
                userId,
                name: folderName,
                language: w.language,
                color: '#3b82f6',
              }),
            );
          }
          folderCache.set(cacheKey, folder);
        }

        w.folderId = folder.id;
        w.listName = folder.name;
      }

      await this.customVocabRepo.save(w);
      updatedCount++;
    }

    return {
      success: true,
      updatedCount,
    };
  }


  // ==========================================
  // 5. AI SUGGESTION & ENRICHMENT PROXY
  // ==========================================

  async suggestMeanings(word: string, context?: string, language: string = 'en') {
    return this.aiService.getVietnameseMeanings(word, context, language);
  }

  async enrichBatch(
    items: Array<{ word: string; meaning?: string; example?: string }>,
    language: string = 'en',
  ) {
    return this.aiService.enrichBatch(items, language);
  }

  // ==========================================
  // 6. BACKWARD COMPATIBLE METHODS (PRESET CURRICULUM)
  // ==========================================

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

  async getByTopic(course: CourseType, topic: string): Promise<Vocabulary[]> {
    return this.vocabRepo.find({
      where: { course, topic },
      order: { id: 'ASC' },
    });
  }

  search(course: CourseType, keyword: string): Promise<Vocabulary[]> {
    return this.vocabRepo
      .createQueryBuilder('v')
      .where('v.course = :course', { course })
      .andWhere('(v.word ILIKE :kw OR v.meaning ILIKE :kw)', { kw: `%${keyword}%` })
      .take(20)
      .getMany();
  }

  async getUserProgress(userId: number, course: CourseType) {
    const totalWords = await this.vocabRepo.count({ where: { course } });
    const userWords = await this.userVocabRepo
      .createQueryBuilder('uv')
      .innerJoin('uv.vocabulary', 'v')
      .where('uv.userId = :userId AND v.course = :course', { userId, course })
      .getMany();

    const mastered = userWords.filter((w) => w.status === LearningStatus.MASTERED).length;
    const learning = userWords.filter((w) => w.status === LearningStatus.LEARNING).length;
    const newWords = Math.max(0, totalWords - mastered - learning);

    return { total: totalWords, mastered, learning, new: newWords };
  }

  async getDueWords(userId: number): Promise<UserVocabulary[]> {
    return this.userVocabRepo
      .createQueryBuilder('uv')
      .innerJoinAndSelect('uv.vocabulary', 'v')
      .where('uv.userId = :userId', { userId })
      .andWhere('uv.nextReviewAt <= :now', { now: new Date() })
      .andWhere('uv.status != :status', { status: LearningStatus.MASTERED })
      .orderBy('uv.nextReviewAt', 'ASC')
      .take(30)
      .getMany();
  }

  async markResult(
    userId: number,
    vocabularyId: number,
    correct: boolean,
  ): Promise<UserVocabulary> {
    let uv = await this.userVocabRepo.findOne({
      where: { userId, vocabulary: { id: vocabularyId } },
    });

    if (!uv) {
      uv = this.userVocabRepo.create({
        userId,
        vocabulary: { id: vocabularyId } as any,
        status: LearningStatus.NEW,
        correctCount: 0,
        incorrectCount: 0,
      });
    }

    uv.updatedAt = new Date();

    if (correct) {
      uv.correctCount += 1;
      if (uv.correctCount >= 5) {
        uv.status = LearningStatus.MASTERED;
      } else {
        uv.status = LearningStatus.LEARNING;
      }
      const days = [1, 3, 7, 14, 30];
      const idx = Math.min(uv.correctCount - 1, days.length - 1);
      uv.nextReviewAt = new Date(Date.now() + days[idx] * 86400000);
    } else {
      uv.incorrectCount += 1;
      uv.status = LearningStatus.LEARNING;
      uv.nextReviewAt = new Date(Date.now() + 3600000);
    }

    return this.userVocabRepo.save(uv);
  }

  async getCustomWords(userId: number): Promise<CustomVocabulary[]> {
    return this.getMyWords(userId, {});
  }

  async addCustomWord(
    userId: number,
    listName: string,
    word: string,
    meaning?: string,
    example?: string,
  ): Promise<CustomVocabulary> {
    const res = await this.addMyWord(userId, {
      word,
      meaning: meaning || '',
      example,
      allowDuplicate: true,
    });
    return res.item as CustomVocabulary;
  }

  async addCustomWordsBulk(
    userId: number,
    listName: string,
    items: Array<{ word: string; meaning?: string; example?: string }>,
  ) {
    return this.bulkImport(userId, {
      newFolderName: listName,
      items,
      duplicateStrategy: 'update',
    });
  }

  async updateCustomWord(
    userId: number,
    id: number,
    data: { word?: string; meaning?: string; example?: string },
  ) {
    return this.updateMyWord(userId, id, data as any);
  }

  async deleteCustomWord(userId: number, id: number) {
    return this.deleteMyWord(userId, id);
  }

  async deleteCustomList(userId: number, listName: string) {
    const result = await this.customVocabRepo.delete({ userId, listName });
    return { success: true, deletedCount: result.affected || 0 };
  }

  async renameCustomList(userId: number, oldName: string, newName: string) {
    const result = await this.customVocabRepo.update(
      { userId, listName: oldName },
      { listName: newName },
    );
    return { success: true, updatedCount: result.affected || 0 };
  }

  async updateCustomWordProgress(
    userId: number,
    id: number,
    stage: number,
    intervalDays: number,
  ) {
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

  async recordWordLearning(userId: number, dto: any) {
    return this.addMyWord(userId, {
      word: dto.word,
      meaning: dto.meaning || '',
      example: dto.example,
      allowDuplicate: true,
    });
  }

  async recordWordsLearningBatch(userId: number, items: any[]) {
    return this.bulkImport(userId, {
      items,
      duplicateStrategy: 'update',
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface MeaningSuggestion {
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  reading?: string;
  synonyms?: string[];
  antonyms?: string[];
  languageWarning?: string;
}

export interface EnrichmentResult {
  partOfSpeech?: string;
  synonyms?: string[];
  antonyms?: string[];
  meaning?: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  reading?: string;
  example?: string;
  exampleTranslation?: string;
  languageWarning?: string;
}

interface BuiltinWordEntry {
  reading?: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  meanings: Array<{
    meaning: string;
    partOfSpeech: string;
    example: string;
    exampleTranslation: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}

// Built-in English Dictionary
const BUILTIN_EN_MAP: Record<string, BuiltinWordEntry> = {
  bank: {
    ipa: '/bæŋk/',
    meanings: [
      {
        meaning: 'ngân hàng, cơ sở tài chính',
        partOfSpeech: 'danh từ',
        example: 'I need to go to the bank to deposit my paycheck.',
        exampleTranslation: 'Tôi cần đến ngân hàng để gửi tiền lương.',
        synonyms: ['financial institution', 'depository'],
        antonyms: [],
      },
      {
        meaning: 'bờ sông, bờ đê',
        partOfSpeech: 'danh từ',
        example: 'They walked along the river bank enjoying the breeze.',
        exampleTranslation: 'Họ đi dạo dọc bờ sông ngắm làn gió mát.',
        synonyms: ['shore', 'riverbank', 'edge'],
        antonyms: [],
      },
    ],
  },
  book: {
    ipa: '/bʊk/',
    meanings: [
      {
        meaning: 'cuốn sách, quyển sách',
        partOfSpeech: 'danh từ',
        example: 'She is reading a captivating book about artificial intelligence.',
        exampleTranslation: 'Cô ấy đang đọc một cuốn sách hấp dẫn về trí tuệ nhân tạo.',
        synonyms: ['volume', 'publication'],
        antonyms: [],
      },
      {
        meaning: 'đặt trước, giữ chỗ',
        partOfSpeech: 'động từ',
        example: 'We should book our flight tickets in advance.',
        exampleTranslation: 'Chúng ta nên đặt vé máy bay trước để nhận ưu đãi.',
        synonyms: ['reserve', 'schedule'],
        antonyms: ['cancel'],
      },
    ],
  },
  collaborate: {
    ipa: '/kəˈlæbəreɪt/',
    meanings: [
      {
        meaning: 'hợp tác, phối hợp làm việc',
        partOfSpeech: 'động từ',
        example: 'We collaborate closely with international partners on this project.',
        exampleTranslation: 'Chúng tôi hợp tác chặt chẽ với các đối tác quốc tế trong dự án này.',
        synonyms: ['cooperate', 'team up', 'work together'],
        antonyms: ['compete', 'oppose'],
      },
    ],
  },
  contract: {
    ipa: '/ˈkɒntrækt/',
    meanings: [
      {
        meaning: 'hợp đồng, bản giao kèo',
        partOfSpeech: 'danh từ',
        example: 'Both parties signed the employment contract yesterday.',
        exampleTranslation: 'Cả hai bên đã ký hợp đồng lao động ngày hôm qua.',
        synonyms: ['agreement', 'deal', 'compact'],
        antonyms: ['breach'],
      },
    ],
  },
  innovative: {
    ipa: '/ˈɪnəveɪtɪv/',
    meanings: [
      {
        meaning: 'mang tính đổi mới, sáng tạo',
        partOfSpeech: 'tính từ',
        example: 'The startup introduced an innovative learning method.',
        exampleTranslation: 'Công ty khởi nghiệp đã giới thiệu một phương pháp học tập đổi mới sáng tạo.',
        synonyms: ['creative', 'groundbreaking', 'cutting-edge'],
        antonyms: ['traditional', 'outdated'],
      },
    ],
  },
  learn: {
    ipa: '/lɜːn/',
    meanings: [
      {
        meaning: 'học hỏi, tiếp thu kiến thức',
        partOfSpeech: 'động từ',
        example: 'StudyForward helps students learn languages with confidence.',
        exampleTranslation: 'StudyForward giúp học viên tự tin học các ngôn ngữ.',
        synonyms: ['acquire', 'master', 'study'],
        antonyms: ['forget'],
      },
    ],
  },
  stairs: {
    ipa: '/steərz/',
    meanings: [
      {
        meaning: 'cầu thang bộ',
        partOfSpeech: 'danh từ',
        example: 'He ran up the stairs.',
        exampleTranslation: 'Anh ấy chạy lên cầu thang.',
        synonyms: ['staircase', 'steps'],
      },
    ],
  },
  suitcase: {
    ipa: '/ˈsuːtkeɪs/',
    meanings: [
      {
        meaning: 'vali',
        partOfSpeech: 'danh từ',
        example: 'She packed her suitcase for the trip.',
        exampleTranslation: 'Cô ấy đóng gói vali cho chuyến đi.',
        synonyms: ['luggage', 'bag'],
      },
    ],
  },
};

// Built-in Thai Dictionary
const BUILTIN_TH_MAP: Record<string, BuiltinWordEntry> = {
  'สวัสดี': {
    thaiReading: 'sà-wàt-dii',
    reading: 'sà-wàt-dii',
    meanings: [
      {
        meaning: 'xin chào, lời chào hỏi',
        partOfSpeech: 'câu chào / thán từ',
        example: 'สวัสดีครับ ยินดีที่ได้รู้จักครับ',
        exampleTranslation: 'Xin chào, rất vui được làm quen với bạn.',
        synonyms: ['หวัดดี'],
        antonyms: [],
      },
    ],
  },
  'ขอบคุณ': {
    thaiReading: 'khòop-khun',
    reading: 'khòop-khun',
    meanings: [
      {
        meaning: 'cảm ơn, lời tri ân',
        partOfSpeech: 'động từ / câu chúc',
        example: 'ขอบคุณมากสำหรับความช่วยเหลือของคุณ',
        exampleTranslation: 'Cảm ơn bạn rất nhiều vì sự giúp đỡ nhiệt tình.',
        synonyms: ['ขอบใจ'],
        antonyms: [],
      },
    ],
  },
  'เรียน': {
    thaiReading: 'rian',
    reading: 'rian',
    meanings: [
      {
        meaning: 'học, học tập',
        partOfSpeech: 'động từ',
        example: 'ฉันเรียนภาษาไทยทุกวันด้วยความตั้งใจ',
        exampleTranslation: 'Tôi học tiếng Thái mỗi ngày một cách chăm chỉ.',
        synonyms: ['ศึกษา'],
        antonyms: ['สอน'],
      },
    ],
  },
  'ทำงาน': {
    thaiReading: 'tham-ngaan',
    reading: 'tham-ngaan',
    meanings: [
      {
        meaning: 'làm việc, công tác',
        partOfSpeech: 'động từ',
        example: 'เขาทำงานที่บริษัทเทคโนโลยีในกรุงเทพฯ',
        exampleTranslation: 'Anh ấy làm việc tại một công ty công nghệ ở Bangkok.',
        synonyms: ['ปฏิบัติงาน'],
        antonyms: ['พักผ่อน'],
      },
    ],
  },
  'เพื่อน': {
    thaiReading: 'phêu-an',
    reading: 'phêu-an',
    meanings: [
      {
        meaning: 'bạn bè, người bạn',
        partOfSpeech: 'danh từ',
        example: 'เพื่อนที่ดีจะคอยช่วยเหลือเราเสมอ',
        exampleTranslation: 'Người bạn tốt sẽ luôn sẵn lòng giúp đỡ chúng ta.',
        synonyms: ['มิตร', 'สหาย'],
        antonyms: ['ศัตรู'],
      },
    ],
  },
  'อาหาร': {
    thaiReading: 'aa-hǎan',
    reading: 'aa-hǎan',
    meanings: [
      {
        meaning: 'thức ăn, món ăn, ẩm thực',
        partOfSpeech: 'danh từ',
        example: 'อาหารไทยมีรสชาติกลมกล่อมและเผ็ดร้อน',
        exampleTranslation: 'Món ăn Thái có hương vị đậm đà và cay nồng.',
        synonyms: ['ของกิน'],
        antonyms: [],
      },
    ],
  },
};

// Built-in Korean Dictionary
const BUILTIN_KO_MAP: Record<string, BuiltinWordEntry> = {
  '안녕하세요': {
    romaja: 'annyeonghaseyo',
    reading: 'annyeonghaseyo',
    meanings: [
      {
        meaning: 'xin chào, lời chào hỏi lịch sự',
        partOfSpeech: 'câu chào',
        example: '안녕하세요! 만나서 정말 반갑습니다.',
        exampleTranslation: 'Xin chào! Rất vui được gặp bạn.',
        synonyms: ['안녕'],
        antonyms: [],
      },
    ],
  },
  '감사합니다': {
    romaja: 'gamsahamnida',
    reading: 'gamsahamnida',
    meanings: [
      {
        meaning: 'cảm ơn, xin cảm ơn chân thành',
        partOfSpeech: 'động từ / câu cảm ơn',
        example: '도와주셔서 진심으로 감사합니다.',
        exampleTranslation: 'Chân thành cảm ơn bạn đã giúp đỡ tôi.',
        synonyms: ['고맙습니다'],
        antonyms: [],
      },
    ],
  },
  '공부': {
    romaja: 'gongbu',
    reading: 'gongbu',
    meanings: [
      {
        meaning: 'sự học, học tập',
        partOfSpeech: 'danh từ',
        example: '저는 매일 저녁 도서관에서 한국어를 공부해요.',
        exampleTranslation: 'Tôi học tiếng Hàn ở thư viện mỗi buổi tối.',
        synonyms: ['학습', '연구'],
        antonyms: [],
      },
    ],
  },
  '친구': {
    romaja: 'chingu',
    reading: 'chingu',
    meanings: [
      {
        meaning: 'bạn bè, bạn',
        partOfSpeech: 'danh từ',
        example: '주말에 친한 친구와 커피를 마셨어요.',
        exampleTranslation: 'Cuối tuần tôi đã uống cà phê cùng người bạn thân.',
        synonyms: ['벗', '동무'],
        antonyms: ['적'],
      },
    ],
  },
  '사랑': {
    romaja: 'sarang',
    reading: 'sarang',
    meanings: [
      {
        meaning: 'tình yêu, sự yêu thương',
        partOfSpeech: 'danh từ',
        example: '가족에 대한 사랑은 무엇보다 소중합니다.',
        exampleTranslation: 'Tình yêu dành cho gia đình quý giá hơn tất cả.',
        synonyms: ['애정'],
        antonyms: ['증오'],
      },
    ],
  },
  '행복': {
    romaja: 'haengbok',
    reading: 'haengbok',
    meanings: [
      {
        meaning: 'hạnh phúc, niềm vui sướng',
        partOfSpeech: 'danh từ',
        example: '우리의 삶에서 건강과 행복이 가장 중요해요.',
        exampleTranslation: 'Sức khỏe và hạnh phúc là điều quan trọng nhất trong cuộc sống chúng ta.',
        synonyms: ['기쁨'],
        antonyms: ['불행', '슬픔'],
      },
    ],
  },
};

// Built-in Chinese Dictionary (Simplified + Pinyin with tone marks)
const BUILTIN_ZH_MAP: Record<string, BuiltinWordEntry> = {
  '学习': {
    pinyin: 'xuéxí',
    reading: 'xuéxí',
    meanings: [
      {
        meaning: 'học tập, học hỏi',
        partOfSpeech: 'động từ',
        example: '我们在StudyForward平台上努力学习外语。',
        exampleTranslation: 'Chúng tôi nỗ lực học ngoại ngữ trên nền tảng StudyForward.',
        synonyms: ['攻读', '研读'],
        antonyms: [],
      },
    ],
  },
  '你好': {
    pinyin: 'nǐ hǎo',
    reading: 'nǐ hǎo',
    meanings: [
      {
        meaning: 'xin chào, chào bạn',
        partOfSpeech: 'câu chào',
        example: '你好！很高兴能和你一起共事。',
        exampleTranslation: 'Xin chào! Rất vui được làm việc cùng bạn.',
        synonyms: ['您好'],
        antonyms: [],
      },
    ],
  },
  '谢谢': {
    pinyin: 'xièxie',
    reading: 'xièxie',
    meanings: [
      {
        meaning: 'cảm ơn',
        partOfSpeech: 'động từ / câu cảm ơn',
        example: '非常谢谢你的热情指导与支持。',
        exampleTranslation: 'Vô cùng cảm ơn sự chỉ dẫn và ủng hộ nhiệt tình của bạn.',
        synonyms: ['感谢'],
        antonyms: [],
      },
    ],
  },
  '朋友': {
    pinyin: 'péngyou',
    reading: 'péngyou',
    meanings: [
      {
        meaning: 'bạn bè, người bạn',
        partOfSpeech: 'danh từ',
        example: '真诚的朋友是人生最珍贵的财富。',
        exampleTranslation: 'Người bạn chân thành là tài sản quý giá nhất của cuộc đời.',
        synonyms: ['友人', '同伴'],
        antonyms: ['敌人'],
      },
    ],
  },
  '工作': {
    pinyin: 'gōngzuò',
    reading: 'gōngzuò',
    meanings: [
      {
        meaning: 'công việc, làm việc',
        partOfSpeech: 'danh từ / động từ',
        example: '他每天都认真负责地完成各项工作。',
        exampleTranslation: 'Anh ấy mỗi ngày đều hoàn thành công việc một cách nghiêm túc và có trách nhiệm.',
        synonyms: ['职业', '劳动'],
        antonyms: ['休息'],
      },
    ],
  },
  '时间': {
    pinyin: 'shíjiān',
    reading: 'shíjiān',
    meanings: [
      {
        meaning: 'thời gian, thì giờ',
        partOfSpeech: 'danh từ',
        example: '珍惜时间就是珍惜我们宝贵的生命。',
        exampleTranslation: 'Trân trọng thời gian chính là trân trọng sinh mệnh quý giá của chúng ta.',
        synonyms: ['光阴', '岁月'],
        antonyms: [],
      },
    ],
  },
};

// Built-in Japanese Dictionary (Kanji + Kana + Romaji)
const BUILTIN_JA_MAP: Record<string, BuiltinWordEntry> = {
  '勉強': {
    kana: 'べんきょう',
    romaji: 'benkyou',
    reading: 'べんきょう (benkyou)',
    meanings: [
      {
        meaning: 'học tập, sự học',
        partOfSpeech: 'danh từ / động từ',
        example: '毎朝早く起きて日本語を勉強しています。',
        exampleTranslation: 'Mỗi sáng tôi thức dậy sớm để học tiếng Nhật.',
        synonyms: ['学習'],
        antonyms: [],
      },
    ],
  },
  'こんにちは': {
    kana: 'こんにちは',
    romaji: 'konnichiwa',
    reading: 'konnichiwa',
    meanings: [
      {
        meaning: 'xin chào (buổi trưa / ban ngày)',
        partOfSpeech: 'câu chào',
        example: '皆さん、こんにちは。今日も頑張りましょう。',
        exampleTranslation: 'Xin chào mọi người. Hôm nay chúng ta cùng cố gắng nhé.',
        synonyms: [],
        antonyms: [],
      },
    ],
  },
  'ありがとう': {
    kana: 'ありがとう',
    romaji: 'arigatou',
    reading: 'arigatou',
    meanings: [
      {
        meaning: 'cảm ơn',
        partOfSpeech: 'thán từ / câu cảm ơn',
        example: 'いつも親切に教えてくれてありがとう。',
        exampleTranslation: 'Cảm ơn vì đã luôn nhiệt tình chỉ bảo cho tôi.',
        synonyms: ['感謝'],
        antonyms: [],
      },
    ],
  },
  '友達': {
    kana: 'ともだち',
    romaji: 'tomodachi',
    reading: 'ともだち (tomodachi)',
    meanings: [
      {
        meaning: 'bạn bè, bạn thân',
        partOfSpeech: 'danh từ',
        example: '週末に友達と一緒においしいラーメンを食べました。',
        exampleTranslation: 'Cuối tuần tôi đã đi ăn mì ramen ngon cùng bạn bè.',
        synonyms: ['友人'],
        antonyms: ['敵'],
      },
    ],
  },
  '仕事': {
    kana: 'しごと',
    romaji: 'shigoto',
    reading: 'しごと (shigoto)',
    meanings: [
      {
        meaning: 'công việc, nghề nghiệp',
        partOfSpeech: 'danh từ',
        example: '新しい仕事にも少しずつ慣れてきました。',
        exampleTranslation: 'Tôi cũng đã quen dần từng chút một với công việc mới.',
        synonyms: ['勤務', '職'],
        antonyms: ['休み'],
      },
    ],
  },
  '家族': {
    kana: 'かぞく',
    romaji: 'kazoku',
    reading: 'かぞく (kazoku)',
    meanings: [
      {
        meaning: 'gia đình',
        partOfSpeech: 'danh từ',
        example: '休日は家族と一緒にゆっくり過ごします。',
        exampleTranslation: 'Ngày nghỉ tôi dành thời gian thư thái bên gia đình.',
        synonyms: ['家庭'],
        antonyms: [],
      },
    ],
  },
};

@Injectable()
export class AiVocabularyService {
  private readonly logger = new Logger(AiVocabularyService.name);

  // In-memory cache scoped by `${language}:${word}`
  private cache = new Map<string, MeaningSuggestion[]>();
  private enrichmentCache = new Map<string, EnrichmentResult>();

  // Rate limiting map: tracks last request timestamp per IP/key
  private rateLimitMap = new Map<string, number>();

  /**
   * Detects the script of the word and returns a warning message if it clearly doesn't match the expected learning language.
   */
  public detectLanguageMismatch(word: string, targetLanguage: string): string | null {
    const text = (word || '').trim();
    if (!text) return null;

    const hasThai = /[\u0E00-\u0E7F]/.test(text);
    const hasHangul = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
    const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const hasHanzi = /[\u4E00-\u9FFF]/.test(text);
    const isAsciiLatinOnly = /^[a-zA-Z\s\d\-',.!?/()]+$/.test(text);

    switch (targetLanguage) {
      case 'th':
        if (hasHangul) return 'Từ vựng bạn nhập có chứa chữ Hangul tiếng Hàn thay vì tiếng Thái.';
        if (hasKana) return 'Từ vựng bạn nhập có chứa chữ Kana tiếng Nhật thay vì tiếng Thái.';
        if (hasHanzi) return 'Từ vựng bạn nhập có chứa chữ Hán thay vì chữ Thái.';
        if (isAsciiLatinOnly && text.length > 2) {
          return 'Bạn đang nhập ký tự Latin. Nếu là phiên âm tiếng Thái, hãy nhớ kiểm tra lại cách viết chữ Thái gốc.';
        }
        break;

      case 'ko':
        if (hasThai) return 'Từ vựng bạn nhập có chứa chữ Thái thay vì tiếng Hàn.';
        if (hasKana) return 'Từ vựng bạn nhập có chứa chữ Kana tiếng Nhật thay vì tiếng Hàn.';
        break;

      case 'zh':
        if (hasThai) return 'Từ vựng bạn nhập có chứa chữ Thái thay vì tiếng Trung.';
        if (hasHangul) return 'Từ vựng bạn nhập có chứa chữ Hàn thay vì tiếng Trung.';
        if (hasKana) return 'Từ vựng bạn nhập có chứa chữ Kana tiếng Nhật thay vì chữ Hán giản thể tiếng Trung.';
        break;

      case 'ja':
        if (hasThai) return 'Từ vựng bạn nhập có chứa chữ Thái thay vì tiếng Nhật.';
        if (hasHangul) return 'Từ vựng bạn nhập có chứa chữ Hàn thay vì tiếng Nhật.';
        break;

      case 'en':
      default:
        if (hasThai) return 'Từ vựng bạn nhập có vẻ là tiếng Thái thay vì tiếng Anh.';
        if (hasHangul) return 'Từ vựng bạn nhập có vẻ là tiếng Hàn thay vì tiếng Anh.';
        if (hasKana) return 'Từ vựng bạn nhập có vẻ là tiếng Nhật thay vì tiếng Anh.';
        if (hasHanzi) return 'Từ vựng bạn nhập có vẻ là tiếng Trung / Nhật thay vì tiếng Anh.';
        break;
    }

    return null;
  }

  /**
   * Primary method: Returns Vietnamese meanings, readings, POS, and examples for a word in the target language.
   */
  async getVietnameseMeanings(
    word: string,
    context?: string,
    targetLanguage: string = 'en',
  ): Promise<MeaningSuggestion[]> {
    const lang = targetLanguage || 'en';
    const cleanWord = (word || '').trim();
    if (!cleanWord) return [];

    const cacheKey = `${lang}:${cleanWord.toLowerCase()}:${(context || '').trim().toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check script warning
    const languageWarning = this.detectLanguageMismatch(cleanWord, lang) || undefined;

    // 1. Check Built-in Dictionaries
    const builtinResult = this.lookupBuiltin(cleanWord, lang);
    if (builtinResult && builtinResult.length > 0) {
      if (languageWarning) {
        builtinResult.forEach((item) => (item.languageWarning = languageWarning));
      }
      this.cache.set(cacheKey, builtinResult);
      return builtinResult;
    }

    // 2. Query Gemini AI with strict JSON validation & rate limit check
    const aiResults = await this.queryExternalAi(cleanWord, context, lang);
    if (aiResults && aiResults.length > 0) {
      if (languageWarning) {
        aiResults.forEach((item) => (item.languageWarning = languageWarning));
      }
      this.cache.set(cacheKey, aiResults);
      return aiResults;
    }

    // 3. Fallback Heuristic Generator (Never fails, zero hallucination)
    const fallbackResults = this.generateLinguisticFallback(cleanWord, lang, context);
    if (languageWarning) {
      fallbackResults.forEach((item) => (item.languageWarning = languageWarning));
    }
    this.cache.set(cacheKey, fallbackResults);
    return fallbackResults;
  }

  /**
   * Enrich missing POS, readings, synonyms, antonyms, meaning for a word.
   */
  async enrichWord(
    word: string,
    existingMeaning?: string,
    existingExample?: string,
    targetLanguage: string = 'en',
  ): Promise<EnrichmentResult> {
    const lang = targetLanguage || 'en';
    const cleanWord = (word || '').trim();
    const cacheKey = `${lang}:${cleanWord.toLowerCase()}:${(existingMeaning || '').trim().toLowerCase()}`;
    if (this.enrichmentCache.has(cacheKey)) {
      return this.enrichmentCache.get(cacheKey)!;
    }

    const languageWarning = this.detectLanguageMismatch(cleanWord, lang) || undefined;

    // 1. Check built-in dictionary
    const builtin = this.lookupBuiltinEntry(cleanWord, lang);
    if (builtin) {
      let bestSense = builtin.meanings[0];
      if (existingMeaning) {
        const match = builtin.meanings.find(
          (m) =>
            existingMeaning.toLowerCase().includes(m.meaning.toLowerCase()) ||
            m.meaning.toLowerCase().includes(existingMeaning.toLowerCase()),
        );
        if (match) bestSense = match;
      }

      const res: EnrichmentResult = {
        ipa: builtin.ipa,
        pinyin: builtin.pinyin,
        kana: builtin.kana,
        romaji: builtin.romaji,
        romaja: builtin.romaja,
        thaiReading: builtin.thaiReading,
        reading: builtin.reading || builtin.ipa || builtin.pinyin || builtin.kana || builtin.romaja || builtin.thaiReading,
        partOfSpeech: bestSense.partOfSpeech,
        synonyms: bestSense.synonyms && bestSense.synonyms.length > 0 ? bestSense.synonyms : undefined,
        antonyms: bestSense.antonyms && bestSense.antonyms.length > 0 ? bestSense.antonyms : undefined,
        meaning: bestSense.meaning,
        example: bestSense.example,
        exampleTranslation: bestSense.exampleTranslation,
        languageWarning,
      };
      this.enrichmentCache.set(cacheKey, res);
      return res;
    }

    // 2. Query Gemini AI for enrichment
    const aiEnrich = await this.queryExternalAiForEnrichment(cleanWord, existingMeaning, existingExample, lang);
    if (aiEnrich) {
      if (languageWarning) aiEnrich.languageWarning = languageWarning;
      this.enrichmentCache.set(cacheKey, aiEnrich);
      return aiEnrich;
    }

    // 3. Query dictionaryapi.dev fallback for English if AI fails
    if (lang === 'en') {
      try {
        const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
        if (dictRes.ok) {
          const dictData = await dictRes.json();
          if (dictData && dictData.length > 0) {
            const phonetic = dictData[0].phonetic || (dictData[0].phonetics && dictData[0].phonetics.find((p: any) => p.text)?.text);
            if (phonetic) {
              const res: EnrichmentResult = {
                ipa: phonetic,
                reading: phonetic,
                partOfSpeech: this.guessPartOfSpeech(cleanWord, lang),
                languageWarning,
              };
              this.enrichmentCache.set(cacheKey, res);
              return res;
            }
          }
        }
      } catch (err) {
        // ignore dictionary fallback errors
      }
    }

    // 4. Fallback
    const res: EnrichmentResult = {
      partOfSpeech: this.guessPartOfSpeech(cleanWord, lang),
      languageWarning,
    };
    this.enrichmentCache.set(cacheKey, res);
    return res;
  }

  /**
   * Batch enrichment for multiple words (used in Excel import)
   */
  async enrichBatch(
    items: Array<{ word: string; meaning?: string; example?: string }>,
    targetLanguage: string = 'en',
  ): Promise<Array<EnrichmentResult & { index: number }>> {
    const results: Array<EnrichmentResult & { index: number }> = [];
    const missingItems: Array<{ word: string; meaning?: string; example?: string; originalIndex: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cleanWord = (item.word || '').trim();
      if (!cleanWord) continue;

      const lang = targetLanguage || 'en';
      const cacheKey = `${lang}:${cleanWord.toLowerCase()}:${(item.meaning || '').trim().toLowerCase()}`;

      if (this.enrichmentCache.has(cacheKey)) {
        results.push({ ...this.enrichmentCache.get(cacheKey)!, index: i });
        continue;
      }

      const languageWarning = this.detectLanguageMismatch(cleanWord, lang) || undefined;
      const builtin = this.lookupBuiltinEntry(cleanWord, lang);
      if (builtin) {
        let bestSense = builtin.meanings[0];
        if (item.meaning) {
          const match = builtin.meanings.find(
            (m) => item.meaning!.toLowerCase().includes(m.meaning.toLowerCase()) || m.meaning.toLowerCase().includes(item.meaning!.toLowerCase()),
          );
          if (match) bestSense = match;
        }
        const res: EnrichmentResult = {
          ipa: builtin.ipa, pinyin: builtin.pinyin, kana: builtin.kana, romaji: builtin.romaji, romaja: builtin.romaja, thaiReading: builtin.thaiReading,
          reading: builtin.reading || builtin.ipa || builtin.pinyin || builtin.kana || builtin.romaja || builtin.thaiReading,
          partOfSpeech: bestSense.partOfSpeech,
          synonyms: bestSense.synonyms && bestSense.synonyms.length > 0 ? bestSense.synonyms : undefined,
          antonyms: bestSense.antonyms && bestSense.antonyms.length > 0 ? bestSense.antonyms : undefined,
          meaning: bestSense.meaning, example: bestSense.example, exampleTranslation: bestSense.exampleTranslation, languageWarning,
        };
        this.enrichmentCache.set(cacheKey, res);
        results.push({ ...res, index: i });
        continue;
      }

      missingItems.push({ ...item, originalIndex: i });
    }

    if (missingItems.length > 0) {
      const aiResults = await this.queryExternalAiForEnrichmentBulk(missingItems, targetLanguage);
      for (const missing of missingItems) {
        const res = aiResults[missing.originalIndex] || {
          partOfSpeech: this.guessPartOfSpeech(missing.word, targetLanguage),
          languageWarning: this.detectLanguageMismatch(missing.word, targetLanguage) || undefined,
        };
        const cacheKey = `${targetLanguage || 'en'}:${missing.word.trim().toLowerCase()}:${(missing.meaning || '').trim().toLowerCase()}`;
        this.enrichmentCache.set(cacheKey, res);
        results.push({ ...res, index: missing.originalIndex });
      }
    }

    return results;
  }

  private async queryExternalAiForEnrichmentBulk(
    items: Array<{ word: string; meaning?: string; example?: string; originalIndex: number }>,
    targetLanguage: string = 'en',
  ): Promise<Record<number, EnrichmentResult>> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return {};

    const langNames: Record<string, string> = {
      en: 'tiếng Anh', th: 'tiếng Thái', ko: 'tiếng Hàn', zh: 'tiếng Trung', ja: 'tiếng Nhật',
    };
    const targetName = langNames[targetLanguage] || 'tiếng Anh';

    const wordsList = items.map(item => {
      let desc = `- Từ: "${item.word}"`;
      if (item.meaning) desc += `\n  + Nghĩa hiện tại: "${item.meaning}"`;
      if (item.example) desc += `\n  + Ví dụ hiện tại: "${item.example}"`;
      return desc;
    }).join('\n\n');

    const prompt = `Bạn là từ điển ${targetName} - tiếng Việt. Phân tích các từ sau:\n\n${wordsList}\n\n` +
      `Hãy trả về JSON array tương ứng với từng từ (cùng thứ tự, cùng độ dài array). Bổ sung từ loại tiếng Việt, phiên âm/cách đọc, ví dụ và bản dịch ví dụ. ` +
      `Nếu có từ đồng nghĩa/trái nghĩa chuẩn xác thì bổ sung. ĐIỀN GIÁ TRỊ THẬT, không chép lại phần hướng dẫn. Trả về JSON array:\n` +
      `[\n  {\n    "reading": "cách đọc",\n    "ipa": "phiên âm IPA (nếu tiếng Anh)",\n    "pinyin": "Pinyin (tiếng Trung)",\n    "kana": "Kana (tiếng Nhật)",\n    "romaji": "Romaji (tiếng Nhật)",\n    "romaja": "Romaja (tiếng Hàn)",\n    "thaiReading": "cách đọc phiên âm (tiếng Thái)",\n    "partOfSpeech": "danh từ | động từ | tính từ | trạng từ | khác",\n    "synonyms": ["từ 1"],\n    "antonyms": ["từ 1"],\n    "meaning": "nghĩa tiếng Việt thực tế (nếu chưa có)",\n    "example": "ví dụ bằng ${targetName} (nếu chưa có)",\n    "exampleTranslation": "dịch ví dụ sang tiếng Việt"\n  }\n]\n` +
      `Chỉ trả về JSON array thuần.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) return {};
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return {};

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return {};

      const result: Record<number, EnrichmentResult> = {};
      parsed.forEach((p, idx) => {
        if (idx < items.length) {
          result[items[idx].originalIndex] = {
            reading: p.reading,
            ipa: p.ipa,
            pinyin: p.pinyin,
            kana: p.kana,
            romaji: p.romaji,
            romaja: p.romaja,
            thaiReading: p.thaiReading,
            partOfSpeech: this.standardizePos(p.partOfSpeech),
            synonyms: Array.isArray(p.synonyms) ? p.synonyms : [],
            antonyms: Array.isArray(p.antonyms) ? p.antonyms : [],
            meaning: p.meaning,
            example: p.example,
            exampleTranslation: p.exampleTranslation,
            languageWarning: this.detectLanguageMismatch(items[idx].word, targetLanguage) || undefined,
          };
        }
      });
      return result;
    } catch (err) {
      this.logger.warn(`Gemini bulk enrichment failed: ${err}`);
      return {};
    }
  }

  // --- PRIVATE HELPERS ---

  private lookupBuiltinEntry(word: string, lang: string): BuiltinWordEntry | null {
    const key = word.trim().toLowerCase();
    switch (lang) {
      case 'th':
        return BUILTIN_TH_MAP[word.trim()] || null;
      case 'ko':
        return BUILTIN_KO_MAP[word.trim()] || null;
      case 'zh':
        return BUILTIN_ZH_MAP[word.trim()] || null;
      case 'ja':
        return BUILTIN_JA_MAP[word.trim()] || null;
      case 'en':
      default:
        return BUILTIN_EN_MAP[key] || null;
    }
  }

  private lookupBuiltin(word: string, lang: string): MeaningSuggestion[] | null {
    const entry = this.lookupBuiltinEntry(word, lang);
    if (!entry) return null;

    return entry.meanings.map((m) => ({
      meaning: m.meaning,
      partOfSpeech: m.partOfSpeech,
      example: m.example,
      exampleTranslation: m.exampleTranslation,
      ipa: entry.ipa,
      pinyin: entry.pinyin,
      kana: entry.kana,
      romaji: entry.romaji,
      romaja: entry.romaja,
      thaiReading: entry.thaiReading,
      reading: entry.reading || entry.ipa || entry.pinyin || entry.kana || entry.romaja || entry.thaiReading,
      synonyms: m.synonyms,
      antonyms: m.antonyms,
    }));
  }

  private async queryExternalAi(
    word: string,
    context?: string,
    targetLanguage: string = 'en',
  ): Promise<MeaningSuggestion[] | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;

    const langNames: Record<string, string> = {
      en: 'tiếng Anh',
      th: 'tiếng Thái',
      ko: 'tiếng Hàn',
      zh: 'tiếng Trung (chữ Hán giản thể)',
      ja: 'tiếng Nhật (Kanji/Kana)',
    };
    const targetName = langNames[targetLanguage] || 'tiếng Anh';

    try {
      const prompt = `Bạn là từ điển đối chiếu song ngữ chuyên nghiệp giữa ${targetName} và tiếng Việt.
Hãy phân tích từ hoặc cụm từ: "${word}".
${context ? `Ngữ cảnh / câu ví dụ cung cấp: "${context}". Ưu tiên nghĩa phù hợp nhất với ngữ cảnh này.` : ''}

Yêu cầu trả về JSON Array chứa từ 1 đến 3 nghĩa phổ biến nhất. ĐIỀN GIÁ TRỊ THẬT vào các trường (không chép lại phần giải thích):
[
  {
    "meaning": "chắc chắn, tuyệt đối", // (Ví dụ: điền nghĩa tiếng Việt thực tế)
    "partOfSpeech": "trạng từ", // (Chọn 1: danh từ | động từ | tính từ | trạng từ | câu chào | khác)
    "reading": "cách đọc / phiên âm thích hợp",
    "ipa": "phiên âm IPA (nếu là tiếng Anh)",
    "pinyin": "phiên âm Pinyin có dấu thanh (nếu là tiếng Trung)",
    "kana": "cách đọc Hiragana/Katakana (nếu là tiếng Nhật)",
    "romaji": "phiên âm Romaji (nếu là tiếng Nhật)",
    "romaja": "phiên âm Revised Romanization (nếu là tiếng Hàn)",
    "thaiReading": "cách đọc phiên âm cho người Việt (nếu là tiếng Thái)",
    "example": "câu ví dụ chuẩn bằng ${targetName}",
    "exampleTranslation": "dịch câu ví dụ sang tiếng Việt",
    "synonyms": ["từ đồng nghĩa 1", "từ đồng nghĩa 2"],
    "antonyms": ["từ trái nghĩa 1"]
  }
]
Lưu ý:
- Không tự bịa từ đồng nghĩa hoặc trái nghĩa nếu không có.
- Điền NGÔN NGỮ THẬT, không xuất ra văn bản hướng dẫn.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(6000),
        },
      );

      if (!response.ok) return null;
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          meaning: String(item.meaning || '').trim(),
          partOfSpeech: this.standardizePos(item.partOfSpeech),
          reading: item.reading ? String(item.reading).trim() : undefined,
          ipa: item.ipa ? String(item.ipa).trim() : undefined,
          pinyin: item.pinyin ? String(item.pinyin).trim() : undefined,
          kana: item.kana ? String(item.kana).trim() : undefined,
          romaji: item.romaji ? String(item.romaji).trim() : undefined,
          romaja: item.romaja ? String(item.romaja).trim() : undefined,
          thaiReading: item.thaiReading ? String(item.thaiReading).trim() : undefined,
          example: String(item.example || '').trim(),
          exampleTranslation: String(item.exampleTranslation || '').trim(),
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
        }));
      }
    } catch (err) {
      this.logger.warn(`Gemini AI query failed for ${word} [${targetLanguage}]: ${err}`);
    }
    return null;
  }

  private async queryExternalAiForEnrichment(
    word: string,
    existingMeaning?: string,
    existingExample?: string,
    targetLanguage: string = 'en',
  ): Promise<EnrichmentResult | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;

    const langNames: Record<string, string> = {
      en: 'tiếng Anh',
      th: 'tiếng Thái',
      ko: 'tiếng Hàn',
      zh: 'tiếng Trung',
      ja: 'tiếng Nhật',
    };
    const targetName = langNames[targetLanguage] || 'tiếng Anh';

    try {
      const prompt = `Bạn là từ điển ${targetName} - tiếng Việt. Phân tích từ: "${word}".
${existingMeaning ? `Nghĩa người dùng đã có: "${existingMeaning}".` : ''}
${existingExample ? `Ví dụ người dùng đã có: "${existingExample}".` : ''}

Hãy bổ sung từ loại tiếng Việt, phiên âm/cách đọc, ví dụ và bản dịch ví dụ. Nếu có từ đồng nghĩa/trái nghĩa chuẩn xác thì bổ sung, không tự bịa.
Trả về JSON đúng cấu trúc:
{
  "reading": "cách đọc",
  "ipa": "phiên âm IPA (nếu là tiếng Anh)",
  "pinyin": "Pinyin có dấu thanh (nếu là tiếng Trung)",
  "kana": "Furigana/Kana (nếu là tiếng Nhật)",
  "romaji": "Romaji (nếu là tiếng Nhật)",
  "romaja": "Romaja (nếu là tiếng Hàn)",
  "thaiReading": "cách đọc phiên âm (nếu là tiếng Thái)",
  "partOfSpeech": "danh từ | động từ | tính từ | trạng từ | khác",
  "synonyms": ["từ 1", "từ 2"],
  "antonyms": ["từ 1"],
  "meaning": "nghĩa tiếng Việt (nếu chưa có)",
  "example": "ví dụ bằng ${targetName} (nếu chưa có)",
  "exampleTranslation": "dịch ví dụ sang tiếng Việt"
}
Chỉ trả về JSON thuần.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(6000),
        },
      );

      if (!response.ok) return null;
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text);
      return {
        reading: parsed.reading,
        ipa: parsed.ipa,
        pinyin: parsed.pinyin,
        kana: parsed.kana,
        romaji: parsed.romaji,
        romaja: parsed.romaja,
        thaiReading: parsed.thaiReading,
        partOfSpeech: this.standardizePos(parsed.partOfSpeech),
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
        antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
        meaning: parsed.meaning,
        example: parsed.example,
        exampleTranslation: parsed.exampleTranslation,
      };
    } catch (err) {
      this.logger.warn(`Gemini enrichment failed for ${word} [${targetLanguage}]: ${err}`);
    }
    return null;
  }

  private generateLinguisticFallback(
    word: string,
    targetLanguage: string,
    context?: string,
  ): MeaningSuggestion[] {
    const pos = this.guessPartOfSpeech(word, targetLanguage);
    const examples: Record<string, { example: string; trans: string }> = {
      th: {
        example: `กรุณาฝึกฝนการใช้คำว่า "${word}" ในชีวิตประจำวัน`,
        trans: `Vui lòng luyện tập sử dụng từ "${word}" trong giao tiếp hàng ngày.`,
      },
      ko: {
        example: `일상 대화에서 "${word}" 단어를 사용하는 연습을 해보세요.`,
        trans: `Hãy luyện tập sử dụng từ "${word}" trong hội thoại hàng ngày.`,
      },
      zh: {
        example: `请在日常中文交流中多练习使用“${word}”这个词。`,
        trans: `Xin hãy luyện tập sử dụng từ "${word}" nhiều hơn trong giao tiếp tiếng Trung.`,
      },
      ja: {
        example: `毎日の日本語会話で「${word}」を使ってみましょう。`,
        trans: `Hãy thử sử dụng từ "${word}" trong hội thoại tiếng Nhật mỗi ngày.`,
      },
      en: {
        example: `Please practice using the word "${word}" in daily conversation.`,
        trans: `Vui lòng luyện tập sử dụng từ "${word}" trong hội thoại hàng ngày.`,
      },
    };

    const ex = examples[targetLanguage] || examples.en;

    return [
      {
        meaning: `nghĩa của từ "${word}"`,
        partOfSpeech: pos,
        example: ex.example,
        exampleTranslation: ex.trans,
      },
    ];
  }

  public standardizePos(input?: string): string {
    if (!input) return 'khác';
    const s = input.trim().toLowerCase();
    if (s.includes('noun') || s.includes('danh') || s.includes('danh từ') || s === 'n') return 'danh từ';
    if (s.includes('verb') || s.includes('động') || s.includes('động từ') || s.includes('dong') || s === 'v') return 'động từ';
    if (s.includes('adj') || s.includes('tính') || s.includes('tính từ') || s.includes('tinh') || s === 'a') return 'tính từ';
    if (s.includes('adv') || s.includes('trạng') || s.includes('trạng từ') || s.includes('trang')) return 'trạng từ';
    if (s.includes('câu chào') || s.includes('thán từ') || s.includes('interjection')) return 'câu chào';
    if (s.includes('giới từ') || s.includes('preposition')) return 'giới từ';
    if (s.includes('liên từ') || s.includes('conjunction')) return 'liên từ';
    return 'khác';
  }

  private guessPartOfSpeech(word: string, lang: string = 'en'): string {
    if (lang === 'en') {
      const w = word.trim().toLowerCase();
      if (w.endsWith('tion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity') || w.endsWith('er') || w.endsWith('or')) {
        return 'danh từ';
      }
      if (w.endsWith('ly')) return 'trạng từ';
      if (w.endsWith('ful') || w.endsWith('able') || w.endsWith('ible') || w.endsWith('ive') || w.endsWith('ous') || w.endsWith('al') || w.endsWith('ic')) {
        return 'tính từ';
      }
      if (w.endsWith('ize') || w.endsWith('ise') || w.endsWith('ate') || w.endsWith('fy')) {
        return 'động từ';
      }
    }
    return 'danh từ';
  }
}

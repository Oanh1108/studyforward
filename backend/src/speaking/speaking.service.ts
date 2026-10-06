import { Injectable, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeakingPrompt } from './speaking-prompt.entity.js';
import { SpeakingHistory } from './speaking-history.entity.js';
import { SpeakingSession } from './speaking-session.entity.js';
import { User } from '../users/user.entity.js';
import { UserActivityLog } from '../users/user-activity-log.entity.js';

const INITIAL_SPEAKING_PROMPTS: Partial<SpeakingPrompt>[] = [
  {
    id: 'sp-1',
    topic: 'Công việc hằng ngày',
    level: 'B1',
    language: 'en',
    sentence: 'Could you please send me the updated meeting minutes by this afternoon?',
    ipa: '/kʊd juː pliːz send miː ðiː ʌpˈdeɪtɪd ˈmiːtɪŋ ˈmɪnɪts baɪ ðɪs ˌɑːftəˈnuːn/',
    meaningVi: 'Bạn có thể gửi cho tôi biên bản họp mới cập nhật trước chiều nay được không?',
    hint: "Nhấn mạnh vào 'send', 'updated' và hạ giọng nhẹ ở cuối câu nhờ ngữ điệu câu hỏi lịch sự.",
    audioKey: 'meeting_minutes',
    orderIndex: 1,
  },
  {
    id: 'sp-2',
    topic: 'Đàm phán & Thảo luận',
    level: 'B1+',
    language: 'en',
    sentence: 'I completely agree with your proposal, but we need to consider the tight budget.',
    ipa: '/aɪ kəmˈpliːtli əˈɡriː wɪð jɔː prəˈpəʊzl, bʌt wiː niːd tuː kənˈsɪdə ðə taɪt ˈbʌdʒɪt/',
    meaningVi: 'Tôi hoàn toàn đồng ý với đề xuất của bạn, tuy nhiên chúng ta cần cân nhắc ngân sách eo hẹp.',
    hint: "Ngắt hơi tự nhiên sau dấu phẩy 'proposal', nhấn vào 'completely agree' và 'tight budget'.",
    audioKey: 'agree_proposal',
    orderIndex: 2,
  },
  {
    id: 'sp-3',
    topic: 'Chào hỏi đối tác',
    level: 'A2+',
    language: 'en',
    sentence: 'Thank you for taking the time to meet with us on such short notice.',
    ipa: '/θæŋk juː fɔː ˈteɪkɪŋ ðə taɪm tuː miːt wɪð ʌs ɒn sʌtʃ ʃɔːt ˈnəʊtɪs/',
    meaningVi: 'Cảm ơn bạn đã dành thời gian gặp chúng tôi dù nhận được lời mời gấp.',
    hint: "Luyện phát âm chuẩn âm /θ/ trong 'Thank' và nối âm 'taking the' mượt mà.",
    audioKey: 'short_notice',
    orderIndex: 3,
  },
  {
    id: 'sp-4',
    topic: 'Du lịch',
    level: 'A2',
    language: 'en',
    sentence: 'Excuse me, could you tell me how to get to the nearest train station?',
    ipa: '/ɪkˈskjuːz miː, kʊd juː tel miː haʊ tuː ɡet tuː ðə ˈnɪərɪst treɪn ˈsteɪʃn/',
    meaningVi: 'Xin lỗi, bạn có thể chỉ cho tôi đường đến ga tàu gần nhất được không?',
    hint: "Nhấn mạnh vào 'how to get' và 'nearest train station'. Lên giọng nhẹ ở cuối câu.",
    audioKey: 'train_station',
    orderIndex: 4,
  },
  {
    id: 'sp-5',
    topic: 'Mua sắm',
    level: 'A1',
    language: 'en',
    sentence: 'How much does this cost? Do you accept credit cards?',
    ipa: '/haʊ mʌtʃ dʌz ðɪs kɒst? duː juː əkˈsept ˈkredɪt kɑːdz/',
    meaningVi: 'Cái này giá bao nhiêu? Bạn có nhận thẻ tín dụng không?',
    hint: "Nhấn mạnh 'How much' và 'credit cards'. Câu thứ hai lên giọng nhẹ ở cuối.",
    audioKey: 'shopping_cost',
    orderIndex: 5,
  },
  {
    id: 'sp-6',
    topic: 'Nhà hàng',
    level: 'A2',
    language: 'en',
    sentence: 'I would like to book a table for two at 7 PM tonight.',
    ipa: '/aɪ wʊd laɪk tuː bʊk ə ˈteɪbl fɔː tuː æt ˈsevn piː em təˈnaɪt/',
    meaningVi: 'Tôi muốn đặt một bàn cho hai người vào lúc 7 giờ tối nay.',
    hint: "Nối âm 'book a' (/bʊk ə/). Nhấn vào 'table', 'two', và '7 PM'.",
    audioKey: 'restaurant_booking',
    orderIndex: 6,
  },
  {
    id: 'sp-7',
    topic: 'Phỏng vấn',
    level: 'B2',
    language: 'en',
    sentence: 'My greatest strength is my ability to solve problems quickly and effectively under pressure.',
    ipa: '/maɪ ˈɡreɪtɪst streŋθ ɪz maɪ əˈbɪləti tuː sɒlv ˈprɒbləmz ˈkwɪkli ænd ɪˈfektɪvli ˈʌndə ˈpreʃə/',
    meaningVi: 'Điểm mạnh lớn nhất của tôi là khả năng giải quyết vấn đề nhanh chóng và hiệu quả dưới áp lực.',
    hint: "Ngắt hơi sau 'strength' và 'effectively'. Nhấn vào các từ khóa 'solve problems', 'effectively', 'pressure'.",
    audioKey: 'interview_strength',
    orderIndex: 7,
  },
  // Korean
  {
    id: 'sp-ko-1',
    topic: 'Chào hỏi công sở',
    level: 'A1',
    language: 'ko',
    sentence: '안녕하세요, 오늘 회의 자료를 준비했습니다.',
    ipa: 'an-nyeong-ha-se-yo, o-neul hoe-ui ja-ryo-reul jun-bi-haess-seum-ni-da.',
    meaningVi: 'Xin chào, hôm nay tôi đã chuẩn bị tài liệu cuộc họp rồi ạ.',
    hint: 'Phát âm rõ ràng các âm tiết kết thúc đuôi kính ngữ -습니다.',
    audioKey: 'ko_meeting',
    orderIndex: 4,
  },
  // Japanese
  {
    id: 'sp-ja-1',
    topic: 'Chào hỏi thương mại',
    level: 'A2',
    language: 'ja',
    sentence: '本日はお忙しい中、お時間をいただきありがとうございます。',
    ipa: 'Honjitsu wa oisogashii naka, ojikan o itadaki arigatou gozaimasu.',
    meaningVi: 'Cảm ơn quý vị đã dành thời gian quý báu trong lúc bận rộn ngày hôm nay.',
    hint: 'Ngữ điệu lịch sự nhẹ nhàng, không nhấn gắt.',
    audioKey: 'ja_greeting',
    orderIndex: 5,
  },
  // Chinese
  {
    id: 'sp-zh-1',
    topic: 'Giao tiếp hàng ngày',
    level: 'A1',
    language: 'zh',
    sentence: '很高兴认识您，希望我们合作愉快。',
    ipa: 'Hěn gāoxìng rènshì nín, xīwàng wǒmen hézuò yúkuài.',
    meaningVi: 'Rất vui được gặp ngài, hy vọng chúng ta hợp tác vui vẻ.',
    hint: 'Chú ý thanh điệu tiếng Trung, thanh 3 và biến điệu thanh điệu.',
    audioKey: 'zh_greeting',
    orderIndex: 6,
  },
  // Thai
  {
    id: 'sp-th-1',
    topic: 'Chào hỏi căn bản',
    level: 'A1',
    language: 'th',
    sentence: 'สวัสดีครับ ยินดีที่ได้รู้จักครับ',
    ipa: 'Sà-wàt-dee kráp, yin-dee têe dâai róo-jàk kráp',
    meaningVi: 'Xin chào, rất vui được làm quen với bạn.',
    hint: 'Hạ giọng nhẹ ở cuối từ ครับ.',
    audioKey: 'th_greeting',
    orderIndex: 7,
  },
  // Giới thiệu bản thân B1
  {
    id: 'sp-8',
    topic: 'Giới thiệu bản thân',
    level: 'B1',
    language: 'en',
    sentence: 'Hi, I am currently working as a software developer and I have been in this field for three years.',
    ipa: '/haɪ, aɪ æm ˈkʌrəntli ˈwɜːkɪŋ æz ə ˈsɒftweə dɪˈveləpə ænd aɪ hæv biːn ɪn ðɪs fiːld fɔː θriː jɪəz/',
    meaningVi: 'Chào bạn, hiện tại tôi đang làm lập trình viên phần mềm và tôi đã làm trong lĩnh vực này được ba năm.',
    hint: 'Nhấn vào "software developer", "three years".',
    orderIndex: 8,
  },
  {
    id: 'sp-9',
    topic: 'Giới thiệu bản thân',
    level: 'B1',
    language: 'en',
    sentence: 'In my free time, I really enjoy reading books and exploring new technologies.',
    ipa: '/ɪn maɪ friː taɪm, aɪ ˈrɪəli ɪnˈdʒɔɪ ˈriːdɪŋ bʊks ænd ɪkˈsplɔːrɪŋ njuː tekˈnɒlədʒiz/',
    meaningVi: 'Vào thời gian rảnh, tôi rất thích đọc sách và khám phá các công nghệ mới.',
    hint: 'Nhấn vào "reading books", "new technologies".',
    orderIndex: 9,
  },
  {
    id: 'sp-10',
    topic: 'Giới thiệu bản thân',
    level: 'B1',
    language: 'en',
    sentence: 'I graduated with a degree in Computer Science and I am looking forward to expanding my skill set here.',
    ipa: '/aɪ ˈɡrædʒuˌeɪtɪd wɪð ə dɪˈɡriː ɪn kəmˈpjuːtə ˈsaɪəns ænd aɪ æm ˈlʊkɪŋ ˈfɔːwəd tuː ɪkˈspændɪŋ maɪ skɪl set hɪə/',
    meaningVi: 'Tôi đã tốt nghiệp chuyên ngành Khoa học Máy tính và tôi rất mong được mở rộng các kỹ năng của mình tại đây.',
    hint: 'Nhấn vào "Computer Science", "expanding".',
    orderIndex: 10,
  },
  {
    id: 'sp-11',
    topic: 'Giới thiệu bản thân',
    level: 'B1',
    language: 'en',
    sentence: 'One of my main strengths is my ability to adapt quickly to new environments and challenges.',
    ipa: '/wʌn ɒv maɪ meɪn streŋθs ɪz maɪ əˈbɪləti tuː əˈdæpt ˈkwɪkli tuː njuː ɪnˈvaɪrənmənts ænd ˈtʃælɪndʒɪz/',
    meaningVi: 'Một trong những thế mạnh chính của tôi là khả năng thích nghi nhanh với môi trường và thử thách mới.',
    hint: 'Nhấn vào "adapt quickly", "new environments".',
    orderIndex: 11,
  },
  {
    id: 'sp-12',
    topic: 'Giới thiệu bản thân',
    level: 'B1',
    language: 'en',
    sentence: 'I am highly motivated to contribute to this team and learn from all the experienced members.',
    ipa: '/aɪ æm ˈhaɪli ˈməʊtɪveɪtɪd tuː kənˈtrɪbjuːt tuː ðɪs tiːm ænd lɜːn frɒm ɔːl ði ɪkˈspɪəriənst ˈmembəz/',
    meaningVi: 'Tôi rất có động lực để đóng góp cho đội ngũ này và học hỏi từ tất cả các thành viên giàu kinh nghiệm.',
    hint: 'Nhấn vào "contribute", "experienced members".',
    orderIndex: 12,
  },
];

@Injectable()
export class SpeakingService implements OnModuleInit {
  constructor(
    @InjectRepository(SpeakingPrompt)
    private promptRepo: Repository<SpeakingPrompt>,
    @InjectRepository(SpeakingHistory)
    private historyRepo: Repository<SpeakingHistory>,
    @InjectRepository(SpeakingSession)
    private sessionRepo: Repository<SpeakingSession>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserActivityLog)
    private activityRepo: Repository<UserActivityLog>,
  ) {}

  async onModuleInit() {
    const count = await this.promptRepo.count();
    if (count === 0) {
      for (const p of INITIAL_SPEAKING_PROMPTS) {
        await this.promptRepo.save(this.promptRepo.create(p));
      }
    }
  }

  async getPrompts(language: string = 'en') {
    return this.promptRepo.find({
      where: [{ language }],
      order: { orderIndex: 'ASC' },
    });
  }

  async getTopics(language: string = 'en') {
    // Return topics grouped with sentence count and available levels
    const prompts = await this.promptRepo.find({ where: { language } });
    const topicsMap = new Map<string, { title: string; levels: Set<string>; count: number }>();
    
    // Default 12 topics
    const defaultTopics = [
      'Giới thiệu bản thân', 'Sinh hoạt', 'Gia đình', 'Công việc', 'Học tập',
      'Mua sắm', 'Nhà hàng', 'Du lịch', 'Giao thông', 'Sức khỏe', 'Sở thích', 'Công nghệ'
    ];

    for (const t of defaultTopics) {
      topicsMap.set(t, { title: t, levels: new Set(), count: 0 });
    }
    
    for (const p of prompts) {
      if (!topicsMap.has(p.topic)) {
        topicsMap.set(p.topic, { title: p.topic, levels: new Set(), count: 0 });
      }
      const topic = topicsMap.get(p.topic)!;
      topic.levels.add(p.level);
      topic.count += 1;
    }
    
    return Array.from(topicsMap.values()).map(t => ({
      title: t.title,
      levels: Array.from(t.levels).sort(),
      sentenceCount: t.count,
    }));
  }

  async getStats(language: string = 'en') {
    const defaultTopics = [
      'Giới thiệu bản thân', 'Sinh hoạt', 'Gia đình', 'Công việc', 'Học tập',
      'Mua sắm', 'Nhà hàng', 'Du lịch', 'Giao thông', 'Sức khỏe', 'Sở thích', 'Công nghệ'
    ];
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const stats: any[] = [];
    const missing: any[] = [];
    
    for (const topic of defaultTopics) {
      for (const level of levels) {
        const count = await this.promptRepo.count({ where: { language, topic, level } });
        stats.push({ topic, level, count });
        if (count < 20) {
          missing.push({ topic, level, missingCount: 20 - count });
        }
      }
    }
    return { stats, missing, totalMissing: missing.reduce((sum, item) => sum + item.missingCount, 0) };
  }

  async seedAiPrompts(topic: string, level: string, language: string = 'en') {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new BadRequestException("Chưa cấu hình GEMINI_API_KEY trong file .env");

    const count = await this.promptRepo.count({ where: { language, topic, level } });
    if (count >= 20) return { message: `Đã đủ 20 câu cho ${topic} - ${level}` };

    const needed = Math.min(10, 20 - count); // Fetch max 10 per request to avoid timeout
    
    const prompt = `Bạn là chuyên gia ngôn ngữ. Hãy tạo ${needed} câu tiếng Anh (trình độ ${level}) thuộc chủ đề "${topic}".
Yêu cầu:
- Câu đa dạng cấu trúc, từ vựng phù hợp trình độ ${level}. Không trùng lặp.
- Không lặp lại các mẫu câu quá cơ bản.
Trả về JSON Array đúng định dạng sau, không kèm markdown code block:
[
  {
    "sentence": "câu tiếng Anh",
    "meaningVi": "dịch nghĩa tiếng Việt chuẩn xác",
    "ipa": "phiên âm IPA",
    "hint": "Gợi ý cách phát âm (nhấn âm, nối âm) bằng tiếng Việt"
  }
]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
          }),
        }
      );

      if (!response.ok) {
        let errText = 'Lỗi kết nối đến API AI.';
        try {
          const errData = await response.json();
          errText = errData.error?.message || JSON.stringify(errData);
        } catch {
          errText = await response.text();
        }
        throw new BadRequestException(`Lỗi tạo câu: ${errText}`);
      }
      
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new BadRequestException('Dịch vụ AI không trả về dữ liệu.');

      let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      let added = 0;
      for (const item of parsed) {
        // Check duplicate
        const exists = await this.promptRepo.findOne({ where: { language, sentence: item.sentence } });
        if (!exists) {
          await this.promptRepo.save(this.promptRepo.create({
            id: 'sp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            topic,
            level,
            language,
            sentence: item.sentence,
            meaningVi: item.meaningVi,
            ipa: item.ipa,
            hint: item.hint,
            orderIndex: 999,
          }));
          added++;
        }
      }
      const newCount = await this.promptRepo.count({ where: { language, topic, level } });
      return { message: `Đã tạo thêm ${added} câu cho ${topic} - ${level}. Tổng hiện có: ${newCount}/20` };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`Lỗi tạo bằng AI: ${e.message}`);
    }
  }

  async createSession(userId: number, language: string, topic: string, level: string, mode: string, requestedCount: number) {
    const prompts = await this.promptRepo.find({ where: { language, topic, level } });
    // Randomize
    const shuffled = prompts.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, requestedCount);
    
    if (selected.length === 0) {
      throw new BadRequestException(`Không có câu nào cho chủ đề ${topic} ở trình độ ${level}.`);
    }

    const session = this.sessionRepo.create({
      userId,
      topic,
      level,
      mode,
      totalSentences: selected.length,
      currentIndex: 0,
      promptIds: selected.map(p => p.id),
      isCompleted: false,
    });
    
    return this.sessionRepo.save(session);
  }

  async getSession(userId: number, sessionId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new Error('Session not found');
    
    // Fetch prompts in the correct order
    const prompts = [];
    for (const pid of session.promptIds) {
      const p = await this.promptRepo.findOne({ where: { id: pid } });
      if (p) prompts.push(p);
    }
    
    return { session, prompts };
  }

  async getActiveSessions(userId: number) {
    return this.sessionRepo.find({
      where: { userId, isCompleted: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async updateSessionProgress(userId: number, sessionId: string, newIndex: number) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new Error('Session not found');
    
    session.currentIndex = newIndex;
    if (session.currentIndex >= session.totalSentences) {
      session.isCompleted = true;
    }
    return this.sessionRepo.save(session);
  }

  async getHistory(userId: number, language?: string) {
    const where: any = { userId };
    if (language) where.language = language;
    return this.historyRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async recordHistory(
    userId: number,
    dto: {
      sentence: string;
      score: number;
      fluency: number;
      pronunciation: number;
      feedback: string;
      language?: string;
      sessionId?: string;
      promptId?: string;
    },
  ) {
    const language = dto.language || 'en';
    const entry = await this.historyRepo.save(
      this.historyRepo.create({
        userId,
        language,
        sessionId: dto.sessionId || null,
        promptId: dto.promptId || null,
        sentence: dto.sentence,
        score: dto.score,
        fluency: dto.fluency,
        pronunciation: dto.pronunciation,
        feedback: dto.feedback,
      }),
    );

    // Award XP and log study time
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      const earnedXp = Math.round(dto.score / 10) + 5; // e.g. 90 -> 14 XP
      user.xpPoints = (user.xpPoints || 0) + earnedXp;
      user.todayMinutes = (user.todayMinutes || 0) + 3;
      user.totalHours = parseFloat(((user.totalHours || 0) + 3 / 60).toFixed(1));

      // Update streak
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (!user.lastActiveDate) {
        user.streakDays = 1;
      } else if (user.lastActiveDate === yesterday) {
        user.streakDays = (user.streakDays || 0) + 1;
      } else if (user.lastActiveDate !== todayStr) {
        user.streakDays = 1;
      }
      user.lastActiveDate = todayStr;

      await this.userRepo.save(user);

      // Activity log
      let activity = await this.activityRepo.findOne({
        where: { userId, date: todayStr },
      });
      if (!activity) {
        activity = this.activityRepo.create({
          userId,
          date: todayStr,
          minutes: 3,
          xpEarned: earnedXp,
          wordsLearned: 0,
        });
      } else {
        activity.minutes += 3;
        activity.xpEarned += earnedXp;
      }
      await this.activityRepo.save(activity);
    }

    return entry;
  }

  async evaluateTranscript(
    transcript: string,
    targetSentence: string,
    targetLanguage: string,
    meaningVi: string,
    mode: string // 'read' or 'translate'
  ) {
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      throw new Error('Dịch vụ AI chưa được cấu hình.');
    }

    try {
      const isReadMode = mode === 'read';
      const prompt = isReadMode 
        ? `Người dùng đang luyện đọc câu ngoại ngữ.
Câu gốc: "${targetSentence}"
Văn bản nhận diện được từ giọng nói (Transcript): "${transcript}"

Hãy đánh giá mức độ đọc khớp câu gốc.
Trả về JSON đúng định dạng:
{
  "score": Điểm tổng quan (0-100) đánh giá độ chính xác nội dung,
  "feedback": "Nhận xét tiếng Việt ngắn gọn về các từ đọc sai, đọc sót hoặc dư thừa. KHÔNG chấm ngữ pháp vì đây là bài đọc."
}`
        : `Người dùng đang luyện dịch nói từ tiếng Việt sang ngoại ngữ.
Câu tiếng Việt yêu cầu: "${meaningVi}"
Câu mẫu tham khảo: "${targetSentence}" (Lưu ý: Chấp nhận các cách dịch đồng nghĩa/tương đương hợp lệ, không bắt khớp y hệt câu mẫu)
Văn bản nhận diện được từ giọng nói (Transcript) của người dùng: "${transcript}"

Hãy đánh giá bản dịch của người dùng theo các tiêu chí:
1. Đúng ý (có truyền tải được thông điệp không)
2. Ngữ pháp (có đúng ngữ pháp không, ví dụ sai giới từ, chia động từ)
3. Từ vựng & độ tự nhiên (cách diễn đạt có phù hợp thực tế không)

Lưu ý: Không đánh giá điểm phát âm vì đầu vào chỉ là văn bản Transcript. Phân biệt rõ việc 'nội dung có thể hiểu được' và 'cách diễn đạt đúng chuẩn'.
Trả về JSON đúng định dạng:
{
  "score": Điểm tổng quan (0-100) đánh giá độ chính xác và tự nhiên,
  "feedback": "Nhận xét tiếng Việt thật cụ thể. Chỉ ra lỗi sai (nếu có), giải thích tại sao sai (ví dụ 'with' không phù hợp trong cấu trúc gọi tên), gợi ý cách sửa. Dùng in đậm (*) cho các từ cần nhấn mạnh."
}`;

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
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Lỗi kết nối đến dịch vụ AI đánh giá.');
      }
      
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new BadRequestException('Dịch vụ AI không trả về kết quả hợp lệ.');
      }
      
      let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        score: parsed.score || 0,
        fluency: null,
        pronunciation: null,
        feedback: parsed.feedback || "Không có nhận xét chi tiết."
      };
    } catch (err: any) {
      console.error("AI Evaluation failed:", err);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Quá trình đánh giá bị lỗi, vui lòng thử lại: ' + (err.message || 'Lỗi không xác định'));
    }
  }
}

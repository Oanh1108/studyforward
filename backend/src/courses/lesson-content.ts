export interface KeyTerm {
  term: string;
  ipa?: string;
  meaning: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** What a learner actually studies in a lesson; the title and subtitle only describe it. */
export interface LessonContent {
  /** The sentence practised in the listen / speak / dictation steps. */
  sentence: { text: string; meaning: string };
  keyTerms: KeyTerm[];
  quiz: QuizQuestion[];
}

/** Content for the seeded lessons, keyed by lesson id. Applied to lessons that have none yet. */
export const DEFAULT_LESSON_CONTENT: Record<string, LessonContent> = {
  'les-1': {
    sentence: {
      text: "Hi, I'm Anna, a marketing manager with five years of experience in digital campaigns.",
      meaning: 'Xin chào, tôi là Anna, quản lý marketing với năm năm kinh nghiệm về các chiến dịch kỹ thuật số.',
    },
    keyTerms: [
      { term: 'elevator pitch', ipa: '/ˈel.ɪ.veɪ.tər pɪtʃ/', meaning: 'Bài giới thiệu rất ngắn (khoảng 30 giây) về bản thân hoặc ý tưởng.' },
      { term: 'background', ipa: '/ˈbæk.ɡraʊnd/', meaning: 'Nền tảng, kinh nghiệm và học vấn của một người.' },
      { term: 'I specialize in…', meaning: 'Tôi chuyên về… (dùng để nói lĩnh vực mạnh nhất của bạn).' },
    ],
    quiz: [
      {
        question: 'Which opening works best for a 30-second elevator pitch?',
        options: [
          'My name is Anna. I have many hobbies and I like many things.',
          "Hi, I'm Anna. I help companies grow online through data-driven marketing.",
          "Um, I don't really know what to say about myself.",
        ],
        correctIndex: 1,
        explanation: 'Câu B nêu rõ tên, vai trò và giá trị bạn mang lại chỉ trong một câu, đúng tinh thần của elevator pitch.',
      },
      {
        question: 'How should you end an elevator pitch?',
        options: [
          'With a long list of your weaknesses.',
          'With an apology for taking their time.',
          'With a clear next step, such as offering to connect.',
        ],
        correctIndex: 2,
        explanation: 'Kết bằng một bước tiếp theo cụ thể (ví dụ xin kết nối) giúp người nghe biết họ nên làm gì.',
      },
    ],
  },

  'les-2': {
    sentence: {
      text: 'Thank you for your email; I will send you the updated report by Friday.',
      meaning: 'Cảm ơn email của bạn; tôi sẽ gửi báo cáo cập nhật cho bạn trước thứ Sáu.',
    },
    keyTerms: [
      { term: 'attached', ipa: '/əˈtætʃt/', meaning: 'Đính kèm (I have attached the file: tôi đã đính kèm tệp).' },
      { term: 'follow up', meaning: 'Nhắn lại để nhắc hoặc theo dõi một việc đã trao đổi.' },
      { term: 'Best regards,', meaning: 'Trân trọng, (cách kết thư lịch sự, phổ biến trong công việc).' },
    ],
    quiz: [
      {
        question: 'Which subject line is the clearest?',
        options: ['Hi', 'Question', 'Budget approval needed by Friday – Q3 campaign'],
        correctIndex: 2,
        explanation: 'Tiêu đề tốt nêu rõ nội dung và thời hạn để người nhận biết ngay việc cần làm.',
      },
      {
        question: 'Which closing is the most appropriate for a business email?',
        options: ['See ya!', 'Best regards,', 'Whatever, bye.'],
        correctIndex: 1,
        explanation: '"Best regards," lịch sự và trung tính, phù hợp hầu hết email công việc.',
      },
    ],
  },

  'les-3': {
    sentence: {
      text: 'I understand your concerns; could we meet in the middle?',
      meaning: 'Tôi hiểu mối lo của bạn; liệu chúng ta có thể thỏa hiệp ở mức giữa không?',
    },
    keyTerms: [
      { term: 'compromise', ipa: '/ˈkɒm.prə.maɪz/', meaning: 'Thỏa hiệp: mỗi bên nhượng bộ một chút để đạt thỏa thuận.' },
      { term: 'meet in the middle', meaning: 'Gặp nhau ở giữa, cùng nhượng bộ để tìm điểm chung.' },
      { term: 'terms', ipa: '/tɜːmz/', meaning: 'Điều khoản, điều kiện của một thỏa thuận.' },
    ],
    quiz: [
      {
        question: 'A client asks for a 20% discount. You can only give 10%. What is the best reply?',
        options: [
          "No. That's impossible.",
          'Fine, you can have whatever you want.',
          'I can offer 10% if we sign a longer contract. Would that work?',
        ],
        correctIndex: 2,
        explanation: 'Câu C không từ chối thẳng, đưa ra đề nghị cụ thể và hỏi ý đối tác, đúng tinh thần thương lượng.',
      },
      {
        question: 'What does "meet in the middle" mean?',
        options: [
          'Each side gives up a little to reach an agreement.',
          'One side gets everything it asked for.',
          'Stop the meeting halfway.',
        ],
        correctIndex: 0,
        explanation: '"Meet in the middle" là cùng nhượng bộ một phần để đạt được thỏa thuận chung.',
      },
    ],
  },

  'les-4': {
    sentence: {
      text: 'If I had known about the delay, I would have called the client.',
      meaning: 'Nếu tôi biết về sự chậm trễ, tôi đã gọi cho khách hàng rồi.',
    },
    keyTerms: [
      { term: 'second conditional', meaning: 'Điều kiện loại 2: giả định không có thật ở hiện tại. If + quá khứ đơn, would + V.' },
      { term: 'third conditional', meaning: 'Điều kiện loại 3: giả định trái với quá khứ. If + had + V3, would have + V3.' },
      { term: 'mixed conditional', meaning: 'Điều kiện hỗn hợp: điều kiện ở quá khứ nhưng kết quả ở hiện tại (hoặc ngược lại).' },
    ],
    quiz: [
      {
        question: 'If I ___ more time, I would learn another language.',
        options: ['have', 'had', 'would have'],
        correctIndex: 1,
        explanation: 'Điều kiện loại 2 dùng quá khứ đơn ở mệnh đề If: "If I had more time…".',
      },
      {
        question: 'If she ___ the email earlier, she would have avoided the mistake.',
        options: ['read', 'would read', 'had read'],
        correctIndex: 2,
        explanation: 'Điều kiện loại 3 dùng quá khứ hoàn thành ở mệnh đề If: "If she had read…".',
      },
      {
        question: 'Which sentence is a second conditional?',
        options: [
          'If it rains, we will stay at home.',
          'If I were the manager, I would change the schedule.',
          'If we had left earlier, we would have arrived on time.',
        ],
        correctIndex: 1,
        explanation: 'Câu B giả định không có thật ở hiện tại (I were the manager… I would change…).',
      },
    ],
  },

  'les-5': {
    sentence: {
      text: 'We need to launch a campaign that will boost brand awareness and close more deals.',
      meaning: 'Chúng ta cần triển khai một chiến dịch giúp tăng độ nhận diện thương hiệu và chốt được nhiều thương vụ hơn.',
    },
    keyTerms: [
      { term: 'boost brand awareness', meaning: 'Tăng độ nhận diện thương hiệu.' },
      { term: 'close a deal', meaning: 'Chốt một thương vụ, ký được hợp đồng.' },
      { term: 'target audience', ipa: '/ˈtɑː.ɡɪt ˈɔː.di.əns/', meaning: 'Đối tượng khách hàng mục tiêu.' },
      { term: 'market share', meaning: 'Thị phần.' },
    ],
    quiz: [
      {
        question: 'Our goal is to increase our ___ in the Asian market.',
        options: ['share market', 'market share', 'market sharing'],
        correctIndex: 1,
        explanation: '"Market share" (thị phần) là cụm cố định, không đảo thứ tự.',
      },
      {
        question: 'She finally ___ the deal after three meetings.',
        options: ['made', 'did', 'closed'],
        correctIndex: 2,
        explanation: 'Collocation đúng là "close a deal" (chốt thương vụ).',
      },
    ],
  },

  'les-6': {
    sentence: {
      text: "I'm sorry for the inconvenience; let me see how I can fix this for you right away.",
      meaning: 'Tôi xin lỗi vì sự bất tiện; để tôi xem cách xử lý việc này cho bạn ngay.',
    },
    keyTerms: [
      { term: 'inconvenience', ipa: '/ˌɪn.kənˈviː.ni.əns/', meaning: 'Sự bất tiện, phiền toái.' },
      { term: 'resolve', ipa: '/rɪˈzɒlv/', meaning: 'Giải quyết (một vấn đề, khiếu nại).' },
      { term: "I'll take care of this.", meaning: 'Tôi sẽ lo việc này (cho thấy bạn chủ động xử lý).' },
    ],
    quiz: [
      {
        question: 'A customer is angry about a late delivery. What is the best first response?',
        options: [
          "It's not our fault.",
          'Please calm down.',
          "I'm very sorry about the delay. Let me check your order right now.",
        ],
        correctIndex: 2,
        explanation: 'Xin lỗi và cam kết hành động ngay giúp hạ nhiệt khách hàng; tránh đổ lỗi hoặc bảo họ bình tĩnh.',
      },
      {
        question: 'Which phrase shows that you will take action?',
        options: [
          "That's not my department.",
          "I'll take care of this personally.",
          'You should call back later.',
        ],
        correctIndex: 1,
        explanation: '"I\'ll take care of this personally" thể hiện bạn chịu trách nhiệm xử lý.',
      },
    ],
  },

  'les-a1-1': {
    sentence: {
      text: 'Hello, my name is Linh. Nice to meet you.',
      meaning: 'Xin chào, tên tôi là Linh. Rất vui được gặp bạn.',
    },
    keyTerms: [
      { term: 'Nice to meet you.', meaning: 'Rất vui được gặp bạn.' },
      { term: 'How are you?', meaning: 'Bạn khỏe không? (câu hỏi thăm thông dụng).' },
      { term: 'See you later.', meaning: 'Hẹn gặp lại.' },
    ],
    quiz: [
      {
        question: 'Someone asks, "How are you?" What is the best answer?',
        options: ['My name is fine.', "I'm fine, thank you. And you?", 'Yes, I am.'],
        correctIndex: 1,
        explanation: 'Trả lời ngắn gọn, cảm ơn và hỏi lại là cách tự nhiên nhất.',
      },
      {
        question: 'Which greeting is suitable in the morning?',
        options: ['Good morning.', 'Good night.', 'Good evening.'],
        correctIndex: 0,
        explanation: '"Good morning" dùng để chào vào buổi sáng.',
      },
    ],
  },

  'les-a2-1': {
    sentence: {
      text: 'I usually start work at nine and have lunch with my colleagues at noon.',
      meaning: 'Tôi thường bắt đầu làm việc lúc chín giờ và ăn trưa cùng đồng nghiệp lúc mười hai giờ.',
    },
    keyTerms: [
      { term: 'colleague', ipa: '/ˈkɒl.iːɡ/', meaning: 'Đồng nghiệp.' },
      { term: 'commute', ipa: '/kəˈmjuːt/', meaning: 'Quãng đường đi lại giữa nhà và nơi làm việc; hoặc việc đi làm hằng ngày.' },
      { term: 'usually', ipa: '/ˈjuː.ʒu.ə.li/', meaning: 'Thường xuyên (trạng từ chỉ tần suất).' },
    ],
    quiz: [
      {
        question: 'She ___ to work by bus every day.',
        options: ['go', 'going', 'goes'],
        correctIndex: 2,
        explanation: 'Chủ ngữ ngôi thứ ba số ít (she) ở thì hiện tại đơn dùng "goes".',
      },
      {
        question: 'Which word means the trip between home and work?',
        options: ['commute', 'schedule', 'deadline'],
        correctIndex: 0,
        explanation: '"Commute" là quãng đường đi lại giữa nhà và nơi làm việc.',
      },
    ],
  },

  'les-biz-1': {
    sentence: {
      text: 'Today I will walk you through our three strategic priorities for the next quarter.',
      meaning: 'Hôm nay tôi sẽ trình bày cho các bạn ba ưu tiên chiến lược của chúng ta trong quý tới.',
    },
    keyTerms: [
      { term: 'walk you through', meaning: 'Trình bày, hướng dẫn từng bước cho ai.' },
      { term: 'strategic priority', meaning: 'Ưu tiên chiến lược.' },
      { term: 'key takeaway', meaning: 'Ý chính người nghe cần nhớ sau buổi trình bày.' },
    ],
    quiz: [
      {
        question: 'What is the best way to open an executive presentation?',
        options: [
          'Apologize for being unprepared.',
          'State the objective and the decision you need.',
          'Read every slide word for word.',
        ],
        correctIndex: 1,
        explanation: 'Lãnh đạo cần biết ngay mục tiêu và quyết định cần họ đưa ra.',
      },
      {
        question: 'What is a "key takeaway"?',
        options: [
          'The main point you want the audience to remember.',
          'A snack served during the meeting.',
          'A technical error on a slide.',
        ],
        correctIndex: 0,
        explanation: '"Key takeaway" là ý chính bạn muốn khán giả mang về sau buổi trình bày.',
      },
    ],
  },
};

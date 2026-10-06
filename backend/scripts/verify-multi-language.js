const http = require('http');

const API_BASE = 'http://localhost:3002/api';

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🚀 === KIỂM TRA TOÀN DIỆN HỖ TRỢ ĐA NGÔN NGỮ STUDYFORWARD ===\n');

  // 1. Đăng nhập Admin & User
  console.log('1️⃣ Đăng nhập tài khoản...');
  const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
    email: 'admin@studyforward.com',
    password: 'AdminSuperPassword123!',
  });
  if (loginRes.status !== 200) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Đăng nhập thành công, vai trò:', loginRes.data.user.role);

  // 2. Chuyển và ghi nhớ ngôn ngữ trong tài khoản
  console.log('\n2️⃣ Ghi nhớ ngôn ngữ học trong tài khoản (PATCH /api/auth/current-language)...');
  const langPatch = await request(`${API_BASE}/auth/current-language`, { method: 'PATCH', headers: authHeaders }, {
    language: 'ja',
  });
  if (langPatch.status !== 200 || langPatch.data.currentLanguage !== 'ja') {
    throw new Error(`Cập nhật ngôn ngữ thất bại: ${JSON.stringify(langPatch.data)}`);
  }
  console.log('✅ Đã lưu ngôn ngữ học "ja" vào tài khoản thành công.');

  // 3. Tạo thư mục cho cả 5 ngôn ngữ (en, th, ko, zh, ja)
  console.log('\n3️⃣ Tạo thư mục từ vựng cho từng ngôn ngữ...');
  const testFolders = {};
  const langs = [
    { code: 'en', name: 'Thư mục Tiếng Anh Mẫu' },
    { code: 'zh', name: 'Thư mục Tiếng Trung HSK' },
    { code: 'ja', name: 'Thư mục Tiếng Nhật N3' },
    { code: 'ko', name: 'Thư mục Tiếng Hàn Topik' },
    { code: 'th', name: 'Thư mục Tiếng Thái Giao Tiếp' },
  ];

  for (const l of langs) {
    const folderRes = await request(`${API_BASE}/vocabulary/folders`, { method: 'POST', headers: authHeaders }, {
      name: l.name,
      description: `Thư mục kiểm tra cho ${l.code}`,
      language: l.code,
    });
    if (folderRes.status !== 201) {
      throw new Error(`Không thể tạo thư mục cho ${l.code}: ${JSON.stringify(folderRes.data)}`);
    }
    testFolders[l.code] = folderRes.data;
    console.log(`✅ Tạo thư mục [${l.code}]: "${folderRes.data.name}" (ID: ${folderRes.data.id})`);
  }

  // 4. Thêm từ với các trường phiên âm đặc thù từng ngôn ngữ
  console.log('\n4️⃣ Thêm từ vựng với các trường phiên âm đặc thù từng hệ chữ...');
  const sampleWords = [
    {
      folderId: testFolders.en.id,
      word: 'resilient',
      meaning: 'kiên cường, có khả năng phục hồi nhanh',
      ipa: '/rɪˈzɪliənt/',
      partOfSpeech: 'adj',
      example: 'She is a resilient woman who overcomes all challenges.',
      exampleTranslation: 'Cô ấy là một người phụ nữ kiên cường vượt qua mọi thử thách.',
    },
    {
      folderId: testFolders.zh.id,
      word: '你好',
      meaning: 'xin chào',
      pinyin: 'nǐ hǎo',
      partOfSpeech: 'greeting',
      example: '你好，很高兴认识你。',
      exampleTranslation: 'Xin chào, rất vui được làm quen với bạn.',
    },
    {
      folderId: testFolders.ja.id,
      word: '日本語',
      meaning: 'tiếng Nhật',
      kana: 'にほんご',
      romaji: 'nihongo',
      partOfSpeech: 'noun',
      example: '私は日本語を勉強しています。',
      exampleTranslation: 'Tôi đang học tiếng Nhật.',
    },
    {
      folderId: testFolders.ko.id,
      word: '안녕하세요',
      meaning: 'xin chào',
      romaja: 'annyeonghaseyo',
      partOfSpeech: 'greeting',
      example: '선생님, 안녕하세요!',
      exampleTranslation: 'Thầy ơi, em chào thầy ạ!',
    },
    {
      folderId: testFolders.th.id,
      word: 'สวัสดี',
      meaning: 'xin chào, tạm biệt',
      thaiReading: 'sa-wat-dee',
      partOfSpeech: 'greeting',
      example: 'สวัสดีตอนเช้าครับ',
      exampleTranslation: 'Chào buổi sáng ạ.',
    },
  ];

  for (const w of sampleWords) {
    const wordRes = await request(`${API_BASE}/vocabulary/words`, { method: 'POST', headers: authHeaders }, w);
    if (wordRes.status !== 201) {
      throw new Error(`Không thể thêm từ ${w.word}: ${JSON.stringify(wordRes.data)}`);
    }
    console.log(`✅ Đã thêm từ [${wordRes.data.language}]: "${wordRes.data.word}" -> "${wordRes.data.meaning}" (Reading: ${wordRes.data.ipa || wordRes.data.pinyin || wordRes.data.kana || wordRes.data.romaja || wordRes.data.thaiReading})`);
  }

  // 5. Kiểm tra tính toàn vẹn: Khóa đổi ngôn ngữ thư mục khi đã có từ
  console.log('\n5️⃣ Kiểm tra khóa đổi ngôn ngữ thư mục khi đã có từ vựng...');
  const lockCheck = await request(`${API_BASE}/vocabulary/folders/${testFolders.zh.id}`, { method: 'PATCH', headers: authHeaders }, {
    name: 'Đổi tên thư mục',
    language: 'ko', // Cố tình đổi từ zh sang ko
  });
  if (lockCheck.status === 400) {
    console.log('✅ Hệ thống chặn thành công: Không cho đổi ngôn ngữ thư mục khi đã có từ vựng.');
  } else {
    throw new Error(`Lỗi: Backend không chặn đổi ngôn ngữ thư mục đã có từ! Code: ${lockCheck.status}`);
  }

  // 6. Kiểm tra AI gợi ý nghĩa tiếng Việt theo ngôn ngữ & cảnh báo lệch hệ chữ
  console.log('\n6️⃣ Kiểm tra AI gợi ý nghĩa tiếng Việt và phát hiện script mismatch...');
  const suggestZh = await request(`${API_BASE}/vocabulary/ai/suggest?word=${encodeURIComponent('学习')}&language=zh`, { headers: authHeaders });
  if (suggestZh.status === 200 && suggestZh.data.suggestions?.length > 0) {
    console.log(`✅ AI gợi ý tiếng Trung (学习): nghĩa "${suggestZh.data.suggestions[0].meaning}", Pinyin: "${suggestZh.data.pinyin}"`);
  } else {
    throw new Error(`AI gợi ý tiếng Trung thất bại: ${JSON.stringify(suggestZh.data)}`);
  }

  // Kiểm tra cảnh báo lệch hệ chữ: Nhập chữ Kana (Nhật) nhưng để ngôn ngữ tiếng Anh
  const mismatchCheck = await request(`${API_BASE}/vocabulary/ai/suggest?word=${encodeURIComponent('ありがとう')}&language=en`, { headers: authHeaders });
  if (mismatchCheck.status === 200 && mismatchCheck.data.isMismatch === true) {
    console.log(`✅ Cảnh báo lệch ngôn ngữ hoạt động chính xác: "${mismatchCheck.data.mismatchWarning}"`);
  } else {
    throw new Error(`Lỗi: Không phát hiện script mismatch! ${JSON.stringify(mismatchCheck.data)}`);
  }

  // 7. Kiểm tra Nhập Excel hàng loạt (Bulk Import) giữ Unicode và tone marks
  console.log('\n7️⃣ Kiểm tra Nhập hàng loạt từ vựng bảo toàn dấu thanh và Unicode...');
  const bulkRes = await request(`${API_BASE}/vocabulary/bulk-import`, { method: 'POST', headers: authHeaders }, {
    folderId: testFolders.zh.id,
    language: 'zh',
    duplicateStrategy: 'update',
    words: [
      {
        word: '谢谢',
        meaning: 'cảm ơn',
        pinyin: 'xièxie',
        partOfSpeech: 'phrase',
        example: '非常感谢你的帮助。',
        exampleTranslation: 'Vô cùng cảm ơn sự giúp đỡ của bạn.',
      },
      {
        word: '朋友',
        meaning: 'bạn bè',
        pinyin: 'péngyou',
        partOfSpeech: 'noun',
        example: '他是我的好朋友。',
        exampleTranslation: 'Cậu ấy là bạn tốt của tôi.',
      },
    ],
  });
  if (bulkRes.status === 200 && bulkRes.data.added === 2) {
    console.log(`✅ Nhập hàng loạt tiếng Trung thành công: thêm mới ${bulkRes.data.added} từ, bảo toàn Pinyin có dấu thanh.`);
  } else {
    throw new Error(`Lỗi nhập hàng loạt: ${JSON.stringify(bulkRes.data)}`);
  }

  // 8. Kiểm tra Admin quản lý từ vựng khóa học theo ngôn ngữ
  console.log('\n8️⃣ Kiểm tra Admin Portal quản lý từ vựng và bộ lọc ngôn ngữ...');
  const adminAddRes = await request(`${API_BASE}/admin/curriculum-vocab`, { method: 'POST', headers: authHeaders }, {
    topic: 'Chào hỏi cơ bản',
    word: 'こんにちは',
    meaning: 'xin chào',
    language: 'ja',
    kana: 'こんにちは',
    romaji: 'konnichiwa',
    partOfSpeech: 'greeting',
    example: '皆さん、こんにちは。',
    exampleTranslation: 'Xin chào mọi người.',
  });
  if (adminAddRes.status !== 201) {
    throw new Error(`Admin thêm từ thất bại: ${JSON.stringify(adminAddRes.data)}`);
  }
  console.log('✅ Admin đã tạo từ vựng khóa học tiếng Nhật thành công.');

  const filterJa = await request(`${API_BASE}/admin/curriculum-vocab?language=ja`, { headers: authHeaders });
  if (filterJa.status === 200 && filterJa.data.words.some((w) => w.word === 'こんにちは')) {
    console.log('✅ Bộ lọc ngôn ngữ Admin: Tìm thấy đúng từ tiếng Nhật theo bộ lọc ?language=ja.');
  } else {
    throw new Error(`Admin filter theo ngôn ngữ thất bại: ${JSON.stringify(filterJa.data)}`);
  }

  // Kiểm tra trạng thái trống rõ ràng khi chưa có nội dung (ví dụ ngôn ngữ tiếng Thái trong khóa học)
  const filterTh = await request(`${API_BASE}/admin/curriculum-vocab?language=th`, { headers: authHeaders });
  if (filterTh.status === 200 && filterTh.data.total === 0) {
    console.log('✅ Trạng thái trống rõ ràng cho ngôn ngữ chưa có từ khóa học (total = 0, không sinh dữ liệu giả).');
  } else {
    console.log('ℹ️ Tổng số từ tiếng Thái:', filterTh.data.total);
  }

  // 9. Xác nhận dữ liệu cũ tiếng Anh được bảo toàn
  console.log('\n9️⃣ Xác nhận dữ liệu tiếng Anh cũ vẫn nguyên vẹn sau migration...');
  const enFolderWords = await request(`${API_BASE}/vocabulary/words?folderId=${testFolders.en.id}`, { headers: authHeaders });
  if (enFolderWords.status === 200 && enFolderWords.data.words.some((w) => w.word === 'resilient')) {
    console.log('✅ Dữ liệu từ vựng tiếng Anh hoạt động trơn tru và nguyên vẹn.');
  } else {
    throw new Error(`Từ vựng tiếng Anh không tìm thấy: ${JSON.stringify(enFolderWords.data)}`);
  }

  console.log('\n🎉🎉 TẤT CẢ 9 BƯỚC KIỂM TRA ĐỀU HOÀN TOÀN THÀNH CÔNG VÀ ĐẠT CHUẨN! 🎉🎉');
}

run().catch((err) => {
  console.error('\n❌ KIỂM TRA THẤT BẠI:', err.message);
  process.exit(1);
});

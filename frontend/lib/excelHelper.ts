import * as XLSX from 'xlsx';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from './languages';
import { parseWordCellContent, normalizePartOfSpeech } from './wordParser';

export interface ColumnMapping {
  word: number; // Column index (0-based)
  meaning: number;
  partOfSpeech: number;
  reading: number;
  ipa: number;
  pinyin: number;
  kana: number;
  romaji: number;
  romaja: number;
  thaiReading: number;
  example: number;
  exampleTranslation: number;
  synonyms: number;
  antonyms: number;
  folder: number;
  notes: number;
}

export interface ParsedExcelRow {
  rowNumber: number;
  word: string;
  rawWordOriginal?: string;
  meaning: string;
  partOfSpeech: string;
  reading?: string;
  ipa?: string;
  pinyin?: string;
  kana?: string;
  romaji?: string;
  romaja?: string;
  thaiReading?: string;
  example: string;
  exampleTranslation?: string;
  synonyms: string[];
  antonyms: string[];
  folderName?: string;
  notes: string;
  isValid: boolean;
  validationError?: string;
  needsReview?: boolean;
  reviewReason?: string;
  isSeparatedFromCell?: boolean;
  // AI-enriched flags for visual tags
  isPosEnriched?: boolean;
  isSynonymsEnriched?: boolean;
  isAntonymsEnriched?: boolean;
  isMeaningEnriched?: boolean;
  isIpaEnriched?: boolean;
  isReadingEnriched?: boolean;
  isExampleEnriched?: boolean;
}


export interface ExcelWorkbookData {
  sheetNames: string[];
  sheets: Record<string, string[][]>;
}

/**
 * Reads an Excel file (.xlsx, .xls) and returns sheets with 2D array of string values
 */
export async function readExcelFile(file: File): Promise<ExcelWorkbookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        // Sử dụng Uint8Array / binary mode để giữ nguyên UTF-8 Unicode và các dấu thanh
        const data = new Uint8Array(buffer as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetNames = workbook.SheetNames;
        const sheets: Record<string, string[][]> = {};

        for (const name of sheetNames) {
          const sheet = workbook.Sheets[name];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          // Giữ nguyên toàn vẹn chuỗi Unicode (Thái, CJK, Hangul, dấu thanh Pinyin)
          const cleanRows: string[][] = rawRows.map((row) =>
            row.map((cell) => {
              if (cell === null || cell === undefined) return '';
              return String(cell).trim();
            }),
          );

          sheets[name] = cleanRows;
        }

        resolve({ sheetNames, sheets });
      } catch (err) {
        reject(new Error('Không thể đọc file Excel. Vui lòng đảm bảo định dạng file là .xlsx hoặc .xls hợp lệ.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Đã xảy ra lỗi khi đọc file từ thiết bị.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Standardize POS using canonical normalization
 */
export function standardizePartOfSpeech(val?: string): string {
  if (!val) return 'khác';
  const norm = normalizePartOfSpeech(val);
  if (norm) return norm;
  const s = val.trim().toLowerCase();
  if (s.includes('lượng từ') || s.includes('classifier') || s === 'cl') return 'classifier';
  if (s.includes('trợ từ') || s.includes('particle')) return 'particle';
  return 'khác';
}

/**
 * Parse comma, semicolon, newline delimited string into array of trimmed strings
 */
export function parseDelimitedList(val?: string | string[]): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter(Boolean);
  }
  return String(val)
    .split(/[,;\n\r，、]+/) // hỗ trợ cả dấu phẩy tiếng Trung/Nhật (，、)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize header text for comparison
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically detect column mapping based on headers for any supported language
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    word: -1,
    meaning: -1,
    partOfSpeech: -1,
    reading: -1,
    ipa: -1,
    pinyin: -1,
    kana: -1,
    romaji: -1,
    romaja: -1,
    thaiReading: -1,
    example: -1,
    exampleTranslation: -1,
    synonyms: -1,
    antonyms: -1,
    folder: -1,
    notes: -1,
  };

  headers.forEach((h, index) => {
    const norm = normalizeHeader(h);
    if (!norm) return;

    // Word detection
    if (
      mapping.word === -1 &&
      ['word', 'vocabulary', 'vocab', 'term', 'tuvung', 'tu', 'english', 'chu', 'hanzi', 'kanji', 'hangul'].some(
        (k) => norm.includes(k)
      )
    ) {
      mapping.word = index;
    }
    // Meaning detection
    else if (
      mapping.meaning === -1 &&
      ['meaning', 'translation', 'nghia', 'nghiatiengviet', 'dich', 'dichnghia', 'giainghia'].some((k) => norm.includes(k))
    ) {
      mapping.meaning = index;
    }
    // POS detection
    else if (
      mapping.partOfSpeech === -1 &&
      ['partofspeech', 'pos', 'wordtype', 'tuloai', 'loaitu', 'type'].some((k) => norm.includes(k))
    ) {
      mapping.partOfSpeech = index;
    }
    // Specific reading columns
    else if (mapping.pinyin === -1 && ['pinyin', 'binham'].some((k) => norm.includes(k))) {
      mapping.pinyin = index;
    } else if (mapping.kana === -1 && ['kana', 'furigana', 'hiragana', 'katakana'].some((k) => norm.includes(k))) {
      mapping.kana = index;
    } else if (mapping.romaji === -1 && ['romaji'].some((k) => norm.includes(k))) {
      mapping.romaji = index;
    } else if (mapping.romaja === -1 && ['romaja'].some((k) => norm.includes(k))) {
      mapping.romaja = index;
    } else if (
      mapping.thaiReading === -1 &&
      ['thaireading', 'cachdocthai', 'phienamthai', 'phienamtiengthai'].some((k) => norm.includes(k))
    ) {
      mapping.thaiReading = index;
    } else if (mapping.ipa === -1 && ['ipa', 'phienamipa'].some((k) => norm.includes(k))) {
      mapping.ipa = index;
    }
    // General reading
    else if (
      mapping.reading === -1 &&
      ['reading', 'pronunciation', 'cachdoc', 'phatam', 'phienam'].some((k) => norm.includes(k))
    ) {
      mapping.reading = index;
    }
    // Example translation
    else if (
      mapping.exampleTranslation === -1 &&
      ['exampletranslation', 'dichvidu', 'nghiavidu', 'translationexample', 'banhang'].some((k) => norm.includes(k))
    ) {
      mapping.exampleTranslation = index;
    }
    // Example
    else if (
      mapping.example === -1 &&
      ['example', 'sentence', 'vidu', 'cauvidu', 'ex'].some((k) => norm.includes(k))
    ) {
      mapping.example = index;
    }
    // Synonyms
    else if (
      mapping.synonyms === -1 &&
      ['synonyms', 'synonym', 'dongnghia', 'tudongnghia'].some((k) => norm.includes(k))
    ) {
      mapping.synonyms = index;
    }
    // Antonyms
    else if (
      mapping.antonyms === -1 &&
      ['antonyms', 'antonym', 'trainghia', 'tutrainghia'].some((k) => norm.includes(k))
    ) {
      mapping.antonyms = index;
    }
    // Folder detection
    else if (
      mapping.folder === -1 &&
      ['folder', 'category', 'topic', 'thumuc', 'danhmuc', 'botu', 'nhomtu', 'chude'].some((k) => norm.includes(k))
    ) {
      mapping.folder = index;
    }
    // Notes
    else if (
      mapping.notes === -1 &&
      ['notes', 'note', 'ghichu', 'chuthich', 'remark'].some((k) => norm.includes(k))
    ) {
      mapping.notes = index;
    }
  });

  // Default fallback if headers weren't named:
  // Col 0 = word, Col 1 = meaning if available
  if (mapping.word === -1 && headers.length > 0) mapping.word = 0;
  if (mapping.meaning === -1 && headers.length > 1) mapping.meaning = 1;

  return mapping;
}

/**
 * Parse rows with the active column mapping
 */
export function parseRowsWithMapping(
  rows: string[][],
  mapping: ColumnMapping,
  hasHeaderRow: boolean = true
): ParsedExcelRow[] {
  const startIndex = hasHeaderRow ? 1 : 0;
  const result: ParsedExcelRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const rawWord = mapping.word >= 0 && r[mapping.word] ? r[mapping.word].trim() : '';
    const meaning = mapping.meaning >= 0 && r[mapping.meaning] ? r[mapping.meaning].trim() : '';
    const partOfSpeechRaw = mapping.partOfSpeech >= 0 && r[mapping.partOfSpeech] ? r[mapping.partOfSpeech].trim() : '';
    const reading = mapping.reading >= 0 && r[mapping.reading] ? r[mapping.reading].trim() : '';
    const ipa = mapping.ipa >= 0 && r[mapping.ipa] ? r[mapping.ipa].trim() : '';
    const pinyin = mapping.pinyin >= 0 && r[mapping.pinyin] ? r[mapping.pinyin].trim() : '';
    const kana = mapping.kana >= 0 && r[mapping.kana] ? r[mapping.kana].trim() : '';
    const romaji = mapping.romaji >= 0 && r[mapping.romaji] ? r[mapping.romaji].trim() : '';
    const romaja = mapping.romaja >= 0 && r[mapping.romaja] ? r[mapping.romaja].trim() : '';
    const thaiReading = mapping.thaiReading >= 0 && r[mapping.thaiReading] ? r[mapping.thaiReading].trim() : '';
    const example = mapping.example >= 0 && r[mapping.example] ? r[mapping.example].trim() : '';
    const exampleTranslation = mapping.exampleTranslation >= 0 && r[mapping.exampleTranslation] ? r[mapping.exampleTranslation].trim() : '';
    const synonymsRaw = mapping.synonyms >= 0 && r[mapping.synonyms] ? r[mapping.synonyms].trim() : '';
    const antonymsRaw = mapping.antonyms >= 0 && r[mapping.antonyms] ? r[mapping.antonyms].trim() : '';
    const folderRaw = mapping.folder >= 0 && r[mapping.folder] ? r[mapping.folder].trim() : '';
    const notes = mapping.notes >= 0 && r[mapping.notes] ? r[mapping.notes].trim() : '';

    // If whole row is empty, skip
    if (!rawWord && !meaning && !example && !notes && !reading && !folderRaw) continue;

    // Smart cell parser: deconstructs single cells like "research report (n)" or "well-known = popular = famous (adj)"
    const token = parseWordCellContent(rawWord);
    const finalWord = token.word || rawWord;
    const isSeparatedFromCell =
      token.word !== rawWord ||
      Boolean(token.partOfSpeech) ||
      token.synonyms.length > 0 ||
      token.antonyms.length > 0;

    // Prioritize dedicated columns; only use cell extraction to fill missing fields
    let finalPos = 'khác';
    if (partOfSpeechRaw) {
      finalPos = standardizePartOfSpeech(partOfSpeechRaw);
    } else if (token.partOfSpeech) {
      finalPos = normalizePartOfSpeech(token.partOfSpeech) || token.partOfSpeech;
    }

    // Synonyms: prioritize dedicated column, merge with token synonyms
    let finalSynonyms = parseDelimitedList(synonymsRaw);
    if (finalSynonyms.length === 0 && token.synonyms.length > 0) {
      finalSynonyms = [...token.synonyms];
    } else if (token.synonyms.length > 0) {
      for (const s of token.synonyms) {
        if (!finalSynonyms.includes(s)) finalSynonyms.push(s);
      }
    }

    // Antonyms: prioritize dedicated column, merge with token antonyms
    let finalAntonyms = parseDelimitedList(antonymsRaw);
    if (finalAntonyms.length === 0 && token.antonyms.length > 0) {
      finalAntonyms = [...token.antonyms];
    } else if (token.antonyms.length > 0) {
      for (const a of token.antonyms) {
        if (!finalAntonyms.includes(a)) finalAntonyms.push(a);
      }
    }

    let isValid = true;
    let validationError: string | undefined = undefined;

    if (!finalWord) {
      isValid = false;
      validationError = 'Thiếu từ / cụm từ (bắt buộc)';
    }

    result.push({
      rowNumber: i + 1,
      word: finalWord,
      rawWordOriginal: rawWord,
      meaning,
      partOfSpeech: finalPos,
      reading: reading || undefined,
      ipa: ipa || undefined,
      pinyin: pinyin || undefined,
      kana: kana || undefined,
      romaji: romaji || undefined,
      romaja: romaja || undefined,
      thaiReading: thaiReading || undefined,
      example,
      exampleTranslation: exampleTranslation || undefined,
      synonyms: finalSynonyms,
      antonyms: finalAntonyms,
      folderName: folderRaw || undefined,
      notes,
      isValid,
      validationError,
      needsReview: token.needsReview,
      reviewReason: token.reviewReason,
      isSeparatedFromCell,
    });
  }

  return result;
}


/**
 * Generate sample Excel template tailored to each language and trigger download
 */
export function downloadSampleExcelTemplate(language: SupportedLanguage = 'en'): void {
  let headers: string[] = [];
  let sampleRows: string[][] = [];
  let sheetName = 'Từ vựng mẫu';
  let fileName = 'Mau_Tu_Vung_StudyForward.xlsx';

  if (language === 'zh') {
    fileName = 'Mau_Tu_Vung_Tieng_Trung_StudyForward.xlsx';
    sheetName = 'Tiếng Trung Giản Thể';
    headers = [
      'Từ (Hanzi)',
      'Phiên âm Pinyin',
      'Nghĩa tiếng Việt',
      'Từ loại',
      'Đồng nghĩa',
      'Trái nghĩa',
      'Câu ví dụ',
      'Bản dịch ví dụ',
      'Ghi chú',
    ];
    sampleRows = [
      [
        '你好',
        'nǐ hǎo',
        'xin chào',
        'thán từ',
        '您好',
        '再见',
        '你好！很高兴认识你。',
        'Xin chào! Rất vui được làm quen với bạn.',
        'Chào hỏi thông dụng hàng ngày',
      ],
      [
        '坚持',
        'jiānchí',
        'kiên trì, kiên định',
        'động từ',
        '坚守, 恒心',
        '放弃',
        '只要坚持努力，就一定能成功。',
        'Chỉ cần kiên trì nỗ lực, nhất định sẽ thành công.',
        'Dùng nhiều trong học tập và công việc',
      ],
      [
        '漂亮',
        'piàoliang',
        'xinh đẹp, đẹp đẽ',
        'tính từ',
        '美丽, 好看',
        '丑陋',
        '这里的风景非常漂亮。',
        'Phong cảnh ở đây vô cùng xinh đẹp.',
        'Mô tả người hoặc phong cảnh',
      ],
    ];
  } else if (language === 'ja') {
    fileName = 'Mau_Tu_Vung_Tieng_Nhat_StudyForward.xlsx';
    sheetName = 'Tiếng Nhật';
    headers = [
      'Từ (Kanji/Kana)',
      'Cách đọc Kana',
      'Romaji',
      'Nghĩa tiếng Việt',
      'Từ loại',
      'Đồng nghĩa',
      'Trái nghĩa',
      'Câu ví dụ',
      'Bản dịch ví dụ',
      'Ghi chú',
    ];
    sampleRows = [
      [
        '勉強',
        'べんきょう',
        'benkyou',
        'học tập, việc học',
        'danh từ',
        '学習',
        '怠惰',
        '毎日日本語を勉強しています。',
        'Tôi học tiếng Nhật mỗi ngày.',
        'Động từ nhóm 3: 勉強する',
      ],
      [
        '桜',
        'さくら',
        'sakura',
        'hoa anh đào',
        'danh từ',
        '桜花',
        '',
        '春になると桜が綺麗に咲きます。',
        'Khi mùa xuân đến, hoa anh đào nở rất đẹp.',
        'Biểu tượng văn hoá Nhật Bản',
      ],
      [
        '優しい',
        'やさしい',
        'yasashii',
        'hiền lành, dịu dàng, tốt bụng',
        'tính từ',
        '親切',
        '厳しい',
        '田中先生はいつも優しいです。',
        'Thầy Tanaka lúc nào cũng hiền từ dịu dàng.',
        'Tính từ đuôi i',
      ],
    ];
  } else if (language === 'ko') {
    fileName = 'Mau_Tu_Vung_Tieng_Han_StudyForward.xlsx';
    sheetName = 'Tiếng Hàn';
    headers = [
      'Từ (Hangul)',
      'Phiên âm Romaja',
      'Nghĩa tiếng Việt',
      'Từ loại',
      'Đồng nghĩa',
      'Trái nghĩa',
      'Câu ví dụ',
      'Bản dịch ví dụ',
      'Ghi chú',
    ];
    sampleRows = [
      [
        '안녕하세요',
        'annyeonghaseyo',
        'xin chào',
        'thán từ',
        '안녕',
        '안녕히 가세요',
        '안녕하세요! 처음 뵙겠습니다.',
        'Xin chào! Rất vui được gặp bạn lần đầu.',
        'Chào hỏi lịch sự thông dụng',
      ],
      [
        '행복',
        'haengbok',
        'hạnh phúc',
        'danh từ',
        '기쁨',
        '불행',
        '가족과 함께하는 것이 가장 큰 행복입니다.',
        'Được ở bên gia đình là niềm hạnh phúc lớn nhất.',
        'Gốc Hán: Hạnh phúc',
      ],
      [
        '열심히',
        'yeolsimhi',
        'chăm chỉ, nhiệt tình',
        'trạng từ',
        '부지런히',
        '게으르게',
        '한국어를 열심히 공부하고 있어요.',
        'Tôi đang chăm chỉ học tiếng Hàn.',
        'Thường đứng trước động từ',
      ],
    ];
  } else if (language === 'th') {
    fileName = 'Mau_Tu_Vung_Tieng_Thai_StudyForward.xlsx';
    sheetName = 'Tiếng Thái';
    headers = [
      'Từ tiếng Thái',
      'Cách đọc / Phiên âm',
      'Nghĩa tiếng Việt',
      'Từ loại',
      'Đồng nghĩa',
      'Trái nghĩa',
      'Câu ví dụ',
      'Bản dịch ví dụ',
      'Ghi chú',
    ];
    sampleRows = [
      [
        'สวัสดี',
        'sà-wàt-dee (xa-oát-đi)',
        'xin chào',
        'thán từ',
        'หวัดดี',
        'ลาก่อน',
        'สวัสดีครับ ยินดีที่ได้รู้จักครับ',
        'Xin chào, rất vui được làm quen với bạn.',
        'Nam thêm ครับ, nữ thêm ค่ะ',
      ],
      [
        'ขอบคุณ',
        'kòp-kun (khọp-khun)',
        'cảm ơn',
        'thán từ',
        'ขอบใจ',
        '',
        'ขอบคุณมากสำหรับความช่วยเหลือ',
        'Cảm ơn rất nhiều vì sự giúp đỡ của bạn.',
        'Phổ biến và trang trọng',
      ],
      [
        'อร่อย',
        'à-ròi (a-ròi)',
        'ngon (món ăn)',
        'tính từ',
        'แซ่บ',
        'ไม่อร่อย',
        'อาหารไทยจานนี้อร่อยมาก',
        'Món ăn Thái này rất ngon.',
        'Thường dùng khi thưởng thức ẩm thực',
      ],
    ];
  } else {
    // English default
    fileName = 'Mau_Tu_Vung_Tieng_Anh_StudyForward.xlsx';
    sheetName = 'Tiếng Anh';
    headers = [
      'Từ (Word)',
      'Phiên âm IPA',
      'Nghĩa tiếng Việt',
      'Từ loại',
      'Đồng nghĩa',
      'Trái nghĩa',
      'Câu ví dụ',
      'Bản dịch ví dụ',
      'Ghi chú',
    ];
    sampleRows = [
      [
        'resilient',
        '/rɪˈzɪliənt/',
        'kiên cường, có khả năng phục hồi nhanh',
        'tính từ',
        'tough, flexible, strong',
        'fragile, vulnerable',
        'He is a resilient person who never gives up.',
        'Anh ấy là một người kiên cường không bao giờ bỏ cuộc.',
        'Thường dùng miêu tả tính cách hoặc hệ thống',
      ],
      [
        'collaborate',
        '/kəˈlæbəreɪt/',
        'hợp tác, phối hợp',
        'động từ',
        'cooperate, team up',
        'compete',
        'We collaborate closely with international partners.',
        'Chúng tôi hợp tác chặt chẽ với các đối tác quốc tế.',
        'Cần dùng giới từ with/on',
      ],
      [
        'innovative',
        '/ˈɪnəveɪtɪv/',
        'mang tính đổi mới, sáng tạo',
        'tính từ',
        'creative, groundbreaking',
        'traditional, outdated',
        'The company launched an innovative clean energy solution.',
        'Công ty đã ra mắt một giải pháp năng lượng sạch mang tính đổi mới.',
        'Thường dùng trong mô tả công nghệ',
      ],
    ];
  }

  const data = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 18 }, // Word
    { wch: 22 }, // Reading / IPA / Pinyin
    { wch: 28 }, // Meaning
    { wch: 14 }, // Part of Speech
    { wch: 22 }, // Synonyms
    { wch: 18 }, // Antonyms
    { wch: 45 }, // Example
    { wch: 45 }, // Translation
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, fileName);
}

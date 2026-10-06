export type SupportedLanguage = 'en' | 'th' | 'ko' | 'zh' | 'ja';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string; // Tên hiển thị bằng tiếng Việt: Tiếng Anh, Tiếng Thái...
  nativeName: string; // Tên bản địa
  flag: string;
  ttsLocale: string;
  fallbackLocales: string[];
  wordLabel: string;
  wordPlaceholder: string;
  readingLabel: string;
  hasSpecialReadings: boolean;
  readingFields: {
    key: 'ipa' | 'thaiReading' | 'romaja' | 'pinyin' | 'kana' | 'romaji';
    label: string;
    placeholder: string;
    required?: boolean;
    helper?: string;
  }[];
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'Tiếng Anh',
    nativeName: 'English',
    flag: '🇬🇧',
    ttsLocale: 'en-US',
    fallbackLocales: ['en-GB', 'en-AU', 'en'],
    wordLabel: 'Từ / cụm từ tiếng Anh',
    wordPlaceholder: 'Ví dụ: resilient, breakthrough...',
    readingLabel: 'Phiên âm IPA',
    hasSpecialReadings: false,
    readingFields: [
      { key: 'ipa', label: 'Phiên âm IPA', placeholder: 'Ví dụ: /rɪˈzɪliənt/' }
    ]
  },
  th: {
    code: 'th',
    name: 'Tiếng Thái',
    nativeName: 'ภาษาไทย',
    flag: '🇹🇭',
    ttsLocale: 'th-TH',
    fallbackLocales: ['th'],
    wordLabel: 'Từ / cụm từ tiếng Thái',
    wordPlaceholder: 'Ví dụ: สวัสดี, ขอบคุณ...',
    readingLabel: 'Cách đọc (phiên âm tiếng Thái)',
    hasSpecialReadings: true,
    readingFields: [
      {
        key: 'thaiReading',
        label: 'Cách đọc / Phiên âm',
        placeholder: 'Ví dụ: sà-wàt-dee (xa-oát-đi)',
        helper: 'Phiên âm Latin hoặc cách đọc hỗ trợ người Việt'
      }
    ]
  },
  ko: {
    code: 'ko',
    name: 'Tiếng Hàn',
    nativeName: '한국어',
    flag: '🇰🇷',
    ttsLocale: 'ko-KR',
    fallbackLocales: ['ko'],
    wordLabel: 'Từ / cụm từ tiếng Hàn (Hangul)',
    wordPlaceholder: 'Ví dụ: 안녕하세요, 행복...',
    readingLabel: 'Phiên âm Romaja',
    hasSpecialReadings: true,
    readingFields: [
      {
        key: 'romaja',
        label: 'Phiên âm Romaja (Latin)',
        placeholder: 'Ví dụ: annyeonghaseyo',
        helper: 'Phiên âm chữ cái Latin theo chuẩn Revised Romanization'
      }
    ]
  },
  zh: {
    code: 'zh',
    name: 'Tiếng Trung',
    nativeName: '中文 (简体)',
    flag: '🇨🇳',
    ttsLocale: 'zh-CN',
    fallbackLocales: ['zh-TW', 'zh-HK', 'zh'],
    wordLabel: 'Từ / cụm từ tiếng Trung (Giản thể)',
    wordPlaceholder: 'Ví dụ: 你好, 坚持, 成功...',
    readingLabel: 'Pinyin (có dấu thanh)',
    hasSpecialReadings: true,
    readingFields: [
      {
        key: 'pinyin',
        label: 'Phiên âm Pinyin (Bính âm có dấu)',
        placeholder: 'Ví dụ: nǐ hǎo, jiānchí',
        helper: 'Kèm dấu thanh (ā, á, ǎ, à)'
      }
    ]
  },
  ja: {
    code: 'ja',
    name: 'Tiếng Nhật',
    nativeName: '日本語',
    flag: '🇯🇵',
    ttsLocale: 'ja-JP',
    fallbackLocales: ['ja'],
    wordLabel: 'Từ / cụm từ tiếng Nhật (Kanji / Kana)',
    wordPlaceholder: 'Ví dụ: 勉強, ありがとう, 桜...',
    readingLabel: 'Cách đọc Kana / Romaji',
    hasSpecialReadings: true,
    readingFields: [
      {
        key: 'kana',
        label: 'Cách đọc Kana (Furigana / Hiragana / Katakana)',
        placeholder: 'Ví dụ: べんきょう, さくら',
        helper: 'Chữ Hiragana hoặc Katakana tương ứng'
      },
      {
        key: 'romaji',
        label: 'Phiên âm Romaji',
        placeholder: 'Ví dụ: benkyou, sakura'
      }
    ]
  }
};

export const LANGUAGE_LIST = Object.values(SUPPORTED_LANGUAGES);

export function getLanguageInfo(lang?: string | null): LanguageInfo {
  if (!lang || !SUPPORTED_LANGUAGES[lang as SupportedLanguage]) {
    return SUPPORTED_LANGUAGES.en;
  }
  return SUPPORTED_LANGUAGES[lang as SupportedLanguage];
}

/**
 * Trả về chuỗi cách đọc chính ưu tiên theo ngôn ngữ của từ
 */
export function getPrimaryReading(word: {
  language?: string | null;
  phonetic?: string | null;
  ipa?: string | null;
  pinyin?: string | null;
  kana?: string | null;
  romaji?: string | null;
  romaja?: string | null;
  thaiReading?: string | null;
  reading?: string | null;
}): string {
  const lang = word.language || 'en';

  if (lang === 'zh') {
    return word.pinyin || word.reading || word.phonetic || '';
  }
  if (lang === 'ja') {
    if (word.kana && word.romaji) {
      return `${word.kana} (${word.romaji})`;
    }
    return word.kana || word.romaji || word.reading || word.phonetic || '';
  }
  if (lang === 'ko') {
    return word.romaja || word.reading || word.phonetic || '';
  }
  if (lang === 'th') {
    return word.thaiReading || word.reading || word.phonetic || '';
  }
  // Tiếng Anh
  return word.ipa || word.phonetic || word.reading || '';
}

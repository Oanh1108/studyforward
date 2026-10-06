import { SupportedLanguage, SUPPORTED_LANGUAGES } from '@/lib/languages';

export interface SpeakResult {
  success: boolean;
  hasNativeVoice: boolean;
  message?: string;
}

/**
 * Tìm voice phù hợp nhất cho ngôn ngữ yêu cầu từ danh sách voices của trình duyệt
 */
export function findBestVoice(localeOrLang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Tìm theo locale chính xác (ví dụ th-TH)
  const exact = voices.find((v) => v.lang.toLowerCase() === localeOrLang.toLowerCase());
  if (exact) return exact;

  // Tìm theo tiền tố (ví dụ th, zh, ko, ja, en)
  const prefix = localeOrLang.split('-')[0].toLowerCase();
  const partial = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (partial) return partial;

  return null;
}

/**
 * Kiểm tra xem trình duyệt / thiết bị hiện tại có hỗ trợ giọng đọc bản ngữ hay không
 */
export function isAudioSupported(languageOrLocale: SupportedLanguage | string = 'en'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  let targetLocale = languageOrLocale;
  if (languageOrLocale in SUPPORTED_LANGUAGES) {
    targetLocale = SUPPORTED_LANGUAGES[languageOrLocale as SupportedLanguage].ttsLocale;
  }
  return Boolean(findBestVoice(targetLocale));
}

/**
 * Phát âm từ/cụm từ theo đúng ngôn ngữ học (en, th, ko, zh, ja hoặc locale cụ thể)
 * Nếu thiết bị không có giọng đọc tương ứng, trả về thông báo để giao diện báo cho người dùng
 */
export function speakText(
  text: string,
  languageOrLocale: SupportedLanguage | string = 'en',
  rate: number = 0.95
): Promise<SpeakResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve({
        success: false,
        hasNativeVoice: false,
        message: 'Trình duyệt của bạn không hỗ trợ tính năng phát âm (Speech Synthesis).',
      });
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Dừng phát âm hiện tại

      let targetLocale = languageOrLocale;
      let langName = 'ngôn ngữ này';

      if (languageOrLocale in SUPPORTED_LANGUAGES) {
        const langConfig = SUPPORTED_LANGUAGES[languageOrLocale as SupportedLanguage];
        targetLocale = langConfig.ttsLocale;
        langName = langConfig.name;
      }

      const voice = findBestVoice(targetLocale);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLocale;
      utterance.rate = rate;
      utterance.pitch = 1.0;

      let hasNativeVoice = true;
      let warningMessage: string | undefined = undefined;

      if (voice) {
        utterance.voice = voice;
      } else {
        // Không tìm thấy giọng bản địa cài trên thiết bị
        hasNativeVoice = false;
        warningMessage = `Thiết bị chưa cài gói giọng đọc cho ${langName}. Bạn vẫn có thể tiếp tục học bình thường.`;
      }

      utterance.onend = () => {
        resolve({ success: true, hasNativeVoice, message: warningMessage });
      };

      utterance.onerror = (e) => {
        resolve({
          success: false,
          hasNativeVoice,
          message: e.error === 'not-allowed' ? 'not-allowed' : (warningMessage || 'Không thể phát âm từ này do thiết bị chưa hỗ trợ.'),
        });
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve({
        success: false,
        hasNativeVoice: false,
        message: 'Lỗi phát âm.',
      });
    }
  });
}

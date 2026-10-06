/**
 * Utility to parse mixed vocabulary strings in single Excel cells or raw entries
 */

export interface ParsedWordToken {
  word: string;
  partOfSpeech?: string;
  synonyms: string[];
  antonyms: string[];
  needsReview?: boolean;
  reviewReason?: string;
}

// Canonical POS mapping
const POS_MAP: Record<string, string> = {
  // English short
  n: 'noun',
  'n.': 'noun',
  v: 'verb',
  'v.': 'verb',
  adj: 'adjective',
  'adj.': 'adjective',
  a: 'adjective',
  'a.': 'adjective',
  adv: 'adverb',
  'adv.': 'adverb',
  pron: 'pronoun',
  'pron.': 'pronoun',
  prep: 'preposition',
  'prep.': 'preposition',
  conj: 'conjunction',
  'conj.': 'conjunction',
  interj: 'interjection',
  'interj.': 'interjection',
  phr: 'phrase',
  'phr.': 'phrase',
  phrase: 'phrase',

  // English full
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  pronoun: 'pronoun',
  preposition: 'preposition',
  conjunction: 'conjunction',
  interjection: 'interjection',

  // Vietnamese
  'danh từ': 'noun',
  danhtu: 'noun',
  dt: 'noun',
  'động từ': 'verb',
  dongtu: 'verb',
  đt: 'verb',
  'tính từ': 'adjective',
  tinhtu: 'adjective',
  tt: 'adjective',
  'trạng từ': 'adverb',
  trangtu: 'adverb',
  'phó từ': 'adverb',
  photu: 'adverb',
  'đại từ': 'pronoun',
  daitu: 'pronoun',
  'giới từ': 'preposition',
  gioitu: 'preposition',
  gtu: 'preposition',
  gt: 'preposition',
  'liên từ': 'conjunction',
  lientu: 'conjunction',
  lt: 'conjunction',
  'thán từ': 'interjection',
  thantu: 'interjection',
  tht: 'interjection',
  'lượng từ': 'classifier',
  'trợ từ': 'particle',
  'cụm từ': 'phrase',
};

/**
 * Normalizes POS string to standard name (e.g. 'noun', 'adjective', etc.)
 */
export function normalizePartOfSpeech(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}]/g, '')
    .trim();

  if (POS_MAP[s]) return POS_MAP[s];

  // Fuzzy check
  if (s.includes('danh') || s.includes('noun')) return 'noun';
  if (s.includes('động') || s.includes('dong') || s.includes('verb')) return 'verb';
  if (s.includes('tính') || s.includes('tinh') || s.includes('adj')) return 'adjective';
  if (s.includes('trạng') || s.includes('trang') || s.includes('phó') || s.includes('adv')) return 'adverb';
  if (s.includes('giới') || s.includes('gioi') || s.includes('prep')) return 'preposition';
  if (s.includes('đại') || s.includes('dai') || s.includes('pron')) return 'pronoun';
  if (s.includes('liên') || s.includes('lien') || s.includes('conj')) return 'conjunction';
  if (s.includes('thán') || s.includes('than') || s.includes('interj')) return 'interjection';

  return undefined;
}

/**
 * Extracts POS from trailing or inline brackets e.g. "(n)", "[adj]", "(gtu)"
 */
export function extractPosFromFragment(fragment: string): { cleanFragment: string; pos?: string } {
  let text = fragment.trim();
  let foundPos: string | undefined = undefined;

  // Match bracketed POS e.g. (n), (v), [adj], (giới từ), (gtu), etc.
  const posRegex = /(?:\(|\b\[)(n|v|adj|a|adv|pron|prep|conj|interj|phr|noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|danh từ|động từ|tính từ|trạng từ|giới từ|đại từ|liên từ|thán từ|dt|đt|tt|gtu|gt|lt|tht)(?:\)|\b\])\.?\s*$/i;

  const match = text.match(posRegex);
  if (match) {
    foundPos = normalizePartOfSpeech(match[1]);
    text = text.substring(0, match.index).trim();
  } else {
    // Check if bracketed at start: "(n) book"
    const startMatch = text.match(/^\s*(?:\(|\b\[)(n|v|adj|a|adv|pron|prep|conj|interj|phr|noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|danh từ|động từ|tính từ|trạng từ|giới từ|đại từ|liên từ|thán từ|dt|đt|tt|gtu|gt|lt|tht)(?:\)|\b\])\.?\s+/i);
    if (startMatch) {
      foundPos = normalizePartOfSpeech(startMatch[1]);
      text = text.substring(startMatch[0].length).trim();
    }
  }

  return { cleanFragment: text, pos: foundPos };
}

/**
 * Smart cell parser for vocabulary cells containing combined tokens
 */
export function parseWordCellContent(rawInput: string): ParsedWordToken {
  if (!rawInput || !rawInput.trim()) {
    return { word: '', synonyms: [], antonyms: [] };
  }

  let text = rawInput.trim();
  const synonyms: string[] = [];
  const antonyms: string[] = [];
  let detectedPos: string | undefined = undefined;
  let needsReview = false;
  let reviewReason: string | undefined = undefined;

  // 1. Separate Antonyms first
  // Markers: ≠, !=, "trái nghĩa:", "trai nghia:", "antonyms:", "antonym:", "opp:"
  const antMarkerRegex = /(?:\s+≠\s+|\s+!=\s+|\s+(?:trái\s*nghĩa|trai\s*nghia|antonyms?|opp)\s*:\s*)/i;
  const antParts = text.split(antMarkerRegex);
  if (antParts.length > 1) {
    text = antParts[0].trim();
    for (let i = 1; i < antParts.length; i++) {
      const rawAntGroup = antParts[i].trim();
      // Antonyms might be comma or semicolon separated
      const splitAnts = rawAntGroup.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean);
      for (const a of splitAnts) {
        const { cleanFragment, pos } = extractPosFromFragment(a);
        if (pos && !detectedPos) detectedPos = pos;
        if (cleanFragment && !antonyms.includes(cleanFragment)) {
          antonyms.push(cleanFragment);
        }
      }
    }
  }

  // 2. Separate Synonyms
  // Explicit text markers first: "đồng nghĩa:", "dong nghia:", "synonyms:", "synonym:", "syn:"
  const synTextMarkerRegex = /\s+(?:đồng\s*nghĩa|dong\s*nghia|synonyms?|syn)\s*:\s*/i;
  const synParts = text.split(synTextMarkerRegex);
  if (synParts.length > 1) {
    text = synParts[0].trim();
    for (let i = 1; i < synParts.length; i++) {
      const rawSynGroup = synParts[i].trim();
      const splitSyns = rawSynGroup.split(/[,;\n\r，、]+/).map((s) => s.trim()).filter(Boolean);
      for (const s of splitSyns) {
        const { cleanFragment, pos } = extractPosFromFragment(s);
        if (pos && !detectedPos) detectedPos = pos;
        if (cleanFragment && !synonyms.includes(cleanFragment)) {
          synonyms.push(cleanFragment);
        }
      }
    }
  }

  // Next, '=' separator for synonyms: e.g. "well-known = popular = famous (adj)"
  // NOTE: Keep intra-word hyphens intact! Do NOT split on '-'. Only split on '='.
  if (text.includes('=')) {
    // Split by '=' with optional spaces
    const equalParts = text.split(/\s*=\s*/).map((s) => s.trim()).filter(Boolean);
    if (equalParts.length > 1) {
      // First part is the base word candidate
      text = equalParts[0];

      // Remaining parts are synonyms
      for (let i = 1; i < equalParts.length; i++) {
        const part = equalParts[i];
        const { cleanFragment, pos } = extractPosFromFragment(part);
        if (pos && !detectedPos) detectedPos = pos;
        if (cleanFragment && !synonyms.includes(cleanFragment)) {
          synonyms.push(cleanFragment);
        }
      }
    }
  }

  // 3. Extract POS from base word if still not extracted or if base word has it
  const baseExtract = extractPosFromFragment(text);
  text = baseExtract.cleanFragment;
  if (baseExtract.pos) {
    if (detectedPos && detectedPos !== baseExtract.pos) {
      needsReview = true;
      reviewReason = `Phát hiện xung đột từ loại (${baseExtract.pos} và ${detectedPos})`;
    }
    detectedPos = baseExtract.pos;
  }

  // 4. Clean up any trailing / leading punctuation on word (preserve internal hyphens like well-known!)
  text = text.replace(/^[,;.\s]+|[,;.\s]+$/g, '').trim();

  // If text contains suspicious characters like unclosed brackets or question marks
  if (/[?？]/.test(text) || /\([^)]*$/.test(text)) {
    needsReview = true;
    reviewReason = reviewReason || 'Ký hiệu từ vựng không rõ ràng, cần kiểm tra';
  }

  return {
    word: text,
    partOfSpeech: detectedPos,
    synonyms,
    antonyms,
    needsReview,
    reviewReason,
  };
}

/**
 * Smart parser for meaning strings that might contain mixed synonyms and POS tags.
 * e.g. "a high-rise building (n) = a skyscraper (n) t�a nh� cao t?ng"
 * or "= a skyscraper (n) t�a nh� cao t?ng"
 */
export function parseMeaningCellContent(meaningInput: string) {
  if (!meaningInput) return { cleanMeaning: '', pos: undefined, synonyms: [] };

  let text = meaningInput.trim();
  const synonyms: string[] = [];
  let detectedPos: string | undefined = undefined;

  // Remove leading equal sign if it exists
  if (text.startsWith('=')) {
    text = text.substring(1).trim();
  }

  // Let's first extract POS from the entire string if it exists at the end
  const baseExtract = extractPosFromFragment(text);
  if (baseExtract.pos) detectedPos = baseExtract.pos;
  text = baseExtract.cleanFragment;

  // Extract POS tags anywhere in the string
  const posRegex = /(?:\s+|^)(?:\(|\b\[)(n|v|adj|a|adv|pron|prep|conj|interj|phr|noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|danh t?|d?ng t?|t�nh t?|tr?ng t?|gi?i t?|d?i t?|li�n t?|th�n t?|dt|dt|tt|gtu|gt|lt|tht|ving|ved|v-ing|v-ed)(?:\)|\b\])\.?\s+/i;
  
  let match;
  while ((match = posRegex.exec(text)) !== null) {
     if (!detectedPos) detectedPos = normalizePartOfSpeech(match[1]);
     
     // Split the text at the POS tag
     const beforePos = text.substring(0, match.index).trim();
     let afterPos = text.substring(match.index + match[0].length).trim();
     if (afterPos.startsWith('=')) afterPos = afterPos.substring(1).trim();
     
     let cleanedBefore = beforePos;
     if (cleanedBefore.startsWith('=')) cleanedBefore = cleanedBefore.substring(1).trim();

     // If beforePos is purely ASCII (English word), treat as synonym
     if (cleanedBefore && /^[\x00-\x7F]+$/.test(cleanedBefore)) {
        synonyms.push(cleanedBefore);
        text = afterPos; // Meaning is what remains
     } else {
        // If it's not pure ASCII, maybe it's just a POS tag inside the meaning
        text = beforePos + (beforePos ? " " : "") + afterPos;
     }
  }

  // If there are equal signs inside the remaining text, split them
  if (text.includes('=')) {
      const parts = text.split(/\s*=\s*/).map(s => s.trim()).filter(Boolean);
      text = parts.pop() || '';
      for (const p of parts) {
          if (p && /^[\x00-\x7F]+$/.test(p)) {
              synonyms.push(p);
          } else {
              text = p + (p ? " " : "") + text; // Not a synonym, combine back
          }
      }
  }

  return { cleanMeaning: text, pos: detectedPos, synonyms };
}

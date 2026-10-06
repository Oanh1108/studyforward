const fs = require("fs");
let code = fs.readFileSync("src/vocabulary/vocabulary.service.ts", "utf8");

const evaluateDictationCode = `
  async evaluateDictation(userId: number, data: { wordId: number; typingInput: string; synonymChips: string[]; synonymTestMode: string; recordSrs?: boolean }) {
    const word = await this.customVocabRepo.findOne({
      where: { id: data.wordId, userId },
    });
    if (!word) {
      throw new NotFoundException("Không tìm th?y t? v?ng");
    }

    const normalizeInputString = (input: string) => {
      return (input || "").toLowerCase().trim().replace(/[.,!?()]/g, "").replace(/\s+/g, " ");
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
        .split(/[,;=\\/]+/)
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
      const srsRes = calculateNextReview(word, quality);
      word.srsLevel = srsRes.srsLevel;
      word.easeFactor = srsRes.easeFactor;
      word.interval = srsRes.interval;
      word.nextReview = srsRes.nextReview;
      await this.customVocabRepo.save(word);
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
`;

code = code.replace(/async completeStudySession\(/, evaluateDictationCode.trim() + "\n\n  async completeStudySession(");

fs.writeFileSync("src/vocabulary/vocabulary.service.ts", code);
console.log("Service updated");


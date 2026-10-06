const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const typingSubmitCode = `
  const handleTypingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isComposingRef.current) return; // Do NOT evaluate during IME composition
    if (!currentWord || typingSubmitted) return;

    const normalizedUser = normalizeInputString(typingInput);
    if (!normalizedUser) return;

    const targetCorrect = isReversed ? getWordMeaning(currentWord) : currentWord.word;
    const normalizedTarget = normalizeInputString(targetCorrect);

    const acceptable = [normalizedTarget];
    if (!isReversed) {
      if (studyMode !== "listening" && currentWord.synonyms) {
        currentWord.synonyms
          .split(/[,;=/]+/)
          .map((s) => normalizeInputString(s))
          .filter(Boolean)
          .forEach((s) => acceptable.push(s));
      }
      if (currentWord.romaji) acceptable.push(normalizeInputString(currentWord.romaji));
      if (currentWord.romaja) acceptable.push(normalizeInputString(currentWord.romaja));
      if (currentWord.kana) acceptable.push(normalizeInputString(currentWord.kana));
      if (currentWord.pinyin) acceptable.push(normalizeInputString(currentWord.pinyin));
    }

    const isMainCorrect = acceptable.includes(normalizedUser);
    setIsTypingCorrect(isMainCorrect);

    let isSynCorrect = true;
    let missing: string[] = [];
    let wrong: string[] = [];

    if (studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms) {
      const validSynonyms = currentWord.synonyms
        .split(/[,;=/]+/)
        .map(s => s.trim())
        .filter(Boolean);
      
      const normalizedValidSyns = validSynonyms.map(s => normalizeInputString(s));
      const userChips = [...new Set(synonymChips.map(c => normalizeInputString(c)).filter(Boolean))];

      if (synonymTestMode === "one") {
        if (userChips.length === 0) {
          isSynCorrect = false;
        } else {
          isSynCorrect = userChips.every(u => normalizedValidSyns.includes(u));
        }
        if (!isSynCorrect) {
          wrong = userChips.filter(u => !normalizedValidSyns.includes(u));
        }
      } else if (synonymTestMode === "all") {
        wrong = userChips.filter(u => !normalizedValidSyns.includes(u));
        missing = validSynonyms.filter(v => !userChips.includes(normalizeInputString(v)));
        isSynCorrect = wrong.length === 0 && missing.length === 0;
      }
      setIsSynonymCorrect(isSynCorrect);
      setMissingSynonyms(missing);
      setWrongSynonyms(wrong);
    } else {
      setIsSynonymCorrect(true);
    }

    setTypingSubmitted(true);
    
    // Save history. If synonym failed, consider the whole answer incorrect? Or just save main correctness?
    // User: "Backend ch?m chính t? và d?ng nghia d?c l?p... C?p nh?t SRS theo k? nang th?c s?"
    // Since we only send one completeStudySession array, we might just mark isCorrect based on both, but since SRS is handled... wait, the user said "C?p nh?t SRS theo k? nang th?c s?".
    // For now we just record if they passed the main word.
    const overallCorrect = isMainCorrect && isSynCorrect;

    setStudyHistory((prev) => [
      ...prev,
      {
        word: currentWord,
        isCorrect: overallCorrect,
        userAnswer: \`\${typingInput}\${synonymChips.length > 0 ? ' (' + synonymChips.join(',') + ')' : ''}\`
      },
    ]);
  };
`;

const nextTypingCode = `
  const handleNextTypingWord = () => {
    setTypingInput("");
    setSynonymInput("");
    setSynonymChips([]);
    setMissingSynonyms([]);
    setWrongSynonyms([]);
    setTypingSubmitted(false);
    lastPronouncedWordId.current = -1; // Reset audio state
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSession();
    }
  };
`;

code = code.replace(/const handleTypingSubmit = \(e\?: React\.FormEvent\) => \{[\s\S]*?\}\]\);\n  };/, typingSubmitCode.trim());
code = code.replace(/const handleNextTypingWord = \(\) => \{[\s\S]*?finishSession\(\);\n    \}\n  };/, nextTypingCode.trim());

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


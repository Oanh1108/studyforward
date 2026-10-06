const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const fetchCode = `
  const handleTypingSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isComposingRef.current) return;
    if (!currentWord || typingSubmitted) return;

    if (!typingInput.trim()) return;

    if (studyMode === "listening") {
      try {
        const res = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/vocabulary/study/evaluate-dictation\`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: \`Bearer \${localStorage.getItem("studyforward_access_token")}\`
          },
          body: JSON.stringify({
            wordId: currentWord.id,
            typingInput,
            synonymChips,
            synonymTestMode,
            recordSrs: false // SRS will be recorded at session complete
          })
        });
        const result = await res.json();
        
        setIsTypingCorrect(result.isMainCorrect);
        setIsSynonymCorrect(result.isSynonymCorrect);
        setMissingSynonyms(result.missingSynonyms);
        setWrongSynonyms(result.wrongSynonyms);
        setTypingSubmitted(true);

        setStudyHistory((prev) => [
          ...prev,
          {
            word: currentWord,
            isCorrect: result.overallCorrect,
            userAnswer: \`\${typingInput}\${synonymChips.length > 0 ? " (" + synonymChips.join(", ") + ")" : ""}\`
          }
        ]);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    // fallback for typing mode (non-listening)
    const normalizedUser = normalizeInputString(typingInput);
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
    setIsSynonymCorrect(true);
    setTypingSubmitted(true);

    setStudyHistory((prev) => [
      ...prev,
      {
        word: currentWord,
        isCorrect: isMainCorrect,
        userAnswer: typingInput
      },
    ]);
  };
`;

code = code.replace(/const handleTypingSubmit = \(e\?: React\.FormEvent\) => \{[\s\S]*?\}\]\);\n  };/, fetchCode.trim());

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


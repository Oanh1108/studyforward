const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const exitFunction = `
  const [isSavingExit, setIsSavingExit] = useState(false);
  const handleExitSave = async () => {
    setIsSavingExit(true);
    try {
      const correctCount = studyHistory.filter((h) => h.isCorrect).length;
      await myVocabApi.completeStudySession({
        sessionId: sessionId || \\\`session_\\\${Date.now()}\\\`,
        mode: studyMode,
        language: currentLanguage,
        folderIds: selectedFolderIds,
        totalWords: deck.length,
        correctCount,
        durationSeconds: activeSeconds,
        isCompleted: false,
        details: studyHistory.map((h) => ({
          wordId: h.word.id,
          rating: h.rating,
          isCorrect: h.isCorrect,
          userAnswer: h.userAnswer,
        })),
      });
      setExitConfirmOpen(false);
      onClose?.();
    } catch (err) {
      console.warn("Could not save session to backend:", err);
      alert("L?i luu ti?n d?. Vui lòng th? l?i!");
    } finally {
      setIsSavingExit(false);
    }
  };
`;

code = code.replace(
  "  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);",
  "  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);\n" + exitFunction
);

code = code.replace(
  "onClick={async () => {\n                  setExitConfirmOpen(false);\n                  onClose?.();\n                }}",
  "onClick={handleExitSave}\n                disabled={isSavingExit}"
);
code = code.replace(
  "onClick={() => {\n                  setExitConfirmOpen(false);\n                  onClose?.();\n                }}",
  "onClick={handleExitSave}\n                disabled={isSavingExit}"
);
code = code.replace(
  "Luu và thoát",
  "{isSavingExit ? \"Ðang luu...\" : \"Luu và thoát\"}"
);

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Exit logic updated");


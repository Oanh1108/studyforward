const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /export type QuizType = 'meaning' \| 'synonym' \| 'antonym' \| 'mixed';/,
  "export type QuizType = 'meaning' | 'synonym' | 'antonym' | 'mixed';\nexport type SynonymTestMode = 'none' | 'one' | 'all';"
);

code = code.replace(
  /const \[quizType, setQuizType\] = useState<QuizType>\('meaning'\);/,
  "const [quizType, setQuizType] = useState<QuizType>('meaning');\n  const [synonymTestMode, setSynonymTestMode] = useState<SynonymTestMode>('none');"
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


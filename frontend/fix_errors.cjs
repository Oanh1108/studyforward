const fs = require("fs");

let sessionCode = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");
sessionCode = sessionCode.replace(/\\`session_\\\$\{Date\.now\(\)\}\\`/g, "`session_${Date.now()}`");
fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", sessionCode, "utf8");

let vocabCode = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", "utf8");
vocabCode = vocabCode.replace("import { Search } from \"lucide-react\";\n\"use client\";", "\"use client\";\nimport { Search } from \"lucide-react\";");
fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", vocabCode, "utf8");
console.log("Errors fixed");


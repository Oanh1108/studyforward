const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /showPhonetics: boolean;/,
  "showPhonetics: boolean;\n    synonymTestMode: SynonymTestMode;"
);

code = code.replace(
  /showPhonetics,\n\s*deck,/g,
  "showPhonetics,\n        synonymTestMode,\n        deck,"
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


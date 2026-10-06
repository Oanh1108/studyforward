const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/lib/youtubeUtils.ts", "utf8");
code = code.replace(
  "transcriptData?: string;",
  "transcriptData?: string;\n  scoreCorrect?: number;\n  scoreTotal?: number;"
);
fs.writeFileSync("c:/studyforward/frontend/lib/youtubeUtils.ts", code, "utf8");
console.log("YouTube fixed");


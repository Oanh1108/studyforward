const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8");

// Change `completeStudySession` parameter to accept `isCompleted?: boolean`
code = code.replace(
  "durationSeconds: number;",
  "durationSeconds: number;\n        isCompleted?: boolean;"
);

// Update logic
code = code.replace(
  "const earnedXp = correctCount * 2 + baseBonus + accuracyBonus;",
  "const earnedXp = data.isCompleted === false ? 0 : (correctCount * 2 + baseBonus + accuracyBonus);"
);

code = code.replace(
  "session.isCompleted = true;",
  "session.isCompleted = data.isCompleted !== false;"
);

code = code.replace(
  "await this.usersService.addXp(userId, earnedXp);",
  "if (data.isCompleted !== false) {\n      await this.usersService.addXp(userId, earnedXp);\n    }"
);

fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", code, "utf8");
console.log("Backend updated");


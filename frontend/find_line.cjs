const fs = require("fs");
const lines = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8").split("\n");
lines.forEach((line, i) => {
  if (line.includes("async completeStudySession(")) {
    console.log("Found at line", i + 1);
  }
});


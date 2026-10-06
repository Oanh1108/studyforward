const fs = require("fs");
const lines = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8").split("\n");
lines.forEach((line, i) => {
  if (line.includes("const finishSession = ")) {
    console.log("Found finishSession at line", i + 1);
  }
});


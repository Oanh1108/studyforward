const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", "utf8");

code = code.replace(
  "durationSeconds: number;",
  "durationSeconds: number;\n        isCompleted?: boolean;"
);

fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", code, "utf8");
console.log("Controller updated");


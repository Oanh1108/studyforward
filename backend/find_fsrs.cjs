const fs = require("fs");
const lines = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8").split("\n");
let lastFunc = "";
lines.forEach((line) => {
  if (line.includes("async ") || line.includes("function ")) lastFunc = line;
  if (line.includes("const f = fsrs();")) {
    console.log("Found in: ", lastFunc);
  }
});


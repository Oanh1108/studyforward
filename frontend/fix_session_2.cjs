const fs = require("fs");
let lines = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8").split("\n");

for (let i = 1930; i < 1950; i++) {
  if (lines[i] && lines[i].includes("?ng nghia:")) {
    lines[i] = lines[i].replace(/\?ng nghia:/, "Ð?ng nghia:");
    lines[i] = lines[i].replace(/\? \?t/, "? Ð?t").replace(/\? Chua d\?t/, "? Chua d?t");
  }
  if (lines[i] && lines[i].includes("Thi?u:")) {
    lines[i] = lines[i].replace(/Thi\?u:/, "Thi?u:");
  }
  if (lines[i] && lines[i].includes("Cch d?c:")) {
    lines[i] = lines[i].replace(/Cch d\?c:/, "Cách d?c:");
  }
}

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", lines.join("\n"), "utf8");
console.log("Replaced more!");


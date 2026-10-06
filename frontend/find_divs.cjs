const fs = require("fs");
const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

let count = 0;
let lines = code.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("<div")) {
    const matches = line.match(/<div/g);
    if (matches) count += matches.length;
  }
  if (line.includes("</div")) {
    const matches = line.match(/<\/div/g);
    if (matches) count -= matches.length;
  }
  
  if (count < 0) {
    console.log("Unmatched div at line", i + 1, "Count:", count);
  }
}
console.log("Final count:", count);


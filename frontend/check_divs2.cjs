const fs = require("fs");
const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

let count = 0;
let lines = code.split("\n");

let started = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("return (")) {
    if (i + 1 > 870) started = true;
  }
  
  if (line.includes("<div")) {
    const matches = line.match(/<div/g);
    if (matches) count += matches.length;
  }
  if (line.includes("</div")) {
    const matches = line.match(/<\/div>/g);
    if (matches) count -= matches.length;
  }
  
  if (started && count === 0 && line.includes("</div>")) {
    console.log("Reached 0 at line", i + 1);
  }
}


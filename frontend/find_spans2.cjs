const fs = require("fs");
const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

let lines = code.split("\n");
let unclosed = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let opens = (line.match(/<span/g) || []).length;
  let closes = (line.match(/<\/span>/g) || []).length;
  
  if (opens !== closes) {
    console.log(i + 1, ":", line);
  }
}


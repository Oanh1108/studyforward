const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

let badString = "useState(');";
while(code.includes(badString)) {
  code = code.replace(badString, 'useState("");');
}

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Fixed quotes in StudySessionView");

const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

let arr = ["setTypingInput", "setSynonymInput", "setSearchQuery"];
for (let key of arr) {
  let badString = key + "(');";
  while(code.includes(badString)) {
    code = code.replace(badString, key + '("");');
  }
}

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Fixed more quotes");

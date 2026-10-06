const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /{isSavingExit \? ".*" : ".*"}/,
  "{isSavingExit ? \"Ðang luu...\" : \"Luu và thoát\"}"
);

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Text updated");


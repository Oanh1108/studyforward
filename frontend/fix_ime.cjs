const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /if \(e\.key === "Enter"\) \{\s*if \(e\.ctrlKey\) return; \/\/ let form submit\s*e\.preventDefault\(\);/g,
  "if (e.key === \\"Enter\\") {\\n                                  if (e.ctrlKey) return; // let form submit\\n                                  e.preventDefault();\\n                                  if (isComposingRef.current) return;"
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced IME handling successfully");


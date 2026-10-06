const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", "utf8");

code = code.replace(
  "className=\"w-full pl-8 pr-3 py-2 rounded-xl",
  "className=\"w-full pl-10 pr-3 py-2 rounded-xl"
);

// We need to replace the garbled search icon with Lucide Search icon
// And garbled placeholder with "Tìm ki?m t? v?ng..."

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", code, "utf8");
console.log("Search padding fixed");


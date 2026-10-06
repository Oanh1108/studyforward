const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", "utf8");

if (!code.includes("lucide-react")) {
  code = "import { Search } from \"lucide-react\";\n" + code;
} else if (!code.includes("Search")) {
  code = code.replace(/import {([^}]*)} from ["']lucide-react["']/, "import { $1, Search } from \"lucide-react\"");
}

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", code, "utf8");
console.log("Import added");


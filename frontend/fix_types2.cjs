const fs = require("fs");

let typesCode = fs.readFileSync("c:/studyforward/frontend/components/learning/types.ts", "utf8");
typesCode = typesCode.replace(
  "export type ActiveTab = 'dashboard' | 'courses' | 'paths' | 'vocabulary' | 'speaking' | 'dictation' | 'analytics' | 'notes' | 'todos' | 'focus' | 'profile' | 'admin' | 'srs';",
  "export type ActiveTab = 'dashboard' | 'courses' | 'paths' | 'vocabulary' | 'speaking' | 'dictation' | 'analytics' | 'notes' | 'todos' | 'focus' | 'profile' | 'admin' | 'srs' | 'my-vocab' | 'vocabulary_study';"
).replace(/''/g, "'");

fs.writeFileSync("c:/studyforward/frontend/components/learning/types.ts", typesCode, "utf8");
console.log("Types fixed in types.ts");


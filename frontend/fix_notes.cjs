const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/notes/NotesView.tsx", "utf8");

code = code.replace(
  /if \(note\.targetType === 'video' \|\| note\.targetType === 'dictation' \|\| note\.targetType === 'shadowing'\)/,
  "if (String(note.targetType) === 'video' || String(note.targetType) === 'dictation' || String(note.targetType) === 'shadowing')"
).replace(/''/g, "'");

fs.writeFileSync("c:/studyforward/frontend/components/learning/notes/NotesView.tsx", code, "utf8");
console.log("NotesView fixed");


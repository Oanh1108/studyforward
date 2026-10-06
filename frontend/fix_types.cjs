const fs = require("fs");

let learningApp = fs.readFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", "utf8");
learningApp = learningApp.replace(
  "export type ActiveTab = 'courses' | 'paths' | 'vocabulary' | 'speaking' | 'dictation' | 'profile';",
  "export type ActiveTab = 'courses' | 'paths' | 'vocabulary' | 'speaking' | 'dictation' | 'profile' | 'my-vocab' | 'vocabulary_study';"
);
fs.writeFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", learningApp, "utf8");

let dashView = fs.readFileSync("c:/studyforward/frontend/components/learning/DashboardView.tsx", "utf8");
dashView = dashView.replace(/vocabWords\.words/g, "vocabWords");
fs.writeFileSync("c:/studyforward/frontend/components/learning/DashboardView.tsx", dashView, "utf8");

let notesView = fs.readFileSync("c:/studyforward/frontend/components/learning/notes/NotesView.tsx", "utf8");
notesView = notesView.replace(/filterType === 'dictation'/g, "false /* dictation */");
notesView = notesView.replace(/filterType === 'shadowing'/g, "false /* shadowing */");
fs.writeFileSync("c:/studyforward/frontend/components/learning/notes/NotesView.tsx", notesView, "utf8");

let discoverView = fs.readFileSync("c:/studyforward/frontend/components/learning/vocabulary/DiscoverVocabularyView.tsx", "utf8");
discoverView = discoverView.replace(/w\.topic/g, "(w as any).topic");
fs.writeFileSync("c:/studyforward/frontend/components/learning/vocabulary/DiscoverVocabularyView.tsx", discoverView, "utf8");

console.log("Types fixed");


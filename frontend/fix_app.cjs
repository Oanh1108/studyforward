const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", "utf8");

code = code.replace(/onNavigate=\{setActiveTab\}/g, "onNavigate={(tab: any) => setActiveTab(tab)}");
code = code.replace(/onSelectTab=\{setActiveTab\}/g, "onSelectTab={(tab: any) => setActiveTab(tab)}");
code = code.replace(/onNavigateTab=\{setActiveTab\}/g, "onNavigateTab={(tab: any) => setActiveTab(tab)}");

fs.writeFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", code, "utf8");
console.log("LearningPlatformApp fixed");


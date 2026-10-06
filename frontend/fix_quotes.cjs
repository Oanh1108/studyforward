const fs = require("fs");
let learningApp = fs.readFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", "utf8");
learningApp = learningApp.replace(/''/g, "'");
fs.writeFileSync("c:/studyforward/frontend/components/learning/LearningPlatformApp.tsx", learningApp, "utf8");


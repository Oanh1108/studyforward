const fs = require("fs");
const path = require("path");

const routes = {
  paths: "paths",
  courses: "courses",
  dictation: "dictation",
  speaking: "speaking",
  analytics: "analytics",
  notes: "notes",
  todos: "todos",
  flights: "focus",
  "vocabulary/srs": "srs"
};

for (const [route, tab] of Object.entries(routes)) {
  const dirPath = path.join(__dirname, "app", route);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const content = `"use client";\n\nimport { LearningPlatformApp } from "@/components/learning/LearningPlatformApp";\n\nexport default function Page() {\n  return <LearningPlatformApp initialTab="${tab}" />;\n}\n`;
  fs.writeFileSync(path.join(dirPath, "page.tsx"), content);
}
console.log("Created missing routes");


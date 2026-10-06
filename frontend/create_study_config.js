const fs = require("fs");
const path = require("path");

const dirPath = path.join(__dirname, "app", "vocabulary", "study-config");
fs.mkdirSync(dirPath, { recursive: true });

const content = `"use client";\n\nimport { LearningPlatformApp } from "@/components/learning/LearningPlatformApp";\n\nexport default function Page() {\n  return <LearningPlatformApp initialTab="vocabulary_study" />;\n}\n`;
fs.writeFileSync(path.join(dirPath, "page.tsx"), content);
console.log("Created study-config route");


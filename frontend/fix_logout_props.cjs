const fs = require("fs");
const path = require("path");

function fixProps(filePath) {
  let code = fs.readFileSync(filePath, "utf8");
  
  // Remove variant="menu-item" showLabel={true}
  // Remove variant="icon"
  // Remove bgVariant="subtle"
  
  code = code.replace(/<LogoutButton[^>]*>/g, (match) => {
    return match
      .replace(/\s*variant="[^"]*"/g, "")
      .replace(/\s*showLabel=\{[^}]*\}/g, "")
      .replace(/\s*bgVariant="[^"]*"/g, "");
  });
  
  fs.writeFileSync(filePath, code, "utf8");
}

const files = [
  "c:/studyforward/frontend/components/learning/ProfileView.tsx",
  "c:/studyforward/frontend/components/learning/TopHeader.tsx",
  "c:/studyforward/frontend/components/learning/Navigation.tsx",
  "c:/studyforward/frontend/app/vocabulary/review/page.tsx",
  "c:/studyforward/frontend/app/placement-test/page.tsx",
  "c:/studyforward/frontend/app/listening/page.tsx",
  "c:/studyforward/frontend/app/listening/part/[id]/page.tsx",
  "c:/studyforward/frontend/app/farm/page.tsx",
  "c:/studyforward/frontend/app/exams/page.tsx",
];

for (const file of files) {
  if (fs.existsSync(file)) {
    fixProps(file);
    console.log("Fixed", file);
  }
}


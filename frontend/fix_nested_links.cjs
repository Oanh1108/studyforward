
const fs = require("fs");
const files = [
  "c:/studyforward/frontend/app/reset-password/page.tsx",
  "c:/studyforward/frontend/app/register/page.tsx",
  "c:/studyforward/frontend/app/login/page.tsx",
  "c:/studyforward/frontend/app/forgot-password/page.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  // The structure is:
  // <Link href="/" className="inline-flex items-center gap-2 transition-transform active:scale-95">
  //   <StudyForwardLogo size="md" />
  // </Link>
  // We want to replace it with just <StudyForwardLogo size="md" /> or add className to StudyForwardLogo if supported.
  // Actually, StudyForwardLogo already accepts className. Let's see if it does.
  // We can just replace the wrapping Link.
  
  content = content.replace(
    /<Link href="\/" className="inline-flex items-center gap-2 transition-transform active:scale-95">\s*<StudyForwardLogo size="md" \/>\s*<\/Link>/g,
    `<div className="inline-flex items-center gap-2 transition-transform active:scale-95">\n          <StudyForwardLogo size="md" />\n        </div>`
  );

  fs.writeFileSync(file, content, "utf8");
}
console.log("Fixed nested links");


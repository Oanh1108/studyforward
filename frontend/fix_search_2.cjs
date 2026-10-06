const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", "utf8");

// Fix the placeholder and the icon
code = code.replace(
  /<span className="absolute left-3 top-2.5 text-xs text-\[var\(--text-muted\)\]">\s*[^<]*\s*<\/span>/g,
  "<span className=\"absolute left-3 top-2.5 text-[var(--text-muted)]\">\n                            <Search size={16} />\n                          </span>"
);

code = code.replace(
  /placeholder="TAm kim trong th mc nAy..."/g,
  "placeholder=\"Tìm ki?m t? v?ng...\""
);

// We should also replace the unassigned folder search box
code = code.replace(
  /<span className="absolute left-2.5 top-2 text-xs text-\[var\(--text-muted\)\]">\s*[^<]*\s*<\/span>/g,
  "<span className=\"absolute left-2.5 top-2.5 text-[var(--text-muted)]\">\n                    <Search size={16} />\n                  </span>"
);

code = code.replace(
  /placeholder="TAm theo tAn th mc..."/g,
  "placeholder=\"Tìm theo tên thu m?c...\""
);

code = code.replace(
  /className="w-full pl-7 pr-7 py-1.5/g,
  "className=\"w-full pl-9 pr-7 py-2"
);


fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/MyVocabularyView.tsx", code, "utf8");
console.log("Search updated");


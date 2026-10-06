
const fs = require("fs");
const path = "c:/studyforward/frontend/components/learning/DashboardView.tsx";
let code = fs.readFileSync(path, "utf8");

// Width
code = code.replace(
  `className="space-y-6 pb-20 md:pb-8 animate-fade-up max-w-5xl mx-auto"`,
  `className="space-y-6 pb-20 md:pb-8 animate-fade-up max-w-[1200px] mx-auto w-full"`
);

// Emoji & Icon
code = code.replace(
  `<span className="text-xl">??</span>`,
  `<span className="text-xl text-amber-500">?</span>`
);

// Minutes
code = code.replace(
  `/{stats.dailyGoalMinutes}p</span>`,
  `/{stats.dailyGoalMinutes} phút</span>`
);

// Level badge - only show if exists
code = code.replace(
  `{/* Level badge */}\n        <div className="self-start sm:self-auto flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--brand-text)]">\n          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n          Level: {stats.currentLevel}\n        </div>`,
  `{/* Level badge */}\n        {stats.currentLevel && (\n          <div className="self-start sm:self-auto flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--brand-text)]">\n            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n            Level: {stats.currentLevel}\n          </div>\n        )}`
);

// Grid items-start
code = code.replace(
  `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">`,
  `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">`
);

// Min heights
code = code.replace(/min-h-\[300px\]/g, "min-h-[150px]");

// Rewrite the Due Words header and button
code = code.replace(
  /C?n ôn t?p ngay<\/p>\s*<p className="text-2xl font-black text-\[var\(--text-primary\)\]">\s*\{dueWords\.length\} <span className="text-base font-bold text-\[var\(--text-muted\)\]">t?<\/span>\s*<\/p>\s*<\/div>\s*\{overdueWords\.length > 0 && \(\s*<div className="flex items-center gap-1\.5 px-3 py-1\.5 bg-rose-100 dark:bg-rose-900\/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-bold">\s*<AlertCircle className="w-3\.5 h-3\.5" \/>\s*\{overdueWords\.length\} quá h?n\s*<\/div>\s*\)\}/,
  `C?n ôn t?p ngay</p>
                    <p className="text-xl md:text-2xl font-black text-[var(--text-primary)]">
                      {dueWords.length} t? {overdueWords.length > 0 && <span className="text-sm font-bold text-rose-500 ml-1">(g?m {overdueWords.length} quá h?n)</span>}
                    </p>
                  </div>
                  <div>
                    <button 
                      onClick={handleStudyDueWords}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm text-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Ôn ngay
                    </button>
                  </div>`
);

// Remove the old button at the bottom
code = code.replace(
  /<div className="p-3 border-t border-\[var\(--border\)\] bg-\[var\(--bg-card\)\]">\s*<button\s*onClick=\{handleStudyDueWords\}\s*className="w-full py-2\.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"\s*>\s*<Play className="w-4 h-4 fill-current" \/> Ôn ngay\s*<\/button>\s*<\/div>/,
  ""
);

fs.writeFileSync(path, code, "utf8");
console.log("Replaced");


const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /const \[typingInput, setTypingInput\] = useState\('\);/,
  `const [typingInput, setTypingInput] = useState('\`);
  const [synonymInput, setSynonymInput] = useState('\`);
  const [synonymChips, setSynonymChips] = useState<string[]>([]);
  const [isSynonymCorrect, setIsSynonymCorrect] = useState(false);
  const [missingSynonyms, setMissingSynonyms] = useState<string[]>([]);
  const [wrongSynonyms, setWrongSynonyms] = useState<string[]>([]);`
);

const setupOptionsRegex = /<div className="font-bold text-xs text-\[var\(--text-primary\)\]">Nghe & Vi?t<\/div>\s*<div className="text-\[10px\] text-\[var\(--text-muted\)\] line-clamp-2 mt-0.5">\s*Nghe phát âm và gõ l?i dúng chính t?\s*<\/div>[\s\S]*?<\/button>\s*<\/div>/;

const listeningSetupAdd = `
                {/* Synonym Test Mode for Listening */}
                {studyMode === 'listening' && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
                      Ki?m tra t? d?ng nghia
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([
                        { key: 'none' as SynonymTestMode, label: 'Không ki?m tra' },
                        { key: 'one' as SynonymTestMode, label: 'M?t t?' },
                        { key: 'all' as SynonymTestMode, label: 'T?t c?' },
                      ]).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSynonymTestMode(item.key)}
                          className={\`p-2 rounded-lg border text-center transition-all \${
                            synonymTestMode === item.key
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-indigo-300'
                          }\`}
                        >
                          <div className="font-bold text-[11px]">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
`;

code = code.replace(setupOptionsRegex, (match) => {
  return match + listeningSetupAdd;
});

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


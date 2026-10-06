const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

// We want to replace everything from `{(studyMode === 'typing' || studyMode === 'listening') && (` up to the end of the form.
// Actually it is safer to replace specific segments.

// 1. Add hideWordText={!typingSubmitted} to WordDisplay inside studyMode === 'listening'
code = code.replace(
  /hidePhoneticsForTest=\{true\} \/\/ Hide phonetic during test/,
  "hidePhoneticsForTest={true}\n                            hideWordText={!typingSubmitted}"
);

// 2. Add synonym inputs inside the form
const formInputCode = `
                      <div>
                        <input
                          ref={typingInputRef}
                          type="text"
                          value={typingInput}
                          onChange={(e) => setTypingInput(e.target.value)}
                          onCompositionStart={() => {
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={() => {
                            isComposingRef.current = false;
                          }}
                          disabled={typingSubmitted}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.ctrlKey && studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms) {
                              e.preventDefault();
                              document.getElementById("synonym-input")?.focus();
                            }
                          }}
                          placeholder={
                            studyMode === "listening"
                              ? \`Nh?p t? \${langInfo.name} b?n v?a nghe...\`
                              : isReversed
                              ? "Nh?p nghia ti?ng Vi?t..."
                              : \`Nh?p t? \${langInfo.name} dúng chính t?...\`
                          }
                          autoFocus
                          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                        />
                      </div>

                      {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                        <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
                            <span>Nh?p t? d?ng nghia</span>
                            <span>{synonymTestMode === "one" ? "(C?n 1 t?)" : \`(C?n \${currentWord.synonyms.split(/[,;=\\/]+/).length} t?)\`}</span>
                          </div>
                          
                          {synonymChips.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {synonymChips.map((chip, idx) => (
                                <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                  {chip}
                                  {!typingSubmitted && (
                                     <button type="button" onClick={() => setSynonymChips(chips => chips.filter((_, i) => i !== idx))} className="hover:text-indigo-900 ml-1">?</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!typingSubmitted && (
                            <input
                              id="synonym-input"
                              type="text"
                              value={synonymInput}
                              onChange={e => setSynonymInput(e.target.value)}
                              onCompositionStart={() => { isComposingRef.current = true; }}
                              onCompositionEnd={() => { isComposingRef.current = false; }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (e.ctrlKey) return; // let form submit
                                  e.preventDefault();
                                  if (synonymInput.trim()) {
                                    const items = synonymInput.split(/[,;]+|\\n/).map(s => s.trim()).filter(Boolean);
                                    setSynonymChips(prev => [...new Set([...prev, ...items])]);
                                    setSynonymInput("");
                                  }
                                }
                              }}
                              placeholder="Nh?p d?ng nghia r?i nh?n Enter... (Ctrl+Enter d? n?p bài)"
                              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      )}
`;

code = code.replace(
  /<div>\s*<input\s*ref=\{typingInputRef\}[\s\S]*?text-center"\s*\/>\s*<\/div>/,
  formInputCode.trim()
);

// 3. Add synonym result display in the submitted results block
const resultAddCode = `
                            {showPhonetics && getPrimaryReading(currentWord as any) && (
                              <div>
                                <span className="text-[var(--text-muted)]">Cách d?c: </span>
                                <span className="font-mono text-[var(--text-secondary)]">
                                  {getPrimaryReading(currentWord as any)}
                                </span>
                              </div>
                            )}
                            
                            {studyMode === "listening" && synonymTestMode !== "none" && currentWord.synonyms && (
                              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                <div className="font-bold mb-1">
                                  Ð?ng nghia: <span className={isSynonymCorrect ? "text-emerald-600" : "text-rose-600"}>{isSynonymCorrect ? "? Ð?t" : "? Chua d?t"}</span>
                                </div>
                                {missingSynonyms.length > 0 && (
                                  <div>
                                    <span className="text-[var(--text-muted)]">Thi?u: </span>
                                    <span className="font-semibold text-rose-600">{missingSynonyms.join(", ")}</span>
                                  </div>
                                )}
                                {wrongSynonyms.length > 0 && (
                                  <div>
                                    <span className="text-[var(--text-muted)]">Sai: </span>
                                    <span className="font-semibold text-rose-600">{wrongSynonyms.join(", ")}</span>
                                  </div>
                                )}
                                <div>
                                   <span className="text-[var(--text-muted)]">T?t c? dáp án: </span>
                                   <span className="font-semibold text-[var(--text-primary)]">{currentWord.synonyms}</span>
                                </div>
                              </div>
                            )}
`;

code = code.replace(
  /\{showPhonetics && getPrimaryReading\(currentWord as any\) && \([\s\S]*?\}\)/,
  resultAddCode.trim()
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced successfully");


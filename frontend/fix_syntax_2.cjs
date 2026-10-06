const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /\s*\}\)<\/span>\s*<\/button>\s*\)\}\s*/,
  `
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleNextTypingWord}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 cursor-pointer"
                            autoFocus
                          >
                            Câu ti?p theo ? [Enter]
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                `
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Replaced correctly this time");


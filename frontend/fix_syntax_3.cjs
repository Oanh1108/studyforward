const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const fromText = `                                </div>
                              </div>
                            )}</span>
                  </button>
                )}`;

const toText = `                                </div>
                              </div>
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
                )}`;

if (code.includes(fromText)) {
  code = code.replace(fromText, toText);
  fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
  console.log("Replaced successfully using exact text");
} else {
  console.log("Could not find the exact text");
}


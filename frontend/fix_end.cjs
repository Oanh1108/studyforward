const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const fixedEnd = `                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ==========================================
                PHASE 3: SUMMARY
               ========================================== */}
            {phase === "summary" && (
              <div className="space-y-6 animate-fade-in text-center p-6">
                <div className="text-4xl mb-4">??</div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Tuy?t v?i, b?n dã hoàn thành!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  K?t qu?: <span className="font-bold text-indigo-600 dark:text-indigo-400">{studyHistory.filter(h => h.isCorrect).length}</span> / {deck.length} câu dúng.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setPhase("setup")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] font-bold text-xs transition-colors cursor-pointer"
                  >
                    ?? H?c ti?p bu?i m?i
                  </button>

                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    V? thu m?c / Ðóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      {/* Confirmation Modal when user exits mid-session */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl text-center">
            <div className="text-2xl">??</div>
            <h4 className="text-base font-bold text-[var(--text-primary)]">T?m d?ng bu?i h?c?</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Ti?n d? câu {currentIndex + 1}/{deck.length} dã du?c luu an toàn. B?n có th? quay l?i ti?p t?c b?t c? lúc nào t? trang ch? ho?c thu m?c.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                H?c ti?p
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmOpen(false);
                  onClose?.();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Luu & Thoát ra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

// Replace everything from `</form>` to the end of the file
const index = code.lastIndexOf("</form>");
if (index !== -1) {
  code = code.substring(0, index) + fixedEnd;
  fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
  console.log("Replaced successfully");
} else {
  console.log("Could not find </form>");
}


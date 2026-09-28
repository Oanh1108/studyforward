const questions = [
  {
    id: 1,
    part: "Part 5",
    text: "The new marketing strategy _______ significant results within the first quarter.",
    options: ["produces", "produced", "has produced", "producing"],
  },
  {
    id: 2,
    part: "Part 5",
    text: "All employees are required to _______ the company's code of conduct.",
    options: ["comply with", "comply to", "comply at", "comply for"],
  },
  {
    id: 3,
    part: "Part 5",
    text: "The report was submitted _______ the deadline, which impressed the client.",
    options: ["before", "after", "during", "while"],
  },
  {
    id: 4,
    part: "Part 5",
    text: "Mr. Johnson was _______ surprised by the positive feedback from shareholders.",
    options: ["pleasant", "pleasantly", "pleasure", "pleased"],
  },
];

export default function ExamPage({ params }: { params: { id: string } }) {
  const answered = [1, 3]; // mock answered

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-subtle)" }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-20 w-full backdrop-blur-md"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <div className="w-full px-6 sm:px-8 h-14 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              TOEIC Practice Test {params.id}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {answered.length}/{questions.length} câu đã trả lời
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(answered.length / questions.length) * 100}%`, background: "var(--brand)" }} />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {Math.round((answered.length / questions.length) * 100)}%
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm"
              style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              ⏱ 1:58:42
            </div>

            <button className="btn-primary px-4 py-2 text-sm">Nộp bài</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">

        {/* Questions list */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            <span>Part 5</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span style={{ color: "var(--text-muted)" }}>Incomplete Sentences</span>
          </div>

          {questions.map((q) => (
            <div key={q.id} className="card p-6">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{
                    background: answered.includes(q.id) ? "var(--brand)" : "var(--bg-muted)",
                    color: answered.includes(q.id) ? "white" : "var(--text-muted)",
                  }}>
                  {q.id}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>
                    {q.text}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, i) => {
                      const label = String.fromCharCode(65 + i);
                      return (
                        <label key={opt}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                          style={{
                            border: "1.5px solid var(--border)",
                            background: "var(--bg-subtle)",
                          }}>
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: "var(--border)" }}>
                            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigator */}
        <aside className="w-52 flex-shrink-0">
          <div className="card p-4 sticky top-20">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              ĐIỀU HƯỚNG CÂU HỎI
            </h3>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {Array.from({ length: 20 }, (_, i) => (
                <button key={i}
                  className="w-8 h-8 text-xs font-semibold rounded-lg transition-all"
                  style={{
                    background: answered.includes(i + 1) ? "var(--brand)" : "var(--bg-muted)",
                    color: answered.includes(i + 1) ? "white" : "var(--text-muted)",
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="w-3 h-3 rounded" style={{ background: "var(--brand)" }} />
                Đã trả lời ({answered.length})
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="w-3 h-3 rounded" style={{ background: "var(--bg-muted)" }} />
                Chưa làm ({20 - answered.length})
              </div>
            </div>

            <button className="btn-primary w-full py-2 text-sm mt-4">Nộp bài</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

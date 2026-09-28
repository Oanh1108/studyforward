import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

const exams = [
  { id: 1, name: "TOEIC Practice Test 1", questions: 200, duration: 120, level: "Trung cấp", attempts: 1250, avgScore: 680 },
  { id: 2, name: "TOEIC Practice Test 2", questions: 200, duration: 120, level: "Trung cấp", attempts: 980,  avgScore: 655 },
  { id: 3, name: "Mini Test – Listening Part 1–2", questions: 32, duration: 25, level: "Cơ bản",   attempts: 2100, avgScore: 78 },
  { id: 4, name: "Mini Test – Reading Part 5",     questions: 40, duration: 25, level: "Cơ bản",   attempts: 1800, avgScore: 82 },
  { id: 5, name: "TOEIC Advanced Full Test",       questions: 200, duration: 120, level: "Nâng cao", attempts: 430,  avgScore: 820 },
  { id: 6, name: "Vocabulary Sprint Test",         questions: 30,  duration: 15, level: "Cơ bản",   attempts: 3200, avgScore: 24 },
];

const levelStyle: Record<string, { bg: string; text: string }> = {
  "Cơ bản":   { bg: "var(--success-light)", text: "var(--success)" },
  "Trung cấp":{ bg: "var(--warning-light)", text: "var(--warning)" },
  "Nâng cao": { bg: "var(--danger-light)",  text: "var(--danger)"  },
};

const filters = ["Tất cả", "Cơ bản", "Trung cấp", "Nâng cao", "Mini Test"];

export default function ExamsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-subtle)" }}>
      <header style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        className="sticky top-0 z-10 w-full backdrop-blur-md">
        <div className="w-full px-6 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span>🎓</span>
              <span className="font-bold text-sm" style={{ color: "var(--brand)" }}>StudyForward</span>
            </Link>
            <Link href="/dashboard" className="text-sm" style={{ color: "var(--text-muted)" }}>
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <LogoutButton bgVariant="subtle" />
            <ThemeToggle variant="subtle" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Đề thi</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Chọn đề thi phù hợp với trình độ của bạn
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f, i) => (
            <button key={f}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={i === 0
                ? { background: "var(--brand)", color: "white" }
                : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
              }>
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const ls = levelStyle[exam.level];
            return (
              <div key={exam.id} className="card card-hover flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                      {exam.name}
                    </h3>
                    <span className="badge flex-shrink-0" style={{ background: ls.bg, color: ls.text }}>
                      {exam.level}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    <span>📝 {exam.questions} câu</span>
                    <span>⏱ {exam.duration} phút</span>
                    <span>👥 {exam.attempts.toLocaleString()} lượt</span>
                  </div>

                  <div className="flex items-center justify-between text-xs"
                    style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    <span style={{ color: "var(--text-muted)" }}>Điểm TB cộng đồng</span>
                    <span className="font-bold" style={{ color: "var(--brand)" }}>{exam.avgScore}</span>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <Link href={`/exams/${exam.id}`}
                    className="btn-primary block text-center py-2 text-sm">
                    Bắt đầu làm bài
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

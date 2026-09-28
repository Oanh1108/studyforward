"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

const stats = [
  { label: "Bài đã làm",    value: "24",  icon: "📝", change: "+3 tuần này",   color: "var(--brand)" },
  { label: "Điểm TB",       value: "650", icon: "🎯", change: "+45 điểm",      color: "var(--success)" },
  { label: "Từ đã học",     value: "320", icon: "📚", change: "+28 hôm nay",   color: "#8b5cf6" },
  { label: "Ngày streak",   value: "7",   icon: "🔥", change: "Tiếp tục nào!", color: "var(--warning)" },
];

const navItems = [
  { href: "/dashboard",  icon: "🏠", label: "Dashboard"    },
  { href: "/exams",      icon: "📝", label: "Đề thi"       },
  { href: "/vocabulary", icon: "📚", label: "Từ vựng"      },
  { href: "/listening",  icon: "🎧", label: "Luyện nghe"   },
  { href: "/results",    icon: "📊", label: "Kết quả"      },
  { href: "/leaderboard",icon: "🏆", label: "Xếp hạng"     },
];

const recentExams = [
  { name: "TOEIC Practice Test 1", score: 720, maxScore: 990, date: "20/09", change: "+45", part: "Full test" },
  { name: "Mini Test – Listening", score: 185, maxScore: 495, date: "18/09", change: "+12", part: "Listening" },
  { name: "Mini Test – Part 5",    score: 38,  maxScore: 40,  date: "15/09", change: "+5",  part: "Reading"  },
];

interface GreetingInfo {
  greeting: string;
  icon: string;
  subGreeting: string;
}

function getGreeting(hours: number): GreetingInfo {
  if (hours >= 5 && hours < 11) {
    return {
      greeting: "Chào buổi sáng",
      icon: "🌅",
      subGreeting: "Chúc bạn một ngày mới tràn đầy năng lượng và học tập hiệu quả!",
    };
  }
  if (hours >= 11 && hours < 14) {
    return {
      greeting: "Chào buổi trưa",
      icon: "☀️",
      subGreeting: "Nghỉ trưa nạp lại năng lượng hoặc ôn nhanh vài từ vựng nhé!",
    };
  }
  if (hours >= 14 && hours < 18) {
    return {
      greeting: "Chào buổi chiều",
      icon: "🌤️",
      subGreeting: "Tiếp tục duy trì phong độ và hoàn thành mục tiêu luyện thi hôm nay nào!",
    };
  }
  if (hours >= 18 && hours < 23) {
    return {
      greeting: "Chào buổi tối",
      icon: "🌙",
      subGreeting: "Thời gian vàng để luyện đề và củng cố kiến thức TOEIC!",
    };
  }
  // 23h - 4h59
  return {
    greeting: "Cú đêm chăm chỉ",
    icon: "🦉",
    subGreeting: "Ôn tập nhẹ nhàng và nhớ nghỉ ngơi sớm để giữ gìn sức khỏe nhé!",
  };
}

export default function DashboardPage() {
  const [greetingInfo, setGreetingInfo] = useState<GreetingInfo>(() => {
    const currentHour = new Date().getHours();
    return getGreeting(currentHour);
  });
  const [userProfile, setUserProfile] = useState<{ name?: string; goal?: number } | null>(null);

  useEffect(() => {
    const updateTimeGreeting = () => {
      const currentHour = new Date().getHours();
      setGreetingInfo(getGreeting(currentHour));
    };

    updateTimeGreeting();
    const interval = setInterval(updateTimeGreeting, 60000);

    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserProfile(parsed);
      }
    } catch {
      // Ignore JSON parse errors
    }

    return () => clearInterval(interval);
  }, []);

  const displayName = userProfile?.name
    ? userProfile.name.trim().split(" ").slice(-1)[0]
    : "";

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-subtle)" }}>

      {/* Sidebar */}
      <aside className="w-60 min-h-screen flex-shrink-0 fixed top-0 left-0 flex flex-col"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <span className="font-bold" style={{ color: "var(--brand)" }}>StudyForward</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ color: "var(--text-secondary)" }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all flex-1 min-w-0"
            style={{ background: "var(--bg-subtle)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: "var(--brand)" }}>
              {userProfile?.name ? userProfile.name.trim().charAt(0).toUpperCase() : "N"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {userProfile?.name || "Học viên"}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Mục tiêu {userProfile?.goal ? `${userProfile.goal}+` : "750+"}
              </div>
            </div>
          </div>
          <LogoutButton variant="icon" />
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <span>
                {greetingInfo.greeting}
                {displayName ? `, ${displayName}` : ""}
              </span>
              <span>{greetingInfo.icon}</span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {greetingInfo.subGreeting}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all duration-200 text-base leading-none cursor-pointer hover:shadow hover:border-blue-400/50"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
              title="Thông báo"
              aria-label="Thông báo"
            >
              🔔
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
                  {s.change}
                </span>
              </div>
              <div className="text-2xl font-extrabold mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link href="/exams/new"
            className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)" }}>
            <span className="text-4xl shrink-0">🚀</span>
            <div>
              <h3 className="text-base font-bold text-white mb-0.5">Làm bài thi ngay</h3>
              <p className="text-blue-100 text-xs">Đề thi TOEIC chuẩn format mới nhất</p>
            </div>
          </Link>
          <Link href="/vocabulary"
            className="card card-hover p-5 flex items-center gap-4">
            <span className="text-4xl shrink-0">📚</span>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Ôn từ vựng</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Flashcard & Mini Games Leitner</p>
            </div>
          </Link>
          <Link href="/listening"
            className="card card-hover p-5 flex items-center gap-4 relative overflow-hidden group">
            <span className="text-4xl shrink-0 group-hover:scale-110 transition-transform">🎧</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Luyện nghe TOEIC</h3>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-500/15 text-blue-500 rounded-md">Mới</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Part 1-4 & Chép chính tả (Dictation)</p>
            </div>
          </Link>
        </div>

        {/* Recent exams table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Bài thi gần đây</h2>
            <Link href="/results" className="text-xs font-medium" style={{ color: "var(--brand)" }}>
              Xem tất cả →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  {["Tên đề", "Phần thi", "Điểm", "Thay đổi", "Ngày"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentExams.map((e, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}
                    className="transition-colors hover:bg-opacity-50">
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{e.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge" style={{ background: "var(--brand-light)", color: "var(--brand-text)" }}>
                        {e.part}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>{e.score}</span>
                      <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>/{e.maxScore}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>{e.change}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

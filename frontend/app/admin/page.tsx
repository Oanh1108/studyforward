"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (!user || user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setUserName(user.name || "Admin");
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-6">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-[var(--brand)]">
          <span className="text-xl">🎓</span>
          StudyForward Admin
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--text-secondary)] sm:block">Xin chào, {userName}</span>
          <LogoutButton bgVariant="subtle" />
          <ThemeToggle variant="subtle" />
        </div>
      </header>

      <main className="w-full p-6 md:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Admin workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Tổng quan hệ thống</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Quản lý người dùng, khóa học và hoạt động học tập.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Người dùng", "1,248", "Tài khoản đã đăng ký"],
            ["Bài thi", "86", "Đề thi đang hoạt động"],
            ["Từ vựng", "640", "Từ TOEIC và IELTS"],
          ].map(([label, value, detail]) => (
            <div key={label} className="card p-6">
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              <p className="mt-3 text-3xl font-black text-[var(--brand)]">{value}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</p>
            </div>
          ))}
        </div>

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold">Khu vực quản trị</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["Quản lý người dùng", "Quản lý đề thi", "Quản lý từ vựng"].map((item) => (
              <button key={item} type="button" className="btn-ghost px-4 py-3 text-left text-sm">
                {item}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

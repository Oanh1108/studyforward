"use client";

import { useTheme } from "@/lib/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  variant?: "card" | "subtle";
}

export function ThemeToggle({ className = "", variant = "card" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const bg = variant === "subtle" ? "var(--bg-subtle)" : "var(--bg-card)";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all duration-200 text-base leading-none cursor-pointer hover:shadow hover:border-blue-400/50 ${className}`}
      style={{
        borderColor: "var(--border)",
        background: bg,
        color: "var(--text-primary)",
      }}
      aria-label="Toggle theme"
      title={theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

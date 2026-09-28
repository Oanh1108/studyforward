"use client";

import { useState } from "react";

interface LogoutButtonProps {
  className?: string;
  variant?: "ghost" | "icon" | "danger";
  bgVariant?: "card" | "subtle";
  showLabel?: boolean;
}

export function LogoutButton({
  className = "",
  variant = "icon",
  bgVariant = "card",
  showLabel = false,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      try {
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const bg = bgVariant === "subtle" ? "var(--bg-subtle)" : "var(--bg-card)";

  if (variant === "icon" || !showLabel) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all duration-200 text-base leading-none cursor-pointer hover:shadow hover:bg-red-500/10 hover:border-red-300 ${className}`}
        style={{ borderColor: "var(--border)", background: bg }}
        title="Đăng xuất"
        aria-label="Đăng xuất"
      >
        {isLoggingOut ? "⏳" : "🚪"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 ${className}`}
      style={{ borderColor: "var(--border)", background: bg }}
      title="Đăng xuất"
    >
      <span>{isLoggingOut ? "⏳" : "🚪"}</span>
      <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
    </button>
  );
}

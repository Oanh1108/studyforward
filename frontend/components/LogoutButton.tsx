"use client";

import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { LogOut, Loader2 } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function LogoutButton({
  className = "",
  showLabel = false,
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError("Đăng xuất thất bại.");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`relative shrink-0 flex items-center ${showLabel ? 'w-full' : 'justify-center'}`}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`${showLabel ? 'w-full px-4 py-2 justify-start gap-2 text-sm font-semibold' : 'w-10 h-10 justify-center'} shrink-0 flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${className}`}
        title="Đăng xuất"
        aria-label="Đăng xuất"
      >
        {isLoggingOut ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin text-rose-500" />
        ) : (
          <LogOut className="w-[18px] h-[18px]" />
        )}
        {showLabel && <span>Đăng xuất</span>}
      </button>
      {logoutError && (
        <div className="absolute right-0 bottom-full mb-1.5 p-2 bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 rounded-lg text-[10px] text-rose-600 dark:text-rose-400 whitespace-nowrap shadow-lg z-50 flex items-center gap-1.5">
          <span>{logoutError}</span>
          <button onClick={handleLogout} className="underline font-bold text-rose-700 dark:text-rose-300">Thử lại</button>
        </div>
      )}
    </div>
  );
}

export default LogoutButton;

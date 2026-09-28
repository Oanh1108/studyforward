"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<Record<string, string>>({});

  const getRememberedAccounts = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem("rememberedAccounts");
      const accounts: Record<string, string> = data ? JSON.parse(data) : {};
      const singleEmail = localStorage.getItem("rememberedEmail");
      const singlePass = localStorage.getItem("rememberedPassword");
      if (singleEmail && singlePass && !accounts[singleEmail.trim().toLowerCase()]) {
        accounts[singleEmail.trim().toLowerCase()] = singlePass;
      }
      return accounts;
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      router.replace("/dashboard");
      return;
    }
    setRegistered(new URLSearchParams(window.location.search).get("registered") === "1");

    const accounts = getRememberedAccounts();
    setSavedAccounts(accounts);

    const lastEmail = localStorage.getItem("lastRememberedEmail") || localStorage.getItem("rememberedEmail") || "";
    const normalizedLast = lastEmail.trim().toLowerCase();

    if (normalizedLast && accounts[normalizedLast]) {
      setEmail(lastEmail);
      setPassword(accounts[normalizedLast]);
      setRememberMe(true);
    } else {
      const entries = Object.entries(accounts);
      if (entries.length > 0) {
        setEmail(entries[0][0]);
        setPassword(entries[0][1]);
        setRememberMe(true);
      }
    }
  }, [router]);

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    const normalized = newEmail.trim().toLowerCase();
    const accounts = Object.keys(savedAccounts).length > 0 ? savedAccounts : getRememberedAccounts();

    if (normalized && accounts[normalized]) {
      // Khi email trùng khớp với tài khoản đã lưu, lập tức điền mật khẩu tương ứng
      setPassword(accounts[normalized]);
      setRememberMe(true);
    } else {
      // Khi chuyển sang email khác không có lưu mật khẩu:
      // Tự động xoá mật khẩu của tài khoản cũ để tránh lưu sai hoặc lộ mật khẩu
      const isSavedPass = Object.values(accounts).includes(password);
      if (isSavedPass || !normalized) {
        setPassword("");
        setRememberMe(false);
      }
    }
  };

  const handleEmailBlur = () => {
    const normalized = email.trim().toLowerCase();
    const accounts = Object.keys(savedAccounts).length > 0 ? savedAccounts : getRememberedAccounts();

    if (normalized && accounts[normalized]) {
      setPassword(accounts[normalized]);
      setRememberMe(true);
    } else {
      const isSavedPass = Object.values(accounts).includes(password);
      if (isSavedPass) {
        setPassword("");
        setRememberMe(false);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        throw new Error(message || "Email hoặc mật khẩu không đúng.");
      }

      const normalizedEmail = email.trim().toLowerCase();
      const accounts = getRememberedAccounts();

      if (rememberMe) {
        accounts[normalizedEmail] = password;
        localStorage.setItem("rememberedAccounts", JSON.stringify(accounts));
        localStorage.setItem("lastRememberedEmail", email);
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
        localStorage.setItem("rememberMe", "true");
        setSavedAccounts(accounts);
      } else {
        delete accounts[normalizedEmail];
        localStorage.setItem("rememberedAccounts", JSON.stringify(accounts));
        if (localStorage.getItem("lastRememberedEmail")?.trim().toLowerCase() === normalizedEmail) {
          localStorage.removeItem("lastRememberedEmail");
        }
        if (localStorage.getItem("rememberedEmail")?.trim().toLowerCase() === normalizedEmail) {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
        setSavedAccounts(accounts);
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push(data.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Không thể đăng nhập. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-subtle)" }}>

      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 flex-shrink-0"
        style={{ background: "linear-gradient(160deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)" }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-xl font-bold text-white">StudyForward</span>
        </Link>
        <div>
          <div className="text-4xl font-extrabold text-white leading-tight mb-4">
            Chào mừng<br />trở lại 👋
          </div>
          <p className="text-blue-200 text-base leading-relaxed">
            Tiếp tục hành trình chinh phục TOEIC của bạn. Mỗi ngày luyện tập là một bước tiến.
          </p>
          {/* Testimonial */}
          <div className="mt-10 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-white text-sm leading-relaxed mb-3">
              "Sau 3 tháng dùng TOEIC Master, điểm tôi tăng từ 550 lên 820. Hệ thống luyện tập rất hiệu quả!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">N</div>
              <div>
                <div className="text-white text-sm font-semibold">Nguyễn Minh Khoa</div>
                <div className="text-blue-200 text-xs">Đạt 820 TOEIC · 2026</div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-blue-300 text-sm">© 2026 StudyForward</div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-10 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="font-bold" style={{ color: "var(--brand)" }}>StudyForward</span>
            </Link>
            <ThemeToggle />
          </div>
          <div className="hidden lg:flex justify-end mb-6">
            <ThemeToggle />
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Đăng nhập</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "var(--brand)" }}>Đăng ký miễn phí</Link>
          </p>

          {registered && (
            <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ.
            </p>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                type="email"
                list="saved-emails-list"
                placeholder="example@email.com"
                className="input"
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                onBlur={handleEmailBlur}
                autoComplete="email"
                required
              />
              {Object.keys(savedAccounts).length > 0 && (
                <datalist id="saved-emails-list">
                  {Object.keys(savedAccounts).map((acc) => (
                    <option key={acc} value={acc} />
                  ))}
                </datalist>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                />
                <span>Ghi nhớ mật khẩu</span>
              </label>
              <Link href="/forgot-password" className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
                Quên mật khẩu?
              </Link>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3 mt-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>hoặc</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <button className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Tiếp tục với Google
          </button>
        </div>
      </div>
    </div>
  );
}

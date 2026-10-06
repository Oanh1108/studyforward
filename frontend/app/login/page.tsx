"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StudyForwardLogo } from "@/components/StudyForwardLogo";
import { useAuth } from "@/lib/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rememberMe") === "true";
    }
    return false;
  });
  const [showPassword, setShowPassword] = useState(false);

  // Field-level error messages
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  // General form error (e.g. invalid credentials or rate limiting)
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("registered") === "1") {
        setRegisteredSuccess(true);
      }
      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        setRedirectUrl(redirect);
      }
      const errorParam = searchParams.get("error");
      if (errorParam) {
        setGeneralError(decodeURIComponent(errorParam));
      }
    }
  }, []);

  useEffect(() => {
    // If already authenticated, redirect to dashboard or target
    if (!authLoading && isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, authLoading, redirectUrl, router]);

  // Validate form fields before submitting
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = "Vui lòng nhập địa chỉ email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.email = "Email không đúng định dạng (ví dụ: yourname@gmail.com).";
      }
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      errors.password = "Mật khẩu phải chứa tối thiểu 8 ký tự.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);

      if (!result.success) {
        setGeneralError(result.error || "Email hoặc mật khẩu không chính xác.");
        setIsSubmitting(false);
        return;
      }

      // Success -> navigate to destination
      router.push(redirectUrl);
    } catch {
      setGeneralError("Đã có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
      
      {/* Top Bar for Mobile / Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 transition-transform active:scale-95">
          <StudyForwardLogo size="md" />
        </div>
        <ThemeToggle />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Đăng nhập
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Tiếp tục lộ trình học tiếng Anh và giữ vững chuỗi ngày học của bạn.
          </p>
        </div>

        {/* Registered Success Banner */}
        {registeredSuccess && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-2.5 animate-fade-up">
            <span className="text-lg">🎉</span>
            <div>
              <strong className="font-bold">Đăng ký tài khoản thành công!</strong>
              <div className="text-xs mt-0.5">Vui lòng nhập thông tin đăng nhập bên dưới để bắt đầu học.</div>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {generalError && (
          <div
            className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-2.5 animate-fade-up"
            role="alert"
          >
            <span className="text-lg">⚠️</span>
            <div>
              <strong className="font-bold">Đăng nhập thất bại</strong>
              <div className="text-xs mt-0.5 leading-relaxed">{generalError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          
          {/* Email field */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
            >
              Địa chỉ Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="tenban@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={isSubmitting}
              className={`input w-full ${
                fieldErrors.email ? "border-rose-500 focus:border-rose-500 ring-rose-500/20" : ""
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <span>•</span> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
              >
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Tối thiểu 8 ký tự"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                disabled={isSubmitting}
                className={`input w-full pr-11 ${
                  fieldErrors.password ? "border-rose-500 focus:border-rose-500 ring-rose-500/20" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <span>•</span> {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Remember me checkbox (30 days safe session) */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Ghi nhớ đăng nhập (duy trì phiên 30 ngày)
              </span>
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập vào StudyForward</span>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-[1px] bg-[var(--border)] flex-1"></div>
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Hoặc</span>
          <div className="h-[1px] bg-[var(--border)] flex-1"></div>
        </div>

        <button
          onClick={() => {
            setIsGoogleSubmitting(true);
            const fallbackUrl = process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002';
            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || fallbackUrl).replace(/\/+$/, '');
            window.location.href = `${baseUrl}/api/auth/google`;
          }}
          disabled={isGoogleSubmitting || isSubmitting}
          className="w-full mt-6 py-3.5 px-4 rounded-xl border border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 text-[var(--text-primary)] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3"
        >
          {isGoogleSubmitting ? (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>Tiếp tục với Google</span>
        </button>

        {/* Link to Register */}
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
          Chưa có tài khoản học viên?{" "}
          <Link
            href="/register"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            Đăng ký miễn phí ngay →
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-[var(--text-muted)] mt-6">
        © 2026 StudyForward. Học tiếng Anh giao tiếp & luyện thi thông minh.
      </div>
    </div>
  );
}

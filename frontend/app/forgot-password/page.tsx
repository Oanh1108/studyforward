"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StudyForwardLogo } from "@/components/StudyForwardLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002');

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const validateEmail = (val: string) => {
    if (!val.trim()) return "Vui lòng nhập địa chỉ email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()))
      return "Email không đúng định dạng.";
    return "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError("");
    setStatus("submitting");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
        setErrorMsg(msg || "Đã xảy ra lỗi. Vui lòng thử lại.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setErrorMsg("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
        <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 transition-transform active:scale-95">
          <StudyForwardLogo size="md" />
        </div>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl animate-fade-up text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] mb-3">Kiểm tra email của bạn</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
            Nếu địa chỉ <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu.
            Liên kết có hiệu lực trong <strong>1 giờ</strong>.
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Không thấy email? Hãy kiểm tra thư mục spam hoặc thử lại.
          </p>
          <button
            onClick={() => { setStatus("idle"); setEmail(""); }}
            className="w-full py-3 px-4 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm hover:border-[var(--brand)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-light)] transition-all mb-3"
          >
            Thử lại với email khác
          </button>
          <Link href="/login" className="block text-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 transition-transform active:scale-95">
          <StudyForwardLogo size="md" />
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Quên mật khẩu?
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
          </p>
        </div>

        {status === "error" && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-2.5 animate-fade-up" role="alert">
            <span className="text-lg">⚠️</span>
            <div>
              <strong className="font-bold">Gửi email thất bại</strong>
              <div className="text-xs mt-0.5 leading-relaxed">{errorMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Địa chỉ Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="tenban@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
                if (status === "error") setStatus("idle");
              }}
              disabled={status === "submitting"}
              className={`input w-full ${emailError ? "border-rose-500 focus:border-rose-500" : ""}`}
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <span>•</span> {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {status === "submitting" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <span>Gửi liên kết đặt lại mật khẩu</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
          Đã nhớ mật khẩu?{" "}
          <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[var(--text-muted)] mt-6">
        © 2026 StudyForward. Học tiếng Anh giao tiếp & luyện thi thông minh.
      </div>
    </div>
  );
}

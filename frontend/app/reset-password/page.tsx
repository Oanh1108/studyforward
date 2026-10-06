"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type FormEvent, Suspense } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StudyForwardLogo } from "@/components/StudyForwardLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    }
  }, [token]);

  const validate = () => {
    const errors: { new?: string; confirm?: string } = {};
    if (!newPassword) errors.new = "Vui lòng nhập mật khẩu mới.";
    else if (newPassword.length < 8) errors.new = "Mật khẩu phải có ít nhất 8 ký tự.";

    if (!confirmPassword) errors.confirm = "Vui lòng nhập lại mật khẩu.";
    else if (confirmPassword !== newPassword) errors.confirm = "Mật khẩu nhập lại không khớp.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
        setErrorMsg(msg || "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.");
        setStatus("error");
        return;
      }

      setStatus("success");
      // Redirect to login after 3s
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setErrorMsg("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl animate-fade-up text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)] mb-3">Mật khẩu đã được đặt lại!</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
          Mật khẩu của bạn đã được cập nhật thành công. Bạn sẽ được chuyển đến trang đăng nhập trong vài giây...
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
        >
          Đăng nhập ngay →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Đặt mật khẩu mới
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          Tạo mật khẩu mới an toàn, ít nhất 8 ký tự.
        </p>
      </div>

      {(status === "error" || !token) && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-2.5 animate-fade-up" role="alert">
          <span className="text-lg">⚠️</span>
          <div>
            <strong className="font-bold">Không thể đặt lại mật khẩu</strong>
            <div className="text-xs mt-0.5 leading-relaxed">{errorMsg}</div>
            {!token && (
              <Link href="/forgot-password" className="text-xs font-semibold underline mt-1 block">
                Yêu cầu liên kết mới →
              </Link>
            )}
          </div>
        </div>
      )}

      {token && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* New password */}
          <div>
            <label htmlFor="reset-new-password" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showNewPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.new) setFieldErrors(p => ({ ...p, new: undefined }));
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "submitting"}
                className={`input w-full pr-11 ${fieldErrors.new ? "border-rose-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showNewPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showNewPass ? (
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
            {fieldErrors.new && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"><span>•</span> {fieldErrors.new}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="reset-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showConfirmPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirm) setFieldErrors(p => ({ ...p, confirm: undefined }));
                }}
                disabled={status === "submitting"}
                className={`input w-full pr-11 ${fieldErrors.confirm ? "border-rose-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showConfirmPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPass ? (
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
            {fieldErrors.confirm && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1"><span>•</span> {fieldErrors.confirm}</p>}
          </div>

          {/* Password strength hint */}
          {newPassword && (
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  {newPassword.length >= 8 ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />}
                </svg>
                Tối thiểu 8 ký tự
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {status === "submitting" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang đặt lại...</span>
              </>
            ) : (
              <span>Đặt lại mật khẩu</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
        <Link href="/forgot-password" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Yêu cầu liên kết mới
        </Link>
        {" · "}
        <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 transition-transform active:scale-95">
          <StudyForwardLogo size="md" />
        </div>
        <ThemeToggle />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>

      <div className="text-center text-[11px] text-[var(--text-muted)] mt-6">
        © 2026 StudyForward. Học tiếng Anh giao tiếp & luyện thi thông minh.
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      router.replace("/dashboard");
    }
  }, [router]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        throw new Error(message || "Không thể tạo tài khoản. Vui lòng thử lại.");
      }

      router.push("/login?registered=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể tạo tài khoản. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-subtle)" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 flex-shrink-0"
        style={{ background: "linear-gradient(160deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)" }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-xl font-bold text-white">StudyForward</span>
        </Link>
        <div>
          <div className="text-4xl font-extrabold text-white leading-tight mb-4">
            Bắt đầu<br />hành trình 🚀
          </div>
          <p className="text-blue-200 leading-relaxed mb-8">
            Tham gia cùng hơn 10,000 học viên đang luyện thi TOEIC hiệu quả mỗi ngày.
          </p>
          <div className="flex flex-col gap-3">
            {["✅ Miễn phí hoàn toàn", "✅ 500+ đề thi thực tế", "✅ Học mọi lúc mọi nơi", "✅ Cộng đồng hỗ trợ 24/7"].map(t => (
              <div key={t} className="text-white text-sm">{t}</div>
            ))}
          </div>
        </div>
        <div className="text-blue-300 text-sm">© 2026 StudyForward</div>
      </div>

      {/* Right panel */}
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

          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Tạo tài khoản</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--brand)" }}>Đăng nhập</Link>
          </p>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Họ</label>
                <input type="text" placeholder="Nguyễn" className="input" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Tên</label>
                <input type="text" placeholder="Văn A" className="input" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" placeholder="example@email.com" className="input" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Mật khẩu</label>
              <input type="password" placeholder="Tối thiểu 8 ký tự" className="input" value={form.password} onChange={(event) => updateField("password", event.target.value)} minLength={8} required />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3 mt-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản miễn phí"}
            </button>
          </form>

          <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
            Bằng cách đăng ký, bạn đồng ý với{" "}
            <a href="#" style={{ color: "var(--brand)" }}>Điều khoản dịch vụ</a> và{" "}
            <a href="#" style={{ color: "var(--brand)" }}>Chính sách bảo mật</a>
          </p>
        </div>
      </div>
    </div>
  );
}

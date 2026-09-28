"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = ["Lộ trình", "Đề thi", "Từ vựng", "Cộng đồng"];
const tags = ["Giao tiếp tiếng Anh", "TOEIC", "IELTS", "Ngôn ngữ sắp ra mắt"];

const featureCards = [
  {
    title: "Lộ trình cá nhân hóa",
    text: "Bạn học theo mục tiêu rõ ràng, phù hợp năng lực và thời gian hiện có.",
    accent: "#4f7cff",
  },
  {
    title: "Ôn luyện đề thật",
    text: "Luyện tập theo format chuẩn, phân tích lỗi nhanh và bám sát điểm yếu của bạn.",
    accent: "#7c5cff",
  },
  {
    title: "Ghi nhớ bền vững",
    text: "Từ vựng và ngữ pháp được nhắc lại đúng lúc để tiến bộ đều và lâu dài.",
    accent: "#22c55e",
  },
];

const planCards = [
  { level: "Starter", title: "Luyện nền tảng", detail: "6 tuần • 15 phút/ngày" },
  { level: "Accelerate", title: "Tăng tốc đề thật", detail: "8 tuần • 25 phút/ngày" },
  { level: "Target", title: "Đạt mục tiêu", detail: "12 tuần • 35 phút/ngày" },
];

const testimonials = [
  { name: "Lan Anh", quote: "Mình học nhờ StudyForward thấy rõ tiến bộ, đặc biệt là phần từ vựng và đề luyện." },
  { name: "Minh Khang", quote: "Giao diện dễ dùng, lộ trình rõ ràng, rất hợp cho người đi làm như mình." },
  { name: "Thảo Vy", quote: "Mỗi ngày có việc phải làm nhưng vẫn học đều nhờ hệ thống nhắc học thông minh." },
];

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setIsLoggedIn(true);
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="landing-page min-h-screen bg-[#f5f7ff] text-[#101827]">
      <header className="sticky top-0 z-20 grid h-[72px] w-full grid-cols-[1fr_auto_1fr] items-center border border-[#dfe9ff] bg-white px-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:px-8">
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-3 justify-self-start cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4f7cff,#7c5cff)] text-lg font-black text-white shadow-[0_14px_28px_rgba(79,124,255,0.35)]">
              S
            </div>
            <span className="text-[1.7rem] font-black tracking-[-0.06em] text-[#101827]">
              StudyForward
            </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#4b5563] md:flex">
            {navItems.map((item) => (
              <a key={item} href="#" className="transition-colors hover:text-[#1f2937]">
                {item}
              </a>
            ))}
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
            <ThemeToggle />
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl bg-[#4f7cff] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#3d6ef1] transition-colors"
                >
                  Vào Dashboard →
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden items-center justify-center rounded-xl border border-[#dfe9ff] bg-[#f7f9ff] px-4 py-2.5 text-sm font-semibold text-[#27344d] transition-colors hover:border-[#8aa9ff] dark:bg-white dark:text-[#101827] sm:inline-flex"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-[#101827] px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-[#101827]"
                >
                  Bắt đầu học
                </Link>
              </>
            )}
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6 md:py-14">
        <main className="pb-20 pt-10 md:pt-14">
          <section className="grid items-center gap-14 overflow-hidden rounded-[34px] border border-[#dfe9ff] bg-[radial-gradient(circle_at_15%_15%,rgba(79,124,255,0.14),transparent_20%),linear-gradient(180deg,#ffffff_0%,#eef3ff_100%)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8caff] bg-[#f1f5ff] px-3 py-2 text-sm font-medium text-[#264de2]">
                <span>✦</span>
                <span>Học tiếng Anh thông minh cho mọi mục tiêu</span>
              </div>

              <h1
                className="mt-7 max-w-[620px] text-[#111827]"
                style={{
                  fontSize: "clamp(3rem, 4.8vw, 6.3rem)",
                  lineHeight: 0.94,
                  letterSpacing: "-0.065em",
                  fontWeight: 900,
                }}
              >
                <span className="block">Học đúng</span>
                <span className="block text-[#4f7cff]">lộ trình.</span>
                <span className="block">Tiến bộ chắc.</span>
              </h1>

              <p className="mt-8 max-w-[620px] text-lg leading-8 text-[#4b5563] md:text-[1.15rem]">
                StudyForward giúp bạn luyện nghe, nói, đọc, viết cùng lộ trình cá nhân hóa cho giao tiếp tiếng Anh, TOEIC và IELTS. Những ngôn ngữ và mục tiêu mới sẽ được mở rộng trong tương lai.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-[#4f7cff] px-6 py-4 text-base font-bold text-white shadow-[0_16px_35px_rgba(79,124,255,0.3)] transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-[#101827]"
                >
                  Bắt đầu miễn phí
                </Link>
                <Link
                  href="/exams"
                  className="inline-flex items-center justify-center rounded-xl border border-[#cbd8f5] bg-white px-6 py-4 text-base font-semibold text-[#27344d] transition-colors hover:border-[#8aa9ff] dark:border-white dark:bg-white dark:text-[#101827]"
                >
                  Xem lộ trình
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center justify-center rounded-full border border-[#dfe9ff] bg-white px-3 py-1.5 text-sm font-medium text-[#52607a] shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[#4b5563]">
                <div>
                  <span className="block text-2xl font-black text-[#111827]">32K+</span>
                  <span>học viên</span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-[#111827]">4.9/5</span>
                  <span>đánh giá</span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-[#111827]">12W</span>
                  <span>đạt mục tiêu</span>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -right-6 top-6 h-28 w-28 rounded-full bg-[#ffd29a]/70 blur-3xl" />
              <div className="absolute bottom-8 left-2 h-28 w-28 rounded-full bg-[#f7b26d]/40 blur-3xl" />

              <div className="relative w-full max-w-[540px] rounded-[30px] border border-[#dfe9ff] bg-white p-4 shadow-[0_28px_70px_rgba(15,23,42,0.08)] md:p-5">
                <div className="rounded-[24px] bg-[#eef3ff] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#7b8aa5]">
                        Tiến độ hôm nay
                      </div>
                      <div className="mt-2 text-4xl font-black text-[#111827]">72%</div>
                    </div>
                    <div className="rounded-full border border-[#b8caff] bg-[#e7edff] px-2.5 py-1 text-xs font-bold text-[#264de2]">
                      +18% tuần này
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#dfe9ff]">
                    <div className="h-full w-[72%] rounded-full bg-[linear-gradient(135deg,#4f7cff,#7c5cff)]" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl border border-[#dfe9ff] bg-white p-3">
                      <div className="text-2xl font-black text-[#111827]">18</div>
                      <div className="mt-1 text-[0.7rem] text-[#6b7280]">Bài học</div>
                    </div>
                    <div className="rounded-2xl border border-[#dfe9ff] bg-white p-3">
                      <div className="text-2xl font-black text-[#111827]">320</div>
                      <div className="mt-1 text-[0.7rem] text-[#6b7280]">Từ mới</div>
                    </div>
                    <div className="rounded-2xl border border-[#dfe9ff] bg-white p-3">
                      <div className="text-2xl font-black text-[#111827]">5</div>
                      <div className="mt-1 text-[0.7rem] text-[#6b7280]">Ngày streak</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-[#dfe9ff] bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)]">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#7b8aa5]">Đề hôm nay</div>
                    <div className="mt-2 text-3xl font-black text-[#111827]">3 bài</div>
                    <div className="mt-1 text-sm text-[#4b5563]">Reading + Listening</div>
                  </div>
                  <div className="rounded-[18px] border border-[#dfe9ff] bg-white p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)]">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#7b8aa5]">Mục tiêu</div>
                    <div className="mt-2 text-3xl font-black text-[#111827]">750+</div>
                    <div className="mt-1 text-sm text-[#4b5563]">TOEIC trong 3 tháng</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[28px] border border-[#dfe9ff] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)] md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b8aa5]">Tại sao chọn</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
                  Học tập theo cách đúng nhịp độ của bạn
                </h2>
              </div>
              <span className="text-sm text-[#4b5563]">Từ người mới đến luyện thi chuyên sâu</span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((card) => (
                <div key={card.title} className="rounded-[24px] border border-[#dfe9ff] bg-[#f7f9ff] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.02)]">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white"
                    style={{ background: card.accent }}
                  >
                    ✦
                  </div>
                  <h3 className="text-xl font-bold text-[#111827]">{card.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#4b5563]">{card.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-[28px] border border-[#dfe9ff] bg-[#eef3ff] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b8aa5]">Lộ trình học</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
                  Chọn lộ trình phù hợp với mục tiêu của bạn
                </h2>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {planCards.map((plan) => (
                <div key={plan.level} className="rounded-[24px] border border-[#dfe9ff] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8aa5]">{plan.level}</div>
                  <h3 className="mt-3 text-2xl font-black text-[#111827]">{plan.title}</h3>
                  <p className="mt-2 text-[#4b5563]">{plan.detail}</p>

                  <div className="mt-5 h-2 rounded-full bg-[#efe7dc]">
                    <div className="h-full w-2/3 rounded-full bg-[linear-gradient(135deg,#4f7cff,#7c5cff)]" />
                  </div>

                  <ul className="mt-5 space-y-2 text-sm text-[#4b5563]">
                    <li>• Theo dõi tiến độ hàng tuần</li>
                    <li>• Đề luyện theo mục tiêu</li>
                    <li>• Nhắc học cá nhân hóa</li>
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-[#dfe9ff] bg-white p-6 md:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b8aa5]">Hệ thống học</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
                Mỗi ngày đều có một bước tiến rõ ràng
              </h2>

              <div className="mt-8 space-y-4">
                {[
                  ["Luyện theo mục tiêu", "Bạn được gợi ý bài học theo năng lực, thời gian và cấp độ hiện tại."],
                  ["Theo dõi tiến độ thật chi tiết", "Biểu đồ, streak, điểm mạnh/yếu được hiển thị rõ để bạn biết mình đang ở đâu."],
                  ["Nhắc học đúng lúc", "Không bỏ lỡ buổi luyện vì hệ thống tự nhắc theo thói quen học của bạn."],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-4 rounded-[20px] border border-[#dfe9ff] bg-[#f7f9ff] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-sm font-black text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">{title}</h3>
                      <p className="mt-1 text-[#4b5563]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#1d2d43] bg-[linear-gradient(180deg,#17233c_0%,#0f1729_100%)] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Dashboard</div>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">Bạn đang ở giai đoạn tối ưu</h3>

              <div className="mt-8 space-y-4">
                <div className="rounded-[20px] bg-white/6 p-4">
                  <div className="flex items-center justify-between text-sm text-white/75">
                    <span>Reading Accuracy</span>
                    <span>86%</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10">
                    <div className="h-full w-[86%] rounded-full bg-[linear-gradient(135deg,#f7c76b,#ee7a4a)]" />
                  </div>
                </div>

                <div className="rounded-[20px] bg-white/6 p-4">
                  <div className="flex items-center justify-between text-sm text-white/75">
                    <span>Vocabulary retention</span>
                    <span>91%</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10">
                    <div className="h-full w-[91%] rounded-full bg-[linear-gradient(135deg,#8aa9ff,#4f7cff)]" />
                  </div>
                </div>

                <div className="rounded-[20px] bg-white/6 p-4">
                  <div className="flex items-center justify-between text-sm text-white/75">
                    <span>Listening routine</span>
                    <span>5 days</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-[linear-gradient(135deg,#ffd29a,#ffb86c)]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[28px] border border-[#dfe9ff] bg-white p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b8aa5]">Học viên nói gì</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
              Mọi người đều thấy tiến bộ rõ rệt
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-[24px] border border-[#dfe9ff] bg-[#f7f9ff] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.02)]">
                  <div className="mb-4 text-xl text-[#4f7cff]">★★★★★</div>
                  <p className="text-base leading-7 text-[#374151]">“{item.quote}”</p>
                  <div className="mt-5 text-sm font-bold text-[#111827]">{item.name}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-[28px] bg-[linear-gradient(135deg,#101827,#264de2)] p-8 text-white shadow-[0_28px_60px_rgba(38,77,226,0.22)] md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Bắt đầu ngay</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-4xl">
                  Chọn StudyForward và kiểm soát cuộc học của bạn
                </h2>
              </div>
              <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-4 text-base font-bold text-[#264de2] shadow-lg transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-[#101827]">
                Tạo tài khoản miễn phí
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

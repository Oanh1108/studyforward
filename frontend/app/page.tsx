"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/ThemeProvider';
import { Sun, Moon, Menu, X, CheckCircle2, Globe2, BrainCircuit, BarChart3, ChevronDown, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // Header height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleStartLearning = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/register');
    }
  };

  // Avoid hydration mismatch for theme icon by checking if mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[var(--bg-card)]/80 backdrop-blur-md border-b border-[var(--border)] shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-white font-black text-xl tracking-tighter">SF</span>
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block text-[var(--text-primary)]">
                Study<span className="text-indigo-600 dark:text-indigo-400">Forward</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
              <button onClick={() => scrollTo('features')} className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tính năng</button>
              <button onClick={() => scrollTo('languages')} className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Ngôn ngữ</button>
              <button onClick={() => scrollTo('faq')} className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Hỏi đáp</button>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              {mounted && (
                <button 
                  onClick={toggleTheme} 
                  className="p-2.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  aria-label="Chuyển đổi giao diện sáng tối"
                  title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}
              <Link href="/login" className="font-semibold text-sm text-[var(--text-primary)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2">
                Đăng nhập
              </Link>
              <button 
                onClick={handleStartLearning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Bắt đầu học
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              {mounted && (
                <button onClick={toggleTheme} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[var(--text-primary)]">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--bg-card)] border-b border-[var(--border)] absolute top-full left-0 w-full shadow-lg">
            <div className="px-4 py-6 flex flex-col gap-4">
              <button onClick={() => scrollTo('features')} className="text-left py-2 font-medium text-[var(--text-primary)]">Tính năng</button>
              <button onClick={() => scrollTo('languages')} className="text-left py-2 font-medium text-[var(--text-primary)]">Ngôn ngữ</button>
              <button onClick={() => scrollTo('faq')} className="text-left py-2 font-medium text-[var(--text-primary)]">Hỏi đáp</button>
              <div className="h-px bg-[var(--border)] my-2"></div>
              <Link href="/login" className="text-center py-3 font-bold text-[var(--text-primary)] border border-[var(--border)] rounded-xl">Đăng nhập</Link>
              <button onClick={handleStartLearning} className="text-center py-3 font-bold text-white bg-indigo-600 rounded-xl">Bắt đầu học</button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute top-1/3 right-0 translate-x-1/3 w-[400px] h-[400px] bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-[80px] -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-[var(--text-primary)] mb-6 max-w-4xl mx-auto leading-tight">
            Nắm vững mọi ngôn ngữ với <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">StudyForward</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Học hiệu quả nhiều ngôn ngữ trên cùng một nền tảng. Xây dựng sổ từ vựng cá nhân, luyện tập qua flashcard, nghe-chép và ôn tập tự động theo thuật toán SRS.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleStartLearning}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              Bắt đầu học ngay
            </button>
            <button 
              onClick={() => scrollTo('features')}
              className="w-full sm:w-auto px-8 py-4 bg-[var(--bg-card)] border-2 border-[var(--border)] hover:border-indigo-400 dark:hover:border-indigo-600 text-[var(--text-primary)] font-bold rounded-2xl text-lg transition-all hover:bg-[var(--bg-subtle)]"
            >
              Khám phá cách học
            </button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-16 md:mt-24">
          <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl border border-[var(--border)] bg-[var(--bg-card)] ring-1 ring-white/10">
            <div className="aspect-[16/10] md:aspect-[21/9] relative bg-[var(--bg-subtle)]">
              <Image 
                src="/hero-ui.jpg" 
                alt="Giao diện Dashboard StudyForward" 
                fill 
                className="object-cover"
                priority
              />
            </div>
            {/* Minimal browser UI mock */}
            <div className="absolute top-0 left-0 right-0 h-10 md:h-12 bg-[var(--bg-card)]/90 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </section>

      {/* LANGUAGES SECTION */}
      <section id="languages" className="py-24 bg-[var(--bg-card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-bold mb-4">
              <Globe2 className="w-4 h-4" />
              Đa ngôn ngữ
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">Một nền tảng, mọi ngôn ngữ</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              Hỗ trợ giao diện tiếng Việt thân thiện, giúp bạn dễ dàng tiếp cận các ngôn ngữ phổ biến nhất hiện nay.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { name: 'Tiếng Anh', flag: '🇬🇧', code: 'en' },
              { name: 'Tiếng Nhật', flag: '🇯🇵', code: 'ja' },
              { name: 'Tiếng Hàn', flag: '🇰🇷', code: 'ko' },
              { name: 'Tiếng Trung', flag: '🇨🇳', code: 'zh' },
              { name: 'Tiếng Thái', flag: '🇹🇭', code: 'th' },
            ].map((lang) => (
              <div key={lang.code} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl p-6 text-center hover:border-indigo-500 hover:shadow-lg transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{lang.flag}</div>
                <h3 className="font-bold text-[var(--text-primary)] text-lg">{lang.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">Quy trình học tập tối ưu</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              Từ việc thu thập từ vựng đến ôn tập hiệu quả, mọi tính năng đều được thiết kế để não bộ ghi nhớ lâu nhất.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Sổ từ vựng thông minh</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Tổ chức thư mục không giới hạn. Nhập từ nhanh bằng cách dán danh sách hoặc file Excel. Trợ lý AI tự động bổ sung nghĩa, từ loại, phiên âm và câu ví dụ.
              </p>
              <ul className="space-y-2">
                {['Tự động tra cứu nghĩa & ví dụ bằng AI', 'Tổ chức theo chủ đề/thư mục', 'Hỗ trợ import số lượng lớn'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm relative overflow-hidden">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Chế độ học đa dạng</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Không chỉ lật thẻ (Flashcard), hệ thống cung cấp nhiều cách luyện tập kích thích trí não để bạn không bao giờ nhàm chán.
              </p>
              <ul className="space-y-2">
                {['Lật thẻ Flashcard hai chiều', 'Trắc nghiệm nghĩa & đồng nghĩa', 'Gõ chính tả & Nghe chép (Dictation)'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Ôn tập ngắt quãng (SRS)</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Hệ thống tự động tính toán thời điểm hoàn hảo để nhắc nhở bạn ôn tập trước khi kịp quên. Bảng điều khiển (Dashboard) hiển thị tức thì các từ đến hạn.
              </p>
              <ul className="space-y-2">
                {['Thuật toán Spaced Repetition', 'Theo dõi tiến độ & chuỗi ngày học', 'Lưu và khôi phục đúng bài đang học dở'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">Câu hỏi thường gặp</h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: 'StudyForward có miễn phí không?',
                a: 'Hiện tại StudyForward cung cấp miễn phí các tính năng cốt lõi như tạo sổ từ vựng, học qua flashcard và ôn tập ngắt quãng (SRS) cho tất cả ngôn ngữ.'
              },
              {
                q: 'Làm sao để hệ thống AI bổ sung từ vựng tự động?',
                a: 'Khi bạn dán một danh sách từ (hoặc nhập file Excel), bạn chỉ cần chọn "Dùng AI để dịch & điền tự động", hệ thống sẽ nhận diện ngôn ngữ và tự động tìm nghĩa tiếng Việt, phiên âm và ví dụ ngữ cảnh phù hợp.'
              },
              {
                q: 'Tôi có thể dùng StudyForward trên điện thoại không?',
                a: 'Hoàn toàn được. Giao diện của StudyForward được thiết kế responsive, hiển thị hoàn hảo trên các thiết bị di động. Bạn có thể ôn từ vựng mọi lúc mọi nơi ngay trên trình duyệt web.'
              },
              {
                q: 'Hệ thống gợi ý ôn tập (SRS) hoạt động thế nào?',
                a: 'Mỗi khi bạn học hoặc ôn một từ, bạn sẽ đánh giá mức độ nhớ của mình (Dễ, Tốt, Khó, Cần học lại). Thuật toán sẽ tính toán và đưa từ đó vào danh sách "Đến hạn ôn" sau một khoảng thời gian nhất định, giúp bạn nhớ lâu với số lần học ít nhất.'
              }
            ].map((faq, i) => (
              <details key={i} className="group border border-[var(--border)] bg-[var(--bg-base)] rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-bold text-lg text-[var(--text-primary)] outline-none focus-visible:ring-2 ring-indigo-500 ring-inset">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-[var(--text-secondary)] transition-transform group-open:rotate-180 shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA & FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 md:py-20 mt-auto border-t-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Sẵn sàng để làm chủ ngoại ngữ?</h2>
            <p className="text-lg text-slate-300 mb-8">
              Bắt đầu xây dựng vốn từ vựng của riêng bạn ngay hôm nay. Chỉ với 15 phút mỗi ngày cùng StudyForward.
            </p>
            <button 
              onClick={handleStartLearning}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-lg transition-colors"
            >
              Tạo tài khoản miễn phí
            </button>
          </div>
          
          <div className="h-px bg-slate-800 w-full mb-8"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">SF</span>
              </div>
              <span className="font-bold text-white tracking-tight">
                Study<span className="text-indigo-400">Forward</span>
              </span>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} StudyForward. Phát triển cho việc tự học ngoại ngữ.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

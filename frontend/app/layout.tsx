import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { AuthProvider } from "@/lib/authContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyForward - Học tiếng Anh tự định hướng",
  description: "Nền tảng Tự học Tiếng Anh thông minh với phương pháp chép chính tả và tự tạo lộ trình cá nhân. Từ vựng, ngữ pháp, Youtube Shadowing.",
  openGraph: {
    title: "StudyForward - Học tiếng Anh tự định hướng",
    description: "Nền tảng Tự học Tiếng Anh thông minh với phương pháp chép chính tả và tự tạo lộ trình cá nhân.",
    url: "https://studyforward.edu.vn",
    siteName: "StudyForward",
    images: [{ url: "/brand-logo.png", width: 800, height: 600 }]
  },
  icons: {
    icon: "/brand-logo.png",
    shortcut: "/brand-logo.png",
    apple: "/brand-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ToastContainer } from "@/components/ui/ToastContainer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <ToastContainer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

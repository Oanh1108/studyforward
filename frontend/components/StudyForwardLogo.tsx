"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'auto' | 'light' | 'dark';
}

export function StudyForwardIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand-logo.png"
        alt="StudyForward Logo"
        className="w-full h-full object-contain transition-transform duration-200 hover:scale-105 dark:brightness-110 dark:contrast-115 dark:drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]"
      />
    </div>
  );
}

export function StudyForwardLogo({
  className = "",
  size = "md",
  showText = true,
  variant = "auto",
}: LogoProps) {
  // Size mapping
  const sizeConfig = {
    sm: { icon: "w-8 h-8", text: "text-lg", gap: "gap-2" },
    md: { icon: "w-9 h-9", text: "text-xl", gap: "gap-2.5" },
    lg: { icon: "w-11 h-11", text: "text-2xl", gap: "gap-3" },
    xl: { icon: "w-14 h-14", text: "text-3xl", gap: "gap-3.5" },
  }[size];

  // Text color based on variant
  let textColorClass = "text-[#111827] dark:text-white";
  if (variant === "light") {
    textColorClass = "text-[#111827]";
  } else if (variant === "dark") {
    textColorClass = "text-white";
  }

  const { isAuthenticated, isLoading } = useAuth();
  
  // Decide target href based on auth state
  // Even if loading, default to "/" and let landing page logic redirect.
  // But preferably, wait or just use isAuthenticated state
  const href = isAuthenticated ? "/dashboard" : "/";

  return (
    <Link href={href} className={`inline-flex items-center ${sizeConfig.gap} select-none ${className} hover:opacity-80 transition-opacity`}>
      {/* Brand Icon */}
      <StudyForwardIcon className={sizeConfig.icon} />

      {/* Brand Text: StudyForward */}
      {showText && (
        <span
          className={`font-black tracking-[-0.04em] ${sizeConfig.text} ${textColorClass} transition-colors duration-300`}
        >
          StudyForward
        </span>
      )}
    </Link>
  );
}

export default StudyForwardLogo;

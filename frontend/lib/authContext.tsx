"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { SupportedLanguage } from "./languages";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  goal?: number;
  currentLanguage?: SupportedLanguage;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  currentLanguage: SupportedLanguage;
  switchLanguage: (lang: SupportedLanguage) => Promise<boolean>;
  login: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://studyforward.onrender.com' : 'http://localhost:3002')).replace(/\/+$/, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Clear all auth storage & caches
  const clearAuthStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    // Clear any legacy insecure password keys
    localStorage.removeItem("rememberedPassword");
    localStorage.removeItem("rememberedAccounts");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
  }, []);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize state from storage after mounting to prevent hydration errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      // First check if token is in URL (from Google Auth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      
      if (urlToken) {
        localStorage.setItem("accessToken", urlToken);
        // Remove token from URL for security
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const storedToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
      setToken(storedToken);

      try {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch {
        setUser(null);
      }

      const savedLang = localStorage.getItem("studyforward_lang") as SupportedLanguage;
      if (savedLang && ["en", "th", "ko", "zh", "ja"].includes(savedLang)) {
        setCurrentLanguage(savedLang);
      }

      setIsLoading(!!storedToken);
    }
  }, []);

  // Switch learning language handler
  const switchLanguage = useCallback(async (lang: SupportedLanguage): Promise<boolean> => {
    setCurrentLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("studyforward_lang", lang);
    }

    if (user) {
      const updatedUser: AuthUser = { ...user, currentLanguage: lang };
      setUser(updatedUser);
      if (typeof window !== "undefined") {
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } else if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }
      }
    }

    const activeToken = typeof window !== "undefined"
      ? (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))
      : null;

    if (activeToken) {
      try {
        await fetch(`${API_BASE}/api/auth/current-language`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ language: lang }),
        });
      } catch (err) {
        console.error("Failed to sync currentLanguage to backend:", err);
      }
    }

    return true;
  }, [user]);

  // Sync user's stored language if provided by backend
  useEffect(() => {
    if (user?.currentLanguage && ["en", "th", "ko", "zh", "ja"].includes(user.currentLanguage)) {
      setCurrentLanguage(user.currentLanguage);
      if (typeof window !== "undefined") {
        localStorage.setItem("studyforward_lang", user.currentLanguage);
      }
    }
  }, [user?.currentLanguage]);

  // Validate active session against backend
  const refreshSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    const activeToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
        credentials: "include",
      });

      if (res.ok) {
        const userData: AuthUser = await res.json();
        setUser(userData);
        setToken(activeToken);
        if (userData.currentLanguage && ["en", "th", "ko", "zh", "ja"].includes(userData.currentLanguage)) {
          setCurrentLanguage(userData.currentLanguage);
          localStorage.setItem("studyforward_lang", userData.currentLanguage);
        }
      } else {
        // Token expired or invalid
        clearAuthStorage();
        setUser(null);
        setToken(null);
      }
    } catch {
      // In offline / network glitch, fallback to locally stored user profile
      try {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setToken(activeToken);
        }
      } catch {
        clearAuthStorage();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthStorage]);

  useEffect(() => {
    let isCancelled = false;
    const activeToken = typeof window !== "undefined"
      ? (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))
      : null;

    if (!activeToken) {
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${activeToken}` },
      credentials: "include",
    })
      .then(async (res) => {
        if (isCancelled) return;
        if (res.ok) {
          const userData: AuthUser = await res.json();
          setUser(userData);
          setToken(activeToken);
          if (userData.currentLanguage && ["en", "th", "ko", "zh", "ja"].includes(userData.currentLanguage)) {
            setCurrentLanguage(userData.currentLanguage);
            localStorage.setItem("studyforward_lang", userData.currentLanguage);
          }
        } else {
          clearAuthStorage();
          setUser(null);
          setToken(null);
        }
      })
      .catch(() => {
        // Keep offline user on network failure
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [clearAuthStorage]);

  // Login handler
  const login = async (email: string, password: string, rememberMe: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = Array.isArray(data?.message) ? data.message[0] : data?.message;
        return { success: false, error: errorMsg || "Email hoặc mật khẩu không chính xác." };
      }

      const receivedToken: string = data.accessToken;
      const receivedUser: AuthUser = data.user;

      if (receivedUser.currentLanguage && ["en", "th", "ko", "zh", "ja"].includes(receivedUser.currentLanguage)) {
        setCurrentLanguage(receivedUser.currentLanguage);
        localStorage.setItem("studyforward_lang", receivedUser.currentLanguage);
      }

      // Storage strategy based on rememberMe
      if (rememberMe) {
        localStorage.setItem("accessToken", receivedToken);
        localStorage.setItem("user", JSON.stringify(receivedUser));
        localStorage.setItem("rememberMe", "true");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
      } else {
        sessionStorage.setItem("accessToken", receivedToken);
        sessionStorage.setItem("user", JSON.stringify(receivedUser));
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
      }

      setUser(receivedUser);
      setToken(receivedToken);

      return { success: true };
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại." };
    }
  };

  // Register handler
  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = Array.isArray(data?.message) ? data.message[0] : data?.message;
        return { success: false, error: errorMsg || "Đăng ký không thành công. Vui lòng thử lại." };
      }

      const receivedToken: string = data.accessToken;
      const receivedUser: AuthUser = data.user;

      localStorage.setItem("accessToken", receivedToken);
      localStorage.setItem("user", JSON.stringify(receivedUser));

      setUser(receivedUser);
      setToken(receivedToken);

      return { success: true };
    } catch {
      return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
  };

  // Logout handler
  const logout = async () => {
    const activeToken = typeof window !== "undefined"
      ? (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))
      : null;
    try {
      if (activeToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
          credentials: "include",
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthStorage();
      setUser(null);
      setToken(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        currentLanguage,
        switchLanguage,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

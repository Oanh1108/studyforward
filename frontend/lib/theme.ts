export const themes = {
  light: {
    background: "#ffffff",
    backgroundSecondary: "#f9fafb",
    foreground: "#111827",
    foregroundMuted: "#6b7280",
    border: "#f3f4f6",
    card: "#ffffff",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primaryForeground: "#ffffff",
    primaryLight: "#eff6ff",
    primaryLightText: "#1d4ed8",
  },
  dark: {
    background: "#0f172a",
    backgroundSecondary: "#1e293b",
    foreground: "#f1f5f9",
    foregroundMuted: "#94a3b8",
    border: "#1e293b",
    card: "#1e293b",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    primaryForeground: "#ffffff",
    primaryLight: "#1e3a5f",
    primaryLightText: "#93c5fd",
  },
} as const;

export type Theme = keyof typeof themes;

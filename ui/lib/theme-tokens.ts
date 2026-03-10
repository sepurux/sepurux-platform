export const themeTokens = {
  colors: {
    background: "#0B0F14",
    surface: "#121821",
    card: "#161E29",
    border: "#1E2936",
    sidebar: "#0F141B",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    neutral: "#94A3B8",
    accent: "#22C55E",
    accentSecondary: "#60A5FA",
    textPrimary: "#E5E7EB",
    textSecondary: "#94A3B8",
  },
  charts: {
    line: "#38BDF8",
    grid: "#1E2936",
    axis: "#94A3B8",
  },
} as const;

export type ThemeTokens = typeof themeTokens;

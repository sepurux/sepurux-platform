export const themeTokens = {
  colors: {
    background: "#0B1120",
    surface: "#131B2C",
    card: "#182033",
    border: "#26314A",
    sidebar: "#101827",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#60A5FA",
    neutral: "#94A3B8",
    accent: "#3B82F6",
    accentSecondary: "#60A5FA",
    textPrimary: "#E5E7EB",
    textSecondary: "#94A3B8",
  },
  charts: {
    line: "#60A5FA",
    grid: "#26314A",
    axis: "#94A3B8",
  },
} as const;

export type ThemeTokens = typeof themeTokens;

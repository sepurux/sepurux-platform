// site/tailwind.config.ts
import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px"
      }
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans],
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        sidebar: "var(--sidebar)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        success: "var(--success)",
        info: "var(--info)",
        "neutral-muted": "var(--neutral)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        teal: {
          DEFAULT: "#0E8A6F",
          dim: "rgba(14,138,111,0.12)",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        panel: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        glow: "0 0 0 1px rgba(14,138,111,0.15), 0 4px 24px rgba(14,138,111,0.08)",
        button: "0 2px 8px rgba(0,0,0,0.10)",
        insetSoft: "inset 0 1px 0 rgba(255,255,255,0.8)",
        "teal-glow": "0 0 0 1px rgba(14,138,111,0.2), 0 4px 20px rgba(14,138,111,0.08)",
        "teal-btn": "0 0 0 1px rgba(14,138,111,0.4), 0 2px 12px rgba(14,138,111,0.2)",
        card: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)",
      },
      backgroundImage: {
        "grid-faint": "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.10) 1px, transparent 0)",
        "dot-grid": "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero":
          "radial-gradient(ellipse at 60% 0%, rgba(14,138,111,0.10) 0%, transparent 60%)",
        "gradient-teal-hero":
          "radial-gradient(circle at 50% 60%, rgba(14,138,111,0.08), transparent 55%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

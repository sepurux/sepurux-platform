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
        void: "var(--void)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
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
        indigo: {
          DEFAULT: "#7C3AED",
          dim: "rgba(124,58,237,0.12)",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          dim: "rgba(6,182,212,0.12)",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        panel: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        glow: "0 0 0 1px rgba(124,58,237,0.2), 0 4px 24px rgba(124,58,237,0.10)",
        button: "0 2px 8px rgba(0,0,0,0.20)",
        insetSoft: "inset 0 1px 0 rgba(255,255,255,0.06)",
        "accent-glow": "0 0 0 1px rgba(124,58,237,0.25), 0 4px 20px rgba(124,58,237,0.15)",
        "accent-btn": "0 0 0 1px rgba(124,58,237,0.4), 0 2px 12px rgba(124,58,237,0.2)",
        card: "0 1px 4px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)",
        // backwards compat
        "teal-glow": "0 0 0 1px rgba(124,58,237,0.2), 0 4px 20px rgba(124,58,237,0.10)",
        "teal-btn": "0 0 0 1px rgba(124,58,237,0.4), 0 2px 12px rgba(124,58,237,0.2)",
      },
      backgroundImage: {
        "grid-faint": "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)",
        "dot-grid": "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.08) 1px, transparent 0)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero": "radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.08) 0%, transparent 60%)",
        "gradient-accent": "linear-gradient(135deg, #7C3AED, #06B6D4)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

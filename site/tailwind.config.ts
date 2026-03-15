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
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        sidebar: "hsl(var(--sidebar))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        success: "hsl(var(--success))",
        info: "hsl(var(--info))",
        "neutral-muted": "hsl(var(--neutral))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        teal: {
          DEFAULT: "#00e5cc",
          dim: "rgba(0,229,204,0.12)",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        panel: "0 30px 90px rgba(2,6,23,0.46)",
        glow: "0 0 0 1px rgba(255,255,255,0.1), 0 24px 80px rgba(255,255,255,0.08)",
        button: "0 18px 48px rgba(255,255,255,0.14)",
        insetSoft: "inset 0 1px 0 rgba(255,255,255,0.06)",
        "teal-glow": "0 0 0 1px rgba(0,229,204,0.2), 0 40px 100px rgba(0,229,204,0.06)",
        "teal-btn": "0 0 0 1px rgba(0,229,204,0.5), 0 0 24px rgba(0,229,204,0.3), 0 0 60px rgba(0,229,204,0.12)",
      },
      backgroundImage: {
        "grid-faint": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
        "dot-grid": "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.07) 1px, transparent 0)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero":
          "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.16), transparent 40%), radial-gradient(circle at 72% 14%, rgba(255,255,255,0.1), transparent 34%), radial-gradient(circle at 84% 82%, rgba(255,255,255,0.06), transparent 38%)",
        "gradient-teal-hero":
          "radial-gradient(circle at 50% 60%, rgba(0,229,204,0.08), transparent 55%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

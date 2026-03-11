import type { Config } from "tailwindcss";

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
        neutral: "hsl(var(--neutral))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        panel: "0 10px 34px rgba(0,0,0,0.38)",
        insetSoft: "inset 0 1px 0 rgba(255,255,255,0.04)"
      },
      backgroundImage: {
        "grid-faint": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

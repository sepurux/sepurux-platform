"use client";

import { useEffect, useState } from "react";

import { Moon, Sun } from "lucide-react";

import {
  applyThemeMode,
  getStoredThemeMode,
  resolveSystemThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

function currentDomThemeMode(): ThemeMode | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initialTheme = getStoredThemeMode() ?? currentDomThemeMode() ?? resolveSystemThemeMode();
    setThemeMode(initialTheme);
    applyThemeMode(initialTheme);
  }, []);

  function handleToggleTheme() {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    applyThemeMode(nextTheme);
    setStoredThemeMode(nextTheme);
  }

  const isDark = themeMode === "dark";

  return (
    <button
      type="button"
      onClick={handleToggleTheme}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/70 px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/40",
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}


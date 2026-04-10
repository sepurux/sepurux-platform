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
  iconOnly?: boolean;
  activeClassName?: string;
};

function currentDomThemeMode(): ThemeMode | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle({
  className,
  iconOnly = false,
  activeClassName,
}: ThemeToggleProps) {
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
        iconOnly
          ? "glass-surface inline-flex h-11 w-11 items-center justify-center rounded-[18px] text-foreground transition-colors hover:bg-accent/45"
          : "glass-surface inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent/45",
        activeClassName,
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {iconOnly ? null : <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}

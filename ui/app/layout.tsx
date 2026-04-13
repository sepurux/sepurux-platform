import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { uiAppleTouchIconUrl, uiFaviconIcoUrl, uiFaviconUrl } from "@/lib/brand";

import "./globals.css";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const themeBootScript = `
(() => {
  try {
    const path = window.location.pathname || "";
    if (path.startsWith("/auth")) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      return;
    }
    const storageKey = "sepurux.ui.theme";
    const legacyStorageKey = "crashlab.ui.theme";
    const storedTheme =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(legacyStorageKey);
    const isValidTheme = storedTheme === "light" || storedTheme === "dark";
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = isValidTheme ? storedTheme : (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: "Sepurux",
  description: "Paste a trace. Find the failing step, why it failed or looks risky, and the next fix.",
  icons: {
    icon: [
      { url: uiFaviconIcoUrl, type: "image/x-icon" },
      { url: uiFaviconUrl, type: "image/png" },
    ],
    shortcut: [{ url: uiFaviconIcoUrl, type: "image/x-icon" }],
    apple: [{ url: uiAppleTouchIconUrl, type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${fontSans.variable} ${fontMono.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

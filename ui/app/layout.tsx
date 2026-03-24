import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const themeBootScript = `
(() => {
  try {
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
  title: "Sepurux UI",
  description: "Agent Sepurux dashboard",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

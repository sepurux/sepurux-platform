import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { TraceSandbox } from "@/components/sandbox/trace-sandbox";
import { buildPageMetadata } from "@/lib/site";

const sandboxTheme = {
  colorScheme: "dark",
  "--void": "#08080D",
  "--surface": "#111118",
  "--surface-2": "#16161F",
  "--surface-3": "#1C1C28",
  "--background": "#08080D",
  "--sidebar": "#111118",
  "--foreground": "#f1f0f5",
  "--text-primary": "#F1F0F5",
  "--text-dim": "#9B98AB",
  "--text-muted": "#5A5870",
  "--card": "#111118",
  "--card-foreground": "#f1f0f5",
  "--border": "rgba(255, 255, 255, 0.07)",
  "--input": "rgba(255, 255, 255, 0.05)",
  "--ring": "#7c3aed",
  "--muted": "#16161F",
  "--muted-foreground": "#9B98AB",
  "--accent": "rgba(124, 58, 237, 0.14)",
  "--accent-foreground": "#f1f0f5",
  "--primary": "#7c3aed",
  "--primary-foreground": "#ffffff",
  "--secondary": "#a78bfa",
  "--success": "#10b981",
  "--info": "#06b6d4",
  "--neutral": "#9b98ab",
  "--warning": "#f59e0b",
  "--danger": "#ef4444",
  "--accent-rgb": "124, 58, 237",
  "--warm-rgb": "167, 139, 250",
  "--steel-rgb": "6, 182, 212",
  "--warm-dim": "rgba(124, 58, 237, 0.12)",
  "--color-accent": "#7c3aed",
  "--color-warm": "#a78bfa",
  "--color-steel": "#06b6d4",
  "--surface-1": "rgba(255, 255, 255, 0.04)",
  "--ink-950": "#08080D",
  "--ink-925": "#0A0A12",
  "--ink-900": "#0D0D16",
  "--ink-875": "#111118",
  "--ink-850": "#111118",
  "--ink-800": "#16161F",
  "--shadow-card": "0 12px 30px rgba(0, 0, 0, 0.26)",
  "--shadow-soft": "0 18px 48px rgba(0, 0, 0, 0.22)",
  "--shadow-deep": "0 36px 90px rgba(0, 0, 0, 0.55)",
} as CSSProperties;

export const metadata: Metadata = buildPageMetadata({
  title: "Debug your agent trace",
  description:
    "Paste any trace — JSON, logs, or a trace ID. See what broke, why it cascaded, and how to fix it. No account needed.",
  path: "/sandbox",
});

export default function SandboxPage() {
  return (
    <div
      className="page-shell overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.05),transparent_30%),linear-gradient(180deg,#050508_0%,#08080D_58%,#050508_100%)] text-slate-50"
      style={sandboxTheme}
    >
      <div className="site-container py-8 md:py-10">
        <TraceSandbox />
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type InternalNavItem = {
  href: string;
  label: string;
};

const navItems: InternalNavItem[] = [
  { href: "/internal/dashboard", label: "Overview" },
  { href: "/internal/users", label: "Users" },
  { href: "/internal/projects", label: "Projects" },
  { href: "/internal/campaigns", label: "Campaigns" },
  { href: "/internal/failures", label: "Failures" },
  { href: "/internal/billing", label: "Billing" },
  { href: "/internal/queues", label: "Queues" },
  { href: "/internal/analytics", label: "Analytics" },
  { href: "/internal/audit-logs", label: "Audit Logs" },
  { href: "/internal/alerts", label: "Alerts" },
  { href: "/internal/system", label: "System" },
  { href: "/internal/settings", label: "Settings" },
];

export function InternalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-sidebar/95 px-4 py-4 backdrop-blur xl:block">
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 shadow-insetSoft">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sepurux</p>
          <p className="mt-1 text-sm font-semibold text-foreground">Internal Console</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--accent-teal)" }}>
            Super admin only
          </p>
          <Link
            href="/internal/search"
            className="mt-3 inline-flex rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Global Search
          </Link>
        </div>

        <nav className="space-y-1 px-1 py-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group block rounded-md border-l-2 border-l-transparent border-transparent px-3 py-2 text-sm transition",
                  active
                    ? "border-l-primary bg-muted/45 text-primary shadow-insetSoft"
                    : "text-muted-foreground hover:border-l-border hover:bg-accent/35 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}

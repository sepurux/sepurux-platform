"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { clearStoredApiBaseUrl, clearStoredApiKey, clearStoredProjectId } from "@/lib/tenant-settings";
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
  const router = useRouter();

  function handleSignOut() {
    clearStoredAuthSession();
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredApiBaseUrl();
    router.push("/auth?mode=access&intent=login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar/95 px-4 py-4 backdrop-blur xl:flex">
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

        <nav className="flex-1 space-y-1 px-1 py-3">
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

        <div className="px-1 pb-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent/35"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-background">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Internal Console</p>
              <p className="text-xs text-muted-foreground">Super admin workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/internal/search"
                className="inline-flex rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                Global Search
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/35"
              >
                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                Sign out
              </button>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

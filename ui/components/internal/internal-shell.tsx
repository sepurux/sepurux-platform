"use client";

import type { ReactNode } from "react";
import React from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bell,
  CreditCard,
  FolderOpen,
  Layers,
  ListChecks,
  LogOut,
  Mail,
  ScrollText,
  Settings,
  Shield,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { clearStoredApiBaseUrl, clearStoredApiKey, clearStoredProjectId } from "@/lib/tenant-settings";
import { cn } from "@/lib/utils";

type InternalNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: InternalNavItem[] = [
  { href: "/internal/dashboard", label: "Overview", icon: Activity },
  { href: "/internal/users", label: "Users", icon: Users },
  { href: "/internal/waitlist", label: "Waitlist", icon: ListChecks },
  { href: "/internal/projects", label: "Projects", icon: FolderOpen },
  { href: "/internal/campaigns", label: "Campaigns", icon: Layers },
  { href: "/internal/failures", label: "Failures", icon: Zap },
  { href: "/internal/billing", label: "Billing", icon: CreditCard },
  { href: "/internal/queues", label: "Queues", icon: Workflow },
  { href: "/internal/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/internal/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/internal/alerts", label: "Alerts", icon: Bell },
  { href: "/internal/email", label: "Email", icon: Mail },
  { href: "/internal/system", label: "System", icon: Shield },
  { href: "/internal/settings", label: "Settings", icon: Settings },
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
    <div className="app-shell-backdrop flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border/75 bg-sidebar/72 px-4 py-4 backdrop-blur-2xl xl:flex">
        <div className="glass-surface px-3 py-3 shadow-insetSoft">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sepurux</p>
          <p className="mt-1 text-sm font-semibold text-foreground">Internal Console</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--accent-teal)" }}>
            Super admin only
          </p>
          <Link
            href="/internal/search"
            className="mt-3 inline-flex rounded-md border border-primary/45 bg-primary/12 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/18"
          >
            Global Search
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-1 py-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                  active
                    ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "border-transparent text-muted-foreground hover:border-border/75 hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-1 pb-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="glass-surface flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent/40"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto bg-background/20">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/72 px-4 py-3 backdrop-blur-2xl md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Internal Console</p>
              <p className="text-xs text-muted-foreground">Super admin workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/internal/search"
                className="inline-flex rounded-md border border-primary/45 bg-primary/12 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/18"
              >
                Global Search
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="glass-surface inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent/40"
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

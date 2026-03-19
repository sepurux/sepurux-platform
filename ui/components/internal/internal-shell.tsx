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
    <div className="flex min-h-screen bg-black text-white">
      <aside className="hidden w-64 border-r border-neutral-800 bg-black xl:block">
        <div className="border-b border-neutral-800 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Sepurux</p>
          <p className="mt-1 text-sm font-semibold text-white">Internal Console</p>
          <p className="mt-1 text-[11px] text-neutral-500">Super admin only</p>
        </div>

        <nav className="space-y-1 px-3 py-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md border px-3 py-2 text-sm transition",
                  active
                    ? "border-neutral-700 bg-neutral-900 text-white"
                    : "border-transparent text-neutral-300 hover:border-neutral-800 hover:bg-neutral-950 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen flex-1 bg-black">{children}</main>
    </div>
  );
}

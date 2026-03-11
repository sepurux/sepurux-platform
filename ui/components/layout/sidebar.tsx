"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bug,
  FileSearch,
  FlaskConical,
  Home,
  PlayCircle,
  ScrollText,
  Settings,
  ShieldAlert,
  Shield,
} from "lucide-react";

import type { AuthSessionMetadata } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primaryItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard", icon: Home },
  { href: "/traces", label: "Traces", section: "traces", icon: FileSearch },
  { href: "/campaigns", label: "Campaigns", section: "campaigns", icon: FlaskConical },
  { href: "/runs", label: "Runs", section: "runs", icon: PlayCircle },
  { href: "/reports", label: "Reports", section: "reports", icon: ScrollText },
  { href: "/mutation-packs", label: "Mutation Packs", section: "mutation-packs", icon: Bug },
  { href: "/policies", label: "Policies", section: "policies", icon: Shield },
  { href: "/security", label: "Security", section: "security", icon: ShieldAlert },
  { href: "/audit", label: "Audit", section: "audit", icon: ScrollText },
  { href: "/webhooks", label: "Webhooks", section: "webhooks", icon: Bell },
  { href: "/settings", label: "Settings", section: "settings", icon: Settings },
];

export function Sidebar({ authSession }: { authSession: AuthSessionMetadata | null }) {
  const pathname = usePathname();
  const visibleSections = new Set(authSession?.permissions.visible_sections ?? []);
  const items = primaryItems.filter(
    (item) => visibleSections.size === 0 || visibleSections.has(item.section)
  );

  return (
    <aside className="hidden h-screen w-64 shrink-0 overflow-hidden border-r border-border bg-sidebar/95 p-4 backdrop-blur xl:flex xl:flex-col">
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 shadow-insetSoft">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-info/20 bg-info/10 text-info">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Agent Sepurux</p>
          <p className="text-sm font-semibold text-foreground">
            {authSession?.project_name ?? "Control Plane"}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-info">
            {authSession?.plan_name ?? "Workspace"} plan
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md border-l-2 border-l-transparent border-transparent px-3 py-2.5 text-sm transition",
                active
                  ? "border-l-primary bg-muted/45 text-foreground shadow-insetSoft"
                  : "text-muted-foreground hover:border-l-border hover:bg-accent/35 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">
          {(authSession?.plan_name ?? "Workspace") + " · " + (authSession?.role_name ?? "viewer")} access
        </p>
        <p>Navigation is filtered by the workspace plan first, then by the current project role.</p>
      </div>
    </aside>
  );
}

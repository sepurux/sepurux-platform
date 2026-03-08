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

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primaryItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/traces", label: "Traces", icon: FileSearch },
  { href: "/campaigns", label: "Campaigns", icon: FlaskConical },
  { href: "/runs", label: "Runs", icon: PlayCircle },
  { href: "/reports", label: "Reports", icon: ScrollText },
  { href: "/mutation-packs", label: "Mutation Packs", icon: Bug },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/security", label: "Security", icon: ShieldAlert },
  { href: "/audit", label: "Audit", icon: ScrollText },
  { href: "/webhooks", label: "Webhooks", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 overflow-hidden border-r border-border/70 bg-card/60 p-4 backdrop-blur xl:flex xl:flex-col">
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 shadow-insetSoft">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Agent Sepurux</p>
          <p className="text-sm font-semibold text-foreground">Control Plane</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {primaryItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition",
                active
                  ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-insetSoft"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/40 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-cyan-300" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Lab Status</p>
        <p>Streaming replay diagnostics, counterfactuals, and fragility analytics in one place.</p>
      </div>
    </aside>
  );
}

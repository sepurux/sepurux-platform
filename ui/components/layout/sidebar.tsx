// ui/components/layout/sidebar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bug,
  ChevronDown,
  Coins,
  FileSearch,
  FlaskConical,
  Home,
  PlayCircle,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
} from "lucide-react";

import type { AuthPermissionSet, AuthSessionMetadata } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavLinkItem = {
  href: string;
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroupChild = {
  href: string;
  label: string;
  permission?: keyof AuthPermissionSet;
};

type NavGroup = {
  label: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavGroupChild[];
};

const primaryItems: NavLinkItem[] = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard", icon: Home },
  { href: "/billing", label: "Billing", section: "billing", icon: Coins },
  { href: "/traces", label: "Traces", section: "traces", icon: FileSearch },
  { href: "/runs", label: "Runs", section: "runs", icon: PlayCircle },
  { href: "/reports", label: "Reports", section: "reports", icon: ScrollText },
  { href: "/audit", label: "Audit", section: "audit", icon: ScrollText },
  { href: "/webhooks", label: "Webhooks", section: "webhooks", icon: Bell },
  { href: "/settings", label: "Settings", section: "settings", icon: Settings },
];

const groupedItems: NavGroup[] = [
  {
    label: "Campaigns",
    section: "campaigns",
    icon: FlaskConical,
    children: [
      { href: "/campaigns", label: "View Campaigns" },
      { href: "/campaigns/new", label: "Create Campaign", permission: "can_create_campaigns" },
    ],
  },
  {
    label: "Mutation Packs",
    section: "mutation-packs",
    icon: Bug,
    children: [
      { href: "/mutation-packs", label: "View Packs" },
      {
        href: "/mutation-packs/new",
        label: "Create Pack",
        permission: "can_manage_mutation_packs",
      },
    ],
  },
  {
    label: "Policies",
    section: "policies",
    icon: Shield,
    children: [
      { href: "/policies", label: "View Policies" },
      {
        href: "/policies/new",
        label: "Create Policy Pack",
        permission: "can_manage_policy_packs",
      },
    ],
  },
  {
    label: "Security",
    section: "security",
    icon: ShieldAlert,
    children: [
      { href: "/security", label: "View Events" },
      {
        href: "/security/tools",
        label: "Manage Tool Zones",
        permission: "can_manage_security_config",
      },
    ],
  },
];

export function Sidebar({ authSession }: { authSession: AuthSessionMetadata | null }) {
  const pathname = usePathname();
  const visibleSections = useMemo(
    () => new Set(authSession?.permissions.visible_sections ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authSession?.permissions.visible_sections?.join(",")]
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const items = primaryItems.filter(
    (item) => visibleSections.size === 0 || visibleSections.has(item.section)
  );
  const dashboardItem = items.find((item) => item.href === "/dashboard") ?? null;
  const trailingItems = items.filter((item) => item.href !== "/dashboard");
  const groups = useMemo(
    () =>
      groupedItems
        .filter((group) => visibleSections.size === 0 || visibleSections.has(group.section))
        .map((group) => ({
          ...group,
          children: group.children.filter((child) => {
            if (!child.permission) return true;
            return authSession?.permissions[child.permission] ?? false;
          }),
        }))
        .filter((group) => group.children.length > 0),
    [authSession?.permissions, visibleSections]
  );

  useEffect(() => {
    setExpandedGroups((currentValue) => {
      let changed = false;
      const nextValue = { ...currentValue };
      for (const group of groups) {
        const active = group.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        );
        if (active && !nextValue[group.section]) {
          nextValue[group.section] = true;
          changed = true;
        }
      }
      return changed ? nextValue : currentValue;
    });
  }, [groups, pathname]);

  return (
    <aside className="relative z-30 hidden h-screen w-64 shrink-0 overflow-hidden border-r border-border bg-sidebar/95 p-4 backdrop-blur xl:flex xl:flex-col">
      {/* workspace header */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 shadow-insetSoft">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border"
          style={{
            borderColor: "rgba(0,229,204,0.2)",
            background: "rgba(0,229,204,0.08)",
          }}
        >
          <Activity className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sepurux</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {authSession?.project_name ?? "Control Plane"}
          </p>
          <p
            className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "var(--accent-teal)" }}
          >
            Credits-enabled workspace
          </p>
        </div>
      </div>

      <nav className="relative z-30 flex-1 space-y-0.5 overflow-y-auto pointer-events-auto">
        {dashboardItem ? (
          <Link
            href={dashboardItem.href}
            className={cn(
              "relative z-30 group flex items-center gap-3 rounded-md border-l-2 border-l-transparent border-transparent px-3 py-2.5 text-sm transition",
              pathname === dashboardItem.href
                ? "border-l-primary bg-muted/45 text-foreground shadow-insetSoft"
                : "text-muted-foreground hover:border-l-border hover:bg-accent/35 hover:text-foreground",
            )}
          >
            <dashboardItem.icon
              className={cn(
                "h-4 w-4",
                pathname === dashboardItem.href
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="flex-1">{dashboardItem.label}</span>
          </Link>
        ) : null}

        {groups.map((group) => {
          const active = group.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          );
          const expanded = expandedGroups[group.section] ?? active;
          const Icon = group.icon;
          const primaryChild = group.children[0];

          return (
            <div key={group.section} className="space-y-0.5">
              <div
                className={cn(
                  "flex items-center rounded-md border-l-2 border-l-transparent border-transparent text-sm transition",
                  active
                    ? "border-l-primary bg-muted/45 text-foreground shadow-insetSoft"
                    : "text-muted-foreground hover:border-l-border hover:bg-accent/35 hover:text-foreground",
                )}
              >
                <Link
                  href={primaryChild.href}
                  className="group flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate text-left">{group.label}</span>
                </Link>
                <button
                  type="button"
                  aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
                  className="relative z-40 shrink-0 px-3 py-2.5"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setExpandedGroups((currentValue) => ({
                      ...currentValue,
                      [group.section]: !expanded,
                    }));
                  }}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expanded ? "rotate-180 text-foreground" : "text-muted-foreground"
                    )}
                  />
                </button>
              </div>

              {expanded ? (
                <div className="relative z-30 space-y-0.5 pl-6">
                  {group.children.map((child) => {
                    const childActive =
                      pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "relative z-30 block rounded-md px-3 py-2 text-sm transition",
                          childActive
                            ? "bg-muted/35 text-foreground shadow-insetSoft"
                            : "text-muted-foreground hover:bg-accent/35 hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {trailingItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative z-30 group flex items-center gap-3 rounded-md border-l-2 border-l-transparent border-transparent px-3 py-2.5 text-sm transition",
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

      {/* footer */}
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">All product surfaces are unlocked.</p>
        <p>Credits are only consumed when you execute runs, replays, and other billable workflows.</p>
      </div>
    </aside>
  );
}

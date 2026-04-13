// ui/components/layout/sidebar.tsx
"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bug,
  ChevronDown,
  ClipboardList,
  FileSearch,
  FlaskConical,
  Home,
  LogOut,
  PlayCircle,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
} from "lucide-react";

import { api, type AuthPermissionSet, type AuthSessionMetadata, type UserNotificationMetadata } from "@/lib/api";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { uiBrandIconUrl } from "@/lib/brand";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ReportBugModal } from "@/components/layout/report-bug-modal";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
} from "@/lib/tenant-settings";

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

function initialsForSession(authSession: AuthSessionMetadata | null) {
  const source = authSession?.name || authSession?.email || "Sepurux";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
}

const primaryItems: NavLinkItem[] = [
  { href: "/", label: "Analyze Trace", section: "dashboard", icon: FileSearch },
  { href: "/dashboard", label: "Dashboard", section: "dashboard", icon: Home },
  { href: "/traces", label: "Traces", section: "traces", icon: FileSearch },
  { href: "/runs", label: "Runs", section: "runs", icon: PlayCircle },
  { href: "/reports", label: "Reports", section: "reports", icon: ScrollText },
  { href: "/audit", label: "Audit", section: "audit", icon: ClipboardList },
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
      { href: "/scheduled-campaigns", label: "Scheduled Campaigns" },
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
  const router = useRouter();
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleSections = useMemo(
    () => new Set(authSession?.permissions.visible_sections ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authSession?.permissions.visible_sections?.join(",")]
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<UserNotificationMetadata[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [notificationMenuPosition, setNotificationMenuPosition] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);

  const items = primaryItems.filter(
    (item) => item.href === "/" || visibleSections.size === 0 || visibleSections.has(item.section)
  );
  const homeItem = items.find((item) => item.href === "/") ?? null;
  const dashboardItem = items.find((item) => item.href === "/dashboard") ?? null;
  const trailingItems = items.filter((item) => item.href !== "/" && item.href !== "/dashboard");
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
  const userInitials = initialsForSession(authSession);
  const userLabel = authSession?.name || authSession?.email || "Workspace User";
  const roleLabel = authSession?.role_name || "User";

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) {
      setNotificationsLoading(true);
    }
    try {
      const payload = await api.getNotifications({ limit: 10, unread_only: true });
      setNotifications(payload.items);
      setNotificationsUnreadCount(payload.unread_count);
      setNotificationsError(null);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Failed to load notifications");
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  const closeNotificationsMenu = useCallback(() => {
    setNotificationsMenuOpen(false);
  }, []);

  useEffect(() => {
    void loadNotifications(false);
    const timer = window.setInterval(() => {
      void loadNotifications(true);
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [loadNotifications, authSession?.project_id]);

  useEffect(() => {
    if (!notificationsMenuOpen) {
      return;
    }

    function updateNotificationMenuPosition() {
      const buttonRect = notificationButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      const width = 320;
      const left = Math.min(
        Math.max(16, buttonRect.left),
        window.innerWidth - width - 16
      );
      const bottom = window.innerHeight - buttonRect.top + 12;
      setNotificationMenuPosition({ left, bottom, width });
    }

    updateNotificationMenuPosition();

    function handleOutsidePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !notificationsMenuRef.current?.contains(target) &&
        !notificationButtonRef.current?.contains(target)
      ) {
        setNotificationsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateNotificationMenuPosition);
    window.addEventListener("scroll", updateNotificationMenuPosition, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateNotificationMenuPosition);
      window.removeEventListener("scroll", updateNotificationMenuPosition, true);
    };
  }, [notificationsMenuOpen]);

  async function handleMarkNotificationRead(notificationId: string) {
    if (markingNotificationId) return;
    const existing = notifications.find((item) => item.notification_id === notificationId);
    const wasUnread = existing ? existing.read_at === null : true;

    if (wasUnread) {
      setNotifications((current) => current.filter((item) => item.notification_id !== notificationId));
      setNotificationsUnreadCount((current) => Math.max(0, current - 1));
    }

    setMarkingNotificationId(notificationId);
    try {
      await api.markNotificationRead(notificationId);
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : "Failed to update notification"
      );
      await loadNotifications(true);
    } finally {
      setMarkingNotificationId(null);
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (markingAllNotifications || notificationsUnreadCount === 0) return;
    const previousNotifications = notifications;
    const previousUnreadCount = notificationsUnreadCount;
    setMarkingAllNotifications(true);
    setNotifications([]);
    setNotificationsUnreadCount(0);
    closeNotificationsMenu();
    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : "Failed to mark notifications as read"
      );
      setNotifications(previousNotifications);
      setNotificationsUnreadCount(previousUnreadCount);
      await loadNotifications(true);
    } finally {
      setMarkingAllNotifications(false);
    }
  }

  function navigateToNotification(linkUrl: string) {
    if (/^https?:\/\//i.test(linkUrl)) {
      window.location.assign(linkUrl);
      return;
    }
    router.push(linkUrl);
  }

  function handleNotificationClick(item: UserNotificationMetadata) {
    closeNotificationsMenu();
    if (!item.read_at) {
      void handleMarkNotificationRead(item.notification_id);
    }
    if (item.link_url) {
      navigateToNotification(item.link_url);
    }
  }

  function handleSignOut() {
    clearStoredAuthSession();
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredApiBaseUrl();
    router.push("/auth?mode=access&intent=login");
  }

  function isActiveHref(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  }

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
    <aside className="relative z-30 hidden h-screen w-[244px] shrink-0 overflow-hidden border-r border-border/75 bg-sidebar/72 px-3 py-4 backdrop-blur-2xl xl:flex xl:flex-col">
      <div className="mb-4 rounded-xl border border-border/70 bg-card/50 p-3 shadow-insetSoft">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-md border border-primary/35 bg-primary/10">
            <img src={uiBrandIconUrl} alt="Sepurux" className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Sepurux
            </p>
            <p className="truncate text-sm font-semibold text-foreground">Control Center</p>
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-muted-foreground">
          {authSession?.project_name ?? "Workspace"}
        </p>
      </div>

      <nav className="relative z-30 flex-1 space-y-1 overflow-y-auto pointer-events-auto pr-1" data-tour="sidebar-nav">
        {homeItem ? (
          <Link
            href={homeItem.href}
            className={cn(
              "relative z-30 group flex h-10 items-center gap-2.5 rounded-lg border pl-3 pr-2 text-[13px] transition-all duration-150",
              isActiveHref(homeItem.href)
                ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <homeItem.icon className={cn("h-4 w-4 shrink-0", isActiveHref(homeItem.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="flex-1 truncate">{homeItem.label}</span>
          </Link>
        ) : null}

        {dashboardItem ? (
          <Link
            href={dashboardItem.href}
            className={cn(
              "relative z-30 group flex h-10 items-center gap-2.5 rounded-lg border pl-3 pr-2 text-[13px] transition-all duration-150",
              isActiveHref(dashboardItem.href)
                ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <dashboardItem.icon className={cn("h-4 w-4 shrink-0", isActiveHref(dashboardItem.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="flex-1 truncate">{dashboardItem.label}</span>
          </Link>
        ) : null}

        {groups.map((group) => {
          const active = group.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href + "/")
          );
          // default expanded = false; active sections are opened by the effect above.
          const expanded = expandedGroups[group.section] ?? false;
          const Icon = group.icon;
          const primaryChild = group.children[0];

          return (
            <div key={group.section} className="space-y-0.5">
              <div
                className={cn(
                  "flex items-center rounded-lg border text-[13px] transition-all duration-150",
                  active
                    ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Link
                  href={primaryChild.href}
                  className="group flex min-w-0 flex-1 items-center gap-2.5 pl-3 py-2.5"
                  data-tour={group.section === "campaigns" ? "campaigns-nav" : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
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
                      "h-3.5 w-3.5 transition-transform duration-150",
                      expanded ? "rotate-180 text-muted-foreground" : "text-muted-foreground/50"
                    )}
                  />
                </button>
              </div>

              {expanded ? (
                <div className="relative z-30 space-y-0.5 pl-4">
                  {group.children.map((child) => {
                    const childActive =
                      pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        data-tour={
                          child.href === "/campaigns/new"
                            ? "create-campaign-link"
                            : child.href === "/campaigns"
                              ? "campaigns-list-link"
                              : undefined
                        }
                        className={cn(
                          "relative z-30 block rounded-md border border-transparent px-3 py-2 text-[12px] transition-colors duration-150",
                          childActive
                            ? "border-primary/30 bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:border-border/65 hover:bg-accent/45 hover:text-foreground",
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
          const active = isActiveHref(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative z-30 group flex h-10 items-center gap-2.5 rounded-lg border pl-3 pr-2 text-[13px] transition-all duration-150",
                active
                  ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                  : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border/70 px-1 pt-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-card/60 p-3 shadow-insetSoft transition-colors duration-150 hover:bg-accent/35"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[linear-gradient(180deg,rgba(148,163,184,0.34),rgba(100,116,139,0.28))] text-[1.9rem] font-semibold text-white">
            {userInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground">
              {userLabel}
            </p>
            <p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
          </div>
        </Link>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative">
            <button
              ref={notificationButtonRef}
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsMenuOpen}
              onClick={() => setNotificationsMenuOpen((currentValue) => !currentValue)}
              className={cn(
                "relative inline-flex h-11 w-11 items-center justify-center rounded-[18px] text-muted-foreground transition-colors duration-150 hover:bg-accent/45 hover:text-foreground",
                notificationsMenuOpen && "bg-primary/14 text-primary shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.22)]"
              )}
            >
              <Bell className="h-5 w-5" />
              {notificationsUnreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                  {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
                </span>
              ) : null}
            </button>
          </div>

          <ThemeToggle
            iconOnly
            className="h-11 w-11 rounded-[18px] text-muted-foreground hover:text-foreground"
            activeClassName="bg-primary/14 text-primary shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.22)]"
          />

          <button
            type="button"
            aria-label="Report bug"
            onClick={() => setBugReportOpen(true)}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-[18px] text-muted-foreground transition-colors duration-150 hover:bg-accent/45 hover:text-rose-300",
              bugReportOpen && "bg-primary/14 text-primary shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.22)]"
            )}
          >
            <Bug className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Sign out"
            onClick={handleSignOut}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] text-muted-foreground transition-colors duration-150 hover:bg-accent/45 hover:text-slate-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {notificationsMenuOpen && notificationMenuPosition
        ? createPortal(
            <div
              ref={notificationsMenuRef}
              className="fixed z-[70] overflow-hidden rounded-2xl border border-border/75 bg-card/95 shadow-panel backdrop-blur-xl"
              style={{
                left: notificationMenuPosition.left,
                bottom: notificationMenuPosition.bottom,
                width: notificationMenuPosition.width,
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  onClick={() => void loadNotifications(false)}
                >
                  Refresh
                </button>
              </div>
              <div className="border-t border-border" />

              <div className="max-h-[340px] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <div className="px-4 py-8 text-center text-sm text-rose-500">
                    {notificationsError}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.notification_id}
                      type="button"
                      disabled={markingNotificationId === item.notification_id}
                      onClick={() => handleNotificationClick(item)}
                      className="w-full"
                    >
                      <div className="w-full px-4 py-3 text-left transition-colors hover:bg-accent">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              notificationSeverityStyles(item.severity)
                            )}
                          >
                            {item.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {formatRelativeDate(item.created_at)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border p-2">
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={markingAllNotifications || notificationsUnreadCount === 0}
                  onClick={() => void handleMarkAllNotificationsRead()}
                >
                  {markingAllNotifications ? "Marking..." : "Mark All Read"}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {bugReportOpen ? (
        <ReportBugModal authSession={authSession} onClose={() => setBugReportOpen(false)} />
      ) : null}

    </aside>
  );
}

function notificationSeverityStyles(severity: UserNotificationMetadata["severity"]) {
  if (severity === "critical") {
    return "bg-rose-500/15 text-rose-500";
  }
  if (severity === "warning") {
    return "bg-amber-500/15 text-amber-500";
  }
  return "bg-sky-500/15 text-sky-500";
}

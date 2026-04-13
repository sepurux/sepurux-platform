// ui/components/layout/top-bar.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CreditCard,
  FolderKanban,
  LogOut,
  Plus,
  TestTube2,
  Sparkles,
  User,
} from "lucide-react";

import {
  api,
  type AuthSessionMetadata,
  type ProjectMetadata,
  type UserNotificationMetadata,
} from "@/lib/api";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { uiBrandIconUrl } from "@/lib/brand";
import { formatRelativeDate } from "@/lib/format";
import { GetCreditsModal } from "@/components/billing/get-credits-modal";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  PROJECTS_UPDATED_EVENT,
  cacheProjects,
  getCachedProjects,
  mergeProjects,
} from "@/lib/project-cache";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
  getStoredProjectId,
  setStoredApiKey,
  setStoredProjectId,
} from "@/lib/tenant-settings";
import { cn } from "@/lib/utils";
import { dispatchOpenNewUserTour } from "@/lib/onboarding-tour";

const tabs = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard" },
  { href: "/traces", label: "Traces", section: "traces" },
  { href: "/campaigns", label: "Campaigns", section: "campaigns" },
  { href: "/runs", label: "Runs", section: "runs" },
  { href: "/reports", label: "Reports", section: "reports" },
];

function initialsForSession(authSession: AuthSessionMetadata | null) {
  const source = authSession?.name || authSession?.email || "Sepurux";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar({ authSession }: { authSession: AuthSessionMetadata | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [projectSwitching, setProjectSwitching] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationMetadata[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      const cached = getCachedProjects().filter(
        (project) => !authSession?.tenant_id || project.tenant_id === authSession.tenant_id
      );
      const sessionProject =
        authSession?.project_id && authSession.tenant_id
          ? [
              {
                project_id: authSession.project_id,
                tenant_id: authSession.tenant_id,
                name: authSession.project_name ?? "Workspace",
                created_at: new Date(0).toISOString(),
              } satisfies ProjectMetadata,
            ]
          : [];

      try {
        const records = await api.listProjects();
        if (cancelled) return;
        const merged = mergeProjects(records, [...sessionProject, ...cached]);
        setProjects(merged);
        cacheProjects(merged);
        setProjectsError(null);

        const stored = getStoredProjectId();
        const fallback =
          merged.find((project) => project.project_id === authSession?.project_id)?.project_id ??
          merged[0]?.project_id ??
          "";
        const next = merged.some((project) => project.project_id === stored) ? (stored ?? "") : fallback;
        setSelectedProjectId(next);
        if (next) setStoredProjectId(next);
      } catch (error) {
        if (cancelled) return;
        const fallbackProjects = mergeProjects(sessionProject, cached);
        setProjects(fallbackProjects);
        if (!fallbackProjects.length) {
          setProjectsError(error instanceof Error ? error.message : "Failed to load projects");
          return;
        }
        const stored = getStoredProjectId();
        const fallback =
          fallbackProjects.find((project) => project.project_id === authSession?.project_id)?.project_id ??
          fallbackProjects[0]?.project_id ??
          "";
        const next =
          fallbackProjects.some((project) => project.project_id === stored) ? (stored ?? "") : fallback;
        setSelectedProjectId(next);
        if (next) setStoredProjectId(next);
      }
    }

    void loadProjects();
    const onProjectsUpdated = () => {
      void loadProjects();
    };
    window.addEventListener(PROJECTS_UPDATED_EVENT, onProjectsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROJECTS_UPDATED_EVENT, onProjectsUpdated);
    };
  }, [authSession?.project_id, authSession?.project_name, authSession?.tenant_id]);

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
    if (!notificationsMenuOpen) {
      return;
    }

    function handleOutsidePointerDown(event: MouseEvent) {
      if (!notificationsMenuRef.current?.contains(event.target as Node)) {
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
    return () => {
      document.removeEventListener("mousedown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsMenuOpen]);

  useEffect(() => {
    void loadNotifications(false);
    const timer = window.setInterval(() => {
      void loadNotifications(true);
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [loadNotifications, authSession?.project_id]);

  async function handleMarkNotificationRead(notificationId: string) {
    if (markingNotificationId) return;
    const existing = notifications.find(
      (item) => item.notification_id === notificationId
    );
    const wasUnread = existing ? existing.read_at === null : true;

    if (wasUnread) {
      setNotifications((current) =>
        current.filter((item) => item.notification_id !== notificationId)
      );
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

  async function handleProjectChange(nextProjectId: string) {
    if (!nextProjectId || nextProjectId === selectedProjectId || projectSwitching) return;
    setSelectedProjectId(nextProjectId);
    setStoredProjectId(nextProjectId);
    setProjectsError(null);

    if (!authSession?.project_scoped) {
      window.location.reload();
      return;
    }

    if (!(authSession?.permissions.can_manage_workspace ?? false)) {
      setProjectsError("This session cannot switch workspaces");
      return;
    }

    setProjectSwitching(true);
    try {
      const switchedKey = await api.createApiKey({
        name: `workspace-switch-${Date.now()}`,
        project_id: nextProjectId,
        rate_limit_per_minute: 240,
      });
      setStoredApiKey(switchedKey.api_key);
      window.location.reload();
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Failed to switch workspace");
      const fallbackProjectId = authSession?.project_id ?? "";
      setSelectedProjectId(fallbackProjectId);
      if (fallbackProjectId) {
        setStoredProjectId(fallbackProjectId);
      }
    } finally {
      setProjectSwitching(false);
    }
  }

  function handleSignOut() {
    clearStoredAuthSession();
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredApiBaseUrl();
    router.push("/auth?mode=access&intent=login");
  }

  const visibleSections = new Set(authSession?.permissions.visible_sections ?? []);
  const visibleTabs = tabs.filter(
    (tab) => tab.href === "/" || visibleSections.size === 0 || visibleSections.has(tab.section)
  );
  const userInitials = initialsForSession(authSession);
  const userLabel = authSession?.name || authSession?.email || "Workspace User";
  const canManageWorkspace = authSession?.permissions.can_manage_workspace ?? false;
  const showProjectSelector = canManageWorkspace;
  const runBudget = authSession?.credits_balance;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/72 px-4 backdrop-blur-2xl md:px-6">
      {/* left: logo icon + project name/selector */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-primary/35 bg-primary/10">
          <img src={uiBrandIconUrl} alt="Sepurux" className="h-full w-full object-cover" />
        </div>

        {showProjectSelector ? (
          <label
            className="glass-surface flex min-w-0 cursor-pointer items-center gap-1 px-2.5 py-1"
            data-tour="project-switcher"
          >
            <select
              className="min-w-0 max-w-[170px] truncate bg-transparent text-sm font-semibold text-foreground outline-none"
              value={selectedProjectId}
              onChange={(event) => { void handleProjectChange(event.target.value); }}
              disabled={!projects.length || projectSwitching}
            >
              {!projects.length ? (
                <option value="">
                  {projectsError ? "Unavailable" : "Loading..."}
                </option>
              ) : null}
              {projectSwitching ? (
                <option value={selectedProjectId}>Switching...</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </label>
        ) : (
          <p className="truncate text-sm font-semibold text-foreground">
            {authSession?.project_name ?? "Sepurux"}
          </p>
        )}
      </div>

      {/* center: tab pill group */}
      <div className="flex flex-1 items-center justify-center overflow-x-auto px-2">
        <div
          className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-card/65 p-1.5 shadow-insetSoft"
          data-tour="top-tabs"
        >
          {visibleTabs.map((tab) => {
              const active =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-4 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/12 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.24)]"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* right: run budget + new project + theme + bell + avatar */}
      <div className="flex items-center gap-2">
        {/* run budget pill */}
        {typeof runBudget === "number" ? (
          <button
            onClick={() => setCreditsModalOpen(true)}
            data-tour="runs-button"
            className={cn(
              "glass-surface hidden items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-accent/45 lg:flex",
              authSession?.is_low_credit
                ? "border-amber-400/45 bg-amber-500/12 text-amber-700 dark:text-amber-100"
                : "text-muted-foreground"
            )}
          >
            <TestTube2
              className="h-3.5 w-3.5"
              style={{ color: authSession?.is_low_credit ? undefined : "var(--accent-teal)" }}
            />
            <div className="flex flex-col leading-tight text-left">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Credits
              </span>
              <span className="font-medium">{runBudget.toLocaleString()}</span>
            </div>
          </button>
        ) : null}

        {/* new project */}
        {canManageWorkspace ? (
          <Link
            href="/profile#projects"
            className="glass-surface hidden items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/45 hover:bg-accent/45 hover:text-foreground lg:flex"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">New Project</span>
          </Link>
        ) : null}

        {/* bell */}
        <ThemeToggle className="xl:hidden" />

        <div ref={notificationsMenuRef} className="relative xl:hidden">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsMenuOpen}
            onClick={() => setNotificationsMenuOpen((currentValue) => !currentValue)}
            className="glass-surface relative inline-flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-accent/45 hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {notificationsUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}
              </span>
            ) : null}
          </button>
          {notificationsMenuOpen ? (
          <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-xl border border-border/75 bg-card/95 shadow-panel backdrop-blur-xl">
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

            <div className="max-h-[360px] overflow-y-auto">
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
                notifications.map((item) => {
                  const content = (
                    <div
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                        item.read_at ? "opacity-80" : "bg-accent/40"
                      )}
                    >
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
                  );

                  return (
                    <button
                      key={item.notification_id}
                      type="button"
                      disabled={markingNotificationId === item.notification_id}
                      onClick={() => handleNotificationClick(item)}
                      className="w-full"
                    >
                      {content}
                    </button>
                  );
                })
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
          </div>
          ) : null}
        </div>

        {/* user menu */}
        <details className="group relative xl:hidden">
          <summary
            className="glass-surface flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-accent/45"
            data-tour="account-menu"
          >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{
                  background: "var(--accent-teal-dim)",
                  color: "var(--accent-teal)",
                }}
              >
              {userInitials}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border/75 bg-card/95 shadow-panel backdrop-blur-xl">
            {/* user info */}
            <div className="flex items-center gap-3 px-4 py-4">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold"
                style={{ background: "var(--accent-teal-dim)", color: "var(--accent-teal)" }}
              >
                {userInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{userLabel}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {authSession?.project_name ?? "Workspace"} · {authSession?.billing_plan_name ?? "Free"}
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-0.5 p-1.5">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent"
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Profile</p>
                  <p className="text-xs text-muted-foreground">Account details</p>
                </div>
              </Link>
              <Link
                href="/profile#billing"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent"
              >
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Billing</p>
                  <p className="text-xs text-muted-foreground">Plans &amp; run budget</p>
                </div>
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent"
                onClick={() => dispatchOpenNewUserTour()}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Product tour</p>
                  <p className="text-xs text-muted-foreground">Replay onboarding guide</p>
                </div>
              </button>
              {canManageWorkspace ? (
                <Link
                  href="/profile#projects"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent"
                >
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Projects</p>
                    <p className="text-xs text-muted-foreground">Manage workspaces</p>
                  </div>
                </Link>
              ) : null}
            </div>

            <div className="border-t border-border" />

            <div className="p-1.5">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Sign out</span>
              </button>
            </div>
          </div>
        </details>
      </div>

      {creditsModalOpen
        ? createPortal(
            <GetCreditsModal
              currentPlanName={authSession?.billing_plan_name ?? null}
              onClose={() => setCreditsModalOpen(false)}
            />,
            document.body
          )
        : null}
    </header>
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

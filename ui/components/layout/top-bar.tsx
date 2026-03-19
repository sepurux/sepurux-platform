// ui/components/layout/top-bar.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Coins, CreditCard, FolderKanban, LogOut, Plus, User } from "lucide-react";

import { api, type AuthSessionMetadata, type ProjectMetadata } from "@/lib/api";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { GetCreditsModal } from "@/components/billing/get-credits-modal";
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
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [projectSwitching, setProjectSwitching] = useState(false);

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
    (tab) => visibleSections.size === 0 || visibleSections.has(tab.section)
  );
  const userInitials = initialsForSession(authSession);
  const userLabel = authSession?.name || authSession?.email || "Workspace User";
  const canManageWorkspace = authSession?.permissions.can_manage_workspace ?? false;
  const showProjectSelector = !authSession?.project_scoped || canManageWorkspace;
  const creditBalance = authSession?.credits_balance;

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* left: wordmark + tabs */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <div
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold sm:flex"
              style={{
                borderColor: "rgba(0,229,204,0.25)",
                background: "rgba(0,229,204,0.08)",
                color: "var(--accent-teal)",
              }}
            >
              S
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {authSession?.project_name ?? "Sepurux"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {authSession
                  ? `${authSession.billing_plan_name ?? "Credits-enabled"} · ${authSession.queue_priority ?? "normal"} queue`
                  : "Reliability dashboard for AI agents"}
              </p>
            </div>
          </div>

          {/* nav tabs */}
          <div className="inline-flex w-fit items-center rounded-md border border-border/70 bg-muted/40 p-1">
            {visibleTabs.map((tab) => {
              const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  style={active ? { color: "var(--accent-teal)" } : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* credits pill */}
          {typeof creditBalance === "number" ? (
            <button
              onClick={() => setCreditsModalOpen(true)}
              className={cn(
                "hidden items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/40 lg:flex",
                authSession?.is_low_credit
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : "border-border/70 bg-card/70 text-foreground"
              )}
            >
              <Coins
                className="h-4 w-4"
                style={{ color: authSession?.is_low_credit ? undefined : "var(--accent-teal)" }}
              />
              <span className="font-medium">{creditBalance.toLocaleString()} credits</span>
            </button>
          ) : null}

          {/* project selector — only for multi-project users */}
          {showProjectSelector ? (
            <label className="hidden min-w-[180px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm lg:flex">
              <FolderKanban className="h-4 w-4 shrink-0" style={{ color: "var(--accent-teal)" }} />
              <select
                className="w-full truncate bg-transparent text-sm text-foreground outline-none"
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
            </label>
          ) : null}

          {/* new project */}
          {canManageWorkspace ? (
            <Link
              href="/profile#projects"
              className="hidden items-center gap-1.5 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/40 lg:flex"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          ) : null}

          {/* bell */}
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card/70 text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>

          {/* user menu */}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-accent/40">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{
                  background: "rgba(0,229,204,0.15)",
                  color: "var(--accent-teal)",
                }}
              >
                {userInitials}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border/70 bg-card shadow-panel">
              {/* user info */}
              <div className="flex items-center gap-3 px-4 py-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold"
                  style={{ background: "rgba(0,229,204,0.15)", color: "var(--accent-teal)" }}
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

              <div className="border-t border-border/50" />

              {/* nav items */}
              <div className="space-y-0.5 p-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile</p>
                    <p className="text-xs text-muted-foreground">Account details</p>
                  </div>
                </Link>
                <Link
                  href="/profile#billing"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Billing</p>
                    <p className="text-xs text-muted-foreground">Plans &amp; credits</p>
                  </div>
                </Link>
                <Link
                  href="/profile#projects"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Projects</p>
                    <p className="text-xs text-muted-foreground">Manage workspaces</p>
                  </div>
                </Link>
              </div>

              <div className="border-t border-border/50" />

              {/* sign out */}
              <div className="p-1.5">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Sign out</span>
                </button>
              </div>
            </div>
          </details>
        </div>
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

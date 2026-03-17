// ui/components/layout/top-bar.tsx
"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Coins, FolderKanban, Loader2, Search } from "lucide-react";

import { api, type AuthSessionMetadata, type ProjectMetadata } from "@/lib/api";
import { clearStoredAuthSession } from "@/lib/auth-session";
import { GetCreditsModal } from "@/components/billing/get-credits-modal";
import {
  clearStoredApiBaseUrl,
  clearStoredApiKey,
  clearStoredProjectId,
  getStoredProjectId,
  setStoredProjectId,
} from "@/lib/tenant-settings";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard", section: "dashboard" },
  { href: "/billing", label: "Billing", section: "billing" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (authSession?.project_scoped) {
        setProjects([]);
        setProjectsError(null);
        setSelectedProjectId(authSession.project_id);
        setStoredProjectId(authSession.project_id);
        return;
      }

      try {
        const records = await api.listProjects();
        if (cancelled) return;
        setProjects(records);
        setProjectsError(null);

        const stored = getStoredProjectId();
        const fallback = records[0]?.project_id ?? "";
        const next = records.some((project) => project.project_id == stored) ? (stored ?? "") : fallback;
        setSelectedProjectId(next);
        if (next) setStoredProjectId(next);
      } catch (error) {
        if (cancelled) return;
        setProjectsError(error instanceof Error ? error.message : "Failed to load projects");
      }
    }

    void loadProjects();
    return () => { cancelled = true; };
  }, [authSession?.project_id, authSession?.project_scoped]);

  function handleProjectChange(nextProjectId: string) {
    if (authSession?.project_scoped) return;
    setSelectedProjectId(nextProjectId);
    setStoredProjectId(nextProjectId);
    window.location.reload();
  }

  function handleSignOut() {
    clearStoredAuthSession();
    clearStoredApiKey();
    clearStoredProjectId();
    clearStoredApiBaseUrl();
    router.push("/auth?mode=access&intent=login");
  }

  async function lookupRun(runId: string) {
    try {
      await api.getRun(runId);
      return `/runs/${runId}`;
    } catch {
      return null;
    }
  }

  async function lookupTrace(traceId: string) {
    try {
      await api.getTrace(traceId);
      return `/traces/${traceId}`;
    } catch {
      return null;
    }
  }

  async function lookupAttempt(attemptId: string) {
    try {
      await api.getAttempt(attemptId);
      return `/attempts/${attemptId}`;
    } catch {
      return null;
    }
  }

  async function resolveSearchTarget(query: string) {
    const normalized = query.trim();
    const toolPrefixed = normalized.match(/^tool\s*:\s*(.+)$/i);
    if (toolPrefixed) {
      const toolName = toolPrefixed[1].trim();
      return toolName ? `/security?tool=${encodeURIComponent(toolName)}` : null;
    }

    const prefixed = normalized.match(/^(run|trace|attempt)\s*:\s*(.+)$/i);
    if (prefixed) {
      const target = prefixed[1].toLowerCase();
      const id = prefixed[2].trim();
      if (!id) return null;
      if (target === "run") return lookupRun(id);
      if (target === "trace") return lookupTrace(id);
      return lookupAttempt(id);
    }

    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);

    if (looksLikeUuid) {
      const [runPath, attemptPath, tracePath] = await Promise.all([
        lookupRun(normalized),
        lookupAttempt(normalized),
        lookupTrace(normalized),
      ]);
      return runPath ?? attemptPath ?? tracePath;
    }

    const keyword = normalized.toLowerCase();
    const [runs, traces] = await Promise.all([
      api.listRuns(100).catch(() => []),
      api.listTraces({ limit: 100, offset: 0 }).catch(() => []),
    ]);

    const runMatch = runs.find((run) =>
      run.run_id.toLowerCase().includes(keyword) ||
      run.campaign_id.toLowerCase().includes(keyword) ||
      run.status.toLowerCase().includes(keyword)
    );
    if (runMatch) return `/runs/${runMatch.run_id}`;

    const traceMatch = traces.find((trace) =>
      trace.trace_id.toLowerCase().includes(keyword) ||
      trace.source.toLowerCase().includes(keyword)
    );
    if (traceMatch) return `/traces/${traceMatch.trace_id}`;

    return null;
  }

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || searching) return;

    setSearching(true);
    setSearchError(null);
    try {
      const path = await resolveSearchTarget(query);
      if (path) {
        router.push(path);
        setSearchQuery("");
        setSearchError(null);
        return;
      }
      setSearchError("No match found. Try run:/trace:/attempt:/tool: prefixes or paste an id.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const visibleSections = new Set(authSession?.permissions.visible_sections ?? []);
  const visibleTabs = tabs.filter(
    (tab) => visibleSections.size === 0 || visibleSections.has(tab.section)
  );
  const userInitials = initialsForSession(authSession);
  const userLabel = authSession?.name || authSession?.email || "Workspace User";
  const showProjectSelector = !authSession?.project_scoped;
  const creditBalance = authSession?.credits_balance;
  const lowCreditThreshold = authSession?.low_credit_threshold ?? 50;

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* left: wordmark + tabs */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            {/* teal logo mark */}
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

        {/* right: credits, project selector, search, bell, user */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* credits pill + get credits button */}
          {typeof creditBalance === "number" ? (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                onClick={() => setCreditsModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/40",
                  authSession?.is_low_credit
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                    : "border-border/70 bg-card/70 text-foreground"
                )}
              >
                <Coins
                  className="h-4 w-4"
                  style={{ color: authSession?.is_low_credit ? undefined : "var(--accent-teal)" }}
                />
                <span className="font-medium">
                  {creditBalance.toLocaleString()} credits
                </span>
              </button>
              <button
                onClick={() => setCreditsModalOpen(true)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent-teal)", color: "#000" }}
              >
                Get credits
              </button>
            </div>
          ) : null}

          {/* project selector */}
          {showProjectSelector ? (
            <label className="hidden min-w-[220px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm lg:flex">
              <FolderKanban className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Project</div>
                <select
                  className="mt-0.5 w-full truncate bg-transparent text-sm text-foreground outline-none"
                  value={selectedProjectId}
                  onChange={(event) => handleProjectChange(event.target.value)}
                  disabled={!projects.length}
                >
                  {!projects.length ? (
                    <option value="">
                      {projectsError ? "Projects unavailable" : "Loading..."}
                    </option>
                  ) : null}
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          ) : (
            <div className="hidden min-w-[220px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm lg:flex">
              <FolderKanban className="h-4 w-4" style={{ color: "var(--accent-teal)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Project</div>
                <p className="mt-0.5 truncate text-sm text-foreground">
                  {authSession?.project_name ?? "Scoped workspace"}
                </p>
              </div>
            </div>
          )}

          {/* search */}
          <form
            className="hidden min-w-[280px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm lg:flex"
            onSubmit={handleSearchSubmit}
          >
            {searching
              ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent-teal)" }} />
              : <Search className="h-4 w-4 text-muted-foreground" />
            }
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (searchError) setSearchError(null);
              }}
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
              placeholder="Search run:/trace:/attempt:/tool: or paste id"
              aria-label="Search runs, traces, and attempts"
            />
          </form>

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
              <span className="hidden text-foreground sm:inline">{userLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-md border border-border/70 bg-card p-1 shadow-panel">
              <div className="px-3 py-2 text-left text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{userLabel}</p>
                <p className="mt-0.5 uppercase tracking-[0.12em]">
                  {typeof creditBalance === "number"
                    ? `${creditBalance.toLocaleString()} credits`
                    : authSession?.billing_plan_name ?? "workspace"}
                </p>
              </div>
              <button
                className="w-full rounded px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </details>
        </div>
      </div>

      {searchError ? (
        <p className="mt-2 text-xs text-rose-300 lg:text-right">{searchError}</p>
      ) : null}

      {creditsModalOpen ? (
        <GetCreditsModal
          currentPlanName={authSession?.billing_plan_name ?? null}
          onClose={() => setCreditsModalOpen(false)}
        />
      ) : null}
    </header>
  );
}

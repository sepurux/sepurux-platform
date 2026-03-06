"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, FolderKanban, Search } from "lucide-react";

import { api, type ProjectMetadata } from "@/lib/api";
import { getStoredProjectId, setStoredProjectId } from "@/lib/tenant-settings";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/traces", label: "Traces" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/runs", label: "Runs" },
];

export function TopBar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const records = await api.listProjects();
        if (cancelled) return;
        setProjects(records);
        setProjectsError(null);

        const stored = getStoredProjectId();
        const fallback = records[0]?.project_id ?? "";
        const next = records.some((project) => project.project_id == stored) ? (stored ?? "") : fallback;
        setSelectedProjectId(next);
        if (next) {
          setStoredProjectId(next);
        }
      } catch (error) {
        if (cancelled) return;
        setProjectsError(error instanceof Error ? error.message : "Failed to load projects");
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleProjectChange(nextProjectId: string) {
    setSelectedProjectId(nextProjectId);
    setStoredProjectId(nextProjectId);
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card/80 text-xs font-semibold text-cyan-200 sm:flex">
              CL
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Agent Crash Lab</p>
              <p className="truncate text-xs text-muted-foreground">Reliability dashboard for replay diagnostics</p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center rounded-md border border-border/70 bg-muted/40 p-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    active ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="hidden min-w-[220px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm lg:flex">
            <FolderKanban className="h-4 w-4 text-cyan-200" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Project</div>
              <select
                className="mt-0.5 w-full truncate bg-transparent text-sm text-foreground outline-none"
                value={selectedProjectId}
                onChange={(event) => handleProjectChange(event.target.value)}
                disabled={!projects.length}
              >
                {!projects.length ? (
                  <option value="">{projectsError ? "Projects unavailable" : "Loading projects..."}</option>
                ) : null}
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <div className="hidden min-w-[220px] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground lg:flex">
            <Search className="h-4 w-4" />
            <span>Search runs, tools, attempts</span>
          </div>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm hover:bg-accent/40">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200">AK</span>
              <span className="hidden text-foreground sm:inline">Analyst</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 mt-2 w-44 rounded-md border border-border/70 bg-card p-1 shadow-panel">
              <button className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50">Profile</button>
              <button className="w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50">Preferences</button>
              <button className="w-full rounded px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/50">Sign out</button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

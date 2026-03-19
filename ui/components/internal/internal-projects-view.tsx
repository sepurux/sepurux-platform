"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalAnalyticsOverview,
  type InternalDashboardOverview,
} from "@/lib/api";

const cardBase = "rounded-lg border border-border/70 bg-card/70 p-4";

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function InternalProjectsView() {
  const [dashboard, setDashboard] = useState<InternalDashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<InternalAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dashboardPayload, analyticsPayload] = await Promise.all([
          api.getInternalDashboard(),
          api.getInternalAnalytics(),
        ]);
        if (cancelled) return;
        setDashboard(dashboardPayload);
        setAnalytics(analyticsPayload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load internal project analytics");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const projectRows = analytics?.top_projects ?? [];
    const runs = projectRows.reduce((sum, row) => sum + row.runs_count, 0);
    const failures = projectRows.reduce((sum, row) => sum + row.failures_count, 0);
    return {
      rankedProjects: projectRows.length,
      runs,
      failures,
    };
  }, [analytics]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Top internal projects by campaign activity and failure volume.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading projects...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && dashboard && analytics ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Active Projects</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{dashboard.active_projects.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ranked Projects</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{totals.rankedProjects.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runs (ranked set)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{totals.runs.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failures (ranked set)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{totals.failures.toLocaleString()}</p>
            </article>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Runs</th>
                  <th className="px-4 py-3">Failures</th>
                  <th className="px-4 py-3">Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_projects.length ? (
                  analytics.top_projects.map((project) => {
                    const rate = project.runs_count > 0 ? (project.failures_count / project.runs_count) * 100 : 0;
                    return (
                      <tr key={project.project_id} className="border-t border-border/70 text-muted-foreground">
                        <td className="px-4 py-3 text-foreground">{project.name}</td>
                        <td className="px-4 py-3">{project.runs_count}</td>
                        <td className="px-4 py-3">{project.failures_count}</td>
                        <td className="px-4 py-3">{formatPct(rate)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No project analytics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

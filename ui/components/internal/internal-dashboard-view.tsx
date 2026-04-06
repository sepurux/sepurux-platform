"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalAlertItem,
  type InternalAnalyticsOverview,
  type InternalDashboardOverview,
  type InternalTimeSeriesMetrics,
} from "@/lib/api";

const cardBase = "rounded-lg border border-border/70 bg-card/70 p-4";

function formatDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function InternalDashboardView() {
  const [overview, setOverview] = useState<InternalDashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<InternalAnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<InternalTimeSeriesMetrics | null>(null);
  const [alerts, setAlerts] = useState<InternalAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [overviewPayload, analyticsPayload, timeSeriesPayload, alertsPayload] = await Promise.all([
          api.getInternalDashboard(),
          api.getInternalAnalytics(),
          api.getInternalAnalyticsTimeSeries(14),
          api.listInternalAlerts(),
        ]);
        if (cancelled) return;
        setOverview(overviewPayload);
        setAnalytics(analyticsPayload);
        setTimeSeries(timeSeriesPayload);
        setAlerts(alertsPayload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.status === 403) {
          setError("Access denied. Super admin role is required.");
        } else {
          setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard");
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

  const trendSummary = useMemo(() => {
    const failures = timeSeries?.failures_over_time ?? [];
    const campaigns = timeSeries?.campaigns_per_day ?? [];

    const failureMax = failures.reduce((max, point) => Math.max(max, point.value), 0);
    const campaignMax = campaigns.reduce((max, point) => Math.max(max, point.value), 0);

    return {
      failures: [...failures].slice(-7).reverse(),
      campaigns: [...campaigns].slice(-7).reverse(),
      failureMax,
      campaignMax,
    };
  }, [timeSeries]);

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Internal Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational telemetry for the Sepurux core team.</p>
      </div>

      {loading ? (
        <div className={cardBase}>
          <p className="text-sm text-muted-foreground">Loading internal metrics...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && overview && analytics && timeSeries ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total Users</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{overview.total_users.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Active Projects</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{overview.active_projects.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Running Campaigns</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{overview.running_campaigns.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failures (24h)</p>
              <p className={`mt-2 text-3xl font-semibold ${overview.failures_last_24h > 0 ? "text-amber-400" : "text-primary"}`}>
                {overview.failures_last_24h.toLocaleString()}
              </p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Security Blocks (24h)</p>
              <p className={`mt-2 text-3xl font-semibold ${overview.security_blocks_24h > 0 ? "text-red-400" : "text-primary"}`}>
                {overview.security_blocks_24h.toLocaleString()}
              </p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Policy Denies (24h)</p>
              <p className={`mt-2 text-3xl font-semibold ${overview.policy_denies_24h > 0 ? "text-amber-400" : "text-primary"}`}>
                {overview.policy_denies_24h.toLocaleString()}
              </p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Credits Used</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{overview.credits_used.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">System Health</p>
              <p className={`mt-2 text-2xl font-semibold capitalize ${overview.system_health.status === "healthy" ? "text-emerald-400" : overview.system_health.status === "degraded" ? "text-amber-400" : "text-red-400"}`}>
                {overview.system_health.status}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Workers: {overview.system_health.worker_status}</p>
              <p className="text-sm text-muted-foreground">Queue backlog: {overview.system_health.queue_backlog}</p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="overflow-hidden rounded-lg border border-border/70 bg-card/70 xl:col-span-2">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-primary">Top Projects Snapshot</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Runs and failure rates across current top project cohort.
                </p>
              </div>
              <table className="w-full min-w-[640px] text-left text-sm">
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
                    analytics.top_projects.slice(0, 8).map((project) => (
                      <tr key={project.project_id} className="border-t border-border/70 text-muted-foreground">
                        <td className="px-4 py-3 text-foreground">{project.name}</td>
                        <td className="px-4 py-3">{project.runs_count}</td>
                        <td className="px-4 py-3">{project.failures_count}</td>
                        <td className="px-4 py-3">{pct(project.failures_count, project.runs_count)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        No project analytics available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>

            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Active Alerts</p>
              <div className="mt-3 space-y-2">
                {alerts.length ? (
                  alerts.slice(0, 6).map((alert, index) => (
                    <div key={`${alert.alert_type}-${index}`} className="rounded border border-border/70 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {alert.alert_type.replaceAll("_", " ")}
                        </p>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            alert.severity === "critical"
                              ? "bg-red-900/40 text-red-200"
                              : "bg-amber-900/40 text-amber-200"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{alert.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active alerts.</p>
                )}
              </div>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Failures (Last 7 Days)</p>
              <div className="mt-3 space-y-2">
                {trendSummary.failures.length ? (
                  trendSummary.failures.map((point) => (
                    <div key={`fail-${point.date}`} className="grid grid-cols-[96px_1fr_44px] items-center gap-2 text-sm">
                      <p className="text-muted-foreground">{formatDayLabel(point.date)}</p>
                      <div className="h-2 overflow-hidden rounded bg-muted/40">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${Math.max(
                              4,
                              trendSummary.failureMax > 0
                                ? Math.round((point.value / trendSummary.failureMax) * 100)
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-right text-muted-foreground">{point.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No failure trend data.</p>
                )}
              </div>
            </article>

            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Campaigns / Day (Last 7 Days)</p>
              <div className="mt-3 space-y-2">
                {trendSummary.campaigns.length ? (
                  trendSummary.campaigns.map((point) => (
                    <div key={`camp-${point.date}`} className="grid grid-cols-[96px_1fr_44px] items-center gap-2 text-sm">
                      <p className="text-muted-foreground">{formatDayLabel(point.date)}</p>
                      <div className="h-2 overflow-hidden rounded bg-muted/40">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${Math.max(
                              4,
                              trendSummary.campaignMax > 0
                                ? Math.round((point.value / trendSummary.campaignMax) * 100)
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-right text-muted-foreground">{point.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No campaign trend data.</p>
                )}
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}

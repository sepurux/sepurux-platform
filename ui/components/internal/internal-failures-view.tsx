"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalAlertItem,
  type InternalDashboardOverview,
  type InternalSearchFailureResult,
  type InternalTimeSeriesMetrics,
} from "@/lib/api";

const cardBase = "rounded-lg border border-border/70 bg-card/70 p-4";

function formatDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InternalFailuresView() {
  const [dashboard, setDashboard] = useState<InternalDashboardOverview | null>(null);
  const [alerts, setAlerts] = useState<InternalAlertItem[]>([]);
  const [timeSeries, setTimeSeries] = useState<InternalTimeSeriesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryInput, setQueryInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<InternalSearchFailureResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dashboardPayload, alertsPayload, timeSeriesPayload] = await Promise.all([
          api.getInternalDashboard(),
          api.listInternalAlerts(),
          api.getInternalAnalyticsTimeSeries(14),
        ]);
        if (cancelled) return;
        setDashboard(dashboardPayload);
        setAlerts(alertsPayload);
        setTimeSeries(timeSeriesPayload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load failure telemetry");
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

  const trend = useMemo(() => {
    const points = timeSeries?.failures_over_time ?? [];
    if (!points.length) {
      return {
        latest: 0,
        delta: 0,
        max: 0,
        recent: [] as InternalTimeSeriesMetrics["failures_over_time"],
      };
    }
    const latest = points[points.length - 1]?.value ?? 0;
    const previous = points.length > 1 ? points[points.length - 2]?.value ?? 0 : 0;
    const max = points.reduce((acc, point) => Math.max(acc, point.value), 0);
    return {
      latest,
      delta: latest - previous,
      max,
      recent: [...points].slice(-10).reverse(),
    };
  }, [timeSeries]);

  const criticalAlerts = useMemo(
    () => alerts.filter((item) => item.severity === "critical").length,
    [alerts]
  );

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = queryInput.trim();
    setSearchedQuery(next || null);
    setSearchError(null);

    if (!next) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const payload = await api.searchInternal(next);
      setResults(payload.failures);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setSearchError(requestError.message);
      } else {
        setSearchError("Failed to search failures");
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Failures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Failure volume, active risk alerts, and searchable failure records.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading failure data...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && dashboard && timeSeries ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failures (24h)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{dashboard.failures_last_24h}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Critical Alerts</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{criticalAlerts}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Latest Daily Failures</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{trend.latest}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Day-over-Day Delta</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {trend.delta > 0 ? "+" : ""}
                {trend.delta}
              </p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Failure Trend (Recent Days)</p>
              <div className="mt-3 space-y-2">
                {trend.recent.length ? (
                  trend.recent.map((point) => (
                    <div key={point.date} className="grid grid-cols-[96px_1fr_44px] items-center gap-2 text-sm">
                      <p className="text-muted-foreground">{formatDayLabel(point.date)}</p>
                      <div className="h-2 overflow-hidden rounded bg-muted/40">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${Math.max(
                              4,
                              trend.max > 0 ? Math.round((point.value / trend.max) * 100) : 0
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-right text-muted-foreground">{point.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No failure trend points available.</p>
                )}
              </div>
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

          <div className="space-y-3 rounded-lg border border-border/70 bg-card/70 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Failure Search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search by failure type, mutation name, or description.
              </p>
            </div>
            <form onSubmit={submitSearch} className="flex gap-2">
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search failures"
                className="h-10 flex-1 rounded border border-border/70 bg-background px-3 text-sm text-foreground"
              />
              <button
                type="submit"
                disabled={searching}
                className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchError ? <p className="text-sm text-red-200">{searchError}</p> : null}

            {searchedQuery !== null ? (
              <div className="overflow-hidden rounded-md border border-border/70">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Mutation</th>
                      <th className="px-3 py-2">Project</th>
                      <th className="px-3 py-2">Run</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length ? (
                      results.map((failure) => (
                        <tr key={failure.failure_id} className="border-t border-border/70 text-muted-foreground">
                          <td className="px-3 py-2 text-xs">{new Date(failure.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-foreground">{failure.failure_type}</td>
                          <td className="px-3 py-2">{failure.mutation_name}</td>
                          <td className="px-3 py-2 text-xs">{failure.project_id}</td>
                          <td className="px-3 py-2 text-xs">{failure.run_id}</td>
                          <td className="px-3 py-2">{failure.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          No failures found for "{searchedQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

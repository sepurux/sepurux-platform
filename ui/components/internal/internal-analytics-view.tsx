"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalAnalyticsOverview,
  type InternalDateCountMetric,
  type InternalDateScoreMetric,
  type InternalTimeSeriesMetrics,
} from "@/lib/api";

function formatDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function maxValue(points: InternalDateCountMetric[]) {
  return points.reduce((max, point) => Math.max(max, point.value), 0);
}

function CountTrendList({
  title,
  points,
}: {
  title: string;
  points: InternalDateCountMetric[];
}) {
  const max = Math.max(maxValue(points), 1);

  return (
    <article className="rounded-lg border border-border/70 bg-card/70 p-4">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-3 space-y-2">
        {points.map((point) => (
          <div key={`${title}-${point.date}`} className="grid grid-cols-[90px_1fr_48px] items-center gap-2">
            <p className="text-xs text-muted-foreground">{formatDayLabel(point.date)}</p>
            <div className="h-2 overflow-hidden rounded bg-muted/40">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.max(4, Math.round((point.value / max) * 100))}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">{point.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReliabilityTrendList({ points }: { points: InternalDateScoreMetric[] }) {
  return (
    <article className="rounded-lg border border-border/70 bg-card/70 p-4">
      <h3 className="text-sm font-semibold text-primary">Reliability Trends</h3>
      <div className="mt-3 space-y-2">
        {points.map((point) => (
          <div
            key={`reliability-${point.date}`}
            className="grid grid-cols-[90px_1fr_52px] items-center gap-2"
          >
            <p className="text-xs text-muted-foreground">{formatDayLabel(point.date)}</p>
            <div className="h-2 overflow-hidden rounded bg-muted/40">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.max(4, Math.min(point.value, 100))}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">{point.value.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function InternalAnalyticsView() {
  const [data, setData] = useState<InternalAnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<InternalTimeSeriesMetrics | null>(null);
  const [windowDays, setWindowDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [analyticsPayload, timeSeriesPayload] = await Promise.all([
          api.getInternalAnalytics(),
          api.getInternalAnalyticsTimeSeries(windowDays),
        ]);
        if (cancelled) return;
        setData(analyticsPayload);
        setTimeSeries(timeSeriesPayload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load analytics");
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
  }, [windowDays]);

  const latestReliability = useMemo(() => {
    if (!timeSeries || timeSeries.reliability_trends.length === 0) return null;
    return timeSeries.reliability_trends[timeSeries.reliability_trends.length - 1]?.value ?? null;
  }, [timeSeries]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal usage and reliability analytics.</p>
        </div>
        <label className="text-sm text-muted-foreground">
          Window
          <select
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className="ml-2 rounded-md border border-border/70 bg-card/70 px-2 py-1 text-sm text-foreground"
          >
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
          </select>
        </label>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data && timeSeries ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Active Users</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{data.active_users.toLocaleString()}</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Credits Used (30d)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {data.credits_used_last_30_days.toLocaleString()}
              </p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failure Trend</p>
              <p className="mt-2 text-2xl font-semibold text-primary capitalize">{data.failure_trend.direction}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                24h: {data.failure_trend.failures_last_24h} | Prev: {data.failure_trend.failures_previous_24h}
              </p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Latest Reliability</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {latestReliability !== null ? `${latestReliability.toFixed(1)}%` : "n/a"}
              </p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <CountTrendList title="Failures Over Time" points={timeSeries.failures_over_time} />
            <CountTrendList title="Campaigns Per Day" points={timeSeries.campaigns_per_day} />
            <ReliabilityTrendList points={timeSeries.reliability_trends} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Runs (30d)</th>
                  <th className="px-4 py-3">Failures (30d)</th>
                </tr>
              </thead>
              <tbody>
                {data.top_projects.length ? (
                  data.top_projects.map((project) => (
                    <tr key={project.project_id} className="border-t border-border/70 text-muted-foreground">
                      <td className="px-4 py-3 text-foreground">{project.name}</td>
                      <td className="px-4 py-3">{project.runs_count}</td>
                      <td className="px-4 py-3">{project.failures_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No project analytics available.
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

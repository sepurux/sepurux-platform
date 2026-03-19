"use client";

import { useEffect, useState } from "react";

import { ApiError, api, type InternalAnalyticsOverview } from "@/lib/api";

export function InternalAnalyticsView() {
  const [data, setData] = useState<InternalAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.getInternalAnalytics();
        if (cancelled) return;
        setData(payload);
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
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-400">Internal usage and reliability analytics.</p>
      </div>

      {loading ? <p className="text-sm text-neutral-400">Loading analytics...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Active Users</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.active_users.toLocaleString()}</p>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Credits Used (30d)</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {data.credits_used_last_30_days.toLocaleString()}
              </p>
            </article>
            <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Failure Trend</p>
              <p className="mt-2 text-2xl font-semibold text-white capitalize">{data.failure_trend.direction}</p>
              <p className="mt-1 text-sm text-neutral-400">
                24h: {data.failure_trend.failures_last_24h} | Prev: {data.failure_trend.failures_previous_24h}
              </p>
              <p className="text-sm text-neutral-400">Delta: {data.failure_trend.delta_percentage}%</p>
            </article>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-black/60 text-xs uppercase tracking-[0.14em] text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Runs (30d)</th>
                  <th className="px-4 py-3">Failures (30d)</th>
                </tr>
              </thead>
              <tbody>
                {data.top_projects.length ? (
                  data.top_projects.map((project) => (
                    <tr key={project.project_id} className="border-t border-neutral-800 text-neutral-200">
                      <td className="px-4 py-3 text-white">{project.name}</td>
                      <td className="px-4 py-3">{project.runs_count}</td>
                      <td className="px-4 py-3">{project.failures_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
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

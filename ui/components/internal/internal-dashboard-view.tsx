"use client";

import { useEffect, useState } from "react";

import { ApiError, api, type InternalDashboardOverview } from "@/lib/api";

const cardBase = "rounded-lg border border-neutral-800 bg-neutral-950 p-4";

export function InternalDashboardView() {
  const [data, setData] = useState<InternalDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const overview = await api.getInternalDashboard();
        if (cancelled) return;
        setData(overview);
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

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-semibold text-white">Internal Overview</h1>
        <p className="mt-1 text-sm text-neutral-400">Operational telemetry for the Sepurux core team.</p>
      </div>

      {loading ? (
        <div className={cardBase}>
          <p className="text-sm text-neutral-300">Loading internal metrics...</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Total Users</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.total_users.toLocaleString()}</p>
          </article>
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Active Projects</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.active_projects.toLocaleString()}</p>
          </article>
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Running Campaigns</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.running_campaigns.toLocaleString()}</p>
          </article>
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Failures (24h)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.failures_last_24h.toLocaleString()}</p>
          </article>
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Credits Used</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.credits_used.toLocaleString()}</p>
          </article>
          <article className={cardBase}>
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">System Health</p>
            <p className="mt-2 text-2xl font-semibold text-white capitalize">{data.system_health.status}</p>
            <p className="mt-1 text-sm text-neutral-400">Workers: {data.system_health.worker_status}</p>
            <p className="text-sm text-neutral-400">Queue backlog: {data.system_health.queue_backlog}</p>
          </article>
        </div>
      ) : null}
    </section>
  );
}

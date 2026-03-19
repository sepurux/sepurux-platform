"use client";

import { useEffect, useState } from "react";

import { ApiError, api, type InternalSystemOverview } from "@/lib/api";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export function InternalSystemView() {
  const [data, setData] = useState<InternalSystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await api.getInternalSystemOverview();
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load system health");
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
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">System Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">API latency, worker state, error rates, and uptime.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading system health...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">API Latency</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{data.api_latency_ms}ms</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Worker Status</p>
            <p className="mt-2 text-2xl font-semibold capitalize text-primary">{data.worker_status}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Error Rate (24h)</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{data.error_rate_24h}%</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Uptime</p>
            <p className="mt-2 text-lg font-semibold text-primary">{formatUptime(data.uptime_seconds)}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Queue Backlog</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{data.queue_backlog}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Runs (24h)</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{data.runs_last_24h}</p>
          </article>
          <article className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Failed Runs (24h)</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{data.failed_runs_last_24h}</p>
          </article>
        </div>
      ) : null}
    </section>
  );
}

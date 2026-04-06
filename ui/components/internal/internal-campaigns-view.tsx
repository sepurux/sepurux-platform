"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  api,
  type InternalDashboardOverview,
  type InternalSearchCampaignResult,
  type InternalTimeSeriesMetrics,
} from "@/lib/api";

const cardBase = "rounded-lg border border-border/70 bg-card/70 p-4";

function formatDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InternalCampaignsView() {
  const [dashboard, setDashboard] = useState<InternalDashboardOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<InternalTimeSeriesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryInput, setQueryInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<InternalSearchCampaignResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dashboardPayload, timeSeriesPayload] = await Promise.all([
          api.getInternalDashboard(),
          api.getInternalAnalyticsTimeSeries(14),
        ]);
        if (cancelled) return;
        setDashboard(dashboardPayload);
        setTimeSeries(timeSeriesPayload);
        setError(null);
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Failed to load campaign telemetry");
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

  const campaignWindowStats = useMemo(() => {
    const points = timeSeries?.campaigns_per_day ?? [];
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const peak = points.reduce((max, point) => Math.max(max, point.value), 0);
    const avg = points.length ? total / points.length : 0;
    const recent = [...points].slice(-10).reverse();
    return { total, peak, avg, recent };
  }, [timeSeries]);

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
      setResults(payload.campaigns);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setSearchError(requestError.message);
      } else {
        setSearchError("Failed to search campaigns");
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
      <div className="border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold text-primary">Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Campaign throughput tracking plus searchable campaign inventory.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading campaign data...</p> : null}

      {!loading && error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && dashboard && timeSeries ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Running Campaigns</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{dashboard.running_campaigns}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Campaigns (14d)</p>
              <p className="mt-2 text-3xl font-semibold text-primary">
                {campaignWindowStats.total.toLocaleString()}
              </p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Peak Daily Throughput</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{campaignWindowStats.peak.toLocaleString()}</p>
            </article>
            <article className={cardBase}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Average / Day</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{campaignWindowStats.avg.toFixed(1)}</p>
            </article>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-primary">Recent Campaign Throughput</p>
            <div className="mt-3 space-y-2">
              {campaignWindowStats.recent.length ? (
                campaignWindowStats.recent.map((point) => (
                  <div key={point.date} className="grid grid-cols-[96px_1fr_44px] items-center gap-2 text-sm">
                    <p className="text-muted-foreground">{formatDayLabel(point.date)}</p>
                    <div className="h-2 overflow-hidden rounded bg-muted/40">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.max(
                            4,
                            campaignWindowStats.peak > 0 ? Math.round((point.value / campaignWindowStats.peak) * 100) : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-right text-muted-foreground">{point.value}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No campaign trend data available.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-card/70 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Campaign Search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search campaigns by name (global internal lookup).
              </p>
            </div>
            <form onSubmit={submitSearch} className="flex gap-2">
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search campaigns"
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
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-background/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Campaign</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Project</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length ? (
                      results.map((campaign) => (
                        <tr key={campaign.campaign_id} className="border-t border-border/70 text-muted-foreground">
                          <td className="px-3 py-2 text-foreground">{campaign.name}</td>
                          <td className="px-3 py-2">{campaign.status}</td>
                          <td className="px-3 py-2 text-xs">{campaign.project_id}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {new Date(campaign.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          No campaigns found for "{searchedQuery}".
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

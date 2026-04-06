"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  api,
  type InternalSystemOverview,
  type InternalTenantApiKeyRevokeResponse,
  type InternalTenantControls,
} from "@/lib/api";

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
  const [tenantIdInput, setTenantIdInput] = useState("");
  const [tenantControls, setTenantControls] = useState<InternalTenantControls | null>(null);
  const [tenantControlsLoading, setTenantControlsLoading] = useState(false);
  const [tenantControlsSaving, setTenantControlsSaving] = useState(false);
  const [tenantControlsError, setTenantControlsError] = useState<string | null>(null);
  const [tenantControlsStatus, setTenantControlsStatus] = useState<string | null>(null);
  const [tenantReason, setTenantReason] = useState("");

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

  async function loadTenantControls(targetTenantId: string) {
    setTenantControlsLoading(true);
    setTenantControlsStatus(null);
    try {
      const payload = await api.getInternalTenantControls(targetTenantId);
      setTenantControls(payload);
      setTenantControlsError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setTenantControlsError(requestError.message);
      } else {
        setTenantControlsError("Failed to load tenant controls");
      }
      setTenantControls(null);
    } finally {
      setTenantControlsLoading(false);
    }
  }

  async function onTenantLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = tenantIdInput.trim();
    if (!normalized) {
      setTenantControlsError("Tenant ID is required");
      return;
    }
    await loadTenantControls(normalized);
  }

  async function updateControls(patch: {
    runs_paused?: boolean;
    workspace_creation_locked?: boolean;
  }) {
    if (!tenantControls) return;
    setTenantControlsSaving(true);
    setTenantControlsStatus(null);
    try {
      const updated = await api.updateInternalTenantControls(tenantControls.tenant_id, {
        ...patch,
        reason: tenantReason.trim() || null,
      });
      setTenantControls(updated);
      setTenantControlsError(null);
      setTenantControlsStatus("Tenant controls updated.");
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setTenantControlsError(requestError.message);
      } else {
        setTenantControlsError("Failed to update tenant controls");
      }
    } finally {
      setTenantControlsSaving(false);
    }
  }

  async function revokeKeys() {
    if (!tenantControls) return;
    const confirmed = window.confirm(
      "Revoke all active API keys for this tenant? This action is immediate."
    );
    if (!confirmed) return;

    setTenantControlsSaving(true);
    setTenantControlsStatus(null);
    try {
      const response: InternalTenantApiKeyRevokeResponse = await api.revokeInternalTenantApiKeys(
        tenantControls.tenant_id,
        {
          reason: tenantReason.trim() || null,
        }
      );
      setTenantControls(response.controls);
      setTenantControlsError(null);
      setTenantControlsStatus(`Revoked ${response.revoked_count} API key(s).`);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setTenantControlsError(requestError.message);
      } else {
        setTenantControlsError("Failed to revoke tenant API keys");
      }
    } finally {
      setTenantControlsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 md:px-6">
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
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">API Latency</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{data.api_latency_ms}ms</p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Worker Status</p>
              <p className={`mt-2 text-2xl font-semibold capitalize ${data.worker_status === "online" ? "text-emerald-400" : data.worker_status === "unknown" ? "text-amber-400" : "text-red-400"}`}>
                {data.worker_status}
              </p>
            </article>
            <article className="rounded-lg border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Error Rate (24h)</p>
              <p className={`mt-2 text-3xl font-semibold ${data.error_rate_24h > 10 ? "text-red-400" : data.error_rate_24h > 5 ? "text-amber-400" : "text-primary"}`}>
                {data.error_rate_24h}%
              </p>
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

          <div className="space-y-4 rounded-lg border border-border/70 bg-card/70 p-4">
            <div>
              <h2 className="text-lg font-semibold text-primary">Tenant Controls</h2>
              <p className="text-sm text-muted-foreground">
                Pause runs, lock workspace creation, or revoke API keys for a specific tenant.
                Enter a tenant ID or user ID — both are accepted.
              </p>
            </div>

            <form onSubmit={onTenantLookup} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={tenantIdInput}
                onChange={(event) => setTenantIdInput(event.target.value)}
                placeholder="Tenant ID or User ID"
                className="h-10 rounded border border-border/70 bg-background px-3 text-sm text-foreground"
              />
              <button
                type="submit"
                disabled={tenantControlsLoading}
                className="rounded border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
              >
                {tenantControlsLoading ? "Loading..." : "Load tenant"}
              </button>
            </form>

            {tenantControlsError ? (
              <div className="rounded-md border border-red-900/60 bg-red-950/30 p-3">
                <p className="text-sm text-red-200">{tenantControlsError}</p>
              </div>
            ) : null}

            {tenantControls ? (
              <div className="space-y-3 rounded-md border border-border/70 bg-background/40 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Tenant {tenantControls.tenant_id}
                </p>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-3 py-1 ${
                      tenantControls.runs_paused
                        ? "border border-red-900/60 bg-red-950/30 text-red-200"
                        : "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                    }`}
                  >
                    Runs: {tenantControls.runs_paused ? "paused" : "active"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      tenantControls.workspace_creation_locked
                        ? "border border-red-900/60 bg-red-950/30 text-red-200"
                        : "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                    }`}
                  >
                    Workspace creation: {tenantControls.workspace_creation_locked ? "locked" : "open"}
                  </span>
                </div>

                <input
                  value={tenantReason}
                  onChange={(event) => setTenantReason(event.target.value)}
                  placeholder="Optional reason for audit trail"
                  className="h-10 w-full rounded border border-border/70 bg-background px-3 text-sm text-foreground"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={tenantControlsSaving}
                    onClick={() => {
                      void updateControls({ runs_paused: !tenantControls.runs_paused });
                    }}
                    className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                  >
                    {tenantControls.runs_paused ? "Resume runs" : "Pause runs"}
                  </button>
                  <button
                    type="button"
                    disabled={tenantControlsSaving}
                    onClick={() => {
                      void updateControls({
                        workspace_creation_locked: !tenantControls.workspace_creation_locked,
                      });
                    }}
                    className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                  >
                    {tenantControls.workspace_creation_locked
                      ? "Unlock workspace creation"
                      : "Lock workspace creation"}
                  </button>
                  <button
                    type="button"
                    disabled={tenantControlsSaving}
                    onClick={() => {
                      void revokeKeys();
                    }}
                    className="rounded border border-red-900/60 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-950/30 disabled:opacity-60"
                  >
                    Revoke API keys
                  </button>
                </div>

                {tenantControlsStatus ? (
                  <p className="text-sm text-primary">{tenantControlsStatus}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

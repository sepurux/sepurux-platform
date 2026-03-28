"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Trash2, X } from "lucide-react";

import { api, type CampaignMetadata, type TraceMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; campaign: CampaignMetadata };

type Tab = "scenarios" | "overview";

export function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<Tab>("scenarios");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ status: "loading" });
      try {
        const campaign = await api.getCampaign(campaignId);
        if (!cancelled) setState({ status: "ready", campaign });
      } catch (error) {
        if (!cancelled)
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load campaign",
          });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [campaignId]);

  function onCampaignUpdated(updated: CampaignMetadata) {
    setState({ status: "ready", campaign: updated });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {state.status === "ready" ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{state.campaign.name}</h1>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{state.campaign.campaign_id}</p>
          </div>
        ) : (
          <Skeleton className="h-7 w-64" />
        )}
      </div>

      {state.status === "loading" && (
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      )}

      {state.status === "error" && (
        <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {state.message}
        </div>
      )}

      {state.status === "ready" && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-border/60">
            {(["scenarios", "overview"] as Tab[]).map((tab) => {
              const label =
                tab === "scenarios"
                  ? `Scenarios${(state.campaign.eval_set?.trace_ids?.length ?? 0) > 0 ? ` (${state.campaign.eval_set!.trace_ids!.length})` : ""}`
                  : "Overview";
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-info text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activeTab === "scenarios" && (
            <ScenariosTab campaign={state.campaign} onUpdated={onCampaignUpdated} />
          )}
          {activeTab === "overview" && (
            <OverviewTab campaign={state.campaign} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Scenarios Tab ────────────────────────────────────────────────────────────

function ScenariosTab({
  campaign,
  onUpdated,
}: {
  campaign: CampaignMetadata;
  onUpdated: (c: CampaignMetadata) => void;
}) {
  const registeredIds = useMemo(
    () => new Set(campaign.eval_set?.trace_ids ?? []),
    [campaign.eval_set]
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registered trace metadata
  const [traceDetails, setTraceDetails] = useState<Record<string, TraceMetadata>>({});
  useEffect(() => {
    const ids = Array.from(registeredIds);
    if (ids.length === 0) return;
    void Promise.all(
      ids
        .filter((id) => !(id in traceDetails))
        .map((id) =>
          api.getTrace(id).then((t) => setTraceDetails((prev) => ({ ...prev, [id]: t })))
        )
    );
  }, [registeredIds]);

  async function onRemove(traceId: string) {
    setError(null);
    setRemoving(traceId);
    try {
      const updated = await api.updateCampaignEvalSet(campaign.campaign_id, {
        remove_trace_ids: [traceId],
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove trace");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Registered Scenarios</CardTitle>
            <CardDescription>
              Traces registered here are automatically run as one CI batch — no need to pass{" "}
              <span className="font-mono">trace_id</span> per call.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowPicker(true)}>
            <Plus className="h-4 w-4" /> Add Scenario
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-md border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
              {error}
            </div>
          )}
          {registeredIds.size === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No scenarios registered yet. Add traces to enable multi-scenario CI batches.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Tool Calls</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(registeredIds).map((traceId) => {
                  const t = traceDetails[traceId];
                  return (
                    <TableRow key={traceId}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/traces/${traceId}`} className="text-foreground hover:text-info">
                          {shortId(traceId, 12)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t?.task_name ?? <Skeleton className="h-4 w-32" />}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t?.source ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {t?.normalized_summary?.tool_calls ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {t ? formatRelativeDate(t.created_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removing === traceId}
                          onClick={() => void onRemove(traceId)}
                          className="text-muted-foreground hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {campaign.eval_set?.min_scenarios != null && (
        <p className="text-xs text-muted-foreground">
          Min scenarios required before CI can run:{" "}
          <span className="font-medium text-foreground">{campaign.eval_set.min_scenarios}</span>
        </p>
      )}

      {showPicker && (
        <TracePicker
          campaignId={campaign.campaign_id}
          alreadyRegistered={registeredIds}
          onAdded={onUpdated}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Trace Picker ─────────────────────────────────────────────────────────────

function TracePicker({
  campaignId,
  alreadyRegistered,
  onAdded,
  onClose,
}: {
  campaignId: string;
  alreadyRegistered: Set<string>;
  onAdded: (c: CampaignMetadata) => void;
  onClose: () => void;
}) {
  const [traces, setTraces] = useState<TraceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.listTraces({ limit: 100 }).then((result) => {
      setTraces(result);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return traces.filter((t) => {
      if (alreadyRegistered.has(t.trace_id)) return false;
      if (!q) return true;
      return (
        t.trace_id.toLowerCase().includes(q) ||
        (t.task_name ?? "").toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q)
      );
    });
  }, [traces, search, alreadyRegistered]);

  async function onAdd(traceId: string) {
    setError(null);
    setAdding(traceId);
    try {
      const updated = await api.updateCampaignEvalSet(campaignId, {
        add_trace_ids: [traceId],
      });
      onAdded(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add trace");
    } finally {
      setAdding(null);
    }
  }

  return (
    <Card className="border-info/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Add Scenario</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search by task name, source, or trace ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {search ? "No traces match your search." : "All available traces are already registered."}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Tool Calls</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.trace_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortId(t.trace_id, 12)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {t.task_name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.source}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {t.normalized_summary?.tool_calls ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatRelativeDate(t.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={adding === t.trace_id}
                        onClick={() => void onAdd(t.trace_id)}
                      >
                        {adding === t.trace_id ? "Adding…" : "Add"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ campaign }: { campaign: CampaignMetadata }) {
  const mutations = Array.isArray(campaign.mutation_set) ? campaign.mutation_set : [];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Status">
            <Badge variant="neutral">{campaign.status}</Badge>
          </Row>
          <Row label="Mutation Pack">
            {campaign.mutation_pack_id ? (
              <span className="font-mono text-xs text-muted-foreground">
                {shortId(campaign.mutation_pack_id, 16)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row label="Created">
            <span className="text-muted-foreground">{formatRelativeDate(campaign.created_at)}</span>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mutation Set</CardTitle>
          <CardDescription>{mutations.length} mutation(s) defined</CardDescription>
        </CardHeader>
        <CardContent>
          {mutations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mutations defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mutation ID</TableHead>
                  <TableHead>Tool</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutations.map((m: unknown, i: number) => {
                  const mut = m as Record<string, unknown>;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {String(mut.mutation_id ?? "—")}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {String(mut.tool ?? "—")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

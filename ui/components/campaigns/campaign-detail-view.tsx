"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, Play, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { api, type CampaignMetadata, type MutationPackMetadata, type QualityContract, type TraceMetadata } from "@/lib/api";
import { IdPill } from "@/components/ui/id-pill";
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

type Tab = "scenarios" | "contract" | "overview";

type RunModal = { open: false } | { open: true; minPassRate: string; maxUnsafe: string; maxFailures: string };
type RunResult = { batch_id: string; trace_count: number };

export function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<Tab>("scenarios");
  const [runModal, setRunModal] = useState<RunModal>({ open: false });
  const [triggering, setTriggering] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

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

  async function archiveCampaign() {
    setArchiving(true);
    try {
      await api.deleteCampaign(campaignId);
      router.push("/campaigns");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setArchiving(false);
      setArchiveConfirm(false);
    }
  }

  async function triggerRun() {
    if (!runModal.open) return;
    setTriggering(true);
    setRunError(null);
    try {
      const result = await api.triggerCiRun({
        campaign_id: campaignId,
        thresholds: {
          min_pass_rate: parseFloat(runModal.minPassRate) / 100,
          max_unsafe: parseInt(runModal.maxUnsafe, 10),
          max_failures: parseInt(runModal.maxFailures, 10),
        },
      });
      setRunResult({ batch_id: result.batch_id, trace_count: result.trace_count });
      setRunModal({ open: false });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Failed to trigger run");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {state.status === "ready" ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{state.campaign.name}</h1>
              <IdPill id={state.campaign.campaign_id} className="mt-1" />
            </div>
          ) : (
            <Skeleton className="h-7 w-64" />
          )}
        </div>
        {state.status === "ready" && (
          <div className="flex items-center gap-2">
            {archiveConfirm ? (
              <>
                <span className="text-sm text-muted-foreground">Archive this campaign?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveConfirm(false)}
                  disabled={archiving}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void archiveCampaign()}
                  disabled={archiving}
                  className="gap-1.5"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {archiving ? "Archiving…" : "Confirm"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchiveConfirm(true)}
                className="gap-1.5 text-muted-foreground"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            )}
            <Button
              onClick={() => setRunModal({ open: true, minPassRate: "80", maxUnsafe: "0", maxFailures: "5" })}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Run Campaign
            </Button>
          </div>
        )}
      </div>

      {/* Run result banner */}
      {runResult && (
        <div className="flex items-center justify-between rounded-md border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <span>
            Batch triggered — <span className="font-mono">{runResult.trace_count}</span> scenario{runResult.trace_count !== 1 ? "s" : ""} queued.
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-400">{runResult.batch_id}</span>
            <Button size="sm" variant="outline" onClick={() => router.push("/runs")}>
              View Runs
            </Button>
            <button onClick={() => setRunResult(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Run modal */}
      {runModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-foreground">Run Campaign</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Set pass thresholds. The run will use the campaign's eval set and mutation pack.
            </p>
            {runError && (
              <div className="mb-3 rounded border border-rose-400/20 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {runError}
              </div>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Min pass rate (%)</span>
                <input
                  type="number" min={0} max={100}
                  className="w-full rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-info/60"
                  value={runModal.minPassRate}
                  onChange={(e) => setRunModal({ ...runModal, minPassRate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Max unsafe attempts</span>
                <input
                  type="number" min={0}
                  className="w-full rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-info/60"
                  value={runModal.maxUnsafe}
                  onChange={(e) => setRunModal({ ...runModal, maxUnsafe: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Max failures</span>
                <input
                  type="number" min={0}
                  className="w-full rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-info/60"
                  value={runModal.maxFailures}
                  onChange={(e) => setRunModal({ ...runModal, maxFailures: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRunModal({ open: false }); setRunError(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void triggerRun()} disabled={triggering} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                {triggering ? "Triggering…" : "Run"}
              </Button>
            </div>
          </div>
        </div>
      )}



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
            {(["scenarios", "contract", "overview"] as Tab[]).map((tab) => {
              const label =
                tab === "scenarios"
                  ? `Scenarios${(state.campaign.eval_set?.trace_ids?.length ?? 0) > 0 ? ` (${state.campaign.eval_set!.trace_ids!.length})` : ""}`
                  : tab === "contract"
                  ? "Quality Contract"
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
          {activeTab === "contract" && (
            <ContractTab campaign={state.campaign} />
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

// ─── Contract Tab ──────────────────────────────────────────────────────────────

function ContractTab({ campaign }: { campaign: CampaignMetadata }) {
  const campaignId = campaign.campaign_id;

  type ContractState =
    | { status: "loading" }
    | { status: "none" }
    | { status: "ready"; contract: QualityContract }
    | { status: "error"; message: string };

  const [state, setState] = useState<ContractState>({ status: "loading" });
  const [packs, setPacks] = useState<MutationPackMetadata[]>([]);
  const [discoveredTools, setDiscoveredTools] = useState<string[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [requiredTools, setRequiredTools] = useState<string[]>([]);
  const [minAttempts, setMinAttempts] = useState(10);

  useEffect(() => {
    let cancelled = false;

    void api.listMutationPacks({ include_system: true }).then((p) => {
      if (!cancelled) setPacks(p);
    });

    void api.getContract(campaignId)
      .then((c) => { if (!cancelled) { setState({ status: "ready", contract: c }); syncForm(c); } })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("404") || msg.toLowerCase().includes("no contract")) {
          setState({ status: "none" });
        } else {
          setState({ status: "error", message: msg });
        }
      });

    // Discover tools from traces in the eval set
    const traceIds = campaign.eval_set?.trace_ids ?? [];
    if (traceIds.length > 0) {
      setLoadingTools(true);
      void Promise.all(traceIds.map((id) => api.getTrace(id, { includePayload: true })))
        .then((traces) => {
          if (cancelled) return;
          const tools = new Set<string>();
          for (const trace of traces) {
            const events = (trace.payload as Record<string, unknown> | null)?.events;
            if (!Array.isArray(events)) continue;
            for (const event of events as Record<string, unknown>[]) {
              if (event.type === "tool_call" && typeof event.tool === "string") {
                tools.add(event.tool);
              }
            }
          }
          setDiscoveredTools(Array.from(tools).sort());
          setLoadingTools(false);
        })
        .catch(() => { if (!cancelled) setLoadingTools(false); });
    }

    return () => { cancelled = true; };
  }, [campaignId]);

  function syncForm(c: QualityContract) {
    setSelectedPackIds(c.required_pack_ids ?? []);
    setRequiredTools(c.required_tools ?? []);
    setMinAttempts(c.min_attempts_per_pack ?? 10);
  }

  function togglePack(packId: string) {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]
    );
  }

  function toggleTool(tool: string) {
    setRequiredTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  async function onSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const c = await api.upsertContract(campaignId, {
        required_pack_ids: selectedPackIds,
        required_tools: requiredTools,
        min_attempts_per_pack: minAttempts,
      });
      setState({ status: "ready", contract: c });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.deleteContract(campaignId);
      setState({ status: "none" });
      setSelectedPackIds([]);
      setRequiredTools([]);
      setMinAttempts(10);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete contract");
    } finally {
      setDeleting(false);
    }
  }

  if (state.status === "loading") {
    return <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  if (state.status === "error") {
    return (
      <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
        {state.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-info" />
              Quality Contract
            </CardTitle>
            <CardDescription>
              Define what must be tested before a CI batch is allowed to pass. Missing required
              packs, tools, or insufficient attempts will fail the gate — regardless of pass rate.
            </CardDescription>
          </div>
          {state.status === "ready" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={() => void onDelete()}
              className="text-muted-foreground hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {saveError && (
            <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
              {saveError}
            </div>
          )}

          {/* Required packs */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Required mutation packs
            </p>
            <p className="text-xs text-muted-foreground">
              The pack used in the CI run must be one of these. Zero attempts with a required
              pack = hard fail.
            </p>
            <div className="flex flex-wrap gap-2">
              {packs.map((p) => {
                const selected = selectedPackIds.includes(p.mutation_pack_id);
                return (
                  <button
                    key={p.mutation_pack_id}
                    onClick={() => togglePack(p.mutation_pack_id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-info bg-info/10 text-info"
                        : "border-border/60 text-muted-foreground hover:border-info/50 hover:text-foreground"
                    }`}
                  >
                    {p.name}
                    {p.coverage_score != null && (
                      <span className="ml-1.5 opacity-60">{p.coverage_score}%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required tools */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Required tool coverage
            </p>
            <p className="text-xs text-muted-foreground">
              Each tool listed must appear in at least one trace in the batch. If a tool is
              never exercised, the gate fails with{" "}
              <span className="font-mono text-foreground">untested_tool</span>.
            </p>
            {loadingTools ? (
              <p className="text-xs text-muted-foreground">Scanning traces…</p>
            ) : discoveredTools.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tools found — add traces to the eval set first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {discoveredTools.map((tool) => {
                  const selected = requiredTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={`rounded-full border px-3 py-1 text-xs font-mono transition-colors ${
                        selected
                          ? "border-info bg-info/10 text-info"
                          : "border-border/60 text-muted-foreground hover:border-info/50 hover:text-foreground"
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Min attempts */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Minimum attempts
            </p>
            <p className="text-xs text-muted-foreground">
              Total mutation attempts across the batch must reach this threshold. Prevents a{" "}
              <span className="font-mono text-foreground">pass</span> verdict from a trivially
              small run.
            </p>
            <input
              type="number"
              min={1}
              max={500}
              className="w-28 rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-info/60"
              value={minAttempts}
              onChange={(e) => setMinAttempts(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            {state.status === "ready" && (
              <p className="text-xs text-muted-foreground">
                Contract v{state.contract.version} · updated{" "}
                {formatRelativeDate(state.contract.updated_at)}
              </p>
            )}
            {state.status === "none" && (
              <p className="text-xs text-muted-foreground">No contract defined yet.</p>
            )}
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving…" : state.status === "ready" ? "Update Contract" : "Save Contract"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Violation legend */}
      <div className="grid gap-3 md:grid-cols-3">
        {([
          ["wrong_pack", "Pack not in required list. Run was tested with an unapproved mutation pack — replace it with one of the required packs."],
          ["untested_tool", "Required tool never exercised. No trace in the batch called this tool — add a scenario that covers it."],
          ["insufficient_attempts", "Too few mutation attempts. Increase run budget or lower the minimum to match your credit allocation."],
        ] as [string, string][]).map(([type, desc]) => (
          <div key={type} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-mono text-xs font-semibold text-rose-400">{type}</p>
            <p className="mt-1.5 text-xs leading-5 text-neutral-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, History, RefreshCcw, Search } from "lucide-react";

import { api, type CIBatchStatus, type RunMetadata } from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import { celebratePassesOnce } from "@/lib/pass-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; runs: RunMetadata[] };

type BatchGroup = {
  batchId: string | null;
  runs: RunMetadata[];
};
type RunType = "ci_batch" | "template_replay" | "manual";

const PAGE_SIZE = 12;

function getBatchId(run: RunMetadata): string | null {
  return (run.summary?.ci_batch_id as string | undefined) ?? null;
}

function groupByBatch(runs: RunMetadata[]): BatchGroup[] {
  const map = new Map<string, RunMetadata[]>();
  const standalone: RunMetadata[] = [];
  for (const run of runs) {
    const batchId = getBatchId(run);
    if (batchId) {
      const existing = map.get(batchId) ?? [];
      existing.push(run);
      map.set(batchId, existing);
    } else {
      standalone.push(run);
    }
  }
  const groups: BatchGroup[] = [];
  for (const [batchId, batchRuns] of map.entries()) {
    groups.push({ batchId, runs: batchRuns });
  }
  for (const run of standalone) {
    groups.push({ batchId: null, runs: [run] });
  }
  // Sort groups by their most recently created run, descending — keeps chronological order
  return groups.sort((a, b) => {
    const aLatest = a.runs.reduce((max, r) => (r.created_at > max ? r.created_at : max), a.runs[0].created_at);
    const bLatest = b.runs.reduce((max, r) => (r.created_at > max ? r.created_at : max), b.runs[0].created_at);
    return bLatest < aLatest ? -1 : bLatest > aLatest ? 1 : 0;
  });
}

function batchAggStatus(runs: RunMetadata[]): string {
  if (runs.some((r) => r.status === "running")) return "running";
  if (runs.some((r) => r.status === "queued")) return "queued";
  if (runs.some((r) => r.status === "failed")) return "failed";
  if (runs.every((r) => r.status === "completed")) return "completed";
  return "pending";
}

function batchDecision(runs: RunMetadata[]): "pass" | "fail" | "pending" {
  const aggStatus = batchAggStatus(runs);
  if (["running", "queued", "pending"].includes(aggStatus)) return "pending";
  for (const run of runs) {
    const s = (run.summary ?? {}) as Record<string, unknown>;
    if (typeof s.failed_count === "number" && s.failed_count > 0) return "fail";
    if (typeof s.unsafe_count === "number" && s.unsafe_count > 0) return "fail";
  }
  return "pass";
}

function batchPassRate(runs: RunMetadata[]): number | null {
  const rates: number[] = [];
  for (const run of runs) {
    const s = (run.summary ?? {}) as Record<string, unknown>;
    const attempts = typeof s.attempt_count === "number" ? s.attempt_count : 0;
    const passed = typeof s.passed_count === "number" ? s.passed_count : 0;
    if (attempts > 0) rates.push(passed / attempts);
  }
  if (rates.length === 0) return null;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function batchCoveragePct(runs: RunMetadata[]): number {
  const done = runs.filter((r) => r.status === "completed" || r.status === "failed").length;
  return runs.length > 0 ? Math.round((done / runs.length) * 100) : 0;
}

function runDecision(run: RunMetadata): "pass" | "fail" | "pending" {
  const normalizedStatus = run.status.toLowerCase();
  if (!["completed", "failed", "done"].includes(normalizedStatus)) {
    return "pending";
  }

  const summary = (run.summary ?? {}) as Record<string, unknown>;
  const passRate = runPassRate(run);
  const failedCount = numberFromUnknown(summary.failed_count) ?? 0;
  const unsafeCount = numberFromUnknown(run.unsafe_count) ?? numberFromUnknown(summary.unsafe_count) ?? 0;
  const rawThresholds = summary.ci_thresholds;

  if (rawThresholds && typeof rawThresholds === "object") {
    const thresholds = rawThresholds as Record<string, unknown>;
    const minPassRate = numberFromUnknown(thresholds.min_pass_rate);
    const maxUnsafe = numberFromUnknown(thresholds.max_unsafe);
    const maxFailures = thresholds.max_failures == null ? null : numberFromUnknown(thresholds.max_failures);

    if (passRate === null || minPassRate === null || maxUnsafe === null) {
      return "pending";
    }
    if (passRate < minPassRate) {
      return "fail";
    }
    if (unsafeCount > maxUnsafe) {
      return "fail";
    }
    if (maxFailures !== null && failedCount > maxFailures) {
      return "fail";
    }
    return "pass";
  }

  if (passRate === null) {
    return "pending";
  }
  return failedCount === 0 && unsafeCount === 0 ? "pass" : "fail";
}

function getCampaignName(run: RunMetadata): string | null {
  const s = (run.summary ?? {}) as Record<string, unknown>;
  return typeof s.campaign_name === "string" ? s.campaign_name : null;
}

function runPassRate(run: RunMetadata): number | null {
  const s = (run.summary ?? {}) as Record<string, unknown>;
  const attempts = typeof s.attempt_count === "number" ? s.attempt_count : 0;
  const passed = typeof s.passed_count === "number" ? s.passed_count : 0;
  return attempts > 0 ? passed / attempts : null;
}

function runAttemptCount(run: RunMetadata): number | null {
  const s = (run.summary ?? {}) as Record<string, unknown>;
  return typeof s.attempt_count === "number" ? s.attempt_count : null;
}

function numberFromUnknown(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function runTypeForRun(run: RunMetadata): RunType {
  const summary = (run.summary ?? {}) as Record<string, unknown>;
  if (typeof summary.ci_batch_id === "string" && summary.ci_batch_id.trim()) {
    return "ci_batch";
  }
  const templateApplication = summary.template_application;
  if (templateApplication && typeof templateApplication === "object") {
    return "template_replay";
  }
  return "manual";
}

export function RunsListView() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [batchStatuses, setBatchStatuses] = useState<Record<string, CIBatchStatus>>({});
  const [isOpen, setIsOpen] = useState(true);

  async function load() {
    setState({ status: "loading" });
    try {
      const runs = await api.listRuns({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setState({ status: "ready", runs });
      setHasNext(runs.length === PAGE_SIZE);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load runs",
      });
      setHasNext(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, statusFilter]);

  const filteredRuns = useMemo(() => {
    if (state.status !== "ready") return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return state.runs;
    return state.runs.filter(
      (run) =>
        run.run_id.toLowerCase().includes(q) ||
        run.campaign_id.toLowerCase().includes(q) ||
        (getBatchId(run) ?? "").toLowerCase().includes(q)
    );
  }, [state, searchQuery]);

  const batchGroups = useMemo(() => groupByBatch(filteredRuns), [filteredRuns]);
  const missingBatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of batchGroups) {
      if (group.batchId && !(group.batchId in batchStatuses)) {
        ids.add(group.batchId);
      }
    }
    return Array.from(ids);
  }, [batchGroups, batchStatuses]);

  useEffect(() => {
    if (missingBatchIds.length === 0) return;

    let cancelled = false;

    void Promise.allSettled(
      missingBatchIds.map(async (batchId) => [batchId, await api.getCiBatch(batchId)] as const)
    ).then((results) => {
      if (cancelled) return;

      setBatchStatuses((prev) => {
        const next = { ...prev };
        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          const [batchId, status] = result.value;
          next[batchId] = status;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [missingBatchIds]);

  const passCelebrationIds = useMemo(() => {
    const ids: string[] = [];
    for (const group of batchGroups) {
      if (group.batchId) {
        if (batchStatuses[group.batchId]?.decision === "pass") {
          ids.push(`batch:${group.batchId}`);
        }
        continue;
      }

      const run = group.runs[0];
      if (run && runDecision(run) === "pass") {
        ids.push(`run:${run.run_id}`);
      }
    }
    return ids;
  }, [batchGroups, batchStatuses]);

  useEffect(() => {
    if (passCelebrationIds.length === 0) {
      return;
    }
    celebratePassesOnce(passCelebrationIds);
  }, [passCelebrationIds]);

  function toggleBatch(batchId: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
        // Fetch batch status to get contract_report (if not already fetched)
        if (!(batchId in batchStatuses)) {
          void api.getCiBatch(batchId).then((s) => {
            setBatchStatuses((prev) => ({ ...prev, [batchId]: s }));
          }).catch(() => { /* non-critical */ });
        }
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">CI batches, template replays, and manual runs. Expand a batch to inspect individual traces.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" />
            <input
              className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-44"
              placeholder="Search run, batch, or test run"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <label className="sr-only" htmlFor="run-status-filter">Status filter</label>
            <select
              id="run-status-filter"
              className="bg-transparent text-sm text-foreground outline-none"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white/96 shadow-[0_24px_80px_rgba(148,163,184,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-[#171e2f]/96 dark:shadow-[0_24px_80px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <CardHeader className={`pb-6 ${isOpen ? "border-b border-slate-200/90 dark:border-white/8" : ""}`}>
          <DataTableHeader
            icon={History}
            accent="violet"
            title="Run Catalog"
            description="Server-paginated run history with clearer batch grouping, stronger state color, and a denser operator view."
            badge={
              searchQuery
                ? `${batchGroups.length} visible`
                : `${state.status === "ready" ? batchGroups.length : 0} groups`
            }
            collapsible
            isOpen={isOpen}
            onToggle={() => setIsOpen((v) => !v)}
          />
        </CardHeader>
        {isOpen && <CardContent className="space-y-5 pt-6">
          {state.status === "loading" ? (
            <RunsTableSkeleton />
          ) : state.status === "error" ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{state.message}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>Batch</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Avg Pass Rate</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        {searchQuery
                          ? "No runs match your search."
                          : statusFilter !== "all"
                            ? "No runs match this filter."
                            : "No runs yet — queue one via the SDK, CLI, or API."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    batchGroups.map((group) => {
                      const { batchId, runs } = group;
                      const batchStatus = batchId ? batchStatuses[batchId] : undefined;
                      const aggStatus = batchStatus?.status ?? batchAggStatus(runs);
                      const passRate = batchStatus?.pass_rate ?? batchPassRate(runs);
                      const coveragePct = batchStatus?.scenario_coverage_pct ?? batchCoveragePct(runs);
                      const decision = batchStatus?.decision ?? (batchId ? "pending" : batchDecision(runs));
                      const traceCount = batchStatus?.trace_count ?? runs.length;
                      const earliest = runs.reduce(
                        (min, r) => (r.created_at < min ? r.created_at : min),
                        runs[0].created_at
                      );
                      const campaignId = runs[0].campaign_id;
                      const campaignName = getCampaignName(runs[0]) ?? shortId(campaignId, 10);
                      const isExpanded = batchId !== null && expandedBatches.has(batchId);
                      const runType: RunType = batchId ? "ci_batch" : runTypeForRun(runs[0]);

                      return [
                        <TableRow
                          key={batchId ?? runs[0].run_id}
                          className="cursor-pointer hover:bg-accent/40"
                          onClick={() => {
                            if (runs.length === 1) {
                              router.push(`/runs/${runs[0].run_id}`);
                            } else if (batchId) {
                              toggleBatch(batchId);
                            }
                          }}
                        >
                          <TableCell className="pr-0">
                            {batchId && runs.length > 1 ? (
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-foreground">
                              {batchId ? shortId(batchId, 10) : shortId(runs[0].run_id, 10)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {traceCount} trace{traceCount !== 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{campaignName}</TableCell>
                          <TableCell><RunTypeBadge type={runType} /></TableCell>
                          <TableCell><RunStatusBadge status={aggStatus} /></TableCell>
                          <TableCell className="text-right text-foreground">
                            {passRate === null ? "--" : formatPercent(passRate, 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-medium ${coveragePct === 100 ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {coveragePct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DecisionBadge decision={decision} />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatRelativeDate(earliest)}
                          </TableCell>
                        </TableRow>,

                        ...(isExpanded
                          ? [
                              // Contract violation banner (shown when batch has a failed contract)
                              ...(batchId && batchStatuses[batchId]?.contract_report && !batchStatuses[batchId].contract_report!.passed
                                ? [(
                                    <TableRow key={`${batchId}-contract`} className="bg-rose-500/5">
                                      <TableCell />
                                      <TableCell colSpan={8} className="pl-8 py-2">
                                        <div className="flex flex-wrap items-start gap-3">
                                          <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400">
                                            contract failed
                                          </span>
                                          <div className="flex flex-wrap gap-2">
                                            {batchStatuses[batchId].contract_report!.violations.map((v, i) => (
                                              <span key={i} className="text-xs text-rose-300/80">
                                                <span className="font-mono text-rose-400">{v.type}</span>
                                                {" — "}{v.detail}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )]
                                : []),
                              // Individual run sub-rows
                              ...runs.map((run) => {
                                const pr = runPassRate(run);
                                const attempts = runAttemptCount(run);
                                return (
                                  <TableRow key={run.run_id} className="bg-accent/20">
                                    <TableCell />
                                    <TableCell colSpan={2} className="pl-8">
                                      <Link
                                        href={`/runs/${run.run_id}`}
                                        className="font-mono text-xs text-foreground hover:text-info"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {shortId(run.run_id, 12)}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <RunTypeBadge type={runTypeForRun(run)} />
                                    </TableCell>
                                    <TableCell><RunStatusBadge status={run.status} /></TableCell>
                                    <TableCell className="text-right text-foreground text-sm">
                                      {pr === null ? "--" : formatPercent(pr, 0)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-sm">
                                      {attempts !== null ? `${attempts} attempts` : "--"}
                                    </TableCell>
                                    <TableCell />
                                    <TableCell className="text-right text-muted-foreground text-sm">
                                      {formatRelativeDate(run.created_at)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }),
                            ]
                          : []),
                      ];
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `${batchGroups.length} batch${batchGroups.length === 1 ? "" : "es"} match on this page`
                    : `Showing ${batchGroups.length === 0 ? 0 : page * PAGE_SIZE + 1}–${page * PAGE_SIZE + filteredRuns.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((v) => Math.max(0, v - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <div className="rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground">
                    Page {page + 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>}
      </Card>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="info">running</Badge>;
  if (normalized === "queued") return <Badge variant="neutral">queued</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function RunTypeBadge({ type }: { type: RunType }) {
  if (type === "ci_batch") return <Badge variant="info">CI batch</Badge>;
  if (type === "template_replay") return <Badge variant="warning">Template replay</Badge>;
  return <Badge variant="outline">Manual run</Badge>;
}

function DecisionBadge({ decision }: { decision: "pass" | "fail" | "pending" }) {
  if (decision === "pass") return <Badge variant="success">pass</Badge>;
  if (decision === "fail") return <Badge variant="danger">fail</Badge>;
  return <Badge variant="neutral">pending</Badge>;
}

function RunsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

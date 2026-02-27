"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import {
  api,
  type PolicyEventListItem,
  type ReplayAttemptListItem,
  type RunMetadata,
  type RunStats,
} from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      run: RunMetadata;
      stats: RunStats | null;
      attempts: ReplayAttemptListItem[];
      policyEvents: PolicyEventListItem[];
    };

export function RunDetailView({ runId }: { runId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const [run, statsResult, attempts, policyEvents] = await Promise.all([
        api.getRun(runId),
        api.getRunStats(runId).catch(() => null),
        api.listRunAttempts(runId, { limit: 200, offset: 0 }),
        api.listRunPolicyEvents(runId, { limit: 200, offset: 0 }).catch(() => []),
      ]);
      setState({ status: "ready", run, stats: statsResult, attempts, policyEvents });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Failed to load run" });
    }
  }

  useEffect(() => {
    void load();
  }, [runId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/runs" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Runs
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Run {shortId(runId, 12)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run-level statistics, attempts, and replay diagnostics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <RunDetailSkeleton />
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20"><CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent></Card>
      ) : (
        <RunDetailPanels
          run={state.run}
          stats={state.stats}
          attempts={state.attempts}
          policyEvents={state.policyEvents}
        />
      )}
    </div>
  );
}

function RunDetailPanels({
  run,
  stats,
  attempts,
  policyEvents,
}: {
  run: RunMetadata;
  stats: RunStats | null;
  attempts: ReplayAttemptListItem[];
  policyEvents: PolicyEventListItem[];
}) {
  const derived = useMemo(() => deriveRunOverview(run, stats, attempts), [run, stats, attempts]);
  const policyViolationCount = useMemo(
    () => derivePolicyViolationCount(run, policyEvents),
    [run, policyEvents]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Run Summary</span>
            <StatusBadge status={run.status} />
          </CardTitle>
          <CardDescription>
            Campaign {shortId(run.campaign_id, 12)} • Trace {shortId(run.trace_id, 12)} • {formatRelativeDate(run.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Attempts" value={String(derived.total)} />
            <StatTile label="Passed" value={String(derived.passed)} tone="success" />
            <StatTile label="Failed" value={String(derived.failed)} tone="danger" />
            <StatTile label="Pass Rate" value={derived.passRateLabel} tone="cyan" />
            <StatTile label="Policy Violations" value={String(policyViolationCount)} tone={policyViolationCount > 0 ? "danger" : "default"} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RunStatsCards stats={stats} />
        <AttemptsTable attempts={attempts} />
      </div>

      <PolicyEventsTable policyEvents={policyEvents} />
    </>
  );
}

function RunStatsCards({ stats }: { stats: RunStats | null }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Failure Breakdown by Tool</CardTitle>
          <CardDescription>Top failing tools for this run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(stats?.failures_by_tool ?? []).slice(0, 8).map((item) => (
            <div key={item.tool} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/15 px-3 py-2">
              <span className="truncate text-sm text-foreground">{item.tool}</span>
              <Badge variant="danger">{item.count}</Badge>
            </div>
          ))}
          {(!stats || stats.failures_by_tool.length === 0) && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No failure tool data available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Failure Reasons</CardTitle>
          <CardDescription>Reason frequencies from /runs/{`{runId}`}/stats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(stats?.top_failure_reasons ?? []).slice(0, 8).map((item) => (
            <div key={item.reason} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/15 px-3 py-2">
              <span className="text-sm text-foreground">{item.reason}</span>
              <span className="text-xs text-muted-foreground">{item.count} • {formatPercent(item.pct, 0)}</span>
            </div>
          ))}
          {(!stats || stats.top_failure_reasons.length === 0) && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No failure reason data available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AttemptsTable({ attempts }: { attempts: ReplayAttemptListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attempts</CardTitle>
        <CardDescription>Click an attempt to inspect timeline and counterfactual outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attempt</TableHead>
              <TableHead>Mutation</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>First Failure</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No attempts found for this run.</TableCell>
              </TableRow>
            ) : (
              attempts.map((attempt) => (
                <TableRow key={attempt.attempt_id}>
                  <TableCell>
                    <Link href={`/attempts/${attempt.attempt_id}`} className="font-medium text-foreground hover:text-cyan-200">
                      {shortId(attempt.attempt_id, 10)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground" title={attempt.mutation_id}>
                    {attempt.mutation_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={attempt.result.toLowerCase().startsWith("pass") ? "success" : "danger"}>
                      {attempt.result}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {attempt.first_failure_tool ? `${attempt.first_failure_tool} @ #${attempt.first_failure_event_index ?? "?"}` : "--"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatRelativeDate(attempt.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PolicyEventsTable({ policyEvents }: { policyEvents: PolicyEventListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Events</CardTitle>
        <CardDescription>Policy decisions recorded for replayed tool calls.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Decision</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Event Index</TableHead>
              <TableHead>Attempt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policyEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No policy events recorded for this run.
                </TableCell>
              </TableRow>
            ) : (
              policyEvents.map((event) => (
                <TableRow key={event.policy_event_id}>
                  <TableCell>
                    <Badge
                      variant={
                        event.decision === "allow"
                          ? "success"
                          : event.decision === "deny"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {event.decision}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-foreground" title={event.tool}>
                    {event.tool}
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate text-muted-foreground" title={event.reason ?? ""}>
                    {event.reason ?? "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.event_index ?? "--"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {event.attempt_id ? shortId(event.attempt_id, 10) : "--"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function deriveRunOverview(run: RunMetadata, stats: RunStats | null, attempts: ReplayAttemptListItem[]) {
  if (stats) {
    return {
      total: stats.attempts.total,
      passed: stats.attempts.passed,
      failed: stats.attempts.failed,
      passRateLabel: formatPercent(stats.attempts.pass_rate, 1),
    };
  }

  const summary = (run.summary ?? {}) as Record<string, unknown>;
  const total = typeof summary.attempt_count === "number" ? summary.attempt_count : attempts.length;
  const passed = typeof summary.passed_count === "number" ? summary.passed_count : attempts.filter((a) => a.result.toLowerCase().startsWith("pass")).length;
  const failed = typeof summary.failed_count === "number" ? summary.failed_count : attempts.filter((a) => a.result.toLowerCase().startsWith("fail")).length;
  return {
    total,
    passed,
    failed,
    passRateLabel: total > 0 ? formatPercent(passed / total, 1) : "--",
  };
}

function derivePolicyViolationCount(run: RunMetadata, policyEvents: PolicyEventListItem[]) {
  const byEvents = policyEvents.filter((item) => item.decision !== "allow").length;
  if (byEvents > 0) return byEvents;
  const summary = (run.summary ?? {}) as Record<string, unknown>;
  const denied = typeof summary.policy_denied_count === "number" ? summary.policy_denied_count : 0;
  const approval =
    typeof summary.policy_requires_approval_count === "number"
      ? summary.policy_requires_approval_count
      : 0;
  return denied + approval;
}

function StatTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" | "cyan" }) {
  const toneClasses: Record<string, string> = {
    default: "text-foreground",
    success: "text-emerald-300",
    danger: "text-rose-300",
    cyan: "text-cyan-300",
  };
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", toneClasses[tone])}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="warning">running</Badge>;
  return <Badge variant="default">{status}</Badge>;
}

function RunDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-5"><Skeleton className="h-36 w-full" /></CardContent></Card>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card><CardContent className="p-5"><Skeleton className="h-96 w-full" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

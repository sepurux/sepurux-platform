"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import {
  api,
  type HardeningTemplateType,
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
      baselineRun: RunMetadata | null;
      baselineStats: RunStats | null;
    };

export function RunDetailView({ runId }: { runId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const router = useRouter();

  async function load() {
    setState({ status: "loading" });
    try {
      const [run, statsResult, attempts, policyEvents] = await Promise.all([
        api.getRun(runId),
        api.getRunStats(runId).catch(() => null),
        api.listRunAttempts(runId, { limit: 200, offset: 0 }),
        api.listRunPolicyEvents(runId, { limit: 200, offset: 0 }).catch(() => []),
      ]);

      let baselineRun: RunMetadata | null = null;
      let baselineStats: RunStats | null = null;
      const sourceRunId = sourceRunIdFromSummary(run.summary);
      if (sourceRunId) {
        [baselineRun, baselineStats] = await Promise.all([
          api.getRun(sourceRunId).catch(() => null),
          api.getRunStats(sourceRunId).catch(() => null),
        ]);
      }

      setState({
        status: "ready",
        run,
        stats: statsResult,
        attempts,
        policyEvents,
        baselineRun,
        baselineStats,
      });
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
          baselineRun={state.baselineRun}
          baselineStats={state.baselineStats}
          runId={runId}
          onNavigateToRun={(targetRunId) => router.push(`/runs/${targetRunId}`)}
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
  baselineRun,
  baselineStats,
  runId,
  onNavigateToRun,
}: {
  run: RunMetadata;
  stats: RunStats | null;
  attempts: ReplayAttemptListItem[];
  policyEvents: PolicyEventListItem[];
  baselineRun: RunMetadata | null;
  baselineStats: RunStats | null;
  runId: string;
  onNavigateToRun: (targetRunId: string) => void;
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
            <StatTile label="Pass Rate" value={derived.passRateLabel} tone="info" />
            <StatTile label="Policy Violations" value={String(policyViolationCount)} tone={policyViolationCount > 0 ? "danger" : "default"} />
          </div>
        </CardContent>
      </Card>

      <RunComparisonCard
        baselineRun={baselineRun}
        baselineStats={baselineStats}
        currentRun={run}
        currentStats={stats}
        currentPolicyViolations={policyViolationCount}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <RunStatsCards
          runId={runId}
          stats={stats}
          onNavigateToRun={onNavigateToRun}
        />
        <AttemptsTable attempts={attempts} />
      </div>

      <PolicyEventsTable policyEvents={policyEvents} />
    </>
  );
}

function RunStatsCards({
  runId,
  stats,
  onNavigateToRun,
}: {
  runId: string;
  stats: RunStats | null;
  onNavigateToRun: (targetRunId: string) => void;
}) {
  const lethalMutations = stats?.most_lethal_mutations ?? [];
  const insights = stats?.insights ?? [];
  const [applyingInsightId, setApplyingInsightId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function handleApplyAndRerun(insight: RunStats["insights"][number]) {
    const templatePayload = templateFromInsight(insight);
    if (!templatePayload) {
      setApplyError(
        insight.id === "insight.tool_hotspot.replay.execute"
          ? "replay.execute hotspots are replay-contract issues. Fix the campaign replay payload instead of applying a generic template."
          : "No hardening template mapping available for this insight yet."
      );
      return;
    }

    setApplyError(null);
    setApplyingInsightId(insight.id);
    try {
      const template = await api.createTemplate(templatePayload);
      const result = await api.applyTemplateToRun(runId, template.template_id);
      onNavigateToRun(result.new_run_id);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : "Failed to apply template");
    } finally {
      setApplyingInsightId(null);
    }
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Most Lethal Mutations</CardTitle>
          <CardDescription>
            Multi-attribution from mutation_trace hits to failed attempts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lethalMutations.slice(0, 5).map((item) => (
            <div
              key={item.mutation_id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/15 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground" title={item.mutation_id}>
                  {item.mutation_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.failures}/{item.attempts_hit} • {formatPercent(item.failure_rate_when_hit, 1)}
                </p>
              </div>
              <Badge variant="outline">
                {item.top_tools[0]?.tool ?? "unknown"}
              </Badge>
            </div>
          ))}
          {lethalMutations.length === 0 && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              Run more attempts to compute lethal mutations.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Fixes</CardTitle>
          <CardDescription>Auto Insights generated from run failures, mutations, policies, and counterfactuals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {applyError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
              {applyError}
            </div>
          ) : null}
          {insights.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              Run more attempts to generate recommended fixes.
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-md border border-border/60 bg-muted/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground" title={insight.title}>
                      {insight.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{insight.recommendation}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={insight.confidence >= 0.75 ? "success" : insight.confidence >= 0.6 ? "warning" : "outline"}>
                      {formatPercent(insight.confidence, 0)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={applyingInsightId === insight.id}
                      onClick={() => void handleApplyAndRerun(insight)}
                    >
                      {applyingInsightId === insight.id ? "Applying..." : "Apply & Rerun"}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{insight.why}</p>
                <details className="mt-2 rounded border border-border/50 bg-background/40 p-2">
                  <summary className="cursor-pointer text-xs font-medium text-foreground">
                    View evidence
                  </summary>
                  <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                    <p>
                      Tools:{" "}
                      {insight.evidence.top_tools.length > 0
                        ? insight.evidence.top_tools
                            .map((item) => `${item.tool} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                    <p>
                      Mutations:{" "}
                      {insight.evidence.top_mutations.length > 0
                        ? insight.evidence.top_mutations
                            .map((item) => `${item.mutation_id} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                    <p>
                      Reasons:{" "}
                      {insight.evidence.top_reasons.length > 0
                        ? insight.evidence.top_reasons
                            .map((item) => `${item.reason} (${item.count})`)
                            .join(", ")
                        : "--"}
                    </p>
                  </div>
                </details>
              </div>
            ))
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
                    <Link href={`/attempts/${attempt.attempt_id}`} className="font-medium text-foreground hover:text-info">
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
  const summary = (run.summary ?? {}) as Record<string, unknown>;
  if (typeof summary.policy_violations_total === "number") {
    return summary.policy_violations_total;
  }
  const denied =
    typeof summary.policy_denies === "number"
      ? summary.policy_denies
      : typeof summary.policy_denied_count === "number"
        ? summary.policy_denied_count
        : 0;
  const approval =
    typeof summary.policy_requires_approval === "number"
      ? summary.policy_requires_approval
      : typeof summary.policy_requires_approval_count === "number"
        ? summary.policy_requires_approval_count
        : 0;
  const bySummary = denied + approval;
  if (bySummary > 0) return bySummary;
  return policyEvents.filter((item) => item.decision !== "allow").length;
}

function sourceRunIdFromSummary(summary: Record<string, unknown> | null): string | null {
  const summaryObj = summary ?? {};
  const templateApplication = summaryObj.template_application;
  if (!templateApplication || typeof templateApplication !== "object") {
    return null;
  }
  const sourceRunId = (templateApplication as Record<string, unknown>).source_run_id;
  return typeof sourceRunId === "string" && sourceRunId ? sourceRunId : null;
}

function templateFromInsight(insight: RunStats["insights"][number]): {
  name: string;
  type: HardeningTemplateType;
  config: Record<string, unknown>;
} | null {
  if (insight.id.startsWith("insight.approval_tokens.")) {
    return {
      name: "Template: Approval Token Gate",
      type: "policy_pack",
      config: {
        policy: {
          version: "0.1",
          defaults: { unknown_tools: "allow" },
          approval: { token_field: "confirmation_token" },
          irreversible: {
            tools: ["payments.refund", "jira.create_issue(commit)", "jira.create_issue_commit"],
          },
        },
        engine: "builtin",
      },
    };
  }
  if (insight.id.startsWith("insight.schema_adapter.")) {
    return {
      name: "Template: Schema Adapter",
      type: "schema_adapter",
      config: {
        mappings: {
          issueType: "issue_type",
          status: "state",
          description: "details",
        },
      },
    };
  }
  if (insight.id === "insight.tool_hotspot.replay.execute") {
    return null;
  }
  if (
    insight.id.startsWith("insight.retry_backoff.") ||
    insight.id.startsWith("insight.tool_hotspot.")
  ) {
    return {
      name: "Template: Retry Policy",
      type: "retry_policy",
      config: {
        max_retries: 3,
        backoff_ms: 300,
      },
    };
  }
  if (insight.id.startsWith("insight.output_sanitizer.")) {
    return {
      name: "Template: Output Sanitizer",
      type: "sanitizer",
      config: {
        fields: ["text", "content", "message", "summary"],
        patterns: [
          "ignore previous instructions",
          "disregard previous instructions",
          "system override",
        ],
      },
    };
  }
  return null;
}

function RunComparisonCard({
  baselineRun,
  baselineStats,
  currentRun,
  currentStats,
  currentPolicyViolations,
}: {
  baselineRun: RunMetadata | null;
  baselineStats: RunStats | null;
  currentRun: RunMetadata;
  currentStats: RunStats | null;
  currentPolicyViolations: number;
}) {
  if (!baselineRun) {
    return null;
  }

  const baselinePassRate = derivePassRate(baselineRun, baselineStats);
  const currentPassRate = derivePassRate(currentRun, currentStats);
  const baselinePolicyViolations = derivePolicyViolationCount(baselineRun, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baseline Comparison</CardTitle>
        <CardDescription>
          Baseline run {shortId(baselineRun.run_id, 10)} vs current run {shortId(currentRun.run_id, 10)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border/60 bg-muted/15 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pass Rate</p>
            <p className="mt-2 text-sm text-foreground">
              {formatPercent(baselinePassRate, 1)} → {formatPercent(currentPassRate, 1)}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/15 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Policy Violations</p>
            <p className="mt-2 text-sm text-foreground">
              {baselinePolicyViolations} → {currentPolicyViolations}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function derivePassRate(run: RunMetadata, stats: RunStats | null): number {
  if (stats) {
    return stats.attempts.pass_rate;
  }
  if (typeof run.pass_rate === "number") {
    return run.pass_rate;
  }
  const summary = (run.summary ?? {}) as Record<string, unknown>;
  if (typeof summary.pass_rate === "number") {
    return summary.pass_rate;
  }
  const attempts = typeof summary.attempt_count === "number" ? summary.attempt_count : 0;
  const passed = typeof summary.passed_count === "number" ? summary.passed_count : 0;
  if (attempts <= 0) {
    return 0;
  }
  return passed / attempts;
}

function StatTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" | "info" }) {
  const toneClasses: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-danger",
    info: "text-info",
  };
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-[28px] font-semibold leading-none", toneClasses[tone])}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="info">running</Badge>;
  if (normalized === "queued") return <Badge variant="neutral">queued</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, RefreshCcw, ShieldCheck } from "lucide-react";

import {
  ApiError,
  api,
  type CampaignFailure,
  type CampaignReliability,
  type CIBatchStatus,
  type AttemptTimeline,
  type MutationPackMetadata,
  type PolicyEventListItem,
  type QualityContract,
  type ReplayAttemptDetail,
  type ReplayAttemptListItem,
  type RunMetadata,
  type RunStats,
} from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import {
  classifyCheckPack,
  resolveRunCheckIds,
  resolveRunCheckNames,
} from "@/lib/run-presets";
import {
  buildTemplateFromInsightEvidence,
  compareFailureReasonShift,
  getInsightAutoFixAvailability,
  selectAttemptForInsight,
} from "@/lib/run-fixes";
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
      failures: CampaignFailure[];
      reliability: CampaignReliability | null;
      ciBatch: CIBatchStatus | null;
      contract: QualityContract | null;
      mutationPacks: MutationPackMetadata[];
      baselineRun: RunMetadata | null;
      baselineStats: RunStats | null;
    };
type RunType = "ci_batch" | "template_replay" | "manual";

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
      const batchId = ciBatchIdFromSummary(run.summary);
      const [reliability, failures, ciBatch, contract, mutationPacks] = await Promise.all([
        api
          .getCampaignReliability(run.campaign_id, { run_id: runId })
          .catch(() => null),
        api
          .listCampaignFailures(run.campaign_id, { run_id: runId, limit: 200, offset: 0 })
          .catch(() => []),
        batchId ? api.getCiBatch(batchId).catch(() => null) : Promise.resolve(null),
        api.getContract(run.campaign_id).catch(() => null),
        api.listMutationPacks({ include_system: true }).catch(() => []),
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
        failures,
        reliability,
        ciBatch,
        contract,
        mutationPacks,
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
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/runs" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Runs
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Run {shortId(runId, 12)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verdict, reliability, and replay diagnostics for this completed run.</p>
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
          failures={state.failures}
          reliability={state.reliability}
          ciBatch={state.ciBatch}
          contract={state.contract}
          mutationPacks={state.mutationPacks}
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
  failures,
  reliability,
  ciBatch,
  contract,
  mutationPacks,
  baselineRun,
  baselineStats,
  runId,
  onNavigateToRun,
}: {
  run: RunMetadata;
  stats: RunStats | null;
  attempts: ReplayAttemptListItem[];
  policyEvents: PolicyEventListItem[];
  failures: CampaignFailure[];
  reliability: CampaignReliability | null;
  ciBatch: CIBatchStatus | null;
  contract: QualityContract | null;
  mutationPacks: MutationPackMetadata[];
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
  const runType = runTypeFromSummary(run.summary);
  const verdict = useMemo(
    () =>
      deriveReplayVerdict({
        run,
        stats,
        attempts,
        policyViolationCount,
        failures,
        reliability,
        ciBatch,
        contract,
        mutationPacks,
      }),
    [run, stats, attempts, policyViolationCount, failures, reliability, ciBatch, contract, mutationPacks]
  );
  const [policyPackName, setPolicyPackName] = useState<string | null>(null);

  useEffect(() => {
    if (!run.policy_pack_id) return;
    void api.getPolicyPack(run.policy_pack_id).then((p) => setPolicyPackName(p.name)).catch(() => null);
  }, [run.policy_pack_id]);

  // Detect when all failures are replay tool mismatches — a config issue, not agent failure
  const replayContractFailures = useMemo(() =>
    attempts.filter((a) => a.failure_reason?.includes("replay_contract_invalid_tool") || a.failure_reason?.includes("invalid_tool")),
    [attempts]
  );
  const hasReplayContractIssue = replayContractFailures.length > 0 && replayContractFailures.length === attempts.filter((a) => a.result === "failed").length;

  return (
    <>
      {hasReplayContractIssue && (
        <div className="flex items-start gap-3 rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-100">Check incompatible with this trace</p>
            <p className="mt-0.5 text-amber-300/80">
              All {replayContractFailures.length} attempt{replayContractFailures.length !== 1 ? "s" : ""} failed because the selected check targets tools that don't appear in this trace.
              The reliability score is unaffected — no agent behaviour was tested.
              Fix: select a check whose tools match this trace, or run without a check to use baseline only.
            </p>
          </div>
        </div>
      )}

      <ReplayVerdictCard run={run} verdict={verdict} />

      <RecommendedNextRunCard
        run={run}
        verdict={verdict}
        baselineRun={baselineRun}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span>Run Summary</span>
              <RunTypeBadge type={runType} />
            </span>
            <StatusBadge status={run.status} />
          </CardTitle>
          <CardDescription>
            Campaign {shortId(run.campaign_id, 12)} • Trace {shortId(run.trace_id, 12)} • {runTypeLabel(runType)} • {formatRelativeDate(run.created_at)}
            {policyPackName && (
              <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> {policyPackName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatTile label="Attempts" value={String(derived.total)} />
            <StatTile label="Passed" value={String(derived.passed)} tone="success" />
            <StatTile label="Failed" value={String(derived.failed)} tone="danger" />
            <StatTile
              label="Pass Rate"
              value={derived.passRateLabel}
              tone="success"
              progress={derived.passed > 0 && derived.total > 0 ? (derived.passed / derived.total) * 100 : 0}
            />
            <StatTile
              label="Reliability Score"
              value={reliability ? formatPercent(reliability.reliability_score / 100, 1) : "n/a"}
              tone={reliability?.status === "critical" ? "danger" : reliability?.status === "warning" ? "warning" : "success"}
            />
            <StatTile label="Policy Violations" value={String(policyViolationCount)} tone={policyViolationCount > 0 ? "warning" : "default"} />
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
          attempts={attempts}
          failures={failures}
          reliability={reliability}
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
  attempts,
  failures,
  reliability,
  onNavigateToRun,
}: {
  runId: string;
  stats: RunStats | null;
  attempts: ReplayAttemptListItem[];
  failures: CampaignFailure[];
  reliability: CampaignReliability | null;
  onNavigateToRun: (targetRunId: string) => void;
}) {
  const lethalMutations = stats?.most_lethal_mutations ?? [];
  const insights = stats?.insights ?? [];
  const [applyingInsightId, setApplyingInsightId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function handleApplyAndRerun(insight: RunStats["insights"][number]) {
    const availability = getInsightAutoFixAvailability(insight);
    if (!availability.supported) {
      setApplyError(availability.reason ?? "No hardening template mapping available for this insight yet.");
      return;
    }

    setApplyError(null);
    setApplyingInsightId(insight.id);
    try {
      const matchedAttempt = selectAttemptForInsight(insight, attempts);
      const [attemptDetail, attemptTimeline] = await loadAttemptEvidence(matchedAttempt);
      const { template, reason } = buildTemplateFromInsightEvidence(insight, {
        attempt: matchedAttempt,
        detail: attemptDetail,
        timeline: attemptTimeline,
      });
      if (!template) {
        setApplyError(reason ?? "No hardening template mapping available for this insight yet.");
        return;
      }

      const createdTemplate = await api.createTemplate(template);
      const result = await api.applyTemplateToRun(runId, createdTemplate.template_id);
      onNavigateToRun(result.new_run_id);
    } catch (error) {
      if (error instanceof ApiError) {
        const detail =
          error.body && typeof error.body === "object"
            ? (error.body as { detail?: unknown }).detail
            : null;
        if (typeof detail === "string" && detail.trim().length > 0) {
          setApplyError(detail);
        } else if (error.status >= 500) {
          setApplyError(
            "Auto-apply hit a server error. Retry once, or apply the recommended manual fix."
          );
        } else {
          setApplyError(`Auto-apply failed (${error.status}).`);
        }
      } else {
        setApplyError(error instanceof Error ? error.message : "Failed to apply template");
      }
    } finally {
      setApplyingInsightId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reliability</CardTitle>
          <CardDescription>Run-scoped reliability score computed from classified failure severity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reliability ? (
            <>
              <div className="flex items-end justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Score</p>
                  <p className={cn("text-3xl font-semibold", reliability.status === "critical" ? "text-rose-400" : reliability.status === "warning" ? "text-amber-400" : "text-success")}>
                    {formatPercent(reliability.reliability_score / 100, 1)}
                  </p>
                </div>
                <Badge
                  variant={
                    reliability.status === "critical"
                      ? "danger"
                      : reliability.status === "warning"
                        ? "warning"
                        : "success"
                  }
                >
                  {reliability.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {reliability.classified_failures} classified failure
                {reliability.classified_failures === 1 ? "" : "s"}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              Reliability data is not available for this run yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failures by Category</CardTitle>
          <CardDescription>Classifier output across all failed attempts in this run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(reliability?.failure_breakdown ?? []).slice(0, 8).map((item) => (
            <div key={item.type} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/15 px-3 py-2">
              <span className="truncate text-sm text-foreground">{item.type}</span>
              <Badge variant="danger">{item.count}</Badge>
            </div>
          ))}
          {(!reliability || reliability.failure_breakdown.length === 0) && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No classified failures available yet.
            </div>
          )}
        </CardContent>
      </Card>

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
          <CardTitle>Recent Failure Records</CardTitle>
          <CardDescription>Latest classified failures for this run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {failures.slice(0, 5).map((failure) => (
            <div
              key={failure.failure_id}
              className="rounded-md border border-border/60 bg-muted/15 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{failure.type}</p>
                <Badge
                  variant={
                    failure.severity === "critical"
                      ? "danger"
                      : failure.severity === "high"
                        ? "warning"
                        : "outline"
                  }
                >
                  {failure.severity}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{failure.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Mutation: {failure.mutation}</p>
            </div>
          ))}
          {failures.length === 0 && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No classified failure records available yet.
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
              <InsightRecommendationCard
                key={insight.id}
                insight={insight}
                isApplying={applyingInsightId === insight.id}
                onApply={() => void handleApplyAndRerun(insight)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ATTEMPTS_PAGE_SIZE = 15;
const POLICY_EVENTS_PAGE_SIZE = 15;

function AttemptsTable({ attempts }: { attempts: ReplayAttemptListItem[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(attempts.length / ATTEMPTS_PAGE_SIZE);
  const pageAttempts = attempts.slice(page * ATTEMPTS_PAGE_SIZE, (page + 1) * ATTEMPTS_PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attempts</CardTitle>
        <CardDescription>
          {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}. Click to inspect timeline and counterfactual outcomes.
        </CardDescription>
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
              pageAttempts.map((attempt) => (
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
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {page * ATTEMPTS_PAGE_SIZE + 1}–{Math.min((page + 1) * ATTEMPTS_PAGE_SIZE, attempts.length)} of {attempts.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((v) => v - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PolicyEventsTable({ policyEvents }: { policyEvents: PolicyEventListItem[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(policyEvents.length / POLICY_EVENTS_PAGE_SIZE);
  const pageEvents = policyEvents.slice(
    page * POLICY_EVENTS_PAGE_SIZE,
    (page + 1) * POLICY_EVENTS_PAGE_SIZE
  );

  useEffect(() => {
    setPage(0);
  }, [policyEvents.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Events</CardTitle>
        <CardDescription>
          {policyEvents.length} event{policyEvents.length === 1 ? "" : "s"} recorded for replayed tool calls.
        </CardDescription>
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
              pageEvents.map((event) => (
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
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {page * POLICY_EVENTS_PAGE_SIZE + 1}–
              {Math.min((page + 1) * POLICY_EVENTS_PAGE_SIZE, policyEvents.length)} of {policyEvents.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((v) => v - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CoverageSummary = {
  label: string;
  detail: string;
  tone: "default" | "success" | "danger" | "warning";
};

type ContractFailureDetail = {
  key: string;
  title: string;
  detail: string;
  suggestion: string;
};

type ReplayVerdict = {
  taskOutcome: string;
  decision: "pass" | "fail" | "pending";
  decisionLabel: string;
  explanation: string;
  reliabilityLabel: string;
  reliabilityTone: "default" | "success" | "danger" | "warning";
  policyViolations: number;
  toolCoverage: CoverageSummary;
  checkCoverage: CoverageSummary;
  contractFailures: ContractFailureDetail[];
  currentCheckNames: string[];
  currentCheckClass: ReturnType<typeof classifyCheckPack>;
};

type NextRunRecommendation = {
  title: string;
  description: string;
  href: string;
  label: string;
};

function ReplayVerdictCard({ run, verdict }: { run: RunMetadata; verdict: ReplayVerdict }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Replay Verdict</CardTitle>
        <CardDescription>{verdict.explanation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <VerdictTile label="Task outcome" value={verdict.taskOutcome} detail={run.status} />
          <VerdictTile
            label="Pass / fail"
            value={verdict.decisionLabel}
            tone={
              verdict.decision === "pass"
                ? "success"
                : verdict.decision === "fail"
                  ? "danger"
                  : "warning"
            }
          />
          <VerdictTile label="Reliability score" value={verdict.reliabilityLabel} tone={verdict.reliabilityTone} />
          <VerdictTile
            label="Policy violations"
            value={String(verdict.policyViolations)}
            tone={verdict.policyViolations > 0 ? "warning" : "success"}
          />
          <VerdictTile
            label="Tool coverage"
            value={verdict.toolCoverage.label}
            detail={verdict.toolCoverage.detail}
            tone={verdict.toolCoverage.tone}
          />
          <VerdictTile
            label="Check coverage"
            value={verdict.checkCoverage.label}
            detail={verdict.checkCoverage.detail}
            tone={verdict.checkCoverage.tone}
          />
        </div>

        {verdict.contractFailures.length > 0 ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-amber-100">Quality Contract failures</p>
                  <p className="mt-1 text-xs text-amber-200/80">
                    The run finished, but the contract still rejected it. Here is the exact rule that failed and the fastest fix.
                  </p>
                </div>
                {verdict.contractFailures.map((failure) => (
                  <div key={failure.key} className="rounded-xl border border-amber-300/20 bg-black/10 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-200">{failure.title}</p>
                    <p className="mt-1 text-sm text-amber-50">{failure.detail}</p>
                    <p className="mt-2 text-xs text-amber-100/80">Next fix: {failure.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VerdictTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClasses = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-rose-400",
    warning: "text-amber-400",
  };
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold leading-none", toneClasses[tone])}>{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function RecommendedNextRunCard({
  run,
  verdict,
  baselineRun,
}: {
  run: RunMetadata;
  verdict: ReplayVerdict;
  baselineRun: RunMetadata | null;
}) {
  const recommendation = deriveNextRunRecommendation(run, verdict, baselineRun);

  if (!recommendation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Next Run</CardTitle>
        <CardDescription>{recommendation.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{recommendation.title}</p>
        </div>
        <Button asChild size="sm">
          <Link href={recommendation.href}>{recommendation.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function deriveReplayVerdict({
  run,
  stats,
  attempts,
  policyViolationCount,
  failures,
  reliability,
  ciBatch,
  contract,
  mutationPacks,
}: {
  run: RunMetadata;
  stats: RunStats | null;
  attempts: ReplayAttemptListItem[];
  policyViolationCount: number;
  failures: CampaignFailure[];
  reliability: CampaignReliability | null;
  ciBatch: CIBatchStatus | null;
  contract: QualityContract | null;
  mutationPacks: MutationPackMetadata[];
}): ReplayVerdict {
  const failedAttempts = stats?.attempts.failed ?? attempts.filter((attempt) => attempt.result.toLowerCase().startsWith("fail")).length;
  const currentCheckNames = resolveRunCheckNames(run, mutationPacks);
  const currentCheckIds = resolveRunCheckIds(run);
  const currentCheckRecord =
    currentCheckIds.length > 0
      ? mutationPacks.find((record) => currentCheckIds.includes(record.mutation_pack_id)) ?? null
      : null;
  const currentCheckClass = classifyCheckPack(currentCheckRecord);
  const contractReport = ciBatch?.contract_report ?? null;
  const requiredTools = contractReport?.required_tools ?? contract?.required_tools ?? [];
  const coveredTools = contractReport?.covered_tools ?? [];
  const requiredCheckIds = contractReport?.required_pack_ids ?? contract?.required_pack_ids ?? [];
  const missingRequiredChecks = requiredCheckIds.filter((id) => !currentCheckIds.includes(id));
  const packNamesById = new Map(mutationPacks.map((record) => [record.mutation_pack_id, record.name]));

  const contractFailures: ContractFailureDetail[] = [];
  for (const violation of contractReport?.violations ?? []) {
    if (violation.type === "wrong_pack") {
      const missing = violation.missing.map((id) => packNamesById.get(id) ?? id).join(", ");
      contractFailures.push({
        key: `wrong-pack-${missing}`,
        title: "Missing required check coverage",
        detail: missing ? `This run did not include the required check: ${missing}.` : violation.detail,
        suggestion: "Rerun with the required check preset or update the quality contract.",
      });
    } else if (violation.type === "untested_tool") {
      contractFailures.push({
        key: `missing-tools-${violation.missing.join(",")}`,
        title: "Missing required tool coverage",
        detail: violation.detail,
        suggestion: `Add a scenario that exercises ${violation.missing.join(", ") || "the missing tools"}, then rerun.`,
      });
    } else if (violation.type === "insufficient_attempts") {
      contractFailures.push({
        key: "insufficient-attempts",
        title: "Insufficient attempts",
        detail: violation.detail,
        suggestion: "Increase attempts on the test run or lower the contract minimum.",
      });
    }
  }

  const toolCoverage: CoverageSummary =
    requiredTools.length === 0
      ? {
          label: "Not gated",
          detail: "No required tool coverage on this contract.",
          tone: "default",
        }
      : coveredTools.length >= requiredTools.length && requiredTools.every((tool) => coveredTools.includes(tool))
        ? {
            label: `Hit ${requiredTools.length}/${requiredTools.length}`,
            detail: requiredTools.join(", "),
            tone: "success",
          }
        : {
            label: `Missed ${requiredTools.filter((tool) => !coveredTools.includes(tool)).length}/${requiredTools.length}`,
            detail: requiredTools.filter((tool) => !coveredTools.includes(tool)).join(", "),
            tone: "danger",
          };

  const checkCoverage: CoverageSummary =
    requiredCheckIds.length === 0
      ? {
          label:
            ciBatch?.mutation_coverage_score != null
              ? `${ciBatch.mutation_coverage_score}% observed`
              : currentCheckNames.length > 0
                ? currentCheckNames.join(", ")
                : "Baseline only",
          detail:
            ciBatch?.mutation_categories.length
              ? `${ciBatch.mutation_categories.length} category${ciBatch.mutation_categories.length === 1 ? "" : "ies"} hit`
              : "No required check coverage on this contract.",
          tone: ciBatch?.mutation_coverage_score != null ? "success" : "default",
        }
      : missingRequiredChecks.length === 0
        ? {
            label: `Hit ${requiredCheckIds.length}/${requiredCheckIds.length}`,
            detail: requiredCheckIds.map((id) => packNamesById.get(id) ?? id).join(", "),
            tone: "success",
          }
        : {
            label: `Missed ${missingRequiredChecks.length}/${requiredCheckIds.length}`,
            detail: missingRequiredChecks.map((id) => packNamesById.get(id) ?? id).join(", "),
            tone: "danger",
          };

  const decision = deriveDecision(run, failedAttempts, policyViolationCount, ciBatch);
  const taskOutcome = deriveTaskOutcome(run, failedAttempts);
  const decisionLabel = decision === "pass" ? "Pass" : decision === "fail" ? "Fail" : "Pending";

  let explanation: string;
  if (decision === "pending") {
    explanation = "Sepurux is still replaying this batch. The verdict will settle after the remaining attempts finish.";
  } else if (contractFailures.length > 0) {
    explanation = `Verdict failed because the quality contract missed ${contractFailures[0].title.toLowerCase()}.`;
  } else if (decision === "fail" && policyViolationCount > 0) {
    explanation = `Verdict failed because replay triggered ${policyViolationCount} policy violation${policyViolationCount === 1 ? "" : "s"}.`;
  } else if (decision === "fail") {
    explanation = `Verdict failed because ${failedAttempts} replay attempt${failedAttempts === 1 ? "" : "s"} broke under the selected checks.`;
  } else {
    explanation = "Verdict passed. The selected trace set cleared this replay budget and the current checks.";
  }

  return {
    taskOutcome,
    decision,
    decisionLabel,
    explanation,
    reliabilityLabel: reliability ? formatPercent(reliability.reliability_score / 100, 1) : "n/a",
    reliabilityTone:
      reliability?.status === "critical"
        ? "danger"
        : reliability?.status === "warning"
          ? "warning"
          : reliability
            ? "success"
            : "default",
    policyViolations: policyViolationCount,
    toolCoverage,
    checkCoverage,
    contractFailures,
    currentCheckNames,
    currentCheckClass,
  };
}

function deriveNextRunRecommendation(
  run: RunMetadata,
  verdict: ReplayVerdict,
  baselineRun: RunMetadata | null
): NextRunRecommendation | null {
  if (verdict.decision === "pending") {
    return null;
  }

  const firstContractFailure = verdict.contractFailures[0] ?? null;
  if (firstContractFailure?.title === "Insufficient attempts") {
    return {
      title: "Increase attempts",
      description: "This run stopped short of the contract attempt floor. Increase the attempt budget, then rerun the same preset.",
      href: `/campaigns/${run.campaign_id}#run-modes`,
      label: "Open attempt budget",
    };
  }

  if (firstContractFailure?.title === "Missing required tool coverage") {
    return {
      title: "Add missing tool coverage",
      description: "The contract expects tools that never appeared in the selected traces. Add a trace that exercises them, then rerun.",
      href: `/campaigns/${run.campaign_id}?tab=scenarios#run-modes`,
      label: "Open scenarios",
    };
  }

  if (firstContractFailure?.title === "Missing required check coverage") {
    const preset = verdict.checkCoverage.detail.toLowerCase().includes("security") ? "security" : "reliability";
    return {
      title: preset === "security" ? "Add security checks" : "Add stronger reliability checks",
      description: "The contract expects a different check set than the one that ran. Launch the matching preset next.",
      href: `/campaigns/${run.campaign_id}?preset=${preset}#run-modes`,
      label: preset === "security" ? "Run security test" : "Run reliability test",
    };
  }

  if (verdict.decision === "fail" && verdict.currentCheckClass === "baseline") {
    return {
      title: "Add stronger reliability checks",
      description: "Baseline replay already breaks. Move straight to the reliability preset to see which stressed step fails first.",
      href: `/campaigns/${run.campaign_id}?preset=reliability#run-modes`,
      label: "Run reliability test",
    };
  }

  if (verdict.policyViolations > 0 && verdict.currentCheckClass !== "security") {
    return {
      title: "Add security checks",
      description: "Policy activity is already showing up. Run the security preset next to see whether prompt and tool abuse failures are reproducible.",
      href: `/campaigns/${run.campaign_id}?preset=security#run-modes`,
      label: "Run security test",
    };
  }

  if (!baselineRun && verdict.currentCheckClass !== "baseline") {
    return {
      title: "Compare with baseline",
      description: "You have a stressed run, but no clean replay to compare it against yet. Run the baseline next so the delta is obvious.",
      href: `/campaigns/${run.campaign_id}?preset=baseline#run-modes`,
      label: "Run baseline replay",
    };
  }

  if (baselineRun) {
    return {
      title: "Compare with baseline",
      description: "Use the baseline comparison below to confirm whether this run introduced a new dominant failure reason or cleared an old one.",
      href: `/runs/${run.run_id}#baseline-comparison`,
      label: "View baseline comparison",
    };
  }

  return null;
}

function deriveDecision(
  run: RunMetadata,
  failedAttempts: number,
  policyViolationCount: number,
  ciBatch: CIBatchStatus | null
): "pass" | "fail" | "pending" {
  if (ciBatch?.decision === "pass" || ciBatch?.decision === "fail" || ciBatch?.decision === "pending") {
    return ciBatch.decision;
  }

  const normalizedStatus = run.status.toLowerCase();
  if (normalizedStatus === "queued" || normalizedStatus === "running") {
    return "pending";
  }
  if (normalizedStatus === "failed") {
    return "fail";
  }
  if (failedAttempts > 0 || policyViolationCount > 0) {
    return "fail";
  }
  return "pass";
}

function deriveTaskOutcome(run: RunMetadata, failedAttempts: number) {
  const normalizedStatus = run.status.toLowerCase();
  if (normalizedStatus === "queued" || normalizedStatus === "running") {
    return "Still running";
  }
  if (normalizedStatus === "failed") {
    return "Run failed";
  }
  if (normalizedStatus === "completed" && failedAttempts > 0) {
    return "Completed with failures";
  }
  if (normalizedStatus === "completed") {
    return "Completed";
  }
  return run.status;
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

function ciBatchIdFromSummary(summary: Record<string, unknown> | null): string | null {
  const summaryObj = summary ?? {};
  const batchId = summaryObj.ci_batch_id;
  return typeof batchId === "string" && batchId.trim().length > 0 ? batchId : null;
}

function runTypeFromSummary(summary: Record<string, unknown> | null): RunType {
  const summaryObj = summary ?? {};
  const batchId = summaryObj.ci_batch_id;
  if (typeof batchId === "string" && batchId.trim()) {
    return "ci_batch";
  }
  const templateApplication = summaryObj.template_application;
  if (templateApplication && typeof templateApplication === "object") {
    return "template_replay";
  }
  return "manual";
}

function runTypeLabel(runType: RunType): string {
  if (runType === "ci_batch") return "CI batch";
  if (runType === "template_replay") return "Template replay";
  return "Manual run";
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
  const failureReasonShift = compareFailureReasonShift(baselineStats, currentStats);

  return (
    <Card id="baseline-comparison">
      <CardHeader>
        <CardTitle>Baseline Comparison</CardTitle>
        <CardDescription>
          Baseline run {shortId(baselineRun.run_id, 10)} vs current run {shortId(currentRun.run_id, 10)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            failureReasonShift ? "xl:grid-cols-3" : null,
          )}
        >
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
          {failureReasonShift ? (
            <div className="rounded-md border border-border/60 bg-muted/15 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dominant Failure Reason</p>
                  <p className="mt-2 text-sm text-foreground">
                    {failureReasonShift.baseline.reason} {failureReasonShift.baseline.count} • {formatPercent(failureReasonShift.baseline.pct, 0)}
                    {" → "}
                    {failureReasonShift.currentSameReason.count} • {formatPercent(failureReasonShift.currentSameReason.pct, 0)}
                  </p>
                </div>
                <Badge
                  variant={
                    failureReasonShift.trend === "improved"
                      ? "success"
                      : failureReasonShift.trend === "worsened"
                        ? "danger"
                        : "outline"
                  }
                >
                  {failureReasonShift.trend}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {failureReasonShift.currentSameReason.count === 0
                  ? "The rerun cleared the dominant baseline failure reason."
                  : failureReasonShift.currentTop && failureReasonShift.currentTop.reason !== failureReasonShift.baseline.reason
                    ? `Current top failure reason is ${failureReasonShift.currentTop.reason}.`
                    : "The same failure reason is still leading the rerun."}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightRecommendationCard({
  insight,
  isApplying,
  onApply,
}: {
  insight: RunStats["insights"][number];
  isApplying: boolean;
  onApply: () => void;
}) {
  const availability = getInsightAutoFixAvailability(insight);

  return (
    <div className="rounded-md border border-border/60 bg-muted/15 p-3">
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
          {availability.supported ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isApplying}
              onClick={onApply}
            >
              {isApplying ? "Applying..." : "Apply & Rerun"}
            </Button>
          ) : (
            <Badge variant="outline">Manual fix</Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{insight.why}</p>
      {!availability.supported && availability.reason ? (
        <p className="mt-2 text-xs text-muted-foreground">{availability.reason}</p>
      ) : null}
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
  );
}

async function loadAttemptEvidence(
  attempt: ReplayAttemptListItem | null,
): Promise<[ReplayAttemptDetail | null, AttemptTimeline | null]> {
  if (!attempt) {
    return [null, null];
  }

  const [detail, timeline] = await Promise.all([
    api.getAttempt(attempt.attempt_id).catch(() => null),
    api.getAttemptTimeline(attempt.attempt_id).catch(() => null),
  ]);
  return [detail, timeline];
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

function StatTile({ label, value, tone = "default", progress }: { label: string; value: string; tone?: "default" | "success" | "danger" | "warning" | "info"; progress?: number }) {
  const toneClasses: Record<string, string> = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-rose-400",
    warning: "text-amber-400",
    info: "text-info",
  };
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold leading-none", toneClasses[tone])}>{value}</p>
      {typeof progress === "number" ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success/70 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      ) : null}
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

function RunTypeBadge({ type }: { type: RunType }) {
  if (type === "ci_batch") return <Badge variant="info">CI batch</Badge>;
  if (type === "template_replay") return <Badge variant="warning">Template replay</Badge>;
  return <Badge variant="outline">Manual run</Badge>;
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

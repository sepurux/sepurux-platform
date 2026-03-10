"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import {
  api,
  type AttemptTimeline,
  type CounterfactualListItem,
  type MutationTraceAppliedItem,
  type ReplayAttemptDetail,
  type SecurityEventListItem,
} from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CounterfactualResultsCard } from "@/components/counterfactuals/counterfactual-results-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineViewer } from "@/components/diagnostics/timeline-viewer";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      attempt: ReplayAttemptDetail;
      timeline: AttemptTimeline | null;
      counterfactuals: CounterfactualListItem[];
      securityEvents: SecurityEventListItem[];
    };

export function AttemptDetailView({ attemptId }: { attemptId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const attempt = await api.getAttempt(attemptId);
      const [timeline, counterfactuals, runSecurityEvents] = await Promise.all([
        api.getAttemptTimeline(attemptId).catch(() => null),
        api.listAttemptCounterfactuals(attemptId).catch(() => []),
        api.listRunSecurityEvents(attempt.run_id, { limit: 200, offset: 0 }).catch(() => []),
      ]);
      const securityEvents = runSecurityEvents.filter((event) => event.attempt_id === attemptId);
      setState({ status: "ready", attempt, timeline, counterfactuals, securityEvents });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Failed to load attempt" });
    }
  }

  useEffect(() => {
    void load();
  }, [attemptId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/runs" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Runs
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attempt {shortId(attemptId, 12)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Replay attempt metadata, timeline, and what-if analysis results.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <AttemptDetailSkeleton />
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20"><CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent></Card>
      ) : (
        <AttemptDetailPanels
          attempt={state.attempt}
          timeline={state.timeline}
          counterfactuals={state.counterfactuals}
          securityEvents={state.securityEvents}
        />
      )}
    </div>
  );
}

function AttemptDetailPanels({
  attempt,
  timeline,
  counterfactuals,
  securityEvents,
}: {
  attempt: ReplayAttemptDetail;
  timeline: AttemptTimeline | null;
  counterfactuals: CounterfactualListItem[];
  securityEvents: SecurityEventListItem[];
}) {
  const isPolicyBlocked = (attempt.failure_reason ?? "").startsWith("policy_");
  const mutationTraceApplied = Array.isArray(attempt.mutation_trace?.applied)
    ? attempt.mutation_trace.applied
    : [];
  const mutationTraceAppliedCount = mutationTraceApplied.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Attempt Metadata</CardTitle>
            <CardDescription>
              Mutation {attempt.mutation_id} • Run {shortId(attempt.run_id, 12)} • {formatRelativeDate(attempt.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetadataRow label="Attempt ID" value={attempt.attempt_id} />
            <MetadataRow label="Run ID" value={attempt.run_id} />
            <MetadataRow label="Mutation" value={attempt.mutation_id} />
            <MetadataRow label="Result" value={<Badge variant={attempt.result.toLowerCase().startsWith("pass") ? "success" : "danger"}>{attempt.result}</Badge>} />
            <MetadataRow label="Failure Reason" value={attempt.failure_reason ?? "--"} />
            <MetadataRow label="First Failure Tool" value={attempt.first_failure_tool ?? "--"} />
            <MetadataRow label="First Failure Step" value={attempt.first_failure_event_index ?? "--"} />
            <MetadataRow label="Mutation Seed" value={attempt.seed ?? "--"} />
            <MetadataRow
              label="Mutation Trace"
              value={attempt.seed === null ? "--" : `${mutationTraceAppliedCount} applied mutation(s)`}
            />
            <MetadataRow
              label="Policy Blocked"
              value={
                isPolicyBlocked ? (
                  <Badge variant="danger">
                    yes {attempt.first_failure_event_index !== null ? `@ #${attempt.first_failure_event_index}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="default">no</Badge>
                )
              }
            />
            <MetadataRow
              label="Policy Offending Tool"
              value={isPolicyBlocked ? (attempt.first_failure_tool ?? "--") : "--"}
            />
            <MetadataRow label="Artifact Key" value={attempt.artifacts_s3_key ?? "--"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applied Mutations</CardTitle>
            <CardDescription>Mutation trace captured for this replay attempt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attempt.seed === null ? (
              <p className="text-sm text-muted-foreground">No mutation pack applied to this attempt.</p>
            ) : mutationTraceAppliedCount === 0 ? (
              <p className="text-sm text-muted-foreground">No mutations were applied for this seed.</p>
            ) : (
              mutationTraceApplied.map((entry, index) => (
                <MutationTraceRow key={buildMutationTraceKey(entry, index)} entry={entry} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Events</CardTitle>
            <CardDescription>
              Trust-zone firewall decisions recorded during replay for this attempt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {securityEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No security events recorded for this attempt.</p>
            ) : (
              securityEvents.map((event) => (
                <div
                  key={event.security_event_id}
                  className="rounded-md border border-border/60 bg-muted/10 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground">{event.tool}</span>
                    <Badge
                      variant={
                        event.action === "block"
                          ? "danger"
                          : event.action === "sanitize"
                            ? "warning"
                            : "default"
                      }
                    >
                      {event.action}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    zone={event.zone} • risk={Math.round(event.risk_score * 100)}% • event #{event.event_index}
                  </p>
                  {Array.isArray(event.matches) && event.matches.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      matches: {event.matches.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <CounterfactualResultsCard
          items={counterfactuals}
          title="Counterfactual Results"
          description="Strategy outcomes from /attempts/{attempt_id}/counterfactuals."
        />
      </div>

      <TimelineViewer timeline={timeline} />
    </div>
  );
}

function buildMutationTraceKey(entry: MutationTraceAppliedItem, index: number) {
  const mutationId = typeof entry.mutation_id === "string" ? entry.mutation_id : "mutation";
  const tool = typeof entry.tool === "string" ? entry.tool : "tool";
  const eventIndex = typeof entry.event_index === "number" ? String(entry.event_index) : String(index);
  return `${mutationId}-${tool}-${eventIndex}-${index}`;
}

function MutationTraceRow({ entry }: { entry: MutationTraceAppliedItem }) {
  const mutationId = typeof entry.mutation_id === "string" ? entry.mutation_id : "--";
  const tool = typeof entry.tool === "string" ? entry.tool : "--";
  const eventIndex = typeof entry.event_index === "number" ? `#${entry.event_index}` : "--";
  const details =
    entry.details && typeof entry.details === "object" ? JSON.stringify(entry.details, null, 2) : null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-foreground">{mutationId}</span>
        <Badge variant="outline">{eventIndex}</Badge>
      </div>
      <p className="text-sm text-foreground">Tool: {tool}</p>
      {details ? (
        <pre className="mt-2 overflow-x-auto rounded bg-background/80 p-2 text-xs text-muted-foreground">
          {details}
        </pre>
      ) : null}
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 sm:grid-cols-[160px_1fr] sm:items-center">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground break-all">{value}</div>
    </div>
  );
}

function AttemptDetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <Card><CardContent className="p-5"><Skeleton className="h-[560px] w-full" /></CardContent></Card>
      <Card><CardContent className="p-5"><Skeleton className="h-[560px] w-full" /></CardContent></Card>
    </div>
  );
}

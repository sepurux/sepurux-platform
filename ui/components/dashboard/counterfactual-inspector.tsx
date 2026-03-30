"use client";

import { useEffect, useMemo, useState } from "react";

import {
  api,
  type AttemptTimeline,
  type CounterfactualListItem,
  type ReplayAttemptDetail,
  type ReplayAttemptListItem,
  type RunMetadata,
} from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineViewer } from "@/components/diagnostics/timeline-viewer";
import { CounterfactualResultsCard } from "@/components/counterfactuals/counterfactual-results-card";

type InspectorState = {
  loading: boolean;
  error: string | null;
  attempt: ReplayAttemptDetail | null;
  timeline: AttemptTimeline | null;
  counterfactuals: CounterfactualListItem[];
};

export function CounterfactualInspector({
  runs,
  failedAttemptsByRunId,
  compact = false,
}: {
  runs: RunMetadata[];
  failedAttemptsByRunId: Record<string, ReplayAttemptListItem[]>;
  compact?: boolean;
}) {
  const runOptions = useMemo(
    () => runs.filter((run) => (failedAttemptsByRunId[run.run_id] ?? []).length > 0),
    [runs, failedAttemptsByRunId]
  );
  const [selectedRunId, setSelectedRunId] = useState<string>(runOptions[0]?.run_id ?? "");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [inspector, setInspector] = useState<InspectorState>({
    loading: false,
    error: null,
    attempt: null,
    timeline: null,
    counterfactuals: [],
  });

  useEffect(() => {
    if (!runOptions.length) {
      setSelectedRunId("");
      setSelectedAttemptId("");
      return;
    }
    if (!runOptions.some((run) => run.run_id === selectedRunId)) {
      setSelectedRunId(runOptions[0].run_id);
    }
  }, [runOptions, selectedRunId]);

  const attemptOptions = useMemo(
    () => (selectedRunId ? failedAttemptsByRunId[selectedRunId] ?? [] : []),
    [failedAttemptsByRunId, selectedRunId]
  );

  useEffect(() => {
    if (!attemptOptions.length) {
      setSelectedAttemptId("");
      return;
    }
    if (!attemptOptions.some((attempt) => attempt.attempt_id === selectedAttemptId)) {
      setSelectedAttemptId(attemptOptions[0].attempt_id);
    }
  }, [attemptOptions, selectedAttemptId]);

  useEffect(() => {
    if (!selectedAttemptId) {
      setInspector({ loading: false, error: null, attempt: null, timeline: null, counterfactuals: [] });
      return;
    }

    let cancelled = false;
    setInspector((prev) => ({ ...prev, loading: true, error: null }));

    async function loadInspector() {
      try {
        const [attempt, timeline, counterfactuals] = await Promise.all([
          api.getAttempt(selectedAttemptId),
          api.getAttemptTimeline(selectedAttemptId).catch(() => null),
          api.listAttemptCounterfactuals(selectedAttemptId),
        ]);

        if (!cancelled) {
          setInspector({ loading: false, error: null, attempt, timeline, counterfactuals });
        }
      } catch (error) {
        if (!cancelled) {
          setInspector({
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load inspector",
            attempt: null,
            timeline: null,
            counterfactuals: [],
          });
        }
      }
    }

    void loadInspector();

    return () => {
      cancelled = true;
    };
  }, [selectedAttemptId]);

  if (!runOptions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Counterfactual Inspector</CardTitle>
          <CardDescription>Waiting for failed attempts to inspect.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            No failed attempts found in the recent dashboard sample. Create a run with failures to compare what-if strategies.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={
        compact
          ? "grid gap-6 xl:grid-cols-[minmax(24rem,1.15fr)_minmax(0,1.35fr)]"
          : "grid gap-6 xl:grid-cols-[minmax(24rem,1fr)_minmax(0,1fr)]"
      }
    >
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Counterfactual Inspector</CardTitle>
            <CardDescription>Select a run and failed attempt to compare original vs counterfactual outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Run</span>
                <select
                  className="w-full min-w-0 truncate rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-foreground outline-none"
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                >
                  {runOptions.map((run) => (
                    <option key={run.run_id} value={run.run_id}>
                      {shortId(run.run_id, 10)} • {run.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Attempt</span>
                <select
                  className="w-full min-w-0 truncate rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-foreground outline-none"
                  value={selectedAttemptId}
                  onChange={(event) => setSelectedAttemptId(event.target.value)}
                  disabled={!attemptOptions.length}
                >
                  {attemptOptions.map((attempt) => (
                    <option key={attempt.attempt_id} value={attempt.attempt_id}>
                      {shortId(attempt.attempt_id, 10)} • {attempt.failure_reason ?? "failed"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {inspector.error ? (
              <div className="rounded-md border border-danger/20 bg-danger/8 p-4 text-sm text-danger">{inspector.error}</div>
            ) : inspector.attempt ? (
              <div className="rounded-md border border-border/60 bg-muted/15 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Original Outcome</span>
                  <Badge variant={inspector.attempt.result.toLowerCase().startsWith("pass") ? "success" : "danger"}>
                    {inspector.attempt.result}
                  </Badge>
                  {inspector.attempt.failure_reason ? <Badge variant="outline">{inspector.attempt.failure_reason}</Badge> : null}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="min-w-0 rounded-md border border-border/50 bg-card/30 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide">Mutation</span>
                    <p className="mt-1 break-all text-foreground">{inspector.attempt.mutation_id}</p>
                  </div>
                  <div className="min-w-0 rounded-md border border-border/50 bg-card/30 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide">First Failure</span>
                    <p className="mt-1 break-words text-foreground">
                      {inspector.attempt.first_failure_tool ?? "--"}
                      {inspector.attempt.first_failure_event_index !== null
                        ? ` @ #${inspector.attempt.first_failure_event_index}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelativeDate(inspector.attempt.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
                Select a failed attempt to inspect.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <CounterfactualResultsCard
            items={inspector.counterfactuals}
            loading={inspector.loading}
            error={inspector.error}
            compact={compact}
            title="Counterfactual Strategies"
            description="What-if replay outcomes for the selected attempt."
          />
        </div>
      </div>

      <div className="min-w-0">
        <TimelineViewer
          timeline={inspector.timeline}
          compact
          title="Attempt Timeline"
          description="Timeline events for the selected attempt from /attempts/{attempt_id}/timeline."
        />
      </div>
    </div>
  );
}

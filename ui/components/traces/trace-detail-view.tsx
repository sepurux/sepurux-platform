"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, RefreshCcw, RotateCcw, Sparkles, Wrench, ShieldAlert, MessageSquareText, CheckCircle2 } from "lucide-react";

import { api, type TraceMetadata, type TraceTimelineStep } from "@/lib/api";
import { formatDurationMs, formatRelativeDate, shortId } from "@/lib/format";
import { resolveTraceSdkLabel } from "@/lib/trace-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trace: TraceMetadata; timeline: TraceTimelineStep[] };

export function TraceDetailView({ traceId }: { traceId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const [trace, timeline] = await Promise.all([
        api.getTrace(traceId, { includePayload: true }),
        api.getTraceTimeline(traceId),
      ]);
      setState({ status: "ready", trace, timeline });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Failed to load trace" });
    }
  }

  useEffect(() => {
    void load();
  }, [traceId]);

  const payloadPreview = useMemo(() => {
    if (state.status !== "ready") {
      return "";
    }
    if (state.trace.payload === null || state.trace.payload === undefined) {
      return "Trace payload unavailable.";
    }
    return JSON.stringify(state.trace.payload, null, 2);
  }, [state]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/traces"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Traces
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Trace Detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.status === "ready" && state.trace.task_name
              ? `Chronological workflow view for ${state.trace.task_name}.`
              : "Metadata, timeline, and payload preview for one trace."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Trace identity, source, and storage reference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <MetadataRow label="Trace ID" value={state.trace.trace_id} mono />
              <MetadataRow label="Task / Agent" value={state.trace.task_name ?? "--"} />
              <MetadataRow label="Source" value={state.trace.source} />
              <MetadataRow label="Trace Version" value={state.trace.trace_version} />
              <MetadataRow label="SDK Metadata" value={resolveTraceSdkLabel(state.trace)} mono />
              <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-start">
                <span className="text-muted-foreground">Validation</span>
                <div>
                  <ValidationStatusBadge status={state.trace.validation_status} />
                </div>
              </div>
              <MetadataRow label="S3 Key" value={state.trace.s3_key} mono />
              <MetadataRow label="Created" value={formatRelativeDate(state.trace.created_at)} />
            </CardContent>
          </Card>

          <TraceTimelinePanel timeline={state.timeline} />

          <Card>
            <CardHeader>
              <CardTitle>Normalized Summary</CardTitle>
              <CardDescription>Canonical trace metadata generated at ingest time.</CardDescription>
            </CardHeader>
            <CardContent>
              {state.trace.normalized_summary ? (
                <pre className="max-h-[20rem] overflow-auto rounded-md border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(state.trace.normalized_summary, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Normalized summary unavailable.</p>
              )}
            </CardContent>
          </Card>

          {state.trace.validation_status.toLowerCase() === "invalid" ? (
            <Card className="border-rose-400/20">
              <CardHeader>
                <CardTitle>Validation Errors</CardTitle>
                <CardDescription>Trace failed schema validation during intake.</CardDescription>
              </CardHeader>
              <CardContent>
                {state.trace.validation_errors && state.trace.validation_errors.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {state.trace.validation_errors.map((item) => (
                      <li key={`${item.path}:${item.message}`} className="rounded border border-rose-400/20 bg-rose-500/10 p-2 text-rose-100">
                        <span className="font-mono text-xs">{item.path}</span>: {item.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-rose-100">No validation error details are available.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Raw Trace JSON</CardTitle>
              <CardDescription>Collapsed preview for quick inspection.</CardDescription>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm text-foreground">Show payload JSON</summary>
                <pre className="mt-3 max-h-[28rem] overflow-auto rounded-md border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                  {payloadPreview}
                </pre>
              </details>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ValidationStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "valid") return <Badge variant="success">valid</Badge>;
  if (normalized === "invalid") return <Badge variant="danger">invalid</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-start">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function TraceTimelinePanel({ timeline }: { timeline: TraceTimelineStep[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          Step-level trace view across prompt, model calls, tool calls, mutations, retries, and failures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No trace steps recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((step, index) => {
              const Icon = iconForStep(step.step_type);
              const source = typeof step.metadata?.source === "string" ? step.metadata.source : null;
              const runId = typeof step.metadata?.run_id === "string" ? step.metadata.run_id : null;
              const attemptId = typeof step.metadata?.attempt_id === "string" ? step.metadata.attempt_id : null;
              return (
                <div key={step.id} className="relative pl-8">
                  {index < timeline.length - 1 ? (
                    <div className="absolute left-[0.8rem] top-8 h-[calc(100%+0.5rem)] w-px bg-border/70" />
                  ) : null}
                  <div className="absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full border border-border/70 bg-background shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{step.step_name}</span>
                          <Badge variant={variantForStatus(step.status)}>{step.status}</Badge>
                          <Badge variant="outline">{step.step_type.replace(/_/g, " ")}</Badge>
                          {step.mutation_name ? <Badge variant="warning">{step.mutation_name}</Badge> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatRelativeDate(step.started_at)}</span>
                          {step.latency_ms != null ? <span>{formatDurationMs(step.latency_ms)}</span> : null}
                          {source ? <span>{source}</span> : null}
                          {runId ? <span>run {shortId(runId, 8)}</span> : null}
                          {attemptId ? <span>attempt {shortId(attemptId, 8)}</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <PayloadPanel label="Input" value={step.input_payload} />
                      <PayloadPanel label="Output" value={step.output_payload} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayloadPanel({ label, value }: { label: string; value: unknown }) {
  const preview = toPreview(value);
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        {label}: none
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <pre className="max-h-56 overflow-auto text-xs leading-relaxed text-muted-foreground">{preview}</pre>
    </div>
  );
}

function toPreview(value: unknown) {
  if (value === null || value === undefined) return null;
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > 1200 ? `${text.slice(0, 1200)}\n…` : text;
  } catch {
    return String(value);
  }
}

function iconForStep(stepType: string) {
  switch (stepType) {
    case "prompt":
      return MessageSquareText;
    case "llm_call":
      return Bot;
    case "tool_call":
      return Wrench;
    case "mutation":
      return Sparkles;
    case "retry":
      return RotateCcw;
    case "failure":
      return ShieldAlert;
    case "agent_output":
      return CheckCircle2;
    default:
      return Bot;
  }
}

function variantForStatus(status: string): "default" | "success" | "warning" | "danger" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "retry") return "warning";
  if (normalized === "error" || normalized === "timeout") return "danger";
  return "outline";
}

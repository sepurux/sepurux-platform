"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Bot, Hammer, RefreshCcw, Wrench, Zap } from "lucide-react";

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
            <CardContent>
              <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2.5 text-sm">
                <dt className="text-muted-foreground">Trace ID</dt>
                <dd className="font-mono text-xs text-foreground">{state.trace.trace_id}</dd>
                <dt className="text-muted-foreground">Task / Agent</dt>
                <dd className="text-teal">{state.trace.task_name ?? "--"}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-foreground">{state.trace.source}</dd>
                <dt className="text-muted-foreground">Trace Version</dt>
                <dd className="text-foreground">{state.trace.trace_version}</dd>
                <dt className="text-muted-foreground">SDK Metadata</dt>
                <dd className="font-mono text-xs text-foreground">{resolveTraceSdkLabel(state.trace)}</dd>
                <dt className="text-muted-foreground">Validation</dt>
                <dd><ValidationStatusBadge status={state.trace.validation_status} /></dd>
                <dt className="text-muted-foreground">S3 Key</dt>
                <dd className="font-mono text-xs text-foreground">{state.trace.s3_key}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">{formatRelativeDate(state.trace.created_at)}</dd>
              </dl>
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

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const STEP_TYPE_CONFIG: Record<string, { iconColor: string; dotBg: string; dotBorder: string; accentBorder: string }> = {
  llm_call:     { iconColor: "text-primary",         dotBg: "bg-primary/10",    dotBorder: "border-primary/40",    accentBorder: "border-l-primary/60" },
  model:        { iconColor: "text-primary",         dotBg: "bg-primary/10",    dotBorder: "border-primary/40",    accentBorder: "border-l-primary/60" },
  agent_output: { iconColor: "text-primary",         dotBg: "bg-primary/10",    dotBorder: "border-primary/40",    accentBorder: "border-l-primary/60" },
  tool_call:    { iconColor: "text-blue-400",        dotBg: "bg-blue-400/10",   dotBorder: "border-blue-400/40",   accentBorder: "border-l-blue-400/60" },
  tool_result:  { iconColor: "text-teal-400",        dotBg: "bg-teal-400/10",   dotBorder: "border-teal-400/40",   accentBorder: "border-l-teal-400/60" },
  mutation:     { iconColor: "text-amber-400",       dotBg: "bg-amber-400/10",  dotBorder: "border-amber-400/40",  accentBorder: "border-l-amber-400/60" },
  failure:      { iconColor: "text-rose-400",        dotBg: "bg-rose-400/10",   dotBorder: "border-rose-400/40",   accentBorder: "border-l-rose-400/60" },
  error:        { iconColor: "text-rose-400",        dotBg: "bg-rose-400/10",   dotBorder: "border-rose-400/40",   accentBorder: "border-l-rose-400/60" },
  retry:        { iconColor: "text-orange-400",      dotBg: "bg-orange-400/10", dotBorder: "border-orange-400/40", accentBorder: "border-l-orange-400/60" },
  prompt:       { iconColor: "text-muted-foreground", dotBg: "bg-muted/60",     dotBorder: "border-border/70",     accentBorder: "border-l-border/60" },
};

const DEFAULT_STEP_CONFIG = {
  iconColor: "text-muted-foreground",
  dotBg: "bg-muted/60",
  dotBorder: "border-border/70",
  accentBorder: "border-l-border/60",
};

function iconForStep(stepType: string) {
  switch (stepType) {
    case "llm_call":
    case "model":
    case "agent_output":
    case "prompt":
      return Bot;
    case "tool_call":
      return Hammer;
    case "tool_result":
      return Wrench;
    case "mutation":
      return Zap;
    case "failure":
    case "error":
      return AlertTriangle;
    default:
      return Bot;
  }
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
          <div className="space-y-3">
            {timeline.map((step, index) => {
              const Icon = iconForStep(step.step_type);
              const cfg = STEP_TYPE_CONFIG[step.step_type] ?? DEFAULT_STEP_CONFIG;
              const source = typeof step.metadata?.source === "string" ? step.metadata.source : null;
              const runId = typeof step.metadata?.run_id === "string" ? step.metadata.run_id : null;
              const attemptId = typeof step.metadata?.attempt_id === "string" ? step.metadata.attempt_id : null;
              const hasPayload = step.input_payload != null || step.output_payload != null;
              return (
                <div key={step.id} className="relative pl-10">
                  {index < timeline.length - 1 ? (
                    <div className="absolute left-[1.1rem] top-9 h-[calc(100%+0.25rem)] w-0.5 bg-border/50" />
                  ) : null}
                  {/* Step dot */}
                  <div className={`absolute left-0 top-2 grid h-8 w-8 place-items-center rounded-full border ${cfg.dotBg} ${cfg.dotBorder} shadow-sm`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  </div>
                  {/* Step card */}
                  <div className={`rounded-lg border border-border/60 border-l-2 ${cfg.accentBorder} bg-card/60`}>
                    {/* Header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{step.step_name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {step.step_type.replace(/_/g, " ")}
                        </Badge>
                        {step.mutation_name ? (
                          <Badge variant="warning" className="shrink-0 text-[10px]">{step.mutation_name}</Badge>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {step.latency_ms != null ? (
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {formatDurationMs(step.latency_ms)}
                          </span>
                        ) : null}
                        <Badge variant={variantForStatus(step.status)}>{step.status}</Badge>
                      </div>
                    </div>
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
                      <span>{formatRelativeDate(step.started_at)}</span>
                      {source ? <span className="font-mono">{source}</span> : null}
                      {runId ? <span>run <span className="font-mono">{shortId(runId, 8)}</span></span> : null}
                      {attemptId ? <span>attempt <span className="font-mono">{shortId(attemptId, 8)}</span></span> : null}
                    </div>
                    {/* Collapsible payload */}
                    {hasPayload ? (
                      <details className="group border-t border-border/40">
                        <summary className="flex cursor-pointer select-none items-center gap-1.5 px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">
                          <svg className="h-3 w-3 rotate-[-90deg] transition-transform group-open:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Payload
                        </summary>
                        <div className="grid gap-3 px-4 pb-4 pt-2 lg:grid-cols-2">
                          <PayloadPanel label="Input" value={step.input_payload} />
                          <PayloadPanel label="Output" value={step.output_payload} />
                        </div>
                      </details>
                    ) : null}
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

function variantForStatus(status: string): "default" | "success" | "warning" | "danger" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "retry") return "warning";
  if (normalized === "error" || normalized === "timeout") return "danger";
  return "outline";
}

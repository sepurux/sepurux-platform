"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import { api, type TraceMetadata } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trace: TraceMetadata };

export function TraceDetailView({ traceId }: { traceId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const trace = await api.getTrace(traceId, { includePayload: true });
      setState({ status: "ready", trace });
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
          <p className="mt-1 text-sm text-muted-foreground">Metadata and payload preview for one trace.</p>
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
              <CardDescription>Trace identity and storage reference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <MetadataRow label="Trace ID" value={state.trace.trace_id} mono />
              <MetadataRow label="Source" value={state.trace.source} />
              <MetadataRow label="S3 Key" value={state.trace.s3_key} mono />
              <MetadataRow label="Created" value={formatRelativeDate(state.trace.created_at)} />
            </CardContent>
          </Card>

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

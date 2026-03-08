"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type TraceMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; traces: TraceMetadata[] };

export function TracesListView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const traces = await api.listTraces({ limit: 200, offset: 0 });
        if (cancelled) return;
        setState({ status: "ready", traces });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load traces",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Traces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uploaded trace artifacts for the active project.
        </p>
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
        <Card>
          <CardHeader>
            <CardTitle>Trace Catalog</CardTitle>
            <CardDescription>{state.traces.length} trace(s) in current project scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>SDK</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.traces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No traces yet - upload via SDK or curl.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.traces.map((trace) => (
                    <TableRow
                      key={trace.trace_id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/traces/${trace.trace_id}`)}
                    >
                      <TableCell className="font-mono text-xs text-foreground" title={trace.trace_id}>
                        {shortId(trace.trace_id, 20)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{trace.source}</TableCell>
                      <TableCell className="text-foreground">{trace.trace_version}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {trace.sdk_meta ?? "--"}
                      </TableCell>
                      <TableCell>
                        <ValidationStatusBadge status={trace.validation_status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(trace.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

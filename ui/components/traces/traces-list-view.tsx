"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type TraceMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { resolveTraceSdkLabel } from "@/lib/trace-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; traces: TraceMetadata[] };

const PAGE_SIZE = 25;

export function TracesListView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const traces = await api.listTraces({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        if (cancelled) return;
        setState({ status: "ready", traces });
        setHasNext(traces.length === PAGE_SIZE);
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load traces",
        });
        setHasNext(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [page]);

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
            <CardDescription>
              {state.traces.length} trace(s) in current project scope for this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>Task / Agent</TableHead>
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
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                      <TableCell className="text-foreground">
                        {trace.task_name ? (
                          <span className="font-medium">{trace.task_name}</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{trace.source}</TableCell>
                      <TableCell className="text-foreground">{trace.trace_version}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {resolveTraceSdkLabel(trace)}
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
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              currentCount={state.traces.length}
              hasNext={hasNext}
              onPrev={() => setPage((currentValue) => Math.max(0, currentValue - 1))}
              onNext={() => setPage((currentValue) => currentValue + 1)}
            />
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

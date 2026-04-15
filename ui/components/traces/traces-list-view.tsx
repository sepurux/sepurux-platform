"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Search } from "lucide-react";

import { api, type TraceMetadata } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import { resolveTraceSdkLabel } from "@/lib/trace-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { IdPill } from "@/components/ui/id-pill";
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredTraces = useMemo(() => {
    if (state.status !== "ready") return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return state.traces;
    return state.traces.filter(
      (trace) =>
        trace.trace_id.toLowerCase().includes(q) ||
        (trace.task_name ?? "").toLowerCase().includes(q)
    );
  }, [state, searchQuery]);

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Traces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploaded trace artifacts for the active project.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4 shrink-0" />
          <input
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-44"
            placeholder="Search trace ID or task name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
        <Card className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white/96 shadow-[0_24px_80px_rgba(148,163,184,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-[#171e2f]/96 dark:shadow-[0_24px_80px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CardHeader className="border-b border-slate-200/90 pb-6 dark:border-white/8">
            <DataTableHeader
              icon={FileSearch}
              accent="amber"
              title="Trace Catalog"
              description="Review uploaded scenarios, source metadata, and validation state before adding traces to a test run."
              badge={
                searchQuery
                  ? `${filteredTraces.length} visible`
                  : `${state.status === "ready" ? state.traces.length : 0} traces`
              }
            />
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
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
                {filteredTraces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {searchQuery ? "No traces match your search." : "No traces yet - upload via SDK or curl."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTraces.map((trace) => (
                    <TableRow
                      key={trace.trace_id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/traces/${trace.trace_id}`)}
                    >
                      <TableCell>
                        <IdPill id={trace.trace_id} />
                      </TableCell>
                      <TableCell>
                        {trace.task_name ? (
                          <span className="font-medium text-primary">{trace.task_name}</span>
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

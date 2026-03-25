"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, RefreshCcw } from "lucide-react";

import { api, type RunMetadata } from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; runs: RunMetadata[] };

const PAGE_SIZE = 12;

export function RunsListView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hasNext, setHasNext] = useState(false);

  async function load() {
    setState({ status: "loading" });
    try {
      const runs = await api.listRuns({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setState({ status: "ready", runs });
      setHasNext(runs.length === PAGE_SIZE);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load runs",
      });
      setHasNext(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filter and inspect recent runs from the Sepurux pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <label className="sr-only" htmlFor="run-status-filter">Status filter</label>
            <select
              id="run-status-filter"
              className="bg-transparent text-sm text-foreground outline-none"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Catalog</CardTitle>
          <CardDescription>Server-paginated runs for the active project and filter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === "loading" ? (
            <RunsTableSkeleton />
          ) : state.status === "error" ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{state.message}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No runs match this filter.</TableCell>
                    </TableRow>
                  ) : (
                    state.runs.map((run) => {
                      const summary = (run.summary ?? {}) as Record<string, unknown>;
                      const attemptCount = typeof summary.attempt_count === "number" ? summary.attempt_count : null;
                      const passRate =
                        attemptCount && typeof summary.passed_count === "number" && attemptCount > 0
                          ? summary.passed_count / attemptCount
                          : null;
                      return (
                        <TableRow key={run.run_id}>
                          <TableCell>
                            <Link href={`/runs/${run.run_id}`} className="font-medium text-foreground hover:text-info">
                              {shortId(run.run_id, 10)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{shortId(run.campaign_id, 10)}</TableCell>
                          <TableCell><RunStatusBadge status={run.status} /></TableCell>
                          <TableCell className="text-right text-foreground">{passRate === null ? "--" : formatPercent(passRate, 0)}</TableCell>
                          <TableCell className="text-right text-foreground">{attemptCount ?? "--"}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatRelativeDate(run.created_at)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {state.runs.length === 0 ? 0 : page * PAGE_SIZE + 1}–{page * PAGE_SIZE + state.runs.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((currentValue) => Math.max(0, currentValue - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <div className="rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground">
                    Page {page + 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((currentValue) => currentValue + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="info">running</Badge>;
  if (normalized === "queued") return <Badge variant="neutral">queued</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function RunsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

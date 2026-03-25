"use client";

import { useEffect, useMemo, useState } from "react";

import { api, type CampaignMetadata, type RunMetadata } from "@/lib/api";
import { formatPercent, formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; runs: RunMetadata[]; campaignsById: Record<string, CampaignMetadata> };

const PAGE_SIZE = 25;

export function ReportsView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  async function load() {
    setState({ status: "loading" });

    const [runsResult, campaignsResult] = await Promise.allSettled([
      api.listRuns({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
      api.listCampaigns({ limit: 200, offset: 0 }),
    ]);

    if (runsResult.status !== "fulfilled") {
      setState({
        status: "error",
        message: runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load reports",
      });
      return;
    }

    const campaignsById: Record<string, CampaignMetadata> = {};
    if (campaignsResult.status === "fulfilled") {
      for (const campaign of campaignsResult.value) {
        campaignsById[campaign.campaign_id] = campaign;
      }
    }

    setState({ status: "ready", runs: runsResult.value, campaignsById });
    setHasNext(runsResult.value.length === PAGE_SIZE);
  }

  useEffect(() => {
    void load();
  }, [page]);

  const rows = useMemo(() => {
    if (state.status !== "ready") {
      return [] as Array<{
        runId: string;
        campaignLabel: string;
        status: string;
        passRate: number | null;
        policyViolations: number;
        createdAt: string;
      }>;
    }

    return state.runs.map((run) => {
      const summary = (run.summary ?? {}) as Record<string, unknown>;
      const attemptCount = typeof summary.attempt_count === "number" ? summary.attempt_count : null;
      const passedCount = typeof summary.passed_count === "number" ? summary.passed_count : null;
      const derivedPassRate =
        typeof run.pass_rate === "number"
          ? run.pass_rate
          : attemptCount && passedCount !== null && attemptCount > 0
            ? passedCount / attemptCount
            : null;

      const policyViolations =
        typeof summary.policy_violations_total === "number"
          ? summary.policy_violations_total
          : typeof summary.policy_events_count === "number"
            ? summary.policy_events_count
            : 0;

      return {
        runId: run.run_id,
        campaignLabel: state.campaignsById[run.campaign_id]?.name ?? shortId(run.campaign_id, 12),
        status: run.status,
        passRate: derivedPassRate,
        policyViolations,
        createdAt: run.created_at,
      };
    });
  }, [state]);

  async function onExportJson(runId: string) {
    setExportingRunId(runId);
    try {
      const stats = await api.getRunStats(runId).catch(() => null);
      downloadJson(`run-${runId}-stats.json`, {
        run_id: runId,
        exported_at: new Date().toISOString(),
        stats,
      });
    } finally {
      setExportingRunId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick summaries from recent runs with lightweight export.
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
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>{rows.length} run(s) in this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-right">Policy Violations</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No runs available to report yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.runId}>
                      <TableCell className="font-mono text-xs text-muted-foreground" title={row.runId}>
                        {shortId(row.runId, 14)}
                      </TableCell>
                      <TableCell className="text-foreground">{row.campaignLabel}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {row.passRate === null ? "--" : formatPercent(row.passRate, 0)}
                      </TableCell>
                      <TableCell className="text-right text-foreground">{row.policyViolations}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void onExportJson(row.runId)}
                          disabled={exportingRunId === row.runId}
                        >
                          {exportingRunId === row.runId ? "Exporting..." : "Export JSON"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              currentCount={rows.length}
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

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return <Badge variant="success">completed</Badge>;
  if (normalized === "failed") return <Badge variant="danger">failed</Badge>;
  if (normalized === "running") return <Badge variant="info">running</Badge>;
  if (normalized === "queued") return <Badge variant="neutral">queued</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function downloadJson(filename: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

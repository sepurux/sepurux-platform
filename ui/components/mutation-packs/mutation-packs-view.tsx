"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  api,
  type CampaignMetadata,
  type MutationPackMetadata,
  type TraceMetadata,
} from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Check, Copy } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: MutationPackMetadata[] };

type DeleteState = { status: "idle" } | { status: "deleting"; id: string } | { status: "error"; message: string };

type RunDependenciesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; traces: TraceMetadata[]; campaigns: CampaignMetadata[] };

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; message: string }
  | { status: "success"; runId: string };

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      title="Copy full ID"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function MutationPacksView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [runDependencies, setRunDependencies] = useState<RunDependenciesState>({
    status: "idle",
  });
  const [selectedMutationPackId, setSelectedMutationPackId] = useState("");
  const [selectedTraceId, setSelectedTraceId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [runState, setRunState] = useState<RunState>({ status: "idle" });

  const [deleteState, setDeleteState] = useState<DeleteState>({ status: "idle" });

  const canManageMutationPacks = authSession?.permissions.can_manage_mutation_packs ?? false;
  const canRunCampaigns = authSession?.permissions.can_run_campaigns ?? false;

  async function onDeletePack(packId: string, packName: string) {
    if (!window.confirm(`Delete mutation pack "${packName}"? This cannot be undone.`)) return;
    setDeleteState({ status: "deleting", id: packId });
    try {
      await api.deleteMutationPack(packId);
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", records: prev.records.filter((r) => r.mutation_pack_id !== packId) }
          : prev
      );
      setDeleteState({ status: "idle" });
    } catch (error) {
      setDeleteState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to delete mutation pack",
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await api.listMutationPacks();
        if (cancelled) {
          return;
        }
        setState({ status: "ready", records });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load mutation packs",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canRunCampaigns) {
      setRunDependencies({ status: "idle" });
      return;
    }

    let cancelled = false;
    setRunDependencies({ status: "loading" });

    async function loadDependencies() {
      try {
        const [traces, campaigns] = await Promise.all([
          api.listTraces({ limit: 200, offset: 0 }),
          api.listCampaigns({ limit: 200, offset: 0 }),
        ]);
        if (cancelled) {
          return;
        }
        setRunDependencies({ status: "ready", traces, campaigns });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setRunDependencies({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load traces/campaigns",
        });
      }
    }

    void loadDependencies();
    return () => {
      cancelled = true;
    };
  }, [canRunCampaigns]);

  const records =
    state.status === "ready"
      ? [...state.records].sort((left, right) => {
          if (right.coverage_score !== left.coverage_score) {
            return right.coverage_score - left.coverage_score;
          }
          if (left.is_system !== right.is_system) {
            return left.is_system ? -1 : 1;
          }
          return left.name.localeCompare(right.name);
        })
      : [];

  useEffect(() => {
    if (records.length === 0) {
      setSelectedMutationPackId("");
      return;
    }
    setSelectedMutationPackId((previous) => {
      if (previous && records.some((record) => record.mutation_pack_id === previous)) {
        return previous;
      }
      return records[0].mutation_pack_id;
    });
  }, [records]);

  useEffect(() => {
    if (runDependencies.status !== "ready") {
      return;
    }

    setSelectedTraceId((previous) => {
      if (previous && runDependencies.traces.some((trace) => trace.trace_id === previous)) {
        return previous;
      }
      return runDependencies.traces[0]?.trace_id ?? "";
    });

    setSelectedCampaignId((previous) => {
      if (
        previous &&
        runDependencies.campaigns.some((campaign) => campaign.campaign_id === previous)
      ) {
        return previous;
      }
      return runDependencies.campaigns[0]?.campaign_id ?? "";
    });
  }, [runDependencies]);

  async function onRunMutationPack(packIdOverride?: string) {
    const mutationPackId = (packIdOverride ?? selectedMutationPackId).trim();
    if (!mutationPackId) {
      setRunState({ status: "error", message: "Select a mutation pack before running." });
      return;
    }

    if (runDependencies.status !== "ready") {
      setRunState({
        status: "error",
        message: "Trace and campaign options are still loading. Try again in a moment.",
      });
      return;
    }

    if (!selectedTraceId || !selectedCampaignId) {
      setRunState({
        status: "error",
        message: "Select both a trace and a campaign before running.",
      });
      return;
    }

    setSelectedMutationPackId(mutationPackId);
    setRunState({ status: "running" });

    try {
      const run = await api.createRun({
        trace_id: selectedTraceId,
        campaign_id: selectedCampaignId,
        mutation_pack_id: mutationPackId,
      });
      setRunState({ status: "success", runId: run.run_id });
    } catch (error) {
      setRunState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create run",
      });
    }
  }

  const runControlsDisabled =
    runState.status === "running" ||
    runDependencies.status !== "ready" ||
    runDependencies.traces.length === 0 ||
    runDependencies.campaigns.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mutation Packs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review seeded and custom mutation templates without mixing creation into the catalog.
          </p>
        </div>
        {canManageMutationPacks ? (
          <Button asChild>
            <Link href="/mutation-packs/new">Create Mutation Pack</Link>
          </Button>
        ) : null}
      </div>

      {!canManageMutationPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Custom mutation packs follow workspace membership rules. Your current membership can
            view packs but cannot create or modify them.
          </CardContent>
        </Card>
      ) : null}

      {canRunCampaigns ? (
        <Card>
          <CardHeader>
            <CardTitle>Run Mutation Pack</CardTitle>
            <CardDescription>
              One-click execution using the selected trace and campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {runDependencies.status === "loading" ? (
              <Skeleton className="h-28 w-full" />
            ) : runDependencies.status === "error" ? (
              <p className="text-sm text-rose-200">{runDependencies.message}</p>
            ) : runDependencies.status === "ready" ? (
              runDependencies.traces.length === 0 || runDependencies.campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one trace and one campaign before running mutation packs.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Mutation Pack</span>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={selectedMutationPackId}
                        onChange={(event) => setSelectedMutationPackId(event.target.value)}
                        disabled={runState.status === "running"}
                      >
                        {records.map((record) => (
                          <option key={record.mutation_pack_id} value={record.mutation_pack_id}>
                            {record.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Campaign</span>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={selectedCampaignId}
                        onChange={(event) => setSelectedCampaignId(event.target.value)}
                        disabled={runState.status === "running"}
                      >
                        {runDependencies.campaigns.map((campaign) => (
                          <option key={campaign.campaign_id} value={campaign.campaign_id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Trace</span>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={selectedTraceId}
                        onChange={(event) => setSelectedTraceId(event.target.value)}
                        disabled={runState.status === "running"}
                      >
                        {runDependencies.traces.map((trace) => (
                          <option key={trace.trace_id} value={trace.trace_id}>
                            {trace.task_name?.trim() || shortId(trace.trace_id, 12)} ·{" "}
                            {formatRelativeDate(trace.created_at)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => void onRunMutationPack()}
                      disabled={runControlsDisabled}
                    >
                      {runState.status === "running" ? "Starting run..." : "Run Selected Pack"}
                    </Button>
                    {runState.status === "error" ? (
                      <p className="text-sm text-rose-200">{runState.message}</p>
                    ) : null}
                    {runState.status === "success" ? (
                      <p className="text-sm text-emerald-300">
                        Run started.{" "}
                        <Link
                          href={`/runs/${runState.runId}`}
                          className="underline underline-offset-4"
                        >
                          Open run
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </>
              )
            ) : null}
          </CardContent>
        </Card>
      ) : authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            This membership can view mutation packs but cannot start campaign runs.
          </CardContent>
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Mutation Packs</CardTitle>
            <CardDescription>{state.records.length} pack(s) in current project scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Mutations</TableHead>
                  <TableHead>Pack ID</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No mutation packs found for this project.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const listValue = record.config?.mutations;
                    const mutationCount = Array.isArray(listValue) ? listValue.length : 0;
                    return (
                      <TableRow key={record.mutation_pack_id}>
                        <TableCell className="font-medium text-foreground">{record.name}</TableCell>
                        <TableCell>
                          <Badge variant={record.is_system ? "warning" : "default"}>
                            {record.is_system ? "System" : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.coverage_score < 40 ? "default" : "warning"}>
                            {record.coverage_score}%
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">
                          {record.description || "--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mutationCount > 0 ? "warning" : "default"}>
                            {mutationCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            {shortId(record.mutation_pack_id, 14)}
                            <CopyIdButton id={record.mutation_pack_id} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatRelativeDate(record.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canRunCampaigns ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={runControlsDisabled}
                                onClick={() => void onRunMutationPack(record.mutation_pack_id)}
                              >
                                Run Now
                              </Button>
                            ) : null}
                            {canManageMutationPacks && !record.is_system ? (
                              <>
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/mutation-packs/${record.mutation_pack_id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-400 hover:text-rose-300"
                                  disabled={deleteState.status === "deleting" && deleteState.id === record.mutation_pack_id}
                                  onClick={() => void onDeletePack(record.mutation_pack_id, record.name)}
                                >
                                  {deleteState.status === "deleting" && deleteState.id === record.mutation_pack_id
                                    ? "Deleting..."
                                    : "Delete"}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {deleteState.status === "error" ? (
        <div className="rounded-md border border-rose-900/60 bg-rose-950/30 px-4 py-3">
          <p className="text-sm text-rose-200">{deleteState.message}</p>
        </div>
      ) : null}
    </div>
  );
}

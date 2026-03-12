"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { api, type CampaignMetadata, type MutationPackMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; campaigns: CampaignMetadata[] };

export function CampaignsView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [mutationPacks, setMutationPacks] = useState<MutationPackMetadata[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mutationPackId, setMutationPackId] = useState("");
  const [attemptsCount, setAttemptsCount] = useState(50);
  const recommendedSystemPackNames = useMemo(
    () =>
      new Set([
        "sepurux.max_chaos",
        "sepurux.core.reliability",
        "core.reliability",
        "prompt.injection",
        "core.latency",
      ]),
    []
  );

  const sortPacksForDisplay = (records: MutationPackMetadata[]) =>
    [...records].sort((left, right) => {
      if (right.coverage_score !== left.coverage_score) {
        return right.coverage_score - left.coverage_score;
      }
      if (left.is_system !== right.is_system) {
        return left.is_system ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

  async function load() {
    setState({ status: "loading" });
    const [campaignsResult, mutationPacksResult] = await Promise.allSettled([
      api.listCampaigns({ limit: 200, offset: 0 }),
      api.listMutationPacks({ include_system: true }),
    ]);

    if (campaignsResult.status === "fulfilled") {
      setState({ status: "ready", campaigns: campaignsResult.value });
    } else {
      setState({
        status: "error",
        message:
          campaignsResult.reason instanceof Error
            ? campaignsResult.reason.message
            : "Failed to load campaigns",
      });
    }

    if (mutationPacksResult.status === "fulfilled") {
      setMutationPacks(mutationPacksResult.value);
    } else {
      setMutationPacks(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedMutationPack = useMemo(() => {
    if (!mutationPackId || !mutationPacks) {
      return null;
    }
    return mutationPacks.find((record) => record.mutation_pack_id === mutationPackId) ?? null;
  }, [mutationPacks, mutationPackId]);

  const recommendedMutationPacks = useMemo(() => {
    if (!mutationPacks) {
      return [];
    }
    return sortPacksForDisplay(
      mutationPacks.filter(
        (record) => record.is_system && recommendedSystemPackNames.has(record.name)
      )
    );
  }, [mutationPacks, recommendedSystemPackNames]);

  const advancedMutationPacks = useMemo(() => {
    if (!mutationPacks) {
      return [];
    }
    return sortPacksForDisplay(
      mutationPacks.filter(
        (record) =>
          !record.is_system || !recommendedSystemPackNames.has(record.name)
      )
    );
  }, [mutationPacks, recommendedSystemPackNames]);

  const selectedPackWarning =
    selectedMutationPack && selectedMutationPack.coverage_score < 40
      ? "This mutation pack may not detect realistic failures."
      : null;

  async function onCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const mutationsFromPackRaw = selectedMutationPack?.config?.mutations;
      const mutationsFromPack = Array.isArray(mutationsFromPackRaw)
        ? mutationsFromPackRaw
        : [];
      const fallbackMutationSet = [
        {
          mutation_id: "baseline",
          tool: "jira.create_issue",
          args: { title: "Generated campaign" },
        },
      ];

      await api.createCampaign({
        name,
        mutation_pack_id: mutationPackId || null,
        mutation_set: mutationsFromPack.length > 0 ? mutationsFromPack : fallbackMutationSet,
        eval_set: {
          checks: ["status"],
          attempts_count: attemptsCount,
        },
      });

      setModalOpen(false);
      setName("");
      setMutationPackId("");
      setAttemptsCount(50);
      await load();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage evaluation campaign definitions.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create Campaign</Button>
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
            <CardTitle>Campaign Catalog</CardTitle>
            <CardDescription>{state.campaigns.length} campaign(s) in current project scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mutation Pack</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No campaigns yet - create one to start runs.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.campaigns.map((campaign) => (
                    <TableRow key={campaign.campaign_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground" title={campaign.campaign_id}>
                        {shortId(campaign.campaign_id, 16)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{campaign.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {campaign.mutation_pack_id ? shortId(campaign.mutation_pack_id, 16) : "--"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(campaign.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create Campaign</CardTitle>
              <CardDescription>
                Minimal setup for a new campaign in this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onCreateCampaign}>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Regression Campaign"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>

                {mutationPacks ? (
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">Mutation Pack</span>
                    <select
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                      value={mutationPackId}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setMutationPackId(nextValue);
                        const record = mutationPacks.find(
                          (item) => item.mutation_pack_id === nextValue
                        );
                        const suggestedAttempts = record?.config?.suggested_attempts;
                        if (typeof suggestedAttempts === "number" && Number.isFinite(suggestedAttempts)) {
                          setAttemptsCount(Math.max(1, Math.trunc(suggestedAttempts)));
                        }
                      }}
                    >
                      <option value="">None</option>
                      {recommendedMutationPacks.length > 0 ? (
                        <optgroup label="Recommended">
                          {recommendedMutationPacks.map((record) => (
                            <option key={record.mutation_pack_id} value={record.mutation_pack_id}>
                              {record.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {advancedMutationPacks.length > 0 ? (
                        <optgroup label="Advanced">
                          {advancedMutationPacks.map((record) => (
                            <option key={record.mutation_pack_id} value={record.mutation_pack_id}>
                              {record.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </label>
                ) : null}

                {selectedMutationPack ? (
                  <div className="rounded-md border border-border/70 bg-background/70 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Coverage Score</span>
                      <Badge
                        variant={selectedMutationPack.coverage_score < 40 ? "default" : "warning"}
                      >
                        {selectedMutationPack.coverage_score}%
                      </Badge>
                    </div>
                    {selectedPackWarning ? (
                      <p className="mt-2 text-xs text-amber-300">{selectedPackWarning}</p>
                    ) : null}
                  </div>
                ) : null}

                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Attempts Count</span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={attemptsCount}
                    onChange={(event) => setAttemptsCount(Number(event.target.value || 50))}
                  />
                </label>

                {createError ? (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
                    {createError}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

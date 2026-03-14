"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type MutationPackMetadata } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const BASELINE_MUTATION_SET = [
  {
    mutation_id: "baseline",
    tool: "jira.create_issue",
    args: { title: "Generated campaign" },
  },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; mutationPacks: MutationPackMetadata[] };

export function CampaignCreateView() {
  const authSession = useAuthSession();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mutationPackId, setMutationPackId] = useState("");
  const [attemptsCount, setAttemptsCount] = useState(50);

  const canCreateCampaigns = authSession?.permissions.can_create_campaigns ?? false;
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const mutationPacks = await api.listMutationPacks({ include_system: true });
        if (cancelled) {
          return;
        }
        setState({ status: "ready", mutationPacks });
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

  const mutationPacks = state.status === "ready" ? state.mutationPacks : [];
  const selectedMutationPack = mutationPacks.find(
    (record) => record.mutation_pack_id === mutationPackId
  );
  const recommendedMutationPacks = sortPacksForDisplay(
    mutationPacks.filter(
      (record) => record.is_system && recommendedSystemPackNames.has(record.name)
    )
  );
  const advancedMutationPacks = sortPacksForDisplay(
    mutationPacks.filter(
      (record) => !record.is_system || !recommendedSystemPackNames.has(record.name)
    )
  );
  const selectedPackWarning =
    selectedMutationPack && selectedMutationPack.coverage_score < 40
      ? "This mutation pack may not detect realistic failures."
      : null;

  async function onCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      await api.createCampaign({
        name,
        mutation_pack_id: mutationPackId || null,
        mutation_set: BASELINE_MUTATION_SET,
        eval_set: {
          checks: ["status"],
          attempts_count: attemptsCount,
        },
      });
      router.push("/campaigns");
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new campaign from a baseline replay and an optional mutation pack.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/campaigns">View Campaigns</Link>
        </Button>
      </div>

      {!canCreateCampaigns && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Campaign creation follows your workspace membership bundle. This membership can review campaigns but cannot create new ones.
          </CardContent>
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-[520px] w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : !canCreateCampaigns ? null : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Setup</CardTitle>
            <CardDescription>
              Separate creation from the catalog so campaign configuration stays focused.
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
                  disabled={creating}
                />
              </label>

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
                  disabled={creating}
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
                  disabled={creating}
                />
              </label>

              {createError ? (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
                  {createError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/campaigns">Cancel</Link>
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

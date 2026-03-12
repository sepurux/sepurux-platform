"use client";

import { FormEvent, useEffect, useState } from "react";

import { api, type MutationPackMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
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

const DEFAULT_MUTATION_PACK_CONFIG = JSON.stringify(
  {
    version: "0.1",
    suggested_attempts: 25,
    max_mutations_per_attempt: 1,
    mutations: [
      {
        mutation_id: "timeout-jira",
        type: "fault.timeout",
        target: { tool: "jira.*" },
        params: { prob: 0.3, timeout_ms: 3000 },
        probability: 1,
        weight: 1,
      },
    ],
  },
  null,
  2
);

export function MutationPacksView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configText, setConfigText] = useState(DEFAULT_MUTATION_PACK_CONFIG);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);

  const canManageMutationPacks =
    authSession?.permissions.can_manage_mutation_packs ?? false;

  async function load() {
    try {
      const records = await api.listMutationPacks();
      setState({ status: "ready", records });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load mutation packs",
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await api.listMutationPacks();
        if (cancelled) return;
        setState({ status: "ready", records });
      } catch (error) {
        if (cancelled) return;
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

  async function onCreateMutationPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateWarning(null);
    setCreating(true);

    try {
      const parsedConfig = JSON.parse(configText) as Record<string, unknown>;
      const response = await api.createMutationPack({
        name,
        description: description.trim() || null,
        config: parsedConfig,
      });
      setCreateWarning(response.warning || null);
      setName("");
      setDescription("");
      await load();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setCreateError("Mutation pack config must be valid JSON");
      } else {
        setCreateError(
          error instanceof Error ? error.message : "Failed to create mutation pack"
        );
      }
    } finally {
      setCreating(false);
    }
  }

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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mutation Packs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seeded chaos/fuzzing mutation templates scoped to the current project.
        </p>
      </div>

      {canManageMutationPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Mutation Pack</CardTitle>
            <CardDescription>
              Custom packs are allowed for developer and admin memberships in this workspace plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreateMutationPack}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="payments.resilience"
                  required
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Timeouts and schema drift for payments flows"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Config JSON</span>
                <textarea
                  className="min-h-[280px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                  value={configText}
                  onChange={(event) => setConfigText(event.target.value)}
                  spellCheck={false}
                  required
                />
              </label>
              {createError ? (
                <p className="text-sm text-rose-200">{createError}</p>
              ) : null}
              {createWarning ? (
                <p className="text-sm text-amber-200">{createWarning}</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Mutation Pack"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Custom mutation packs follow workspace membership rules. Your current membership can view packs but cannot create or modify them.
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                          {shortId(record.mutation_pack_id, 14)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatRelativeDate(record.created_at)}
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
    </div>
  );
}

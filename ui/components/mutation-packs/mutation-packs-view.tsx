"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  api,
  type MutationPackMetadata,
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

type ArchiveState =
  | { status: "idle" }
  | { status: "confirming"; id: string; name: string }
  | { status: "archiving"; id: string }
  | { status: "error"; message: string };

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

  const [archiveState, setArchiveState] = useState<ArchiveState>({ status: "idle" });

  const canManageMutationPacks = authSession?.permissions.can_manage_mutation_packs ?? false;

  async function onArchivePack(packId: string) {
    setArchiveState({ status: "archiving", id: packId });
    try {
      await api.deleteMutationPack(packId);
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", records: prev.records.filter((r) => r.mutation_pack_id !== packId) }
          : prev
      );
      setArchiveState({ status: "idle" });
    } catch (error) {
      setArchiveState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to archive mutation pack",
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
                            {canManageMutationPacks && !record.is_system ? (
                              <>
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/mutation-packs/${record.mutation_pack_id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                                {archiveState.status === "confirming" && archiveState.id === record.mutation_pack_id ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="text-xs text-amber-300">Archive?</span>
                                    <Button
                                      type="button"
                                      variant="danger"
                                      size="sm"
                                      disabled={false}
                                      onClick={() => void onArchivePack(record.mutation_pack_id)}
                                    >
                                      Archive
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setArchiveState({ status: "idle" })}
                                    >
                                      Cancel
                                    </Button>
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={archiveState.status === "archiving" && archiveState.id === record.mutation_pack_id}
                                    onClick={() => setArchiveState({ status: "confirming", id: record.mutation_pack_id, name: record.name })}
                                  >
                                    Archive
                                  </Button>
                                )}
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

      {archiveState.status === "error" ? (
        <div className="rounded-md border border-rose-900/60 bg-rose-950/30 px-4 py-3">
          <p className="text-sm text-rose-200">{archiveState.message}</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type PolicyPackMetadata } from "@/lib/api";
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
  | { status: "ready"; records: PolicyPackMetadata[] };

export function PolicyPacksView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archivingPolicyPackId, setArchivingPolicyPackId] = useState<string | null>(null);
  const [confirmArchivePolicyId, setConfirmArchivePolicyId] = useState<string | null>(null);

  const canManagePolicyPacks =
    authSession?.permissions.can_manage_policy_packs ?? false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await api.listPolicyPacks();
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
          message: error instanceof Error ? error.message : "Failed to load policy packs",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onArchivePolicyPack(policyPackId: string) {
    setArchiveError(null);
    setConfirmArchivePolicyId(null);
    setArchivingPolicyPackId(policyPackId);
    try {
      await api.deletePolicyPack(policyPackId);
      setState((currentState) => {
        if (currentState.status !== "ready") {
          return currentState;
        }
        return {
          status: "ready",
          records: currentState.records.filter((record) => record.policy_pack_id !== policyPackId),
        };
      });
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Failed to archive policy pack");
    } finally {
      setArchivingPolicyPackId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Guardrails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Allow, deny, and approval rules for this project.
          </p>
        </div>
        {canManagePolicyPacks ? (
          <Button asChild>
            <Link href="/policies/new">New guardrail</Link>
          </Button>
        ) : null}
      </div>

      {!canManagePolicyPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Guardrails follow workspace membership. Your current membership can view them but cannot create or change them.
          </CardContent>
        </Card>
      ) : null}

      {archiveError ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{archiveError}</CardContent>
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
            <CardTitle>Guardrails</CardTitle>
            <CardDescription>{state.records.length} guardrail{state.records.length === 1 ? "" : "s"} in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Engine</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Unknown Tools</TableHead>
                  <TableHead>Irreversible Tools</TableHead>
                  <TableHead>Rule ID</TableHead>
                  {canManagePolicyPacks ? <TableHead className="text-right">Actions</TableHead> : null}
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManagePolicyPacks ? 8 : 7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No guardrails configured for this project.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.records.map((record) => {
                    const defaults = record.policy?.defaults as
                      | { unknown_tools?: string }
                      | undefined;
                    const unknownTools = defaults?.unknown_tools ?? "allow";
                    const irreversibleObj = record.policy?.irreversible as
                      | { tools?: unknown }
                      | undefined;
                    const irreversibleTools = Array.isArray(irreversibleObj?.tools)
                      ? irreversibleObj.tools
                      : Array.isArray(record.policy?.irreversible_tools)
                        ? record.policy.irreversible_tools
                        : [];
                    return (
                      <TableRow key={record.policy_pack_id}>
                        <TableCell className="font-medium text-foreground">
                          <Link
                            href={`/policies/${record.policy_pack_id}`}
                            className="hover:text-primary"
                          >
                            {record.name}
                          </Link>
                        </TableCell>
                        <TableCell>{record.engine}</TableCell>
                        <TableCell>
                          {typeof record.active_version_number === "number" ? (
                            <Badge variant="default">v{record.active_version_number}</Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={unknownTools === "deny" ? "danger" : "default"}>
                            {unknownTools}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{irreversibleTools.length}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shortId(record.policy_pack_id, 14)}
                        </TableCell>
                        {canManagePolicyPacks ? (
                          <TableCell className="text-right">
                            {confirmArchivePolicyId === record.policy_pack_id ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-xs text-amber-300">Archive?</span>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={archivingPolicyPackId === record.policy_pack_id}
                                  onClick={() => void onArchivePolicyPack(record.policy_pack_id)}
                                >
                                  {archivingPolicyPackId === record.policy_pack_id ? "Archiving..." : "Archive"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmArchivePolicyId(null)}
                                >
                                  Cancel
                                </Button>
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmArchivePolicyId(record.policy_pack_id)}
                                disabled={archivingPolicyPackId === record.policy_pack_id}
                              >
                                Archive
                              </Button>
                            )}
                          </TableCell>
                        ) : null}
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

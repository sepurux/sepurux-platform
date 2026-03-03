"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type PolicyPackMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: PolicyPackMetadata[] };

export function PolicyPacksView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const records = await api.listPolicyPacks();
        if (cancelled) return;
        setState({ status: "ready", records });
      } catch (error) {
        if (cancelled) return;
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Policy Packs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project-scoped allow/deny/approval rules enforced during replay.
        </p>
      </div>

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
            <CardTitle>Policy Packs</CardTitle>
            <CardDescription>{state.records.length} pack(s) in current project scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Engine</TableHead>
                  <TableHead>Unknown Tools</TableHead>
                  <TableHead>Irreversible Tools</TableHead>
                  <TableHead>Pack ID</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No policy packs found for this project.
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
                            className="hover:text-cyan-200"
                          >
                            {record.name}
                          </Link>
                        </TableCell>
                        <TableCell>{record.engine}</TableCell>
                        <TableCell>
                          <Badge variant={unknownTools === "deny" ? "danger" : "default"}>
                            {unknownTools}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{irreversibleTools.length}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shortId(record.policy_pack_id, 14)}
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

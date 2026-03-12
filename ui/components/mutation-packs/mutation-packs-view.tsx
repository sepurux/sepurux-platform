"use client";

import { useEffect, useState } from "react";

import { api, type MutationPackMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: MutationPackMetadata[] };

export function MutationPacksView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

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

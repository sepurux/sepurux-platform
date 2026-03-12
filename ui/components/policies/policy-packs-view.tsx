"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

const DEFAULT_POLICY_JSON = JSON.stringify(
  {
    version: "0.1",
    defaults: { unknown_tools: "allow" },
    irreversible: {
      tools: ["payments.refund", "jira.create_issue(commit)"],
    },
    approval: { token_field: "confirmation_token" },
  },
  null,
  2
);

export function PolicyPacksView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"builtin" | "opa">("builtin");
  const [policyText, setPolicyText] = useState(DEFAULT_POLICY_JSON);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canManagePolicyPacks =
    authSession?.permissions.can_manage_policy_packs ?? false;

  async function load() {
    try {
      const records = await api.listPolicyPacks();
      setState({ status: "ready", records });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load policy packs",
      });
    }
  }

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

  async function onCreatePolicyPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const parsedPolicy = JSON.parse(policyText) as Record<string, unknown>;
      await api.createPolicyPack({
        name,
        engine,
        policy: parsedPolicy,
      });
      setName("");
      await load();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setCreateError("Policy JSON must be valid JSON");
      } else {
        setCreateError(
          error instanceof Error ? error.message : "Failed to create policy pack"
        );
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Policy Packs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project-scoped allow/deny/approval rules enforced during replay.
        </p>
      </div>

      {canManagePolicyPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Policy Pack</CardTitle>
            <CardDescription>
              Policy changes are restricted to admin memberships on plans with policy support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreatePolicyPack}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Strict approvals"
                  required
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Engine</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={engine}
                  onChange={(event) =>
                    setEngine(event.target.value === "opa" ? "opa" : "builtin")
                  }
                >
                  <option value="builtin">builtin</option>
                  <option value="opa">opa</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Policy JSON</span>
                <textarea
                  className="min-h-[260px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                  value={policyText}
                  onChange={(event) => setPolicyText(event.target.value)}
                  spellCheck={false}
                  required
                />
              </label>
              {createError ? (
                <p className="text-sm text-rose-200">{createError}</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Policy Pack"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Policy packs follow workspace membership and plan access. Your current membership can review policy packs but cannot create or change them.
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
            <CardTitle>Policy Packs</CardTitle>
            <CardDescription>{state.records.length} pack(s) in current project scope.</CardDescription>
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
                  <TableHead>Pack ID</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                            className="hover:text-blue-200"
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

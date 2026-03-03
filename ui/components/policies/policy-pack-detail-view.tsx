"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import { api, type PolicyPackMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: PolicyPackMetadata };

export function PolicyPackDetailView({ policyPackId }: { policyPackId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  async function load() {
    setState({ status: "loading" });
    try {
      const record = await api.getPolicyPack(policyPackId);
      setState({ status: "ready", record });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load policy pack",
      });
    }
  }

  useEffect(() => {
    void load();
  }, [policyPackId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/policies"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Policies
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Policy Pack {shortId(policyPackId, 14)}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
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
        <PolicyPackPanels record={state.record} />
      )}
    </div>
  );
}

function PolicyPackPanels({ record }: { record: PolicyPackMetadata }) {
  const defaults = record.policy?.defaults as { unknown_tools?: string } | undefined;
  const unknownTools = defaults?.unknown_tools ?? "allow";
  const approval = record.policy?.approval as { token_field?: string } | undefined;
  const tokenField = approval?.token_field ?? "confirmation_token";
  const opa = record.policy?.opa as { package?: string; query?: string } | undefined;
  const irreversibleObj = record.policy?.irreversible as { tools?: unknown } | undefined;
  const irreversibleTools = Array.isArray(irreversibleObj?.tools)
    ? irreversibleObj.tools.filter((tool): tool is string => typeof tool === "string")
    : Array.isArray(record.policy?.irreversible_tools)
      ? record.policy.irreversible_tools.filter((tool): tool is string => typeof tool === "string")
      : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{record.name}</CardTitle>
          <CardDescription>{formatRelativeDate(record.created_at)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetadataRow label="Policy Pack ID" value={record.policy_pack_id} mono />
          <MetadataRow label="Project ID" value={record.project_id} mono />
          <MetadataRow label="Engine" value={record.engine} />
          <MetadataRow
            label="Unknown Tools"
            value={
              <Badge variant={unknownTools === "deny" ? "danger" : "default"}>{unknownTools}</Badge>
            }
          />
          <MetadataRow label="Approval Token Field" value={tokenField} />
          <MetadataRow label="OPA Package" value={opa?.package ?? "--"} />
          <MetadataRow label="OPA Query" value={opa?.query ?? "--"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Irreversible Tools</CardTitle>
          <CardDescription>Tool calls requiring confirmation before execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {irreversibleTools.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No irreversible tools configured.
            </div>
          ) : (
            irreversibleTools.map((tool) => (
              <div
                key={tool}
                className="rounded-md border border-border/60 bg-muted/15 px-3 py-2 font-mono text-xs text-foreground"
              >
                {tool}
              </div>
            ))
          )}

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Policy JSON</p>
            <pre className="max-h-[420px] overflow-auto rounded-md border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
              <code>{JSON.stringify(record.policy ?? {}, null, 2)}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 sm:grid-cols-[180px_1fr] sm:items-center">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-foreground break-all" : "text-sm text-foreground"}>
        {value}
      </span>
    </div>
  );
}

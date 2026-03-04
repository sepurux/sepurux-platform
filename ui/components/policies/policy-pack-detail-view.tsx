"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import {
  api,
  type PolicyPackMetadata,
  type PolicyPackVersionMetadata,
} from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      record: PolicyPackMetadata;
      versions: PolicyPackVersionMetadata[];
    };

export function PolicyPackDetailView({
  policyPackId,
}: {
  policyPackId: string;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);
  const [diffFromVersionId, setDiffFromVersionId] = useState<string>("");
  const [diffToVersionId, setDiffToVersionId] = useState<string>("");

  async function load() {
    setState({ status: "loading" });
    try {
      const [record, versions] = await Promise.all([
        api.getPolicyPack(policyPackId),
        api.listPolicyPackVersions(policyPackId),
      ]);
      setState({ status: "ready", record, versions });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to load policy pack",
      });
    }
  }

  useEffect(() => {
    void load();
  }, [policyPackId]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }
    if (state.versions.length === 0) {
      setDiffFromVersionId("");
      setDiffToVersionId("");
      return;
    }

    const currentTo = state.versions.find(
      (version) => version.version_id === diffToVersionId
    );
    const currentFrom = state.versions.find(
      (version) => version.version_id === diffFromVersionId
    );
    if (currentTo && currentFrom) {
      return;
    }

    const [latest, previous] = state.versions;
    setDiffToVersionId(latest.version_id);
    setDiffFromVersionId((previous ?? latest).version_id);
  }, [state, diffFromVersionId, diffToVersionId]);

  async function onRollback(versionNumber: number) {
    const confirmed = window.confirm(
      `Rollback active policy to version v${versionNumber}?`
    );
    if (!confirmed) {
      return;
    }
    try {
      setRollingBackVersion(versionNumber);
      await api.rollbackPolicyPack(policyPackId, { version_number: versionNumber });
      await load();
    } finally {
      setRollingBackVersion(null);
    }
  }

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
          <CardContent className="p-5 text-sm text-rose-100">
            {state.message}
          </CardContent>
        </Card>
      ) : (
        <PolicyPackPanels
          record={state.record}
          versions={state.versions}
          diffFromVersionId={diffFromVersionId}
          diffToVersionId={diffToVersionId}
          onChangeDiffFrom={setDiffFromVersionId}
          onChangeDiffTo={setDiffToVersionId}
          onRollback={onRollback}
          rollingBackVersion={rollingBackVersion}
        />
      )}
    </div>
  );
}

function PolicyPackPanels({
  record,
  versions,
  diffFromVersionId,
  diffToVersionId,
  onChangeDiffFrom,
  onChangeDiffTo,
  onRollback,
  rollingBackVersion,
}: {
  record: PolicyPackMetadata;
  versions: PolicyPackVersionMetadata[];
  diffFromVersionId: string;
  diffToVersionId: string;
  onChangeDiffFrom: (value: string) => void;
  onChangeDiffTo: (value: string) => void;
  onRollback: (versionNumber: number) => void;
  rollingBackVersion: number | null;
}) {
  const defaults = record.policy?.defaults as { unknown_tools?: string } | undefined;
  const unknownTools = defaults?.unknown_tools ?? "allow";
  const approval = record.policy?.approval as { token_field?: string } | undefined;
  const tokenField = approval?.token_field ?? "confirmation_token";
  const opa = record.policy?.opa as { package?: string; query?: string } | undefined;
  const irreversibleObj = record.policy?.irreversible as { tools?: unknown } | undefined;
  const irreversibleTools = Array.isArray(irreversibleObj?.tools)
    ? irreversibleObj.tools.filter((tool): tool is string => typeof tool === "string")
    : Array.isArray(record.policy?.irreversible_tools)
    ? record.policy.irreversible_tools.filter(
        (tool): tool is string => typeof tool === "string"
      )
    : [];

  const fromVersion = versions.find(
    (version) => version.version_id === diffFromVersionId
  );
  const toVersion = versions.find((version) => version.version_id === diffToVersionId);
  const diffRows = useMemo(() => {
    if (!fromVersion || !toVersion) {
      return [];
    }
    return computeJsonDiffRows(fromVersion.policy, toVersion.policy);
  }, [fromVersion, toVersion]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {record.name}
              {typeof record.active_version_number === "number" ? (
                <Badge variant="default">Active v{record.active_version_number}</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>{formatRelativeDate(record.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetadataRow label="Policy Pack ID" value={record.policy_pack_id} mono />
            <MetadataRow label="Project ID" value={record.project_id} mono />
            <MetadataRow label="Engine" value={record.engine} />
            <MetadataRow
              label="Unknown Tools"
              value={
                <Badge variant={unknownTools === "deny" ? "danger" : "default"}>
                  {unknownTools}
                </Badge>
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
            <CardDescription>
              Tool calls requiring confirmation before execution.
            </CardDescription>
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
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Active Policy JSON
              </p>
              <pre className="max-h-[420px] overflow-auto rounded-md border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
                <code>{JSON.stringify(record.policy ?? {}, null, 2)}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Versions</CardTitle>
          <CardDescription>
            Roll back to a prior version without redeploying worker code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No versions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((version) => (
                  <TableRow key={version.version_id}>
                    <TableCell className="font-medium text-foreground">
                      v{version.version_number}
                    </TableCell>
                    <TableCell>
                      {version.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Historical</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(version.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {version.created_by || "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={version.is_active || rollingBackVersion === version.version_number}
                        onClick={() => onRollback(version.version_number)}
                      >
                        {rollingBackVersion === version.version_number
                          ? "Rolling back..."
                          : "Rollback"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version Diff</CardTitle>
          <CardDescription>Compare any two policy versions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-muted-foreground">
              <span>From</span>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-foreground"
                value={diffFromVersionId}
                onChange={(event) => onChangeDiffFrom(event.target.value)}
              >
                {versions.map((version) => (
                  <option key={`from-${version.version_id}`} value={version.version_id}>
                    v{version.version_number}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-muted-foreground">
              <span>To</span>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-foreground"
                value={diffToVersionId}
                onChange={(event) => onChangeDiffTo(event.target.value)}
              >
                {versions.map((version) => (
                  <option key={`to-${version.version_id}`} value={version.version_id}>
                    v{version.version_number}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {diffRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
              No differences detected between selected versions.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffRows.map((row) => (
                    <TableRow key={row.path}>
                      <TableCell className="font-mono text-xs text-foreground">
                        {row.path}
                      </TableCell>
                      <TableCell
                        className={
                          row.kind === "added"
                            ? "text-muted-foreground"
                            : "font-mono text-xs text-rose-200"
                        }
                      >
                        {row.before ?? "--"}
                      </TableCell>
                      <TableCell
                        className={
                          row.kind === "removed"
                            ? "text-muted-foreground"
                            : "font-mono text-xs text-emerald-200"
                        }
                      >
                        {row.after ?? "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type DiffRow = {
  path: string;
  before: string | null;
  after: string | null;
  kind: "changed" | "added" | "removed";
};

function computeJsonDiffRows(
  fromPolicy: Record<string, unknown>,
  toPolicy: Record<string, unknown>
): DiffRow[] {
  const fromMap = flattenJson(fromPolicy);
  const toMap = flattenJson(toPolicy);
  const allPaths = new Set([...fromMap.keys(), ...toMap.keys()]);

  const rows: DiffRow[] = [];
  for (const path of Array.from(allPaths).sort()) {
    const before = fromMap.get(path) ?? null;
    const after = toMap.get(path) ?? null;
    if (before === after) {
      continue;
    }
    if (before === null) {
      rows.push({ path, before: null, after, kind: "added" });
      continue;
    }
    if (after === null) {
      rows.push({ path, before, after: null, kind: "removed" });
      continue;
    }
    rows.push({ path, before, after, kind: "changed" });
  }

  return rows;
}

function flattenJson(
  value: unknown,
  prefix = ""
): Map<string, string> {
  const out = new Map<string, string>();

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    out.set(prefix || "$", JSON.stringify(value));
    return out;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.set(prefix || "$", "[]");
      return out;
    }
    value.forEach((item, index) => {
      const nested = flattenJson(item, `${prefix}[${index}]`);
      nested.forEach((nestedValue, nestedPath) => out.set(nestedPath, nestedValue));
    });
    return out;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      out.set(prefix || "$", "{}");
      return out;
    }
    for (const [key, nestedValue] of entries) {
      const nestedPrefix = prefix ? `${prefix}.${key}` : key;
      const nested = flattenJson(nestedValue, nestedPrefix);
      nested.forEach((itemValue, itemPath) => out.set(itemPath, itemValue));
    }
    return out;
  }

  out.set(prefix || "$", JSON.stringify(value));
  return out;
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
      <span
        className={
          mono
            ? "font-mono text-xs break-all text-foreground"
            : "text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

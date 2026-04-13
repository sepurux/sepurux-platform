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
import { useAuthSession } from "@/lib/use-auth-session";
import {
  PolicyPackBuilder,
  parsePolicyText,
  stringifyPolicyDocument,
  type PolicyEngine,
} from "@/components/policies/policy-pack-builder";
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
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);
  const [confirmRollbackVersion, setConfirmRollbackVersion] = useState<number | null>(
    null
  );
  const [diffFromVersionId, setDiffFromVersionId] = useState<string>("");
  const [diffToVersionId, setDiffToVersionId] = useState<string>("");
  const [nameDraft, setNameDraft] = useState("");
  const [engineDraft, setEngineDraft] = useState<PolicyEngine>("builtin");
  const [policyDraft, setPolicyDraft] = useState("{}");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canManagePolicyPacks =
    authSession?.permissions.can_manage_policy_packs ?? false;

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

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }
    setNameDraft(state.record.name);
    setEngineDraft(state.record.engine === "opa" ? "opa" : "builtin");
    setPolicyDraft(stringifyPolicyDocument(state.record.policy ?? {}));
  }, [state]);

  function onRequestRollback(versionNumber: number) {
    setConfirmRollbackVersion(versionNumber);
  }

  async function onConfirmRollback() {
    if (confirmRollbackVersion === null) {
      return;
    }
    const versionNumber = confirmRollbackVersion;
    try {
      setRollingBackVersion(versionNumber);
      await api.rollbackPolicyPack(policyPackId, { version_number: versionNumber });
      await load();
      setConfirmRollbackVersion(null);
    } finally {
      setRollingBackVersion(null);
    }
  }

  function onCancelRollback() {
    if (rollingBackVersion !== null) {
      return;
    }
    setConfirmRollbackVersion(null);
  }

  async function onSavePolicy() {
    if (state.status !== "ready") {
      return;
    }
    setSaveError(null);
    setSavingPolicy(true);
    try {
      const trimmedName = nameDraft.trim();
      if (!trimmedName) {
        setSaveError("Policy pack name is required");
        return;
      }
      const parsed = parsePolicyText(policyDraft);
      if (parsed.error || parsed.policy === null) {
        setSaveError(parsed.error ?? "Policy JSON must be valid JSON");
        return;
      }
      await api.updatePolicyPack(policyPackId, {
        name: trimmedName,
        engine: engineDraft,
        policy: parsed.policy,
      });
      await load();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update policy pack");
    } finally {
      setSavingPolicy(false);
    }
  }

  const pageTitle =
    state.status === "ready"
      ? state.record.name
      : `Policy Pack ${shortId(policyPackId, 14)}`;
  const pageMeta =
    state.status === "ready"
      ? `${shortId(policyPackId, 14)} · ${state.record.engine} · created ${formatRelativeDate(
          state.record.created_at
        )}`
      : shortId(policyPackId, 14);

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/policies"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Policies
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pageMeta}</p>
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
        <Card className="border-danger/20">
          <CardContent className="p-5 text-sm text-danger">
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
          onRequestRollback={onRequestRollback}
          rollingBackVersion={rollingBackVersion}
          canManagePolicyPacks={canManagePolicyPacks}
          nameDraft={nameDraft}
          onChangeNameDraft={setNameDraft}
          engineDraft={engineDraft}
          onChangeEngineDraft={setEngineDraft}
          policyDraft={policyDraft}
          onChangePolicyDraft={setPolicyDraft}
          onSavePolicy={onSavePolicy}
          savingPolicy={savingPolicy}
          saveError={saveError}
        />
      )}

      {confirmRollbackVersion !== null && canManagePolicyPacks ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65"
            onClick={onCancelRollback}
            aria-hidden="true"
          />
          <Card className="relative w-full max-w-md border-border/70 bg-background/95 shadow-2xl">
            <CardHeader>
              <CardTitle>Confirm Rollback</CardTitle>
              <CardDescription>
                Set active policy pack version to v{confirmRollbackVersion}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                New runs will use this version immediately. Existing runs keep their
                snapshotted version.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onCancelRollback}
                  disabled={rollingBackVersion !== null}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void onConfirmRollback()}
                  disabled={rollingBackVersion !== null}
                >
                  {rollingBackVersion !== null ? "Rolling back..." : "Confirm Rollback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
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
  onRequestRollback,
  rollingBackVersion,
  canManagePolicyPacks,
  nameDraft,
  onChangeNameDraft,
  engineDraft,
  onChangeEngineDraft,
  policyDraft,
  onChangePolicyDraft,
  onSavePolicy,
  savingPolicy,
  saveError,
}: {
  record: PolicyPackMetadata;
  versions: PolicyPackVersionMetadata[];
  diffFromVersionId: string;
  diffToVersionId: string;
  onChangeDiffFrom: (value: string) => void;
  onChangeDiffTo: (value: string) => void;
  onRequestRollback: (versionNumber: number) => void;
  rollingBackVersion: number | null;
  canManagePolicyPacks: boolean;
  nameDraft: string;
  onChangeNameDraft: (value: string) => void;
  engineDraft: PolicyEngine;
  onChangeEngineDraft: (value: PolicyEngine) => void;
  policyDraft: string;
  onChangePolicyDraft: (value: string) => void;
  onSavePolicy: () => Promise<void>;
  savingPolicy: boolean;
  saveError: string | null;
}) {
  const defaults = record.policy?.defaults as { unknown_tools?: string } | undefined;
  const unknownTools = defaults?.unknown_tools ?? "allow";
  const approval = record.policy?.approval as { token_field?: string } | undefined;
  const tokenField = approval?.token_field ?? "confirmation_token";

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
      <Card>
        <CardHeader>
          <CardTitle>Pack Overview</CardTitle>
          <CardDescription>Active runtime metadata for this policy pack.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <OverviewTile
            label="Active Version"
            value={
              typeof record.active_version_number === "number" ? (
                <Badge variant="default">v{record.active_version_number}</Badge>
              ) : (
                "--"
              )
            }
          />
          <OverviewTile label="Engine" value={record.engine} />
          <OverviewTile
            label="Unknown Tools"
            value={
              <Badge variant={unknownTools === "deny" ? "danger" : "default"}>
                {unknownTools}
              </Badge>
            }
          />
          <OverviewTile label="Approval Token" value={tokenField} mono />
          <OverviewTile label="Pack ID" value={shortId(record.policy_pack_id, 18)} mono />
          <OverviewTile label="Project ID" value={shortId(record.project_id, 18)} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Policy</CardTitle>
          <CardDescription>
            Adjust the active rules and save a new version when you are done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PolicyPackBuilder
            name={nameDraft}
            onNameChange={onChangeNameDraft}
            engine={engineDraft}
            onEngineChange={onChangeEngineDraft}
            policyText={policyDraft}
            onPolicyTextChange={onChangePolicyDraft}
            editable={canManagePolicyPacks}
            disabled={savingPolicy}
          />
          {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
          {canManagePolicyPacks ? (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onSavePolicy()}
                disabled={savingPolicy}
              >
                {savingPolicy ? "Saving..." : "Save Policy Pack"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
                      {canManagePolicyPacks ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={version.is_active || rollingBackVersion === version.version_number}
                          onClick={() => onRequestRollback(version.version_number)}
                        >
                          {rollingBackVersion === version.version_number
                            ? "Rolling back..."
                            : "Rollback"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Admin only</span>
                      )}
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
                            : "font-mono text-xs text-danger"
                        }
                      >
                        {row.before ?? "--"}
                      </TableCell>
                      <TableCell
                        className={
                          row.kind === "removed"
                            ? "text-muted-foreground"
                            : "font-mono text-xs text-primary"
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

function OverviewTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span
        className={
          mono
            ? "mt-2 block font-mono text-xs break-all text-foreground"
            : "mt-2 block text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

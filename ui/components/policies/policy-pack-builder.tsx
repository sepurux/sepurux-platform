"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type PolicyEngine = "builtin" | "opa";

type PolicyDocument = Record<string, unknown>;

type BuilderFields = {
  version: string;
  unknownTools: "allow" | "deny";
  approvalTokenField: string;
  irreversibleTools: string[];
  opaPackage: string;
  opaQuery: string;
};

const DEFAULT_OPA_PACKAGE = "sepurux.policy";
const DEFAULT_OPA_QUERY = "data.sepurux.policy.allow";
const KNOWN_TOP_LEVEL_KEYS = new Set([
  "version",
  "defaults",
  "irreversible",
  "irreversible_tools",
  "approval",
  "opa",
]);

export const DEFAULT_POLICY_DOCUMENT: PolicyDocument = {
  version: "0.1",
  defaults: { unknown_tools: "allow" },
  irreversible: {
    tools: ["payments.refund", "jira.create_issue(commit)"],
  },
  approval: { token_field: "confirmation_token" },
};

export const DEFAULT_POLICY_JSON = stringifyPolicyDocument(DEFAULT_POLICY_DOCUMENT);

export function parsePolicyText(policyText: string): {
  error: string | null;
  policy: PolicyDocument | null;
} {
  try {
    const parsed = JSON.parse(policyText) as unknown;
    if (!isRecord(parsed)) {
      return {
        error: "Policy JSON must be a top-level object",
        policy: null,
      };
    }
    return { error: null, policy: parsed };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Policy JSON must be valid JSON",
      policy: null,
    };
  }
}

export function stringifyPolicyDocument(policy: PolicyDocument) {
  return JSON.stringify(policy, null, 2);
}

export function PolicyPackBuilder({
  name,
  onNameChange,
  engine,
  onEngineChange,
  policyText,
  onPolicyTextChange,
  editable = true,
  disabled = false,
}: {
  name?: string;
  onNameChange?: (value: string) => void;
  engine: PolicyEngine;
  onEngineChange: (value: PolicyEngine) => void;
  policyText: string;
  onPolicyTextChange: (value: string) => void;
  editable?: boolean;
  disabled?: boolean;
}) {
  const [pendingTool, setPendingTool] = useState("");
  const parsed = useMemo(() => parsePolicyText(policyText), [policyText]);
  const basePolicy = parsed.policy ?? DEFAULT_POLICY_DOCUMENT;
  const builderFields = useMemo(
    () => extractBuilderFields(basePolicy, engine),
    [basePolicy, engine]
  );
  const customKeys = useMemo(
    () => Object.keys(basePolicy).filter((key) => !KNOWN_TOP_LEVEL_KEYS.has(key)),
    [basePolicy]
  );
  const hasJsonError = parsed.error !== null;
  const controlsDisabled = disabled || !editable || hasJsonError;
  const unknownToolsCopy =
    builderFields.unknownTools === "deny"
      ? "Stop runs when an unclassified tool appears."
      : "Permit unclassified tools and only gate explicit irreversible calls.";

  function commitBuilder(nextFields: BuilderFields, nextEngine = engine) {
    const nextPolicy = buildPolicyDocument(basePolicy, nextEngine, nextFields);
    onPolicyTextChange(stringifyPolicyDocument(nextPolicy));
  }

  function handleEngineChange(nextEngine: PolicyEngine) {
    onEngineChange(nextEngine);
    if (hasJsonError) {
      return;
    }
    const nextFields = extractBuilderFields(basePolicy, nextEngine);
    commitBuilder(nextFields, nextEngine);
  }

  function handleBuilderChange(patch: Partial<BuilderFields>) {
    if (controlsDisabled) {
      return;
    }
    commitBuilder({
      ...builderFields,
      ...patch,
    });
  }

  function handleAddTool() {
    const nextTool = pendingTool.trim();
    if (!nextTool || controlsDisabled) {
      return;
    }
    if (builderFields.irreversibleTools.includes(nextTool)) {
      setPendingTool("");
      return;
    }
    handleBuilderChange({
      irreversibleTools: [...builderFields.irreversibleTools, nextTool],
    });
    setPendingTool("");
  }

  function handleRemoveTool(toolName: string) {
    if (controlsDisabled) {
      return;
    }
    handleBuilderChange({
      irreversibleTools: builderFields.irreversibleTools.filter((tool) => tool !== toolName),
    });
  }

  return (
    <Tabs defaultValue="builder" className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Policy Editor</span>
          <Badge variant="outline">{engine === "opa" ? "OPA" : "Built-in"}</Badge>
          <Badge variant={builderFields.unknownTools === "deny" ? "danger" : "success"}>
            Unknown tools: {builderFields.unknownTools}
          </Badge>
          <Badge variant="default">{builderFields.irreversibleTools.length} guarded</Badge>
          {customKeys.length > 0 ? (
            <Badge variant="warning">{customKeys.length} custom key{customKeys.length > 1 ? "s" : ""}</Badge>
          ) : null}
        </div>
        <TabsList className="h-9">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="builder" className="space-y-4">
        {hasJsonError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
            Raw JSON contains an error. Fix it in the JSON tab before using the builder.
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className={cn("grid gap-4", onNameChange ? "md:grid-cols-[minmax(0,1fr)_220px]" : "md:grid-cols-1")}>
              {onNameChange ? (
                <label className="block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Policy Pack Name</span>
                  <input
                    className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                    value={name ?? ""}
                    onChange={(event) => onNameChange(event.target.value)}
                    placeholder="Strict approvals"
                    required
                    disabled={disabled || !editable}
                  />
                </label>
              ) : null}

              <div className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Engine</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["builtin", "opa"] as PolicyEngine[]).map((option) => {
                    const active = engine === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                          active
                            ? "border-primary/45 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
                            : "border-border/80 bg-background/75 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                        onClick={() => handleEngineChange(option)}
                        disabled={disabled || !editable}
                      >
                        {option === "builtin" ? "Built-in Rules" : "OPA Policy"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Effective Mode
              </p>
              <p className="mt-2 font-medium text-foreground">{unknownToolsCopy}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-xl border border-border/70 bg-background/65 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Unknown Tools</p>
                  <p className="text-xs text-muted-foreground">Choose the default action for tools without an explicit rule.</p>
                </div>
                <div className="inline-flex rounded-xl border border-border/80 bg-background/70 p-1">
                  {(["allow", "deny"] as const).map((option) => {
                    const active = builderFields.unknownTools === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-medium transition",
                          active
                            ? option === "deny"
                              ? "bg-danger/12 text-danger"
                              : "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => handleBuilderChange({ unknownTools: option })}
                        disabled={controlsDisabled}
                      >
                        {option === "allow" ? "Allow" : "Deny"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <section className="rounded-xl border border-border/70 bg-background/65 p-4">
                <p className="text-sm font-semibold text-foreground">Approval Token</p>
                <p className="mt-1 text-xs text-muted-foreground">Require this payload field before irreversible calls can execute.</p>
                <label className="mt-4 block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Field name</span>
                  <input
                    className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                    value={builderFields.approvalTokenField}
                    onChange={(event) => handleBuilderChange({ approvalTokenField: event.target.value })}
                    placeholder="confirmation_token"
                    disabled={controlsDisabled}
                  />
                </label>
              </section>

              <section className="rounded-xl border border-border/70 bg-background/65 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Irreversible Tools</p>
                    <p className="mt-1 text-xs text-muted-foreground">Any tool listed here requires the approval token before execution.</p>
                  </div>
                  <Badge variant="default">{builderFields.irreversibleTools.length} tools</Badge>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                    value={pendingTool}
                    onChange={(event) => setPendingTool(event.target.value)}
                    placeholder="payments.refund"
                    disabled={controlsDisabled}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddTool();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTool}
                    disabled={controlsDisabled || pendingTool.trim().length === 0}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                {builderFields.irreversibleTools.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                    No guarded tools yet.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {builderFields.irreversibleTools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-foreground"
                      >
                        <span className="truncate font-mono">{tool}</span>
                        {editable ? (
                          <button
                            type="button"
                            className="text-muted-foreground transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleRemoveTool(tool)}
                            disabled={controlsDisabled}
                            aria-label={`Remove ${tool}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {engine === "opa" ? (
              <section className="rounded-xl border border-border/70 bg-background/65 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-muted-foreground">OPA Package</span>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                      value={builderFields.opaPackage}
                      onChange={(event) => handleBuilderChange({ opaPackage: event.target.value })}
                      placeholder={DEFAULT_OPA_PACKAGE}
                      disabled={controlsDisabled}
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-muted-foreground">OPA Query</span>
                    <input
                      className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                      value={builderFields.opaQuery}
                      onChange={(event) => handleBuilderChange({ opaQuery: event.target.value })}
                      placeholder={DEFAULT_OPA_QUERY}
                      disabled={controlsDisabled}
                    />
                  </label>
                </div>
              </section>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Policy version" value={builderFields.version || "0.1"} />
              <StatTile label="Guarded tools" value={`${builderFields.irreversibleTools.length}`} />
              <StatTile label="Token field" value={builderFields.approvalTokenField || "confirmation_token"} mono />
              <StatTile
                label={engine === "opa" ? "OPA query" : "Execution"}
                value={engine === "opa" ? builderFields.opaQuery || DEFAULT_OPA_QUERY : "Rule-based checks"}
                mono={engine === "opa"}
              />
            </div>

            {customKeys.length > 0 ? (
              <div className="rounded-xl border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-muted-foreground">
                Additional top-level keys will be preserved: <span className="font-medium text-foreground">{customKeys.join(", ")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="json" className="space-y-3">
        <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-5">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Raw Policy JSON</p>
              <p className="text-xs text-muted-foreground">Use this for unsupported keys or direct document review.</p>
            </div>
            {editable ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (parsed.policy) {
                    onPolicyTextChange(stringifyPolicyDocument(parsed.policy));
                  }
                }}
                disabled={disabled || !parsed.policy}
              >
                Format JSON
              </Button>
            ) : null}
          </div>

          {editable ? (
            <textarea
              className="min-h-[360px] w-full rounded-xl border border-border/80 bg-background/80 p-3 font-mono text-xs text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
              value={policyText}
              onChange={(event) => onPolicyTextChange(event.target.value)}
              spellCheck={false}
              disabled={disabled}
            />
          ) : (
            <pre className="max-h-[420px] overflow-auto rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-foreground">
              <code>{policyText}</code>
            </pre>
          )}

          {parsed.error ? (
            <p className="mt-3 text-sm text-danger">{parsed.error}</p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Valid JSON. Saving will create a new policy version from this document.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function StatTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/65 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-sm font-medium text-foreground", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function extractBuilderFields(
  policy: PolicyDocument,
  engine: PolicyEngine
): BuilderFields {
  const defaults = asRecord(policy.defaults);
  const approval = asRecord(policy.approval);
  const irreversible = asRecord(policy.irreversible);
  const opa = asRecord(policy.opa);

  const unknownTools = defaults.unknown_tools === "deny" ? "deny" : "allow";
  const version =
    typeof policy.version === "string" && policy.version.trim()
      ? policy.version.trim()
      : "0.1";
  const approvalTokenField =
    typeof approval.token_field === "string" && approval.token_field.trim()
      ? approval.token_field.trim()
      : "confirmation_token";
  const irreversibleTools = normalizeTools(
    Array.isArray(irreversible.tools)
      ? irreversible.tools
      : Array.isArray(policy.irreversible_tools)
      ? policy.irreversible_tools
      : []
  );

  return {
    version,
    unknownTools,
    approvalTokenField,
    irreversibleTools,
    opaPackage:
      typeof opa.package === "string" && opa.package.trim()
        ? opa.package.trim()
        : engine === "opa"
        ? DEFAULT_OPA_PACKAGE
        : "",
    opaQuery:
      typeof opa.query === "string" && opa.query.trim()
        ? opa.query.trim()
        : engine === "opa"
        ? DEFAULT_OPA_QUERY
        : "",
  };
}

function buildPolicyDocument(
  basePolicy: PolicyDocument,
  engine: PolicyEngine,
  fields: BuilderFields
): PolicyDocument {
  const next: PolicyDocument = {
    ...basePolicy,
    version: fields.version.trim() || "0.1",
    defaults: {
      ...asRecord(basePolicy.defaults),
      unknown_tools: fields.unknownTools,
    },
    approval: {
      ...asRecord(basePolicy.approval),
      token_field: fields.approvalTokenField.trim() || "confirmation_token",
    },
  };

  const irreversibleTools = normalizeTools(fields.irreversibleTools);
  if (irreversibleTools.length > 0) {
    next.irreversible = {
      ...asRecord(basePolicy.irreversible),
      tools: irreversibleTools,
    };
  } else {
    delete next.irreversible;
  }

  delete next.irreversible_tools;

  if (engine === "opa") {
    const nextOpa = {
      ...asRecord(basePolicy.opa),
    };
    if (fields.opaPackage.trim()) {
      nextOpa.package = fields.opaPackage.trim();
    } else {
      delete nextOpa.package;
    }
    if (fields.opaQuery.trim()) {
      nextOpa.query = fields.opaQuery.trim();
    } else {
      delete nextOpa.query;
    }
    if (Object.keys(nextOpa).length > 0) {
      next.opa = nextOpa;
    } else {
      delete next.opa;
    }
  } else {
    delete next.opa;
  }

  return next;
}

function normalizeTools(rawTools: unknown[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of rawTools) {
    if (typeof item !== "string") {
      continue;
    }
    const value = item.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function asRecord(value: unknown): PolicyDocument {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is PolicyDocument {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

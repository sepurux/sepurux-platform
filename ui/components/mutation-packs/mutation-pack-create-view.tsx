"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BuilderMode = "basic" | "advanced";
type PresetId = "incident_response" | "customer_support" | "payments_ops";
type Intensity = "light" | "standard" | "aggressive";

type PresetDefinition = {
  label: string;
  summary: string;
  defaultName: string;
  defaultDescription: string;
  defaultTools: string[];
  includeSecurityByDefault: boolean;
  defaultMaxMutationsPerAttempt: number;
};

type IntensityDefinition = {
  timeoutProbability: number;
  rateLimitProbability: number;
  schemaProbability: number;
  latencyProbability: number;
  securityProbability: number;
  timeoutMs: number;
  latencyMinMs: number;
  latencyMaxMs: number;
};

const PRESET_DEFINITIONS: Record<PresetId, PresetDefinition> = {
  incident_response: {
    label: "Incident Response",
    summary: "Runbook lookup, ticketing, and team notification flows.",
    defaultName: "incident.domain.pack",
    defaultDescription:
      "Domain-specific reliability pack for incident workflows across docs lookup, ticket creation, and notification tools.",
    defaultTools: ["search_docs", "create_ticket", "send_slack"],
    includeSecurityByDefault: true,
    defaultMaxMutationsPerAttempt: 2,
  },
  customer_support: {
    label: "Customer Support",
    summary: "Knowledge lookup, case updates, and customer messaging.",
    defaultName: "support.domain.pack",
    defaultDescription:
      "Timeout, schema drift, and latency scenarios for customer support automation pipelines.",
    defaultTools: ["search_kb", "update_case", "send_email"],
    includeSecurityByDefault: false,
    defaultMaxMutationsPerAttempt: 2,
  },
  payments_ops: {
    label: "Payments Ops",
    summary: "Invoice retrieval, charge/refund operations, and confirmations.",
    defaultName: "payments.domain.pack",
    defaultDescription:
      "Mutation coverage for payment operations to surface retry, fallback, and schema handling gaps.",
    defaultTools: ["fetch_invoice", "create_charge", "send_receipt"],
    includeSecurityByDefault: false,
    defaultMaxMutationsPerAttempt: 2,
  },
};

const INTENSITY_DEFINITIONS: Record<Intensity, IntensityDefinition> = {
  light: {
    timeoutProbability: 0.15,
    rateLimitProbability: 0.1,
    schemaProbability: 0.2,
    latencyProbability: 0.25,
    securityProbability: 0.1,
    timeoutMs: 2500,
    latencyMinMs: 600,
    latencyMaxMs: 2200,
  },
  standard: {
    timeoutProbability: 0.3,
    rateLimitProbability: 0.2,
    schemaProbability: 0.35,
    latencyProbability: 0.5,
    securityProbability: 0.2,
    timeoutMs: 3500,
    latencyMinMs: 1500,
    latencyMaxMs: 6000,
  },
  aggressive: {
    timeoutProbability: 0.45,
    rateLimitProbability: 0.35,
    schemaProbability: 0.55,
    latencyProbability: 0.7,
    securityProbability: 0.35,
    timeoutMs: 7000,
    latencyMinMs: 2500,
    latencyMaxMs: 12000,
  },
};

const TRACE_EXCLUDED_TOOLS = new Set(["agent.run_agent", "campaign.load", "trace.load"]);

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseTools(raw: string): string[] {
  const seen = new Set<string>();
  const parsed = raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);

  for (const tool of parsed) {
    if (!seen.has(tool)) {
      seen.add(tool);
    }
  }
  return [...seen];
}

function guessSchemaField(tool: string): string {
  const lower = tool.toLowerCase();
  if (lower.includes("search") || lower.includes("doc") || lower.includes("kb")) {
    return "hits";
  }
  if (lower.includes("ticket") || lower.includes("case") || lower.includes("issue")) {
    return "ticket_id";
  }
  if (lower.includes("slack") || lower.includes("email") || lower.includes("message")) {
    return "message_id";
  }
  return "status";
}

function guessSecurityField(tool: string): string {
  const lower = tool.toLowerCase();
  if (lower.includes("search") || lower.includes("doc") || lower.includes("kb")) {
    return "source";
  }
  if (lower.includes("slack") || lower.includes("email") || lower.includes("message")) {
    return "message";
  }
  return "status";
}

function extractToolsFromTracePayload(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    return [];
  }

  const seen = new Set<string>();
  for (const item of events) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const event = item as { type?: unknown; tool?: unknown };
    const eventType = typeof event.type === "string" ? event.type : "";
    if (eventType !== "tool_call" && eventType !== "tool_result") {
      continue;
    }
    if (typeof event.tool !== "string") {
      continue;
    }
    const tool = event.tool.trim();
    if (!tool || TRACE_EXCLUDED_TOOLS.has(tool)) {
      continue;
    }
    seen.add(tool);
  }

  return [...seen];
}

function buildGeneratedConfig({
  tools,
  intensity,
  maxMutationsPerAttempt,
  includeSecurity,
}: {
  tools: string[];
  intensity: Intensity;
  maxMutationsPerAttempt: number;
  includeSecurity: boolean;
}): Record<string, unknown> {
  const normalizedTools = tools.length > 0 ? tools : ["tool.default"];
  const profile = INTENSITY_DEFINITIONS[intensity];

  const primaryTool = normalizedTools[0];
  const secondaryTool = normalizedTools[1] ?? primaryTool;
  const tertiaryTool = normalizedTools[2] ?? primaryTool;

  const mutations: Array<Record<string, unknown>> = [
    {
      mutation_id: `${toSlug(primaryTool)}-schema-drop`,
      type: "schema.drop_field",
      target: { tool: primaryTool },
      params: { field: guessSchemaField(primaryTool) },
      probability: profile.schemaProbability,
      weight: 1.2,
    },
    {
      mutation_id: `${toSlug(secondaryTool)}-timeout`,
      type: "fault.timeout",
      target: { tool: secondaryTool },
      params: {
        timeout_ms: profile.timeoutMs,
        error_message: "simulated timeout from mutation pack",
      },
      probability: profile.timeoutProbability,
      weight: 1.6,
    },
    {
      mutation_id: `${toSlug(secondaryTool)}-rate-limit`,
      type: "fault.rate_limit",
      target: { tool: secondaryTool },
      probability: profile.rateLimitProbability,
      weight: 1.1,
    },
    {
      mutation_id: `${toSlug(tertiaryTool)}-latency-spike`,
      type: "latency_delay",
      target: { tool: tertiaryTool },
      params: { min_ms: profile.latencyMinMs, max_ms: profile.latencyMaxMs },
      probability: profile.latencyProbability,
      weight: 1.3,
    },
  ];

  if (includeSecurity) {
    mutations.push({
      mutation_id: `${toSlug(primaryTool)}-poison`,
      type: "poison.inject",
      target: { tool: primaryTool },
      params: {
        field: guessSecurityField(primaryTool),
        payload: "::poisoned-by-mutation::",
      },
      probability: profile.securityProbability,
      weight: 1,
    });
  }

  for (const extraTool of normalizedTools.slice(3, 6)) {
    mutations.push({
      mutation_id: `${toSlug(extraTool)}-timeout`,
      type: "fault.timeout",
      target: { tool: extraTool },
      params: {
        timeout_ms: profile.timeoutMs,
        error_message: "simulated timeout from mutation pack",
      },
      probability: profile.timeoutProbability,
      weight: 1,
    });
  }

  return {
    version: "0.1",
    max_mutations_per_attempt: Math.max(1, Math.min(3, maxMutationsPerAttempt)),
    mutations,
  };
}

export function MutationPackCreateView() {
  const authSession = useAuthSession();
  const router = useRouter();

  const [builderMode, setBuilderMode] = useState<BuilderMode>("basic");
  const [presetId, setPresetId] = useState<PresetId>("incident_response");
  const [intensity, setIntensity] = useState<Intensity>("standard");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toolInput, setToolInput] = useState(
    PRESET_DEFINITIONS.incident_response.defaultTools.join(", ")
  );
  const [maxMutationsPerAttempt, setMaxMutationsPerAttempt] = useState<number>(
    PRESET_DEFINITIONS.incident_response.defaultMaxMutationsPerAttempt
  );
  const [includeSecurity, setIncludeSecurity] = useState<boolean>(
    PRESET_DEFINITIONS.incident_response.includeSecurityByDefault
  );
  const [traceId, setTraceId] = useState("");
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceLoadError, setTraceLoadError] = useState<string | null>(null);

  const [configText, setConfigText] = useState<string>("{}");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);

  const selectedPreset = PRESET_DEFINITIONS[presetId];

  useEffect(() => {
    setToolInput(selectedPreset.defaultTools.join(", "));
    setIncludeSecurity(selectedPreset.includeSecurityByDefault);
    setMaxMutationsPerAttempt(selectedPreset.defaultMaxMutationsPerAttempt);

    setName((previous) => (previous.trim() ? previous : selectedPreset.defaultName));
    setDescription((previous) =>
      previous.trim() ? previous : selectedPreset.defaultDescription
    );
  }, [selectedPreset]);

  const parsedTools = useMemo(() => {
    const parsed = parseTools(toolInput);
    if (parsed.length > 0) {
      return parsed;
    }
    return selectedPreset.defaultTools;
  }, [toolInput, selectedPreset]);

  const generatedConfig = useMemo(
    () =>
      buildGeneratedConfig({
        tools: parsedTools,
        intensity,
        maxMutationsPerAttempt,
        includeSecurity,
      }),
    [parsedTools, intensity, maxMutationsPerAttempt, includeSecurity]
  );

  const generatedConfigText = useMemo(
    () => JSON.stringify(generatedConfig, null, 2),
    [generatedConfig]
  );

  const generatedMutationCount = useMemo(() => {
    const value = generatedConfig.mutations;
    return Array.isArray(value) ? value.length : 0;
  }, [generatedConfig]);

  useEffect(() => {
    if (builderMode === "advanced" && configText.trim() === "{}") {
      setConfigText(generatedConfigText);
    }
  }, [builderMode, configText, generatedConfigText]);

  const canManageMutationPacks = authSession?.permissions.can_manage_mutation_packs ?? false;

  async function onLoadTraceTools() {
    const normalized = traceId.trim();
    if (!normalized) {
      setTraceLoadError("Enter a trace ID before loading tools.");
      return;
    }

    setTraceLoading(true);
    setTraceLoadError(null);
    try {
      const trace = await api.getTrace(normalized, { includePayload: true });
      const traceTools = extractToolsFromTracePayload(trace.payload ?? null);
      if (traceTools.length === 0) {
        setTraceLoadError("No tool_call/tool_result events found in this trace payload.");
        return;
      }
      setToolInput(traceTools.join(", "));
    } catch (error) {
      setTraceLoadError(error instanceof Error ? error.message : "Failed to load trace tools");
    } finally {
      setTraceLoading(false);
    }
  }

  async function onCreateMutationPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateWarning(null);
    setCreating(true);

    try {
      let parsedConfig: Record<string, unknown>;
      if (builderMode === "basic") {
        parsedConfig = generatedConfig;
      } else {
        const parsed = JSON.parse(configText) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Mutation pack config must be a JSON object");
        }
        parsedConfig = parsed as Record<string, unknown>;
      }

      const response = await api.createMutationPack({
        name,
        description: description.trim() || null,
        config: parsedConfig,
      });
      if (response.warning) {
        setCreateWarning(response.warning);
      }
      router.push("/mutation-packs");
      router.refresh();
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New custom check
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sepurux ships core and security checks out of the box. Use this builder for workflow-specific custom checks.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/mutation-packs">All checks</Link>
        </Button>
      </div>

      {!canManageMutationPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Custom checks follow workspace membership rules. Your current membership can view checks but cannot create or modify them.
          </CardContent>
        </Card>
      ) : null}

      {canManageMutationPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain Pack</CardTitle>
            <CardDescription>
              Start from domain presets, tune tool-specific failures, then switch to raw JSON only
              when you need full control.
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
                  placeholder={selectedPreset.defaultName}
                  required
                  disabled={creating}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={selectedPreset.defaultDescription}
                  disabled={creating}
                />
              </label>

              <Tabs
                value={builderMode}
                onValueChange={(value) => setBuilderMode(value as BuilderMode)}
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="basic">Domain Builder</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Preset</span>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={presetId}
                        onChange={(event) => setPresetId(event.target.value as PresetId)}
                        disabled={creating}
                      >
                        {Object.entries(PRESET_DEFINITIONS).map(([id, preset]) => (
                          <option key={id} value={id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">{selectedPreset.summary}</p>
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Chaos Intensity</span>
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        value={intensity}
                        onChange={(event) => setIntensity(event.target.value as Intensity)}
                        disabled={creating}
                      >
                        <option value="light">Light</option>
                        <option value="standard">Standard</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Trace ID (optional)</span>
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                        value={traceId}
                        onChange={(event) => setTraceId(event.target.value)}
                        placeholder="Load tools from an existing trace"
                        disabled={creating || traceLoading}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onLoadTraceTools()}
                      disabled={creating || traceLoading}
                    >
                      {traceLoading ? "Loading..." : "Load Tools"}
                    </Button>
                  </div>
                  {traceLoadError ? (
                    <p className="text-sm text-rose-200">{traceLoadError}</p>
                  ) : null}

                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">Tool Targets</span>
                    <textarea
                      className="min-h-[90px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                      value={toolInput}
                      onChange={(event) => setToolInput(event.target.value)}
                      placeholder="search_docs, create_ticket, send_slack"
                      spellCheck={false}
                      disabled={creating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma/newline separated tools. Up to 6 tools are used for generation.
                    </p>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Max Mutations/Attempt</span>
                      <input
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        type="number"
                        min={1}
                        max={3}
                        value={maxMutationsPerAttempt}
                        onChange={(event) =>
                          setMaxMutationsPerAttempt(Number.parseInt(event.target.value, 10) || 1)
                        }
                        disabled={creating}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={includeSecurity}
                        onChange={(event) => setIncludeSecurity(event.target.checked)}
                        disabled={creating}
                      />
                      Include security mutation (`poison.inject`)
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {parsedTools.map((tool) => (
                        <Badge key={tool} variant="info">
                          {tool}
                        </Badge>
                      ))}
                      <Badge variant="warning">{generatedMutationCount} mutations generated</Badge>
                    </div>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Generated Config Preview</span>
                      <textarea
                        className="min-h-[220px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                        value={generatedConfigText}
                        readOnly
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setConfigText(generatedConfigText);
                        setBuilderMode("advanced");
                      }}
                      disabled={creating}
                    >
                      Open In Advanced JSON
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-2">
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">Config JSON</span>
                    <textarea
                      className="min-h-[320px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                      value={configText}
                      onChange={(event) => setConfigText(event.target.value)}
                      spellCheck={false}
                      required
                      disabled={creating}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Advanced mode expects only the `config` object body.
                  </p>
                </TabsContent>
              </Tabs>

              {createError ? <p className="text-sm text-rose-200">{createError}</p> : null}
              {createWarning ? <p className="text-sm text-amber-200">{createWarning}</p> : null}

              <div className="flex justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/mutation-packs">Cancel</Link>
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create check"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

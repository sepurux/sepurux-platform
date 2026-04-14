"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  History,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ParseKind = "raw" | "json" | "trace-id";

type Entry = {
  label: string;
  text: string;
  status: string | null;
  score: number;
};

type ParseResult = {
  kind: ParseKind;
  raw: string;
  parsed: unknown | null;
  traceId: string | null;
  lines: string[];
};

type MutationImpact = {
  id: string;
  category: "schema" | "fault";
  label: string;
  targetedSteps: string[];
  projectedOutcome: string;
};

type MutationPackResult = {
  toolStepsFound: number;
  impacts: MutationImpact[];
};

const SAMPLE_JSON = JSON.stringify(
  {
    trace_id: "4a6a1d71-3d5b-4c2d-8f46-69c94b07b2d0",
    source: "site.sandbox",
    task_name: "refund_agent",
    events: [
      { step_name: "classify_ticket", step_type: "llm_call", status: "success" },
      {
        step_name: "payments.refund",
        step_type: "tool_call",
        status: "error",
        output: { error: "Unexpected field 'state' in response payload" },
      },
    ],
  },
  null,
  2
);

const SAMPLE_LOG = `2026-04-13 09:14:02 trace_id=4a6a1d71-3d5b-4c2d-8f46-69c94b07b2d0 step=classify_ticket status=success
2026-04-13 09:14:03 step=payments.refund status=error error="Unexpected field 'state' in response payload"
2026-04-13 09:14:03 retry aborted after 1 attempt`;

const SAMPLE_TRACE_ID = "4a6a1d71-3d5b-4c2d-8f46-69c94b07b2d0";

const ADVANCED_CAPABILITIES = [
  {
    title: "Save this trace",
    description: "Sign in after the debugger shows the issue to keep history.",
    href: buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" }),
    icon: History,
  },
  {
    title: "Replay later",
    description: "Use the same input for deterministic replay after the issue is fixed.",
    href: "/product",
    icon: RotateCcw,
  },
  {
    title: "Continuous checks",
    description: "Move stable traces into campaigns and CI gates before release.",
    href: "/docs/ci-cd",
    icon: GitBranch,
  },
  {
    title: "Mutation testing",
    description: "Stress the same workflow with schema drift, latency, and injection faults.",
    href: "/product",
    icon: FlaskConical,
  },
  {
    title: "Compare runs",
    description: "Use saved history to compare this failure against the next run.",
    href: "/product",
    icon: GitCompareArrows,
  },
  {
    title: "Policy gates",
    description: "Add approvals and release guardrails when the fix is ready to ship.",
    href: "/docs/policy-security",
    icon: ShieldCheck,
  },
];

const DARK_PANEL_CLASS = "section-shell overflow-hidden";
const DARK_CHIP_CLASS =
  "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300";
const DARK_ROW_CLASS = "rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3";

// ── Core Reliability Pack (system-generated, matches api/app/mutation_packs/core/reliability.py) ──
const CORE_RELIABILITY_MUTATIONS: Array<{
  id: string;
  category: "schema" | "fault";
  label: string;
  matchField?: string;
  outcomeIfHit: string;
  outcomeIfMiss: string;
}> = [
  {
    id: "core.reliability.rename_status",
    category: "schema",
    label: "Rename status → state",
    matchField: "status",
    outcomeIfHit: "Downstream steps reading 'status' receive undefined — silent contract break.",
    outcomeIfMiss: "No 'status' field in outputs — mutation has no effect on this trace.",
  },
  {
    id: "core.reliability.drop_id",
    category: "schema",
    label: "Drop 'id' field",
    matchField: "id",
    outcomeIfHit: "Steps requiring an entity ID receive null — likely causes downstream tool failure.",
    outcomeIfMiss: "No 'id' field in outputs — mutation has no effect on this trace.",
  },
  {
    id: "core.reliability.timeout",
    category: "fault",
    label: "Inject timeout (3 s)",
    outcomeIfHit: "Tool call replaced with TimeoutError — retry chain triggers, amplification risk.",
    outcomeIfMiss: "No tool calls found — mutation has no target in this trace.",
  },
  {
    id: "core.reliability.rate_limit",
    category: "fault",
    label: "Inject rate limit (HTTP 429)",
    outcomeIfHit: "Tool call receives 429 — backoff required before retry.",
    outcomeIfMiss: "No tool calls found — mutation has no target in this trace.",
  },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shortText(value: unknown, max = 160) {
  const text = stringifyValue(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function firstString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function matchTraceId(value: string) {
  const match = value.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
  return match?.[0] ?? null;
}

function parseTraceInput(raw: string): ParseResult {
  const trimmed = raw.trim();
  const lines = trimmed ? trimmed.split(/\r?\n/).filter(Boolean) : [];
  if (!trimmed) {
    return { kind: "raw", raw, parsed: null, traceId: null, lines };
  }

  const parsed = (() => {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  })();

  const directTraceId = matchTraceId(trimmed);
  if (directTraceId && parsed === null) {
    return { kind: "trace-id", raw, parsed: null, traceId: directTraceId, lines };
  }

  const traceId = parsed ? matchTraceId(stringifyValue(parsed)) ?? directTraceId : directTraceId;
  return { kind: parsed === null ? "raw" : "json", raw, parsed, traceId, lines };
}

function findEntryArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return null;

  const candidates = [value.events, value.timeline, value.steps, value.child_runs, value.runs, value.payload, value.data, value.trace];
  for (const candidate of candidates) {
    const nested = findEntryArray(candidate);
    if (nested) return nested;
  }
  return null;
}

function inferLineLabel(line: string, lineNumber: number) {
  const stepMatch = line.match(/(?:step|stage|event)\s*[:=]\s*([A-Za-z0-9_.-]+)/i);
  const toolMatch = line.match(/(?:tool|name|action)\s*[:=]\s*([A-Za-z0-9_.-]+)/i);
  const fallback = toolMatch?.[1] ?? stepMatch?.[1] ?? shortText(line, 56);
  return `Line ${lineNumber} · ${shortText(fallback, 56)}`;
}


function buildEntries(parsed: ParseResult): { entries: Entry[]; sourceLabel: string } {
  const structured = parsed.parsed != null ? findEntryArray(parsed.parsed) : null;
  if (structured && structured.length > 0) {
    return {
      entries: structured.map((entry, index) => {
        const text = stringifyValue(entry);
        const status = isPlainObject(entry) ? firstString(entry, ["status", "result", "state"]) : null;
        const label = isPlainObject(entry)
          ? firstString(entry, ["step_name", "name", "tool", "mutation_name", "id", "step_type", "type", "run_type"]) ?? `Item ${index + 1}`
          : `Item ${index + 1}`;
        return {
          label: `Step ${String(index + 1).padStart(2, "0")} · ${shortText(label, 64)}`,
          text,
          status,
          score: 0,
        };
      }),
      sourceLabel: "Structured JSON",
    };
  }

  if (parsed.kind === "json") {
    return {
      entries:
        parsed.lines.length > 0
          ? parsed.lines.map((line, index) => ({ label: inferLineLabel(line, index + 1), text: line, status: null, score: 0 }))
          : [{ label: "JSON payload", text: stringifyValue(parsed.parsed), status: null, score: 0 }],
      sourceLabel: "JSON paste",
    };
  }

  return {
    entries:
      parsed.lines.length > 0
        ? parsed.lines.map((line, index) => ({ label: inferLineLabel(line, index + 1), text: line, status: null, score: 0 }))
        : [{ label: "Paste", text: parsed.raw, status: null, score: 0 }],
    sourceLabel: parsed.kind === "trace-id" ? "Trace ID" : "Raw logs",
  };
}

// LangSmith run_types that represent actual tool calls (not orchestration)
const LANGSMITH_TOOL_RUN_TYPES = new Set(["tool", "retriever", "embedding"]);

function hasOutputField(text: string, field: string): boolean {
  return new RegExp(`"${field}"\\s*:`).test(text);
}

/**
 * Walk a LangSmith run tree recursively and collect every run whose own
 * run_type is a tool type. This avoids false positives on LLM/chain runs
 * whose serialised text happens to mention "tool" via nested child_runs.
 */
function collectLangsmithToolRuns(value: unknown, depth = 0): Entry[] {
  if (depth > 12 || !isPlainObject(value)) return [];
  const results: Entry[] = [];
  const runType = String(value.run_type ?? "").toLowerCase();
  const name = String(value.name ?? "").trim();
  if (LANGSMITH_TOOL_RUN_TYPES.has(runType) && name) {
    results.push({
      label: `Tool · ${shortText(name, 56)}`,
      text: stringifyValue(value),
      status: typeof value.error === "string" && (value.error as string).trim() ? "error" : "success",
      score: 0,
    });
  }
  const children = value.child_runs;
  if (Array.isArray(children)) {
    for (const child of children) {
      results.push(...collectLangsmithToolRuns(child, depth + 1));
    }
  }
  return results;
}

/**
 * True only when the entry itself (not its descendants) is a Sepurux tool event.
 * Uses a bounded slice to avoid matching "tool" in nested child_runs JSON.
 */
function isToolEntry(entry: Entry): boolean {
  // Only look at the first ~200 chars to check the entry's own type fields
  const head = entry.text.slice(0, 200);
  return (
    /"step_type"\s*:\s*"tool_call"/i.test(head) ||
    /"type"\s*:\s*"tool_call"/i.test(head) ||
    /"type"\s*:\s*"tool_result"/i.test(head)
  );
}

function shortStepLabel(label: string): string {
  const stripped = label.replace(/^(Step \d+ · |Tool · )/i, "");
  return stripped.length <= 36 ? stripped : `${stripped.slice(0, 35)}…`;
}

function applyCoreMutations(entries: Entry[], rawParsed: unknown): MutationPackResult {
  // For LangSmith payloads, recursively collect every real tool run instead
  // of relying on substring matches against the top-level entry array.
  const isLangsmith =
    isPlainObject(rawParsed) &&
    (typeof (rawParsed as Record<string, unknown>).run_type === "string" ||
      Array.isArray((rawParsed as Record<string, unknown>).child_runs));

  const toolEntries: Entry[] = isLangsmith
    ? collectLangsmithToolRuns(rawParsed)
    : entries.filter(isToolEntry);

  const impacts: MutationImpact[] = CORE_RELIABILITY_MUTATIONS.map((mutation) => {
    if (mutation.category === "schema" && mutation.matchField) {
      // Schema mutations scan ALL entries (tool or not) for the target field
      const hit = entries.filter((e) => hasOutputField(e.text, mutation.matchField!));
      return {
        id: mutation.id,
        category: mutation.category,
        label: mutation.label,
        targetedSteps: hit.map((e) => shortStepLabel(e.label)),
        projectedOutcome: hit.length > 0 ? mutation.outcomeIfHit : mutation.outcomeIfMiss,
      };
    }
    return {
      id: mutation.id,
      category: mutation.category,
      label: mutation.label,
      targetedSteps: toolEntries.map((e) => shortStepLabel(e.label)),
      projectedOutcome: toolEntries.length > 0 ? mutation.outcomeIfHit : mutation.outcomeIfMiss,
    };
  });
  return { toolStepsFound: toolEntries.length, impacts };
}

function CapabilityRow({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] md:px-6">
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

export function TraceSandbox() {
  const [rawInput, setRawInput] = useState("");
  const [mutationResult, setMutationResult] = useState<MutationPackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helperChips = useMemo(() => ["JSON traces", "logs", "semi-structured text", "trace IDs"], []);

  function handleSaveTrace() {
    const trimmed = rawInput.trim();
    // Only carry trace data when valid JSON is present
    if (trimmed) {
      try {
        JSON.parse(trimmed);
        const encoded = btoa(unescape(encodeURIComponent(trimmed)));
        window.location.href = `${siteConfig.appUrl}/traces/import?trace=${encoded}`;
        return;
      } catch {
        // Not valid JSON — fall through to auth redirect
      }
    }
    window.location.href = buildAppAuthHref({ mode: "access", intent: "signup", next: "/traces" });
  }

  function loadSample(sample: string) {
    setRawInput(sample);
    setError(null);
    setMutationResult(null);
  }

  async function handleAnalyze() {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError("Paste a trace, log, or JSON payload first.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const parsed = parseTraceInput(trimmed);
      const { entries } = buildEntries(parsed);
      setMutationResult(applyCoreMutations(entries, parsed.parsed));
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Failed to analyze trace");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <section className={DARK_PANEL_CLASS}>
        <div className="border-b border-border/60 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-primary">
                Start here
              </Badge>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Paste a trace. Find the failing step fast.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Drop in JSON, logs, or semi-structured text and get the failing step, likely cause, and next fix.
                Sign in later if you want saved traces, replay, or CI checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {helperChips.map((chip) => (
                <span key={chip} className={DARK_CHIP_CLASS}>
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className={DARK_ROW_CLASS}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">1. Paste</p>
              <p className="mt-2 text-sm leading-6 text-foreground">Bring the raw trace, log, or JSON into one box.</p>
            </div>
            <div className={DARK_ROW_CLASS}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">2. Analyze</p>
              <p className="mt-2 text-sm leading-6 text-foreground">We isolate the first failure signal and the likely cause.</p>
            </div>
            <div className={DARK_ROW_CLASS}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">3. Fix</p>
              <p className="mt-2 text-sm leading-6 text-foreground">Use the next-step fix or sign in to keep it for replay.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="border-b border-border/60 xl:border-b-0 xl:border-r xl:border-border/60">
            <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
              <div>
                <p className="section-kicker">Input</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Paste trace, log, or JSON</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Structured parsing first, raw text fallback.</p>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                Instant analysis
              </Badge>
            </div>

            <div className="space-y-4 px-5 pb-5 md:px-6 md:pb-6">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => loadSample(SAMPLE_JSON)}>
                  Load JSON sample
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => loadSample(SAMPLE_LOG)}>
                  Load log sample
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => loadSample(SAMPLE_TRACE_ID)}>
                  Load trace ID
                </Button>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Trace, log, or JSON</span>
                <textarea
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  rows={14}
                  className="min-h-[420px] w-full rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.025)] px-4 py-3 font-mono text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  placeholder={SAMPLE_JSON}
                />
              </label>

              {error ? (
                <p className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void handleAnalyze()} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                  Analyze
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSaveTrace}
                  className="gap-2 text-muted-foreground hover:bg-accent/45 hover:text-foreground"
                >
                  Save this trace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-px overflow-hidden rounded-[20px] border border-border/60 bg-border/60 md:grid-cols-3">
                <div className="bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Supported</p>
                  <p className="mt-2 text-sm text-foreground">JSON traces, logs, trace IDs</p>
                </div>
                <div className="bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Analysis</p>
                  <p className="mt-2 text-sm text-foreground">Failure step, cause, next fix</p>
                </div>
                <div className="bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Persistence</p>
                  <p className="mt-2 text-sm text-foreground">Save after value or replay later</p>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between gap-3 px-5 py-5 md:px-6">
              <div>
                <p className="section-kicker">Core Reliability Pack</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  Mutation impact
                </h2>
              </div>
              {mutationResult ? (
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  {mutationResult.impacts.filter((i) => i.targetedSteps.length > 0).length} / 4 active
                </Badge>
              ) : (
                <Badge variant="outline" className="border-white/8 bg-white/[0.03] text-muted-foreground">
                  waiting
                </Badge>
              )}
            </div>

            {mutationResult ? (
              <div className="divide-y divide-border/60">
                {mutationResult.impacts.map((impact) => (
                  <div
                    key={impact.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-5 md:px-6"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span
                        className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          impact.category === "schema"
                            ? "border border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
                            : "border border-amber-400/20 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {impact.category}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{impact.label}</p>
                    </div>

                    <div className="space-y-2">
                      {impact.targetedSteps.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {impact.targetedSteps.map((step) => (
                            <span
                              key={step}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-foreground"
                            >
                              {step}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-sm leading-6 text-muted-foreground">{impact.projectedOutcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-6 md:px-6">
                <p className="text-sm leading-7 text-muted-foreground">
                  Paste a trace and click <span className="font-medium text-foreground">Analyze</span> to see how the core reliability mutations would hit each step.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={DARK_PANEL_CLASS}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-5 md:px-6">
          <div>
            <p className="section-kicker">Advanced workflows</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
              Save, replay, and gate later
            </h2>
          </div>
          <Badge variant="outline" className="border-white/8 bg-white/[0.03] text-muted-foreground">
            Secondary
          </Badge>
        </div>

        <div className="divide-y divide-border/60">
          {ADVANCED_CAPABILITIES.map((item) => (
            <CapabilityRow
              key={item.title}
              title={item.title}
              description={item.description}
              href={item.href}
              icon={item.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileSearch,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  History,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { api, type TraceMetadata, type TraceTimelineStep } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ParseKind = "raw" | "json" | "trace-id";
type Confidence = "low" | "medium" | "high";

type HydratedTrace = {
  trace: TraceMetadata;
  timeline: TraceTimelineStep[];
};

type Entry = {
  label: string;
  text: string;
  status: string | null;
  score: number;
};

type AnalysisResult = {
  sourceLabel: string;
  confidence: Confidence;
  summary: string;
  failureLocation: string;
  likelyCause: string;
  suggestedFix: string;
  evidence: string[];
  traceId: string | null;
  canSave: boolean;
  savePayload: unknown | null;
  parsedEntries: number;
  hydrated: boolean;
};

type ParseResult = {
  kind: ParseKind;
  raw: string;
  parsed: unknown | null;
  traceId: string | null;
  lines: string[];
};

const SAMPLE_JSON = JSON.stringify(
  {
    trace_id: "4a6a1d71-3d5b-4c2d-8f46-69c94b07b2d0",
    source: "paste.debugger",
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
    description: "Persist the structured input after the debugger shows the failure.",
    href: "/traces",
    icon: History,
  },
  {
    title: "Replay later",
    description: "Turn the same trace into a replayable run when you need a second look.",
    href: "/runs",
    icon: RotateCcw,
  },
  {
    title: "Compare runs",
    description: "Use the dashboard to compare the current failure against prior runs.",
    href: "/dashboard",
    icon: GitCompareArrows,
  },
  {
    title: "Continuous checks",
    description: "Move a stable trace into scheduled campaigns and CI pre-release checks.",
    href: "/campaigns",
    icon: GitBranch,
  },
  {
    title: "Mutation testing",
    description: "Stress the same workflow with schema drift, latency, and injection faults.",
    href: "/mutation-packs",
    icon: FlaskConical,
  },
  {
    title: "Policy gates",
    description: "Add approvals and release guardrails before the trace reaches customers.",
    href: "/policies",
    icon: ShieldCheck,
  },
];

const RULES = [
  {
    match: /unexpected field|missing field|schema|contract|validation|deserialize|parse json|invalid json|shape mismatch/i,
    cause: "a schema drift or contract mismatch",
    fix: "Update the adapter or schema mapping, then replay the same trace against the new shape.",
  },
  {
    match: /timeout|timed out|deadline|latency|slow/i,
    cause: "an upstream timeout or latency spike",
    fix: "Shorten the timeout chain, add backoff, or isolate the slow call before retrying.",
  },
  {
    match: /429|rate limit|quota|too many requests/i,
    cause: "rate limiting or quota pressure",
    fix: "Add retry jitter, lower the burst size, or move the call behind a budget.",
  },
  {
    match: /unauthorized|forbidden|401|403|permission/i,
    cause: "an auth or permission failure",
    fix: "Refresh the token or widen the tool permissions for this step.",
  },
  {
    match: /prompt injection|unsafe|policy|blocked/i,
    cause: "a policy guardrail blocked the action",
    fix: "Split the safe and unsafe tool path or tune the policy rule that blocked the step.",
  },
  {
    match: /null|undefined|cannot read|is not a function|typeerror/i,
    cause: "missing data or a null-handling bug",
    fix: "Guard the missing field and add a fallback before the tool call.",
  },
  {
    match: /retry storm|recursive|loop|too many retries/i,
    cause: "a retry loop amplified the original failure",
    fix: "Cap the retries, add jitter, and stop retrying non-retryable errors.",
  },
  {
    match: /connection reset|econnreset|socket hang up|network|fetch failed/i,
    cause: "a transient network failure",
    fix: "Treat it as transient, retry once, and isolate the dependency.",
  },
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function shortText(value: unknown, max = 160) {
  const text = stringifyValue(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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

  const directTraceId = matchTraceId(trimmed);
  const parsed = (() => {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  })();

  if (directTraceId && parsed === null) {
    return { kind: "trace-id", raw, parsed: null, traceId: directTraceId, lines };
  }

  const traceId = parsed ? matchTraceId(stringifyValue(parsed)) ?? directTraceId : directTraceId;
  return {
    kind: parsed === null ? "raw" : "json",
    raw,
    parsed,
    traceId,
    lines,
  };
}

function findEntryArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return null;

  const candidates = [
    value.events,
    value.timeline,
    value.steps,
    value.payload,
    value.data,
    value.trace,
  ];

  for (const candidate of candidates) {
    const nested = findEntryArray(candidate);
    if (nested) return nested;
  }

  return null;
}

function entryFromStructuredValue(value: unknown, index: number): Entry {
  const text = stringifyValue(value);
  const status = isPlainObject(value) ? firstString(value, ["status", "result", "state"]) : null;
  const label = isPlainObject(value)
    ? firstString(value, ["step_name", "name", "tool", "mutation_name", "id", "step_type", "type"]) ?? `Item ${index + 1}`
    : `Item ${index + 1}`;

  return {
    label: `Step ${String(index + 1).padStart(2, "0")} · ${shortText(label, 64)}`,
    text,
    status,
    score: scoreText(text, status),
  };
}

function entryFromLine(line: string, index: number): Entry {
  const label = inferLineLabel(line, index + 1);
  return {
    label,
    text: line,
    status: null,
    score: scoreText(line, null),
  };
}

function inferLineLabel(line: string, lineNumber: number) {
  const stepMatch = line.match(/(?:step|stage|event)\s*[:=]\s*([A-Za-z0-9_.-]+)/i);
  const toolMatch = line.match(/(?:tool|name|action)\s*[:=]\s*([A-Za-z0-9_.-]+)/i);
  const fallback = toolMatch?.[1] ?? stepMatch?.[1] ?? shortText(line, 56);
  return `Line ${lineNumber} · ${shortText(fallback, 56)}`;
}

function scoreText(text: string, status: string | null) {
  const lower = text.toLowerCase();
  let score = 0;
  if (/error|failed|failure|timeout|timed out|exception|panic|invalid|mismatch|blocked|unauthorized|forbidden|429|traceback/i.test(lower)) {
    score += 8;
  }
  if (/schema|contract|validation|null|undefined|retry|parse|network|rate limit|permission/i.test(lower)) {
    score += 4;
  }
  if (/step|tool|call|model|agent|response|output|retry/i.test(lower)) {
    score += 1;
  }
  if (status && /error|failed|failure|timeout|retry/i.test(status.toLowerCase())) {
    score += 10;
  }
  return score;
}

function classifyCause(text: string) {
  for (const rule of RULES) {
    if (rule.match.test(text)) {
      return rule;
    }
  }
  return {
    cause: "the first failed step in the trace",
    fix: "Replay the same step with the original payload, compare it to the last successful step, and tighten the contract around the change.",
  };
}

function buildEntries(parsed: ParseResult, hydrated: HydratedTrace | null): { entries: Entry[]; sourceLabel: string } {
  if (hydrated) {
    const entries = hydrated.timeline.map((step, index) => {
      const text = [
        step.step_type,
        step.step_name,
        step.mutation_name ?? "",
        stringifyValue(step.input_payload),
        stringifyValue(step.output_payload),
        step.status,
      ]
        .filter(Boolean)
        .join(" ");
      return {
        label: `Step ${String(index + 1).padStart(2, "0")} · ${shortText(step.step_name, 64)}`,
        text,
        status: step.status,
        score: scoreText(text, step.status),
      };
    });

    return { entries, sourceLabel: "Hydrated trace" };
  }

  const structured = parsed.parsed != null ? findEntryArray(parsed.parsed) : null;
  if (structured && structured.length > 0) {
    return {
      entries: structured.map((entry, index) => entryFromStructuredValue(entry, index)),
      sourceLabel: "Structured JSON",
    };
  }

  if (parsed.kind === "json") {
    return {
      entries: parsed.lines.length > 0 ? parsed.lines.map((line, index) => entryFromLine(line, index)) : [{ label: "JSON payload", text: stringifyValue(parsed.parsed), status: null, score: scoreText(stringifyValue(parsed.parsed), null) }],
      sourceLabel: "JSON paste",
    };
  }

  return {
    entries: parsed.lines.length > 0 ? parsed.lines.map((line, index) => entryFromLine(line, index)) : [{ label: "Paste", text: parsed.raw, status: null, score: scoreText(parsed.raw, null) }],
    sourceLabel: parsed.kind === "trace-id" ? "Trace ID" : "Raw logs",
  };
}

function analyzeTrace(parsed: ParseResult, hydrated: HydratedTrace | null): AnalysisResult {
  const { entries, sourceLabel } = buildEntries(parsed, hydrated);
  const bestExplicitFailure = entries.findIndex((entry) => /error|failed|failure|timeout|retry/i.test(entry.status ?? ""));
  const bestHeuristic = entries.reduce<{ index: number; entry: Entry; score: number }>(
    (best, entry, index) => (entry.score > best.score ? { index, entry, score: entry.score } : best),
    { index: 0, entry: entries[0] ?? { label: "Trace", text: parsed.raw, status: null, score: 0 }, score: -1 }
  );
  const failureIndex = bestExplicitFailure >= 0 ? bestExplicitFailure : bestHeuristic.index;
  const failureEntry = entries[failureIndex] ?? bestHeuristic.entry;
  const lastHealthy = entries.slice(0, failureIndex).reverse().find((entry) => !/error|failed|failure|timeout|retry/i.test(entry.status ?? "") && entry.score < failureEntry.score);
  const cause = classifyCause(`${failureEntry.label} ${failureEntry.text} ${entries.map((entry) => entry.text).join(" ")}`);
  const explicitFailure = /error|failed|failure|timeout|retry/i.test(failureEntry.status ?? "") || /error|failed|failure|timeout|retry/i.test(failureEntry.text);
  const confidence: Confidence = hydrated || explicitFailure ? "high" : bestHeuristic.entry.score > 5 ? "medium" : "low";

  const evidence = [
    `${entries.length} signal${entries.length === 1 ? "" : "s"} scanned from ${sourceLabel.toLowerCase()}`,
    `First failure signal: ${failureEntry.label}`,
    `Matched likely cause: ${cause.cause}`,
  ];
  if (lastHealthy) {
    evidence.push(`Last healthy step: ${lastHealthy.label}`);
  }
  if (parsed.traceId) {
    evidence.push(`Trace ID: ${parsed.traceId}`);
  }
  if (hydrated) {
    evidence.push(`Hydrated from backend timeline with ${hydrated.timeline.length} step${hydrated.timeline.length === 1 ? "" : "s"}`);
  }

  const failureLocation = failureEntry.label;
  const summary = explicitFailure
    ? `The trace points to ${failureLocation}.`
    : `The trace most likely points to ${failureLocation}.`;

  return {
    sourceLabel,
    confidence,
    summary,
    failureLocation,
    likelyCause: cause.cause,
    suggestedFix: cause.fix,
    evidence,
    traceId: parsed.traceId,
    canSave: parsed.kind === "json" && parsed.parsed != null,
    savePayload: parsed.kind === "json" ? parsed.parsed : null,
    parsedEntries: entries.length,
    hydrated: Boolean(hydrated),
  };
}

function summaryTone(confidence: Confidence) {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "outline";
}

function FeatureCard({
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
    <Link
      href={href}
      className="rounded-[24px] border border-white/8 bg-card/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/28 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.035] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function TraceAnalyzerView() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const helperChips = useMemo(
    () => ["JSON traces", "logs", "semi-structured text", "trace IDs"],
    []
  );

  async function hydrateIfPossible(parseResult: ParseResult): Promise<HydratedTrace | null> {
    if (!parseResult.traceId) {
      return null;
    }
    try {
      const [trace, timeline] = await Promise.all([
        api.getTrace(parseResult.traceId, { includePayload: true }),
        api.getTraceTimeline(parseResult.traceId),
      ]);
      return { trace, timeline };
    } catch {
      return null;
    }
  }

  async function handleAnalyze() {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError("Paste a trace, log, or JSON payload first.");
      return;
    }

    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const parsed = parseTraceInput(trimmed);
      const hydrated = await hydrateIfPossible(parsed);
      const result = analyzeTrace(parsed, hydrated);
      setAnalysis(result);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Failed to analyze trace");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!analysis?.canSave || saveBusy) return;
    setSaveBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const created = await api.createTrace(analysis.savePayload);
      setSaveMessage(`Saved as ${created.trace_id}`);
      router.push(`/traces/${created.trace_id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save trace");
    } finally {
      setSaveBusy(false);
    }
  }

  function loadSample(sample: string) {
    setRawInput(sample);
    setError(null);
    setSaveMessage(null);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] lg:items-start">
        <div className="space-y-5">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-primary">
              Start here
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Paste a trace. Find the first issue fast.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Drop in JSON, logs, or a trace ID. The debugger parses structure first, falls back to raw text, and gives you the failing step, likely cause, and next fix.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {helperChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">1. Paste</p>
              <p className="mt-2 text-sm leading-6 text-foreground">Bring the raw trace, log, or JSON into one box.</p>
            </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">2. Analyze</p>
                <p className="mt-2 text-sm leading-6 text-foreground">We isolate the first failure signal and the likely cause.</p>
              </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">3. Fix</p>
              <p className="mt-2 text-sm leading-6 text-foreground">Use the next-step fix or save it for replay and comparison.</p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-white/8 bg-card/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3 border-b border-white/8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Paste trace</CardTitle>
                <CardDescription>Structured parsing first, raw text fallback.</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                Instant analysis
              </Badge>
            </div>
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
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Trace, log, or JSON</span>
              <textarea
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                rows={14}
                className="min-h-[340px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                placeholder={SAMPLE_JSON}
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            {saveMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleAnalyze()} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                Analyze
              </Button>
              {analysis?.canSave ? (
                <Button variant="outline" onClick={() => void handleSave()} disabled={saveBusy} className="gap-2">
                  {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save this trace
                </Button>
              ) : null}
              {analysis?.traceId ? (
                <Button variant="ghost" asChild className="gap-2">
                  <Link href={`/traces/${analysis.traceId}`}>
                    Open trace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-white/8 bg-card/90">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>What broke</CardTitle>
                <CardDescription>
                  {analysis ? `${analysis.sourceLabel} · ${analysis.parsedEntries} signal${analysis.parsedEntries === 1 ? "" : "s"}` : "No analysis yet"}
                </CardDescription>
              </div>
              {analysis ? <Badge variant={summaryTone(analysis.confidence)}>{analysis.confidence}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis ? (
              <>
                <p className="text-xl font-semibold tracking-tight text-foreground">{analysis.summary}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Likely failing step" value={analysis.failureLocation} />
                  <MetricCard label="Likely cause" value={analysis.likelyCause} />
                </div>
                {analysis.traceId ? (
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.035] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trace ID</p>
                    <p className="mt-2 font-mono text-sm text-foreground">{analysis.traceId}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {analysis.hydrated ? "Hydrated from the saved trace timeline." : "Recognized from the pasted input."}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/8 bg-white/[0.025] p-5 text-sm leading-7 text-muted-foreground">
                Paste a trace and click <span className="font-medium text-foreground">Analyze</span>.
                You will get the failing step, likely cause, suggested fix, and evidence here.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <CardTitle>Why this step looks risky</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <p className="text-sm leading-7 text-muted-foreground">{analysis.likelyCause}</p>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">The debugger will map the trace against the most likely failure pattern.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <CardTitle>Suggested next fix</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <p className="text-sm leading-7 text-muted-foreground">{analysis.suggestedFix}</p>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">You will get a concrete next step instead of a vague platform verdict.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-card/90 sm:col-span-2">
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
              <CardDescription>Signals used to produce the analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <ul className="grid gap-2 md:grid-cols-2">
                  {analysis.evidence.map((item) => (
                    <li key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">Matched lines, structured steps, and timing signals will show up here after analysis.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Advanced workflows</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Save, replay, and gate later.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ADVANCED_CAPABILITIES.map((item) => (
            <FeatureCard
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

"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
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

import { buildAppAuthHref } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ParseKind = "raw" | "json" | "trace-id";
type Confidence = "low" | "medium" | "high";

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
  parsedEntries: number;
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
          score: scoreText(text, status),
        };
      }),
      sourceLabel: "Structured JSON",
    };
  }

  if (parsed.kind === "json") {
    return {
      entries:
        parsed.lines.length > 0
          ? parsed.lines.map((line, index) => ({ label: inferLineLabel(line, index + 1), text: line, status: null, score: scoreText(line, null) }))
          : [{ label: "JSON payload", text: stringifyValue(parsed.parsed), status: null, score: scoreText(stringifyValue(parsed.parsed), null) }],
      sourceLabel: "JSON paste",
    };
  }

  return {
    entries:
      parsed.lines.length > 0
        ? parsed.lines.map((line, index) => ({ label: inferLineLabel(line, index + 1), text: line, status: null, score: scoreText(line, null) }))
        : [{ label: "Paste", text: parsed.raw, status: null, score: scoreText(parsed.raw, null) }],
    sourceLabel: parsed.kind === "trace-id" ? "Trace ID" : "Raw logs",
  };
}

function analyzeTrace(parsed: ParseResult): AnalysisResult {
  const { entries, sourceLabel } = buildEntries(parsed);
  const bestExplicitFailure = entries.findIndex((entry) => /error|failed|failure|timeout|retry/i.test(entry.status ?? ""));
  const bestHeuristic = entries.reduce<{ index: number; entry: Entry; score: number }>(
    (best, entry, index) => (entry.score > best.score ? { index, entry, score: entry.score } : best),
    { index: 0, entry: entries[0] ?? { label: "Trace", text: parsed.raw, status: null, score: 0 }, score: -1 }
  );
  const failureIndex = bestExplicitFailure >= 0 ? bestExplicitFailure : bestHeuristic.index;
  const failureEntry = entries[failureIndex] ?? bestHeuristic.entry;
  const lastHealthy = entries
    .slice(0, failureIndex)
    .reverse()
    .find((entry) => !/error|failed|failure|timeout|retry/i.test(entry.status ?? "") && entry.score < failureEntry.score);
  const cause = classifyCause(`${failureEntry.label} ${failureEntry.text} ${entries.map((entry) => entry.text).join(" ")}`);
  const explicitFailure =
    /error|failed|failure|timeout|retry/i.test(failureEntry.status ?? "") ||
    /error|failed|failure|timeout|retry/i.test(failureEntry.text);
  const allSuccess = entries.every((e) => /^success$/i.test(e.status ?? ""));
  const confidence: Confidence = explicitFailure ? "high" : bestHeuristic.entry.score > 5 ? "medium" : "low";

  const evidence = [
    `${entries.length} signal${entries.length === 1 ? "" : "s"} scanned from ${sourceLabel.toLowerCase()}`,
    `First issue signal: ${failureEntry.label}`,
    `Matched likely cause: ${cause.cause}`,
  ];
  if (lastHealthy) {
    evidence.push(`Last healthy step: ${lastHealthy.label}`);
  }
  if (parsed.traceId) {
    evidence.push(`Trace ID: ${parsed.traceId}`);
  }

  return {
    sourceLabel,
    confidence,
    summary: allSuccess
      ? `All ${entries.length} steps completed successfully — no failure detected.`
      : explicitFailure
      ? `The trace points to ${failureEntry.label}.`
      : `The trace most likely points to ${failureEntry.label}.`,
    failureLocation: allSuccess ? "None" : failureEntry.label,
    likelyCause: allSuccess ? "no failure signals found" : cause.cause,
    suggestedFix: allSuccess
      ? "The trace looks clean. To stress-test it, try mutation testing — inject schema drift, latency, or tool errors."
      : cause.fix,
    evidence,
    traceId: parsed.traceId,
    parsedEntries: entries.length,
  };
}

function summaryTone(confidence: Confidence) {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "outline";
}

function ResultLine({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 px-5 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6 md:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground/80">{description}</p> : null}
      </div>
      <div className="min-w-0 text-sm leading-7 text-foreground">{children}</div>
    </div>
  );
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
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helperChips = useMemo(() => ["JSON traces", "logs", "semi-structured text", "trace IDs"], []);

  function loadSample(sample: string) {
    setRawInput(sample);
    setError(null);
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
      setAnalysis(analyzeTrace(parsed));
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
                <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:bg-accent/45 hover:text-foreground">
                  <Link href={buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" })}>
                    Save this trace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
                <p className="section-kicker">Result</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">What broke</h2>
              </div>
              <Badge
                variant={analysis ? summaryTone(analysis.confidence) : "outline"}
                className={analysis ? "shadow-none" : "border-white/8 bg-white/[0.03] text-muted-foreground"}
              >
                {analysis ? analysis.confidence : "waiting"}
              </Badge>
            </div>

            {analysis ? (
              <>
                <ResultLine title="What happened" description="What the debugger thinks happened">
                  <p className="text-base font-medium leading-7 text-foreground">{analysis.summary}</p>
                </ResultLine>
                <ResultLine
                  title="Likely failing step"
                  description={`${analysis.sourceLabel} · ${analysis.parsedEntries} signal${analysis.parsedEntries === 1 ? "" : "s"} scanned`}
                >
                  <p className="font-medium text-foreground">{analysis.failureLocation}</p>
                </ResultLine>
                <ResultLine title="Why it likely failed">{analysis.likelyCause}</ResultLine>
                <ResultLine title="Suggested next fix">{analysis.suggestedFix}</ResultLine>
                <ResultLine title="Trace context" description="The input used to anchor the analysis">
                  <div className="flex flex-wrap items-center gap-2">
                    {analysis.traceId ? (
                      <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 font-mono text-[11px] text-foreground">
                        {analysis.traceId}
                      </span>
                    ) : null}
                    <Badge variant="outline" className="border-white/8 bg-white/[0.03] text-muted-foreground">
                      Source: {analysis.sourceLabel}
                    </Badge>
                    <Badge variant="outline" className="border-white/8 bg-white/[0.03] text-muted-foreground">
                      {analysis.parsedEntries} signals
                    </Badge>
                  </div>
                </ResultLine>
                <div className="border-t border-border/60 px-5 py-5 md:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
                  <div className="mt-3 grid gap-2">
                    {analysis.evidence.map((item) => (
                      <div key={item} className="rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="px-5 py-6 md:px-6">
                <p className="text-sm leading-7 text-muted-foreground">
                  Paste a trace and click <span className="font-medium text-foreground">Analyze</span>.
                  The sandbox will show the failing step, likely cause, and suggested fix here.
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

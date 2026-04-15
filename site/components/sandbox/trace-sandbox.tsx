"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ClipboardCopy,
  FileSearch,
  Loader2,
} from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────

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

type IssueSeverity = "high" | "medium" | "low";

type IssueKind =
  | "tool-failure"
  | "tool-timeout"
  | "schema-break"
  | "retry-exhausted"
  | "hallucination-risk"
  | "context-overflow"
  | "fallback-triggered";

type IssueCard = {
  id: string;
  kind: IssueKind;
  label: string;
  detail: string;
  step?: string;
  severity: IssueSeverity;
};

// ── Sample traces ─────────────────────────────────────────────────────────

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

// ── Core reliability mutations ────────────────────────────────────────────

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

// ── Parse utilities ───────────────────────────────────────────────────────

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
  const match = value.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
  );
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

  const traceId = parsed
    ? (matchTraceId(stringifyValue(parsed)) ?? directTraceId)
    : directTraceId;
  return { kind: parsed === null ? "raw" : "json", raw, parsed, traceId, lines };
}

function findEntryArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return null;

  const candidates = [
    value.events,
    value.timeline,
    value.steps,
    value.child_runs,
    value.runs,
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
        const status = isPlainObject(entry)
          ? firstString(entry, ["status", "result", "state"])
          : null;
        const label = isPlainObject(entry)
          ? (firstString(entry, [
              "step_name",
              "name",
              "tool",
              "mutation_name",
              "id",
              "step_type",
              "type",
              "run_type",
            ]) ?? `Item ${index + 1}`)
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
          ? parsed.lines.map((line, index) => ({
              label: inferLineLabel(line, index + 1),
              text: line,
              status: null,
              score: 0,
            }))
          : [{ label: "JSON payload", text: stringifyValue(parsed.parsed), status: null, score: 0 }],
      sourceLabel: "JSON paste",
    };
  }

  return {
    entries:
      parsed.lines.length > 0
        ? parsed.lines.map((line, index) => ({
            label: inferLineLabel(line, index + 1),
            text: line,
            status: null,
            score: 0,
          }))
        : [{ label: "Paste", text: parsed.raw, status: null, score: 0 }],
    sourceLabel: parsed.kind === "trace-id" ? "Trace ID" : "Raw logs",
  };
}

const LANGSMITH_TOOL_RUN_TYPES = new Set(["tool", "retriever", "embedding"]);

function hasOutputField(text: string, field: string): boolean {
  return new RegExp(`"${field}"\\s*:`).test(text);
}

function collectLangsmithToolRuns(value: unknown, depth = 0): Entry[] {
  if (depth > 12 || !isPlainObject(value)) return [];
  const results: Entry[] = [];
  const runType = String(value.run_type ?? "").toLowerCase();
  const name = String(value.name ?? "").trim();
  if (LANGSMITH_TOOL_RUN_TYPES.has(runType) && name) {
    results.push({
      label: `Tool · ${shortText(name, 56)}`,
      text: stringifyValue(value),
      status:
        typeof value.error === "string" && (value.error as string).trim()
          ? "error"
          : "success",
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

function isToolEntry(entry: Entry): boolean {
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
  const isLangsmith =
    isPlainObject(rawParsed) &&
    (typeof (rawParsed as Record<string, unknown>).run_type === "string" ||
      Array.isArray((rawParsed as Record<string, unknown>).child_runs));

  const toolEntries: Entry[] = isLangsmith
    ? collectLangsmithToolRuns(rawParsed)
    : entries.filter(isToolEntry);

  const impacts: MutationImpact[] = CORE_RELIABILITY_MUTATIONS.map((mutation) => {
    if (mutation.category === "schema" && mutation.matchField) {
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
      projectedOutcome:
        toolEntries.length > 0 ? mutation.outcomeIfHit : mutation.outcomeIfMiss,
    };
  });
  return { toolStepsFound: toolEntries.length, impacts };
}

// ── Issue detection ───────────────────────────────────────────────────────

function deriveIssues(
  entries: Entry[],
  mutationResult: MutationPackResult | null
): IssueCard[] {
  const issues: IssueCard[] = [];
  const seen = new Set<string>();

  function add(issue: IssueCard) {
    if (!seen.has(issue.id)) {
      seen.add(issue.id);
      issues.push(issue);
    }
  }

  for (const entry of entries) {
    const statusLow = (entry.status ?? "").toLowerCase();

    // Tool failure
    if (["error", "fault", "failed", "failure"].includes(statusLow)) {
      const errorMatch =
        entry.text.match(/"error"\s*:\s*"([^"]{1,120})"/i) ??
        entry.text.match(/error[=:\s]+"?([^"\n,]{1,80})/i);
      const detail = errorMatch?.[1]?.trim() ?? "Step returned an error";
      add({
        id: `tf-${entry.label}`,
        kind: "tool-failure",
        label: "Tool failure",
        detail,
        step: shortStepLabel(entry.label),
        severity: "high",
      });
    }

    // Tool timeout
    if (/tool_timeout|timed?\s*out|\blatency[=:\s]+\d{4,}\s*ms/i.test(entry.text)) {
      const ms = entry.text.match(/latency[=:\s]+(\d+)\s*ms/i)?.[1];
      add({
        id: `to-${entry.label}`,
        kind: "tool-timeout",
        label: "Tool timeout",
        detail: ms
          ? `Step exceeded time limit (${ms} ms)`
          : "Step timed out — no retry policy configured",
        step: shortStepLabel(entry.label),
        severity: "high",
      });
    }

    // Retry exhausted
    if (
      /retry.*abort|abort.*retry|retr.*exhaust|retry.*after\s+1 attempt/i.test(entry.text)
    ) {
      add({
        id: `re-${entry.label}`,
        kind: "retry-exhausted",
        label: "Retry exhausted",
        detail: "Tool call retried and failed — no fallback path configured",
        step: shortStepLabel(entry.label),
        severity: "high",
      });
    }

    // Context overflow
    if (
      /context_overflow|token.*limit.*exceed|tokens[=:\s]+1[6-9]\d{3}|tokens[=:\s]+[2-9]\d{4}/i.test(
        entry.text
      )
    ) {
      const tokens = entry.text.match(/tokens[=:\s]+(\d+)/i)?.[1];
      add({
        id: `co-${entry.label}`,
        kind: "context-overflow",
        label: "Context overflow",
        detail: tokens
          ? `Token count hit the context limit (${tokens} tokens)`
          : "Prompt exceeded context window",
        step: shortStepLabel(entry.label),
        severity: "medium",
      });
    }

    // Fallback triggered
    if (/fallback[=:\s]*true|fallback_activated[=:\s]*true/i.test(entry.text)) {
      add({
        id: `fb-${entry.label}`,
        kind: "fallback-triggered",
        label: "Fallback triggered",
        detail: "Original tool call failed silently — a fallback path was used",
        step: shortStepLabel(entry.label),
        severity: "medium",
      });
    }

    // Hallucination risk
    if (
      statusLow === "degraded" ||
      /output_quality[=:\s]*degraded|stale_cache[=:\s]*true/i.test(entry.text)
    ) {
      add({
        id: `hr-${entry.label}`,
        kind: "hallucination-risk",
        label: "Hallucination risk",
        detail: "LLM received degraded or stale context — output may be unreliable",
        step: shortStepLabel(entry.label),
        severity: "medium",
      });
    }
  }

  // Schema breaks from mutation hits
  if (mutationResult) {
    for (const impact of mutationResult.impacts) {
      if (impact.category === "schema" && impact.targetedSteps.length > 0) {
        add({
          id: `sb-${impact.id}`,
          kind: "schema-break",
          label: "Schema break",
          detail: impact.projectedOutcome,
          step: impact.targetedSteps[0],
          severity: "medium",
        });
      }
    }
  }

  return issues.sort((a, b) => {
    const order: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Issue card meta ───────────────────────────────────────────────────────

const ISSUE_META: Record<
  IssueKind,
  { color: string; bg: string; border: string }
> = {
  "tool-failure": {
    color: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-400/20",
  },
  "tool-timeout": {
    color: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-400/20",
  },
  "retry-exhausted": {
    color: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-400/20",
  },
  "schema-break": {
    color: "text-indigo-300",
    bg: "bg-indigo-500/10",
    border: "border-indigo-400/20",
  },
  "hallucination-risk": {
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/20",
  },
  "context-overflow": {
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/20",
  },
  "fallback-triggered": {
    color: "text-slate-300",
    bg: "bg-white/[0.04]",
    border: "border-white/10",
  },
};

// ── Fix snippets ─────────────────────────────────────────────────────────

const FIX_SNIPPETS: Partial<Record<IssueKind, { lang: string; code: string; note: string }>> = {
  "tool-timeout": {
    lang: "yaml",
    note: "Add a retry policy and lower the timeout on the failing tool call.",
    code: `tool_config:
  timeout: 2000          # ms — fail fast instead of hanging
  retry:
    attempts: 3
    backoff: exponential
  fallback_source: cache_store`,
  },
  "tool-failure": {
    lang: "python",
    note: "Wrap the tool call in a try/except and surface the error before continuing.",
    code: `try:
    result = tool.invoke(params)
except ToolError as e:
    # Log and halt — don't let the agent proceed on a bad result
    span.set_status("error", str(e))
    raise`,
  },
  "retry-exhausted": {
    lang: "yaml",
    note: "Increase retry budget and add a fallback so the agent doesn't proceed on empty.",
    code: `retry:
  attempts: 5
  backoff: exponential
  on_exhaust: raise      # don't swallow the error silently
fallback:
  source: cache_store
  max_age_seconds: 300`,
  },
  "hallucination-risk": {
    lang: "python",
    note: "Gate the LLM call on source quality before invoking.",
    code: `if retrieval_result.count == 0 or retrieval_result.is_stale:
    raise InsufficientContextError(
        "Skipping LLM call — source data unavailable or stale"
    )
response = llm.complete(prompt)`,
  },
  "context-overflow": {
    lang: "python",
    note: "Truncate or summarise the prompt before it hits the model.",
    code: `MAX_TOKENS = 14_000  # leave headroom below your model's limit

if count_tokens(prompt) > MAX_TOKENS:
    prompt = summarize(prompt, target_tokens=MAX_TOKENS)

response = llm.complete(prompt)`,
  },
  "fallback-triggered": {
    lang: "python",
    note: "Treat fallback as a warning signal — log it and check downstream quality.",
    code: `if result.fallback_activated:
    logger.warning(
        "fallback_activated",
        step=span.name,
        reason=result.fallback_reason,
    )
    # Optionally abort rather than continue on stale data
    if not result.data:
        raise FallbackDataMissingError(span.name)`,
  },
  "schema-break": {
    lang: "python",
    note: "Validate the tool response schema before passing it downstream.",
    code: `from pydantic import BaseModel, ValidationError

class ToolResponse(BaseModel):
    status: str   # pin the field names you depend on
    id: str

try:
    validated = ToolResponse(**raw_output)
except ValidationError as e:
    raise SchemaContractError(f"Tool response schema changed: {e}")`,
  },
};

// ── Sub-components ────────────────────────────────────────────────────────

const NEXT_STEPS = [
  {
    label: "Save & replay",
    href: buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" }),
  },
  { label: "Stress test", href: "/product" },
  { label: "Add to CI", href: "/docs/ci-cd" },
  { label: "Compare runs", href: "/product" },
];

function IssueRow({ issue }: { issue: IssueCard }) {
  const meta = ISSUE_META[issue.kind];
  const fix = FIX_SNIPPETS[issue.kind];
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const replayHref = buildAppAuthHref({ mode: "access", intent: "signup", next: "/traces/replay" });

  const handleCopyFix = useCallback(() => {
    if (!fix) return;
    navigator.clipboard.writeText(fix.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fix]);

  return (
    <div className="divide-y divide-border/40">
      <div className="grid gap-3 px-5 py-4 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-5 md:px-6">
        <div className="flex flex-col gap-1.5">
          <span
            className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] border ${meta.color} ${meta.bg} ${meta.border}`}
          >
            {issue.label}
          </span>
          {issue.step && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {issue.step}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm leading-6 text-muted-foreground">{issue.detail}</p>
          <div className="flex items-center gap-4">
            {fix && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-primary transition-colors hover:brightness-125"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                />
                {open ? "Hide fix" : "See fix"}
              </button>
            )}
            <Link
              href={replayHref}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Replay step <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {open && fix && (
        <div className="px-5 pb-4 pt-3 md:px-6">
          <p className="mb-2 text-xs text-muted-foreground">{fix.note}</p>
          <div className="relative">
            <pre
              className="overflow-x-auto rounded-xl p-4 font-mono text-[12px] leading-5"
              style={{
                background: "rgba(124,58,237,0.05)",
                border: "1px solid rgba(124,58,237,0.15)",
                color: "rgba(167,139,250,0.85)",
              }}
            >
              {fix.code}
            </pre>
            <button
              type="button"
              onClick={handleCopyFix}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ClipboardCopy className="h-3 w-3" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBanner({
  total,
  highCount,
  onCopy,
  copied,
}: {
  total: number;
  highCount: number;
  onCopy: () => void;
  copied: boolean;
}) {
  const mediumCount = total - highCount;
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-foreground">
          {total} issue{total !== 1 ? "s" : ""} found
        </span>
        {highCount > 0 && (
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300">
            {highCount} critical
          </span>
        )}
        {mediumCount > 0 && (
          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
            {mediumCount} warning
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ClipboardCopy className="h-3 w-3" />
        {copied ? "Copied" : "Copy report"}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function TraceSandbox() {
  const [rawInput, setRawInput] = useState(SAMPLE_JSON);
  const [issueCards, setIssueCards] = useState<IssueCard[]>([]);
  const [mutationResult, setMutationResult] = useState<MutationPackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [copied, setCopied] = useState(false);

  async function runAnalysis(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = parseTraceInput(trimmed);
      const { entries } = buildEntries(parsed);
      const mutations = applyCoreMutations(entries, parsed.parsed);
      const issues = deriveIssues(entries, mutations);
      setMutationResult(mutations);
      setIssueCards(issues);
      setHasRun(true);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Failed to analyze trace"
      );
    } finally {
      setBusy(false);
    }
  }

  // Auto-analyze the pre-loaded sample so first-time visitors see results immediately
  useEffect(() => {
    void runAnalysis(SAMPLE_JSON);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSample(sample: string) {
    setRawInput(sample);
    setError(null);
    void runAnalysis(sample);
  }

  async function handleAnalyze() {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError("Paste a trace, log, or JSON payload first.");
      return;
    }
    await runAnalysis(trimmed);
  }

  function handleCopy() {
    const lines = [
      "Sepurux debug results",
      "─".repeat(40),
      `Issues found: ${issueCards.length}`,
      "",
      ...issueCards.map(
        (c) =>
          `[${c.severity.toUpperCase()}] ${c.label}${c.step ? ` (${c.step})` : ""}\n  ${c.detail}`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const highCount = issueCards.filter((i) => i.severity === "high").length;

  return (
    <div className="mx-auto max-w-[88rem]">
      <section className="section-shell overflow-hidden">

        {/* Header */}
        <div className="border-b border-border/60 px-5 py-5 md:px-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Debug a trace
            </h1>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              Paste any trace — JSON, logs, or a trace ID. See what broke and how to fix it.
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">

          {/* Left: Input */}
          <div className="border-b border-border/60 xl:border-b-0 xl:border-r xl:border-border/60">
            <div className="space-y-4 px-5 pb-5 pt-5 md:px-6 md:pb-6">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={14}
                className="min-h-[380px] w-full rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.025)] px-4 py-3 font-mono text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                placeholder="Paste a trace, log output, or JSON here…"
              />

              {/* Subtle sample links */}
              <p className="text-[11px] text-muted-foreground/60">
                Try an example:{" "}
                <button
                  type="button"
                  onClick={() => loadSample(SAMPLE_JSON)}
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  JSON trace
                </button>
                {" · "}
                <button
                  type="button"
                  onClick={() => loadSample(SAMPLE_LOG)}
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Log output
                </button>
                {" · "}
                <button
                  type="button"
                  onClick={() => loadSample(SAMPLE_TRACE_ID)}
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Trace ID
                </button>
              </p>

              {error && (
                <p className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              )}

              <Button
                onClick={() => void handleAnalyze()}
                disabled={busy}
                className="gap-2"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSearch className="h-4 w-4" />
                )}
                Debug trace
              </Button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="divide-y divide-border/60">
            {hasRun ? (
              issueCards.length > 0 ? (
                <>
                  <SummaryBanner
                    total={issueCards.length}
                    highCount={highCount}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                  <div className="divide-y divide-border/60">
                    {issueCards.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </div>
                  {/* Progressive disclosure: system layer */}
                  <div className="flex flex-wrap items-center gap-2 px-5 py-4 md:px-6">
                    <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
                      Next:
                    </span>
                    {NEXT_STEPS.map((step) => (
                      <Link
                        key={step.label}
                        href={step.href}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-white/16 hover:text-foreground"
                      >
                        {step.label} <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-5 py-6 md:px-6">
                  <p className="text-sm text-muted-foreground">
                    No known failure patterns detected in this trace.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {NEXT_STEPS.map((step) => (
                      <Link
                        key={step.label}
                        href={step.href}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-white/16 hover:text-foreground"
                      >
                        {step.label} <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 px-5 py-8 md:px-6">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Analyzing trace…</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Paste a trace above and click{" "}
                    <span className="font-medium text-foreground">Debug trace</span>{" "}
                    to run.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

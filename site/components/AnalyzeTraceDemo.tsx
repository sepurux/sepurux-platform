"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

type SpanStatus = "success" | "fault" | "degraded";

interface TraceSpan {
  id: string;
  label: string;
  type: string;
  status: SpanStatus;
  latencyMs: number;
  tool?: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error?: string;
  errorCode?: string;
}

const MAX_LATENCY = 4821;

const SPANS: TraceSpan[] = [
  {
    id: "span_a1b2c3",
    label: "Input",
    type: "input",
    status: "success",
    latencyMs: 12,
    input: { query: "Summarize Q3 revenue report for board presentation", token_count: 847 },
    output: { routed_to: "fetch_document" },
  },
  {
    id: "span_d4e5f6",
    label: "fetch_document",
    type: "tool_call",
    status: "fault",
    latencyMs: 4821,
    tool: "fetch_document",
    input: { document_id: "rev_q3_2024", format: "markdown" },
    output: null,
    error: "TimeoutError: fetch_document exceeded 5000ms threshold",
    errorCode: "TOOL_TIMEOUT",
  },
  {
    id: "span_g7h8i9",
    label: "vector_search",
    type: "retrieval",
    status: "degraded",
    latencyMs: 1203,
    tool: "vector_search",
    input: { query: "Q3 revenue financial summary", top_k: 5 },
    output: { results_count: 0, fallback_activated: true },
  },
  {
    id: "span_j1k2l3",
    label: "llm_completion",
    type: "llm",
    status: "degraded",
    latencyMs: 892,
    tool: "gpt-4o",
    input: { prompt_tokens: 412, temperature: 0.2 },
    output: { completion_tokens: 89, finish_reason: "stop" },
  },
  {
    id: "span_m4n5o6",
    label: "Output",
    type: "output",
    status: "degraded",
    latencyMs: 0,
    input: {},
    output: { text: "[incomplete — primary source unavailable, using stale cache]" },
  },
];

const DIAGNOSIS = {
  rootCause:
    "fetch_document timed out after 4.8s. No retry policy is configured on this tool call. The agent proceeded without a valid document source.",
  affected: [
    { id: "span_g7h8i9", label: "vector_search", note: "returned 0 results — fallback activated" },
    { id: "span_j1k2l3", label: "llm_completion", note: "completed with stale cache — output degraded" },
    { id: "span_m4n5o6", label: "Output", note: "marked incomplete, missing source data" },
  ],
  fix: [
    "fetch_document:",
    "  timeout: 2000",
    "  retry:",
    "    attempts: 3",
    '    backoff: "exponential"',
    '  fallback_source: "cache_store"',
  ],
};

const COPY_TEXT = [
  "Sepurux found 3 issues in agent: revenue-summarizer",
  "",
  "Fault: fetch_document timed out after 4.8s (TOOL_TIMEOUT)",
  "",
  "What broke next:",
  "- vector_search: returned 0 results, fallback activated",
  "- llm_completion: completed with stale cache, output degraded",
  "- Output: marked incomplete, missing source data",
  "",
  "Root cause: fetch_document timed out with no retry policy.",
  "",
  "Suggested fix:",
  "fetch_document:",
  "  timeout: 2000",
  "  retry:",
  "    attempts: 3",
  '    backoff: "exponential"',
  '  fallback_source: "cache_store"',
].join("\n");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status: SpanStatus) {
  if (status === "success") {
    return {
      color: "#10B981",
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.22)",
      label: "OK",
    };
  }
  if (status === "fault") {
    return {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.28)",
      label: "FAULT",
    };
  }
  return {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.22)",
    label: "DEGRADED",
  };
}

function fmt(json: Record<string, unknown>): string {
  return JSON.stringify(json, null, 2);
}

function fmtMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

// ─── Scan step (analyzing phase) ─────────────────────────────────────────────

function ScanStep({ label, doneAt }: { label: string; doneAt: number }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), doneAt);
    return () => clearTimeout(t);
  }, [doneAt]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: doneAt / 4000 }}
      className="flex items-center gap-2.5"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {!done && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: "rgba(167,139,250,0.7)" }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full transition-colors duration-300"
          style={{ background: done ? "#34D399" : "rgba(167,139,250,0.7)" }}
        />
      </span>
      <span
        className="font-mono text-[11px] transition-colors duration-300"
        style={{ color: done ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.45)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ─── Span node ────────────────────────────────────────────────────────────────

interface SpanNodeProps {
  span: TraceSpan;
  isSelected: boolean;
  onClick: () => void;
}

function SpanNode({ span, isSelected, onClick }: SpanNodeProps) {
  const meta = statusMeta(span.status);
  const barPct =
    span.latencyMs === 0 ? 1 : Math.max(2, (span.latencyMs / MAX_LATENCY) * 100);

  return (
    <button
      onClick={onClick}
      className="group flex min-w-[128px] flex-col gap-2.5 rounded-lg p-3 text-left transition-all duration-150"
      style={{
        background: isSelected ? "rgba(124,58,237,0.10)" : meta.bg,
        border: `1px solid ${isSelected ? "rgba(124,58,237,0.45)" : meta.border}`,
        outline: "none",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {span.status === "fault" && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: meta.color }}
            />
          )}
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: meta.color }}
          />
        </span>
        <span
          className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <p className="max-w-[112px] truncate font-mono text-[11px] font-medium text-white/75">
        {span.label}
      </p>

      <div className="space-y-1">
        <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {fmtMs(span.latencyMs)}
        </span>
        <div className="h-px w-full rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-px rounded-full"
            style={{ width: `${barPct}%`, background: meta.color, opacity: 0.7 }}
          />
        </div>
      </div>
    </button>
  );
}

// ─── Span detail ──────────────────────────────────────────────────────────────

function SpanDetail({ span }: { span: TraceSpan }) {
  const meta = statusMeta(span.status);

  return (
    <motion.div
      key={span.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="space-y-4 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            span_id
          </p>
          <p className="font-mono text-[11px] text-white/60">{span.id}</p>
        </div>
        {span.tool && (
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
              tool
            </p>
            <p className="font-mono text-[11px] text-white/60">{span.tool}</p>
          </div>
        )}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            duration
          </p>
          <p className="font-mono text-[11px]" style={{ color: meta.color }}>
            {fmtMs(span.latencyMs)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            status
          </p>
          <p className="font-mono text-[11px] font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </p>
        </div>
      </div>

      {Object.keys(span.input).length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            input
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 font-mono text-[11px] leading-5"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {fmt(span.input)}
          </pre>
        </div>
      )}

      {span.error ? (
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "#EF4444" }}>
            error
          </p>
          <div
            className="rounded-md p-3"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="font-mono text-[11px] leading-5" style={{ color: "#F87171" }}>
              {span.error}
            </p>
            {span.errorCode && (
              <p className="mt-1 font-mono text-[10px]" style={{ color: "rgba(239,68,68,0.6)" }}>
                {span.errorCode}
              </p>
            )}
          </div>
        </div>
      ) : span.output ? (
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            output
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 font-mono text-[11px] leading-5"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {fmt(span.output)}
          </pre>
        </div>
      ) : null}
    </motion.div>
  );
}

// ─── Diagnosis panel ──────────────────────────────────────────────────────────

function DiagnosisPanel({
  highlightedSpanId,
  onCopy,
  copied,
}: {
  highlightedSpanId: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      {/* Header: label + copy button */}
      <div className="flex items-center justify-between gap-2">
        <p
          className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{
            background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Debugger output
        </p>
        <button
          onClick={onCopy}
          className="shrink-0 rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-all duration-150"
          style={{
            background: copied ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${copied ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}`,
            color: copied ? "rgba(52,211,153,0.85)" : "rgba(255,255,255,0.3)",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Root cause */}
      <div className="space-y-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Root Cause
        </p>
        <p className="font-mono text-[11px] leading-5" style={{ color: "rgba(255,255,255,0.65)" }}>
          {DIAGNOSIS.rootCause}
        </p>
      </div>

      {/* What broke next */}
      <div className="space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          What broke next
        </p>
        <div className="space-y-1.5">
          {DIAGNOSIS.affected.map((item) => (
            <div
              key={item.id}
              className="rounded-md p-2.5 transition-colors duration-150"
              style={{
                background:
                  highlightedSpanId === item.id
                    ? "rgba(124,58,237,0.08)"
                    : "rgba(255,255,255,0.025)",
                border: `1px solid ${
                  highlightedSpanId === item.id
                    ? "rgba(124,58,237,0.2)"
                    : "rgba(255,255,255,0.06)"
                }`,
              }}
            >
              <p className="font-mono text-[10px] font-medium text-white/60">{item.label}</p>
              <p className="font-mono text-[10px] leading-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested fix */}
      <div className="space-y-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Suggested Fix
        </p>
        <div
          className="rounded-md p-3"
          style={{
            background: "rgba(124,58,237,0.05)",
            border: "1px solid rgba(124,58,237,0.15)",
          }}
        >
          {DIAGNOSIS.fix.map((line, i) => (
            <p key={i} className="font-mono text-[11px] leading-5" style={{ color: "rgba(167,139,250,0.8)" }}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Before / After */}
      <div className="space-y-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Before / After
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-md p-2.5"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.13)",
            }}
          >
            <p
              className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "rgba(239,68,68,0.65)" }}
            >
              Without
            </p>
            <p className="font-mono text-[10px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.38)" }}>
              Retries endlessly
              <br />
              Fails silently
            </p>
          </div>
          <div
            className="rounded-md p-2.5"
            style={{
              background: "rgba(52,211,153,0.05)",
              border: "1px solid rgba(52,211,153,0.13)",
            }}
          >
            <p
              className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "rgba(52,211,153,0.65)" }}
            >
              With fix
            </p>
            <p className="font-mono text-[10px] leading-[1.55]" style={{ color: "rgba(255,255,255,0.38)" }}>
              Timeout + retry
              <br />
              Request succeeds
            </p>
          </div>
        </div>
      </div>

      {/* Inline CTA */}
      <Link
        href="/sandbox"
        className="group flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "rgba(124,58,237,0.1)",
          border: "1px solid rgba(124,58,237,0.22)",
          color: "rgba(167,139,250,0.9)",
        }}
      >
        Debug your own trace
        <span
          className="transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden
        >
          →
        </span>
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyzeTraceDemo() {
  const [selectedId, setSelectedId] = useState<string>("span_d4e5f6");
  const [phase, setPhase] = useState<"analyzing" | "ready">("analyzing");
  const [copied, setCopied] = useState(false);

  const selectedSpan = SPANS.find((s) => s.id === selectedId)!;
  const totalLatency = SPANS.reduce((sum, s) => sum + s.latencyMs, 0);

  useEffect(() => {
    const t = setTimeout(() => setPhase("ready"), 1100);
    return () => clearTimeout(t);
  }, []);

  function handleCopy() {
    void navigator.clipboard.writeText(COPY_TEXT).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="w-full overflow-hidden rounded-xl"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.06)",
      }}
    >
      {/* Trace header — always visible */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              trace_id
            </p>
            <p className="font-mono text-[11px] text-white/50">trc_8f2d94a1c3e7</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              agent
            </p>
            <p className="font-mono text-[11px] text-white/50">revenue-summarizer</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              total
            </p>
            <p className="font-mono text-[11px] text-white/50">{fmtMs(totalLatency)}</p>
          </div>
        </div>

        {/* Status badge: transitions from Scanning → Faulted */}
        <AnimatePresence mode="wait">
          {phase === "analyzing" ? (
            <motion.div
              key="scanning-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: "rgba(167,139,250,0.8)" }}
                />
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: "rgba(167,139,250,0.8)" }}
                />
              </span>
              <span
                className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgba(167,139,250,0.9)" }}
              >
                Scanning
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="faulted-badge"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-red-400">
                Faulted
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body: analyzing phase vs. result */}
      <AnimatePresence mode="wait">
        {phase === "analyzing" ? (
          <motion.div
            key="analyzing-body"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="p-5"
          >
            <p
              className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Processing — trc_8f2d94a1c3e7
            </p>
            <div className="space-y-3">
              <ScanStep label="Parsing span graph…" doneAt={180} />
              <ScanStep label="Detecting fault patterns…" doneAt={520} />
              <ScanStep label="Building root cause report…" doneAt={880} />
            </div>
            {/* Ghost spans to hold approximate height */}
            <div className="mt-6 hidden items-start gap-2 sm:flex">
              {SPANS.map((s) => (
                <div
                  key={s.id}
                  className="h-[86px] min-w-[128px] rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                />
              ))}
            </div>
            {/* Ghost diagnosis */}
            <div className="mt-4 h-32 rounded-lg" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }} />
          </motion.div>
        ) : (
          <motion.div
            key="ready-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col lg:flex-row"
          >
            {/* Left: spans + detail */}
            <div
              className="min-w-0 flex-1 border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              {/* Span flow */}
              <div className="p-4 sm:p-5">
                {/* Desktop: horizontal with stagger */}
                <div className="hidden items-start gap-2 overflow-x-auto pb-1 sm:flex">
                  {SPANS.map((span, i) => (
                    <motion.div
                      key={span.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: i * 0.07 }}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <SpanNode
                        span={span}
                        isSelected={selectedId === span.id}
                        onClick={() => setSelectedId(span.id)}
                      />
                      {i < SPANS.length - 1 && (
                        <motion.svg
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: i * 0.07 + 0.12 }}
                          width="16"
                          height="10"
                          viewBox="0 0 16 10"
                          fill="none"
                          className="shrink-0"
                        >
                          <path
                            d="M0 5h13M9 1l4 4-4 4"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </motion.svg>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Mobile: vertical */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {SPANS.map((span, i) => (
                    <div key={span.id} className="flex flex-col gap-2">
                      <SpanNode
                        span={span}
                        isSelected={selectedId === span.id}
                        onClick={() => setSelectedId(span.id)}
                      />
                      {i < SPANS.length - 1 && (
                        <div className="flex justify-center">
                          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                            <path
                              d="M5 0v13M1 9l4 4 4-4"
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Span detail */}
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div
                  className="flex items-center gap-2 px-4 py-2.5 sm:px-5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    Span detail
                  </span>
                  <span
                    className="font-mono text-[9px] font-medium"
                    style={{ color: statusMeta(selectedSpan.status).color }}
                  >
                    — {selectedSpan.label}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <SpanDetail key={selectedId} span={selectedSpan} />
                </AnimatePresence>
              </div>
            </div>

            {/* Right: diagnosis — slides in */}
            <motion.div
              className="w-full shrink-0 lg:w-[272px]"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.22 }}
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 sm:px-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Analysis
                </span>
              </div>
              <DiagnosisPanel
                highlightedSpanId={selectedId}
                onCopy={handleCopy}
                copied={copied}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

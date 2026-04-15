"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

function statusMeta(status: SpanStatus) {
  if (status === "success") {
    return {
      color: "#10B981",
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.22)",
      selectedBorder: "rgba(16,185,129,0.4)",
      label: "OK",
    };
  }
  if (status === "fault") {
    return {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.28)",
      selectedBorder: "rgba(239,68,68,0.5)",
      label: "FAULT",
    };
  }
  return {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.22)",
    selectedBorder: "rgba(245,158,11,0.4)",
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
      {/* Status pill */}
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

      {/* Label */}
      <p className="truncate font-mono text-[11px] font-medium text-white/75 max-w-[112px]">
        {span.label}
      </p>

      {/* Latency + bar */}
      <div className="space-y-1">
        <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {fmtMs(span.latencyMs)}
        </span>
        <div
          className="h-px w-full rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-px rounded-full"
            style={{ width: `${barPct}%`, background: meta.color, opacity: 0.7 }}
          />
        </div>
      </div>
    </button>
  );
}

interface SpanDetailProps {
  span: TraceSpan;
}

function SpanDetail({ span }: SpanDetailProps) {
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
      {/* Span header row */}
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

      {/* Input */}
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

      {/* Output or Error */}
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

function DiagnosisPanel({ highlightedSpanId }: { highlightedSpanId: string }) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      <div>
        <p
          className="mb-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{
            background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Debugger output
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Root Cause
        </p>
        <p className="font-mono text-[11px] leading-5" style={{ color: "rgba(255,255,255,0.65)" }}>
          {DIAGNOSIS.rootCause}
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>
          What broke next
        </p>
        <div className="space-y-1.5">
          {DIAGNOSIS.affected.map((item) => (
            <div
              key={item.id}
              className="rounded-md p-2.5 transition-colors"
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
    </div>
  );
}

export function AnalyzeTraceDemo() {
  const [selectedId, setSelectedId] = useState<string>("span_d4e5f6");

  const selectedSpan = SPANS.find((s) => s.id === selectedId)!;
  const totalLatency = SPANS.reduce((sum, s) => sum + s.latencyMs, 0);

  return (
    <div
      className="w-full overflow-hidden rounded-xl"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.06)",
      }}
    >
      {/* Trace header */}
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
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-red-400">
            Faulted
          </span>
        </div>
      </div>

      {/* Body: trace left, diagnosis right */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: spans + detail */}
        <div className="min-w-0 flex-1 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {/* Span flow */}
          <div className="p-4 sm:p-5">
            {/* Desktop: horizontal */}
            <div className="hidden items-start gap-2 sm:flex overflow-x-auto pb-1">
              {SPANS.map((span, i) => (
                <div key={span.id} className="flex shrink-0 items-center gap-2">
                  <SpanNode
                    span={span}
                    isSelected={selectedId === span.id}
                    onClick={() => setSelectedId(span.id)}
                  />
                  {i < SPANS.length - 1 && (
                    <svg
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
                    </svg>
                  )}
                </div>
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
          <div
            className="border-t"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 sm:px-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
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

        {/* Right: diagnosis */}
        <div
          className="w-full shrink-0 lg:w-[272px]"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 sm:px-5 lg:border-b-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Analysis
            </span>
          </div>
          <DiagnosisPanel highlightedSpanId={selectedId} />
        </div>
      </div>
    </div>
  );
}

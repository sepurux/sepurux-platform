"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventStatus = "success" | "failure" | "pending";

interface TraceEvent {
  id: string;
  type: string;
  name: string;
  status: EventStatus;
  latency_ms?: number;
  mutation?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface SampleTrace {
  id: string;
  label: string;
  task: string;
  source: string;
  sdk: string;
  status: "valid" | "invalid";
  events: TraceEvent[];
  description: string;
}

// ---------------------------------------------------------------------------
// Sample trace data
// ---------------------------------------------------------------------------

const TRACES: SampleTrace[] = [
  {
    id: "refund-flow",
    label: "Refund Flow",
    task: "customer_refund_flow",
    source: "sdk",
    sdk: "py/0.5.0",
    status: "valid",
    description: "End-to-end refund processing: ticket classification, payment refund, confirmation.",
    events: [
      {
        id: "e1",
        type: "prompt",
        name: "customer_refund_flow",
        status: "success",
        input: { ticket_id: "t-101", channel: "email" },
      },
      {
        id: "e2",
        type: "model",
        name: "classify_ticket",
        status: "success",
        latency_ms: 312,
        input: { ticket_id: "t-101", text: "I was charged twice for my order last week." },
        output: { label: "duplicate_charge", confidence: 0.97, priority: "high" },
      },
      {
        id: "e3",
        type: "tool_call",
        name: "payments.refund",
        status: "success",
        input: { payment_id: "pay_123", amount: 4200, currency: "usd", reason: "duplicate_charge" },
      },
      {
        id: "e4",
        type: "tool_result",
        name: "payments.refund",
        status: "success",
        output: { refund_id: "rf_123", status: "queued", eta_days: 3 },
      },
      {
        id: "e5",
        type: "agent_output",
        name: "agent_finish",
        status: "success",
        latency_ms: 88,
        output: { message: "Refund of $42.00 queued for 3-day processing.", refund_id: "rf_123" },
      },
    ],
  },
  {
    id: "support-triage",
    label: "Support Triage",
    task: "support_ticket_triage",
    source: "langchain",
    sdk: "py/0.5.0",
    status: "valid",
    description: "Multi-step LLM pipeline that classifies, enriches, and drafts a support reply.",
    events: [
      {
        id: "e1",
        type: "prompt",
        name: "support_ticket_triage",
        status: "success",
        input: { ticket_id: "t-204", channel: "slack" },
      },
      {
        id: "e2",
        type: "llm_call",
        name: "gpt-4o",
        status: "success",
        latency_ms: 841,
        input: { messages: [{ role: "user", content: "My export keeps failing at 99%" }] },
        output: { label: "bug", priority: "p2", keywords: ["export", "timeout"] },
      },
      {
        id: "e3",
        type: "tool_call",
        name: "db.get_ticket_history",
        status: "success",
        input: { user_id: "u-88", limit: 5 },
      },
      {
        id: "e4",
        type: "tool_result",
        name: "db.get_ticket_history",
        status: "success",
        output: { tickets: [{ id: "t-190", status: "resolved", topic: "export" }], count: 1 },
      },
      {
        id: "e5",
        type: "llm_call",
        name: "gpt-4o",
        status: "success",
        latency_ms: 1204,
        input: { messages: [{ role: "user", content: "Draft a support reply for a repeat export issue." }] },
        output: { reply: "Hi! I can see this is a recurring issue — our team is investigating a timeout in the export pipeline. I'll personally follow up within 2 hours." },
      },
      {
        id: "e6",
        type: "agent_output",
        name: "agent_finish",
        status: "success",
        latency_ms: 44,
        output: { reply_sent: true, ticket_priority: "p2", escalated: false },
      },
    ],
  },
  {
    id: "code-review",
    label: "Code Review Agent",
    task: "code_review_agent",
    source: "sdk",
    sdk: "py/0.5.0",
    status: "valid",
    description: "PR review agent that fetches the diff, analyses it with an LLM, and posts inline comments — with a simulated mutation showing schema fault injection.",
    events: [
      {
        id: "e1",
        type: "prompt",
        name: "code_review_agent",
        status: "success",
        input: { pr_number: 412, repo: "acme/api", author: "alice" },
      },
      {
        id: "e2",
        type: "llm_call",
        name: "claude-sonnet-4-6",
        status: "success",
        latency_ms: 1873,
        input: { messages: [{ role: "user", content: "Review PR #412: adds payment retry logic" }] },
        output: { summary: "Good overall structure. Concern: retry loop lacks exponential back-off.", severity: "medium" },
      },
      {
        id: "e3",
        type: "tool_call",
        name: "github.get_diff",
        status: "success",
        input: { pr_number: 412, repo: "acme/api" },
      },
      {
        id: "e4",
        type: "tool_result",
        name: "github.get_diff",
        status: "success",
        mutation: "fault.timeout → status renamed to state",
        output: { state: "timeout", files_changed: 3, additions: 47, deletions: 12 },
      },
      {
        id: "e5",
        type: "tool_call",
        name: "github.post_comment",
        status: "failure",
        input: { pr_number: 412, body: "Consider adding exponential back-off to the retry loop.", line: 88 },
      },
      {
        id: "e6",
        type: "failure",
        name: "github.post_comment",
        status: "failure",
        output: { error: "Unexpected field 'state' in diff response — expected 'status'.", type: "schema_mismatch" },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function typeColor(type: string): string {
  switch (type) {
    case "prompt":
      return "bg-sky-400/10 text-sky-400 border-sky-400/20";
    case "model":
    case "llm_call":
      return "bg-violet-400/10 text-violet-400 border-violet-400/20";
    case "tool_call":
      return "bg-amber-400/10 text-amber-400 border-amber-400/20";
    case "tool_result":
      return "bg-teal-400/10 text-teal-400 border-teal-400/20";
    case "agent_output":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
    case "failure":
      return "bg-rose-400/10 text-rose-400 border-rose-400/20";
    default:
      return "bg-white/5 text-neutral-400 border-white/10";
  }
}

function dotColor(status: EventStatus): string {
  if (status === "success") return "border-teal-400 bg-teal-400/20";
  if (status === "failure") return "border-rose-400 bg-rose-400/20";
  return "border-neutral-500 bg-neutral-500/20";
}

function statusBadge(status: EventStatus): string {
  if (status === "success") return "bg-teal-400/10 text-teal-400";
  if (status === "failure") return "bg-rose-400/10 text-rose-400";
  return "bg-white/5 text-neutral-400";
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function JsonBlock({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-neutral-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EventRow({ event }: { event: TraceEvent }) {
  const [open, setOpen] = useState(false);
  const hasPayload = event.input != null || event.output != null;

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div
        className={`absolute -left-[1.5rem] top-[1.125rem] h-3 w-3 rounded-full border-2 bg-[#0a0a0f] ${dotColor(event.status)}`}
      />

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{event.name}</span>
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${typeColor(event.type)}`}>
              {event.type.replace(/_/g, " ")}
            </span>
            {event.mutation ? (
              <span className="shrink-0 rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                ⚡ {event.mutation}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {event.latency_ms != null ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400">
                {formatMs(event.latency_ms)}
              </span>
            ) : null}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(event.status)}`}>
              {event.status}
            </span>
          </div>
        </div>

        {/* Payload toggle */}
        {hasPayload ? (
          <div className="border-t border-white/5">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 px-4 py-2 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {open ? "Hide" : "Show"} payload
            </button>
            {open ? (
              <div className={`grid gap-3 px-4 pb-4 pt-1 ${event.input && event.output ? "lg:grid-cols-2" : ""}`}>
                {event.input ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">Input</p>
                    <JsonBlock value={event.input} />
                  </div>
                ) : null}
                {event.output ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">Output</p>
                    <JsonBlock value={event.output} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TraceSandbox() {
  const [activeId, setActiveId] = useState(TRACES[0].id);
  const trace = TRACES.find((t) => t.id === activeId) ?? TRACES[0];

  return (
    <div className="space-y-8">
      {/* Trace selector */}
      <div className="flex flex-wrap gap-2">
        {TRACES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              t.id === activeId
                ? "border-teal-400/50 bg-teal-400/10 text-teal-400"
                : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Trace header */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-white">{trace.task}</p>
            <p className="mt-1 text-sm text-neutral-400">{trace.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs">
            <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-neutral-400">
              source: {trace.source}
            </span>
            <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-neutral-400">
              sdk: {trace.sdk}
            </span>
            <span className="rounded border border-teal-400/20 bg-teal-400/10 px-2 py-1 text-teal-400">
              {trace.status}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative border-l-2 border-white/10 pl-6 space-y-4">
        {trace.events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-base font-semibold text-white">Run reliability campaigns on your own traces</p>
        <p className="mt-2 text-sm text-neutral-400">
          Instrument your agent in minutes, inject 10+ mutation types, and gate deployments on pass rate.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={siteConfig.appUrl}
            className="rounded-full bg-teal-400 px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Get started free
          </Link>
          <Link
            href="/docs/getting-started"
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-white/30"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </div>
  );
}

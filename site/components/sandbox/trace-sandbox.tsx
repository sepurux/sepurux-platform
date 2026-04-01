"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildAppAuthHref } from "@/lib/site";

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
    sdk: "py/0.7.0",
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
    sdk: "py/0.7.0",
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
        output: { reply: "Hi! I can see this is a recurring issue - our team is investigating a timeout in the export pipeline. I'll personally follow up within 2 hours." },
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
    sdk: "py/0.7.0",
    status: "valid",
    description: "PR review agent that fetches the diff, analyses it with an LLM, and posts inline comments with a simulated mutation showing schema fault injection.",
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
        mutation: "fault.timeout -> status renamed to state",
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
        output: { error: "Unexpected field 'state' in diff response - expected 'status'.", type: "schema_mismatch" },
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
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "model":
    case "llm_call":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "tool_call":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "tool_result":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "agent_output":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failure":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function dotColor(status: EventStatus): string {
  if (status === "success") return "border-emerald-500/60 bg-emerald-100";
  if (status === "failure") return "border-rose-500/60 bg-rose-100";
  return "border-slate-400/50 bg-slate-200";
}

function statusBadge(status: EventStatus): string {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "failure") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTypeLabel(type: string): string {
  return type.replaceAll("_", " ");
}

function countFailures(trace: SampleTrace): number {
  return trace.events.filter((event) => event.status === "failure").length;
}

function countMutations(trace: SampleTrace): number {
  return trace.events.filter((event) => event.mutation != null).length;
}

function countModelCalls(trace: SampleTrace): number {
  return trace.events.filter((event) => event.type === "model" || event.type === "llm_call").length;
}

function countToolSteps(trace: SampleTrace): number {
  return trace.events.filter((event) => event.type === "tool_call" || event.type === "tool_result").length;
}

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} items`;
  if (value == null) return "null";
  if (typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} fields`;
  if (typeof value === "string") return value.length > 34 ? `${value.slice(0, 31)}...` : value;
  return String(value);
}

function payloadPreview(value?: Record<string, unknown>): string | null {
  if (!value) return null;

  const entries = Object.entries(value).slice(0, 2);
  if (entries.length === 0) return null;

  return entries.map(([key, item]) => `${key}: ${formatPreviewValue(item)}`).join("  ·  ");
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function JsonBlock({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="overflow-auto rounded-[18px] border border-slate-200 bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function TraceStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function InspectorMeta({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-200 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className={cn("text-sm font-medium text-slate-800", valueClassName)}>{value}</span>
    </div>
  );
}

function EventRow({
  event,
  step,
  selected,
  onSelect,
}: {
  event: TraceEvent;
  step: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = payloadPreview(event.output) ?? payloadPreview(event.input);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-[24px] border px-4 py-4 pl-14 text-left transition-all duration-200",
        selected
          ? "border-slate-950 bg-slate-950/[0.03] shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
          : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white"
      )}
    >
      <span className={cn("absolute left-5 top-5 h-3 w-3 rounded-full border-2", dotColor(event.status))} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Step {String(step).padStart(2, "0")}
            </span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", typeColor(event.type))}>
              {formatTypeLabel(event.type)}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusBadge(event.status))}>
              {event.status}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-950">{event.name}</p>

          {preview ? <p className="mt-2 text-sm leading-6 text-slate-600">{preview}</p> : null}

          {event.mutation ? (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700">
              Mutation: {event.mutation}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {event.latency_ms != null ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
              {formatMs(event.latency_ms)}
            </span>
          ) : null}
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
              selected ? "text-slate-950" : "text-slate-400 group-hover:text-slate-700"
            )}
          >
            Inspect
          </span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TraceSandbox() {
  const [activeId, setActiveId] = useState(TRACES[0].id);
  const [selectedEventId, setSelectedEventId] = useState(TRACES[0].events[0]?.id ?? "");
  const trace = TRACES.find((item) => item.id === activeId) ?? TRACES[0];
  const selectedEvent = trace.events.find((event) => event.id === selectedEventId) ?? trace.events[0];
  const selectedStep = trace.events.findIndex((event) => event.id === selectedEvent?.id) + 1;
  const failureCount = countFailures(trace);
  const mutationCount = countMutations(trace);
  const modelCount = countModelCalls(trace);
  const toolCount = countToolSteps(trace);
  const traceStateLabel = failureCount > 0 ? "failure captured" : "clean execution";

  const handleTraceSelect = (nextTrace: SampleTrace) => {
    setActiveId(nextTrace.id);
    setSelectedEventId(nextTrace.events[0]?.id ?? "");
  };

  return (
    <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,#fcfcfd_0%,#f4f7fb_100%)] shadow-[0_32px_90px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-4 font-mono text-xs text-slate-500">
        <span className="h-3 w-3 rounded-full bg-rose-300" />
        <span className="h-3 w-3 rounded-full bg-amber-300" />
        <span className="h-3 w-3 rounded-full bg-emerald-300" />
        <span className="ml-2">sandbox://trace-explorer</span>
      </div>

      <div className="grid xl:grid-cols-[296px_minmax(0,1fr)_356px]">
        <aside className="border-b border-slate-200 bg-slate-50/80 p-5 xl:border-b-0 xl:border-r xl:p-6">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Trace library</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Inspect real workflows.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Move between a clean run, a tool-heavy path, and a schema failure that breaks downstream execution.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {TRACES.map((item) => {
              const isActive = item.id === activeId;
              const itemFailureCount = countFailures(item);
              const itemMutationCount = countMutations(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTraceSelect(item)}
                  aria-pressed={isActive}
                  className={cn(
                    "w-full rounded-[26px] border p-4 text-left transition-all duration-200",
                    isActive
                      ? "border-slate-950 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.2em]",
                          isActive ? "text-slate-950" : "text-slate-500"
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{item.task}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                        itemFailureCount > 0
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {itemFailureCount > 0 ? "failure path" : "clean run"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    <span className="text-slate-500">{item.events.length} events</span>
                    <span className="text-slate-500">{item.source}</span>
                    <span className="text-slate-500">{item.sdk}</span>
                    {itemMutationCount > 0 ? <span className="text-amber-700">{itemMutationCount} mutation</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 border-b border-slate-200 bg-white p-5 xl:border-b-0 xl:p-6">
          <div className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {trace.label}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                  {trace.task}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">{trace.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  source: {trace.source}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-slate-600">
                  sdk: {trace.sdk}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1",
                    failureCount > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {traceStateLabel}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TraceStat label="Events" value={String(trace.events.length)} detail="recorded steps" />
              <TraceStat label="Model calls" value={String(modelCount)} detail={`${toolCount} tool steps`} />
              <TraceStat
                label="Failures"
                value={failureCount > 0 ? String(failureCount) : "None"}
                detail={failureCount > 0 ? "error captured" : "clean execution"}
              />
              <TraceStat
                label="Mutations"
                value={mutationCount > 0 ? String(mutationCount) : "None"}
                detail={mutationCount > 0 ? "fault injected" : "none applied"}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Execution timeline</p>
                <p className="mt-1 text-sm text-slate-600">
                  Select a step to inspect its structured payloads and see where the workflow changed state.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Step inspector enabled
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {trace.events.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  step={index + 1}
                  selected={selectedEvent?.id === event.id}
                  onSelect={() => setSelectedEventId(event.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="bg-[#f8fafc] p-5 xl:p-6">
          <div className="xl:sticky xl:top-28">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Event inspector</p>
            <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Step {String(selectedStep).padStart(2, "0")}
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{selectedEvent.name}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {payloadPreview(selectedEvent.output) ??
                    payloadPreview(selectedEvent.input) ??
                    "No structured payload captured for this step."}
                </p>
              </div>

              <InspectorMeta label="Type" value={formatTypeLabel(selectedEvent.type)} valueClassName="capitalize" />
              <InspectorMeta
                label="Status"
                value={selectedEvent.status}
                valueClassName={
                  selectedEvent.status === "failure"
                    ? "text-rose-700"
                    : selectedEvent.status === "success"
                      ? "text-emerald-700"
                      : "text-slate-700"
                }
              />
              <InspectorMeta
                label="Latency"
                value={selectedEvent.latency_ms != null ? formatMs(selectedEvent.latency_ms) : "Not recorded"}
              />
              <InspectorMeta
                label="Payloads"
                value={[
                  selectedEvent.input ? "input" : null,
                  selectedEvent.output ? "output" : null,
                ]
                  .filter(Boolean)
                  .join(" + ") || "none"}
              />

              {selectedEvent.mutation ? (
                <div className="border-t border-slate-200 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Mutation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedEvent.mutation}</p>
                </div>
              ) : null}

              {selectedEvent.input ? (
                <div className="border-t border-slate-200 py-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Input</p>
                  <JsonBlock value={selectedEvent.input} />
                </div>
              ) : null}

              {selectedEvent.output ? (
                <div className="border-t border-slate-200 py-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Output</p>
                  <JsonBlock value={selectedEvent.output} />
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Why this matters</p>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                  <p>Sepurux records prompts, model calls, tool interactions, and final outputs in one trace graph.</p>
                  <p>Mutation campaigns expose schema drift, timeout edges, and silent failures before they hit production.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                  className="rounded-full px-5 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-accent)" }}
                >
                  Get started free
                </a>
                <Link
                  href="/docs/getting-started"
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                  Read the docs
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

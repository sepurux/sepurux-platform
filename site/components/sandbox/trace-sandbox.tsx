"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  CircleAlert,
  FlaskConical,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
    sdk: "py/0.5.0",
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
      return "border-stone-200 bg-stone-50 text-stone-700";
    case "model":
    case "llm_call":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "tool_call":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "tool_result":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "agent_output":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failure":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

function dotColor(status: EventStatus): string {
  if (status === "success") return "border-emerald-300 bg-emerald-100";
  if (status === "failure") return "border-rose-300 bg-rose-100";
  return "border-slate-300 bg-slate-100";
}

function statusBadge(status: EventStatus): string {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "failure") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-500";
}

function eventSurface(status: EventStatus): string {
  if (status === "failure") return "border-rose-200 bg-rose-50/40";
  if (status === "pending") return "border-amber-200 bg-amber-50/40";
  return "border-slate-200 bg-white";
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

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function JsonBlock({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="overflow-auto rounded-xl border border-slate-800 bg-[#091117] p-4 text-[11px] leading-relaxed text-slate-200 shadow-inner">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "danger";
}) {
  const toneClassName =
    tone === "accent"
      ? "border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.06)]"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50/60"
        : "border-slate-200 bg-slate-50";

  const iconClassName =
    tone === "accent"
      ? "border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.08)] text-[var(--color-accent)]"
      : tone === "danger"
        ? "border-rose-200 bg-rose-100 text-rose-700"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={cn("rounded-[22px] border px-4 py-4", toneClassName)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function EventRow({ event, step }: { event: TraceEvent; step: number }) {
  const [open, setOpen] = useState(false);
  const hasPayload = event.input != null || event.output != null;

  return (
    <div className="relative">
      <div className={`absolute -left-[1.6rem] top-[1.1rem] h-3.5 w-3.5 rounded-full border-2 ${dotColor(event.status)}`} />

      <div className={cn("overflow-hidden rounded-[22px] border shadow-sm transition-shadow hover:shadow-md", eventSurface(event.status))}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Step {String(step).padStart(2, "0")}
            </span>
            <span className="text-sm font-semibold text-slate-900">{event.name}</span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeColor(event.type)}`}>
              {formatTypeLabel(event.type)}
            </span>
            {event.mutation ? (
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                mutation applied
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {event.latency_ms != null ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                {formatMs(event.latency_ms)}
              </span>
            ) : null}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(event.status)}`}>
              {event.status}
            </span>
          </div>
        </div>

        {event.mutation ? (
          <div className="border-t border-amber-100 bg-amber-50/70 px-4 py-2 text-xs text-amber-700">
            {event.mutation}
          </div>
        ) : null}

        {hasPayload ? (
          <div className="border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-slate-900"
            >
              <svg
                className={`h-3 w-3 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {open ? "Hide payload" : "Show payload"}
            </button>
            {open ? (
              <div className={`grid gap-3 px-4 pb-4 pt-1 ${event.input && event.output ? "xl:grid-cols-2" : ""}`}>
                {event.input ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Input</p>
                    <JsonBlock value={event.input} />
                  </div>
                ) : null}
                {event.output ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Output</p>
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
  const trace = TRACES.find((item) => item.id === activeId) ?? TRACES[0];
  const failureCount = countFailures(trace);
  const mutationCount = countMutations(trace);
  const modelCount = countModelCalls(trace);
  const toolCount = countToolSteps(trace);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="self-start space-y-4 xl:sticky xl:top-24">
        <div className="rounded-[28px] border border-[rgba(var(--accent-rgb),0.18)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.10),rgba(255,255,255,0.98)_72%)] p-5 shadow-panel md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700">Trace library</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Inspect real workflows.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Switch between successful runs, multi-step tool chains, and a mutation-triggered failure path.
          </p>
        </div>

        <div className="space-y-3">
          {TRACES.map((item) => {
            const isActive = item.id === activeId;
            const itemFailureCount = countFailures(item);
            const itemMutationCount = countMutations(item);
            const itemStatusLabel = itemFailureCount > 0 ? "failure path" : "clean run";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-pressed={isActive}
                className={cn(
                  "w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-200",
                  isActive
                    ? "border-[rgba(var(--accent-rgb),0.30)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.14),rgba(255,255,255,0.98)_76%)] shadow-panel"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-panel"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.2em]",
                        isActive ? "text-orange-700" : "text-slate-400"
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
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {itemStatusLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {item.events.length} events
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {item.source}
                  </span>
                  {itemMutationCount > 0 ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      {itemMutationCount} mutation
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] px-5 py-5 md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">{trace.label}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{trace.task}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">{trace.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  source: {trace.source}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-slate-600">
                  sdk: {trace.sdk}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  {trace.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4 md:p-6">
            <MetricCard icon={Workflow} label="Events" value={String(trace.events.length)} detail="recorded steps" />
            <MetricCard
              icon={Braces}
              label="Model calls"
              value={String(modelCount)}
              detail={`${toolCount} tool steps`}
            />
            <MetricCard
              icon={CircleAlert}
              label="Failures"
              value={failureCount > 0 ? String(failureCount) : "None"}
              detail={failureCount > 0 ? "error captured" : "clean execution"}
              tone={failureCount > 0 ? "danger" : "default"}
            />
            <MetricCard
              icon={FlaskConical}
              label="Mutations"
              value={mutationCount > 0 ? String(mutationCount) : "None"}
              detail={mutationCount > 0 ? "fault injection applied" : "no mutation applied"}
              tone={mutationCount > 0 ? "accent" : "default"}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
            <div>
              <p className="text-sm font-semibold text-slate-950">Execution timeline</p>
              <p className="mt-1 text-sm text-slate-600">
                Expand any event to inspect structured input and output payloads.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Interactive payloads
            </span>
          </div>

          <div className="p-5 md:p-6">
            <div className="relative space-y-4 border-l-2 border-slate-200 pl-6">
              {trace.events.map((event, index) => (
                <EventRow key={event.id} event={event} step={index + 1} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[rgba(var(--accent-rgb),0.20)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.16),rgba(var(--warm-rgb),0.06)_46%,rgba(255,255,255,0.98)_78%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-lg font-semibold text-slate-950">Run reliability campaigns on your own traces.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                Instrument your agent in minutes, inject 10+ mutation types, and gate deployments on trace pass rate.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={siteConfig.appUrl}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-accent)" }}
              >
                Get started free
              </Link>
              <Link
                href="/docs/getting-started"
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-[--color-accent] hover:text-[--color-accent]"
              >
                Read the docs
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

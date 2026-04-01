import type { Metadata } from "next";

import { TraceSandbox } from "@/components/sandbox/trace-sandbox";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Trace Sandbox",
  description:
    "Explore real agent traces interactively - see how Sepurux records model calls, tool calls, mutations, and failures without signing up.",
  path: "/sandbox",
});

export default function SandboxPage() {
  return (
    <div className="page-shell bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.18),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="site-container relative z-10 pb-12 pt-12 md:pb-14 md:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end lg:gap-12">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                Live sandbox
              </span>
              <h1 className="page-hero-title mt-5 max-w-3xl text-slate-950">
                Explore real agent traces without leaving the browser.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                Three production-shaped workflows rendered as Sepurux traces. Move through the run,
                select any step, and inspect the exact payloads, mutations, and failure path.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  3 workflows
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  step-level payloads
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  mutation failure path
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Trace coverage
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  Three representative workflows
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Clean executions, tool-heavy flows, and a mutation-triggered schema break.
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Step inspection
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  Structured payload visibility
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Review inputs and outputs for each event in a dedicated inspector pane.
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Failure clarity
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  Mutation path included
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  See how a single schema change propagates into a downstream tool failure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="site-container pb-16 pt-8 md:pb-20 md:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Interactive explorer
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Choose a workflow on the left, then inspect any step in the timeline.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            No signup required
          </span>
        </div>
        <TraceSandbox />
      </div>
    </div>
  );
}

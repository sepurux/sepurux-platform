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
    <div className="bg-background">
      <section className="ink-section border-b border-white/10">
        <div className="site-container py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl space-y-5">
              <span className="inline-flex rounded-full border border-[rgba(var(--accent-rgb),0.30)] bg-[rgba(var(--accent-rgb),0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-50">
                Live sandbox
              </span>
              <h1 className="page-hero-title text-white">Explore agent traces interactively.</h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Three real-world agent workflows - refund processing, support triage, and code review - rendered
                as Sepurux traces. Expand any event to inspect structured payloads and failure paths. No account required.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.10)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-orange-50">
                  3 sample workflows
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-200">
                  Expand payloads
                </span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                  Mutation example included
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-[rgba(var(--accent-rgb),0.18)] bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.12),rgba(255,255,255,0.03))] p-5 md:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">Inside This Demo</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Inspect recorded steps</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Follow prompts, model calls, tool calls, and final outputs in execution order.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Open real payloads</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Expand structured input and output objects for each event without leaving the page.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">See a failure path</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    The code review trace includes a mutation-driven schema mismatch and downstream failure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="site-container py-10 md:py-14">
        <TraceSandbox />
      </div>
    </div>
  );
}

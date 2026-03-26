import type { Metadata } from "next";
import { TraceSandbox } from "@/components/sandbox/trace-sandbox";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Trace Sandbox",
  description:
    "Explore real agent traces interactively — see how Sepurux records model calls, tool calls, mutations, and failures without signing up.",
  path: "/sandbox",
});

export default function SandboxPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Live Sandbox</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Explore agent traces interactively.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-400">
          Three real-world agent workflows — refund processing, support triage, code review — rendered
          as Sepurux traces. Click any event to expand the input and output payload. No account required.
        </p>
      </div>

      <TraceSandbox />
    </div>
  );
}

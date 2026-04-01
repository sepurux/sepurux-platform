"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const integrations = [
  "OpenAI SDK",
  "LangChain",
  "LangGraph",
  "LlamaIndex",
  "Pydantic AI",
  "Crew AI",
  "OpenTelemetry",
  "Vercel AI SDK",
  "MCP Tools",
  "Custom APIs",
  "LiteLLM",
  "Portkey",
];

const pipeline = [
  "trace.upload",
  "campaign.bind",
  "replay.execute",
  "mutation.trace",
  "policy.events",
  "ci.batch.decision",
];

export function IntegrationSection() {
  return (
    <section className="ink-section-muted relative overflow-hidden py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker ink-kicker">Integration model</p>
            <h2 className="section-heading mt-4 text-white">
              Keep the stack your team already uses and add reliability on top.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Sepurux does not ask teams to rebuild the agent architecture. It records the workflow,
              replays it under stress, and returns a decision the existing engineering system can act
              on.
            </p>
            <Link
              href="/docs/integrations"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-100 transition-colors hover:text-white"
            >
              Open SDK and integration guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="border-l border-white/10 pl-0 lg:pl-8">
            <div className="border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Supported paths
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                {integrations.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Typical system path
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pipeline.map((item, index) => (
                  <div key={item}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 font-mono text-sm text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

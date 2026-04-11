"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { SimpleIcon } from "simple-icons";
import {
  siGithubactions,
  siLangchain,
  siLanggraph,
  siModelcontextprotocol,
  siOpentelemetry,
  siPydantic,
  siVercel,
} from "simple-icons";

type FrameworkTile = {
  name: string;
  renderIcon: () => JSX.Element;
};

const frameworks: FrameworkTile[] = [
  {
    name: "OpenAI SDK",
    renderIcon: () => <Sparkles className="h-4 w-4 text-cyan-300" />,
  },
  {
    name: "LangChain",
    renderIcon: () => <SimpleBrandIcon icon={siLangchain} />,
  },
  {
    name: "LangGraph",
    renderIcon: () => <SimpleBrandIcon icon={siLanggraph} />,
  },
  {
    name: "GitHub Actions",
    renderIcon: () => <SimpleBrandIcon icon={siGithubactions} />,
  },
  {
    name: "OpenTelemetry",
    renderIcon: () => <SimpleBrandIcon icon={siOpentelemetry} />,
  },
  {
    name: "Vercel AI SDK",
    renderIcon: () => <SimpleBrandIcon icon={siVercel} />,
  },
  {
    name: "Pydantic AI",
    renderIcon: () => <SimpleBrandIcon icon={siPydantic} />,
  },
  {
    name: "MCP Tools",
    renderIcon: () => <SimpleBrandIcon icon={siModelcontextprotocol} />,
  },
];

const workflow = [
  {
    title: "Capture traces from your app",
    description: "Use the SDKs and recorders to keep the real workflow that matters.",
  },
  {
    title: "Turn traces into replayable campaigns",
    description: "Reuse those scenarios instead of building a separate synthetic test harness.",
  },
  {
    title: "Send results into CI or operations",
    description: "Return a verdict your engineering workflow can act on before release.",
  },
];

function SimpleBrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
      style={{ color: `#${icon.hex}` }}
    >
      <path d={icon.path} />
    </svg>
  );
}

export function IntegrationSection() {
  return (
    <section className="ink-section-muted relative overflow-hidden py-20 sm:py-24">
      <div className="site-container">
        <div className="section-shell grid gap-12 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16 lg:p-10">
          <div className="max-w-xl">
            <p className="section-kicker ink-kicker">Fits your stack</p>
            <h2 className="section-heading mt-4 text-white">
              Add reliability without rebuilding your agent system.
            </h2>
            <p className="section-lead mt-5">
              Sepurux sits around the workflows you already run. It captures traces, tests those
              workflows under failure, and returns a result your team can use in everyday delivery.
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
                Works with
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {frameworks.map((framework) => {
                  return (
                    <div
                      key={framework.name}
                      className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                        {framework.renderIcon()}
                      </span>
                      <p className="text-sm font-semibold text-white">{framework.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Typical workflow
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {workflow.map((item, index) => (
                  <div key={item.title}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
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

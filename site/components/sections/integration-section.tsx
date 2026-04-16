"use client";

import type { ComponentType } from "react";

import Link from "next/link";
import { ArrowRight, GitBranch, History, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
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
    renderIcon: () => <Sparkles className="h-4 w-4 text-primary" />,
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
    name: "MCP tools",
    renderIcon: () => <SimpleBrandIcon icon={siModelcontextprotocol} />,
  },
];

const workflow = [
  {
    title: "Capture the trace once",
    description: "Keep the real agent story instead of rebuilding it by hand.",
  },
  {
    title: "Debug the issue before you persist it",
    description: "Use the paste-and-analyze flow first, then save the useful trace when it earns a place in history.",
  },
  {
    title: "Promote stable traces into replay and CI",
    description: "Hand the same trace to replay, stress testing, or pre-release checks when the fix is ready.",
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

function FeaturePill({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.035] p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-100">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function IntegrationSection() {
  return (
    <section className="ink-section-muted relative overflow-hidden py-22 sm:py-26">
      <div className="site-container">
        <div className="section-shell grid gap-12 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)] lg:gap-16 lg:p-10">
          <div className="max-w-xl">
            <p className="section-kicker ink-kicker">Fits your stack</p>
            <h2 className="section-heading mt-4 text-white">
              Paste the trace first. Save, replay, or gate later.
            </h2>
            <p className="section-lead mt-5">
              Sepurux is easiest to adopt when the first step is obvious: paste the trace, see what broke, then decide whether it deserves replay, mutation testing, or CI.
            </p>
            <Link
              href="/docs/integrations"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
            >
              Open SDK and integration guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="border-l border-white/8 pl-0 lg:pl-8">
            <div className="border-t border-white/8 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Connects to
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {frameworks.map((framework) => (
                  <div
                    key={framework.name}
                    className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                      {framework.renderIcon()}
                    </span>
                    <p className="text-sm font-semibold text-white">{framework.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-white/8 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Typical workflow
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-3">
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

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <FeaturePill
                icon={RotateCcw}
                title="Replay later"
                description="Use the same trace again when you want a second pass after the fix."
              />
              <FeaturePill
                icon={GitBranch}
                title="Continuous checks"
                description="Promote stable cases into CI or scheduled reliability checks."
              />
              <FeaturePill
                icon={History}
                title="Saved traces"
                description="Persist the analysis once it matters for your team history."
              />
              <FeaturePill
                icon={ShieldCheck}
                title="Policy gates"
                description="Keep approvals and guardrails available when the workflow gets sensitive."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

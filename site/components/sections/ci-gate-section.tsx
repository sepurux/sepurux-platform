"use client";

import Link from "next/link";

import { siteConfig } from "@/lib/site";

const ciSnippet = `name: Sepurux Reliability Gate

on:
  pull_request:
  workflow_dispatch:

jobs:
  reliability-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: sepurux/sepurux-platform/.github/actions/sepurux-gate@main
        with:
          base_url: \${{ secrets.SEPURUX_API_BASE_URL }}
          token: \${{ secrets.SEPURUX_API_KEY }}
          project_id: \${{ secrets.SEPURUX_PROJECT_ID }}
          # When campaign has an eval-set, runs one CI job per registered
          # scenario trace and gates on the aggregated verdict.
          campaign_name: refund-reliability
          min_pass_rate: "0.85"`;

const bullets = [
  "Register real-world traces as a scenario pool. Every CI submission replays all of them.",
  "Batch verdict: pass only when every scenario run passes. scenario_coverage_pct confirms full evaluation.",
  "Set branch protection to require the reliability gate check.",
];

export function CIGateSection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="section-kicker">CI/CD Gate</p>
          <h2
            className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
            style={{ color: "var(--text-primary)" }}
          >
            Add Sepurux to CI in one workflow.
          </h2>
          <p className="mt-4 text-base leading-8 text-gray-500">
            Copy the block, set five secrets, and enforce reliability before merge and deploy.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* left: "What this gives your team" */}
          <div
            className="rounded-2xl border border-[--border] bg-white p-7"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h3
              className="font-display text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              What this gives your team
            </h3>
            <ul className="mt-5 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span
                    className="mt-0.5 shrink-0 text-base font-bold leading-none"
                    style={{ color: "var(--color-accent)" }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/docs/ci-cd"
                className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "var(--color-accent)" }}
              >
                Read full CI guide
              </Link>
              <a
                href={`${siteConfig.appUrl}/api/backend/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-[--border] bg-[--surface-2] px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-[--color-accent] hover:text-[--color-accent]"
              >
                API reference
              </a>
            </div>
          </div>

          {/* right: dark terminal code block — intentional dark anchor */}
          <div className="overflow-hidden rounded-2xl bg-gray-950" style={{ boxShadow: "var(--shadow-card)" }}>
            {/* filename bar with traffic-light dots */}
            <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2.5 font-mono text-xs text-gray-400">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-2">.github/workflows/sepurux-gate.yml</span>
            </div>
            <pre className="max-h-[440px] overflow-auto p-5 text-[12px] leading-6">
              <code>
                {ciSnippet.split("\n").map((line, i) => {
                  // comments
                  if (line.trimStart().startsWith("#")) {
                    return (
                      <span key={i} className="block text-gray-500">
                        {line}
                      </span>
                    );
                  }
                  // key: value lines
                  const colonIdx = line.indexOf(":");
                  if (colonIdx > 0) {
                    const key = line.slice(0, colonIdx + 1);
                    const val = line.slice(colonIdx + 1);
                    return (
                      <span key={i} className="block">
                        <span className="text-orange-300">{key}</span>
                        <span className="text-emerald-300">{val}</span>
                      </span>
                    );
                  }
                  return (
                    <span key={i} className="block text-emerald-200">
                      {line}
                    </span>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

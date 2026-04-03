"use client";

import Link from "next/link";

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
          campaign_name: refund-reliability
          min_pass_rate: "0.85"`;

const bullets = [
  "Register a scenario pool once and replay every trace on each pull request.",
  "Gate on pass rate, scenario coverage, and unsafe attempt count instead of a vague quality claim.",
  "Push a single verdict into branch protection and release review.",
];

const metrics = [
  ["Scenario coverage", "100%"],
  ["Unsafe attempts", "0"],
  ["Pass rate", "0.92"],
] as const;

export function CIGateSection() {
  return (
    <section className="ink-section relative overflow-hidden py-20 sm:py-24">
      <div className="site-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-kicker ink-kicker">Release control</p>
          <h2 className="section-heading mt-4 text-white">
            Put reliability evidence directly into the deployment path.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
            The product is strongest when it stops being a dashboard you check later and becomes a
            gate the team cannot ignore.
          </p>
        </div>

        <div className="mt-12 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-14">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,21,0.64)] shadow-[0_30px_80px_rgba(5,10,18,0.3)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-mono text-xs text-slate-400">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-300/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-2">.github/workflows/sepurux-gate.yml</span>
            </div>
            <pre className="overflow-auto px-4 py-4 text-[12px] leading-6 text-slate-200">
              <code>{ciSnippet}</code>
            </pre>
          </div>

          <div className="border-l border-white/10 pl-0 xl:pl-8">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
              What the gate gives the team
            </h3>
            <ul className="mt-5 space-y-3.5">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {metrics.map(([label, value]) => (
                <div key={label} className="border-t border-white/10 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/docs/ci-cd"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Read full CI guide
              </Link>
              <Link
                href="/docs/api-reference"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                API reference
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

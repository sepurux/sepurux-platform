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
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: python -m pip install sepurux
      - env:
          SEPURUX_API_BASE_URL: ${siteConfig.appUrl}/api/backend
          SEPURUX_API_KEY: \${{ secrets.SEPURUX_API_KEY }}
          SEPURUX_PROJECT_ID: \${{ secrets.SEPURUX_PROJECT_ID }}
          SEPURUX_CAMPAIGN_ID: \${{ secrets.SEPURUX_CAMPAIGN_ID }}
          SEPURUX_TRACE_ID: \${{ secrets.SEPURUX_TRACE_ID }}
        run: python .github/scripts/sepurux_gate.py`;

const bullets = [
  "Use the live hosted API URL in CI, not localhost.",
  "Pass trace_id from an earlier capture/upload step.",
  "Set branch protection to require the reliability gate check.",
];

export function CIGateSection() {
  return (
    <section className="bg-neutral-950 py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">CI/CD Gate</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            Add Sepurux to CI in one workflow.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-400">
            Copy the block, set five secrets, and enforce reliability before merge and deploy.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <h3 className="font-display text-2xl font-semibold text-white">What this gives your team</h3>
            <ul className="mt-5 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-300">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/docs/ci-cd"
                className="inline-flex items-center rounded-full border border-[rgba(0,229,204,0.35)] bg-[rgba(0,229,204,0.10)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Read full CI guide
              </Link>
              <a
                href={`${siteConfig.appUrl}/api/backend/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/90"
              >
                API reference
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[rgba(0,229,204,0.24)] bg-[#060b11]">
            <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/45">
              .github/workflows/sepurux-gate.yml
            </div>
            <pre className="max-h-[440px] overflow-auto p-5 text-[12px] leading-6 text-[#b8fff3]">
              <code>{ciSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

const capabilities = [
  {
    title: "Compliance Summary",
    body: "Project-scoped metrics across audit, policy, and security events for governance reporting.",
    tag: "Step 3",
  },
  {
    title: "Policy + Security Controls",
    body: "Track policy denies, security blocks, and sanitizations before workflows reach production.",
    tag: "Control Plane",
  },
  {
    title: "Audit Visibility",
    body: "Preserve structured event history for incident review, approvals, and operational traceability.",
    tag: "Audit Layer",
  },
];

export function EnterpriseReadinessSection() {
  return (
    <section className="ink-section-muted py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="section-kicker ink-kicker">Enterprise Readiness</p>
          <h2
            className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
            style={{ color: "#F8FAFC" }}
          >
            Add compliance, audit, and security layers without rebuilding your stack.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Sepurux evolves from developer testing into a platform your platform team and security reviewers can trust.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 border-t-2 bg-white/6 p-6 transition-colors hover:border-[--color-warm]/40 backdrop-blur-sm"
              style={{
                borderTopColor: "var(--color-warm)",
                boxShadow: "0 18px 36px rgba(0, 0, 0, 0.2)",
              }}
            >
              <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--color-warm)" }}>
                {item.tag}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-slate-100">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/book-demo"
            className="inline-flex items-center rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "var(--color-accent)" }}
          >
            Book enterprise demo
          </Link>
          <Link
            href="/docs/policy-security"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/6 px-6 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30 hover:bg-white/10"
          >
            Policy & security docs
          </Link>
        </div>
      </div>
    </section>
  );
}

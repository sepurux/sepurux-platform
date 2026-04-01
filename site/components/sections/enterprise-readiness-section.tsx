"use client";

import Link from "next/link";

const capabilities = [
  {
    title: "Compliance Summary",
    body: "Project-scoped metrics across audit, policy, and security events for governance reporting and release review.",
  },
  {
    title: "Policy + Security Controls",
    body: "Approval rules, unsafe action blocks, sanitization layers, and tool zoning for sensitive workflows.",
  },
  {
    title: "Audit Visibility",
    body: "Structured event history for incident review, approvals, and operational accountability as the program scales.",
  },
];

export function EnterpriseReadinessSection() {
  return (
    <section className="bg-transparent py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 border-y border-[--border] py-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">Governed scale</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              Start with reliability testing, then grow into a control plane.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              The product already spans more than replay. As programs mature, Sepurux becomes the
              place where platform teams, security reviewers, and operators evaluate whether an AI
              workflow should run at all.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book-demo"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Book enterprise demo
              </Link>
              <Link
                href="/docs/policy-security"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/8 px-5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/12 hover:text-white"
              >
                Policy & security docs
              </Link>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.title} className="border-t border-[--border] pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Capability
                </p>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

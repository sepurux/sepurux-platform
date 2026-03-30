import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { DemoRequestForm } from "@/components/demo-request-form";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Book a Demo",
  description:
    "Book a Sepurux product demo for campaign execution, SDK-driven workflows, mutation packs, policy gates, and security controls.",
  path: "/book-demo",
});

const demoTopics = [
  "Campaign creation from uploaded traces or SDK flows",
  "Seeded and custom mutation packs for your team's tools",
  "Policy packs, approval gates, and security zoning",
  "Hosted deployment shape and integration patterns",
];

const stats = [
  { value: "< 30 min", label: "Focused walkthrough" },
  { value: "Live", label: "On your real use case" },
  { value: "No sales pitch", label: "Engineers talk to engineers" },
];

export default function BookDemoPage() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: "radial-gradient(circle at 12% 18%, rgba(var(--accent-rgb), 0.10), transparent 42%)",
        }}
      />

      <div className="site-container relative z-10 py-16 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="section-kicker">Book a demo</p>
            <h1 className="page-hero-title mt-3 text-[--text-primary]">See Sepurux on your workflows.</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Tell us what you want to validate and we&apos;ll tailor the walkthrough around your traces,
              campaigns, mutation packs, and policy or security requirements.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {stats.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-[--border] bg-white px-4 py-3 shadow-sm">
                  <p className="text-base font-semibold text-[--text-primary]">{value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="accent-panel-soft mt-8 rounded-[24px] p-6 md:p-7">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]">
                What we cover
              </p>
              <h2 className="mb-5 text-base font-semibold text-[--text-primary]">Typical demo topics</h2>
              <ul className="space-y-3.5">
                {demoTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--color-accent)" }}
                    />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <DemoRequestForm />
          </div>
        </div>
      </div>
    </section>
  );
}

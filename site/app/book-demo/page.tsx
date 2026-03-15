// site/app/book-demo/page.tsx
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
    <section className="relative overflow-hidden bg-black">
      {/* teal radial behind headline */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-[500px] w-[600px] opacity-60"
        style={{
          background: "radial-gradient(ellipse at 10% 20%, rgba(0,229,204,0.08), transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      <div className="site-container relative z-10 py-16 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">

          {/* left column */}
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Book a demo</p>
            <h1 className="page-hero-title mt-3 text-white">
              See Sepurux on your workflows.
            </h1>
            <p className="mt-5 text-lg leading-8 text-neutral-400">
              Tell us what you want to validate and we'll tailor the walkthrough around your traces,
              campaigns, mutation packs, and policy or security requirements.
            </p>

            {/* stats strip */}
            <div className="mt-8 flex flex-wrap gap-6">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-base font-semibold text-white">{value}</p>
                  <p className="mt-0.5 text-xs text-white/40">{label}</p>
                </div>
              ))}
            </div>

            {/* demo coverage card */}
            <div
              className="mt-8 rounded-[24px] border p-6 md:p-7"
              style={{
                borderColor: "rgba(0,229,204,0.15)",
                background: "rgba(0,229,204,0.04)",
              }}
            >
              <p
                className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em]"
                style={{ color: "var(--accent-teal)" }}
              >
                What we cover
              </p>
              <h2 className="mb-5 text-base font-semibold text-white">Typical demo topics</h2>
              <ul className="space-y-3.5">
                {demoTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-3 text-sm leading-7 text-neutral-400">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--accent-teal)" }}
                    />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* right column: form */}
          <div>
            <DemoRequestForm />
          </div>
        </div>
      </div>
    </section>
  );
}

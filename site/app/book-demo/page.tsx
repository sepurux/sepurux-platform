import type { Metadata } from "next";

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

export default function BookDemoPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Book a demo</p>
          <h1 className="page-hero-title mt-3 text-white">
            See Sepurux on your workflows.
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-400">
            Tell us what you want to validate and we will tailor the walkthrough around your traces, campaigns,
            mutation packs, and policy or security requirements.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.03] p-6 md:p-7">
            <h2 className="text-lg font-semibold text-white">Typical demo coverage</h2>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-neutral-400">
              {demoTopics.map((topic) => (
                <li key={topic} className="flex items-start gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <DemoRequestForm />
        </section>
      </div>
    </div>
  );
}

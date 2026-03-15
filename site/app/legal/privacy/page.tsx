// site/app/legal/privacy/page.tsx
import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Sepurux privacy policy for data collection, processing, retention, and contact.",
  path: "/legal/privacy",
});

const sections = [
  {
    title: "Information we collect",
    body: "We collect account contact details, usage telemetry, and submitted waitlist information. We do not require production credentials for standard replay workflows.",
  },
  {
    title: "How we use information",
    body: "Data is used to provide and improve the service, monitor reliability, prevent abuse, and communicate product updates.",
  },
  {
    title: "Data retention",
    body: "We retain information for as long as needed to provide the service and meet legal obligations. You may request deletion of personal data where applicable.",
  },
  {
    title: "Contact",
    body: null,
    contact: "privacy@sepurux.com",
  },
];

export default function PrivacyPage() {
  return (
    <section className="bg-black">
      <div className="site-container py-16 md:py-24">
        <div className="max-w-2xl">
          {/* kicker */}
          <p
            className="text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--accent-teal)" }}
          >
            Legal
          </p>

          {/* heading */}
          <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-white/40">Last updated: February 27, 2026</p>

          {/* divider */}
          <div className="mt-8 h-px bg-white/8" />

          {/* sections */}
          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <div
                key={section.title}
                className="group relative pl-5"
              >
                {/* teal left accent */}
                <div
                  className="absolute left-0 top-1 h-4 w-0.5 rounded-full"
                  style={{ background: "var(--accent-teal)" }}
                />
                <h2 className="text-base font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-neutral-400">
                  {section.body ?? (
                    <>
                      For privacy inquiries:{" "}
                      <a
                        href={`mailto:${section.contact}`}
                        className="transition-colors hover:text-white"
                        style={{ color: "var(--accent-teal)" }}
                      >
                        {section.contact}
                      </a>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* footer note */}
          <div className="mt-14 rounded-[20px] border border-white/8 bg-white/[0.02] px-6 py-5 text-sm text-neutral-500">
            This policy applies to data collected through sepurux.com and the Sepurux application.
            For data processing agreements or enterprise compliance requirements, contact{" "}
            <a
              href="mailto:privacy@sepurux.com"
              className="transition-colors hover:text-white"
              style={{ color: "var(--accent-teal)" }}
            >
              privacy@sepurux.com
            </a>
            .
          </div>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Sepurux privacy policy for data collection, processing, retention, and contact.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <article className="max-w-3xl space-y-6 text-sm text-muted-foreground">
        <header>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="mt-3">Last updated: February 27, 2026</p>
        </header>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Information we collect</h2>
          <p>
            We collect account contact details, usage telemetry, and submitted waitlist information. We do
            not require production credentials for standard replay workflows.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">How we use information</h2>
          <p>
            Data is used to provide and improve the service, monitor reliability, prevent abuse, and
            communicate product updates.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Data retention</h2>
          <p>
            We retain information for as long as needed to provide the service and meet legal obligations.
            You may request deletion of personal data where applicable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
          <p>For privacy inquiries: privacy@sepurux.com</p>
        </section>
      </article>
    </div>
  );
}

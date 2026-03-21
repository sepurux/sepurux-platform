import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Company",
  description:
    "About Sepurux and contact information for founder and support channels.",
  path: "/company",
});

export default function CompanyPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <header className="max-w-3xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Company</p>
        <h1 className="page-hero-title mt-3 text-white">
          We help teams ship AI agents with fewer surprises.
        </h1>
        <p className="mt-5 text-lg text-neutral-400">
          Sepurux is focused on reliability infrastructure for tool-using AI systems. We build replay,
          chaos, and governance workflows for platform engineers.
        </p>
      </header>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        <div id="about" className="rounded-[28px] border border-white/8 bg-white/[0.03] p-7 md:p-8">
          <h2 className="text-lg font-semibold text-white">About</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
            <p>
              Our team has shipped infrastructure in observability, CI/CD, and platform security. Sepurux
              brings those practices to AI agent reliability.
            </p>
            <p>
              We believe agents should be tested with the same rigor as distributed systems before they
              touch production workflows.
            </p>
          </div>
        </div>

        <div id="contact" className="rounded-[28px] border border-white/8 bg-white/[0.03] p-7 md:p-8">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-400">
            <p>
              Founder:{" "}
              <a
                href={`mailto:${siteConfig.founderEmail}`}
                className="text-white underline-offset-4 hover:underline"
              >
                {siteConfig.founderEmail}
              </a>{" "}
              ·{" "}
              <a
                href={`tel:${siteConfig.founderPhone}`}
                className="text-white underline-offset-4 hover:underline"
              >
                {siteConfig.founderPhone}
              </a>
            </p>
            <p>
              Support:{" "}
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-white underline-offset-4 hover:underline"
              >
                {siteConfig.supportEmail}
              </a>
            </p>
            <p>
              Read legal details in{" "}
              <Link href="/legal/privacy" className="text-white underline-offset-4 hover:underline">Privacy</Link>{" "}
              and{" "}
              <Link href="/legal/terms" className="text-white underline-offset-4 hover:underline">Terms</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

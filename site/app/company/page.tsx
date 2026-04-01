import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Company",
  description: "About Sepurux and contact information for founder and support channels.",
  path: "/company",
});

export default function CompanyPage() {
  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <header className="max-w-3xl">
            <p className="section-kicker ink-kicker">Company</p>
            <h1 className="page-hero-title mt-3 text-white">
              We help teams ship AI agents with fewer surprises.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Sepurux is focused on reliability infrastructure for tool-using AI systems. We build
              replay, chaos, and governance workflows for platform engineers.
            </p>
          </header>
        </div>
      </section>

      <div className="site-container py-12 md:py-16">
        <section className="grid gap-5 md:grid-cols-2">
          <div id="about" className="page-surface p-7 md:p-8">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">About</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>
                The product is shaped by platform, observability, CI/CD, and security thinking.
                Sepurux brings those disciplines into the reliability lifecycle for AI agents.
              </p>
              <p>
                We believe agents should be tested with the same rigor as distributed systems before
                they touch production workflows.
              </p>
            </div>
          </div>

          <div id="contact" className="page-surface p-7 md:p-8">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">Contact</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>
                Founder:{" "}
                <a
                  href={`mailto:${siteConfig.founderEmail}`}
                  className="text-[--text-primary] underline-offset-4 transition-colors hover:text-[--color-accent] hover:underline"
                >
                  {siteConfig.founderEmail}
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-[--text-primary] underline-offset-4 transition-colors hover:text-[--color-accent] hover:underline"
                >
                  {siteConfig.supportEmail}
                </a>
              </p>
              <p>
                Read the legal details in{" "}
                <Link
                  href="/legal/privacy"
                  className="text-[--text-primary] underline-offset-4 transition-colors hover:text-[--color-accent] hover:underline"
                >
                  Privacy
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/terms"
                  className="text-[--text-primary] underline-offset-4 transition-colors hover:text-[--color-accent] hover:underline"
                >
                  Terms
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

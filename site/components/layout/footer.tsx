"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Product", href: "/product" },
      { label: "Replay", href: "/product" },
      { label: "CI Gate", href: "/docs/ci-cd" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Waitlist", href: "/waitlist" },
      { label: "Company", href: "/company" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
    ],
  },
];

const socialLinks = [
  { label: "GitHub", href: siteConfig.githubUrl },
  { label: "Twitter", href: siteConfig.twitterUrl },
  { label: "LinkedIn", href: siteConfig.linkedinUrl },
  { label: "Discord", href: siteConfig.discordUrl },
];

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t border-white/6 px-5 py-14 sm:px-8 lg:px-16"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(124,58,237,0.08), transparent 30%), radial-gradient(circle at top right, rgba(6,182,212,0.05), transparent 26%)",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent" />

      <div className="mx-auto max-w-[1368px] space-y-8">
        <div className="grid gap-6 rounded-[32px] border border-white/8 bg-white/[0.035] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.18)] md:grid-cols-[minmax(0,1.1fr)_auto] md:items-center md:p-8">
          <div className="max-w-2xl">
            <p className="section-kicker ink-kicker">Keep the debugger first</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Paste a trace. Find the failure. Save the useful one later.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Start with Analyze Trace. Use replay, mutation testing, and CI only after the first answer shows you where to look.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sandbox"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.26)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Analyze Trace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" })}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-slate-100 transition-colors duration-200 hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
            >
              Save traces later
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
          <div className="max-w-xs">
            <p className="font-display text-lg font-semibold text-white" style={{ letterSpacing: "-0.03em" }}>
              Sepurux
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-[rgba(90,88,112,0.9)]">
              Trace debugger for failed or risky agent runs.
            </p>
            <p className="mt-6 font-mono text-[11px] text-[rgba(90,88,112,0.6)]">
              © {new Date().getFullYear()} Sepurux
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title}>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(155,152,171,0.68)]">
                  {section.title}
                </p>
                <div className="mt-4 space-y-3">
                  {section.links.map((item) => (
                    <Link
                      key={`${section.title}-${item.label}`}
                      href={item.href}
                      className="block font-mono text-[12px] uppercase tracking-[0.1em] text-[rgba(90,88,112,0.82)] transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(155,152,171,0.68)]">
                Social
              </p>
              <div className="mt-4 space-y-3">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-mono text-[12px] uppercase tracking-[0.1em] text-[rgba(90,88,112,0.82)] transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

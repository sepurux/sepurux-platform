import Link from "next/link";
import { ArrowUpRight, Github, Linkedin, MessageCircle, Twitter } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";

const socialLinks = [
  { href: siteConfig.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  { href: siteConfig.githubUrl, label: "GitHub", Icon: Github },
  { href: siteConfig.twitterUrl, label: "X / Twitter", Icon: Twitter },
  { href: siteConfig.discordUrl, label: "Discord", Icon: MessageCircle },
];

const platformLinks = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/waitlist", label: "Waitlist" },
];

const resourceLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/getting-started", label: "Getting started" },
  { href: "/docs/ci-cd", label: "CI/CD guide" },
  { href: "/blog", label: "Blog" },
];

const companyLinks = [
  { href: "/company", label: "Company" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="ink-section-muted border-t border-white/10">
      <div className="site-container py-16 md:py-20">
        <div className="grid gap-12 border-b border-white/10 pb-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div className="max-w-2xl">
            <p className="section-kicker ink-kicker">Sepurux</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Reliability infrastructure for teams shipping AI into production.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Record the real trace, replay it under controlled failure, enforce policy, and gate
              the release before the incident reaches a customer.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                className="teal-glow-btn inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.34)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white"
              >
                Create workspace
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link
                href="/waitlist"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                Join waitlist
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Platform
              </p>
              <div className="mt-4 space-y-3">
                {platformLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-sm text-slate-200 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Resources
              </p>
              <div className="mt-4 space-y-3">
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-sm text-slate-200 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Company
              </p>
              <div className="mt-4 space-y-3">
                {companyLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-sm text-slate-200 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="block text-sm text-slate-200 transition-colors hover:text-white"
                >
                  {siteConfig.supportEmail}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-xs tracking-[0.14em] text-slate-500 md:items-end">
            <p>© {new Date().getFullYear()} Sepurux</p>
            <p>Replay. Mutate. Gate. Govern.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

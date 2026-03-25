// site/components/layout/footer.tsx
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { Github, Linkedin, MessageCircle, Twitter } from "lucide-react";

import { siteConfig } from "@/lib/site";

const socialLinks = [
  { href: siteConfig.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  { href: siteConfig.githubUrl, label: "GitHub", Icon: Github },
  { href: siteConfig.twitterUrl, label: "X / Twitter", Icon: Twitter },
  { href: siteConfig.discordUrl, label: "Discord", Icon: MessageCircle },
];

export function Footer() {
  return (
    <footer className="bg-black">
      <div className="site-container border-t border-white/10 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-base font-semibold text-white">Sepurux</p>
            <p className="mt-2 max-w-md text-sm text-neutral-500">
              Chaos engineering, replay, and policy-aware reliability testing for AI agents.
            </p>
            <div className="mt-3 space-y-1 text-xs text-neutral-400">
              <p>
                Founder:{" "}
                <a
                  href={`mailto:${siteConfig.founderEmail}`}
                  className="text-neutral-300 transition-colors hover:text-white"
                >
                  {siteConfig.founderEmail}
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-neutral-300 transition-colors hover:text-white"
                >
                  {siteConfig.supportEmail}
                </a>
              </p>
            </div>

            {/* social links */}
            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-neutral-500 transition-colors hover:border-white/20 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-neutral-500">
            <Link href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
            <Link href="/docs" className="transition-colors hover:text-white">
              Docs Home
            </Link>
            <Link href="/docs/getting-started" className="transition-colors hover:text-white">
              Getting Started
            </Link>
            <Link href="/docs/api-reference" className="transition-colors hover:text-white">
              API Guide
            </Link>
            <Link href="/docs/faq" className="transition-colors hover:text-white">
              FAQ
            </Link>
            <Link href="/book-demo" className="transition-colors hover:text-white">
              Book a Demo
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
          </div>
        </div>

        <p className="mt-10 text-xs tracking-[0.14em] text-neutral-600">
          © {new Date().getFullYear()} Sepurux
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Linkedin } from "lucide-react";

import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#213346] bg-[linear-gradient(180deg,rgba(15,21,32,0.94)_0%,rgba(11,16,25,0.98)_100%)]">
      <div className="site-container grid gap-10 py-12 text-sm text-white/62 md:grid-cols-[1.35fr_0.7fr_0.6fr_0.8fr] md:gap-8">
        <div className="max-w-sm">
          <p className="text-base font-medium text-white">Sepurux</p>
          <p className="mt-3 leading-7 text-white/58">
            Reliability infrastructure for AI agents. Replay workflows, inject failures, enforce policies, and
            catch regressions before production.
          </p>
          <p className="mt-6 text-xs tracking-[0.12em] text-white/38">© {new Date().getFullYear()} Sepurux</p>
        </div>

        <div>
          <h3 className="text-base font-medium text-white">Company</h3>
          <div className="mt-5 space-y-4">
            <Link href="/company#about" className="block transition-colors hover:text-[#48c0ff]">
              About
            </Link>
            <Link href="/company#contact" className="block transition-colors hover:text-[#48c0ff]">
              Contact Us
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-white">Follow Us</h3>
          <div className="mt-5">
            <a
              href={siteConfig.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/72 transition-colors hover:border-[#48c0ff]/40 hover:text-[#48c0ff]"
              aria-label="Sepurux on LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-white">Site Map</h3>
          <div className="mt-5 space-y-4">
            <Link href="/" className="block transition-colors hover:text-[#48c0ff]">
              Home
            </Link>
            <Link href="/company#about" className="block transition-colors hover:text-[#48c0ff]">
              About
            </Link>
            <Link href="/book-demo" className="block transition-colors hover:text-[#48c0ff]">
              Book a Demo
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

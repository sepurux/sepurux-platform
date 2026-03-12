"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  // { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/company", label: "Company" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#213346] bg-[linear-gradient(180deg,rgba(17,24,36,0.97)_0%,rgba(12,18,28,0.99)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur">
      <div className="site-container flex h-16 items-center justify-between gap-4 sm:h-20 sm:gap-6">
        <Link href="/" className="inline-flex items-center" aria-label="Sepurux home">
          <span className="sr-only">Sepurux</span>
          <img
            src={siteConfig.logo}
            alt="Sepurux logo"
            width={1536}
            height={1024}
            className="block h-12 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)] sm:h-16 lg:h-20"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-[#48c0ff]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/book-demo"
          className="hidden h-10 items-center justify-center rounded-full border border-[#37b8ff]/40 bg-[#009ef6] px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(0,160,248,0.22)] transition-colors hover:bg-[#12abff] md:inline-flex"
        >
          Book a demo
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:border-[#48c0ff]/40 hover:text-[#48c0ff] md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div id="site-mobile-menu" className="border-t border-[#213346] md:hidden">
          <div className="site-container flex flex-col gap-2 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-medium text-white/78 transition-colors hover:bg-white/5 hover:text-[#48c0ff]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book-demo"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full border border-[#37b8ff]/40 bg-[#009ef6] px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(0,160,248,0.22)] transition-colors hover:bg-[#12abff]"
            >
              Book a demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

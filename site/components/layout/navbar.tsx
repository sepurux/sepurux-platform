"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/docs", label: "Docs" },
  { href: buildAppAuthHref({ mode: "access", intent: "login" }), label: "Login", external: true },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-900 bg-black/90 backdrop-blur">
      <div className="site-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Sepurux home">

          <img
            src={siteConfig.logo}
            alt="Sepurux logo"
            width={1536}
            height={1024}
            className="block h-24 w-auto"
          />

        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="text-sm font-medium text-white/68 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-black text-white transition-colors hover:border-neutral-700 hover:bg-neutral-950 md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div id="site-mobile-menu" className="border-t border-neutral-900 md:hidden">
          <div className="site-container flex flex-col gap-2 py-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="rounded-2xl px-3 py-3 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <Link
              href={buildAppAuthHref({ mode: "demo" })}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full border border-neutral-800 bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-950"
            >
              View Demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

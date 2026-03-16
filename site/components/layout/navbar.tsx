// site/components/layout/navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
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
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl">
      <div className="site-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Sepurux home">
          <img
            src={siteConfig.logo}
            alt="Sepurux logo"
            width={768}
            height={1024}
            className="block h-12 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const isActive = !item.external && pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="relative text-sm font-medium text-white/68 transition-colors hover:text-white"
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-0 h-px w-full rounded-full"
                    style={{ background: "var(--accent-teal)" }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center md:flex">
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-medium text-white transition-all duration-200"
            style={{
              borderColor: "rgba(0,229,204,0.35)",
              background: "rgba(0,229,204,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 1px rgba(0,229,204,0.5), 0 0 20px rgba(0,229,204,0.2)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,204,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,204,0.35)";
            }}
          >
            Try Sepurux
          </a>
        </div>

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

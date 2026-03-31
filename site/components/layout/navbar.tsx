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
  { href: "/blog", label: "Blog" },
  { href: "/sandbox", label: "Sandbox" },
  { href: buildAppAuthHref({ mode: "access", intent: "login" }), label: "Login", external: true },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[--border]">
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
            const isLogin = item.label === "Login";
            const isActive = !item.external && pathname === item.href;

            if (isLogin) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-700 border border-[--border] rounded-md px-3 py-1.5 transition-colors hover:border-[--color-warm] hover:text-[--color-warm]"
                >
                  {item.label}
                </a>
              );
            }

            return (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="relative text-sm font-medium text-gray-700 transition-colors hover:text-[--color-warm]"
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-0 h-px w-full rounded-full"
                    style={{ background: "var(--color-warm)" }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center md:flex">
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-all duration-200 hover:brightness-110"
            style={{ background: "var(--color-accent)" }}
          >
            Try Sepurux
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[--border] bg-white text-gray-700 transition-colors hover:border-[--color-warm] hover:text-[--color-warm] md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div id="site-mobile-menu" className="border-t border-[--border] md:hidden">
          <div className="site-container flex flex-col gap-2 py-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-[--surface-2] hover:text-[--color-warm]"
              >
                {item.label}
              </a>
            ))}
            <Link
              href={buildAppAuthHref({ mode: "demo" })}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-md border border-[--border] bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:border-[--color-warm] hover:text-[--color-warm]"
            >
              View Demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

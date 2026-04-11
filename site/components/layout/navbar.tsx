"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/docs", label: "Docs" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/company", label: "Company" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="site-container">
        <div className="flex min-h-[78px] items-center justify-between gap-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Sepurux home">
            <img
              src={siteConfig.logo}
              alt="Sepurux logo"
              width={768}
              height={1024}
              className="block h-10 w-auto shrink-0"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={buildAppAuthHref({ mode: "access", intent: "login" })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
            >
              Login
            </a>
            <Link
              href="/waitlist"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              Waitlist
            </Link>
            <a
              href={buildAppAuthHref({ mode: "access", intent: "signup" })}
              className="teal-glow-btn inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.34)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white"
            >
              Start free
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen ? (
          <div id="site-mobile-menu" className="border-t border-slate-200 pb-4 pt-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/waitlist"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700"
                >
                  Join waitlist
                </Link>
                <a
                  href={buildAppAuthHref({ mode: "access", intent: "login" })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                >
                  Login
                </a>
                <a
                  href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                  className="teal-glow-btn inline-flex h-11 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.34)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white sm:col-span-2"
                >
                  Start free
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

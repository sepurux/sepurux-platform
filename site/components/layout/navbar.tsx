"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { buildAppAuthHref, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/sandbox", label: "Debug" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loginHref = buildAppAuthHref({ mode: "access", intent: "login", next: "/" });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,8,13,0.88)" : "rgba(8,8,13,0.5)",
        backdropFilter: "blur(20px) saturate(1.1)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
      }}
    >
      <div className="site-container">
        <div className="flex min-h-[78px] items-center justify-between gap-6 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Sepurux home">
            <img
              src={siteConfig.logo}
              alt="Sepurux"
              width={768}
              height={1024}
              className="block h-8 w-auto shrink-0"
            />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] lg:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-10 items-center rounded-full px-4 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-all duration-200",
                    isActive
                      ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-[rgba(155,152,171,0.72)] hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={loginHref}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-[rgba(241,240,245,0.84)] transition-colors hover:border-white/16 hover:bg-white/10 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/sandbox"
              className="group inline-flex items-center gap-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-colors"
              style={{ color: "rgba(167,139,250,0.8)" }}
            >
              Try it free
              <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:text-white lg:hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileOpen && (
          <div
            id="site-mobile-menu"
            className="border-t border-white/8 bg-[rgba(8,8,13,0.92)] pb-6 pt-4 lg:hidden"
            style={{ backdropFilter: "blur(18px) saturate(1.08)" }}
          >
            <div className="grid gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-[18px] border px-4 py-3 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-all duration-200",
                      isActive
                        ? "border-white/10 bg-white/[0.08] text-white"
                        : "border-transparent bg-white/[0.03] text-white/50 hover:border-white/8 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    <span>{item.label}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-opacity",
                        isActive ? "bg-[var(--color-accent)] opacity-100" : "bg-white/20 opacity-0"
                      )}
                    />
                  </Link>
                );
              })}
              <div className="mt-4 flex flex-col gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <Link
                  href={loginHref}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[rgba(241,240,245,0.84)] transition-colors hover:border-white/16 hover:bg-white/10 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/sandbox"
                  className="inline-flex items-center gap-2 font-mono text-[12px] font-medium uppercase tracking-[0.1em]"
                  style={{ color: "rgba(167,139,250,0.8)" }}
                >
                  Try it free →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

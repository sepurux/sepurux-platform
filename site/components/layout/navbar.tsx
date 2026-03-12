import Link from "next/link";

import { buildAppAuthHref, siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/company", label: "Company" },
];

export function Navbar() {
  const getAccessHref = buildAppAuthHref({
    mode: "access",
    intent: "signup",
    plan: "team",
    utmSource: "site",
    utmMedium: "navbar",
    utmCampaign: "get-access",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(35,37,42,0.97)_0%,rgba(24,26,31,0.99)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="site-container flex h-20 items-center justify-between gap-6">
        <Link href="/" className="inline-flex items-center" aria-label="Sepurux home">
          <span className="sr-only">Sepurux</span>
          <img
            src={siteConfig.logo}
            alt="Sepurux logo"
            width={1536}
            height={1024}
            className="block h-20 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-[#ff7569]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={getAccessHref}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#ff6a5f]/40 bg-[#ef584d] px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(239,88,77,0.22)] transition-colors hover:bg-[#ff6c61]"
        >
          Request Access
        </a>
      </div>
    </header>
  );
}

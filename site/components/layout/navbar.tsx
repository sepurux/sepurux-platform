import Link from "next/link";

import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  // { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/company", label: "Company" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#213346] bg-[linear-gradient(180deg,rgba(17,24,36,0.97)_0%,rgba(12,18,28,0.99)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur">
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
              className="text-sm font-medium text-white/70 transition-colors hover:text-[#48c0ff]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/book-demo"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#37b8ff]/40 bg-[#009ef6] px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(0,160,248,0.22)] transition-colors hover:bg-[#12abff]"
        >
          Book a demo
        </Link>
      </div>
    </header>
  );
}

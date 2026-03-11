import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/company", label: "Company" },
];

export function Navbar() {
  const getAccessHref = `${siteConfig.appUrl}/auth?mode=access&intent=signup&utm_source=site&utm_medium=navbar&utm_campaign=get-access`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/84 backdrop-blur-xl">
      <div className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="Sepurux home">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-primary/35 bg-primary/12 shadow-[0_0_16px_rgba(59,130,246,0.20)]">
            <Image src="/logo.png" alt="Sepurux logo" width={26} height={26} priority />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">Sepurux</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-[10px] border border-border/80 bg-card/78 p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm">
          <a href={getAccessHref}>Request Access</a>
        </Button>
      </div>
    </header>
  );
}

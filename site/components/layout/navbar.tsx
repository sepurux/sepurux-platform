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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-0" aria-label="Sepurux home">
          <Image src="/logo.png" alt="Sepurux logo" width={130} height={130} priority />
          <span className="-ml-6 text-xl font-semibold tracking-tight text-foreground">
            Sepurux
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm" variant="outline">
          <a href={getAccessHref}>Request Access</a>
        </Button>
      </div>
    </header>
  );
}

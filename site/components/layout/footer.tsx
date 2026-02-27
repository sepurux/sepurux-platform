import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-card/20">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Crash Lab. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/product" className="hover:text-foreground">
            Product
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

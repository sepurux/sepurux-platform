import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-card/20">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Sepurux. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/felixkwasisarpong/Sepurux"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <Link href="/docs#api" className="hover:text-foreground">
            API
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
        </div>
      </div>
    </footer>
  );
}

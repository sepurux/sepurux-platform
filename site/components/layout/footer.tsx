import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-900 bg-transparent">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-semibold text-white">Sepurux</p>
          <p className="mt-2 max-w-md text-sm text-neutral-500">
            Chaos engineering, replay, and policy-aware reliability testing for AI agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link href="/docs" className="transition-colors hover:text-white">
            Docs
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
          <Link href="/book-demo" className="transition-colors hover:text-white">
            Book a Demo
          </Link>
        </div>
      </div>
      <div className="site-container pb-8 text-xs tracking-[0.14em] text-neutral-600">
        © {new Date().getFullYear()} Sepurux
      </div>
    </footer>
  );
}

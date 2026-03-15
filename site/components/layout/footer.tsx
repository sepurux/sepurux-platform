import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-black">
      <div className="site-container border-t border-white/10 py-12">
        <div className="flex flex-col gap-6 text-sm text-neutral-500 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-base font-semibold text-white">Sepurux</p>
            <p className="mt-2 max-w-md text-sm text-neutral-500">
              Chaos engineering, replay, and policy-aware reliability testing for AI agents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm">
            <Link href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
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

        <p className="mt-10 text-xs tracking-[0.14em] text-neutral-600">
          © {new Date().getFullYear()} Sepurux
        </p>
      </div>
    </footer>
  );
}

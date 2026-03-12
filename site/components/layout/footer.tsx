import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#213346] bg-[linear-gradient(180deg,rgba(15,21,32,0.94)_0%,rgba(11,16,25,0.98)_100%)]">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-white/62 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Sepurux. Reliability infrastructure for AI agents.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/docs" className="transition-colors hover:text-[#48c0ff]">
            Docs
          </Link>
          {/* <a
            href="https://github.com/felixkwasisarpong/Sepurux"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[#48c0ff]"
          >
            GitHub
          </a> */}
          <Link href="/docs#api" className="transition-colors hover:text-[#48c0ff]">
            API
          </Link>
          {/* <Link href="/pricing" className="transition-colors hover:text-[#48c0ff]">
            Pricing
          </Link> */}
        </div>
      </div>
    </footer>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type DocsNavItem = {
  href: string;
  label: string;
};

export type DocsAction = {
  href: string;
  label: string;
  external?: boolean;
};

export function DocsShell({
  kicker,
  title,
  description,
  nav,
  actions,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  nav: DocsNavItem[];
  actions?: DocsAction[];
  children: ReactNode;
}) {
  return (
    <div className="bg-black text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-[#051016] via-[#04070f] to-black">
        <div className="site-container py-14 md:py-20">
          <p className="section-kicker">{kicker}</p>
          <h1 className="page-hero-title mt-4 text-white">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">{description}</p>

          {actions && actions.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action) => {
                if (action.external) {
                  return (
                    <a
                      key={action.href}
                      href={action.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
                    >
                      {action.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  );
                }
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
                  >
                    {action.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="site-container py-10 md:py-12 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside className="mb-8 lg:mb-0">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:sticky lg:top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">On this page</p>
              <nav className="mt-4 space-y-1">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="space-y-8">{children}</article>
        </div>
      </section>
    </div>
  );
}

export function DocsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-7">
      <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300 md:text-base">{description}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export function DocsCodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      {label ? (
        <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-neutral-200 md:px-5 md:py-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function DocsCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white" />
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-300">{description}</p>
    </Link>
  );
}

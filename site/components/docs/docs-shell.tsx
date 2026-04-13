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
    <div className="page-shell bg-background text-foreground">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_320px] lg:items-end">
            <div className="max-w-4xl">
              <p className="section-kicker ink-kicker">{kicker}</p>
              <h1 className="page-hero-title mt-4 text-white">{title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{description}</p>

              {actions && actions.length > 0 ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  {actions.map((action) => {
                    const baseClassName = action.external
                      ? "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/10 hover:text-white"
                      : "inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/10 hover:text-white";

                    if (action.external) {
                      return (
                        <a
                          key={action.href}
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                          className={baseClassName}
                        >
                          {action.label}
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      );
                    }

                    return (
                      <Link key={action.href} href={action.href} className={baseClassName}>
                        {action.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="border-l border-white/10 pl-0 lg:pl-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Navigation
              </p>
              <nav className="mt-4 space-y-3">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="site-container py-10 md:py-12">
          <article className="mx-auto max-w-6xl space-y-10">{children}</article>
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
    <section id={id} className="scroll-mt-28 border-t border-[--border] py-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[--text-primary]">{title}</h2>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300 md:text-base">{description}</p>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}

export function DocsCodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[var(--ink-925)] shadow-[0_18px_44px_rgba(6,8,12,0.14)]">
      {label ? (
        <div className="border-b border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-slate-200 md:px-5 md:py-5">
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
      className="group flex items-start justify-between gap-6 border-t border-[--border] py-5 transition-colors"
    >
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-[--text-primary] transition-colors group-hover:text-[--color-accent]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      </div>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[--color-accent]" />
    </Link>
  );
}

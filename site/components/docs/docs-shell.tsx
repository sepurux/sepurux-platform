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
    <div className="bg-background text-foreground">
      <section className="ink-section border-b border-white/10">
        <div className="site-container py-14 md:py-20">
          <p className="section-kicker ink-kicker">{kicker}</p>
          <h1 className="page-hero-title mt-4 text-white">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{description}</p>

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
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-white/30 hover:bg-white/10"
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-white/30 hover:bg-white/10"
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
            <div className="rounded-3xl border border-[--border] bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">On this page</p>
              <nav className="mt-4 space-y-1">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-[--surface-2] hover:text-[--text-primary]"
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
    <section id={id} className="scroll-mt-28 rounded-3xl border border-[--border] bg-white p-6 shadow-panel md:p-7">
      <h2 className="text-2xl font-semibold tracking-tight text-[--text-primary]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export function DocsCodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">
      {label ? (
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
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
      className="group rounded-2xl border border-[--border] bg-[--surface-2] p-5 transition-colors hover:border-[--color-accent] hover:bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-[--text-primary]">{title}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[--color-accent]" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

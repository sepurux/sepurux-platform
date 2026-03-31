import type { Metadata } from "next";
import Link from "next/link";

import { blogPosts, formatBlogDate } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Engineering articles on AI agent reliability, chaos testing, and building production-safe agentic systems.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-background">
      <section className="ink-section border-b border-white/10">
        <div className="site-container py-16 md:py-24">
          <header className="max-w-3xl">
            <p className="section-kicker ink-kicker">Blog</p>
            <h1 className="page-hero-title mt-3 text-white">
              Building reliable AI agents.
            </h1>
            <p className="mt-5 text-lg text-slate-300">
              Engineering articles on chaos testing, replay infrastructure, and
              shipping AI agents with fewer production surprises.
            </p>
          </header>
        </div>
      </section>

      <div className="site-container py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-[24px] border border-[--border] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.07),0_4px_16px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ background: "rgba(79,135,103,0.1)", color: "var(--color-warm)" }}>
                  {post.category}
                </span>
                <span className="text-xs text-[--muted-foreground]">{post.readMinutes} min read</span>
              </div>

              <h2 className="mt-3 text-lg font-semibold leading-snug text-[--text-primary] transition-colors group-hover:text-[--color-accent]">
                {post.title}
              </h2>

              <p className="mt-2 flex-1 text-sm leading-7 text-slate-500">
                {post.description}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-[--border] pt-4">
                <time className="text-xs text-slate-400" dateTime={post.date}>
                  {formatBlogDate(post.date)}
                </time>
                <span className="text-xs font-medium transition-colors" style={{ color: "var(--color-accent)" }}>
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

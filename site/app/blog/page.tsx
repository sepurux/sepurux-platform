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
  const [featured, ...rest] = sorted;

  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <header className="max-w-3xl">
            <p className="section-kicker ink-kicker">Blog</p>
            <h1 className="page-hero-title mt-3 text-white">Writing about reliable AI systems.</h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Essays, implementation notes, and practical guidance on replay, mutation testing, CI
              gates, and the operational realities of shipping agentic software.
            </p>
          </header>
        </div>
      </section>

      <div className="site-container py-12 md:py-16">
        <section className="border-b border-[--border] pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Featured article
          </p>
          <Link href={`/blog/${featured.slug}`} className="mt-5 block">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="metric-chip-light">{featured.category}</span>
                <span>{formatBlogDate(featured.date)}</span>
                <span>{featured.readMinutes} min read</span>
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[--text-primary] md:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                  {featured.description}
                </p>
              </div>
            </div>
          </Link>
        </section>

        <section className="pt-6">
          <div className="divide-y divide-[--border]">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block py-6 transition-colors hover:text-[--color-accent]">
                <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_140px] lg:items-start lg:gap-8">
                  <div className="text-sm text-slate-500">
                    <p>{formatBlogDate(post.date)}</p>
                    <p className="mt-1">{post.readMinutes} min read</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {post.category}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[--text-primary]">
                      {post.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                      {post.description}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-slate-500 lg:text-right">Read article</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

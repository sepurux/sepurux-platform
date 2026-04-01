import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { blogPosts, formatBlogDate, getBlogPost, type BlogSection } from "@/lib/blog";
import { buildAppAuthHref, buildPageMetadata, siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    ...buildPageMetadata({
      title: post.title,
      description: post.description,
      path: `/blog/${post.slug}`,
    }),
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${siteConfig.url}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      siteName: siteConfig.name,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-14 md:py-20">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All posts
          </Link>
          <div className="mt-6 max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="accent-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                {post.category}
              </span>
              <span>{formatBlogDate(post.date)}</span>
              <span>{post.readMinutes} min read</span>
            </div>
            <h1 className="page-hero-title mt-4 max-w-4xl text-white">{post.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">{post.description}</p>
          </div>
        </div>
      </section>

      <div className="site-container py-12 md:py-16">
        <div className="grid gap-10 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-14">
          <aside className="self-start xl:sticky xl:top-28">
            <div className="border-t border-[--border] pt-4 text-sm text-slate-500">
              <p>Published</p>
              <p className="mt-1 text-[--text-primary]">{formatBlogDate(post.date)}</p>
            </div>
            <div className="mt-6 border-t border-[--border] pt-4 text-sm text-slate-500">
              <p>Category</p>
              <p className="mt-1 text-[--text-primary]">{post.category}</p>
            </div>
            <div className="mt-6 border-t border-[--border] pt-4 text-sm text-slate-500">
              <p>Reading time</p>
              <p className="mt-1 text-[--text-primary]">{post.readMinutes} min</p>
            </div>
          </aside>

          <div>
            <article className="mx-auto max-w-3xl space-y-5">
              {post.sections.map((section, i) => (
                <BlogSectionRenderer key={i} section={section} />
              ))}
            </article>

            <div className="mt-14 border-t border-[--border] pt-8">
              <p className="text-lg font-semibold text-[--text-primary]">Ready to test your agent?</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Instrument in minutes, replay under fault injection, and block regressions before
                production.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Try Sepurux free
                </a>
                <Link
                  href="/docs/getting-started"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[--border] bg-white/8 px-5 text-sm font-medium text-[--text-primary] transition-colors hover:border-[rgba(var(--accent-rgb),0.24)] hover:text-[--color-accent]"
                >
                  Read the docs
                </Link>
              </div>
            </div>

            <div className="mt-8 border-t border-[--border] pt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-[--color-accent]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to all posts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogSectionRenderer({ section }: { section: BlogSection }) {
  switch (section.type) {
    case "h2":
      return (
        <h2
          className="pt-6 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[--text-primary]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {section.text}
        </h2>
      );
    case "h3":
      return <h3 className="pt-3 text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">{section.text}</h3>;
    case "p":
      return <p className="text-[16px] leading-8 text-slate-300">{section.text}</p>;
    case "ul":
      return (
        <ul className="space-y-3 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[16px] leading-8 text-slate-300">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-3 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[16px] leading-8 text-slate-300">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[var(--ink-925)]">
          {section.lang ? (
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{section.lang}</span>
            </div>
          ) : null}
          <pre className="overflow-x-auto p-5 text-[13px] leading-7 text-slate-200">
            <code>{section.content}</code>
          </pre>
        </div>
      );
    case "callout":
      return (
        <blockquote className="border-l-2 border-[var(--color-accent)] pl-5 text-[16px] font-medium leading-8 text-[--text-primary]">
          {section.text}
        </blockquote>
      );
    default:
      return null;
  }
}

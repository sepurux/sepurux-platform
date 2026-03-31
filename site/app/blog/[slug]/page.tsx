import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { blogPosts, getBlogPost, formatBlogDate, type BlogSection } from "@/lib/blog";
import { buildPageMetadata, siteConfig } from "@/lib/site";

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
    <div className="bg-background">
      {/* Hero */}
      <section className="ink-section border-b border-white/10">
        <div className="site-container py-14 md:py-20">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All posts
          </Link>
          <div className="mt-6 max-w-2xl">
            <div className="flex items-center gap-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]"
                style={{ background: "rgba(215,132,59,0.18)", color: "rgba(253,186,116,0.9)" }}
              >
                {post.category}
              </span>
              <span className="text-sm text-slate-400">{post.readMinutes} min read</span>
            </div>
            <h1 className="page-hero-title mt-4 text-white">{post.title}</h1>
            <p className="mt-4 text-base text-slate-300">{post.description}</p>
            <time className="mt-4 block text-sm text-slate-400" dateTime={post.date}>
              {formatBlogDate(post.date)}
            </time>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="site-container py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <article className="space-y-5">
            {post.sections.map((section, i) => (
              <BlogSectionRenderer key={i} section={section} />
            ))}
          </article>

          {/* CTA */}
          <div
            className="mt-14 rounded-[24px] p-8 text-center"
            style={{
              border: "1px solid rgba(79,135,103,0.22)",
              background:
                "linear-gradient(135deg, rgba(79,135,103,0.14), rgba(215,132,59,0.07) 60%)",
            }}
          >
            <p className="text-lg font-semibold text-[--text-primary]">
              Ready to test your agent?
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Instrument in minutes, replay under fault injection, and block regressions before
              production.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={`${siteConfig.appUrl}/auth?mode=access&intent=signup`}
                className="inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-all hover:brightness-110"
                style={{ background: "var(--color-accent)" }}
              >
                Try Sepurux free
              </a>
              <Link
                href="/docs/getting-started"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[--border] px-5 text-sm font-medium text-[--text-primary] transition-colors hover:border-[--color-warm] hover:text-[--color-warm]"
              >
                Read the docs
              </Link>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-10 border-t border-[--border] pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[--color-warm]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to all posts
            </Link>
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
        <h2 className="pt-4 text-2xl font-semibold leading-snug text-[--text-primary]" style={{ fontFamily: "var(--font-display), sans-serif", letterSpacing: "-0.02em" }}>
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="pt-2 text-lg font-semibold text-[--text-primary]">
          {section.text}
        </h3>
      );
    case "p":
      return (
        <p className="text-[15px] leading-8 text-slate-600">{section.text}</p>
      );
    case "ul":
      return (
        <ul className="space-y-2.5 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] leading-7 text-slate-600">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-warm)" }} />
              {item}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="space-y-2.5 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-7 text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: "var(--color-warm)" }}>
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <div className="overflow-hidden rounded-2xl border border-[--border]">
          {section.lang && (
            <div className="flex items-center gap-2 border-b border-[--border] bg-[--surface-2] px-4 py-2">
              <span className="text-xs font-medium text-slate-500">{section.lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto bg-[#0f1c1e] p-5 text-[13px] leading-7 text-slate-200">
            <code>{section.content}</code>
          </pre>
        </div>
      );
    case "callout":
      return (
        <blockquote
          className="rounded-2xl p-5 text-[15px] font-medium leading-7"
          style={{
            borderLeft: "3px solid var(--color-warm)",
            background: "rgba(79,135,103,0.07)",
            color: "var(--color-warm)",
          }}
        >
          {section.text}
        </blockquote>
      );
    default:
      return null;
  }
}

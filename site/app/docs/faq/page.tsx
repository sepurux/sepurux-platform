import type { Metadata } from "next";
import Link from "next/link";

import { DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ & Support",
  description:
    "Answers to common Sepurux documentation questions about onboarding, integrations, CI/CD gating, and enterprise support.",
  path: "/docs/faq",
});

const faqs = [
  {
    question: "Do we need to change our agent framework to use Sepurux?",
    answer:
      "No. You can start with HTTP trace uploads or use SDK recorders for Python, TypeScript, and Go. Integrate incrementally by workflow.",
  },
  {
    question: "Can Sepurux block deployments automatically?",
    answer:
      "Yes, when integrated in CI/CD. Use CI thresholds and treat a fail decision as a blocking status check in your deployment rules.",
  },
  {
    question: "What is the minimum setup for production readiness?",
    answer:
      "Project API keys, project-scoped IDs, baseline mutation packs, CI thresholds, and policy/security controls for irreversible tools.",
  },
  {
    question: "Where do policy and security events show up?",
    answer:
      "Events are attached to runs and can be inspected in the product UI and API endpoints for policy and security event streams.",
  },
  {
    question: "How do we get enterprise support?",
    answer:
      "Use the Book Demo path for architecture review, private deployment options, and governance/compliance planning.",
  },
];

export default function FAQPage() {
  return (
    <DocsShell
      kicker="Docs / FAQ"
      title="Fast answers for teams shipping AI systems."
      description="If you are evaluating rollout, ownership, or governance questions, this page is the quickest way to unblock decisions."
      nav={[
        { href: "#common", label: "Common Questions" },
        { href: "#support", label: "Support Channels" },
      ]}
      actions={[
        { href: "/docs/getting-started", label: "Getting started" },
        { href: "/book-demo", label: "Book demo" },
      ]}
    >
      <DocsSection
        id="common"
        title="Common Questions"
        description="The most frequent onboarding and implementation questions from AI platform teams."
      >
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-5">
              <h3 className="text-base font-semibold text-[--text-primary]">{faq.question}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">{faq.answer}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="support"
        title="Support Channels"
        description="Choose the right path based on urgency and scope."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-5">
            <p className="text-sm font-semibold text-[--text-primary]">Product docs</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Use docs for setup, API behavior, and rollout patterns.</p>
            <p className="mt-3 text-sm">
              <Link href="/docs" className="text-[--text-primary] underline underline-offset-4">Open docs home</Link>
            </p>
          </div>

          <div className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-5">
            <p className="text-sm font-semibold text-[--text-primary]">Email support</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Use email for account and implementation support.</p>
            <p className="mt-3 text-sm">
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-[--text-primary] underline underline-offset-4">
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          <div className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-5">
            <p className="text-sm font-semibold text-[--text-primary]">Architecture review</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Book a walkthrough for CI gate and governance rollout.</p>
            <p className="mt-3 text-sm">
              <Link href="/book-demo" className="text-[--text-primary] underline underline-offset-4">Book a demo</Link>
            </p>
          </div>
        </div>
      </DocsSection>
    </DocsShell>
  );
}

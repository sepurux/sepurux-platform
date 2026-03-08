import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { ReplayTracesSection } from "@/components/sections/replay-traces-section";
import { MutationTestingSection } from "@/components/sections/mutation-testing-section";
import { PolicyGatesSection } from "@/components/sections/policy-gates-section";
import { CIGuardrailsSection } from "@/components/sections/ci-guardrails-section";
import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Sepurux",
  description:
    "Replay workflows, inject failures, enforce policies, and block regressions before production.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <ReplayTracesSection />
      <MutationTestingSection />
      <PolicyGatesSection />
      <CIGuardrailsSection />
      <DashboardPreviewSection />
      <FinalCtaSection />
    </>
  );
}

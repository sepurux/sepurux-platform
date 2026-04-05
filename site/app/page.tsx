// site/app/page.tsx
import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { WalkthroughSection } from "@/components/sections/walkthrough-section";
import { SocialProofSection } from "@/components/sections/social-proof-section";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { IntegrationSection } from "@/components/sections/integration-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { CIGateSection } from "@/components/sections/ci-gate-section";
import { EnterpriseReadinessSection } from "@/components/sections/enterprise-readiness-section";
import { IncidentProofSection } from "@/components/sections/incident-proof-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Sepurux",
  description:
    "Record traces, replay workflows under controlled failure, enforce policy gates, and block risky AI agent releases before production.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WalkthroughSection />
      <SocialProofSection />
      <HowItWorksSection />
      <FeatureGrid />
      <IncidentProofSection />
      <CIGateSection />
      <EnterpriseReadinessSection />
      <IntegrationSection />
      <FinalCtaSection />
    </>
  );
}

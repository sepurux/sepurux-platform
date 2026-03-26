// site/app/page.tsx
import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { SocialProofSection } from "@/components/sections/social-proof-section";
import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { IntegrationSection } from "@/components/sections/integration-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { CIGateSection } from "@/components/sections/ci-gate-section";
import { EnterpriseReadinessSection } from "@/components/sections/enterprise-readiness-section";
import { IncidentProofSection } from "@/components/sections/incident-proof-section";
import { ScreenshotGallerySection } from "@/components/sections/screenshot-gallery-section";
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
      <SocialProofSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <FeatureGrid />
      <CIGateSection />
      <EnterpriseReadinessSection />
      <IncidentProofSection />
      <IntegrationSection />
      <ScreenshotGallerySection />
      <FinalCtaSection />
    </>
  );
}

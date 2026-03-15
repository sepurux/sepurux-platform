// site/app/page.tsx
import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { SocialProofSection } from "@/components/sections/social-proof-section";
import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
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
      <DashboardPreviewSection />
      <FeatureGrid />
      <HowItWorksSection />
      <ScreenshotGallerySection />
      <FinalCtaSection />
    </>
  );
}

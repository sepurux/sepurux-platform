import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { ScreenshotGallerySection } from "@/components/sections/screenshot-gallery-section";
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
      <DashboardPreviewSection />
      <FeatureGrid />
      <HowItWorksSection />
      <ScreenshotGallerySection />
      <FinalCtaSection />
    </>
  );
}

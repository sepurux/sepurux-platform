// site/app/page.tsx
import type { Metadata } from "next";

import { HeroSection } from "@/components/sections/hero-section";
import { WalkthroughSection } from "@/components/sections/walkthrough-section";
import { IntegrationSection } from "@/components/sections/integration-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Sepurux",
  description:
    "Sepurux records real AI agent workflows, tests them under controlled failure, and gives teams a clear release gate before customers are impacted.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <IntegrationSection />
      <WalkthroughSection />
      <FinalCtaSection />
    </>
  );
}

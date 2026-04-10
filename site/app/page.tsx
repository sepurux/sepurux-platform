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
    "Sepurux helps teams record real AI agent workflows, test them under failure, and stop risky releases before they reach customers.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <WalkthroughSection />
      <IntegrationSection />
      <FinalCtaSection />
    </>
  );
}

import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { SolutionStepper } from "@/components/sections/solution-stepper";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { SecuritySection } from "@/components/sections/security-section";
import { PricingPreviewSection } from "@/components/sections/pricing-preview-section";
import { FaqSection } from "@/components/sections/faq-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionStepper />
      <FeatureGrid />
      <HowItWorksSection />
      <SecuritySection />
      <PricingPreviewSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}

import type { Metadata } from "next";

import { WaitlistForm } from "@/components/waitlist-form";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Join The Waitlist",
  description:
    "Request early access to Sepurux. Tell us your role and company, and we will use that to prioritize onboarding for the first cohort.",
  path: "/waitlist",
});

export default function WaitlistPage() {
  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background py-20 sm:py-24">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <p className="section-kicker">Early access</p>
          <h1 className="section-heading mt-4 max-w-2xl">
            Join the Sepurux waitlist before self-serve onboarding opens wider.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            Tell us what team you are on and where reliability work is hurting today. We will use
            that to prioritize the first early-access cohort while billing stays off and onboarding
            remains guided.
          </p>

          <div className="mt-10 rounded-[28px] border border-border/70 bg-card/70 p-3 shadow-panel">
            <WaitlistForm
              title="Request access"
              description="Use a work email if possible. We review submissions manually and prioritize teams with a concrete workflow ready to harden."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

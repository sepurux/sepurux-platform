import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Company",
  description:
    "About Crash Lab and contact information for platform engineering, security, and partnerships.",
  path: "/company",
});

export default function CompanyPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Company</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          We help teams ship AI agents with fewer surprises.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Crash Lab is focused on reliability infrastructure for tool-using AI systems. We build replay,
          chaos, and governance workflows for platform engineers.
        </p>
      </header>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Our team has shipped infrastructure in observability, CI/CD, and platform security. Crash Lab
              brings those practices to AI agent reliability.
            </p>
            <p>
              We believe agents should be tested with the same rigor as distributed systems before they
              touch production workflows.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Email: hello@crashlab.ai</p>
            <p>Security: security@crashlab.ai</p>
            <p>Partnerships: partners@crashlab.ai</p>
            <p>
              Read legal details in <Link href="/legal/privacy" className="text-primary hover:underline">Privacy</Link>{" "}
              and <Link href="/legal/terms" className="text-primary hover:underline">Terms</Link>.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

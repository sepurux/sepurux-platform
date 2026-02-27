export default function TermsPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <article className="max-w-3xl space-y-6 text-sm text-muted-foreground">
        <header>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
          <p className="mt-3">Last updated: February 27, 2026</p>
        </header>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Use of service</h2>
          <p>
            You may use Crash Lab for lawful internal testing and reliability evaluation of AI agent
            systems. You are responsible for compliance with your applicable policies and regulations.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Acceptable use</h2>
          <p>
            You agree not to misuse the platform, attempt unauthorized access, or submit malicious payloads
            outside permitted testing scenarios.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Warranty and liability</h2>
          <p>
            The service is provided on an "as is" basis. Liability is limited to the maximum extent allowed
            by law and detailed in your contract.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
          <p>For legal inquiries: legal@crashlab.ai</p>
        </section>
      </article>
    </div>
  );
}

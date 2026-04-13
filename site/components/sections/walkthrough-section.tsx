export function WalkthroughSection() {
  return (
    <section className="bg-transparent py-16 sm:py-20">
      <div className="site-container">
        <div className="section-shell grid gap-10 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-12 lg:p-10">
          <div className="max-w-xl lg:sticky lg:top-24">
            <p className="section-kicker">Product walkthrough</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              See the full trace-to-campaign flow in one short walkthrough.
            </h2>
            <p className="section-lead mt-5">
              Watch a real agent run become a trace, then a campaign, then a release verdict inside
              Sepurux.
            </p>
            <div className="mt-7 space-y-3 text-sm text-slate-300">
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                1. Receive trace artifact from a real workflow.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                2. Launch replay with controlled failures and policy checks.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                3. Ship with a clear pass/fail signal for release.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 shadow-[0_18px_60px_rgba(0,4,15,0.4)] sm:p-4">
            <div
              className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[var(--ink-950)]"
              style={{ paddingBottom: "57.022175290390706%", height: 0 }}
            >
              <iframe
                src="https://www.loom.com/embed/7db51e4f29214e4384957e54d28f80b8"
                title="Sepurux walkthrough video"
                className="absolute inset-0 h-full w-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

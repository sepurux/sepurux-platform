export function WalkthroughSection() {
  return (
    <section className="bg-transparent py-16 sm:py-20">
      <div className="site-container">
        <div className="grid gap-10 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,32,0.94),rgba(7,13,26,0.96))] p-6 shadow-[0_28px_90px_rgba(0,4,15,0.42)] sm:p-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-12 lg:p-10">
          <div className="max-w-xl">
            <p className="section-kicker">Walking Through The Product</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              See the trace-to-campaign flow the way an operator actually uses it.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Run a real agent path, capture the trace, inspect the scenario, and turn it into a
              repeatable campaign inside Sepurux. The walkthrough shows the exact handoff from SDK
              instrumentation into the reliability workflow.
            </p>
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

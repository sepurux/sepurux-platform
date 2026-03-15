const steps = [
  { title: "Prompt", description: "Capture the agent task and real execution context." },
  { title: "Agent Execution", description: "Replay the exact tool sequence step by step." },
  { title: "Mutation Injection", description: "Inject failures and drift into the same workflow." },
  { title: "Failure Detection", description: "Classify the break point and why it failed." },
  { title: "Reliability Score", description: "Summarize the run into a score your team can act on." },
];

export function HowItWorksSection() {
  return (
    <section className="bg-black py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">How it works</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            Prompt to score in one vertical flow.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-400">
            A simple, visible workflow from trace capture to reliability decision.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex gap-8 border-t border-white/8 py-8 last:border-b last:border-white/8"
            >
              <span className="w-7 shrink-0 pt-0.5 font-mono text-sm tabular-nums text-white/25">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-base leading-7 text-neutral-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

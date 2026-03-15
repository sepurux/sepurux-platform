import { ArrowDown } from "lucide-react";

const steps = [
  { title: "Prompt", description: "Capture the agent task and real execution context." },
  { title: "Agent Execution", description: "Replay the exact tool sequence step by step." },
  { title: "Mutation Injection", description: "Inject failures and drift into the same workflow." },
  { title: "Failure Detection", description: "Classify the break point and why it failed." },
  { title: "Reliability Score", description: "Summarize the run into a score your team can act on." },
];

export function HowItWorksSection() {
  return (
    <section className="site-container mt-24 sm:mt-28">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="section-kicker">How it works</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Prompt to score in one vertical flow.
        </h2>
        <p className="mt-4 text-base leading-8 text-neutral-400">
          A simple, visible workflow from trace capture to reliability decision.
        </p>
      </div>

      <div className="mx-auto max-w-3xl rounded-[32px] border border-neutral-900 bg-[#05070f] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.46)] md:p-8">
        {steps.map((step, index) => {
          return (
            <div key={step.title} className="relative pl-12">
              <span className="absolute left-0 top-1.5 h-5 w-5 rounded-full border border-blue-500/45 bg-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.28)]" />
              {index < steps.length - 1 ? <span className="absolute left-[9px] top-8 h-20 w-px bg-white/10" /> : null}
              <div className="rounded-xl border border-neutral-900 bg-black p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Step {index + 1}</p>
                  <ArrowDown className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-base leading-8 text-neutral-400">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

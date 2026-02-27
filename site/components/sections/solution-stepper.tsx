const steps = ["Trace", "Replay", "Mutate", "Evaluate", "Explain", "Gate"];

export function SolutionStepper() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Solution</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Trace → Replay → Mutate → Evaluate → Explain → Gate
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card/60 p-5">
        <div className="grid gap-3 md:grid-cols-6">
          {steps.map((step, index) => (
            <div
              key={step}
              className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-3"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

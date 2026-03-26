"use client";

const incidents = [
  {
    title: "Database timeout cascade",
    impact: "Would have caused run retries and delayed customer actions.",
    foundBy: "Mutation pack: db.timeout + CI reliability gate",
    action: "Raised as a blocker before merge and fixed in staging.",
  },
  {
    title: "Prompt injection via support tool",
    impact: "Could trigger unauthorized tool actions from crafted user input.",
    foundBy: "Policy + security checks on replayed tool call path",
    action: "Sanitization rule and deny policy added before release.",
  },
  {
    title: "Schema drift in billing webhook",
    impact: "Would break downstream parsing and silently drop events.",
    foundBy: "Replay with mutated response schema and contract checks",
    action: "Parser hardened and validation added before deploy.",
  },
];

export function IncidentProofSection() {
  return (
    <section className="bg-neutral-950 py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Proof</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            What teams catch before production.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-400">
            Real classes of regressions that are difficult to detect with unit tests alone.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {incidents.map((incident) => (
            <article
              key={incident.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[rgba(0,229,204,0.28)]"
            >
              <h3 className="font-display text-xl font-semibold text-white">{incident.title}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-300">{incident.impact}</p>
              <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-teal)]">Detected by</p>
                <p className="text-sm text-neutral-200">{incident.foundBy}</p>
                <p className="text-sm text-neutral-400">{incident.action}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

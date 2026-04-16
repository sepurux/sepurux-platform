"use client";

const incidents = [
  {
    title: "Database timeout cascade",
    impact: "Retries would have stacked, delayed refunds, and obscured the real first failing tool.",
    detectedBy: "Stress test: db.timeout + replay attribution",
    response: "Caught in staging, replayed, and hardened before rollout.",
  },
  {
    title: "Prompt injection through support tooling",
    impact: "An agent could have triggered unauthorized tool actions from crafted external input.",
    detectedBy: "Policy + security checks on replayed support workflow",
    response: "Sanitization and deny rules were added before release.",
  },
  {
    title: "Schema drift in webhook parsing",
    impact: "Downstream logic would have silently dropped billing events while returning superficially valid responses.",
    detectedBy: "Schema stress test + contract validation",
    response: "Parser was hardened and the CI gate blocked the change until fixed.",
  },
];

export function IncidentProofSection() {
  return (
    <section className="bg-transparent py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">Failure classes</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              The costly bugs are the ones that look plausible until production proves otherwise.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Agents rarely fail like ordinary software. They often continue returning believable
              outputs while a schema shifts, a downstream service degrades, or approval logic is
              quietly bypassed.
            </p>
          </div>

          <div className="space-y-8">
            {incidents.map((incident) => (
              <article key={incident.title} className="grid gap-5 border-t border-[--border] pt-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Scenario
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">
                    {incident.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{incident.impact}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Detected by
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[--text-primary]">
                      {incident.detectedBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Outcome
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{incident.response}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

const proofItems = [
  ["3 SDKs", "Python, TypeScript, and Go recorder paths already shipped."],
  ["CI Native", "GitHub workflow gate with scenario coverage and verdicts."],
  ["Policy Aware", "Approval rules, security controls, and unsafe action enforcement."],
  ["Trace First", "Replay the real agent path instead of a synthetic demo path."],
] as const;

const integrations = [
  "OpenAI",
  "LangChain",
  "LangGraph",
  "LlamaIndex",
  "Pydantic AI",
  "Crew AI",
  "OpenTelemetry",
  "GitHub Actions",
  "Webhooks",
  "Custom APIs",
];

export function SocialProofSection() {
  return (
    <section className="bg-transparent py-12 sm:py-14">
      <div className="site-container">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="border-y border-[--border] py-8"
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] xl:items-start">
            <div>
              <p className="section-kicker">Why this feels credible</p>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.04em] text-[--text-primary] md:text-4xl">
                The site should read like a product company, not a component library.
              </h2>
            </div>

            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              {proofItems.map(([value, label]) => (
                <div key={value} className="border-t border-[--border] pt-4">
                  <p className="text-[1.8rem] font-semibold tracking-[-0.05em] text-[--text-primary]">
                    {value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[--border] pt-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <span>Works with</span>
              {integrations.map((item) => (
                <span key={item} className="text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

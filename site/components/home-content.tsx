"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnalyzeTraceDemo } from "@/components/AnalyzeTraceDemo";

// ─── Terminal background log lines ───────────────────────────────────────────

const LOG_LINES = [
  "2026-01-15T14:23:07.002Z [INFO]  trace=trc_8f2d94 agent=revenue-summarizer span=span_a1b2 status=started",
  "2026-01-15T14:23:07.014Z [INFO]  trace=trc_8f2d94 span=span_a1b2 tokens=847 routed=fetch_document",
  "2026-01-15T14:23:07.015Z [INFO]  trace=trc_8f2d94 span=span_d4e5 tool=fetch_document document_id=rev_q3_2024",
  "2026-01-15T14:23:08.220Z [INFO]  trace=trc_9a1c23 agent=onboarding-flow span=span_b3c4 llm=gpt-4o started",
  "2026-01-15T14:23:09.441Z [WARN]  trace=trc_9a1c23 span=span_e5f6 retrieval_latency=2840ms threshold=2000ms",
  "2026-01-15T14:23:10.003Z [INFO]  trace=trc_7f0d11 agent=contract-reviewer span=span_c7d8 tool=parse_pdf",
  "2026-01-15T14:23:11.836Z [ERROR] trace=trc_8f2d94 span=span_d4e5 TOOL_TIMEOUT latency=4821ms",
  "2026-01-15T14:23:11.837Z [WARN]  trace=trc_8f2d94 span=span_g7h8 tool=vector_search fallback=true results=0",
  "2026-01-15T14:23:12.100Z [INFO]  trace=trc_7f0d11 span=span_i9j0 llm=claude-3-5 prompt_tokens=2104",
  "2026-01-15T14:23:13.040Z [WARN]  trace=trc_8f2d94 span=span_g7h8 results=0 fallback_activated=true",
  "2026-01-15T14:23:13.041Z [INFO]  trace=trc_8f2d94 span=span_j1k2 model=gpt-4o prompt_tokens=412",
  "2026-01-15T14:23:13.404Z [ERROR] trace=trc_9a1c23 span=span_k3l4 CONTEXT_OVERFLOW tokens=16420 limit=16384",
  "2026-01-15T14:23:13.933Z [WARN]  trace=trc_8f2d94 span=span_j1k2 output_quality=degraded stale_cache=true",
  "2026-01-15T14:23:13.934Z [ERROR] trace=trc_8f2d94 TRACE_COMPLETE status=FAULTED latency=6928ms",
  "2026-01-15T14:23:14.201Z [INFO]  trace=trc_7f0d11 span=span_m5n6 tool=send_email status=success",
  "2026-01-15T14:23:14.780Z [INFO]  trace=trc_7f0d11 TRACE_COMPLETE status=OK latency=4777ms",
  "2026-01-15T14:23:15.002Z [INFO]  trace=trc_2b8e44 agent=data-pipeline span=span_o7p8 started",
  "2026-01-15T14:23:15.311Z [WARN]  trace=trc_2b8e44 span=span_q9r0 tool=query_db latency=1820ms",
  "2026-01-15T14:23:16.003Z [INFO]  sepurux analysis=ready trace=trc_8f2d94 root_cause=TOOL_TIMEOUT",
  "2026-01-15T14:23:16.004Z [INFO]  sepurux suggestion=add_retry affected_spans=3 confidence=0.97",
];

function TerminalBackground() {
  const doubled = [...LOG_LINES, ...LOG_LINES];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ maskImage: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 80%)" }}
    >
      <div className="terminal-scroll flex flex-col gap-0 pt-16">
        {doubled.map((line, i) => (
          <p
            key={i}
            className="whitespace-nowrap font-mono text-[11px] leading-6 tracking-[0.02em]"
            style={{ color: "rgba(167,139,250,0.07)" }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProblemReel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] shadow-[0_24px_72px_rgba(0,0,0,0.24)] lg:min-h-[520px]"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(124,58,237,0.16), transparent 40%), radial-gradient(circle at bottom left, rgba(6,182,212,0.12), transparent 42%)",
        }}
      />

      <video
        className="absolute inset-0 h-full w-full object-cover opacity-95"
        src="/videos/replay.mp4"
        poster="/images/trace.png"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Looping trace clip showing a failed agent path"
      />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,8,0.06) 0%, rgba(5,5,8,0.08) 44%, rgba(5,5,8,0.38) 72%, rgba(5,5,8,0.88) 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[linear-gradient(180deg,transparent,rgba(5,5,8,0.82)_52%,rgba(5,5,8,0.96))] p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Trace replay
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              A quick visual of the same path the debugger is reading.
            </p>
          </div>
          <span className="metric-chip-light shrink-0">Replay loop</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Home page content ────────────────────────────────────────────────────────

export function HomeContent() {
  return (
    <div style={{ background: "#08080D", color: "#F1F0F5" }}>

      {/* ── 1. OPENING STATEMENT ─────────────────────────────────────────── */}
      <section
        className="relative -mt-[78px] flex min-h-[100svh] flex-col items-start justify-center overflow-hidden px-5 pt-[78px] sm:-mt-[82px] sm:px-8 sm:pt-[82px] lg:px-16"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.09) 0%, transparent 55%)",
        }}
      >
        <TerminalBackground />

        {/* Top accent rule */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.45) 35%, rgba(6,182,212,0.35) 65%, transparent 100%)",
          }}
        />

        <div className="relative z-10 max-w-4xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="mb-8 font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: "rgba(167,139,250,0.6)" }}
          >
            Trace debugger
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-semibold text-white"
            style={{
              fontSize: "clamp(3.2rem, 7.5vw, 6.8rem)",
              lineHeight: "0.91",
              letterSpacing: "-0.056em",
            }}
          >
            Find the step that broke
            <br />
            your agent.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-xl font-sans text-lg leading-7"
            style={{ color: "rgba(155,152,171,0.88)" }}
          >
            Paste JSON, logs, or a trace ID. See the failing step, likely cause,
            and next fix before a user sees it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.58 }}
            className="mt-12"
          >
            <Link
              href="/sandbox"
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[var(--color-accent)] px-6 font-mono text-sm font-semibold text-white shadow-[0_18px_34px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Analyze Trace
              <span
                className="transition-transform duration-200 group-hover:translate-x-1.5"
                aria-hidden
              >
                →
              </span>
            </Link>
          </motion.div>

          <p className="mt-4 max-w-xl font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(155,152,171,0.74)]">
            No signup required for the first trace.
          </p>
        </div>

        {/* Bottom fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{
            background: "linear-gradient(to top, #08080D 0%, transparent 100%)",
          }}
        />
      </section>

      {/* ── 2. THE PROBLEM ───────────────────────────────────────────────── */}
      <section className="px-5 py-32 sm:px-8 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-center">
          <FadeUp className="max-w-3xl">
            <p
              className="font-display font-semibold text-white"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                letterSpacing: "-0.04em",
                lineHeight: "1.12",
              }}
            >
              You ship an agent. It returns garbage, no output, or confidently
              wrong output. You open the logs and find a timeout in step three,
              a silent fallback, or stale data only after the user complains.
            </p>
            <p
              className="mt-8 max-w-xl font-sans text-lg leading-8"
              style={{ color: "rgba(155,152,171,0.95)" }}
            >
              You need the failing step, the likely cause, and the next fix.
            </p>
          </FadeUp>

          <FadeUp delay={0.12}>
            <ProblemReel />
          </FadeUp>
        </div>
      </section>

      {/* ── 3. ANALYZE TRACE ─────────────────────────────────────────────── */}
      <section className="px-5 pb-32 sm:px-8 lg:px-16">
        <FadeUp className="mb-10">
          <h2
            className="font-display font-semibold text-white"
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
              letterSpacing: "-0.042em",
            }}
          >
            One trace. One failing step.{" "}
            <span style={{ color: "rgba(167,139,250,0.75)" }}>One next fix.</span>
          </h2>
          <p
            className="mt-3 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.82)" }}
          >
            Click any span. See what broke, what it cascaded into, and how to
            fix it.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <AnalyzeTraceDemo />
        </FadeUp>
      </section>

      {/* ── 4. FRAMEWORK SUPPORT ─────────────────────────────────────────── */}
      <section
        className="px-5 py-24 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp>
          <p
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Works with the stacks you already ship.
          </p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            {[
              "LangChain",
              "LangGraph",
              "CrewAI",
              "OpenAI Agents SDK",
              "LlamaIndex",
              "Pydantic AI",
              "MCP Workflows",
            ].map((fw) => (
              <span
                key={fw}
                className="font-mono text-sm font-medium"
                style={{ color: "rgba(155,152,171,0.45)" }}
              >
                {fw}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {["Python", "TypeScript", "Go"].map((sdk) => (
              <span
                key={sdk}
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "rgba(124,58,237,0.55)" }}
              >
                {sdk} SDK
              </span>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── 5. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section
        className="px-5 py-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-20">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            How it works
          </p>
        </FadeUp>

        <div className="grid gap-20 md:grid-cols-3 md:gap-12">
          {[
            {
              n: "01",
              title: "Instrument",
              body: "One import. Sepurux captures structured trace spans automatically — no manual instrumentation required.",
              code: "from sepurux import instrument\ninstrument()",
            },
            {
              n: "02",
              title: "Run a chaos campaign",
              body: "Inject realistic faults — timeouts, retrieval failures, truncated outputs — across your agent path in around 30 seconds.",
              code: null,
            },
            {
              n: "03",
              title: "Analyze the trace",
              body: "See the failing step, the cascade, and the next fix. Hand stable cases to CI when you are ready.",
              code: null,
            },
          ].map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.08}>
              <div>
                <p
                  className="mb-6 font-mono text-sm font-semibold"
                  style={{
                    background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {step.n}
                </p>
                <h3
                  className="mb-3 font-display text-xl font-semibold text-white"
                  style={{ letterSpacing: "-0.032em" }}
                >
                  {step.title}
                </h3>
                <p
                  className="font-sans text-sm leading-7"
                  style={{ color: "rgba(155,152,171,0.82)" }}
                >
                  {step.body}
                </p>
                {step.code && (
                  <pre
                    className="mt-6 rounded-lg p-4 font-mono text-[12px] leading-5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(167,139,250,0.8)",
                    }}
                  >
                    {step.code}
                  </pre>
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── 6. CLOSING CTA ───────────────────────────────────────────────── */}
      <section
        className="px-5 py-44 sm:px-8 lg:px-16"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.09) 0%, transparent 55%)",
        }}
      >
        <FadeUp className="max-w-3xl">
          <h2
            className="font-display font-semibold text-white"
            style={{
              fontSize: "clamp(3rem, 7vw, 6rem)",
              lineHeight: "0.9",
              letterSpacing: "-0.055em",
            }}
          >
            Sepurux
          </h2>
          <p
            className="mt-6 font-sans text-lg"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Trace debugger for failed or risky agent runs.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-10">
            <Link
              href="/sandbox"
              className="group inline-flex items-center gap-2 font-mono text-sm font-medium"
              style={{ color: "rgba(167,139,250,0.85)" }}
            >
              Analyze Trace
              <span
                className="transition-transform duration-200 group-hover:translate-x-1.5"
                aria-hidden
              >
                →
              </span>
            </Link>
            <Link
              href="/docs"
              className="font-mono text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "rgba(155,152,171,0.72)" }}
            >
              Read the Docs
            </Link>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}

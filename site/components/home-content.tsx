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

// ─── Failure type cards ───────────────────────────────────────────────────────

const FAILURES = [
  {
    code: "TOOL_TIMEOUT",
    severity: "high",
    headline: "Tool timed out, cascade started.",
    detail:
      "fetch_document hung at 4.8 s. The agent continued on empty output. Three downstream spans degraded silently.",
  },
  {
    code: "SCHEMA_BREAK",
    severity: "high",
    headline: "Tool returned the wrong shape.",
    detail:
      "Expected string, got null. The LLM filled in the gap with plausible-sounding fabricated data.",
  },
  {
    code: "RETRY_EXHAUSTED",
    severity: "high",
    headline: "Retried with identical params. All failed.",
    detail:
      "query_db was called three times with the same arguments. No backoff, no parameter change. Same error each time.",
  },
  {
    code: "CONTEXT_OVERFLOW",
    severity: "medium",
    headline: "Prompt hit the token limit silently.",
    detail:
      "16,420 tokens in, limit is 16,384. The model truncated the last 2,000 tokens without raising an error.",
  },
  {
    code: "FALLBACK_TRIGGERED",
    severity: "medium",
    headline: "Primary failed. Fallback returned nothing.",
    detail:
      "vector_search fell back to cache. Cache returned 0 results. The agent treated that as valid context.",
  },
  {
    code: "HALLUCINATION_RISK",
    severity: "medium",
    headline: "LLM completed from an empty tool output.",
    detail:
      "The document tool returned null. The model generated a summary anyway. Output looks real — it isn't.",
  },
];

const SEVERITY_COLOR: Record<string, string> = {
  high: "rgba(251,113,133,0.9)",
  medium: "rgba(251,191,36,0.75)",
};

// ─── Home page content ────────────────────────────────────────────────────────

export function HomeContent() {
  return (
    <div style={{ background: "#08080D", color: "#F1F0F5" }}>

      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
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
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(167,139,250,0.7)" }}
          >
            AI agent debugger
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
            Your agent failed.
            <br />
            Find out why
            <br />
            in 30 seconds.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-lg font-sans text-lg leading-7"
            style={{ color: "rgba(155,152,171,0.88)" }}
          >
            Paste a trace. Get the exact step that failed, the cascade it caused, and a fix you can ship.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.58 }}
            className="mt-12 flex flex-wrap items-center gap-5"
          >
            <Link
              href="/sandbox"
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[var(--color-accent)] px-6 font-mono text-sm font-semibold text-white shadow-[0_18px_34px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Debug your trace
              <span
                className="transition-transform duration-200 group-hover:translate-x-1.5"
                aria-hidden
              >
                →
              </span>
            </Link>
            <Link
              href="/docs"
              className="group inline-flex h-12 items-center gap-2 font-mono text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "rgba(155,152,171,0.65)" }}
            >
              Read the docs
              <span
                className="transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(155,152,171,0.45)" }}
          >
            Free to use · No account required · Works with any trace format
          </motion.p>
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

      {/* ── 2. WHAT BREAKS ───────────────────────────────────────────────── */}
      <section
        className="px-5 py-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-16">
          <p
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.6)" }}
          >
            What Sepurux catches
          </p>
          <h2
            className="max-w-2xl font-display font-semibold text-white"
            style={{
              fontSize: "clamp(1.8rem, 3.8vw, 3rem)",
              lineHeight: "1.0",
              letterSpacing: "-0.04em",
            }}
          >
            AI agents fail in specific ways.{" "}
            <span style={{ color: "rgba(155,152,171,0.55)" }}>
              Most of them are invisible without a trace.
            </span>
          </h2>
          <p
            className="mt-5 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Sepurux scans your trace for these failure patterns. Each one maps to a root
            cause, not just an error code.
          </p>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAILURES.map((f, i) => (
            <FadeUp key={f.code} delay={i * 0.055}>
              <div
                className="group relative flex h-full flex-col gap-3 rounded-2xl p-5 transition-colors duration-200"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* severity dot */}
                <span
                  className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full"
                  style={{ background: SEVERITY_COLOR[f.severity] }}
                />
                <p
                  className="font-mono text-xs font-semibold tracking-[0.06em]"
                  style={{ color: SEVERITY_COLOR[f.severity] }}
                >
                  {f.code}
                </p>
                <p
                  className="font-sans text-sm font-medium leading-5 text-white"
                >
                  {f.headline}
                </p>
                <p
                  className="font-sans text-xs leading-5"
                  style={{ color: "rgba(155,152,171,0.7)" }}
                >
                  {f.detail}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section
        className="px-5 py-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-20">
          <p
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.6)" }}
          >
            How it works
          </p>
          <h2
            className="max-w-xl font-display font-semibold text-white"
            style={{
              fontSize: "clamp(1.8rem, 3.8vw, 3rem)",
              lineHeight: "1.0",
              letterSpacing: "-0.04em",
            }}
          >
            Three steps.{" "}
            <span style={{ color: "rgba(155,152,171,0.5)" }}>
              Usually under a minute.
            </span>
          </h2>
        </FadeUp>

        <div className="grid gap-16 md:grid-cols-3 md:gap-10">
          {[
            {
              n: "01",
              title: "Paste the trace",
              body: "Drop in JSON, raw logs, a LangSmith run URL, or a bare trace ID. Sepurux parses whatever you have.",
              aside: "No SDK. No account. No setup.",
            },
            {
              n: "02",
              title: "Get the root cause",
              body: "Not just the error — the step that caused it, the cascade it triggered, and which downstream spans it broke.",
              aside: "Sepurux scores each failure by confidence and impact.",
            },
            {
              n: "03",
              title: "Apply the fix",
              body: "Each failure surfaces a concrete code snippet — retry config, timeout tuning, schema guard, or context trim.",
              aside: "When you're ready: replay it, stress test it, gate your next release.",
            },
          ].map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.09}>
              <div className="flex flex-col gap-4">
                <p
                  className="font-mono text-sm font-semibold"
                  style={{
                    background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {step.n}
                </p>
                <h3
                  className="font-display text-xl font-semibold text-white"
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
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "rgba(124,58,237,0.6)" }}
                >
                  {step.aside}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── 4. INTERACTIVE DEMO ──────────────────────────────────────────── */}
      <section
        className="px-5 pb-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-12 pt-32">
          <p
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.6)" }}
          >
            Live example
          </p>
          <h2
            className="font-display font-semibold text-white"
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
              letterSpacing: "-0.042em",
            }}
          >
            A real faulted trace.{" "}
            <span style={{ color: "rgba(167,139,250,0.75)" }}>Click any span.</span>
          </h2>
          <p
            className="mt-3 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            This is what Sepurux surfaces from a live trace — the failing step, the cascade through
            downstream spans, and an inline fix.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <AnalyzeTraceDemo />
        </FadeUp>
      </section>

      {/* ── 5. WHY TRACES ────────────────────────────────────────────────── */}
      <section
        className="px-5 py-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="grid gap-16 md:grid-cols-2 md:gap-24">
          <FadeUp>
            <p
              className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
              style={{ color: "rgba(155,152,171,0.6)" }}
            >
              Why traces
            </p>
            <h2
              className="font-display font-semibold text-white"
              style={{
                fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)",
                lineHeight: "1.05",
                letterSpacing: "-0.04em",
              }}
            >
              Your agent left a trail.
              <br />
              <span style={{ color: "rgba(155,152,171,0.5)" }}>Most devs never read it.</span>
            </h2>
            <p
              className="mt-5 font-sans text-base leading-7"
              style={{ color: "rgba(155,152,171,0.72)" }}
            >
              Every LLM call, every tool invocation, every retry — it&apos;s all in the trace.
              The problem is that raw traces are dense, sequential, and hard to reason about
              under pressure.
            </p>
            <p
              className="mt-4 font-sans text-base leading-7"
              style={{ color: "rgba(155,152,171,0.72)" }}
            >
              Sepurux reads the trace so you don&apos;t have to. It identifies the exact span where
              things diverged, the error that propagated, and the downstream spans that silently
              continued on bad data.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="flex flex-col gap-5">
              {[
                {
                  label: "Paste any format",
                  body: "OpenTelemetry, LangSmith, LangChain callbacks, raw JSON, plain logs. Sepurux normalizes everything into a span tree.",
                },
                {
                  label: "No manual grepping",
                  body: "Stop scrolling through 400-line JSON files looking for the error. Sepurux highlights the exact failure span.",
                },
                {
                  label: "See the cascade",
                  body: "A timeout at step 2 causes a fallback at step 4. That fallback feeds a degraded LLM call at step 6. Sepurux maps the full chain.",
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p className="mb-1.5 font-mono text-xs font-semibold text-white">
                    {item.label}
                  </p>
                  <p
                    className="font-sans text-sm leading-6"
                    style={{ color: "rgba(155,152,171,0.72)" }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── 6. BEYOND DEBUGGING ──────────────────────────────────────────── */}
      <section
        className="px-5 py-32 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-16">
          <p
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.6)" }}
          >
            When you&apos;re ready to go further
          </p>
          <h2
            className="max-w-xl font-display font-semibold text-white"
            style={{
              fontSize: "clamp(1.8rem, 3.8vw, 3rem)",
              lineHeight: "1.0",
              letterSpacing: "-0.04em",
            }}
          >
            Debug first.{" "}
            <span style={{ color: "rgba(155,152,171,0.5)" }}>
              Build reliability workflows when you need them.
            </span>
          </h2>
          <p
            className="mt-5 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Sepurux starts as a debugger. But it can do more if you need it to.
          </p>
        </FadeUp>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              label: "Replay with fault injection",
              body: "Take a stable trace and replay it with injected failures — tool timeouts, schema breaks, rate limits. See if your agent handles them.",
              tag: "Checks",
            },
            {
              label: "Scheduled regression runs",
              body: "Run traces on a cron schedule. Catch regressions before your users do. Get notified when an agent that was passing starts failing.",
              tag: "Test Runs",
            },
            {
              label: "Guardrails for tool behavior",
              body: "Define allow, deny, and approval rules for tool calls. Gate which tools your agent can invoke at runtime.",
              tag: "Guardrails",
            },
          ].map((item, i) => (
            <FadeUp key={item.label} delay={i * 0.07}>
              <div
                className="flex h-full flex-col gap-4 rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span
                  className="self-start rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{
                    background: "rgba(124,58,237,0.12)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    color: "rgba(167,139,250,0.85)",
                  }}
                >
                  {item.tag}
                </span>
                <p className="font-sans text-sm font-semibold text-white">{item.label}</p>
                <p
                  className="font-sans text-xs leading-5"
                  style={{ color: "rgba(155,152,171,0.7)" }}
                >
                  {item.body}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── 7. FRAMEWORK SUPPORT ─────────────────────────────────────────── */}
      <section
        className="px-5 py-20 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp>
          <p
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.52)" }}
          >
            Works with the stacks you already ship
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
                style={{ color: "rgba(155,152,171,0.38)" }}
              >
                {fw}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {["Python", "TypeScript", "Go"].map((sdk) => (
              <span
                key={sdk}
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: "rgba(124,58,237,0.45)" }}
              >
                {sdk} SDK
              </span>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── 8. CLOSING CTA ───────────────────────────────────────────────── */}
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
              fontSize: "clamp(2.4rem, 6vw, 5.2rem)",
              lineHeight: "0.94",
              letterSpacing: "-0.05em",
            }}
          >
            You have a broken agent.
            <br />
            Start here.
          </h2>
          <p
            className="mt-6 max-w-md font-sans text-lg"
            style={{ color: "rgba(155,152,171,0.65)" }}
          >
            No account. No setup. Paste a trace and know what failed and why in 30 seconds.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              href="/sandbox"
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[var(--color-accent)] px-6 font-mono text-sm font-semibold text-white shadow-[0_18px_34px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Debug your trace
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
              style={{ color: "rgba(155,152,171,0.55)" }}
            >
              Read the docs →
            </Link>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}

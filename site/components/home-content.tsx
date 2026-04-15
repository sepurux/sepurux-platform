"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnalyzeTraceDemo } from "@/components/AnalyzeTraceDemo";

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
      "fetch_document hung at 4.8 s. The agent continued on empty output. Three affected steps failed silently.",
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
        className="relative -mt-[78px] overflow-hidden px-5 pb-20 pt-[calc(78px+3.5rem)] sm:-mt-[82px] sm:px-8 sm:pt-[calc(82px+4rem)] lg:px-16"
        style={{
          background:
            "radial-gradient(ellipse at 65% 0%, rgba(124,58,237,0.09) 0%, transparent 52%)",
        }}
      >
        {/* Top accent rule */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.45) 35%, rgba(6,182,212,0.35) 65%, transparent 100%)",
          }}
        />

        {/* Bottom fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to top, #08080D 0%, transparent 100%)" }}
        />

        <div className="relative z-10 mx-auto max-w-[88rem]">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)] lg:gap-14">

            {/* Left: headline + CTA */}
            <div className="flex flex-col">
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
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-display font-semibold text-white"
                style={{
                  fontSize: "clamp(2.6rem, 5.2vw, 4.8rem)",
                  lineHeight: "0.93",
                  letterSpacing: "-0.052em",
                }}
              >
                Your agent failed.
                <br />
                Find out why
                <br />
                in 30 seconds.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="mt-7 max-w-sm font-sans text-base leading-7"
                style={{ color: "rgba(155,152,171,0.85)" }}
              >
                Paste a trace. See the exact step that failed, what broke next, and how to fix it.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.44 }}
                className="mt-9 flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/sandbox"
                  className="group inline-flex h-12 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[var(--color-accent)] px-6 font-mono text-sm font-semibold text-white shadow-[0_18px_34px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
                >
                  Analyze a trace
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
                  style={{ color: "rgba(155,152,171,0.6)" }}
                >
                  Read the docs →
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(155,152,171,0.38)" }}
              >
                No account · Paste any format · Instant results
              </motion.p>
            </div>

            {/* Right: live interactive demo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(167,139,250,0.48)" }}
              >
                Click any span to inspect
              </p>
              <AnalyzeTraceDemo />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── 2. WHAT BREAKS ───────────────────────────────────────────────── */}
      <section
        className="px-5 py-28 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-14">
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
              Most are invisible without a trace.
            </span>
          </h2>
          <p
            className="mt-5 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Sepurux scans your trace for these patterns. Each one maps to a root cause, not just an error code.
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
                <p className="font-sans text-sm font-medium leading-5 text-white">
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
        className="px-5 py-28 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-16">
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
              body: "Not just the error — the step that caused it, what broke next, and which affected steps silently continued on bad data.",
              aside: "Scored by confidence and impact.",
            },
            {
              n: "03",
              title: "Apply the fix",
              body: "Each failure surfaces a concrete code snippet — retry config, timeout tuning, schema guard, or context trim.",
              aside: "Replay it, stress-test it, or add it to CI when you're ready.",
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

      {/* ── 4. BEYOND DEBUGGING ──────────────────────────────────────────── */}
      <section
        className="px-5 py-28 sm:px-8 lg:px-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <FadeUp className="mb-16">
          <p
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(155,152,171,0.6)" }}
          >
            When you need to go deeper
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
              Go further when you need to.
            </span>
          </h2>
          <p
            className="mt-5 max-w-xl font-sans text-base leading-7"
            style={{ color: "rgba(155,152,171,0.72)" }}
          >
            Sepurux starts as a debugger. When you&apos;re ready, you can replay, stress-test, and run scheduled checks from the same trace.
          </p>
        </FadeUp>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              label: "Stress-test a passing trace",
              body: "Take a trace that's working and inject failures — timeouts, schema breaks, rate limits. Find out if your agent handles them before your users do.",
              tag: "Stress Test",
            },
            {
              label: "Run checks on a schedule",
              body: "Run traces on a cron schedule and get notified when a passing agent starts failing. Catch regressions automatically.",
              tag: "Scheduled Runs",
            },
            {
              label: "Set limits on what your agent can do",
              body: "Control which tools your agent can call. Block risky invocations or require human approval before sensitive tool calls go through.",
              tag: "Policy",
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

      {/* ── 5. FRAMEWORK SUPPORT ─────────────────────────────────────────── */}
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
            No account. No setup. Paste a trace and know what failed in 30 seconds.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              href="/sandbox"
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[var(--color-accent)] px-6 font-mono text-sm font-semibold text-white shadow-[0_18px_34px_rgba(124,58,237,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110"
            >
              Analyze a trace
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

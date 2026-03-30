// site/components/sections/integration-section.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const integrations = [
  { name: "OpenAI SDK",    bg: "rgba(16,163,127,0.15)", color: "#10a37f", abbr: "OA" },
  { name: "LangChain",     bg: "rgba(28,127,230,0.15)", color: "#60a5fa", abbr: "LC" },
  { name: "LangGraph",     bg: "rgba(28,127,230,0.15)", color: "#60a5fa", abbr: "LG" },
  { name: "LlamaIndex",    bg: "rgba(108,71,255,0.15)", color: "#a78bfa", abbr: "LI" },
  { name: "Pydantic AI",   bg: "rgba(233,32,99,0.15)", color: "#f472b6", abbr: "PY" },
  { name: "Crew AI",       bg: "rgba(249,115,22,0.15)", color: "#fb923c", abbr: "CR" },
  { name: "OpenTelemetry", bg: "rgba(245,166,35,0.15)", color: "#fbbf24", abbr: "OT" },
  { name: "Vercel AI SDK", bg: "rgba(255,255,255,0.06)", color: "#e2e8f0", abbr: "V" },
  { name: "MCP Tools",     bg: "rgba(6,182,212,0.15)", color: "#22d3ee", abbr: "MC" },
  { name: "Custom APIs",   bg: "rgba(255,255,255,0.08)", color: "#e2e8f0", abbr: "API" },
  { name: "Agent Core",    bg: "rgba(139,92,246,0.15)", color: "#a78bfa", abbr: "AC" },
  { name: "LiteLLM",       bg: "rgba(6,182,212,0.15)",  color: "#22d3ee", abbr: "Li" },
  { name: "Portkey",       bg: "rgba(124,58,237,0.15)", color: "#c4b5fd", abbr: "PK" },
];

const pipeline = [
  { id: "trace.upload", label: "trace.upload", indent: 0, active: false },
  { id: "campaign.bind", label: "campaign.bind", indent: 1, active: false },
  { id: "replay.execute", label: "replay.execute", indent: 1, active: true },
  { id: "mutation.trace", label: "mutation.trace", indent: 1, active: true },
  { id: "policy.events", label: "policy.events", indent: 1, active: false },
  { id: "failure.classify", label: "failure.classify", indent: 0, active: false },
  { id: "ci.batch.decision", label: "ci.batch.decision", indent: 0, active: false },
];

const gateMetrics = [
  { label: "Scenario coverage", value: "100%", pct: 100 },
  { label: "Contract checks", value: "10/10", pct: 100 },
  { label: "Policy unsafe", value: "0", pct: 100 },
  { label: "Pass rate", value: "84%", pct: 84 },
];

/** SVG animated dashed connector — horizontal with mid-elbow */
function DashLine({
  x1, y1, x2, y2,
}: {
  x1: number; y1: number; x2: number; y2: number;
}) {
  const mx = (x1 + x2) / 2;
  const d = `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
  return (
    <path
      d={d}
      fill="none"
      stroke="rgba(0,229,204,0.45)"
      strokeWidth="1.5"
      strokeDasharray="6 4"
      className="march"
    />
  );
}

/** Dashed animated rect border */
function DashRect({
  x, y, w, h, active = false,
}: {
  x: number; y: number; w: number; h: number; active?: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={6}
      fill={active ? "rgba(0,229,204,0.06)" : "transparent"}
      stroke={active ? "rgba(0,229,204,0.7)" : "rgba(255,255,255,0.18)"}
      strokeWidth={1.5}
      strokeDasharray="6 4"
      className="march"
    />
  );
}

export function IntegrationSection() {
  return (
    <section className="relative overflow-hidden bg-black py-24">
      {/* faint teal radial */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(0,229,204,0.07) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl px-6">
        {/* header */}
        <div className="mb-16 text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent-teal)" }}
          >
            Integration
          </p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Keep Your Existing Stack.
            <br />
            Get A Real CI Verdict.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-neutral-400">
            Sepurux records your real traces, replays them with mutation packs, applies policy packs,
            and returns a batch decision you can enforce before merge.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/docs/ci-cd"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Open CI + SDK guide
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* 3-column visual */}
        <motion.div
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr]"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* ── col 1: integration badges ── */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {integrations.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold"
                  style={{ background: item.bg, color: item.color }}
                >
                  {item.abbr}
                </span>
                <span className="truncate text-xs">{item.name}</span>
              </motion.div>
            ))}
          </div>

          {/* ── col 2: SVG animated diagram ── */}
          <div className="mx-auto w-full max-w-sm lg:w-[380px]">
            <svg
              viewBox="0 0 380 340"
              className="w-full"
              aria-hidden="true"
            >
              {/* outer dashed container */}
              <DashRect x={8} y={8} w={364} h={324} />

              {/* inner replay/policy cluster */}
              <DashRect x={40} y={96} w={300} h={184} active />

              {/* span labels */}
              {pipeline.map((s, i) => {
                const y = 44 + i * 46;
                const x = s.indent ? 80 : 52;
                const w = s.indent ? 180 : 240;
                return (
                  <g key={s.id}>
                    {/* connector dot */}
                    <circle
                      cx={x - 10}
                      cy={y + 10}
                      r={3}
                      fill={s.active ? "rgba(0,229,204,0.9)" : "rgba(255,255,255,0.25)"}
                    />
                    {/* dashed line from dot */}
                    <line
                      x1={x - 6}
                      y1={y + 10}
                      x2={x + 8}
                      y2={y + 10}
                      stroke={s.active ? "rgba(0,229,204,0.6)" : "rgba(255,255,255,0.15)"}
                      strokeWidth={1}
                      strokeDasharray="3 2"
                      className="march"
                    />
                    {/* span box */}
                    <rect
                      x={x + 10}
                      y={y}
                      width={w}
                      height={20}
                      rx={4}
                      fill={s.active ? "rgba(0,229,204,0.12)" : "rgba(255,255,255,0.04)"}
                      stroke={s.active ? "rgba(0,229,204,0.5)" : "rgba(255,255,255,0.1)"}
                      strokeWidth={1}
                    />
                    <text
                      x={x + 20}
                      y={y + 13.5}
                      fontSize="9"
                      fontFamily="monospace"
                      fill={s.active ? "rgba(0,229,204,0.9)" : "rgba(255,255,255,0.4)"}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              })}

              {/* gateway badge */}
              <rect x={82} y={296} width={216} height={26} rx={5}
                fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              <text x={94} y={313} fontSize="9" fontFamily="monospace" fill="rgba(0,229,204,0.7)">
                sepurux-gate@main · decision=pass|fail
              </text>

              {/* animated connection lines left → diagram */}
              <DashLine x1={0} y1={80} x2={40} y2={160} />
              <DashLine x1={0} y1={160} x2={40} y2={200} />
              <DashLine x1={0} y1={240} x2={40} y2={240} />

              {/* animated connection lines diagram → right */}
              <DashLine x1={340} y1={130} x2={380} y2={80} />
              <DashLine x1={340} y1={190} x2={380} y2={160} />
              <DashLine x1={340} y1={250} x2={380} y2={240} />
            </svg>
          </div>

          {/* ── col 3: gate metrics ── */}
          <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-1 border-b border-white/10 pb-3">
              <p className="text-sm font-medium text-white">CI Batch Verdict Snapshot</p>
              <p className="mt-1 text-xs text-white/45">From replay + mutation + policy evaluation</p>
            </div>

            {gateMetrics.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="w-36 shrink-0 text-xs text-white/60">{r.label}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-white/8">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: "var(--accent-teal)" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/40">
                  {r.value}
                </span>
              </motion.div>
            ))}

            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-white/30">
                <span className="rounded border border-white/12 bg-white/[0.04] px-2 py-1">trace_count=3</span>
                <span className="rounded border border-white/12 bg-white/[0.04] px-2 py-1">required_tools=9/9</span>
                <span className="rounded border border-white/12 bg-white/[0.04] px-2 py-1">unsafe_attempts=0</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

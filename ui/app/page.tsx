import type { Metadata } from "next";

import { TraceAnalyzerView } from "@/components/analyzer/trace-analyzer-view";

export const metadata: Metadata = {
  title: "Trace Debugger",
  description: "Paste a trace. Find the failing step, why it failed or looks risky, and the next fix.",
};

export default function HomePage() {
  return <TraceAnalyzerView />;
}

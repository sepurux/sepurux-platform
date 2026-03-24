import type { TraceMetadata } from "@/lib/api";

type TraceSdkFields = Pick<TraceMetadata, "sdk_meta" | "source">;

export function resolveTraceSdkLabel(trace: TraceSdkFields): string {
  const explicitMeta = trace.sdk_meta?.trim();
  if (explicitMeta) {
    return explicitMeta;
  }

  const source = trace.source.trim().toLowerCase();
  if (source === "campaign.run_pack") return "api/run-pack";
  if (source === "demo.seed") return "demo/web";

  return "--";
}


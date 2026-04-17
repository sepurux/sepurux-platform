import type { MutationPackMetadata, RunMetadata } from "@/lib/api";

export type RunPresetId = "baseline" | "reliability" | "security";
export type CheckPackClass = "baseline" | "reliability" | "security" | "custom";

export type RunPresetDefinition = {
  id: RunPresetId;
  label: string;
  buttonLabel: string;
  description: string;
  thresholds: {
    min_pass_rate: number;
    max_unsafe: number;
    max_failures: number;
  };
};

const RUN_PRESETS: RunPresetDefinition[] = [
  {
    id: "baseline",
    label: "Baseline Replay",
    buttonLabel: "Run baseline",
    description: "Replay the selected traces without extra checks so you can see the clean baseline first.",
    thresholds: {
      min_pass_rate: 1,
      max_unsafe: 0,
      max_failures: 0,
    },
  },
  {
    id: "reliability",
    label: "Reliability Stress Test",
    buttonLabel: "Run reliability test",
    description: "Attach the default reliability checks to find brittle tools, retries, and timeout failures fast.",
    thresholds: {
      min_pass_rate: 0.8,
      max_unsafe: 0,
      max_failures: 0,
    },
  },
  {
    id: "security",
    label: "Security Stress Test",
    buttonLabel: "Run security test",
    description: "Attach the security checks to surface prompt injection, unsafe tool use, and policy-sensitive failures.",
    thresholds: {
      min_pass_rate: 0.8,
      max_unsafe: 0,
      max_failures: 0,
    },
  },
];

const RELIABILITY_KEYWORDS = [
  "sepurux.core.reliability",
  "core.reliability",
  "core-reliability",
  "tool-chaos",
  "latency-chaos",
  "sepurux.max_chaos",
  "max_chaos",
];

const SECURITY_KEYWORDS = [
  "prompt-security",
  "prompt.injection",
  "sepurux.security.injection",
  "security",
];

function normalizedName(name: string) {
  return name.trim().toLowerCase();
}

function containsKeyword(name: string, keywords: string[]) {
  const normalized = normalizedName(name);
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function listRunPresets() {
  return RUN_PRESETS;
}

export function getRunPreset(id: RunPresetId) {
  return RUN_PRESETS.find((preset) => preset.id === id) ?? RUN_PRESETS[0];
}

export function isRunPresetId(value: string | null | undefined): value is RunPresetId {
  return value === "baseline" || value === "reliability" || value === "security";
}

export function classifyCheckPack(
  record: Pick<MutationPackMetadata, "name" | "is_system"> | null | undefined
): CheckPackClass {
  if (!record) {
    return "baseline";
  }
  if (containsKeyword(record.name, SECURITY_KEYWORDS)) {
    return "security";
  }
  if (containsKeyword(record.name, RELIABILITY_KEYWORDS)) {
    return "reliability";
  }
  return record.is_system ? "reliability" : "custom";
}

function scorePackForPreset(record: MutationPackMetadata, presetId: RunPresetId) {
  if (presetId === "baseline") {
    return -1;
  }

  const normalized = normalizedName(record.name);
  if (presetId === "security") {
    if (containsKeyword(normalized, ["prompt-security"])) return 100;
    if (containsKeyword(normalized, ["prompt.injection"])) return 95;
    if (containsKeyword(normalized, ["security"])) return 90;
    return classifyCheckPack(record) === "security" ? 80 : -1;
  }

  if (containsKeyword(normalized, ["sepurux.core.reliability"])) return 100;
  if (containsKeyword(normalized, ["core.reliability"])) return 95;
  if (containsKeyword(normalized, ["core-reliability"])) return 90;
  if (containsKeyword(normalized, ["tool-chaos"])) return 85;
  if (containsKeyword(normalized, ["latency-chaos"])) return 82;
  if (containsKeyword(normalized, ["max_chaos"])) return 80;
  return classifyCheckPack(record) === "reliability" ? 70 : -1;
}

export function resolvePresetCheckPack(
  packs: MutationPackMetadata[],
  presetId: RunPresetId
): MutationPackMetadata | null {
  if (presetId === "baseline") {
    return null;
  }
  const ranked = packs
    .map((record) => ({
      record,
      score: scorePackForPreset(record, presetId),
    }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.record.coverage_score !== left.record.coverage_score) {
        return right.record.coverage_score - left.record.coverage_score;
      }
      if (left.record.is_system !== right.record.is_system) {
        return left.record.is_system ? -1 : 1;
      }
      return left.record.name.localeCompare(right.record.name);
    });
  return ranked[0]?.record ?? null;
}

export function resolveRunCheckIds(run: Pick<RunMetadata, "summary" | "mutation_pack_id">) {
  const ids = new Set<string>();
  if (typeof run.mutation_pack_id === "string" && run.mutation_pack_id.trim().length > 0) {
    ids.add(run.mutation_pack_id);
  }
  const summary = run.summary;
  if (summary && typeof summary === "object") {
    const resolvedPackIds = (summary as Record<string, unknown>).resolved_mutation_pack_ids;
    if (Array.isArray(resolvedPackIds)) {
      for (const item of resolvedPackIds) {
        if (typeof item === "string" && item.trim().length > 0) {
          ids.add(item);
        }
      }
    }
  }
  return Array.from(ids);
}

export function resolveRunCheckNames(
  run: Pick<RunMetadata, "summary" | "mutation_pack_id">,
  packs: MutationPackMetadata[]
) {
  const packNames = new Map(packs.map((record) => [record.mutation_pack_id, record.name]));
  const ids = resolveRunCheckIds(run);
  if (ids.length === 0) {
    return [];
  }
  return ids.map((id) => packNames.get(id) ?? id);
}

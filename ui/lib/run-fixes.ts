import type {
  AttemptTimeline,
  HardeningTemplateType,
  ReplayAttemptDetail,
  ReplayAttemptListItem,
  RunStats,
  TimelineEvent,
} from "./api";

type RunInsight = RunStats["insights"][number];

type TemplateDraft = {
  name: string;
  type: HardeningTemplateType;
  config: Record<string, unknown>;
};

type AttemptEvidence = {
  attempt: ReplayAttemptListItem | null;
  detail: ReplayAttemptDetail | null;
  timeline: AttemptTimeline | null;
};

export type InsightAutoFixAvailability = {
  supported: boolean;
  reason: string | null;
};

export type FailureReasonShift = {
  baseline: { reason: string; count: number; pct: number };
  currentSameReason: { reason: string; count: number; pct: number };
  currentTop: { reason: string; count: number; pct: number } | null;
  trend: "improved" | "worsened" | "unchanged";
};

const DEFAULT_SANITIZER_FIELDS = ["text", "content", "message", "summary"];
const DEFAULT_SANITIZER_PATTERNS = [
  "ignore previous instructions",
  "disregard previous instructions",
  "system override",
];

export function getInsightAutoFixAvailability(
  insight: RunInsight,
): InsightAutoFixAvailability {
  if (insight.id === "insight.tool_hotspot.replay.execute") {
    return {
      supported: false,
      reason:
        "Replay-contract issues need a campaign replay fix, not a generic hardening rerun.",
    };
  }
  if (insight.id.startsWith("insight.approval_tokens.")) {
    return { supported: true, reason: null };
  }
  if (insight.id.startsWith("insight.schema_adapter.")) {
    return { supported: true, reason: null };
  }
  if (insight.id.startsWith("insight.output_sanitizer.")) {
    return { supported: true, reason: null };
  }
  if (insight.id.startsWith("insight.retry_backoff.")) {
    return { supported: true, reason: null };
  }
  if (insight.id.startsWith("insight.tool_hotspot.")) {
    if (inferRetryableReason(insight) !== null) {
      return { supported: true, reason: null };
    }
    return {
      supported: false,
      reason:
        "Auto rerun is hidden for generic hotspots until there is a concrete retryable failure mode.",
    };
  }
  return {
    supported: false,
    reason: "No automated rerun mapping is available for this insight yet.",
  };
}

export function selectAttemptForInsight(
  insight: RunInsight,
  attempts: ReplayAttemptListItem[],
): ReplayAttemptListItem | null {
  const failedAttempts = attempts.filter((attempt) =>
    attempt.result.toLowerCase().startsWith("fail"),
  );
  if (failedAttempts.length === 0) {
    return null;
  }

  const topTools = new Set(insight.evidence.top_tools.map((item) => item.tool));
  const topReasons = new Set(
    insight.evidence.top_reasons.map((item) => item.reason),
  );
  const topMutations = new Set(
    insight.evidence.top_mutations.map((item) => item.mutation_id),
  );
  const insightToolSuffix = insight.id.replace(/^insight\.[^.]+\./, "");

  return failedAttempts
    .map((attempt, index) => ({
      attempt,
      score: scoreAttemptForInsight(
        insight,
        attempt,
        index,
        insightToolSuffix,
        topTools,
        topReasons,
        topMutations,
      ),
    }))
    .sort((left, right) => right.score - left.score)
    .at(0)?.attempt ?? null;
}

export function buildTemplateFromInsightEvidence(
  insight: RunInsight,
  evidence: AttemptEvidence,
): { template: TemplateDraft | null; reason: string | null } {
  if (insight.id.startsWith("insight.approval_tokens.")) {
    return buildApprovalTemplate(insight, evidence);
  }
  if (insight.id.startsWith("insight.schema_adapter.")) {
    return buildSchemaAdapterTemplate(insight, evidence);
  }
  if (insight.id.startsWith("insight.retry_backoff.")) {
    return buildRetryTemplate(insight, evidence);
  }
  if (insight.id.startsWith("insight.tool_hotspot.")) {
    if (insight.id === "insight.tool_hotspot.replay.execute") {
      return {
        template: null,
        reason:
          "replay.execute hotspots are replay-contract issues. Fix the campaign replay payload instead of applying a generic template.",
      };
    }
    return buildRetryTemplate(insight, evidence);
  }
  if (insight.id.startsWith("insight.output_sanitizer.")) {
    return buildSanitizerTemplate(insight, evidence);
  }
  return {
    template: null,
    reason: "No hardening template mapping is available for this insight yet.",
  };
}

export function compareFailureReasonShift(
  baselineStats: RunStats | null,
  currentStats: RunStats | null,
): FailureReasonShift | null {
  const baseline = baselineStats?.top_failure_reasons.at(0);
  if (!baseline || !currentStats) {
    return null;
  }

  const currentSameReason =
    currentStats.top_failure_reasons.find(
      (item) => item.reason === baseline.reason,
    ) ?? {
      reason: baseline.reason,
      count: 0,
      pct: 0,
    };
  const currentTop = currentStats.top_failure_reasons.at(0) ?? null;
  const trend =
    currentSameReason.count < baseline.count
      ? "improved"
      : currentSameReason.count > baseline.count
        ? "worsened"
        : "unchanged";

  return {
    baseline: baselineReasonRow(baseline),
    currentSameReason: baselineReasonRow(currentSameReason),
    currentTop: currentTop ? baselineReasonRow(currentTop) : null,
    trend,
  };
}

function buildApprovalTemplate(
  insight: RunInsight,
  evidence: AttemptEvidence,
): { template: TemplateDraft | null; reason: string | null } {
  const tool = inferTargetTool(insight, evidence);
  if (!tool) {
    return {
      template: null,
      reason:
        "No affected irreversible tool could be inferred from the failing attempts for this insight.",
    };
  }

  const toolArgs = findFailureToolCall(evidence)?.args;
  const tools = expandIrreversibleTools(tool, toolArgs);

  return {
    template: {
      name: `Template: Confirmation Gate for ${tool}`,
      type: "policy_pack",
      config: {
        engine: "builtin",
        source_attempt_id: evidence.attempt?.attempt_id ?? null,
        target_tool: tool,
        auto_provide_confirmation_token: true,
        confirmation_token_value: "template-auto-confirmation-token",
        policy: {
          version: "0.1",
          defaults: { unknown_tools: "allow" },
          approval: { token_field: "confirmation_token" },
          irreversible: { tools },
        },
      },
    },
    reason: null,
  };
}

function buildSchemaAdapterTemplate(
  insight: RunInsight,
  evidence: AttemptEvidence,
): { template: TemplateDraft | null; reason: string | null } {
  const mappings = extractSchemaMappings(evidence.detail);
  if (Object.keys(mappings).length === 0) {
    return {
      template: null,
      reason:
        "This schema insight does not yet include a concrete field rename to map automatically.",
    };
  }

  const tool = inferTargetTool(insight, evidence) ?? "replay.tool";

  return {
    template: {
      name: `Template: Schema Adapter for ${tool}`,
      type: "schema_adapter",
      config: {
        mappings,
        target_tool: tool,
        source_attempt_id: evidence.attempt?.attempt_id ?? null,
        evidence_mutations: extractAppliedMutationTypes(evidence.detail),
      },
    },
    reason: null,
  };
}

function buildRetryTemplate(
  insight: RunInsight,
  evidence: AttemptEvidence,
): { template: TemplateDraft | null; reason: string | null } {
  const failureReason =
    inferRetryableReasonFromEvidence(insight, evidence) ?? inferRetryableReason(insight);
  if (failureReason === null) {
    return {
      template: null,
      reason:
        "This hotspot is too generic for an automatic retry template because the failure mode is not clearly retryable.",
    };
  }

  const timeoutMs = extractTimeoutMs(evidence.detail);
  const tool = inferTargetTool(insight, evidence) ?? "replay.tool";
  const config =
    failureReason === "rate_limited"
      ? {
          max_retries: 4,
          backoff_ms: 900,
          retry_on: [failureReason],
        }
      : {
          max_retries: timeoutMs !== null && timeoutMs >= 5000 ? 2 : 3,
          backoff_ms:
            timeoutMs !== null
              ? clamp(Math.round(timeoutMs * 0.35), 300, 1600)
              : 450,
          retry_on: [failureReason],
        };

  return {
    template: {
      name: `Template: Retry ${tool}`,
      type: "retry_policy",
      config: {
        ...config,
        target_tool: tool,
        source_attempt_id: evidence.attempt?.attempt_id ?? null,
        evidence_mutations: extractAppliedMutationTypes(evidence.detail),
      },
    },
    reason: null,
  };
}

function buildSanitizerTemplate(
  insight: RunInsight,
  evidence: AttemptEvidence,
): { template: TemplateDraft | null; reason: string | null } {
  const tool = inferTargetTool(insight, evidence) ?? "replay.tool";
  const fields = inferSanitizerFields(evidence);
  const patterns = inferSanitizerPatterns(evidence);

  return {
    template: {
      name: `Template: Sanitize ${tool}`,
      type: "sanitizer",
      config: {
        fields,
        patterns,
        target_tool: tool,
        source_attempt_id: evidence.attempt?.attempt_id ?? null,
        evidence_mutations: extractAppliedMutationTypes(evidence.detail),
      },
    },
    reason: null,
  };
}

function scoreAttemptForInsight(
  insight: RunInsight,
  attempt: ReplayAttemptListItem,
  index: number,
  insightToolSuffix: string,
  topTools: Set<string>,
  topReasons: Set<string>,
  topMutations: Set<string>,
): number {
  let score = 100 - index;

  if (
    attempt.first_failure_tool &&
    topTools.has(attempt.first_failure_tool)
  ) {
    score += 60;
  }
  if (attempt.failure_reason && topReasons.has(attempt.failure_reason)) {
    score += 40;
  }
  if (topMutations.has(attempt.mutation_id)) {
    score += 25;
  }
  if (
    attempt.first_failure_tool &&
    slugify(attempt.first_failure_tool) === insightToolSuffix
  ) {
    score += 15;
  }
  if (
    insight.id.startsWith("insight.approval_tokens.") &&
    attempt.failure_reason === "policy_blocked"
  ) {
    score += 20;
  }
  if (
    insight.id.startsWith("insight.output_sanitizer.") &&
    attempt.mutation_id.toLowerCase().includes("poison")
  ) {
    score += 20;
  }
  if (
    insight.id.startsWith("insight.retry_backoff.") &&
    isRetryableReason(attempt.failure_reason)
  ) {
    score += 20;
  }

  return score;
}

function inferTargetTool(
  insight: RunInsight,
  evidence: AttemptEvidence,
): string | null {
  const failureTool =
    evidence.detail?.first_failure_tool ??
    evidence.attempt?.first_failure_tool ??
    evidence.timeline?.first_failure?.tool;
  if (failureTool) {
    return failureTool;
  }

  const appliedTool = extractAppliedItems(evidence.detail)
    .map((item) => item.tool)
    .find((tool): tool is string => typeof tool === "string" && tool.length > 0);
  if (appliedTool) {
    return appliedTool;
  }

  return insight.evidence.top_tools.at(0)?.tool ?? null;
}

function inferRetryableReasonFromEvidence(
  insight: RunInsight,
  evidence: AttemptEvidence,
): string | null {
  const candidateReasons = [
    evidence.detail?.failure_reason,
    evidence.attempt?.failure_reason,
    evidence.timeline?.first_failure?.reason,
  ];
  for (const reason of candidateReasons) {
    if (isRetryableReason(reason)) {
      return reason;
    }
  }
  return inferRetryableReason(insight);
}

function inferRetryableReason(insight: RunInsight): string | null {
  for (const item of insight.evidence.top_reasons) {
    if (isRetryableReason(item.reason)) {
      return item.reason;
    }
  }
  for (const item of insight.evidence.top_mutations) {
    if (item.mutation_id === "fault.rate_limit") {
      return "rate_limited";
    }
    if (item.mutation_id === "fault.timeout") {
      return "timeout";
    }
  }
  if (insight.id.startsWith("insight.retry_backoff.")) {
    return "timeout";
  }
  return null;
}

function isRetryableReason(reason: string | null | undefined): reason is string {
  return reason === "timeout" || reason === "rate_limited";
}

function findFailureToolCall(evidence: AttemptEvidence): TimelineEvent | null {
  const events = evidence.timeline?.events;
  if (!events || events.length === 0) {
    return null;
  }

  const failureIndex =
    evidence.detail?.first_failure_event_index ??
    evidence.attempt?.first_failure_event_index ??
    evidence.timeline?.first_failure?.event_index;
  const failureTool = inferTargetTool(
    {
      id: "",
      title: "",
      recommendation: "",
      why: "",
      confidence: 0,
      evidence: { top_tools: [], top_mutations: [], top_reasons: [] },
    },
    evidence,
  );

  if (typeof failureIndex === "number") {
    const exactPreceding = events.find(
      (event) =>
        event.type === "tool_call" && event.index === Math.max(0, failureIndex - 1),
    );
    if (exactPreceding) {
      return exactPreceding;
    }
  }

  const matchingToolCalls = events.filter(
    (event) => event.type === "tool_call" && event.tool === failureTool,
  );
  return matchingToolCalls.at(-1) ?? null;
}

function extractSchemaMappings(
  detail: ReplayAttemptDetail | null,
): Record<string, string> {
  const mappings: Record<string, string> = {};
  for (const item of extractAppliedItems(detail)) {
    const details = toRecord(item.details);
    if (!details || details.type !== "schema.rename_field") {
      continue;
    }
    const fromField = typeof details.from === "string" ? details.from : null;
    const toField = typeof details.to === "string" ? details.to : null;
    if (!fromField || !toField) {
      continue;
    }
    mappings[fromField] = toField;
  }
  return mappings;
}

function extractTimeoutMs(detail: ReplayAttemptDetail | null): number | null {
  for (const item of extractAppliedItems(detail)) {
    const details = toRecord(item.details);
    if (!details || details.type !== "fault.timeout") {
      continue;
    }
    const timeoutMs = details.timeout_ms;
    if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) {
      return timeoutMs;
    }
  }
  return null;
}

function inferSanitizerFields(evidence: AttemptEvidence): string[] {
  const fields = new Set<string>();
  for (const item of extractAppliedItems(evidence.detail)) {
    const details = toRecord(item.details);
    const field = typeof details?.field === "string" ? details.field : null;
    if (field) {
      fields.add(field);
    }
  }

  const poisonedResult = findPoisonedToolResult(evidence);
  if (poisonedResult) {
    for (const key of Object.keys(poisonedResult)) {
      if (typeof poisonedResult[key] === "string") {
        fields.add(key);
      }
    }
  }

  if (fields.size === 0) {
    DEFAULT_SANITIZER_FIELDS.forEach((field) => fields.add(field));
  }
  return Array.from(fields).slice(0, 4);
}

function inferSanitizerPatterns(evidence: AttemptEvidence): string[] {
  const patterns = new Set(DEFAULT_SANITIZER_PATTERNS);
  for (const item of extractAppliedItems(evidence.detail)) {
    const details = toRecord(item.details);
    const payload = typeof details?.payload === "string" ? details.payload : null;
    if (payload && payload.trim()) {
      patterns.add(payload.trim());
    }
  }
  return Array.from(patterns).slice(0, 6);
}

function findPoisonedToolResult(
  evidence: AttemptEvidence,
): Record<string, unknown> | null {
  const events = evidence.timeline?.events;
  if (!events || events.length === 0) {
    return null;
  }

  for (const item of extractAppliedItems(evidence.detail)) {
    const details = toRecord(item.details);
    if (!details || details.type !== "poison.inject") {
      continue;
    }
    const eventIndex =
      typeof item.event_index === "number" ? item.event_index : null;
    const tool =
      typeof item.tool === "string" && item.tool.length > 0 ? item.tool : null;
    const matchingEvent = events.find((event) => {
      if (event.type !== "tool_result") {
        return false;
      }
      if (eventIndex !== null && event.index === eventIndex) {
        return true;
      }
      return tool !== null && event.tool === tool;
    });
    if (matchingEvent && matchingEvent.result && typeof matchingEvent.result === "object") {
      return matchingEvent.result as Record<string, unknown>;
    }
  }

  return null;
}

function extractAppliedMutationTypes(detail: ReplayAttemptDetail | null): string[] {
  const types = new Set<string>();
  for (const item of extractAppliedItems(detail)) {
    const details = toRecord(item.details);
    if (typeof details?.type === "string" && details.type) {
      types.add(details.type);
    }
  }
  return Array.from(types);
}

function extractAppliedItems(detail: ReplayAttemptDetail | null): Array<Record<string, unknown>> {
  const applied = detail?.mutation_trace?.applied;
  if (!Array.isArray(applied)) {
    return [];
  }
  return applied.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

function expandIrreversibleTools(
  tool: string,
  args: Record<string, unknown> | undefined,
): string[] {
  const tools = new Set<string>([tool]);
  const commitLike = isCommitLike(tool, args);
  if (tool.endsWith("(commit)")) {
    tools.add(tool.replace(/\(commit\)$/, ""));
  } else if (tool.endsWith("_commit")) {
    tools.add(tool.replace(/_commit$/, ""));
  } else if (commitLike) {
    tools.add(`${tool}(commit)`);
  }
  return Array.from(tools);
}

function isCommitLike(
  tool: string,
  args: Record<string, unknown> | undefined,
): boolean {
  if (tool.includes("(commit)") || tool.endsWith("_commit")) {
    return true;
  }
  const argsObj = args ?? {};
  if (argsObj.commit === true) {
    return true;
  }
  if (argsObj.finalize === true) {
    return true;
  }
  if (typeof argsObj.mode === "string" && argsObj.mode.toLowerCase() === "commit") {
    return true;
  }
  if (
    typeof argsObj.action === "string" &&
    argsObj.action.toLowerCase() === "commit"
  ) {
    return true;
  }
  return argsObj.dry_run === false && argsObj.confirm === true;
}

function baselineReasonRow(item: { reason: string; count: number; pct: number }) {
  return { reason: item.reason, count: item.count, pct: item.pct };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => (/[a-z0-9]/.test(char) ? char : "."))
    .join("")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

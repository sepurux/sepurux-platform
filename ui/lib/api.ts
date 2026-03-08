export type TraceMetadata = {
  trace_id: string;
  source: string;
  trace_version: string;
  sdk_meta: string | null;
  validation_status: string;
  validation_errors?: Array<{ path: string; message: string }> | null;
  normalized_summary?: {
    trace_version?: string;
    event_count?: number;
    event_types?: Record<string, number>;
    tool_calls?: number;
    tool_results?: number;
    model_events?: number;
    error_events?: number;
    first_event_type?: string | null;
    last_event_type?: string | null;
  } | null;
  s3_key: string;
  payload?: Record<string, unknown> | unknown[] | null;
  created_at: string;
};

export type CampaignMetadata = {
  campaign_id: string;
  mutation_pack_id: string | null;
  name: string;
  mutation_set: unknown;
  eval_set: unknown;
  created_at: string;
};

export type RunMetadata = {
  run_id: string;
  trace_id: string;
  campaign_id: string;
  policy_pack_id: string | null;
  effective_policy_pack_version_id: string | null;
  status: string;
  summary: Record<string, unknown> | null;
  pass_rate?: number | null;
  unsafe_count?: number | null;
  created_at: string;
};

export type ReplayAttemptListItem = {
  attempt_id: string;
  mutation_id: string;
  result: string;
  failure_reason: string | null;
  first_failure_event_index: number | null;
  first_failure_tool: string | null;
  seed: number | null;
  created_at: string;
};

export type ReplayAttemptDetail = {
  attempt_id: string;
  run_id: string;
  mutation_id: string;
  result: string;
  failure_reason: string | null;
  artifacts_s3_key: string | null;
  first_failure_event_index: number | null;
  first_failure_tool: string | null;
  seed: number | null;
  mutation_trace: MutationTrace | null;
  created_at: string;
};

export type MutationTraceAppliedItem = {
  mutation_id?: string;
  tool?: string;
  event_index?: number;
  details?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type MutationTrace = {
  seed?: number;
  applied?: MutationTraceAppliedItem[];
  [key: string]: unknown;
};

export type RunStats = {
  run_id: string;
  attempts: { total: number; passed: number; failed: number; pass_rate: number };
  failures_by_tool: Array<{ tool: string; count: number; pct: number }>;
  tools_usage: Array<{ tool: string; attempts: number; calls: number }>;
  failures_by_mutation: Array<{ mutation_id: string; count: number; pct: number }>;
  top_failure_reasons: Array<{ reason: string; count: number; pct: number }>;
  first_failure_step_distribution: Array<{ event_index: number; count: number }>;
  attribution: string;
  most_lethal_mutations: Array<{
    mutation_id: string;
    failures: number;
    attempts_hit: number;
    failure_rate_when_hit: number;
    top_tools: Array<{ tool: string; count: number }>;
    top_reasons: Array<{ reason: string; count: number }>;
  }>;
  injection_blocks: number;
  injection_sanitizations: number;
  insights: Array<{
    id: string;
    title: string;
    recommendation: string;
    why: string;
    confidence: number;
    evidence: {
      top_tools: Array<{ tool: string; count: number }>;
      top_mutations: Array<{ mutation_id: string; count: number }>;
      top_reasons: Array<{ reason: string; count: number }>;
    };
  }>;
};

export type ToolFragilityResponse = {
  window_days: number;
  generated_at: string;
  attempts_definition: string;
  tools: Array<{
    tool: string;
    attempts: number;
    failures: number;
    failure_rate: number;
    top_mutations: Array<{ mutation_id: string; count: number }>;
    top_reasons: Array<{ reason: string; count: number }>;
  }>;
};

export type CounterfactualListItem = {
  strategy: string;
  result: string;
  failure_reason: string | null;
  metrics: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  created_at: string;
};

export type CounterfactualDetail = CounterfactualListItem & {
  counterfactual_id: string;
  attempt_id: string;
};

export type ProjectMetadata = {
  project_id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};

export type PolicyPackMetadata = {
  policy_pack_id: string;
  project_id: string;
  name: string;
  engine: string;
  policy: Record<string, unknown>;
  active_version_id: string | null;
  active_version_number: number | null;
  created_at: string;
};

export type PolicyPackVersionMetadata = {
  version_id: string;
  policy_pack_id: string;
  version_number: number;
  policy: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
};

export type MutationPackMetadata = {
  mutation_pack_id: string;
  project_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_system: boolean;
  coverage_score: number;
  created_at: string;
};

export type MutationPackCreateResponse = MutationPackMetadata & {
  warning: string | null;
  validation_issues: string[];
};

export type MutationPackCoverageResponse = {
  mutation_pack_id: string;
  coverage_score: number;
  categories: string[];
  warning: string | null;
};

export type HardeningTemplateType =
  | "policy_pack"
  | "retry_policy"
  | "schema_adapter"
  | "sanitizer";

export type HardeningTemplateMetadata = {
  template_id: string;
  project_id: string;
  name: string;
  type: HardeningTemplateType;
  config: Record<string, unknown>;
  created_at: string;
};

export type PolicyEventListItem = {
  policy_event_id: string;
  run_id: string;
  attempt_id: string | null;
  event_index: number | null;
  tool: string;
  action: string;
  decision: "allow" | "deny" | "require_approval" | string;
  reason: string | null;
  input: Record<string, unknown> | null;
  created_at: string;
};

export type SecurityEventListItem = {
  security_event_id: string;
  run_id: string;
  attempt_id: string;
  event_index: number;
  tool: string;
  zone: string;
  risk_score: number;
  action: "allow" | "sanitize" | "block" | string;
  matches: string[] | null;
  created_at: string;
};

export type AuditEventListItem = {
  audit_event_id: string;
  project_id: string;
  event_type: string;
  actor: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WebhookMetadata = {
  webhook_id: string;
  project_id: string;
  url: string;
  is_enabled: boolean;
  events: string[];
  created_at: string;
  last_success_at: string | null;
  last_error: string | null;
};

export type WebhookCreateResponse = WebhookMetadata & {
  secret: string;
};

export type WebhookRotateSecretResponse = {
  webhook_id: string;
  secret: string;
};

export type ToolRegistryMetadata = {
  tool_id: string;
  project_id: string;
  name: string;
  zone: string;
  created_at: string;
};

export type TimelineEvent = {
  index: number;
  type: "tool_call" | "tool_result" | "model" | "error" | string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { type?: string; message?: string };
};

export type AttemptTimeline = {
  timeline_version?: string;
  run_id?: string;
  attempt_id?: string;
  mutation_id?: string;
  events?: TimelineEvent[];
  first_failure?: {
    event_index?: number;
    tool?: string;
    reason?: string;
  } | null;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_SEPURUX_API_KEY ?? process.env.NEXT_PUBLIC_API_KEY ?? "";
const PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID ?? "";
const BROWSER_PROXY_BASE = "/api/backend";

async function getTenantSettingsHelpers() {
  if (typeof window === "undefined") {
    return {
      getStoredApiKey: () => null,
      getStoredProjectId: () => null,
      getStoredApiBaseUrl: () => null,
    };
  }

  return import("@/lib/tenant-settings");
}

function getStoredApiBaseUrlSync() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem("sepurux.apiBaseUrl");
  } catch {
    return null;
  }
}

function resolveApiBaseUrl() {
  const configuredBase = getStoredApiBaseUrlSync() || PUBLIC_API_BASE_URL;
  if (typeof window === "undefined") {
    return configuredBase;
  }

  try {
    const parsed = new URL(configuredBase);
    if (parsed.hostname === "api") {
      return BROWSER_PROXY_BASE;
    }
  } catch {
    return configuredBase;
  }

  return configuredBase;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined | null>) {
  const base = resolveApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;
  const isAbsolute = /^https?:\/\//.test(baseUrl);
  const url = isAbsolute ? new URL(`${baseUrl}${normalizedPath}`) : new URL(`${baseUrl}${normalizedPath}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
}

async function buildHeaders(options?: { requireProjectHeader?: boolean }) {
  const helpers = await getTenantSettingsHelpers();
  const apiKey = helpers.getStoredApiKey?.() || PUBLIC_API_KEY;
  const projectId = helpers.getStoredProjectId?.() || PUBLIC_PROJECT_ID;
  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  if (options?.requireProjectHeader !== false && projectId) {
    headers["X-Project-Id"] = projectId;
  }
  return headers;
}

async function requestJson<T>(
  path: string,
  query?: Record<string, string | number | undefined | null>,
  options?: { requireProjectHeader?: boolean }
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    method: "GET",
    headers: await buildHeaders(options),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, payload);
  }

  return payload as T;
}

async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: { requireProjectHeader?: boolean }
): Promise<TResponse> {
  const headers = await buildHeaders(options);
  headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, payload);
  }

  return payload as TResponse;
}

async function patchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: { requireProjectHeader?: boolean }
): Promise<TResponse> {
  const headers = await buildHeaders(options);
  headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path), {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, payload);
  }

  return payload as TResponse;
}

export const api = {
  listProjects: () => requestJson<ProjectMetadata[]>("/v1/projects", undefined, { requireProjectHeader: false }),
  createProject: (name: string) =>
    postJson<ProjectMetadata, { name: string }>("/v1/projects", { name }, { requireProjectHeader: false }),
  listTraces: (options?: { limit?: number; offset?: number }) =>
    requestJson<TraceMetadata[]>("/v1/traces", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    }),
  getTrace: (traceId: string, options?: { includePayload?: boolean }) =>
    requestJson<TraceMetadata>(`/v1/traces/${traceId}`, {
      include_payload: options?.includePayload ? "true" : undefined,
    }),
  listCampaigns: (options?: { limit?: number; offset?: number }) =>
    requestJson<CampaignMetadata[]>("/v1/campaigns", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    }),
  createCampaign: (payload: {
    name: string;
    mutation_set: unknown;
    eval_set: unknown;
    mutation_pack_id?: string | null;
  }) => postJson<CampaignMetadata, typeof payload>("/v1/campaigns", payload),
  listMutationPacks: (options?: { include_system?: boolean }) =>
    requestJson<MutationPackMetadata[]>("/v1/mutation-packs", {
      include_system: options?.include_system === false ? "false" : "true",
    }),
  getMutationPack: (mutationPackId: string) =>
    requestJson<MutationPackMetadata>(`/v1/mutation-packs/${mutationPackId}`),
  getMutationPackCoverage: (mutationPackId: string) =>
    requestJson<MutationPackCoverageResponse>(`/v1/mutation-packs/${mutationPackId}/coverage`),
  listTemplates: () => requestJson<HardeningTemplateMetadata[]>("/v1/templates"),
  getTemplate: (templateId: string) =>
    requestJson<HardeningTemplateMetadata>(`/v1/templates/${templateId}`),
  createTemplate: (payload: {
    name: string;
    type: HardeningTemplateType;
    config: Record<string, unknown>;
  }) => postJson<HardeningTemplateMetadata, typeof payload>("/v1/templates", payload),
  applyTemplateToRun: (runId: string, templateId: string) =>
    postJson<{ new_run_id: string }, Record<string, never>>(
      `/v1/runs/${runId}/apply-template/${templateId}`,
      {}
    ),
  listPolicyPacks: () => requestJson<PolicyPackMetadata[]>("/v1/policy-packs"),
  getPolicyPack: (policyPackId: string) =>
    requestJson<PolicyPackMetadata>(`/v1/policy-packs/${policyPackId}`),
  updatePolicyPack: (
    policyPackId: string,
    payload: {
      name?: string;
      engine?: "builtin" | "opa";
      policy: Record<string, unknown>;
      created_by?: string;
    }
  ) => patchJson<PolicyPackMetadata, typeof payload>(`/v1/policy-packs/${policyPackId}`, payload),
  rollbackPolicyPack: (
    policyPackId: string,
    payload: { version_number: number; created_by?: string }
  ) =>
    postJson<PolicyPackMetadata, typeof payload>(
      `/v1/policy-packs/${policyPackId}/rollback`,
      payload
    ),
  listPolicyPackVersions: (policyPackId: string) =>
    requestJson<PolicyPackVersionMetadata[]>(`/v1/policy-packs/${policyPackId}/versions`),
  listRuns: (limit = 50) => requestJson<RunMetadata[]>("/v1/runs", { limit }),
  getRun: (runId: string) => requestJson<RunMetadata>(`/v1/runs/${runId}`),
  getRunStats: (runId: string) => requestJson<RunStats>(`/v1/runs/${runId}/stats`),
  listRunPolicyEvents: (runId: string, options?: { limit?: number; offset?: number }) =>
    requestJson<PolicyEventListItem[]>(`/v1/runs/${runId}/policy-events`, {
      limit: options?.limit ?? 200,
      offset: options?.offset ?? 0,
    }),
  listRunSecurityEvents: (runId: string, options?: { limit?: number; offset?: number }) =>
    requestJson<SecurityEventListItem[]>(`/v1/runs/${runId}/security-events`, {
      limit: options?.limit ?? 200,
      offset: options?.offset ?? 0,
    }),
  listAuditEvents: (options?: { limit?: number; offset?: number; event_type?: string }) =>
    requestJson<AuditEventListItem[]>("/v1/audit-events", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      event_type: options?.event_type,
    }),
  listWebhooks: () => requestJson<WebhookMetadata[]>("/v1/webhooks"),
  createWebhook: (payload: {
    url: string;
    events: string[];
    is_enabled?: boolean;
  }) => postJson<WebhookCreateResponse, typeof payload>("/v1/webhooks", payload),
  updateWebhook: (
    webhookId: string,
    payload: { url?: string; events?: string[]; is_enabled?: boolean }
  ) => patchJson<WebhookMetadata, typeof payload>(`/v1/webhooks/${webhookId}`, payload),
  rotateWebhookSecret: (webhookId: string) =>
    postJson<WebhookRotateSecretResponse, Record<string, never>>(
      `/v1/webhooks/${webhookId}/rotate-secret`,
      {}
    ),
  listRunAttempts: (runId: string, options?: { limit?: number; offset?: number; result?: string }) =>
    requestJson<ReplayAttemptListItem[]>(`/v1/runs/${runId}/attempts`, {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      result: options?.result
    }),
  listTools: () => requestJson<ToolRegistryMetadata[]>("/v1/tools"),
  createTool: (payload: { name: string; zone: string }) =>
    postJson<ToolRegistryMetadata, typeof payload>("/v1/tools", payload),
  updateToolZone: (toolId: string, zone: string) =>
    patchJson<ToolRegistryMetadata, { zone: string }>(`/v1/tools/${toolId}`, { zone }),
  getToolsFragility: (windowDays = 7, limit = 20) =>
    requestJson<ToolFragilityResponse>("/v1/tools/fragility", { window_days: windowDays, limit }),
  getAttempt: (attemptId: string) => requestJson<ReplayAttemptDetail>(`/v1/attempts/${attemptId}`),
  getAttemptTimeline: (attemptId: string) => requestJson<AttemptTimeline>(`/v1/attempts/${attemptId}/timeline`),
  listAttemptCounterfactuals: (attemptId: string) =>
    requestJson<CounterfactualListItem[]>(`/v1/attempts/${attemptId}/counterfactuals`),
  getCounterfactual: (counterfactualId: string) =>
    requestJson<CounterfactualDetail>(`/v1/counterfactuals/${counterfactualId}`),
  healthz: () => requestJson<{ status: string }>("/healthz", undefined, { requireProjectHeader: false }),
};

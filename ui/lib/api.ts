export type RunMetadata = {
  run_id: string;
  trace_id: string;
  campaign_id: string;
  status: string;
  summary: Record<string, unknown> | null;
  created_at: string;
};

export type ReplayAttemptListItem = {
  attempt_id: string;
  mutation_id: string;
  result: string;
  failure_reason: string | null;
  first_failure_event_index: number | null;
  first_failure_tool: string | null;
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
  created_at: string;
};

export type RunStats = {
  run_id: string;
  attempts: { total: number; passed: number; failed: number; pass_rate: number };
  failures_by_tool: Array<{ tool: string; count: number; pct: number }>;
  failures_by_mutation: Array<{ mutation_id: string; count: number; pct: number }>;
  top_failure_reasons: Array<{ reason: string; count: number; pct: number }>;
  first_failure_step_distribution: Array<{ event_index: number; count: number }>;
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
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID ?? "";
const BROWSER_PROXY_BASE = "/api/backend";

async function getTenantSettingsHelpers() {
  if (typeof window === "undefined") {
    return {
      getStoredApiKey: () => null,
      getStoredProjectId: () => null
    };
  }

  return import("@/lib/tenant-settings");
}

function resolveApiBaseUrl() {
  if (typeof window === "undefined") {
    return PUBLIC_API_BASE_URL;
  }

  try {
    const parsed = new URL(PUBLIC_API_BASE_URL);
    if (parsed.hostname === "api") {
      return BROWSER_PROXY_BASE;
    }
  } catch {
    return PUBLIC_API_BASE_URL;
  }

  return PUBLIC_API_BASE_URL;
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

export const api = {
  listProjects: () => requestJson<ProjectMetadata[]>("/v1/projects", undefined, { requireProjectHeader: false }),
  createProject: (name: string) =>
    postJson<ProjectMetadata, { name: string }>("/v1/projects", { name }, { requireProjectHeader: false }),
  listRuns: (limit = 50) => requestJson<RunMetadata[]>("/v1/runs", { limit }),
  getRun: (runId: string) => requestJson<RunMetadata>(`/v1/runs/${runId}`),
  getRunStats: (runId: string) => requestJson<RunStats>(`/v1/runs/${runId}/stats`),
  listRunAttempts: (runId: string, options?: { limit?: number; offset?: number; result?: string }) =>
    requestJson<ReplayAttemptListItem[]>(`/v1/runs/${runId}/attempts`, {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      result: options?.result
    }),
  getToolsFragility: (windowDays = 7, limit = 20) =>
    requestJson<ToolFragilityResponse>("/v1/tools/fragility", { window_days: windowDays, limit }),
  getAttempt: (attemptId: string) => requestJson<ReplayAttemptDetail>(`/v1/attempts/${attemptId}`),
  getAttemptTimeline: (attemptId: string) => requestJson<AttemptTimeline>(`/v1/attempts/${attemptId}/timeline`),
  listAttemptCounterfactuals: (attemptId: string) =>
    requestJson<CounterfactualListItem[]>(`/v1/attempts/${attemptId}/counterfactuals`),
  getCounterfactual: (counterfactualId: string) =>
    requestJson<CounterfactualDetail>(`/v1/counterfactuals/${counterfactualId}`)
};

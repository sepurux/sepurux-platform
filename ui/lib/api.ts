export type TraceMetadata = {
  trace_id: string;
  source: string;
  trace_version: string;
  task_name: string | null;
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

export type TraceTimelineStep = {
  id: string;
  trace_id: string;
  step_type:
    | "prompt"
    | "llm_call"
    | "tool_call"
    | "mutation"
    | "agent_output"
    | "retry"
    | "failure"
    | string;
  step_name: string;
  mutation_name: string | null;
  status: "success" | "error" | "timeout" | "retry" | string;
  input_payload?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  output_payload?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  latency_ms: number | null;
  started_at: string;
  finished_at: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CampaignEvalSet = {
  trace_ids?: string[];
  checks?: string[];
  attempts_count?: number;
  min_scenarios?: number;
};

export type CampaignMetadata = {
  campaign_id: string;
  mutation_pack_id: string | null;
  name: string;
  status: string;
  mutation_set: unknown;
  eval_set: CampaignEvalSet | null;
  created_at: string;
};

export type RunMetadata = {
  run_id: string;
  trace_id: string;
  campaign_id: string;
  mutation_pack_id: string | null;
  policy_pack_id: string | null;
  effective_policy_pack_version_id: string | null;
  status: string;
  summary: Record<string, unknown> | null;
  pass_rate?: number | null;
  unsafe_count?: number | null;
  created_at: string;
};

export type ContractViolation = {
  type: "wrong_pack" | "untested_tool" | "insufficient_attempts";
  detail: string;
  missing: string[];
  required: number | string[] | null;
  actual: number | string | null;
};

export type ContractReport = {
  contract_id: string;
  version: number;
  passed: boolean;
  violations: ContractViolation[];
  required_pack_ids: string[];
  required_tools: string[];
  covered_tools: string[];
  total_attempts: number;
};

export type QualityContract = {
  contract_id: string;
  campaign_id: string;
  required_pack_ids: string[];
  required_tools: string[];
  min_attempts_per_pack: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type CIBatchStatus = {
  batch_id: string;
  run_ids: string[];
  status: string;
  decision: "pass" | "fail" | "pending";
  pass_rate: number;
  unsafe_attempts: number;
  failures: number;
  trace_count: number;
  scenario_coverage_pct: number;
  top_failing_tools: Array<{ tool: string; count: number }>;
  mutation_categories: string[];
  mutation_coverage_score: number | null;
  dashboard_url: string;
  contract_report: ContractReport | null;
};

export type CampaignFailure = {
  failure_id: string;
  run_id: string;
  campaign_id: string;
  trace_id: string;
  mutation: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type CampaignReliability = {
  reliability_score: number;
  status: "healthy" | "warning" | "critical";
  classified_failures: number;
  failure_breakdown: Array<{ type: string; count: number }>;
};

export type ProjectReliabilitySummary = {
  reliability_score: number;
  status: "healthy" | "warning" | "critical";
  campaigns_run: number;
  credits_used: number;
  failure_breakdown: Array<{ type: string; count: number }>;
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

export type ApiKeyMetadata = {
  api_key_id: string;
  tenant_id: string;
  project_id: string | null;
  user_id: string | null;
  name: string;
  is_demo: boolean;
  rate_limit_per_minute: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type ApiKeyCreateResponse = ApiKeyMetadata & {
  api_key: string;
};

export type MemberMetadata = {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  api_key: string | null;
  created_at: string;
};

export type MemberInviteRequest = {
  email: string;
  name?: string;
  role: "developer" | "viewer";
};

export type PolicyPackMetadata = {
  policy_pack_id: string;
  project_id: string;
  name: string;
  engine: string;
  policy: Record<string, unknown>;
  is_archived: boolean;
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
  credit_cost: number;
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

export type UserNotificationMetadata = {
  notification_id: string;
  tenant_id: string;
  project_id: string;
  user_id: string | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  link_url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type UserNotificationInboxResponse = {
  items: UserNotificationMetadata[];
  unread_count: number;
};

export type UserNotificationReadAllResponse = {
  updated: number;
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

export type DemoInfoResponse = {
  demo_api_key: string;
  demo_campaign: string;
  demo_project?: string;
  demo_mutation_pack?: string;
  recommended_flow?: "session" | "shared_key";
  session_ttl_minutes?: number | null;
  limits: {
    campaigns_per_hour: number;
    mutations_per_run: number;
    traces_upload_per_hour?: number;
    max_trace_bytes?: number;
  };
};

export type DemoSessionResponse = {
  api_key: string;
  project_id: string;
  project_name: string;
  demo_campaign: string;
  demo_mutation_pack: string;
  expires_at: string;
  rate_limit_per_minute: number;
  limits: DemoInfoResponse["limits"];
};

export type AuthPermissionSet = {
  visible_sections: string[];
  can_upload_traces: boolean;
  can_create_campaigns: boolean;
  can_run_campaigns: boolean;
  can_manage_mutation_packs: boolean;
  can_manage_policy_packs: boolean;
  can_manage_security_config: boolean;
  can_manage_workspace: boolean;
  can_manage_api_keys: boolean;
  can_manage_billing: boolean;
};

export type AuthSessionMetadata = {
  tenant_id: string;
  project_id: string;
  project_name: string;
  project_scoped: boolean;
  pricing_tier: string;
  plan_name: string;
  role_name: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  is_demo: boolean;
  is_super_admin: boolean;
  billing_plan_name: string | null;
  credits_balance: number | null;
  monthly_credits: number | null;
  topup_credits: number | null;
  queue_priority: "normal" | "priority" | null;
  low_credit_threshold: number | null;
  is_low_credit: boolean;
  permissions: AuthPermissionSet;
};

export type AuthSessionResponse = AuthSessionMetadata & {
  api_key: string;
};

export type OperationMessageResponse = {
  message: string;
};

export type InternalSystemHealth = {
  status: string;
  worker_status: string;
  queue_backlog: number;
};

export type InternalDashboardOverview = {
  total_users: number;
  active_projects: number;
  running_campaigns: number;
  failures_last_24h: number;
  credits_used: number;
  system_health: InternalSystemHealth;
  security_blocks_24h: number;
  policy_denies_24h: number;
};

export type InternalSearchUserResult = {
  user_id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type InternalSearchProjectResult = {
  project_id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};

export type InternalSearchCampaignResult = {
  campaign_id: string;
  project_id: string;
  name: string;
  status: string;
  created_at: string;
};

export type InternalSearchFailureResult = {
  failure_id: string;
  project_id: string;
  run_id: string;
  campaign_id: string;
  mutation_name: string;
  failure_type: string;
  description: string;
  created_at: string;
};

export type InternalSearchResults = {
  query: string;
  users: InternalSearchUserResult[];
  projects: InternalSearchProjectResult[];
  campaigns: InternalSearchCampaignResult[];
  failures: InternalSearchFailureResult[];
};

export type InternalAuditLogEntry = {
  id: string;
  action: string;
  actor: string;
  entity: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InternalAlertItem = {
  alert_type: "high_failure_rate" | "campaign_failures" | "system_errors";
  severity: "warning" | "critical";
  message: string;
  metric: string;
  value: number;
  detected_at: string;
};

export type InternalAlertNotificationResult = {
  channel: "slack" | "email";
  delivered: boolean;
  detail: string | null;
};

export type InternalAlertNotificationResponse = {
  alerts_count: number;
  notifications: InternalAlertNotificationResult[];
};

export type InternalProjectAnalyticsEntry = {
  project_id: string;
  name: string;
  runs_count: number;
  failures_count: number;
};

export type InternalFailureTrend = {
  failures_last_24h: number;
  failures_previous_24h: number;
  delta_percentage: number;
  direction: "up" | "down" | "flat";
};

export type InternalAnalyticsOverview = {
  active_users: number;
  top_projects: InternalProjectAnalyticsEntry[];
  credits_used_last_30_days: number;
  failure_trend: InternalFailureTrend;
};

export type InternalDateCountMetric = {
  date: string;
  value: number;
};

export type InternalDateScoreMetric = {
  date: string;
  value: number;
};

export type InternalTimeSeriesMetrics = {
  window_days: number;
  failures_over_time: InternalDateCountMetric[];
  campaigns_per_day: InternalDateCountMetric[];
  reliability_trends: InternalDateScoreMetric[];
};

export type InternalQueueJobEntry = {
  job_id: string;
  status: string;
  queue: string;
  description: string | null;
  enqueued_at: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export type InternalQueueOverview = {
  jobs_running: number;
  jobs_failed: number;
  queue_backlog: number;
  worker_status: "online" | "offline" | "unknown";
  running_jobs: InternalQueueJobEntry[];
  failed_jobs: InternalQueueJobEntry[];
};

export type InternalQueueActionResponse = {
  job_id: string;
  action: "retry" | "cancel";
  success: boolean;
  detail: string | null;
};

export type InternalBillingWalletEntry = {
  wallet_id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  balance: number;
  monthly_credits: number;
  topup_credits: number;
  updated_at: string;
};

export type InternalBillingTransactionEntry = {
  credit_transaction_id: string;
  user_id: string;
  email: string | null;
  amount: number;
  type: string;
  reason: string;
  created_at: string;
};

export type InternalBillingAdjustmentResponse = {
  wallet: InternalBillingWalletEntry;
  transaction: InternalBillingTransactionEntry;
};

export type InternalSystemOverview = {
  api_latency_ms: number;
  worker_status: "online" | "offline" | "unknown";
  queue_backlog: number;
  runs_last_24h: number;
  failed_runs_last_24h: number;
  error_rate_24h: number;
  uptime_seconds: number;
};

export type InternalFeatureFlags = {
  enable_ci: boolean;
  enable_mutations: boolean;
  enable_billing: boolean;
  enable_registration: boolean;
  enable_injection_scanning: boolean;
  enable_opa_enforcement: boolean;
  enable_counterfactuals: boolean;
};

export type InternalTenantControls = {
  tenant_id: string;
  runs_paused: boolean;
  workspace_creation_locked: boolean;
  updated_by: string | null;
  reason: string | null;
  updated_at: string;
};

export type InternalTenantApiKeyRevokeResponse = {
  tenant_id: string;
  revoked_count: number;
  controls: InternalTenantControls;
};

export type SocialOAuthProvider = "github" | "google" | "microsoft";

export type SubscriptionPlanMetadata = {
  plan_id: string;
  name: string;
  monthly_price: number;
  monthly_credits: number;
  checkout_enabled: boolean;
  features: Record<string, unknown>;
  created_at: string;
};

export type UserSubscriptionMetadata = {
  subscription_id: string;
  plan_id: string;
  plan_name: string | null;
  monthly_price: number | null;
  monthly_credits: number | null;
  queue_priority: "normal" | "priority";
  status: string;
  billing_provider: string | null;
  portal_available: boolean;
  start_date: string;
  renewal_date: string;
};

export type CreditWalletMetadata = {
  wallet_id: string;
  balance: number;
  monthly_credits: number;
  topup_credits: number;
  queue_priority: "normal" | "priority";
  low_credit_threshold: number;
  is_low_credit: boolean;
  updated_at: string;
};

export type CreditTransactionMetadata = {
  transaction_id: string;
  user_id: string;
  amount: number;
  type: "usage" | "monthly_grant" | "topup_purchase";
  reason: string;
  created_at: string;
};

export type BillingRedirectSessionResponse = {
  provider: string;
  flow: "checkout" | "portal";
  url: string;
  session_id: string | null;
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
  latency_ms?: number | null;
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

export type ScheduledCampaignMetadata = {
  scheduled_campaign_id: string;
  project_id: string;
  campaign_id: string;
  mutation_pack_id: string;
  cron_schedule: string;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
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

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/backend";
const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_SEPURUX_API_KEY ??
  process.env.NEXT_PUBLIC_CRASHLAB_API_KEY ??
  process.env.NEXT_PUBLIC_API_KEY ??
  "";
const PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID ?? "";
const BROWSER_PROXY_BASE = "/api/backend";

function clampLimit(value: number | undefined, fallback: number, max = 200) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function messageFromErrorPayload(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }
  return fallback;
}

function isLocalHost(value: string) {
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

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
    if (isLocalHost(parsed.hostname) && !isLocalHost(window.location.hostname)) {
      return BROWSER_PROXY_BASE;
    }
  } catch {
    return configuredBase;
  }

  return configuredBase;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>,
  options?: { baseUrl?: string }
) {
  const base = options?.baseUrl || resolveApiBaseUrl();
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

async function buildHeaders(options?: { requireProjectHeader?: boolean; includeAuth?: boolean }) {
  const helpers = await getTenantSettingsHelpers();
  const apiKey = helpers.getStoredApiKey?.() || PUBLIC_API_KEY;
  const projectId = helpers.getStoredProjectId?.() || PUBLIC_PROJECT_ID;
  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  if (options?.includeAuth !== false && apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  if (options?.includeAuth !== false && options?.requireProjectHeader !== false && projectId) {
    headers["X-Project-Id"] = projectId;
  }
  return headers;
}

async function requestJson<T>(
  path: string,
  query?: Record<string, string | number | undefined | null>,
  options?: { requireProjectHeader?: boolean; includeAuth?: boolean; baseUrl?: string }
): Promise<T> {
  const response = await fetch(buildUrl(path, query, { baseUrl: options?.baseUrl }), {
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
    throw new ApiError(
      messageFromErrorPayload(payload, `Request failed: ${response.status}`),
      response.status,
      payload
    );
  }

  return payload as T;
}

async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: { requireProjectHeader?: boolean; includeAuth?: boolean; baseUrl?: string }
): Promise<TResponse> {
  const headers = await buildHeaders(options);
  headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, undefined, { baseUrl: options?.baseUrl }), {
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
    throw new ApiError(
      messageFromErrorPayload(payload, `Request failed: ${response.status}`),
      response.status,
      payload
    );
  }

  return payload as TResponse;
}

async function putJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: { requireProjectHeader?: boolean; includeAuth?: boolean; baseUrl?: string }
): Promise<TResponse> {
  const headers = await buildHeaders(options);
  headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, undefined, { baseUrl: options?.baseUrl }), {
    method: "PUT",
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
    throw new ApiError(
      messageFromErrorPayload(payload, `Request failed: ${response.status}`),
      response.status,
      payload
    );
  }

  return payload as TResponse;
}

async function patchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: { requireProjectHeader?: boolean; includeAuth?: boolean; baseUrl?: string }
): Promise<TResponse> {
  const headers = await buildHeaders(options);
  headers["Content-Type"] = "application/json";

  const response = await fetch(buildUrl(path, undefined, { baseUrl: options?.baseUrl }), {
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
    throw new ApiError(
      messageFromErrorPayload(payload, `Request failed: ${response.status}`),
      response.status,
      payload
    );
  }

  return payload as TResponse;
}

async function deleteRequest(
  path: string,
  options?: { requireProjectHeader?: boolean; includeAuth?: boolean; baseUrl?: string }
): Promise<void> {
  const response = await fetch(buildUrl(path, undefined, { baseUrl: options?.baseUrl }), {
    method: "DELETE",
    headers: await buildHeaders(options),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    throw new ApiError(
      messageFromErrorPayload(payload, `Request failed: ${response.status}`),
      response.status,
      payload
    );
  }
}

export const api = {
  signup: (payload: {
    email: string;
    password: string;
    name?: string;
    project_name?: string;
    pricing_tier?: "starter" | "team" | "enterprise";
  }, options?: { baseUrl?: string }) =>
    postJson<AuthSessionResponse, typeof payload>(
      "/auth/signup",
      payload,
      { requireProjectHeader: false, includeAuth: false, baseUrl: options?.baseUrl }
    ),
  login: (payload: { email: string; password: string }, options?: { baseUrl?: string }) =>
    postJson<AuthSessionResponse, typeof payload>(
      "/auth/login",
      payload,
      { requireProjectHeader: false, includeAuth: false, baseUrl: options?.baseUrl }
    ),
  requestPasswordReset: (payload: { email: string }, options?: { baseUrl?: string }) =>
    postJson<OperationMessageResponse, typeof payload>(
      "/auth/forgot-password",
      payload,
      { requireProjectHeader: false, includeAuth: false, baseUrl: options?.baseUrl }
    ),
  resetPassword: (
    payload: { token: string; password: string },
    options?: { baseUrl?: string }
  ) =>
    postJson<OperationMessageResponse, typeof payload>(
      "/auth/reset-password",
      payload,
      { requireProjectHeader: false, includeAuth: false, baseUrl: options?.baseUrl }
    ),
  exchangeOAuthSession: (
    payload: { token: string },
    options?: { baseUrl?: string }
  ) =>
    postJson<AuthSessionResponse, typeof payload>(
      "/auth/oauth/exchange",
      payload,
      { requireProjectHeader: false, includeAuth: false, baseUrl: options?.baseUrl }
    ),
  getAuthSession: () =>
    requestJson<AuthSessionMetadata>("/v1/auth/session"),
  getInternalDashboard: () =>
    requestJson<InternalDashboardOverview>("/v1/internal/dashboard", undefined, {
      requireProjectHeader: false,
    }),
  searchInternal: (query: string) =>
    requestJson<InternalSearchResults>(
      "/v1/internal/search",
      { q: query },
      { requireProjectHeader: false }
    ),
  listInternalAuditLogs: (options?: {
    limit?: number;
    offset?: number;
    action?: string;
    actor?: string;
    entity?: string;
  }) =>
    requestJson<InternalAuditLogEntry[]>(
      "/v1/internal/audit-logs",
      {
        limit: clampLimit(options?.limit, 50),
        offset: options?.offset ?? 0,
        action: options?.action,
        actor: options?.actor,
        entity: options?.entity,
      },
      { requireProjectHeader: false }
    ),
  listInternalAlerts: () =>
    requestJson<InternalAlertItem[]>("/v1/internal/alerts", undefined, {
      requireProjectHeader: false,
    }),
  notifyInternalAlerts: () =>
    postJson<InternalAlertNotificationResponse, Record<string, never>>(
      "/v1/internal/alerts/notify",
      {},
      { requireProjectHeader: false }
    ),
  getInternalAnalytics: () =>
    requestJson<InternalAnalyticsOverview>("/v1/internal/analytics", undefined, {
      requireProjectHeader: false,
    }),
  getInternalAnalyticsTimeSeries: (days = 14) =>
    requestJson<InternalTimeSeriesMetrics>(
      `/v1/internal/analytics/time-series?days=${Math.max(7, Math.min(Math.trunc(days), 90))}`,
      undefined,
      {
        requireProjectHeader: false,
      }
    ),
  getInternalQueues: () =>
    requestJson<InternalQueueOverview>("/v1/internal/queues", undefined, {
      requireProjectHeader: false,
    }),
  retryInternalQueueJob: (jobId: string) =>
    postJson<InternalQueueActionResponse, { job_id: string }>(
      "/v1/internal/queues/retry",
      { job_id: jobId },
      { requireProjectHeader: false }
    ),
  cancelInternalQueueJob: (jobId: string) =>
    postJson<InternalQueueActionResponse, { job_id: string }>(
      "/v1/internal/queues/cancel",
      { job_id: jobId },
      { requireProjectHeader: false }
    ),
  listInternalBillingWallets: (options?: { limit?: number; offset?: number }) =>
    requestJson<InternalBillingWalletEntry[]>(
      "/v1/internal/billing/wallets",
      {
        limit: clampLimit(options?.limit, 100),
        offset: options?.offset ?? 0,
      },
      { requireProjectHeader: false }
    ),
  listInternalBillingTransactions: (options?: { limit?: number; offset?: number }) =>
    requestJson<InternalBillingTransactionEntry[]>(
      "/v1/internal/billing/transactions",
      {
        limit: clampLimit(options?.limit, 100),
        offset: options?.offset ?? 0,
      },
      { requireProjectHeader: false }
    ),
  adjustInternalBillingCredits: (payload: { user_id: string; amount: number; reason: string }) =>
    postJson<InternalBillingAdjustmentResponse, typeof payload>(
      "/v1/internal/billing/adjust",
      payload,
      { requireProjectHeader: false }
    ),
  getInternalSystemOverview: () =>
    requestJson<InternalSystemOverview>("/v1/internal/system", undefined, {
      requireProjectHeader: false,
    }),
  getInternalFeatureFlags: () =>
    requestJson<InternalFeatureFlags>("/v1/internal/settings", undefined, {
      requireProjectHeader: false,
    }),
  updateInternalFeatureFlags: (payload: InternalFeatureFlags) =>
    putJson<InternalFeatureFlags, InternalFeatureFlags>(
      "/v1/internal/settings",
      payload,
      { requireProjectHeader: false }
    ),
  getInternalTenantControls: (tenantId: string) =>
    requestJson<InternalTenantControls>(
      `/v1/internal/tenants/${encodeURIComponent(tenantId)}/controls`,
      undefined,
      { requireProjectHeader: false }
    ),
  updateInternalTenantControls: (
    tenantId: string,
    payload: { runs_paused?: boolean; workspace_creation_locked?: boolean; reason?: string | null }
  ) =>
    patchJson<InternalTenantControls, typeof payload>(
      `/v1/internal/tenants/${encodeURIComponent(tenantId)}/controls`,
      payload,
      { requireProjectHeader: false }
    ),
  revokeInternalTenantApiKeys: (
    tenantId: string,
    payload: { reason?: string | null } = {}
  ) =>
    postJson<InternalTenantApiKeyRevokeResponse, typeof payload>(
      `/v1/internal/tenants/${encodeURIComponent(tenantId)}/controls/revoke-api-keys`,
      payload,
      { requireProjectHeader: false }
    ),
  listBillingPlans: () => requestJson<SubscriptionPlanMetadata[]>("/v1/billing/plans"),
  getBillingSubscription: () => requestJson<UserSubscriptionMetadata>("/v1/billing/subscription"),
  getBillingCredits: () => requestJson<CreditWalletMetadata>("/v1/billing/credits"),
  listCreditTransactions: (options?: { limit?: number }) =>
    requestJson<CreditTransactionMetadata[]>("/v1/billing/transactions", {
      limit: clampLimit(options?.limit, 50),
    }),
  subscribeToPlan: (payload: { plan_id: string }) =>
    postJson<BillingRedirectSessionResponse, typeof payload>("/v1/billing/subscribe", payload),
  topupCredits: (payload: { credits: number }) =>
    postJson<BillingRedirectSessionResponse, typeof payload>("/v1/billing/topup", payload),
  openBillingPortal: () => postJson<BillingRedirectSessionResponse, Record<string, never>>("/v1/billing/portal", {}),
  listProjects: () => requestJson<ProjectMetadata[]>("/v1/projects", undefined, { requireProjectHeader: false }),
  createProject: (name: string) =>
    postJson<ProjectMetadata, { name: string }>("/v1/projects", { name }, { requireProjectHeader: false }),
  createApiKey: (payload: {
    name: string;
    project_id?: string | null;
    rate_limit_per_minute?: number;
  }) => postJson<ApiKeyCreateResponse, typeof payload>("/v1/api-keys", payload),
  listMembers: () => requestJson<MemberMetadata[]>("/v1/members"),
  inviteMember: (payload: MemberInviteRequest) => postJson<MemberMetadata, MemberInviteRequest>("/v1/members", payload),
  removeMember: (userId: string) => deleteRequest(`/v1/members/${userId}`),
  listTraces: (options?: { limit?: number; offset?: number }) =>
    requestJson<TraceMetadata[]>("/v1/traces", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    }),
  getTrace: (traceId: string, options?: { includePayload?: boolean }) =>
    requestJson<TraceMetadata>(`/v1/traces/${traceId}`, {
      include_payload: options?.includePayload ? "true" : undefined,
    }),
  getTraceTimeline: (traceId: string) =>
    requestJson<TraceTimelineStep[]>(`/v1/traces/${traceId}/timeline`),
  listCampaigns: (options?: { limit?: number; offset?: number; include_archived?: boolean }) =>
    requestJson<CampaignMetadata[]>("/v1/campaigns", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      include_archived: options?.include_archived ? "true" : undefined,
    }),
  listCampaignFailures: (
    campaignId: string,
    options?: { run_id?: string; limit?: number; offset?: number }
  ) =>
    requestJson<CampaignFailure[]>(`/v1/campaigns/${campaignId}/failures`, {
      run_id: options?.run_id,
      limit: clampLimit(options?.limit, 200),
      offset: options?.offset ?? 0,
    }),
  getCampaignReliability: (
    campaignId: string,
    options?: { run_id?: string }
  ) =>
    requestJson<CampaignReliability>(`/v1/campaigns/${campaignId}/reliability`, {
      run_id: options?.run_id,
    }),
  getProjectReliability: () =>
    requestJson<ProjectReliabilitySummary>("/v1/analytics/reliability"),
  getCampaign: (campaignId: string) =>
    requestJson<CampaignMetadata>(`/v1/campaigns/${campaignId}`),
  createCampaign: (payload: {
    name: string;
    mutation_set: unknown;
    eval_set: unknown;
    mutation_pack_id?: string | null;
  }) => postJson<CampaignMetadata, typeof payload>("/v1/campaigns", payload),
  updateCampaignEvalSet: (
    campaignId: string,
    payload: { add_trace_ids?: string[]; remove_trace_ids?: string[]; min_scenarios?: number }
  ) => patchJson<CampaignMetadata, typeof payload>(`/v1/campaigns/${campaignId}/eval-set`, payload),
  getContract: (campaignId: string) =>
    requestJson<QualityContract>(`/v1/campaigns/${campaignId}/contract`),
  upsertContract: (
    campaignId: string,
    payload: { required_pack_ids: string[]; required_tools: string[]; min_attempts_per_pack: number }
  ) => putJson<QualityContract, typeof payload>(`/v1/campaigns/${campaignId}/contract`, payload),
  deleteContract: (campaignId: string) => deleteRequest(`/v1/campaigns/${campaignId}/contract`),
  deleteCampaign: (campaignId: string) => deleteRequest(`/v1/campaigns/${campaignId}`),
  createRun: (payload: {
    trace_id: string;
    campaign_id: string;
    mutation_pack_id?: string | null;
    policy_pack_id?: string | null;
  }) => postJson<RunMetadata, typeof payload>("/v1/runs", payload),
  createMutationPack: (payload: {
    name: string;
    description?: string | null;
    config: Record<string, unknown>;
  }) => postJson<MutationPackCreateResponse, typeof payload>("/v1/mutation-packs", payload),
  listMutationPacks: (options?: { include_system?: boolean }) =>
    requestJson<MutationPackMetadata[]>("/v1/mutation-packs", {
      include_system: options?.include_system === false ? "false" : "true",
    }),
  getMutationPack: (mutationPackId: string) =>
    requestJson<MutationPackMetadata>(`/v1/mutation-packs/${mutationPackId}`),
  getMutationPackCoverage: (mutationPackId: string) =>
    requestJson<MutationPackCoverageResponse>(`/v1/mutation-packs/${mutationPackId}/coverage`),
  updateMutationPack: (
    mutationPackId: string,
    payload: { name?: string; description?: string | null; config?: Record<string, unknown>; credit_cost?: number }
  ) => patchJson<MutationPackCreateResponse, typeof payload>(`/v1/mutation-packs/${mutationPackId}`, payload),
  deleteMutationPack: (mutationPackId: string) =>
    deleteRequest(`/v1/mutation-packs/${mutationPackId}`),
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
  listPolicyPacks: (options?: { include_archived?: boolean }) =>
    requestJson<PolicyPackMetadata[]>("/v1/policy-packs", {
      include_archived: options?.include_archived ? "true" : undefined,
    }),
  createPolicyPack: (payload: {
    name: string;
    engine?: "builtin" | "opa";
    policy: Record<string, unknown>;
  }) => postJson<PolicyPackMetadata, typeof payload>("/v1/policy-packs", payload),
  getPolicyPack: (policyPackId: string, options?: { include_archived?: boolean }) =>
    requestJson<PolicyPackMetadata>(`/v1/policy-packs/${policyPackId}`, {
      include_archived: options?.include_archived ? "true" : undefined,
    }),
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
  deletePolicyPack: (policyPackId: string) => deleteRequest(`/v1/policy-packs/${policyPackId}`),
  listPolicyPackVersions: (policyPackId: string) =>
    requestJson<PolicyPackVersionMetadata[]>(`/v1/policy-packs/${policyPackId}/versions`),
  listRuns: (options?: number | { limit?: number; offset?: number; status?: string }) => {
    if (typeof options === "number") {
      return requestJson<RunMetadata[]>("/v1/runs", {
        limit: clampLimit(options, 50),
        offset: 0,
      });
    }
    return requestJson<RunMetadata[]>("/v1/runs", {
      limit: clampLimit(options?.limit, 50),
      offset: options?.offset ?? 0,
      status: options?.status,
    });
  },
  getRun: (runId: string) => requestJson<RunMetadata>(`/v1/runs/${runId}`),
  getCiBatch: (batchId: string) => requestJson<CIBatchStatus>(`/v1/ci/batch/${batchId}`),
  getRunStats: (runId: string) => requestJson<RunStats>(`/v1/runs/${runId}/stats`),
  listRunPolicyEvents: (runId: string, options?: { limit?: number; offset?: number }) =>
    requestJson<PolicyEventListItem[]>(`/v1/runs/${runId}/policy-events`, {
      limit: clampLimit(options?.limit, 200),
      offset: options?.offset ?? 0,
    }),
  listRunSecurityEvents: (runId: string, options?: { limit?: number; offset?: number }) =>
    requestJson<SecurityEventListItem[]>(`/v1/runs/${runId}/security-events`, {
      limit: clampLimit(options?.limit, 200),
      offset: options?.offset ?? 0,
    }),
  listAuditEvents: (options?: { limit?: number; offset?: number; event_type?: string }) =>
    requestJson<AuditEventListItem[]>("/v1/audit-events", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      event_type: options?.event_type,
    }),
  getNotifications: (options?: { limit?: number; offset?: number; unread_only?: boolean }) =>
    requestJson<UserNotificationInboxResponse>("/v1/notifications", {
      limit: clampLimit(options?.limit, 20, 100),
      offset: options?.offset ?? 0,
      unread_only: options?.unread_only ? "true" : undefined,
    }),
  markNotificationRead: (notificationId: string) =>
    postJson<UserNotificationMetadata, Record<string, never>>(
      `/v1/notifications/${notificationId}/read`,
      {}
    ),
  markAllNotificationsRead: () =>
    postJson<UserNotificationReadAllResponse, Record<string, never>>(
      "/v1/notifications/read-all",
      {}
    ),
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
      limit: clampLimit(options?.limit, 50),
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
  getDemoInfo: () =>
    requestJson<DemoInfoResponse>("/demo/info", undefined, { requireProjectHeader: false }),
  createDemoSession: () =>
    postJson<DemoSessionResponse, Record<string, never>>(
      "/demo/session",
      {},
      { requireProjectHeader: false }
    ),
  healthz: () => requestJson<{ status: string }>("/healthz", undefined, { requireProjectHeader: false }),
  listScheduledCampaigns: (options?: { limit?: number; offset?: number }) =>
    requestJson<ScheduledCampaignMetadata[]>("/v1/scheduled-campaigns", {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    }),
  getScheduledCampaign: (scheduledCampaignId: string) =>
    requestJson<ScheduledCampaignMetadata>(`/v1/scheduled-campaigns/${scheduledCampaignId}`),
  createScheduledCampaign: (payload: {
    campaign_id: string;
    mutation_pack_id: string;
    cron_schedule: string;
    enabled?: boolean;
  }) => postJson<ScheduledCampaignMetadata, typeof payload>("/v1/scheduled-campaigns", payload),
  updateScheduledCampaign: (
    scheduledCampaignId: string,
    payload: { enabled?: boolean; cron_schedule?: string }
  ) =>
    patchJson<ScheduledCampaignMetadata, typeof payload>(
      `/v1/scheduled-campaigns/${scheduledCampaignId}`,
      payload
    ),
  deleteScheduledCampaign: (scheduledCampaignId: string) =>
    deleteRequest(`/v1/scheduled-campaigns/${scheduledCampaignId}`),
};

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class TraceMetadata(BaseModel):
    trace_id: UUID
    source: str
    trace_version: str
    task_name: str | None = None
    sdk_meta: str | None = None
    validation_status: str
    validation_errors: list[dict[str, str]] | None = None
    normalized_summary: dict[str, Any] | None = None
    s3_key: str
    payload: Any | None = None
    created_at: datetime


class TraceTimelineStep(BaseModel):
    id: UUID
    trace_id: UUID
    step_type: str
    step_name: str
    mutation_name: str | None = None
    status: Literal["success", "error", "timeout", "retry"] | str
    input_payload: Any | None = None
    output_payload: Any | None = None
    latency_ms: int | None = None
    started_at: datetime
    finished_at: datetime | None = None
    metadata: dict[str, Any] | None = None


class CampaignCreateRequest(BaseModel):
    name: str
    mutation_set: Any
    eval_set: Any
    mutation_pack_id: UUID | None = None


class CampaignMetadata(BaseModel):
    campaign_id: UUID
    mutation_pack_id: UUID | None = None
    name: str
    status: str
    mutation_set: Any
    eval_set: Any
    created_at: datetime


class RunCreateRequest(BaseModel):
    trace_id: UUID
    campaign_id: UUID
    mutation_pack_id: UUID | None = None
    policy_pack_id: UUID | None = None


class RunMetadata(BaseModel):
    run_id: UUID
    trace_id: UUID
    campaign_id: UUID
    mutation_pack_id: UUID | None = None
    policy_pack_id: UUID | None = None
    effective_policy_pack_version_id: UUID | None = None
    status: str
    summary: Any | None
    pass_rate: float | None = None
    unsafe_count: int | None = None
    created_at: datetime


class CampaignRunPackRequest(BaseModel):
    pack: str


class CampaignRunPackResponse(BaseModel):
    run_id: UUID
    trace_id: UUID
    campaign_id: UUID
    mutation_pack_id: UUID
    mutation_pack: str
    status: str
    created_at: datetime


class CampaignFailureRecord(BaseModel):
    failure_id: UUID
    run_id: UUID
    campaign_id: UUID
    trace_id: UUID
    mutation: str
    type: str
    severity: Literal["critical", "high", "medium", "low"]
    description: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


class CampaignFailureBreakdownItem(BaseModel):
    type: str
    count: int


class CampaignReliabilityResponse(BaseModel):
    reliability_score: float
    status: Literal["healthy", "warning", "critical"]
    classified_failures: int = 0
    failure_breakdown: list[CampaignFailureBreakdownItem] = Field(default_factory=list)


class ReplayAttemptListItem(BaseModel):
    attempt_id: UUID
    mutation_id: str
    result: str
    failure_reason: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None
    seed: int | None = None
    created_at: datetime


class ReplayAttemptDetail(BaseModel):
    attempt_id: UUID
    run_id: UUID
    mutation_id: str
    result: str
    failure_reason: str | None
    artifacts_s3_key: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None
    seed: int | None = None
    mutation_trace: Any | None = None
    created_at: datetime


class RunAttemptsSummary(BaseModel):
    total: int
    passed: int
    failed: int
    pass_rate: float


class ToolCountPct(BaseModel):
    tool: str
    count: int
    pct: float


class ToolCount(BaseModel):
    tool: str
    count: int


class CIRunThresholds(BaseModel):
    min_pass_rate: float = Field(ge=0.0, le=1.0)
    max_unsafe: int = Field(ge=0)
    max_failures: int | None = Field(default=None, ge=0)


class CIRunCreateRequest(BaseModel):
    trace_id: UUID
    campaign_id: UUID
    thresholds: CIRunThresholds


class CIRunCreateResponse(BaseModel):
    run_id: UUID


class CIRunStatusResponse(BaseModel):
    run_id: UUID
    status: str
    decision: Literal["pass", "fail", "pending"]
    pass_rate: float
    unsafe_attempts: int
    failures: int
    top_failing_tools: list[ToolCount]
    dashboard_url: str


class MutationCountPct(BaseModel):
    mutation_id: str
    count: int
    pct: float


class ReasonCountPct(BaseModel):
    reason: str
    count: int
    pct: float


class EventIndexCount(BaseModel):
    event_index: int
    count: int


class ToolUsageStatsItem(BaseModel):
    tool: str
    attempts: int
    calls: int


class LethalMutationTopTool(BaseModel):
    tool: str
    count: int


class LethalMutationTopReason(BaseModel):
    reason: str
    count: int


class LethalMutationInsight(BaseModel):
    mutation_id: str
    failures: int
    attempts_hit: int
    failure_rate_when_hit: float
    top_tools: list[LethalMutationTopTool]
    top_reasons: list[LethalMutationTopReason]


class InsightEvidenceTool(BaseModel):
    tool: str
    count: int


class InsightEvidenceMutation(BaseModel):
    mutation_id: str
    count: int


class InsightEvidenceReason(BaseModel):
    reason: str
    count: int


class RunInsightEvidence(BaseModel):
    top_tools: list[InsightEvidenceTool] = Field(default_factory=list)
    top_mutations: list[InsightEvidenceMutation] = Field(default_factory=list)
    top_reasons: list[InsightEvidenceReason] = Field(default_factory=list)


class RunInsight(BaseModel):
    id: str
    title: str
    recommendation: str
    why: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: RunInsightEvidence


class RunStatsResponse(BaseModel):
    run_id: UUID
    attempts: RunAttemptsSummary
    failures_by_tool: list[ToolCountPct]
    tools_usage: list[ToolUsageStatsItem]
    failures_by_mutation: list[MutationCountPct]
    top_failure_reasons: list[ReasonCountPct]
    first_failure_step_distribution: list[EventIndexCount]
    attribution: str
    most_lethal_mutations: list[LethalMutationInsight]
    injection_blocks: int = 0
    injection_sanitizations: int = 0
    insights: list[RunInsight]


class ToolFragilityTopMutation(BaseModel):
    mutation_id: str
    count: int


class ToolFragilityTopReason(BaseModel):
    reason: str
    count: int


class ToolFragilityItem(BaseModel):
    tool: str
    attempts: int
    failures: int
    failure_rate: float
    top_mutations: list[ToolFragilityTopMutation]
    top_reasons: list[ToolFragilityTopReason]


class ToolFragilityResponse(BaseModel):
    window_days: int
    generated_at: datetime
    attempts_definition: str
    tools: list[ToolFragilityItem]


class MutationSummaryTopTool(BaseModel):
    tool: str
    count: int


class MutationSummaryTopReason(BaseModel):
    reason: str
    count: int


class MutationSummaryItem(BaseModel):
    mutation_id: str
    failures: int
    top_tools: list[MutationSummaryTopTool]
    top_reasons: list[MutationSummaryTopReason]


class MutationSummaryResponse(BaseModel):
    window_days: int
    mutations: list[MutationSummaryItem]


class CounterfactualMetadata(BaseModel):
    counterfactual_id: UUID
    attempt_id: UUID
    strategy: str
    result: str
    failure_reason: str | None
    metrics: Any | None
    diff: Any | None
    created_at: datetime


class CounterfactualListItem(BaseModel):
    strategy: str
    result: str
    failure_reason: str | None
    metrics: Any | None
    diff: Any | None
    created_at: datetime


class ProjectCreateRequest(BaseModel):
    name: str


class ProjectMetadata(BaseModel):
    project_id: UUID
    tenant_id: UUID
    name: str
    created_at: datetime


class ApiKeyCreateRequest(BaseModel):
    name: str
    project_id: UUID | None = None
    rate_limit_per_minute: int = Field(default=120, ge=1, le=10_000)


class ApiKeyMetadata(BaseModel):
    api_key_id: UUID
    tenant_id: UUID
    project_id: UUID | None = None
    user_id: UUID | None = None
    name: str
    is_demo: bool = False
    rate_limit_per_minute: int = 120
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


class ApiKeyCreateResponse(ApiKeyMetadata):
    api_key: str


class DemoLimits(BaseModel):
    campaigns_per_hour: int
    mutations_per_run: int
    traces_upload_per_hour: int | None = None
    max_trace_bytes: int | None = None


class DemoInfoResponse(BaseModel):
    demo_api_key: str
    demo_campaign: str
    demo_project: str | None = None
    demo_mutation_pack: str | None = None
    limits: DemoLimits
    recommended_flow: Literal["session", "shared_key"] = "session"
    session_ttl_minutes: int | None = None


class DemoSessionResponse(BaseModel):
    api_key: str
    project_id: UUID
    project_name: str
    demo_campaign: str
    demo_mutation_pack: str
    expires_at: datetime
    rate_limit_per_minute: int
    limits: DemoLimits


class AuthPermissionSet(BaseModel):
    visible_sections: list[str] = Field(default_factory=list)
    can_upload_traces: bool = False
    can_create_campaigns: bool = False
    can_run_campaigns: bool = False
    can_manage_mutation_packs: bool = False
    can_manage_policy_packs: bool = False
    can_manage_security_config: bool = False
    can_manage_workspace: bool = False
    can_manage_api_keys: bool = False
    can_manage_billing: bool = False


class AuthSessionMetadata(BaseModel):
    tenant_id: UUID
    project_id: UUID
    project_name: str
    project_scoped: bool = True
    pricing_tier: str = "credits"
    plan_name: str
    role_name: str
    user_id: UUID | None = None
    email: str | None = None
    name: str | None = None
    is_demo: bool = False
    billing_plan_name: str | None = None
    credits_balance: int | None = None
    monthly_credits: int | None = None
    topup_credits: int | None = None
    queue_priority: Literal["normal", "priority"] | None = None
    low_credit_threshold: int | None = None
    is_low_credit: bool = False
    permissions: AuthPermissionSet


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=256)
    name: str | None = Field(default=None, max_length=120)
    project_name: str | None = Field(default=None, max_length=120)
    pricing_tier: Literal["starter", "team", "enterprise"] | None = None


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=256)


class OAuthSessionExchangeRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)


class AuthSessionResponse(AuthSessionMetadata):
    api_key: str


class SubscriptionPlanMetadata(BaseModel):
    plan_id: UUID
    name: str
    monthly_price: int
    monthly_credits: int
    checkout_enabled: bool = False
    features: dict[str, Any]
    created_at: datetime


class UserSubscriptionMetadata(BaseModel):
    subscription_id: UUID
    plan_id: UUID
    plan_name: str | None = None
    monthly_price: int | None = None
    monthly_credits: int | None = None
    queue_priority: Literal["normal", "priority"] = "normal"
    status: str
    billing_provider: str | None = None
    portal_available: bool = False
    start_date: datetime
    renewal_date: datetime


class CreditWalletMetadata(BaseModel):
    wallet_id: UUID
    balance: int
    monthly_credits: int
    topup_credits: int
    queue_priority: Literal["normal", "priority"] = "normal"
    low_credit_threshold: int = 50
    is_low_credit: bool = False
    updated_at: datetime


class CreditTransactionMetadata(BaseModel):
    transaction_id: UUID
    user_id: UUID
    amount: int
    type: Literal["usage", "monthly_grant", "topup_purchase"]
    reason: str
    created_at: datetime


class BillingSubscribeRequest(BaseModel):
    plan_id: UUID


class BillingTopupRequest(BaseModel):
    credits: int = Field(gt=0)


class BillingRedirectSessionResponse(BaseModel):
    provider: str
    flow: Literal["checkout", "portal"]
    url: str
    session_id: str | None = None


class PolicyPackCreateRequest(BaseModel):
    name: str
    engine: Literal["builtin", "opa"] = "builtin"
    policy: Any


class PolicyPackUpdateRequest(BaseModel):
    name: str | None = None
    engine: Literal["builtin", "opa"] | None = None
    policy: Any
    created_by: str | None = None


class PolicyPackRollbackRequest(BaseModel):
    version_number: int = Field(ge=1)
    created_by: str | None = None


class PolicyPackVersionMetadata(BaseModel):
    version_id: UUID
    policy_pack_id: UUID
    version_number: int
    policy: Any
    created_by: str | None = None
    created_at: datetime
    is_active: bool = False


class PolicyPackMetadata(BaseModel):
    policy_pack_id: UUID
    project_id: UUID
    name: str
    engine: str
    policy: Any
    active_version_id: UUID | None = None
    active_version_number: int | None = None
    created_at: datetime


class MutationPackCreateRequest(BaseModel):
    name: str
    description: str | None = None
    config: Any
    credit_cost: int = 20


class MutationPackMetadata(BaseModel):
    mutation_pack_id: UUID
    project_id: UUID
    name: str
    description: str | None = None
    config: Any
    is_system: bool = False
    coverage_score: int = 0
    credit_cost: int = 20
    created_at: datetime


class MutationPackCreateResponse(MutationPackMetadata):
    warning: str | None = None
    validation_issues: list[str] = Field(default_factory=list)


class MutationPackCoverageResponse(BaseModel):
    mutation_pack_id: UUID
    coverage_score: int
    categories: list[str] = Field(default_factory=list)
    warning: str | None = None


HardeningTemplateType = Literal[
    "policy_pack",
    "retry_policy",
    "schema_adapter",
    "sanitizer",
]


class HardeningTemplateCreateRequest(BaseModel):
    name: str
    type: HardeningTemplateType
    config: Any


class HardeningTemplateMetadata(BaseModel):
    template_id: UUID
    project_id: UUID
    name: str
    type: HardeningTemplateType
    config: Any
    created_at: datetime


class ApplyTemplateRunResponse(BaseModel):
    new_run_id: UUID


class PolicyEventListItem(BaseModel):
    policy_event_id: UUID
    run_id: UUID
    attempt_id: UUID | None
    event_index: int | None
    tool: str
    action: str
    decision: str
    reason: str | None
    input: Any | None = None
    created_at: datetime


class AuditEventListItem(BaseModel):
    audit_event_id: UUID
    project_id: UUID
    event_type: str
    actor: str | None = None
    metadata: Any
    created_at: datetime


class SecurityEventListItem(BaseModel):
    security_event_id: UUID
    run_id: UUID
    attempt_id: UUID
    event_index: int
    tool: str
    zone: str
    risk_score: float
    action: Literal["allow", "sanitize", "block"]
    matches: Any | None = None
    created_at: datetime


class WebhookCreateRequest(BaseModel):
    url: str
    events: list[str] = Field(default_factory=list)
    is_enabled: bool = True


class WebhookUpdateRequest(BaseModel):
    url: str | None = None
    events: list[str] | None = None
    is_enabled: bool | None = None


class WebhookMetadata(BaseModel):
    webhook_id: UUID
    project_id: UUID
    url: str
    is_enabled: bool
    events: list[str]
    created_at: datetime
    last_success_at: datetime | None = None
    last_error: str | None = None


class WebhookCreateResponse(WebhookMetadata):
    secret: str


class WebhookRotateSecretResponse(BaseModel):
    webhook_id: UUID
    secret: str


class ToolRegistryCreateRequest(BaseModel):
    name: str
    zone: str = "untrusted"


class ToolRegistryZoneUpdateRequest(BaseModel):
    zone: str


class ToolRegistryMetadata(BaseModel):
    tool_id: UUID
    project_id: UUID
    name: str
    zone: str
    created_at: datetime

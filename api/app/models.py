from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


JSONB_COMPAT = JSON().with_variant(JSONB(), "postgresql")


class PlaceholderRecord(Base):
    __tablename__ = "placeholder_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="placeholder")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    marketing_emails_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=true(),
    )
    marketing_unsubscribed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider", "provider_user_id", name="uq_user_identities_provider_subject"
        ),
    )

    identity_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OAuthLoginState(Base):
    __tablename__ = "oauth_login_states"

    state_token: Mapped[str] = mapped_column(Text, primary_key=True)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    next_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuthSessionExchange(Base):
    __tablename__ = "auth_session_exchanges"

    exchange_token: Mapped[str] = mapped_column(Text, primary_key=True)
    session_payload: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GitHubIntegration(Base):
    __tablename__ = "github_integrations"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    repo: Mapped[str] = mapped_column(Text, nullable=False)
    installation_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    plan_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    monthly_price: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    monthly_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    features: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    user_subscription_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False, unique=True)
    plan_id: Mapped[UUID] = mapped_column(ForeignKey("subscription_plans.plan_id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="active",
        server_default=text("'active'"),
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    stripe_price_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    renewal_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CreditWallet(Base):
    __tablename__ = "credit_wallets"

    wallet_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False, unique=True)
    balance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    monthly_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    topup_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    credit_transaction_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class BillingWebhookEvent(Base):
    __tablename__ = "billing_webhook_events"

    event_id: Mapped[str] = mapped_column(Text, primary_key=True)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    pricing_tier: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="team",
        server_default=text("'team'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class TenantControl(Base):
    __tablename__ = "tenant_controls"

    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("tenants.tenant_id"),
        primary_key=True,
    )
    runs_paused: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )
    workspace_creation_locked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )
    updated_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=False)
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ApiKey(Base):
    __tablename__ = "api_keys"

    api_key_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=False)
    project_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("projects.project_id"), nullable=True
    )
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    is_demo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(
        Integer, nullable=False, default=120, server_default=text("120")
    )
    window_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    request_count_window: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProjectMembership(Base):
    __tablename__ = "project_memberships"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), primary_key=True)
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.role_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    audit_event_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_metadata: Mapped[Any] = mapped_column("metadata", JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class UserNotification(Base):
    __tablename__ = "user_notifications"

    notification_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=False)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    event_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="system",
        server_default=text("'system'"),
    )
    severity: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="info",
        server_default=text("'info'"),
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notification_metadata: Mapped[Any] = mapped_column(
        "metadata",
        JSONB_COMPAT,
        nullable=False,
        default=dict,
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class NewsletterCampaign(Base):
    __tablename__ = "newsletter_campaigns"

    newsletter_campaign_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    audience: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="subscribed_users",
        server_default=text("'subscribed_users'"),
    )
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    preview_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    eyebrow: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    cta_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    cta_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_by: Mapped[str] = mapped_column(Text, nullable=False)
    recipients_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    delivered_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str] = mapped_column(Text, nullable=False)
    entity: Mapped[str] = mapped_column(Text, nullable=False)
    audit_metadata: Mapped[Any] = mapped_column("metadata", JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class InternalFeatureFlag(Base):
    __tablename__ = "internal_feature_flags"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Webhook(Base):
    __tablename__ = "webhooks"

    webhook_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    secret: Mapped[str] = mapped_column(Text, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    events: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class Trace(Base):
    __tablename__ = "traces"

    trace_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    trace_version: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="0.1",
        server_default="0.1",
    )
    sdk_meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="valid",
        server_default="valid",
    )
    validation_errors: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    normalized_payload: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class TraceStep(Base):
    __tablename__ = "trace_steps"

    trace_step_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("traces.trace_id"), nullable=False)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    step_type: Mapped[str] = mapped_column(Text, nullable=False)
    step_name: Mapped[str] = mapped_column(Text, nullable=False)
    mutation_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    input_payload: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    output_payload: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    step_metadata: Mapped[Any | None] = mapped_column("metadata", JSONB_COMPAT, nullable=True)


class Campaign(Base):
    __tablename__ = "campaigns"

    campaign_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    mutation_pack_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("mutation_packs.mutation_pack_id"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="ready", server_default="ready"
    )
    mutation_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    eval_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ScheduledCampaign(Base):
    __tablename__ = "scheduled_campaigns"

    scheduled_campaign_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(ForeignKey("campaigns.campaign_id"), nullable=False)
    mutation_pack_id: Mapped[UUID] = mapped_column(
        ForeignKey("mutation_packs.mutation_pack_id"), nullable=False
    )
    cron_schedule: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PolicyPack(Base):
    __tablename__ = "policy_packs"

    policy_pack_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    engine: Mapped[str] = mapped_column(Text, nullable=False, default="builtin")
    policy: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )
    active_version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "policy_pack_versions.version_id",
            use_alter=True,
            name="fk_policy_packs_active_version_id",
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PolicyPackVersion(Base):
    __tablename__ = "policy_pack_versions"

    version_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    policy_pack_id: Mapped[UUID] = mapped_column(
        ForeignKey("policy_packs.policy_pack_id"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    policy: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class MutationPack(Base):
    __tablename__ = "mutation_packs"

    mutation_pack_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    coverage_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    credit_cost: Mapped[int] = mapped_column(
        Integer, nullable=False, default=20, server_default=text("20")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ToolRegistry(Base):
    __tablename__ = "tools_registry"

    tool_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    zone: Mapped[str] = mapped_column(Text, nullable=False, default="untrusted")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class HardeningTemplate(Base):
    __tablename__ = "hardening_templates"

    template_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    config: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Run(Base):
    __tablename__ = "runs"

    run_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("traces.trace_id"), nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(ForeignKey("campaigns.campaign_id"), nullable=False)
    mutation_pack_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("mutation_packs.mutation_pack_id"), nullable=True
    )
    policy_pack_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("policy_packs.policy_pack_id"), nullable=True
    )
    effective_policy_pack_version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("policy_pack_versions.version_id"), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class RunTemplateLink(Base):
    __tablename__ = "run_template_links"

    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), primary_key=True)
    template_id: Mapped[UUID] = mapped_column(
        ForeignKey("hardening_templates.template_id"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ReplayAttempt(Base):
    __tablename__ = "replay_attempts"

    attempt_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), nullable=False)
    mutation_id: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_failure_event_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_failure_tool: Mapped[str | None] = mapped_column(Text, nullable=True)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mutation_trace: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    tools_touched: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    tool_call_counts: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    artifacts_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Failure(Base):
    __tablename__ = "failures"

    failure_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(ForeignKey("campaigns.campaign_id"), nullable=False)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("traces.trace_id"), nullable=False)
    mutation_name: Mapped[str] = mapped_column(Text, nullable=False)
    failure_type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    failure_metadata: Mapped[Any | None] = mapped_column("metadata", JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Counterfactual(Base):
    __tablename__ = "counterfactuals"

    counterfactual_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    attempt_id: Mapped[UUID] = mapped_column(
        ForeignKey("replay_attempts.attempt_id"), nullable=False
    )
    strategy: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    diff: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PolicyEvent(Base):
    __tablename__ = "policy_events"

    policy_event_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), nullable=False)
    attempt_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("replay_attempts.attempt_id"), nullable=True
    )
    event_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tool: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    input: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class QualityContract(Base):
    __tablename__ = "quality_contracts"

    contract_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(
        ForeignKey("campaigns.campaign_id"), nullable=False, unique=True
    )
    # List of mutation pack UUIDs (as strings) that must be used
    required_pack_ids: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    # Tool names that must appear in at least one trace in the batch
    required_tools: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    # Minimum attempts that must fire for the pack used
    min_attempts_per_pack: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    # Incremented on every update; snapshotted in CI runs for reproducibility
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SecurityEvent(Base):
    __tablename__ = "security_events"

    security_event_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), nullable=False)
    attempt_id: Mapped[UUID] = mapped_column(
        ForeignKey("replay_attempts.attempt_id"), nullable=False
    )
    event_index: Mapped[int] = mapped_column(Integer, nullable=False)
    tool: Mapped[str] = mapped_column(Text, nullable=False)
    zone: Mapped[str] = mapped_column(Text, nullable=False)
    risk_score: Mapped[float] = mapped_column(nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    matches: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

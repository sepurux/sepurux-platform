from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.models import AuditEvent, PolicyEvent, Run, SecurityEvent
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def compliance_summary(
    db: Session,
    *,
    project_id: UUID,
    window_days: int = 30,
    top_n: int = 5,
) -> dict[str, object]:
    cutoff = datetime.now(UTC) - timedelta(days=window_days)

    audit_events_total = int(
        db.scalar(
            select(func.count())
            .select_from(AuditEvent)
            .where(
                AuditEvent.project_id == project_id,
                AuditEvent.created_at >= cutoff,
            )
        )
        or 0
    )

    policy_events_total = 0
    policy_denies = 0
    policy_tool_counter: Counter[str] = Counter()
    policy_rows = db.execute(
        select(PolicyEvent.tool, PolicyEvent.decision)
        .select_from(PolicyEvent)
        .join(Run, Run.run_id == PolicyEvent.run_id)
        .where(
            Run.project_id == project_id,
            PolicyEvent.created_at >= cutoff,
        )
    )
    for tool, decision in policy_rows:
        policy_events_total += 1
        if tool:
            policy_tool_counter[str(tool)] += 1
        if str(decision or "").strip().lower() in {"deny", "block"}:
            policy_denies += 1

    security_events_total = 0
    security_blocks = 0
    security_sanitizations = 0
    security_tool_counter: Counter[str] = Counter()
    security_rows = db.execute(
        select(SecurityEvent.tool, SecurityEvent.action)
        .select_from(SecurityEvent)
        .join(Run, Run.run_id == SecurityEvent.run_id)
        .where(
            Run.project_id == project_id,
            SecurityEvent.created_at >= cutoff,
        )
    )
    for tool, action in security_rows:
        security_events_total += 1
        if tool:
            security_tool_counter[str(tool)] += 1

        normalized_action = str(action or "").strip().lower()
        if normalized_action == "block":
            security_blocks += 1
        elif normalized_action == "sanitize":
            security_sanitizations += 1

    top_policy_tools = [
        {"tool": tool, "count": count} for tool, count in policy_tool_counter.most_common(top_n)
    ]
    top_security_tools = [
        {"tool": tool, "count": count} for tool, count in security_tool_counter.most_common(top_n)
    ]

    return {
        "window_days": window_days,
        "generated_at": datetime.now(UTC),
        "audit_events_total": audit_events_total,
        "policy_events_total": policy_events_total,
        "security_events_total": security_events_total,
        "policy_denies": policy_denies,
        "security_blocks": security_blocks,
        "security_sanitizations": security_sanitizations,
        "top_policy_tools": top_policy_tools,
        "top_security_tools": top_security_tools,
    }

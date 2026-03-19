from __future__ import annotations

import os
import smtplib
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from typing import Literal

import httpx
from app.models import Failure, Run
from app.schemas import InternalAlertItem, InternalAlertNotificationResult
from sqlalchemy import func, select
from sqlalchemy.orm import Session

FAILED_RUN_STATUSES = {"failed", "error"}


def _coerce_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def evaluate_internal_alerts(
    db: Session,
    *,
    now: datetime | None = None,
) -> list[InternalAlertItem]:
    current_time = now or datetime.now(UTC)
    window_24h = current_time - timedelta(hours=24)
    window_1h = current_time - timedelta(hours=1)

    recent_runs = _coerce_int(
        db.scalar(select(func.count()).select_from(Run).where(Run.created_at >= window_24h))
    )
    recent_failures = _coerce_int(
        db.scalar(select(func.count()).select_from(Failure).where(Failure.created_at >= window_24h))
    )
    failed_runs_24h = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Run)
            .where(
                Run.created_at >= window_24h,
                Run.status.in_(sorted(FAILED_RUN_STATUSES)),
            )
        )
    )
    failed_runs_1h = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Run)
            .where(
                Run.created_at >= window_1h,
                Run.status.in_(sorted(FAILED_RUN_STATUSES)),
            )
        )
    )

    alerts: list[InternalAlertItem] = []

    if recent_runs > 0:
        failure_rate = recent_failures / float(recent_runs)
        if failure_rate >= 0.3:
            severity: Literal["warning", "critical"] = (
                "critical" if failure_rate >= 0.5 else "warning"
            )
            alerts.append(
                InternalAlertItem(
                    alert_type="high_failure_rate",
                    severity=severity,
                    message=(
                        f"Failure rate is {failure_rate:.0%} over the last 24h "
                        f"({recent_failures} failures / {recent_runs} runs)."
                    ),
                    metric="failure_rate_24h",
                    value=round(failure_rate, 4),
                    detected_at=current_time,
                )
            )

    if failed_runs_24h > 0:
        alerts.append(
            InternalAlertItem(
                alert_type="campaign_failures",
                severity="critical" if failed_runs_24h >= 3 else "warning",
                message=f"{failed_runs_24h} campaign runs failed in the last 24h.",
                metric="failed_runs_24h",
                value=float(failed_runs_24h),
                detected_at=current_time,
            )
        )

    if failed_runs_1h > 0:
        alerts.append(
            InternalAlertItem(
                alert_type="system_errors",
                severity="critical",
                message=f"{failed_runs_1h} failed runs detected in the last hour.",
                metric="failed_runs_1h",
                value=float(failed_runs_1h),
                detected_at=current_time,
            )
        )

    return alerts


def _alert_message(alerts: list[InternalAlertItem]) -> str:
    if not alerts:
        return "Sepurux internal alerts: no active alerts."

    lines = ["Sepurux internal alerts:"]
    for item in alerts:
        lines.append(f"- [{item.severity.upper()}] {item.alert_type}: {item.message}")
    return "\n".join(lines)


def _notify_slack(message: str) -> InternalAlertNotificationResult:
    webhook_url = os.getenv("INTERNAL_ALERT_SLACK_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return InternalAlertNotificationResult(
            channel="slack",
            delivered=False,
            detail="INTERNAL_ALERT_SLACK_WEBHOOK_URL is not configured",
        )

    try:
        response = httpx.post(webhook_url, json={"text": message}, timeout=10)
        response.raise_for_status()
        return InternalAlertNotificationResult(channel="slack", delivered=True)
    except Exception as exc:
        return InternalAlertNotificationResult(
            channel="slack",
            delivered=False,
            detail=str(exc),
        )


def _notify_email(message: str) -> InternalAlertNotificationResult:
    smtp_host = os.getenv("INTERNAL_ALERT_SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("INTERNAL_ALERT_SMTP_PORT", "587"))
    to_address = os.getenv("INTERNAL_ALERT_EMAIL_TO", "").strip()
    from_address = os.getenv("INTERNAL_ALERT_EMAIL_FROM", "").strip()
    smtp_user = os.getenv("INTERNAL_ALERT_SMTP_USER", "").strip()
    smtp_pass = os.getenv("INTERNAL_ALERT_SMTP_PASS", "").strip()
    use_starttls = os.getenv("INTERNAL_ALERT_SMTP_STARTTLS", "true").strip().lower() != "false"

    if not smtp_host or not to_address or not from_address:
        return InternalAlertNotificationResult(
            channel="email",
            delivered=False,
            detail=(
                "INTERNAL_ALERT_SMTP_HOST, INTERNAL_ALERT_EMAIL_TO, and "
                "INTERNAL_ALERT_EMAIL_FROM are required"
            ),
        )

    msg = EmailMessage()
    msg["Subject"] = "Sepurux Internal Alert"
    msg["From"] = from_address
    msg["To"] = to_address
    msg.set_content(message)

    try:
        with smtplib.SMTP(host=smtp_host, port=smtp_port, timeout=10) as smtp:
            if use_starttls:
                smtp.starttls()
            if smtp_user and smtp_pass:
                smtp.login(smtp_user, smtp_pass)
            smtp.send_message(msg)
        return InternalAlertNotificationResult(channel="email", delivered=True)
    except Exception as exc:
        return InternalAlertNotificationResult(
            channel="email",
            delivered=False,
            detail=str(exc),
        )


def notify_internal_alerts(
    alerts: list[InternalAlertItem],
) -> list[InternalAlertNotificationResult]:
    message = _alert_message(alerts)
    return [_notify_slack(message), _notify_email(message)]

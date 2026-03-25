from __future__ import annotations

import html
import logging
import os
from urllib.parse import quote
from uuid import UUID

import httpx

logger = logging.getLogger(__name__)

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").strip().lower() or "resend"
EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip()
EMAIL_REPLY_TO = os.getenv("EMAIL_REPLY_TO", "").strip()
EMAIL_RESEND_API_KEY = os.getenv("EMAIL_RESEND_API_KEY", "").strip()
EMAIL_RESEND_API_BASE_URL = (
    os.getenv("EMAIL_RESEND_API_BASE_URL", "https://api.resend.com").strip().rstrip("/")
)
EMAIL_LOGO_URL = os.getenv("SEPURUX_EMAIL_LOGO_URL", "").strip()
EMAIL_BRAND_COLOR = os.getenv("SEPURUX_EMAIL_BRAND_COLOR", "#22c55e").strip()


def _ui_base_url() -> str:
    raw = os.getenv("SEPURUX_UI_BASE_URL") or os.getenv("APP_PUBLIC_URL") or "http://localhost:3000"
    return raw.rstrip("/")


def _api_base_url() -> str:
    raw = os.getenv("SEPURUX_API_PUBLIC_URL") or "http://localhost:8000"
    return raw.rstrip("/")


def _docs_url() -> str:
    raw = os.getenv("SEPURUX_DOCS_URL") or "https://docs.sepurux.com"
    return raw.rstrip("/")


def _support_email() -> str:
    return EMAIL_REPLY_TO or "support@sepurux.com"


def _logo_url() -> str:
    explicit = EMAIL_LOGO_URL.strip()
    if explicit:
        return explicit
    site_url = (os.getenv("SITE_PUBLIC_URL") or "https://sepurux.com").rstrip("/")
    return f"{site_url}/logo.png"


def _brand_color() -> str:
    value = EMAIL_BRAND_COLOR.strip()
    if len(value) in {4, 7} and value.startswith("#"):
        if all(char in "0123456789abcdefABCDEF" for char in value[1:]):
            return value
    return "#22c55e"


def _person_label(value: str | None) -> str:
    if isinstance(value, str):
        normalized = value.strip()
        if normalized:
            return normalized
    return "there"


def _email_layout(
    *,
    title: str,
    subtitle: str,
    intro_line: str,
    body_html: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
) -> str:
    accent = _brand_color()
    escaped_title = html.escape(title)
    escaped_subtitle = html.escape(subtitle)
    escaped_intro = html.escape(intro_line)
    escaped_support = html.escape(_support_email())
    escaped_accent = html.escape(accent, quote=True)
    logo_html = ""
    logo_url = _logo_url()
    if logo_url:
        logo_html = (
            f'<img src="{html.escape(logo_url, quote=True)}" alt="Sepurux" '
            'width="132" style="display:block;max-width:132px;height:auto;margin:0 0 10px;'
            'border:0;outline:none;text-decoration:none;" />'
        )
    cta_html = ""
    if cta_label and cta_url:
        cta_html = (
            f'<p style="margin:20px 0 0;">'
            f'<a href="{html.escape(cta_url, quote=True)}" '
            'style="display:inline-block;padding:11px 16px;border-radius:10px;'
            f"background:{escaped_accent};color:#04120b;text-decoration:none;font-weight:700;"
            'font-size:14px;">'
            f"{html.escape(cta_label)}"
            "</a></p>"
        )

    return (
        "<!doctype html>"
        '<html lang="en"><body style="margin:0;padding:0;background:#060910;">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background:#060910;padding:24px 12px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="max-width:640px;background:#0b1020;border:1px solid #1a2236;border-radius:16px;'
        'overflow:hidden;">'
        '<tr><td style="padding:24px 28px;border-bottom:1px solid #1a2236;">'
        f"{logo_html}"
        f'<p style="margin:0 0 8px;color:{escaped_accent};font-size:12px;font-weight:700;'
        'letter-spacing:0.16em;text-transform:uppercase;">Sepurux</p>'
        f'<h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.25;">{escaped_title}</h1>'
        f'<p style="margin:10px 0 0;color:#9fb0cf;font-size:14px;line-height:1.5;">{escaped_subtitle}</p>'
        "</td></tr>"
        '<tr><td style="padding:24px 28px;color:#e8efff;font-size:14px;line-height:1.65;">'
        f'<p style="margin:0 0 14px;">{escaped_intro}</p>'
        f"{body_html}"
        f"{cta_html}"
        "</td></tr>"
        '<tr><td style="padding:18px 28px;border-top:1px solid #1a2236;'
        'color:#8c9ab8;font-size:12px;line-height:1.6;">'
        f"If you need help, reply to {escaped_support}.<br/>"
        "Sepurux AI Reliability Platform"
        "</td></tr>"
        "</table></td></tr></table></body></html>"
    )


def send_email(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> bool:
    recipient = to_email.strip()
    if not recipient:
        return False

    if EMAIL_PROVIDER != "resend":
        logger.warning("Unsupported EMAIL_PROVIDER configured: %s", EMAIL_PROVIDER)
        return False

    if not EMAIL_RESEND_API_KEY or not EMAIL_FROM:
        logger.info(
            "Email provider not configured; skipping send to %s (set EMAIL_RESEND_API_KEY and EMAIL_FROM)",
            recipient,
        )
        return False

    payload: dict[str, object] = {
        "from": EMAIL_FROM,
        "to": [recipient],
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body
    if EMAIL_REPLY_TO:
        payload["reply_to"] = EMAIL_REPLY_TO

    try:
        response = httpx.post(
            f"{EMAIL_RESEND_API_BASE_URL}/emails",
            headers={
                "Authorization": f"Bearer {EMAIL_RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10.0,
        )
        if response.status_code >= 400:
            logger.warning(
                "Email provider returned %s for %s: %s",
                response.status_code,
                recipient,
                response.text[:500],
            )
            return False
        return True
    except Exception:
        logger.exception("Email delivery failed for %s", recipient)
        return False


def send_welcome_email(*, to_email: str, recipient_name: str | None, project_name: str) -> bool:
    name = _person_label(recipient_name)
    ui_url = _ui_base_url()
    api_url = _api_base_url()
    docs_url = _docs_url()

    subject = "Welcome to Sepurux"
    text_body = (
        f"Hi {name},\n\n"
        "Welcome to Sepurux. Your workspace is ready.\n"
        f"Workspace: {project_name}\n\n"
        "Quick start:\n"
        f"1. Sign in: {ui_url}/auth?mode=access&intent=login\n"
        "2. Create an API key from Settings > API Keys\n"
        f"3. Send your first trace or run a campaign against {api_url}\n\n"
        f"Docs: {docs_url}\n\n"
        "If you have questions, reply to this email."
    )
    html_body = _email_layout(
        title="Welcome to Sepurux",
        subtitle="Your workspace is ready to run reliability campaigns.",
        intro_line=f"Hi {name}, thanks for joining Sepurux.",
        body_html=(
            f'<p style="margin:0 0 14px;"><strong>Workspace:</strong> {html.escape(project_name)}</p>'
            '<p style="margin:0 0 10px;"><strong>Quick start</strong></p>'
            '<ol style="margin:0 0 14px 18px;padding:0;">'
            '<li style="margin:0 0 6px;">Sign in and open your dashboard</li>'
            '<li style="margin:0 0 6px;">Create an API key under Settings &gt; API Keys</li>'
            f'<li style="margin:0;">Send a trace or run your first campaign against <code>{html.escape(api_url)}</code></li>'
            "</ol>"
            f'<p style="margin:0;">Docs: <a href="{html.escape(docs_url, quote=True)}" '
            'style="color:#7dd3fc;text-decoration:underline;">'
            f"{html.escape(docs_url)}</a></p>"
        ),
        cta_label="Open Dashboard",
        cta_url=f"{ui_url}/auth?mode=access&intent=login",
    )
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_member_invite_email(
    *,
    to_email: str,
    recipient_name: str | None,
    inviter_label: str,
    project_name: str,
    project_id: UUID,
    role: str,
) -> bool:
    name = _person_label(recipient_name)
    ui_url = _ui_base_url()
    docs_url = _docs_url()

    subject = f"You were invited to {project_name} on Sepurux"
    text_body = (
        f"Hi {name},\n\n"
        f"{inviter_label} invited you to join '{project_name}' on Sepurux as {role}.\n\n"
        f"Project ID: {project_id}\n\n"
        "For security, API keys are not sent by email.\n"
        "Ask your workspace admin for API credentials, or sign in to your workspace.\n\n"
        f"Sign in: {ui_url}/auth?mode=access&intent=login\n"
        f"Docs: {docs_url}\n"
    )
    html_body = _email_layout(
        title="Workspace Invite",
        subtitle="You were invited to collaborate in Sepurux.",
        intro_line=f"Hi {name}, {inviter_label} invited you to {project_name} as {role}.",
        body_html=(
            '<p style="margin:0 0 10px;"><strong>Workspace details</strong></p>'
            '<div style="margin:0 0 14px;padding:12px;border:1px solid #263149;'
            'border-radius:10px;background:#0e1528;color:#d8e8ff;">'
            f"<div><code>Project ID: {html.escape(str(project_id))}</code></div>"
            "</div>"
            '<p style="margin:0 0 14px;">For security, API keys are not sent by email. '
            "Ask your workspace admin for API credentials, or sign in to your workspace.</p>"
            f'<p style="margin:0;">Docs: <a href="{html.escape(docs_url, quote=True)}" '
            'style="color:#7dd3fc;text-decoration:underline;">'
            f"{html.escape(docs_url)}</a></p>"
        ),
        cta_label="Sign In to Sepurux",
        cta_url=f"{ui_url}/auth?mode=access&intent=login",
    )
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_password_reset_email(
    *,
    to_email: str,
    recipient_name: str | None,
    reset_token: str,
    expires_minutes: int,
) -> bool:
    name = _person_label(recipient_name)
    reset_url = f"{_ui_base_url()}/auth/reset-password?token={quote(reset_token, safe='')}"

    subject = "Reset your Sepurux password"
    text_body = (
        f"Hi {name},\n\n"
        "We received a request to reset your Sepurux password.\n"
        f"Reset link (expires in {expires_minutes} minutes):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this message."
    )
    html_body = _email_layout(
        title="Reset Your Password",
        subtitle="Secure access to your Sepurux workspace.",
        intro_line=f"Hi {name}, we received a password reset request.",
        body_html=(
            f'<p style="margin:0 0 12px;">This reset link expires in <strong>{expires_minutes} minutes</strong>.</p>'
            '<p style="margin:0;color:#9fb0cf;">If you did not request this, you can safely ignore this email.</p>'
        ),
        cta_label="Reset Password",
        cta_url=reset_url,
    )
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_password_changed_email(*, to_email: str, recipient_name: str | None) -> bool:
    name = _person_label(recipient_name)
    subject = "Your Sepurux password was changed"
    text_body = (
        f"Hi {name},\n\n"
        "Your Sepurux password has been changed successfully.\n"
        "If this was not you, contact support immediately and rotate your API keys."
    )
    html_body = _email_layout(
        title="Password Updated",
        subtitle="Your Sepurux account credentials were changed.",
        intro_line=f"Hi {name}, your password has been changed successfully.",
        body_html=(
            '<p style="margin:0;">If this was not you, contact support immediately and rotate '
            "your API keys.</p>"
        ),
    )
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


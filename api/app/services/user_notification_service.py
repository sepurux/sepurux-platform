from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import logging
import os
from uuid import UUID
from urllib.parse import quote

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
EMAIL_BRAND_COLOR = os.getenv("SEPURUX_EMAIL_BRAND_COLOR", "#D7843B").strip()
EMAIL_SECONDARY_COLOR = os.getenv("SEPURUX_EMAIL_SECONDARY_COLOR", "#4F8767").strip()
EMAIL_UNSUBSCRIBE_SECRET = os.getenv("EMAIL_UNSUBSCRIBE_SECRET", "").strip()


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


def _valid_hex_color(value: str, fallback: str) -> str:
    normalized = value.strip()
    if len(normalized) in {4, 7} and normalized.startswith("#"):
        if all(char in "0123456789abcdefABCDEF" for char in normalized[1:]):
            return normalized
    return fallback


def _brand_color() -> str:
    return _valid_hex_color(EMAIL_BRAND_COLOR, "#D7843B")


def _secondary_color() -> str:
    return _valid_hex_color(EMAIL_SECONDARY_COLOR, "#4F8767")


def _unsubscribe_secret() -> str:
    return EMAIL_UNSUBSCRIBE_SECRET or EMAIL_RESEND_API_KEY or "sepurux-dev-newsletter-secret"


def _person_label(value: str | None) -> str:
    if isinstance(value, str):
        normalized = value.strip()
        if normalized:
            return normalized
    return "there"


def _clean_optional_text(value: str | None) -> str | None:
    if isinstance(value, str):
        normalized = value.strip()
        if normalized:
            return normalized
    return None


def _hidden_preheader_html(value: str | None) -> str:
    text = html.escape(_clean_optional_text(value) or "Sepurux")
    return (
        '<div style="display:none;max-height:0;overflow:hidden;opacity:0;'
        'mso-hide:all;color:transparent;font-size:1px;line-height:1px;">'
        f"{text}"
        "</div>"
    )


def _rich_text_to_html(value: str) -> str:
    blocks: list[str] = []
    paragraph_lines: list[str] = []
    list_items: list[str] = []

    def flush_paragraph() -> None:
        if paragraph_lines:
            text = " ".join(html.escape(item.strip()) for item in paragraph_lines if item.strip())
            if text:
                blocks.append(
                    '<p style="margin:0 0 14px;color:#223127;font-size:15px;line-height:1.75;">'
                    f"{text}"
                    "</p>"
                )
            paragraph_lines.clear()

    def flush_list() -> None:
        if list_items:
            items = "".join(
                '<li style="margin:0 0 8px;color:#223127;">'
                f"{html.escape(item)}"
                "</li>"
                for item in list_items
            )
            blocks.append(
                '<ul style="margin:0 0 16px 20px;padding:0;color:#223127;font-size:15px;line-height:1.75;">'
                f"{items}"
                "</ul>"
            )
            list_items.clear()

    for raw_line in value.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            flush_list()
            continue
        if line.startswith(("- ", "* ")):
            flush_paragraph()
            item = line[2:].strip()
            if item:
                list_items.append(item)
            continue
        flush_list()
        paragraph_lines.append(line)

    flush_paragraph()
    flush_list()
    return "".join(blocks)


def _email_layout(
    *,
    title: str,
    subtitle: str,
    intro_line: str,
    body_html: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
    preheader: str | None = None,
    eyebrow: str | None = None,
    footer_html: str | None = None,
) -> str:
    accent = html.escape(_brand_color(), quote=True)
    secondary = html.escape(_secondary_color(), quote=True)
    escaped_title = html.escape(title)
    escaped_subtitle = html.escape(subtitle)
    escaped_intro = html.escape(intro_line)
    escaped_support = html.escape(_support_email())
    escaped_docs = html.escape(_docs_url(), quote=True)
    escaped_eyebrow = html.escape(_clean_optional_text(eyebrow) or "Sepurux")

    logo_html = ""
    logo_url = _logo_url()
    if logo_url:
        logo_html = (
            f'<img src="{html.escape(logo_url, quote=True)}" alt="Sepurux" '
            'width="132" style="display:block;max-width:132px;height:auto;margin:0 0 14px;'
            'border:0;outline:none;text-decoration:none;" />'
        )

    cta_html = ""
    if cta_label and cta_url:
        cta_html = (
            '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 0;">'
            '<tr>'
            '<td style="border-radius:999px;">'
            f'<a href="{html.escape(cta_url, quote=True)}" '
            'style="display:inline-block;padding:13px 22px;border-radius:999px;'
            f'background:{accent};color:#fffdfa;text-decoration:none;font-weight:700;font-size:14px;">'
            f"{html.escape(cta_label)}"
            "</a>"
            "</td>"
            "</tr>"
            "</table>"
        )

    resolved_footer_html = footer_html or (
        '<p style="margin:0 0 6px;">Questions or account issues? '
        f'<a href="mailto:{escaped_support}" style="color:{secondary};text-decoration:underline;">'
        f"{escaped_support}"
        "</a>.</p>"
        '<p style="margin:0;">Docs: '
        f'<a href="{escaped_docs}" style="color:{secondary};text-decoration:underline;">'
        f"{html.escape(_docs_url())}"
        "</a>.</p>"
    )

    return (
        "<!doctype html>"
        '<html lang="en"><body style="margin:0;padding:0;background:#f3ede6;">'
        f"{_hidden_preheader_html(preheader or subtitle)}"
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="width:100%;background:#f3ede6;padding:24px 12px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="max-width:680px;background:#fffdfa;border:1px solid #eadfd1;border-radius:24px;overflow:hidden;">'
        '<tr><td style="padding:30px 32px 24px;background:#fbf5ee;border-bottom:1px solid #eadfd1;">'
        f"{logo_html}"
        f'<p style="margin:0 0 10px;color:{accent};font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">{escaped_eyebrow}</p>'
        f'<h1 style="margin:0;color:#142117;font-size:30px;line-height:1.15;font-weight:700;">{escaped_title}</h1>'
        f'<p style="margin:12px 0 0;color:#5f6d63;font-size:15px;line-height:1.6;">{escaped_subtitle}</p>'
        '</td></tr>'
        '<tr><td style="padding:28px 32px 10px;color:#223127;font-size:15px;line-height:1.75;">'
        '<div style="margin:0 0 18px;padding:18px 20px;border:1px solid #e8ddd0;border-radius:18px;background:#f7f1ea;">'
        f'<p style="margin:0;color:{secondary};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Sepurux</p>'
        f'<p style="margin:10px 0 0;color:#223127;font-size:15px;line-height:1.75;">{escaped_intro}</p>'
        '</div>'
        f"{body_html}"
        f"{cta_html}"
        '</td></tr>'
        '<tr><td style="padding:20px 32px 28px;">'
        '<div style="padding-top:16px;border-top:1px solid #eadfd1;color:#66756c;font-size:12px;line-height:1.7;">'
        f"{resolved_footer_html}"
        '</div>'
        '</td></tr>'
        '</table>'
        '</td></tr>'
        '</table>'
        '</body></html>'
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


def build_marketing_unsubscribe_token(*, user_id: UUID, email: str) -> str:
    payload = json.dumps(
        {
            "user_id": str(user_id),
            "email": email.strip().lower(),
            "scope": "marketing",
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    signature = hmac.new(
        _unsubscribe_secret().encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    encoded = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"{encoded}.{signature}"


def parse_marketing_unsubscribe_token(token: str) -> tuple[UUID, str]:
    raw = token.strip()
    if not raw or "." not in raw:
        raise ValueError("Invalid unsubscribe token")

    encoded_payload, provided_signature = raw.split(".", 1)
    padding = "=" * (-len(encoded_payload) % 4)
    try:
        payload = base64.urlsafe_b64decode((encoded_payload + padding).encode("ascii"))
        expected_signature = hmac.new(
            _unsubscribe_secret().encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(provided_signature, expected_signature):
            raise ValueError("Invalid unsubscribe token")
        decoded = json.loads(payload.decode("utf-8"))
        if decoded.get("scope") != "marketing":
            raise ValueError("Invalid unsubscribe token")
        user_id = UUID(str(decoded["user_id"]))
        email = str(decoded["email"]).strip().lower()
    except Exception as exc:
        raise ValueError("Invalid unsubscribe token") from exc
    if not email:
        raise ValueError("Invalid unsubscribe token")
    return user_id, email


def build_marketing_unsubscribe_url(*, user_id: UUID, email: str) -> str:
    token = build_marketing_unsubscribe_token(user_id=user_id, email=email)
    return f"{_ui_base_url()}/unsubscribe?token={quote(token, safe='')}"


def build_newsletter_email(
    *,
    recipient_email: str,
    recipient_name: str | None,
    user_id: UUID,
    subject: str,
    preview_text: str | None,
    eyebrow: str | None,
    title: str,
    summary: str | None,
    body: str,
    cta_label: str | None,
    cta_url: str | None,
) -> tuple[str, str]:
    name = _person_label(recipient_name)
    summary_line = _clean_optional_text(summary)
    unsubscribe_url = build_marketing_unsubscribe_url(user_id=user_id, email=recipient_email)
    text_parts = [f"Hi {name},", ""]
    if summary_line:
        text_parts.append(summary_line)
        text_parts.append("")
    text_parts.append(body.strip())
    if cta_label and cta_url:
        text_parts.extend(["", f"{cta_label}: {cta_url}"])
    text_parts.extend(["", f"Unsubscribe: {unsubscribe_url}"])
    text_body = "\n".join(text_parts)

    footer_html = (
        '<p style="margin:0 0 6px;">You are receiving this email because you have a Sepurux account and are subscribed to product updates.</p>'
        f'<p style="margin:0 0 6px;"><a href="{html.escape(unsubscribe_url, quote=True)}" '
        f'style="color:{html.escape(_secondary_color(), quote=True)};text-decoration:underline;">Unsubscribe from newsletter updates</a></p>'
        f'<p style="margin:0;">Need help? Reply to <a href="mailto:{html.escape(_support_email())}" '
        f'style="color:{html.escape(_secondary_color(), quote=True)};text-decoration:underline;">{html.escape(_support_email())}</a>.</p>'
    )
    intro_line = summary_line or f"Hi {name}, here is the latest Sepurux update."
    body_html = _rich_text_to_html(body)
    if summary_line:
        body_html = (
            '<p style="margin:0 0 14px;color:#5f6d63;font-size:15px;line-height:1.75;">'
            f"{html.escape(summary_line)}"
            "</p>"
        ) + body_html

    html_body = _email_layout(
        title=title,
        subtitle=preview_text or summary_line or subject,
        intro_line=intro_line,
        body_html=body_html,
        cta_label=cta_label,
        cta_url=cta_url,
        preheader=preview_text or summary_line or subject,
        eyebrow=eyebrow or "Sepurux Newsletter",
        footer_html=footer_html,
    )
    return text_body, html_body


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
            f'<p style="margin:0 0 14px;color:#223127;"><strong>Workspace:</strong> {html.escape(project_name)}</p>'
            '<p style="margin:0 0 10px;color:#223127;"><strong>Quick start</strong></p>'
            '<ol style="margin:0 0 16px 20px;padding:0;color:#223127;font-size:15px;line-height:1.75;">'
            '<li style="margin:0 0 8px;">Sign in and open your dashboard</li>'
            '<li style="margin:0 0 8px;">Create an API key under Settings &gt; API Keys</li>'
            f'<li style="margin:0;">Send a trace or run your first campaign against <code>{html.escape(api_url)}</code></li>'
            "</ol>"
            f'<p style="margin:0;color:#5f6d63;">Docs: <a href="{html.escape(docs_url, quote=True)}" '
            f'style="color:{html.escape(_secondary_color(), quote=True)};text-decoration:underline;">'
            f"{html.escape(docs_url)}</a></p>"
        ),
        cta_label="Open Dashboard",
        cta_url=f"{ui_url}/auth?mode=access&intent=login",
        preheader="Your Sepurux workspace is ready.",
        eyebrow="Workspace Ready",
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
            '<p style="margin:0 0 10px;color:#223127;"><strong>Workspace details</strong></p>'
            '<div style="margin:0 0 16px;padding:14px;border:1px solid #e8ddd0;border-radius:16px;background:#f7f1ea;color:#223127;">'
            f"<div><code>Project ID: {html.escape(str(project_id))}</code></div>"
            '</div>'
            '<p style="margin:0 0 14px;color:#223127;">For security, API keys are not sent by email. '
            'Ask your workspace admin for API credentials, or sign in to your workspace.</p>'
            f'<p style="margin:0;color:#5f6d63;">Docs: <a href="{html.escape(docs_url, quote=True)}" '
            f'style="color:{html.escape(_secondary_color(), quote=True)};text-decoration:underline;">'
            f"{html.escape(docs_url)}</a></p>"
        ),
        cta_label="Sign In to Sepurux",
        cta_url=f"{ui_url}/auth?mode=access&intent=login",
        preheader="You have a new Sepurux workspace invitation.",
        eyebrow="Workspace Invite",
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
            f'<p style="margin:0 0 12px;color:#223127;">This reset link expires in <strong>{expires_minutes} minutes</strong>.</p>'
            '<p style="margin:0;color:#5f6d63;">If you did not request this, you can safely ignore this email.</p>'
        ),
        cta_label="Reset Password",
        cta_url=reset_url,
        preheader="Reset your Sepurux password.",
        eyebrow="Account Security",
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
            '<p style="margin:0;color:#223127;">If this was not you, contact support immediately and rotate '
            'your API keys.</p>'
        ),
        preheader="Your Sepurux password was changed.",
        eyebrow="Account Security",
    )
    return send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_waitlist_approval_email(
    *,
    to_email: str,
    company_name: str | None = None,
    role: str | None = None,
) -> bool:
    docs_url = f"{_docs_url()}/getting-started"
    company_label = _clean_optional_text(company_name)
    role_label = _clean_optional_text(role)

    subtitle = "Your Sepurux early-access request has been approved."
    intro_line = "We approved your waitlist request and will help you get your first reliability workflow live."

    detail_lines = []
    if company_label:
        detail_lines.append(
            f'<p style="margin:0 0 10px;color:#223127;"><strong>Company:</strong> {html.escape(company_label)}</p>'
        )
    if role_label:
        detail_lines.append(
            f'<p style="margin:0 0 14px;color:#223127;"><strong>Role:</strong> {html.escape(role_label)}</p>'
        )

    body_html = "".join(detail_lines) + (
        '<p style="margin:0 0 14px;color:#223127;">Your request is now in the approved cohort. '
        "We will follow up with onboarding and workspace access guidance shortly.</p>"
        '<p style="margin:0;color:#5f6d63;">If you want to prepare ahead of time, review the getting-started guide and reply to this email with the workflow you want to validate first.</p>'
    )

    subject = "You’re approved for Sepurux early access"
    text_lines = [
        "Your Sepurux early-access request has been approved.",
        "",
    ]
    if company_label:
        text_lines.append(f"Company: {company_label}")
    if role_label:
        text_lines.append(f"Role: {role_label}")
    if company_label or role_label:
        text_lines.append("")
    text_lines.extend(
        [
            "You are now in the approved cohort.",
            "We will follow up with onboarding and workspace access guidance shortly.",
            "",
            f"Getting started: {docs_url}",
            f"Reply for help: {_support_email()}",
        ]
    )

    html_body = _email_layout(
        title="Early Access Approved",
        subtitle=subtitle,
        intro_line=intro_line,
        body_html=body_html,
        cta_label="Review Getting Started",
        cta_url=docs_url,
        preheader="Your Sepurux early-access request is approved.",
        eyebrow="Early Access",
    )
    return send_email(
        to_email=to_email,
        subject=subject,
        text_body="\n".join(text_lines),
        html_body=html_body,
    )

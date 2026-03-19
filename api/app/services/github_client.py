from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any
from uuid import UUID

import httpx
from app.models import GitHubIntegration
from sqlalchemy import select
from sqlalchemy.orm import Session

GITHUB_API_BASE_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"
GITHUB_STATUS_CONTEXT = "Sepurux AI Reliability"
GITHUB_TIMEOUT_SECONDS = 10.0


class GitHubClientError(Exception):
    pass


def resolve_github_access_token(
    db: Session,
    *,
    user_id: UUID | None,
    repo: str,
) -> str | None:
    if user_id is None:
        return None

    normalized_repo = _normalize_repo(repo)
    records = list(
        db.scalars(
            select(GitHubIntegration)
            .where(GitHubIntegration.user_id == user_id)
            .order_by(GitHubIntegration.created_at.desc())
        )
    )
    for record in records:
        if _normalize_repo(record.repo) == normalized_repo and record.access_token.strip():
            return record.access_token
    return None


def format_pr_comment(result: Mapping[str, Any]) -> str:
    score_value = _as_float(result.get("score"), default=0.0)
    score = 0.0 if score_value is None else score_value
    threshold = _as_float(result.get("threshold"), default=None)
    dashboard_url = str(result.get("dashboard_url") or "").strip()
    failures = _normalize_failures(result.get("failures"))

    lines = [
        "## 🤖 Sepurux AI Reliability Report",
        "",
        f"Reliability Score: {score:.1f}%",
        "",
        "Failures:",
        *[f"- {failure}" for failure in failures],
    ]

    if threshold is not None and score < threshold:
        lines.extend(
            [
                "",
                "⚠️ This PR reduces AI reliability",
            ]
        )

    lines.extend(
        [
            "",
            "Link:",
            dashboard_url or "N/A",
        ]
    )
    return "\n".join(lines)


def post_pr_comment(
    repo: str,
    pr_number: int,
    body: str,
    *,
    access_token: str | None = None,
) -> dict[str, Any]:
    owner, repo_name = _parse_repo(repo)
    token = _resolve_token(access_token)
    response = httpx.post(
        f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo_name}/issues/{pr_number}/comments",
        headers=_github_headers(token),
        json={"body": body},
        timeout=GITHUB_TIMEOUT_SECONDS,
    )
    payload = _safe_json_object(response)
    if response.status_code >= 400:
        raise GitHubClientError(_error_message("Failed to post PR comment", response, payload))
    return payload


def set_pr_status(
    repo: str,
    pr_number: int,
    *,
    passed: bool,
    description: str,
    target_url: str,
    access_token: str | None = None,
) -> dict[str, Any]:
    owner, repo_name = _parse_repo(repo)
    token = _resolve_token(access_token)
    pr_payload = _get_pull_request(owner, repo_name, pr_number, token=token)
    head_sha = _pull_request_head_sha(pr_payload)
    state = "success" if passed else "failure"

    response = httpx.post(
        f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo_name}/statuses/{head_sha}",
        headers=_github_headers(token),
        json={
            "state": state,
            "context": GITHUB_STATUS_CONTEXT,
            "description": description[:140],
            "target_url": target_url,
        },
        timeout=GITHUB_TIMEOUT_SECONDS,
    )
    payload = _safe_json_object(response)
    if response.status_code >= 400:
        raise GitHubClientError(_error_message("Failed to set PR status", response, payload))
    return payload


def _get_pull_request(owner: str, repo_name: str, pr_number: int, *, token: str) -> dict[str, Any]:
    response = httpx.get(
        f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo_name}/pulls/{pr_number}",
        headers=_github_headers(token),
        timeout=GITHUB_TIMEOUT_SECONDS,
    )
    payload = _safe_json_object(response)
    if response.status_code >= 400:
        raise GitHubClientError(_error_message("Failed to read PR details", response, payload))
    return payload


def _pull_request_head_sha(payload: Mapping[str, Any]) -> str:
    head = payload.get("head")
    if not isinstance(head, Mapping):
        raise GitHubClientError("PR payload did not include a head commit SHA")
    sha = head.get("sha")
    if not isinstance(sha, str) or not sha.strip():
        raise GitHubClientError("PR payload did not include a valid head SHA")
    return sha


def _parse_repo(repo: str) -> tuple[str, str]:
    normalized = _normalize_repo(repo)
    parts = normalized.split("/", maxsplit=1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise GitHubClientError("repo must be in 'owner/repo' format")
    return parts[0], parts[1]


def _normalize_repo(repo: str) -> str:
    cleaned = (repo or "").strip()
    if cleaned.startswith("https://github.com/"):
        cleaned = cleaned[len("https://github.com/") :]
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    return cleaned.strip("/")


def _resolve_token(access_token: str | None) -> str:
    token = (access_token or os.getenv("GITHUB_TOKEN") or "").strip()
    if not token:
        raise GitHubClientError("GITHUB_TOKEN is not set and no integration token was provided")
    return token


def _github_headers(token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }


def _normalize_failures(raw_failures: Any) -> list[str]:
    if not isinstance(raw_failures, list):
        return ["No major failures detected."]

    failures: list[str] = []
    for item in raw_failures:
        if isinstance(item, str) and item.strip():
            failures.append(item.strip())
            continue
        if isinstance(item, Mapping):
            tool = item.get("tool")
            count = item.get("count")
            if isinstance(tool, str) and tool.strip():
                if isinstance(count, int) and count > 1:
                    failures.append(f"{tool.strip()} ({count} failures)")
                else:
                    failures.append(tool.strip())

    return failures if failures else ["No major failures detected."]


def _as_float(value: Any, *, default: float | None) -> float | None:
    if isinstance(value, bool):
        return default
    if isinstance(value, int | float):
        return float(value)
    return default


def _safe_json_object(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except ValueError:
        return {}
    if isinstance(payload, dict):
        return payload
    return {}


def _error_message(prefix: str, response: httpx.Response, payload: Mapping[str, Any]) -> str:
    message = payload.get("message")
    if isinstance(message, str) and message.strip():
        return f"{prefix}: {message}"
    return f"{prefix} (status={response.status_code})"

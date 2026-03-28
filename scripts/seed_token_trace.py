#!/usr/bin/env python3
"""Seed a CI/CD release-pipeline trace with token-expiry failures.

Run from the api/ directory:
    python ../scripts/seed_token_trace.py
    python ../scripts/seed_token_trace.py --project <uuid>
"""
from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select

sys.path.insert(0, ".")

from app.db import SessionLocal
from app.models import Project, Trace


def _ts(base: datetime, offset_seconds: int) -> str:
    return (base + timedelta(seconds=offset_seconds)).isoformat() + "Z"


def build_payload(now: datetime) -> dict:
    t = now - timedelta(minutes=5)
    return {
        "trace_version": "0.1",
        "source": "sdk",
        "task": {
            "name": "ci_release_pipeline",
            "input": {
                "version": "v2.5.0",
                "branch": "release/2.5.0",
                "environment": "staging",
            },
        },
        "events": [
            # ── Planner ──────────────────────────────────────────────────────
            {
                "type": "llm_call",
                "name": "planner",
                "input": {"prompt": "Initiate release v2.5.0 to staging"},
                "output": {"plan": ["get_commit", "create_draft", "push_image", "deploy_k8s"]},
                "latency_ms": 340,
                "timestamp": _ts(t, 0),
                "index": 0,
            },
            # ── Step 1: Get latest commit — SUCCESS ───────────────────────
            {
                "type": "tool_call",
                "tool": "github.get_latest_commit",
                "args": {"repo": "acme/backend", "branch": "release/2.5.0"},
                "timestamp": _ts(t, 1),
                "index": 1,
            },
            {
                "type": "tool_result",
                "tool": "github.get_latest_commit",
                "result": {
                    "ok": True,
                    "sha": "a3f8c12d",
                    "message": "chore: bump version to 2.5.0",
                    "author": "ci-bot",
                },
                "timestamp": _ts(t, 2),
                "index": 2,
            },
            # ── Step 2: Create GitHub release draft — SUCCESS ─────────────
            {
                "type": "tool_call",
                "tool": "github.create_release_draft",
                "args": {"tag": "v2.5.0", "name": "Release v2.5.0", "draft": True},
                "timestamp": _ts(t, 3),
                "index": 3,
            },
            {
                "type": "tool_result",
                "tool": "github.create_release_draft",
                "result": {
                    "ok": True,
                    "release_id": 98765432,
                    "url": "https://github.com/acme/backend/releases/98765432",
                },
                "timestamp": _ts(t, 4),
                "index": 4,
            },
            # ── Step 3: Get AWS ECR login token — TOKEN EXPIRED ───────────
            {
                "type": "tool_call",
                "tool": "aws.ecr_get_login_token",
                "args": {
                    "region": "us-east-1",
                    "registry": "123456789.dkr.ecr.us-east-1.amazonaws.com",
                },
                "timestamp": _ts(t, 5),
                "index": 5,
            },
            {
                "type": "tool_result",
                "tool": "aws.ecr_get_login_token",
                "result": {
                    "ok": False,
                    "error": "ExpiredTokenException",
                    "message": "The security token included in the request is expired",
                    "code": 401,
                    "request_id": "4f3a2b1c-abcd-1234-ef56-789012345678",
                },
                "timestamp": _ts(t, 6),
                "index": 6,
            },
            # ── Step 4: STS AssumeRole for fresh credentials — ALSO EXPIRED
            {
                "type": "tool_call",
                "tool": "aws.sts_assume_role",
                "args": {
                    "role_arn": "arn:aws:iam::123456789:role/ci-deploy-role",
                    "session_name": "ci-release-v2.5.0",
                },
                "timestamp": _ts(t, 8),
                "index": 7,
            },
            {
                "type": "tool_result",
                "tool": "aws.sts_assume_role",
                "result": {
                    "ok": False,
                    "error": "ExpiredTokenException",
                    "message": "Token is expired: AssumeRoleWithWebIdentity — OIDC provider token has expired",
                    "code": 403,
                },
                "timestamp": _ts(t, 9),
                "index": 8,
            },
            # ── Step 5: Vault read credentials — VAULT TOKEN REVOKED ──────
            {
                "type": "tool_call",
                "tool": "vault.read_secret",
                "args": {
                    "path": "secret/ci/aws-deploy-credentials",
                    "key": "access_token",
                },
                "timestamp": _ts(t, 11),
                "index": 9,
            },
            {
                "type": "tool_result",
                "tool": "vault.read_secret",
                "result": {
                    "ok": False,
                    "error": "permission_denied",
                    "message": "permission denied — Vault token has expired or been revoked. Run: vault login",
                    "code": 403,
                },
                "timestamp": _ts(t, 12),
                "index": 10,
            },
            # ── Step 6: Vault AppRole auth fallback — SECRET_ID EXPIRED ───
            {
                "type": "tool_call",
                "tool": "vault.auth_approle",
                "args": {"role_id": "ci-deploy-role-id", "secret_id": "<redacted>"},
                "timestamp": _ts(t, 13),
                "index": 11,
            },
            {
                "type": "tool_result",
                "tool": "vault.auth_approle",
                "result": {
                    "ok": False,
                    "error": "invalid_role_or_secret",
                    "message": "AppRole secret_id is expired or the role has been deleted",
                    "code": 400,
                },
                "timestamp": _ts(t, 14),
                "index": 12,
            },
            # ── Step 7: Mark release draft as failed on GitHub — SUCCESS ──
            {
                "type": "tool_call",
                "tool": "github.update_release_draft",
                "args": {
                    "release_id": 98765432,
                    "body": "Release failed: credential rotation required before deployment",
                },
                "timestamp": _ts(t, 15),
                "index": 13,
            },
            {
                "type": "tool_result",
                "tool": "github.update_release_draft",
                "result": {"ok": True, "updated": True},
                "timestamp": _ts(t, 16),
                "index": 14,
            },
            # ── Final output ──────────────────────────────────────────────
            {
                "type": "agent_output",
                "name": "final",
                "output": {
                    "status": "failed",
                    "reason": "credential_rotation_required",
                    "message": (
                        "Release pipeline aborted: AWS ECR token expired, "
                        "Vault token revoked. Manual credential rotation required."
                    ),
                    "failed_tools": [
                        "aws.ecr_get_login_token",
                        "aws.sts_assume_role",
                        "vault.read_secret",
                        "vault.auth_approle",
                    ],
                },
                "timestamp": _ts(t, 17),
                "index": 15,
            },
        ],
    }


def seed(db, project_id: str | None = None) -> Trace:
    if project_id:
        project = db.scalar(select(Project).where(Project.project_id == UUID(project_id)))
    else:
        project = db.scalar(
            select(Project)
            .where(Project.name != "Sepurux Demo Project")
            .order_by(Project.created_at.asc())
        )

    if project is None:
        raise SystemExit("No project found. Pass --project <uuid> or create a project first.")

    now = datetime.now(UTC)
    trace = Trace(
        trace_id=uuid4(),
        project_id=project.project_id,
        source="sdk",
        trace_version="0.1",
        sdk_meta="seed-script/1.0",
        validation_status="valid",
        validation_errors=None,
        normalized_payload=build_payload(now),
        s3_key=f"traces/token-failure-{uuid4().hex}.json",
        created_at=now,
    )
    db.add(trace)
    db.commit()
    return trace


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a token-failure release-pipeline trace")
    parser.add_argument("--project", help="Project UUID (defaults to first non-demo project)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        trace = seed(db, project_id=args.project)
    finally:
        db.close()

    print(f"trace_id  : {trace.trace_id}")
    print(f"project   : {trace.project_id}")
    print(f"scenario  : CI/CD release pipeline — credential / token expiry failures")
    print(f"tools     : github.get_latest_commit, github.create_release_draft,")
    print(f"            aws.ecr_get_login_token (expired), aws.sts_assume_role (expired),")
    print(f"            vault.read_secret (revoked), vault.auth_approle (expired secret_id),")
    print(f"            github.update_release_draft")


if __name__ == "__main__":
    main()

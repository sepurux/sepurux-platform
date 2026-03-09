from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session

from db import get_session

DEMO_PROJECT_NAME = "Sepurux Demo Project"


def _execute_rowcount(db: Session, sql: str, params: Mapping[str, Any]) -> int:
    result = db.execute(text(sql), params)
    cursor_result = result if isinstance(result, CursorResult) else None
    return int((cursor_result.rowcount if cursor_result is not None else 0) or 0)


def demo_reset_worker() -> Mapping[str, Any]:
    """Reset demo tenant data and counters.

    Intended to be scheduled by cron/RQ scheduler every hour.
    """

    with get_session() as db:
        project_id = db.execute(
            text("SELECT project_id FROM projects WHERE name = :name LIMIT 1"),
            {"name": DEMO_PROJECT_NAME},
        ).scalar()
        if project_id is None:
            return {
                "ok": True,
                "project_found": False,
                "reset_at": datetime.now(UTC).isoformat(),
            }

        deleted_security = _execute_rowcount(
            db,
            """
            DELETE FROM security_events
            WHERE run_id IN (SELECT run_id FROM runs WHERE project_id = :project_id)
            """,
            {"project_id": project_id},
        )
        deleted_policy = _execute_rowcount(
            db,
            """
            DELETE FROM policy_events
            WHERE run_id IN (SELECT run_id FROM runs WHERE project_id = :project_id)
            """,
            {"project_id": project_id},
        )
        deleted_counterfactuals = _execute_rowcount(
            db,
            "DELETE FROM counterfactuals WHERE project_id = :project_id",
            {"project_id": project_id},
        )
        deleted_attempts = _execute_rowcount(
            db,
            "DELETE FROM replay_attempts WHERE project_id = :project_id",
            {"project_id": project_id},
        )
        deleted_runs = _execute_rowcount(
            db,
            "DELETE FROM runs WHERE project_id = :project_id",
            {"project_id": project_id},
        )
        deleted_traces = _execute_rowcount(
            db,
            "DELETE FROM traces WHERE project_id = :project_id",
            {"project_id": project_id},
        )
        reset_campaigns = _execute_rowcount(
            db,
            "UPDATE campaigns SET status = 'ready' WHERE project_id = :project_id",
            {"project_id": project_id},
        )
        reset_api_keys = _execute_rowcount(
            db,
            """
            UPDATE api_keys
            SET request_count_window = 0,
                window_started_at = NULL
            WHERE project_id = :project_id
              AND is_demo = true
            """,
            {"project_id": project_id},
        )
        db.commit()

    return {
        "ok": True,
        "project_found": True,
        "project_id": str(project_id),
        "deleted_traces": deleted_traces,
        "deleted_runs": deleted_runs,
        "deleted_attempts": deleted_attempts,
        "deleted_counterfactuals": deleted_counterfactuals,
        "deleted_policy_events": deleted_policy,
        "deleted_security_events": deleted_security,
        "reset_campaigns": reset_campaigns,
        "reset_api_keys": reset_api_keys,
        "reset_at": datetime.now(UTC).isoformat(),
    }

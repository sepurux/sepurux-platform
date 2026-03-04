from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import (
    Base,
    Campaign,
    HardeningTemplate,
    ReplayAttempt,
    Run,
    RunTemplateLink,
    Trace,
)


@pytest.fixture()
def worker_db_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[sessionmaker[Session], dict[str, dict[str, object]]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    artifacts: dict[str, dict[str, object]] = {}

    monkeypatch.setattr(worker_module, "get_session", lambda: testing_session_local())
    monkeypatch.setattr(
        worker_module, "put_json_object", lambda key, payload: artifacts.__setitem__(key, payload)
    )
    monkeypatch.setattr(worker_module, "run_counterfactual_replays", lambda **_kwargs: [])

    yield testing_session_local, artifacts

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_retry_policy_template_is_applied(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    template_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Retry Template Campaign",
                mutation_set=[
                    {
                        "mutation_id": "timeout-case",
                        "tool": "jira.create_issue",
                        "force_fail": True,
                        "failure_reason": "timeout",
                        "required_retries": 2,
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            HardeningTemplate(
                template_id=template_id,
                project_id=project_id,
                name="Timeout retry",
                type="retry_policy",
                config={"max_retries": 3, "backoff_ms": 300},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary=None,
            )
        )
        db.add(
            RunTemplateLink(
                run_id=run_id,
                template_id=template_id,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        attempt = db.execute(
            select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
        ).scalar_one()
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert attempt.result == "passed"
    assert attempt.failure_reason is None

    summary = run.summary or {}
    assert summary.get("applied_template_count") == 1
    applied_templates = summary.get("applied_templates")
    assert isinstance(applied_templates, list)
    assert applied_templates and applied_templates[0]["template_id"] == str(template_id)

    assert artifacts
    artifact = next(iter(artifacts.values()))
    events = artifact.get("events")
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    replay_result = tool_results[-1].get("result")
    assert isinstance(replay_result, dict)
    assert replay_result.get("retries") == 2

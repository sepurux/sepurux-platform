from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import Base, Campaign, MutationPack, ReplayAttempt, Run, Trace


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


def test_execute_run_with_mutation_pack_persists_seed_and_trace(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    mutation_pack_id = uuid4()
    run_id = uuid4()

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
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="Schema Chaos",
                description="Rename status to state",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "rename-status",
                            "type": "schema.rename_field",
                            "target": {"tool": "jira.*"},
                            "params": {"from": "status", "to": "state"},
                            "probability": 1.0,
                            "weight": 1.0,
                        }
                    ],
                },
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                mutation_pack_id=mutation_pack_id,
                name="Mutation Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["status"]},
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
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        attempt = db.execute(
            select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
        ).scalar_one()
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert attempt.result == "passed"
    assert attempt.seed is not None
    assert isinstance(attempt.mutation_trace, dict)
    assert attempt.mutation_trace.get("seed") == attempt.seed
    applied = attempt.mutation_trace.get("applied")
    assert isinstance(applied, list)
    assert applied and applied[0]["mutation_id"] == "rename-status"

    assert run.status == "completed"
    assert isinstance(run.summary, dict)
    assert run.summary.get("attempt_count") == 1

    assert artifacts
    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    result = tool_results[-1].get("result")
    assert isinstance(result, dict)
    assert result.get("state") == "replayed"

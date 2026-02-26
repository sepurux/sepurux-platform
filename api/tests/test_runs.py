from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, Run, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def run_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], FakeQueue, UUID], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, api_key_plaintext = seed_tenant_project_and_key(db)

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.services.run_service.get_run_queue", lambda: fake_queue)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.auth_session_factory = testing_session_local

    with TestClient(app) as client:
        client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
        yield client, testing_session_local, fake_queue, project_id

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def seed_trace_and_campaign(db: Session, *, project_id: UUID) -> tuple[UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
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
            name="Seed Campaign",
            mutation_set=[{"type": "noop"}],
            eval_set={"checks": ["status"]},
        )
    )
    db.commit()
    return trace_id, campaign_id


def test_post_run_queues_job_and_persists_queued_status(
    run_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    client, testing_session_local, fake_queue, project_id = run_test_context

    with testing_session_local() as db:
        trace_id, campaign_id = seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/runs", json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)}
    )

    assert response.status_code == 201
    data = response.json()
    run_id = UUID(data["run_id"])
    assert data["trace_id"] == str(trace_id)
    assert data["campaign_id"] == str(campaign_id)
    assert data["status"] == "queued"
    assert data["summary"] is None
    assert fake_queue.calls == [(("worker.execute_run", str(run_id)), {})]

    with testing_session_local() as db:
        row = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        assert row.project_id == project_id
        assert row.status == "queued"
        assert row.trace_id == trace_id
        assert row.campaign_id == campaign_id


def test_get_run_and_list_runs(
    run_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    client, testing_session_local, _, project_id = run_test_context
    trace_id = uuid4()
    campaign_id = uuid4()
    older = uuid4()
    newer = uuid4()

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
                name="Campaign A",
                mutation_set=[],
                eval_set=[],
            )
        )
        db.add(
            Run(
                run_id=older,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="done",
                summary={"score": 1},
                created_at=datetime(2026, 2, 24, 20, 0, tzinfo=UTC),
            )
        )
        db.add(
            Run(
                run_id=newer,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary=None,
                created_at=datetime(2026, 2, 24, 20, 1, tzinfo=UTC),
            )
        )
        db.commit()

    get_response = client.get(f"/v1/runs/{older}")
    assert get_response.status_code == 200
    get_payload = get_response.json()
    assert get_payload["run_id"] == str(older)
    assert get_payload["status"] == "done"
    assert get_payload["summary"] == {"score": 1}

    list_response = client.get("/v1/runs")
    assert list_response.status_code == 200
    items = list_response.json()
    assert [item["run_id"] for item in items] == [str(newer), str(older)]


def test_post_run_returns_404_when_related_records_missing(
    run_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    client, _, fake_queue, _ = run_test_context

    response = client.post("/v1/runs", json={"trace_id": str(uuid4()), "campaign_id": str(uuid4())})

    assert response.status_code == 404
    assert response.json() == {"detail": "Trace not found"}
    assert fake_queue.calls == []

from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, Project, Trace
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
def webhook_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], UUID, FakeQueue], None, None]:
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
        yield client, testing_session_local, project_id, fake_queue

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_webhook_crud_and_rotate_secret(
    webhook_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = webhook_test_context

    create_response = client.post(
        "/v1/webhooks",
        json={
            "url": "https://example.com/hooks/sepurux",
            "events": ["run.completed"],
            "is_enabled": True,
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    webhook_id = created["webhook_id"]
    first_secret = created["secret"]
    assert first_secret.startswith("whsec_")

    list_response = client.get("/v1/webhooks")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["webhook_id"] == webhook_id
    assert listed[0]["url"] == "https://example.com/hooks/sepurux"

    patch_response = client.patch(
        f"/v1/webhooks/{webhook_id}",
        json={
            "url": "https://example.com/hooks/new",
            "events": ["run.completed", "ci.decision.pass"],
            "is_enabled": False,
        },
    )
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["url"] == "https://example.com/hooks/new"
    assert patched["events"] == ["run.completed", "ci.decision.pass"]
    assert patched["is_enabled"] is False

    rotate_response = client.post(f"/v1/webhooks/{webhook_id}/rotate-secret")
    assert rotate_response.status_code == 200
    rotated = rotate_response.json()
    assert rotated["webhook_id"] == webhook_id
    assert rotated["secret"].startswith("whsec_")
    assert rotated["secret"] != first_secret


def test_audit_events_endpoint_lists_and_filters(
    webhook_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, fake_queue = webhook_test_context
    trace_id = uuid4()
    campaign_id = uuid4()
    sibling_project_id = uuid4()

    with testing_session_local() as db:
        current_project = db.execute(
            select(Project).where(Project.project_id == project_id)
        ).scalar_one()
        db.add(
            Project(
                project_id=sibling_project_id,
                tenant_id=current_project.tenant_id,
                name="Sibling Project",
            )
        )
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
                name="Webhook Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.commit()

    run_response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )
    assert run_response.status_code == 201
    assert len(fake_queue.calls) == 1

    all_events_response = client.get("/v1/audit-events?limit=50&offset=0")
    assert all_events_response.status_code == 200
    all_events = all_events_response.json()
    assert any(item["event_type"] == "run.created" for item in all_events)
    assert all(item["project_id"] == str(project_id) for item in all_events)

    filtered_response = client.get("/v1/audit-events?event_type=run.created&limit=10&offset=0")
    assert filtered_response.status_code == 200
    filtered = filtered_response.json()
    assert len(filtered) == 1
    assert filtered[0]["event_type"] == "run.created"
    assert filtered[0]["metadata"]["run_id"] == run_response.json()["run_id"]

from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import (
    Base,
    Campaign,
    HardeningTemplate,
    Run,
    RunTemplateLink,
    Trace,
)
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
def templates_test_context(
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


def _seed_trace_campaign_run(db: Session, *, project_id: UUID) -> tuple[UUID, UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()

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
            name="Template Campaign",
            mutation_set=[{"mutation_id": "baseline", "tool": "jira.create_issue"}],
            eval_set={"checks": ["status"]},
        )
    )
    db.add(
        Run(
            run_id=run_id,
            project_id=project_id,
            trace_id=trace_id,
            campaign_id=campaign_id,
            status="completed",
            summary={"attempt_count": 1},
        )
    )
    db.commit()
    return trace_id, campaign_id, run_id


def test_template_crud_endpoints(
    templates_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    client, _, _, _ = templates_test_context

    create_response = client.post(
        "/v1/templates",
        json={
            "name": "Retry template",
            "type": "retry_policy",
            "config": {"max_retries": 3, "backoff_ms": 250},
        },
    )

    assert create_response.status_code == 201
    template_payload = create_response.json()
    template_id = template_payload["template_id"]
    assert template_payload["name"] == "Retry template"
    assert template_payload["type"] == "retry_policy"

    list_response = client.get("/v1/templates")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert any(item["template_id"] == template_id for item in listed)

    get_response = client.get(f"/v1/templates/{template_id}")
    assert get_response.status_code == 200
    by_id = get_response.json()
    assert by_id["template_id"] == template_id


def test_apply_template_creates_new_run_and_enqueues(
    templates_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    client, testing_session_local, fake_queue, project_id = templates_test_context

    with testing_session_local() as db:
        trace_id, campaign_id, source_run_id = _seed_trace_campaign_run(db, project_id=project_id)

        inherited_template = HardeningTemplate(
            template_id=uuid4(),
            project_id=project_id,
            name="Inherited sanitizer",
            type="sanitizer",
            config={"patterns": ["ignore previous instructions"]},
        )
        selected_template = HardeningTemplate(
            template_id=uuid4(),
            project_id=project_id,
            name="Apply retry",
            type="retry_policy",
            config={"max_retries": 3, "backoff_ms": 300},
        )
        db.add_all([inherited_template, selected_template])
        db.flush()
        db.add(
            RunTemplateLink(
                run_id=source_run_id,
                template_id=inherited_template.template_id,
            )
        )
        db.commit()

        inherited_template_id = inherited_template.template_id
        selected_template_id = selected_template.template_id

    response = client.post(f"/v1/runs/{source_run_id}/apply-template/{selected_template_id}")

    assert response.status_code == 201
    payload = response.json()
    new_run_id = UUID(payload["new_run_id"])
    assert new_run_id != source_run_id
    assert fake_queue.calls == [(("worker.execute_run", str(new_run_id)), {})]

    with testing_session_local() as db:
        new_run = db.execute(select(Run).where(Run.run_id == new_run_id)).scalar_one()
        assert new_run.project_id == project_id
        assert new_run.trace_id == trace_id
        assert new_run.campaign_id == campaign_id
        assert new_run.status == "queued"

        summary = new_run.summary or {}
        template_application = summary.get("template_application")
        assert isinstance(template_application, dict)
        assert template_application.get("source_run_id") == str(source_run_id)

        linked_ids = {
            row.template_id
            for row in db.scalars(
                select(RunTemplateLink).where(RunTemplateLink.run_id == new_run_id)
            )
        }
        assert linked_ids == {inherited_template_id, selected_template_id}

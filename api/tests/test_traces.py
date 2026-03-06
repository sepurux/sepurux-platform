from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def trace_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], dict[str, object]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, api_key_plaintext = seed_tenant_project_and_key(db)

    uploads: dict[str, object] = {}

    def fake_put_json_object(key: str, payload: object) -> None:
        uploads[key] = payload

    def fake_get_json_object(key: str, *, max_bytes: int = 1_000_000) -> object:
        del max_bytes
        return uploads[key]

    monkeypatch.setattr("app.services.trace_intake.put_json_object", fake_put_json_object)
    monkeypatch.setattr("app.services.trace_intake.get_json_object", fake_get_json_object)

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
        yield client, testing_session_local, uploads

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_post_trace_accepts_any_json_and_persists_metadata(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, uploads = trace_test_context
    payload = [{"event": "crash"}, {"nested": {"ok": True}}]

    response = client.post("/v1/traces", json=payload)

    assert response.status_code == 201
    data = response.json()
    trace_id = UUID(data["trace_id"])
    assert data["source"] == "api"
    assert data["s3_key"] == f"traces/{trace_id}.json"
    assert data["created_at"]
    assert uploads == {data["s3_key"]: payload}

    with testing_session_local() as db:
        row = db.execute(select(Trace).where(Trace.trace_id == trace_id)).scalar_one()
        assert row.project_id is not None
        assert row.source == "api"
        assert row.s3_key == data["s3_key"]


def test_get_trace_returns_metadata(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    create_response = client.post("/v1/traces", json={"foo": "bar"})
    trace_id = create_response.json()["trace_id"]

    response = client.get(f"/v1/traces/{trace_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["trace_id"] == trace_id
    assert data["source"] == "api"
    assert data["s3_key"] == f"traces/{trace_id}.json"
    assert data["payload"] is None


def test_get_trace_with_payload_returns_raw_json(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    payload = {"event": "trace.preview", "args": {"ok": True}}
    create_response = client.post("/v1/traces", json=payload)
    trace_id = create_response.json()["trace_id"]

    response = client.get(f"/v1/traces/{trace_id}?include_payload=true")

    assert response.status_code == 200
    data = response.json()
    assert data["trace_id"] == trace_id
    assert data["payload"] == payload


def test_list_traces_returns_recent_first(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    first = client.post("/v1/traces", json={"event": "one"})
    second = client.post("/v1/traces", json={"event": "two"})
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get("/v1/traces?limit=10&offset=0")

    assert response.status_code == 200
    records = response.json()
    ids = [item["trace_id"] for item in records]
    assert first.json()["trace_id"] in ids
    assert second.json()["trace_id"] in ids


def test_get_trace_returns_404_when_missing(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context

    response = client.get(f"/v1/traces/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Trace not found"}

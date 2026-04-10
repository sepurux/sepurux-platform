from __future__ import annotations

from collections.abc import Generator
from uuid import UUID

import pytest
from app.db import get_db
from app.main import app
from app.models import Base
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


@pytest.fixture()
def support_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID], None, None]:
    _ = monkeypatch
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        tenant_id, project_id, user_id, _, api_key_plaintext = seed_project_membership_api_key(
            db, role_name="developer"
        )

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
        yield client, testing_session_local, tenant_id, project_id, user_id

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_bug_report_submission_notifies_support(
    support_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _session_factory, _tenant_id, _project_id, _user_id = support_test_context

    captured: dict[str, object] = {}

    def fake_send_bug_report_notification(**kwargs):
        captured.update(kwargs)
        return True

    monkeypatch.setattr(
        "app.routes.support.send_bug_report_notification",
        fake_send_bug_report_notification,
    )

    response = client.post(
        "/v1/support/bug-reports",
        json={
            "category": "platform",
            "title": "Notifications panel overlaps footer",
            "description": "The notification panel clips into the sidebar footer after opening.",
            "page_url": "https://app.sepurux.dev/traces",
            "reported_at": "2026-04-09T21:05:00Z",
            "viewport_width": 1800,
            "viewport_height": 1040,
            "screenshot_data_url": "data:image/png;base64,ZmFrZQ==",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Bug report submitted."}
    assert captured["category"] == "platform"
    assert captured["title"] == "Notifications panel overlaps footer"
    assert captured["viewport_width"] == 1800
    assert captured["viewport_height"] == 1040
    assert captured["screenshot_data_url"] == "data:image/png;base64,ZmFrZQ=="


def test_bug_report_submission_returns_503_when_delivery_fails(
    support_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _session_factory, _tenant_id, _project_id, _user_id = support_test_context

    monkeypatch.setattr(
        "app.routes.support.send_bug_report_notification",
        lambda **_kwargs: False,
    )

    response = client.post(
        "/v1/support/bug-reports",
        json={
            "category": "task",
            "title": "Run page feels stuck",
            "description": "The run page looks like it is loading forever after refresh.",
            "page_url": "https://app.sepurux.dev/runs",
            "reported_at": "2026-04-09T21:05:00Z",
            "viewport_width": 1440,
            "viewport_height": 900,
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Bug report delivery is unavailable right now. Please try again shortly."
    }

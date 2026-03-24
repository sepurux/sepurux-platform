from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, UserNotification
from app.services.notification_service import create_notification
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


@pytest.fixture()
def notification_test_context(
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


def test_get_notifications_returns_inbox_and_unread_count(
    notification_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID],
) -> None:
    client, testing_session_local, tenant_id, project_id, user_id = notification_test_context

    with testing_session_local() as db:
        create_notification(
            db,
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=user_id,
            event_type="run.queued",
            title="Run queued",
            message="Run is waiting for execution.",
            link_url="/runs/abc",
        )
        create_notification(
            db,
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=None,
            event_type="billing.low_credit",
            severity="warning",
            title="Credits are low",
            message="Top up to avoid skipped jobs.",
            link_url="/billing",
        )

    response = client.get("/v1/notifications")
    assert response.status_code == 200
    payload = response.json()
    assert payload["unread_count"] == 2
    assert len(payload["items"]) == 2
    assert {item["event_type"] for item in payload["items"]} == {
        "run.queued",
        "billing.low_credit",
    }


def test_mark_notification_read_updates_state(
    notification_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID],
) -> None:
    client, testing_session_local, tenant_id, project_id, user_id = notification_test_context

    with testing_session_local() as db:
        notification = create_notification(
            db,
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=user_id,
            event_type="campaign.created",
            title="Campaign created",
            message="Campaign is ready.",
            link_url="/campaigns",
        )
        notification_id = notification.notification_id

    read_response = client.post(f"/v1/notifications/{notification_id}/read")
    assert read_response.status_code == 200
    assert read_response.json()["read_at"] is not None

    inbox_response = client.get("/v1/notifications")
    assert inbox_response.status_code == 200
    assert inbox_response.json()["unread_count"] == 0

    with testing_session_local() as db:
        row = db.scalar(
            select(UserNotification).where(UserNotification.notification_id == notification_id)
        )
        assert row is not None
        assert row.read_at is not None


def test_mark_all_notifications_read(
    notification_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID],
) -> None:
    client, testing_session_local, tenant_id, project_id, user_id = notification_test_context

    with testing_session_local() as db:
        first = create_notification(
            db,
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=user_id,
            event_type="run.queued",
            title="Run queued",
            message="Run 1 queued.",
        )
        second = create_notification(
            db,
            tenant_id=tenant_id,
            project_id=project_id,
            user_id=None,
            event_type="run.queued",
            title="Run queued",
            message="Run 2 queued.",
        )
        first.read_at = datetime.now(UTC)
        db.add(first)
        db.commit()
        _ = second

    read_all_response = client.post("/v1/notifications/read-all")
    assert read_all_response.status_code == 200
    assert read_all_response.json() == {"updated": 1}

    unread_response = client.get("/v1/notifications?unread_only=true")
    assert unread_response.status_code == 200
    unread_payload = unread_response.json()
    assert unread_payload["unread_count"] == 0
    assert unread_payload["items"] == []

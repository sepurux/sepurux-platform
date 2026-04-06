from __future__ import annotations

from collections.abc import Generator
from typing import Any
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, MutationPack, PolicyPack, ToolRegistry, Trace, TraceStep
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


def _valid_trace_payload(*, source: str = "sdk", trace_version: str = "0.1") -> dict[str, Any]:
    return {
        "trace_version": trace_version,
        "source": source,
        "task": {
            "name": "jira_sync",
            "input": {
                "repo": "acme/sepurux",
            },
        },
        "events": [
            {
                "type": "tool_call",
                "tool": "jira.create_issue",
                "args": {"title": "test"},
            },
            {
                "type": "tool_result",
                "tool": "jira.create_issue",
                "result": {"ok": True, "issue_id": "CRASH-123"},
            },
        ],
    }


def test_post_trace_accepts_valid_trace_and_persists_metadata(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, uploads = trace_test_context
    payload = _valid_trace_payload()

    response = client.post("/v1/traces", json=payload)

    assert response.status_code == 201
    data = response.json()
    trace_id = UUID(data["trace_id"])
    assert data["source"] == "sdk"
    assert data["trace_version"] == "0.1"
    assert data["task_name"] == "jira_sync"
    assert data["validation_status"] == "valid"
    assert data["sdk_meta"] is None
    assert data["s3_key"] == f"traces/{trace_id}.json"
    assert data["created_at"]
    assert uploads == {data["s3_key"]: payload}

    with testing_session_local() as db:
        row = db.execute(select(Trace).where(Trace.trace_id == trace_id)).scalar_one()
        assert row.project_id is not None
        assert row.source == "sdk"
        assert row.trace_version == "0.1"
        assert row.validation_status == "valid"
        assert row.sdk_meta is None
        assert isinstance(row.normalized_payload, dict)
        events = row.normalized_payload.get("events")
        assert isinstance(events, list)
        assert events[0]["index"] == 0
        assert isinstance(events[0]["timestamp"], str)
        assert events[1]["index"] == 1
        assert isinstance(events[1]["timestamp"], str)
        assert row.s3_key == data["s3_key"]
        trace_steps = list(
            db.scalars(
                select(TraceStep)
                .where(TraceStep.trace_id == trace_id)
                .order_by(TraceStep.started_at.asc())
            )
        )
        assert [step.step_type for step in trace_steps] == ["prompt", "tool_call"]
        assert trace_steps[1].step_name == "jira.create_issue"
        assert trace_steps[1].status == "success"
        assert trace_steps[1].output_payload == {"ok": True, "issue_id": "CRASH-123"}


def test_get_trace_returns_metadata(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    create_response = client.post("/v1/traces", json=_valid_trace_payload(source="python-sdk"))
    trace_id = create_response.json()["trace_id"]

    response = client.get(f"/v1/traces/{trace_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["trace_id"] == trace_id
    assert data["source"] == "python-sdk"
    assert data["trace_version"] == "0.1"
    assert data["task_name"] == "jira_sync"
    assert data["validation_status"] == "valid"
    assert data["s3_key"] == f"traces/{trace_id}.json"
    assert data["payload"] is None


def test_get_trace_with_payload_returns_raw_json(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    payload = {
        "trace_version": "0.2",
        "source": "go-sdk",
        "task": {"name": "deploy", "input": {"env": "prod"}},
        "events": [
            {"t": "tool_call", "name": "k8s.apply", "input": {"commit": "abc123"}},
            {"t": "tool_result", "name": "k8s.apply", "output": {"ok": True}},
        ],
    }
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
    first = client.post("/v1/traces", json=_valid_trace_payload(source="first"))
    second = client.post("/v1/traces", json=_valid_trace_payload(source="second"))
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


def test_get_trace_timeline_returns_ordered_steps(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    payload = {
        "trace_version": "0.2",
        "source": "sdk",
        "task": {
            "name": "customer_support_agent",
            "input": {"prompt": "Find the customer balance"},
        },
        "events": [
            {
                "type": "llm_call",
                "name": "planner",
                "input": {"prompt": "Plan the balance lookup"},
                "output": {"tool": "payments.get_balance"},
                "latency_ms": 220,
            },
            {
                "type": "tool_call",
                "tool": "payments.get_balance",
                "args": {"user_id": "u_123"},
            },
            {
                "type": "tool_result",
                "tool": "payments.get_balance",
                "result": {"ok": True, "balance": 42},
            },
            {
                "type": "agent_output",
                "name": "final",
                "output": {"message": "Balance is 42"},
            },
        ],
    }

    create_response = client.post("/v1/traces", json=payload)
    assert create_response.status_code == 201
    trace_id = create_response.json()["trace_id"]

    response = client.get(f"/v1/traces/{trace_id}/timeline")

    assert response.status_code == 200
    data = response.json()
    assert [item["step_type"] for item in data] == [
        "prompt",
        "llm_call",
        "tool_call",
        "agent_output",
    ]
    assert data[1]["latency_ms"] == 220
    assert data[2]["step_name"] == "payments.get_balance"
    assert data[2]["status"] == "success"
    assert data[2]["output_payload"] == {"ok": True, "balance": 42}


def test_post_trace_rejects_invalid_trace_with_structured_details(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, _, _ = trace_test_context
    payload = {
        "trace_version": "0.1",
        "source": "sdk",
        "task": {"name": "deploy"},
        "events": [
            {"type": "tool_call", "args": {"commit": "abc123"}},
            {"type": "tool_result", "tool": "deploy.apply"},
        ],
    }

    response = client.post("/v1/traces", json=payload)

    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "invalid_trace"
    details = data["details"]
    assert {"path": "events[0].tool", "message": "missing"} in details
    assert {"path": "events[1].result", "message": "missing"} in details


def test_post_trace_captures_sdk_header(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, _ = trace_test_context
    payload = _valid_trace_payload(source="py-sdk")
    headers = dict(client.headers)
    headers["X-Sepurux-SDK"] = "py/0.4.0"

    response = client.post("/v1/traces", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["sdk_meta"] == "py/0.4.0"

    trace_id = UUID(data["trace_id"])
    with testing_session_local() as db:
        row = db.execute(select(Trace).where(Trace.trace_id == trace_id)).scalar_one()
        assert row.sdk_meta == "py/0.4.0"


def test_post_trace_persists_upload_time_replay_profile(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, _ = trace_test_context
    payload = {
        "trace_version": "0.2",
        "source": "py-sdk",
        "task": {"name": "refund_customer"},
        "events": [
            {
                "type": "tool_call",
                "tool": "orders.lookup",
                "args": {"order_id": "ord_123"},
            },
            {
                "type": "tool_result",
                "tool": "orders.lookup",
                "result": {"order_id": "ord_123", "status": "paid"},
            },
            {
                "type": "tool_call",
                "tool": "payments.refund",
                "args": {"payment_id": "pay_123", "amount": 120},
            },
            {
                "type": "retry",
                "tool": "payments.refund",
                "result": {"attempt": 2, "backoff_ms": 900},
            },
            {
                "type": "tool_call",
                "tool": "payments.refund",
                "args": {"payment_id": "pay_123", "amount": 120, "retry_count": 1},
            },
            {
                "type": "tool_result",
                "tool": "payments.refund",
                "result": {"state": "succeeded", "refund_id": "rf_123"},
            },
            {
                "type": "agent_output",
                "name": "refund_normalized",
                "result": {"source_field": "state", "normalized_status": "succeeded"},
            },
            {
                "type": "tool_call",
                "tool": "notifications.send_email",
                "args": {"to": "user@example.com", "template": "refund"},
            },
        ],
    }

    response = client.post("/v1/traces", json=payload)

    assert response.status_code == 201
    trace_id = UUID(response.json()["trace_id"])

    with testing_session_local() as db:
        row = db.execute(select(Trace).where(Trace.trace_id == trace_id)).scalar_one()

    assert isinstance(row.normalized_payload, dict)
    sepurux = row.normalized_payload.get("sepurux")
    assert isinstance(sepurux, dict)
    replay_profile = sepurux.get("replay_profile")
    assert isinstance(replay_profile, dict)
    assert replay_profile["tool_inventory"] == [
        "orders.lookup",
        "payments.refund",
        "notifications.send_email",
    ]
    assert replay_profile["baseline_candidates"] == [
        {
            "mutation_id": "baseline.orders.lookup",
            "tool": "orders.lookup",
            "args": {"order_id": "ord_123"},
        },
        {
            "mutation_id": "baseline.payments.refund",
            "tool": "payments.refund",
            "args": {
                "payment_id": "pay_123",
                "amount": 120,
                "confirmation_token": "approved",
            },
        },
        {
            "mutation_id": "baseline.notifications.send_email",
            "tool": "notifications.send_email",
            "args": {
                "to": "user@example.com",
                "template": "refund",
                "confirmation_token": "approved",
            },
        },
    ]
    assert replay_profile["primary_mutation"] == {
        "mutation_id": "baseline.payments.refund",
        "tool": "payments.refund",
        "args": {
            "payment_id": "pay_123",
            "amount": 120,
            "confirmation_token": "approved",
        },
    }
    assert replay_profile["trace_hardening"] == {
        "retry_policy": {"max_retries": 1, "backoff_ms": 900},
        "schema_adapter": {"mappings": {"status": "state"}},
        "source": "trace_inference_v1",
    }


def test_post_trace_auto_bootstraps_policy_security_and_campaign_bundle(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, _ = trace_test_context
    payload = {
        "trace_version": "0.2",
        "source": "sdk",
        "task": {"name": "incident_agent"},
        "events": [
            {"type": "tool_call", "tool": "search_docs", "args": {"query": "timeout"}},
            {
                "type": "tool_result",
                "tool": "search_docs",
                "result": {"hits": ["Runbook A", "Runbook B"]},
            },
            {
                "type": "tool_call",
                "tool": "create_ticket",
                "args": {"title": "DB timeout incident"},
            },
            {
                "type": "tool_result",
                "tool": "create_ticket",
                "result": {"ticket_id": "TCK-1001", "status": "created"},
            },
            {
                "type": "tool_call",
                "tool": "send_slack",
                "args": {"channel": "#incident-room", "message": "ticket created"},
            },
            {
                "type": "tool_result",
                "tool": "send_slack",
                "result": {"message_id": "MSG-101", "status": "sent"},
            },
        ],
    }
    create_response = client.post("/v1/traces", json=payload)
    assert create_response.status_code == 201
    trace_id = create_response.json()["trace_id"]

    with testing_session_local() as db:
        tools = list(db.scalars(select(ToolRegistry)))
        assert len(tools) == 3
        assert all(tool.zone == "untrusted" for tool in tools)
        assert db.scalar(select(PolicyPack.policy_pack_id).where(PolicyPack.name == "trace.bootstrap.default"))
        campaigns = list(
            db.scalars(
                select(Campaign).where(
                    Campaign.name.in_(
                        [
                            "Bootstrap · Base Reliability",
                            "Bootstrap · Policy & Security",
                            "Bootstrap · Domain Pack",
                        ]
                    )
                )
            )
        )
        assert len(campaigns) == 3
        domain_pack = db.scalar(select(MutationPack).where(MutationPack.name == "trace.domain.default"))
        assert isinstance(domain_pack, MutationPack)

    bootstrap_response = client.post(f"/v1/traces/{trace_id}/bootstrap")
    assert bootstrap_response.status_code == 200
    data = bootstrap_response.json()
    assert data["trace_id"] == trace_id
    assert set(data["tools_discovered"]) == {"search_docs", "create_ticket", "send_slack"}
    assert data["tool_zones_created"] == 0
    assert data["tool_zones_updated"] == 0
    assert data["policy_pack_name"] == "trace.bootstrap.default"
    assert data["policy_pack_created"] is False
    assert {item["name"] for item in data["campaigns"]} == {
        "Bootstrap · Base Reliability",
        "Bootstrap · Policy & Security",
        "Bootstrap · Domain Pack",
    }
    assert all(item["created"] is False for item in data["campaigns"])

    idempotent_response = client.post(f"/v1/traces/{trace_id}/bootstrap")
    assert idempotent_response.status_code == 200
    idempotent = idempotent_response.json()
    assert idempotent["tool_zones_created"] == 0
    assert idempotent["tool_zones_updated"] == 0
    assert idempotent["policy_pack_created"] is False
    assert all(item["created"] is False for item in idempotent["campaigns"])


def test_auto_bootstrap_does_not_overwrite_existing_tool_zone(
    trace_test_context: tuple[TestClient, sessionmaker[Session], dict[str, object]],
) -> None:
    client, testing_session_local, _ = trace_test_context
    payload = {
        "trace_version": "0.2",
        "source": "sdk",
        "task": {"name": "agent"},
        "events": [
            {"type": "tool_call", "tool": "search_docs", "args": {"query": "billing"}},
            {"type": "tool_result", "tool": "search_docs", "result": {"hits": []}},
        ],
    }

    first = client.post("/v1/traces", json=payload)
    assert first.status_code == 201
    with testing_session_local() as db:
        tool = db.scalar(select(ToolRegistry).where(ToolRegistry.name == "search_docs"))
        assert isinstance(tool, ToolRegistry)
        tool.zone = "trusted"
        db.commit()

    second = client.post("/v1/traces", json=payload)
    assert second.status_code == 201
    with testing_session_local() as db:
        tool = db.scalar(select(ToolRegistry).where(ToolRegistry.name == "search_docs"))
        assert isinstance(tool, ToolRegistry)
        assert tool.zone == "trusted"

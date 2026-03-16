from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, CreditWallet, MutationPack
from app.mutation_packs.registry import (
    core_reliability,
    latency_chaos,
    prompt_security,
    tool_chaos,
)
from app.services.billing_service import ensure_user_billing
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def pack_credit_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, owner_id, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="starter",
        )

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.services.run_service.get_run_queue", lambda **kwargs: fake_queue)
    monkeypatch.setattr("app.services.trace_intake.put_json_object", lambda *args, **kwargs: None)

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
        yield client, testing_session_local, project_id, owner_id, fake_queue

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_registry_pack_modules_have_expected_credit_costs() -> None:
    assert core_reliability.PACK_CREDIT_COST == 20
    assert prompt_security.PACK_CREDIT_COST == 30
    assert tool_chaos.PACK_CREDIT_COST == 20
    assert latency_chaos.PACK_CREDIT_COST == 15


def test_credit_cost_returned_in_mutation_pack_create_and_list(
    pack_credit_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue],
) -> None:
    client, _, _, _, _ = pack_credit_context

    create_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Cost Pack",
            "description": "Pack with explicit credit cost",
            "config": {
                "mutations": [
                    {"type": "fault.timeout"},
                    {"type": "fault.rate_limit"},
                    {"type": "schema.rename_field"},
                ]
            },
            "credit_cost": 35,
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["credit_cost"] == 35
    pack_id = created["mutation_pack_id"]

    get_response = client.get(f"/v1/mutation-packs/{pack_id}")
    assert get_response.status_code == 200
    assert get_response.json()["credit_cost"] == 35

    list_response = client.get("/v1/mutation-packs")
    assert list_response.status_code == 200
    match = next((p for p in list_response.json() if p["mutation_pack_id"] == pack_id), None)
    assert match is not None
    assert match["credit_cost"] == 35


def test_credit_cost_defaults_to_20_when_not_provided(
    pack_credit_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue],
) -> None:
    client, _, _, _, _ = pack_credit_context

    response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Default Cost Pack",
            "config": {"mutations": [{"type": "fault.timeout"}]},
        },
    )
    assert response.status_code == 201
    assert response.json()["credit_cost"] == 20


def test_system_packs_have_correct_credit_costs_from_registry(
    pack_credit_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, _, _ = pack_credit_context

    list_response = client.get("/v1/mutation-packs")
    assert list_response.status_code == 200
    packs_by_name = {p["name"]: p for p in list_response.json() if p["is_system"]}

    assert packs_by_name["core-reliability"]["credit_cost"] == 20
    assert packs_by_name["prompt-security"]["credit_cost"] == 30
    assert packs_by_name["tool-chaos"]["credit_cost"] == 20
    assert packs_by_name["latency-chaos"]["credit_cost"] == 15

    with testing_session_local() as db:
        for name, expected_cost in [
            ("core-reliability", 20),
            ("prompt-security", 30),
            ("tool-chaos", 20),
            ("latency-chaos", 15),
        ]:
            pack = db.scalar(
                select(MutationPack).where(
                    MutationPack.project_id == project_id,
                    MutationPack.name == name,
                )
            )
            assert pack is not None, f"Pack {name!r} not found in db"
            assert (
                pack.credit_cost == expected_cost
            ), f"Pack {name!r} credit_cost={pack.credit_cost}, expected {expected_cost}"


def test_run_pack_deducts_pack_credit_cost(
    pack_credit_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, owner_id, _ = pack_credit_context

    with testing_session_local() as db:
        _, wallet, _ = ensure_user_billing(db, user_id=owner_id, pricing_tier="starter")
        wallet.balance = 100
        wallet.monthly_credits = 100
        db.add(wallet)
        db.commit()

    campaign_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Pack Credit Campaign",
            "mutation_set": [{"mutation_id": "baseline", "tool": "echo"}],
            "eval_set": {"checks": []},
        },
    )
    assert campaign_response.status_code == 201
    campaign_id = campaign_response.json()["campaign_id"]

    run_response = client.post(
        f"/v1/campaigns/{campaign_id}/run-pack",
        json={"pack": "latency-chaos"},
    )
    assert run_response.status_code == 201

    with testing_session_local() as db:
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        assert wallet is not None
        # latency-chaos has PACK_CREDIT_COST=15
        assert wallet.balance == 85


def test_run_pack_blocked_when_balance_below_pack_cost(
    pack_credit_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, owner_id, fake_queue = pack_credit_context

    with testing_session_local() as db:
        _, wallet, _ = ensure_user_billing(db, user_id=owner_id, pricing_tier="starter")
        wallet.balance = 10
        wallet.monthly_credits = 10
        wallet.topup_credits = 0
        db.add(wallet)
        db.commit()

    campaign_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Blocked Pack Campaign",
            "mutation_set": [{"mutation_id": "baseline", "tool": "echo"}],
            "eval_set": {"checks": []},
        },
    )
    assert campaign_response.status_code == 201
    campaign_id = campaign_response.json()["campaign_id"]

    run_response = client.post(
        f"/v1/campaigns/{campaign_id}/run-pack",
        json={"pack": "prompt-security"},
    )
    # prompt-security costs 30, balance is 10
    assert run_response.status_code == 402
    assert run_response.json()["detail"] == "Insufficient credits"
    # no run should have been enqueued
    assert fake_queue.calls == []

from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "sepurux.core.reliability"
PACK_DESCRIPTION = "High-coverage reliability pack for brittle-agent detection."
PACK_SUGGESTED_ATTEMPTS = 50
PACK_MAX_MUTATIONS_PER_ATTEMPT = 2


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="sepurux.core.reliability.rename_status",
            mutation_type="schema.rename_field",
            params={"from": "status", "to": "state"},
            weight=2.0,
            probability=0.08,
        ),
        RegisteredMutation(
            name="sepurux.core.reliability.drop_id",
            mutation_type="schema.drop_field",
            params={"field": "id"},
            weight=2.0,
            probability=0.06,
        ),
        RegisteredMutation(
            name="sepurux.core.reliability.timeout",
            mutation_type="fault.timeout",
            params={"prob": 0.1, "timeout_ms": 3500, "min_backoff_ms": 300},
            weight=2.0,
            probability=0.1,
        ),
        RegisteredMutation(
            name="sepurux.core.reliability.rate_limit",
            mutation_type="fault.rate_limit",
            params={"prob": 0.07, "min_backoff_ms": 900},
            weight=1.0,
            probability=0.07,
        ),
        RegisteredMutation(
            name="sepurux.core.reliability.delay",
            mutation_type="latency_delay",
            params={"min_ms": 800, "max_ms": 3000},
            weight=1.0,
            probability=0.12,
        ),
    ]

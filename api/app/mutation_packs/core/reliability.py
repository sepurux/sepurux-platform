from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "core.reliability"
PACK_DESCRIPTION = "Schema and transient fault mutations for brittle workflow detection."
PACK_SUGGESTED_ATTEMPTS = 50
PACK_MAX_MUTATIONS_PER_ATTEMPT = 2


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="core.reliability.rename_status",
            mutation_type="schema.rename_field",
            params={"from": "status", "to": "state"},
            weight=2.0,
        ),
        RegisteredMutation(
            name="core.reliability.drop_id",
            mutation_type="schema.drop_field",
            params={"field": "id"},
            weight=2.0,
        ),
        RegisteredMutation(
            name="core.reliability.timeout",
            mutation_type="fault.timeout",
            params={"prob": 0.3, "timeout_ms": 3000},
            weight=2.0,
        ),
        RegisteredMutation(
            name="core.reliability.rate_limit",
            mutation_type="fault.rate_limit",
            params={"prob": 0.15},
            weight=1.0,
        ),
    ]

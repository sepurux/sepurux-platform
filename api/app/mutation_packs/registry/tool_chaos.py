from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "tool-chaos"
PACK_DESCRIPTION = "Tool-layer chaos: timeouts, rate limits, schema breaks, and missing fields."
PACK_SUGGESTED_ATTEMPTS = 35
PACK_MAX_MUTATIONS_PER_ATTEMPT = 2
PACK_CREDIT_COST = 20


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="tool-chaos.timeout",
            mutation_type="fault.timeout",
            params={"prob": 0.12, "timeout_ms": 5000, "min_backoff_ms": 300},
            weight=3.0,
            probability=0.12,
        ),
        RegisteredMutation(
            name="tool-chaos.rate_limit",
            mutation_type="fault.rate_limit",
            params={"prob": 0.08, "min_backoff_ms": 900},
            weight=2.0,
            probability=0.08,
        ),
        RegisteredMutation(
            name="tool-chaos.schema_drop",
            mutation_type="schema.drop_field",
            params={"field": "id"},
            weight=2.0,
            probability=0.1,
        ),
        RegisteredMutation(
            name="tool-chaos.nested_missing",
            mutation_type="nested_field_missing",
            params={"path": "result.data"},
            weight=1.0,
            probability=0.07,
        ),
        RegisteredMutation(
            name="tool-chaos.rename_field",
            mutation_type="schema.rename_field",
            params={"from": "result", "to": "output"},
            weight=1.0,
            probability=0.07,
        ),
    ]

from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "tool.schema.break"
PACK_DESCRIPTION = "Tool output schema drift mutations for adapters and validators."
PACK_SUGGESTED_ATTEMPTS = 30
PACK_MAX_MUTATIONS_PER_ATTEMPT = 2


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="tool.schema.break.rename_status",
            mutation_type="schema.rename_field",
            params={"from": "status", "to": "state"},
            weight=2.0,
        ),
        RegisteredMutation(
            name="tool.schema.break.drop_payload_id",
            mutation_type="schema.drop_field",
            params={"field": "id"},
            weight=2.0,
        ),
        RegisteredMutation(
            name="tool.schema.break.drop_status",
            mutation_type="schema.drop_field",
            params={"field": "status"},
            weight=1.0,
            probability=0.8,
        ),
    ]

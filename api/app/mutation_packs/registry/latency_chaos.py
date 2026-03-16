from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "latency-chaos"
PACK_DESCRIPTION = "Latency-focused pack: delays, cascading timeouts, and slow fault injection."
PACK_SUGGESTED_ATTEMPTS = 15
PACK_MAX_MUTATIONS_PER_ATTEMPT = 1
PACK_CREDIT_COST = 15


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="latency-chaos.delay",
            mutation_type="latency_delay",
            params={"min_ms": 1000, "max_ms": 5000},
            weight=3.0,
        ),
        RegisteredMutation(
            name="latency-chaos.cascading_timeouts",
            mutation_type="cascading_timeouts",
            params={"depth": 3, "timeout_ms": 2000},
            weight=2.0,
        ),
        RegisteredMutation(
            name="latency-chaos.timeout",
            mutation_type="fault.timeout",
            params={"prob": 0.3, "timeout_ms": 8000},
            weight=2.0,
        ),
        RegisteredMutation(
            name="latency-chaos.rate_limit",
            mutation_type="fault.rate_limit",
            params={"prob": 0.1},
            weight=1.0,
        ),
    ]

from __future__ import annotations

from app.mutation_packs.base import Mutation, RegisteredMutation

PACK_NAME = "core.latency"
PACK_DESCRIPTION = "Latency spikes and timeout turbulence to stress retries and backoff."
PACK_SUGGESTED_ATTEMPTS = 40
PACK_MAX_MUTATIONS_PER_ATTEMPT = 2


def get_mutations() -> list[Mutation]:
    return [
        RegisteredMutation(
            name="core.latency.delay",
            mutation_type="latency_delay",
            params={"min_ms": 750, "max_ms": 2500},
            weight=2.0,
            probability=0.18,
        ),
        RegisteredMutation(
            name="core.latency.timeout",
            mutation_type="fault.timeout",
            params={"prob": 0.12, "timeout_ms": 5000, "min_backoff_ms": 300},
            weight=2.0,
            probability=0.12,
        ),
        RegisteredMutation(
            name="core.latency.rate_limit",
            mutation_type="fault.rate_limit",
            params={"prob": 0.08, "min_backoff_ms": 900},
            weight=1.0,
            probability=0.08,
        ),
    ]

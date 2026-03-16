from __future__ import annotations

from functools import lru_cache
from importlib import import_module
from typing import Any

from app.mutation_packs import Mutation, RegisteredMutation

PACK_MODULES = (
    "app.mutation_packs.sepurux.core_reliability",
    "app.mutation_packs.sepurux.max_chaos",
    "app.mutation_packs.core.reliability",
    "app.mutation_packs.core.latency",
    "app.mutation_packs.prompt.injection",
    "app.mutation_packs.tool.schema_break",
    # Named registry packs (credit-cost aware)
    "app.mutation_packs.registry.core_reliability",
    "app.mutation_packs.registry.prompt_security",
    "app.mutation_packs.registry.tool_chaos",
    "app.mutation_packs.registry.latency_chaos",
)


@lru_cache
def load_mutation_packs() -> dict[str, list[Mutation]]:
    registry: dict[str, list[Mutation]] = {}

    for module_name in PACK_MODULES:
        module = import_module(module_name)
        pack_name = getattr(module, "PACK_NAME", None)
        get_mutations = getattr(module, "get_mutations", None)
        if not isinstance(pack_name, str) or not pack_name.strip() or not callable(get_mutations):
            continue

        pack_mutations = [
            mutation for mutation in get_mutations() if isinstance(mutation, Mutation)
        ]
        registry[pack_name.strip()] = pack_mutations

    return registry


def get_registered_pack_definition(pack_name: str) -> dict[str, Any] | None:
    normalized = pack_name.strip()
    if not normalized:
        return None

    registry = load_mutation_packs()
    mutations = registry.get(normalized)
    if mutations is None:
        return None

    module_name = next(
        (
            candidate
            for candidate in PACK_MODULES
            if getattr(import_module(candidate), "PACK_NAME", None) == normalized
        ),
        None,
    )
    if module_name is None:
        return None

    module = import_module(module_name)
    max_mutations = getattr(module, "PACK_MAX_MUTATIONS_PER_ATTEMPT", 1)
    suggested_attempts = getattr(module, "PACK_SUGGESTED_ATTEMPTS", 20)
    description = getattr(module, "PACK_DESCRIPTION", "")
    credit_cost = getattr(module, "PACK_CREDIT_COST", 20)

    return {
        "name": normalized,
        "description": str(description or ""),
        "credit_cost": int(credit_cost),
        "config": {
            "version": "0.1",
            "suggested_attempts": int(suggested_attempts),
            "max_mutations_per_attempt": int(max_mutations),
            "mutations": [
                mutation.to_definition()
                for mutation in mutations
                if isinstance(mutation, RegisteredMutation)
            ],
        },
    }


def list_registered_pack_definitions() -> list[dict[str, Any]]:
    definitions: list[dict[str, Any]] = []
    for pack_name in load_mutation_packs():
        definition = get_registered_pack_definition(pack_name)
        if definition is not None:
            definitions.append(definition)
    return definitions

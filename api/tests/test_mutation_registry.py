from __future__ import annotations

from app.mutation_packs import Mutation
from app.mutation_registry import get_registered_pack_definition, load_mutation_packs


def test_load_mutation_packs_returns_expected_registry_keys() -> None:
    registry = load_mutation_packs()

    assert set(registry) == {
        "sepurux.core.reliability",
        "sepurux.max_chaos",
        "core.reliability",
        "core.latency",
        "prompt.injection",
        "tool.schema.break",
    }
    assert all(
        all(isinstance(mutation, Mutation) for mutation in mutations)
        for mutations in registry.values()
    )


def test_registered_pack_definition_builds_engine_config() -> None:
    definition = get_registered_pack_definition("core.reliability")

    assert definition is not None
    assert definition["name"] == "core.reliability"
    config = definition["config"]
    assert config["version"] == "0.1"
    assert config["max_mutations_per_attempt"] == 2
    assert isinstance(config["mutations"], list)
    assert len(config["mutations"]) >= 1


def test_registered_top_coverage_pack_definition_is_available() -> None:
    definition = get_registered_pack_definition("sepurux.max_chaos")

    assert definition is not None
    assert definition["name"] == "sepurux.max_chaos"
    config = definition["config"]
    assert config["version"] == "0.1"
    assert config["max_mutations_per_attempt"] == 3
    assert isinstance(config["mutations"], list)
    assert len(config["mutations"]) == 5

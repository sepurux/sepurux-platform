from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.mutation_registry import list_registered_pack_definitions

WEAK_PACK_WARNING = "Mutation pack may be too weak to detect failures"

SCHEMA_MUTATION_TYPES = {
    "schema.rename_field",
    "schema.drop_field",
    "enum_value_change",
    "nested_field_missing",
}
FAILURE_MUTATION_TYPES = {
    "fault.timeout",
    "fault.rate_limit",
    "fault.auth_failure",
}
LATENCY_MUTATION_TYPES = {
    "latency_delay",
    "cascading_timeouts",
}
SECURITY_MUTATION_TYPES = {
    "poison.inject",
    "instruction_injection",
    "tool_output_override",
}
DATA_CORRUPTION_MUTATION_TYPES = {
    "malformed_tool_output",
    "enum_value_change",
    "nested_field_missing",
    "tool_output_override",
}

RECOMMENDED_SYSTEM_PACK_NAMES = {
    "sepurux.max_chaos",
    "sepurux.core.reliability",
    "core.reliability",
    "prompt.injection",
    "tool.schema.break",
    "core.latency",
}

SYSTEM_MUTATION_PACK_DEFINITIONS: list[dict[str, Any]] = list_registered_pack_definitions()


@dataclass(frozen=True)
class MutationPackValidationResult:
    coverage_score: int
    categories: list[str]
    mutation_types: list[str]
    issues: list[str]
    warning: str | None


def _extract_mutation_types(config: Any) -> list[str]:
    config_obj = config if isinstance(config, dict) else {}
    mutations_value = config_obj.get("mutations")
    if not isinstance(mutations_value, list):
        return []

    seen: set[str] = set()
    ordered: list[str] = []
    for item in mutations_value:
        if not isinstance(item, dict):
            continue
        mutation_type = item.get("type")
        if not isinstance(mutation_type, str) or not mutation_type.strip():
            continue
        normalized = mutation_type.strip()
        if normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def _categorize_mutation_types(mutation_types: list[str]) -> list[str]:
    categories: set[str] = set()
    for mutation_type in mutation_types:
        if mutation_type in SCHEMA_MUTATION_TYPES:
            categories.add("schema")
        if mutation_type in FAILURE_MUTATION_TYPES:
            categories.add("fault")
        if mutation_type in LATENCY_MUTATION_TYPES:
            categories.add("latency")
        if mutation_type in SECURITY_MUTATION_TYPES:
            categories.add("security")
        if mutation_type in DATA_CORRUPTION_MUTATION_TYPES:
            categories.add("data_corruption")
    return sorted(categories)


def coverage_score_for_config(config: Any) -> int:
    mutation_types = _extract_mutation_types(config)
    categories = _categorize_mutation_types(mutation_types)
    return min(100, len(categories) * 20)


def validation_warning_for_score(coverage_score: int) -> str | None:
    if coverage_score < 40:
        return WEAK_PACK_WARNING
    return None


def evaluate_mutation_pack_config(config: Any) -> MutationPackValidationResult:
    mutation_types = _extract_mutation_types(config)
    categories = _categorize_mutation_types(mutation_types)
    score = min(100, len(categories) * 20)

    issues: list[str] = []
    mutation_type_set = set(mutation_types)
    if not mutation_type_set.intersection(SCHEMA_MUTATION_TYPES):
        issues.append("must contain at least one schema mutation")
    if not mutation_type_set.intersection(FAILURE_MUTATION_TYPES):
        issues.append(
            "must contain at least one failure mutation (timeout/rate_limit/auth_failure)"
        )
    if not mutation_type_set.intersection(LATENCY_MUTATION_TYPES):
        issues.append("must contain at least one latency mutation")
    if len(mutation_type_set) < 2:
        issues.append("must contain at least two distinct mutation types")

    warning = WEAK_PACK_WARNING if issues else validation_warning_for_score(score)

    return MutationPackValidationResult(
        coverage_score=score,
        categories=categories,
        mutation_types=mutation_types,
        issues=issues,
        warning=warning,
    )

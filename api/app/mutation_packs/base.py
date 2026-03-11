from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


class Mutation:
    name: str

    def apply(self, input: Any) -> Any:
        raise NotImplementedError


@dataclass(frozen=True)
class RegisteredMutation(Mutation):
    name: str
    mutation_type: str
    target_tool_pattern: str = "*"
    probability: float = 1.0
    weight: float = 1.0
    params: dict[str, Any] = field(default_factory=dict)

    def apply(self, input: Any) -> Any:
        return input

    def to_definition(self) -> dict[str, Any]:
        return {
            "mutation_id": self.name,
            "type": self.mutation_type,
            "target": {"tool": self.target_tool_pattern},
            "params": dict(self.params),
            "probability": self.probability,
            "weight": self.weight,
        }

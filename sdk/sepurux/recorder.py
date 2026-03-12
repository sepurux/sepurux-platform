from __future__ import annotations

import inspect
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any, ParamSpec, TypeVar

from .trace import TraceBuilder
from .types import TracePayload

if TYPE_CHECKING:
    from .client import SepuruxClient

P = ParamSpec("P")
R = TypeVar("R")


class TraceRecorder:
    """Friendly recorder wrapper around TraceBuilder."""

    def __init__(
        self,
        task_name: str,
        task_input: dict[str, Any] | None = None,
        *,
        source: str = "sdk",
        trace_version: str = "0.1",
    ) -> None:
        self._builder = TraceBuilder(
            task_name=task_name,
            task_input=task_input,
            source=source,
            trace_version=trace_version,
        )

    def model_step(self, name: str, input: Any, output: Any | None = None) -> None:
        self._builder.add_model_step(name=name, input=input, output=output)

    def tool_call(self, tool: str, args: dict[str, Any]) -> None:
        self._builder.add_tool_call(tool=tool, args=args)

    def tool_result(self, tool: str, result: Any) -> None:
        self._builder.add_tool_result(tool=tool, result=result)

    def error(self, tool: str | None = None, message: str = "") -> None:
        self._builder.add_error(message=message, tool=tool)

    def to_trace(self) -> TracePayload:
        return self._builder.to_trace()


@contextmanager
def sepurux_trace(
    task_name: str,
    task_input: dict[str, Any] | None = None,
    *,
    source: str = "sdk",
    trace_version: str = "0.1",
) -> Iterator[TraceRecorder]:
    recorder = TraceRecorder(
        task_name=task_name,
        task_input=task_input,
        source=source,
        trace_version=trace_version,
    )
    yield recorder


def record_trace(
    *,
    client: SepuruxClient,
    campaign_id: str | None = None,
    task_name: str | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Backward-compatible alias for the easier client traceable decorator."""

    return client.traceable(name=task_name, campaign_id=campaign_id, raise_on_error=False)


def safe_json_value(value: Any) -> Any:
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, dict):
        return {str(k): safe_json_value(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set):
        return [safe_json_value(v) for v in value]

    if inspect.isfunction(value) or inspect.ismethod(value):
        return getattr(value, "__name__", "callable")

    return repr(value)

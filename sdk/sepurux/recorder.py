from __future__ import annotations

import functools
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
    ) -> None:
        self._builder = TraceBuilder(task_name=task_name, task_input=task_input)

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
) -> Iterator[TraceRecorder]:
    recorder = TraceRecorder(task_name=task_name, task_input=task_input)
    yield recorder


def record_trace(
    *,
    client: SepuruxClient,
    campaign_id: str | None = None,
    task_name: str | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Decorator that records function traces and optionally starts a run."""

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            trace_task_name = task_name or func.__name__
            task_input = {
                "function": func.__name__,
                "args": _safe_json_value(list(args)),
                "kwargs": _safe_json_value(dict(kwargs)),
            }

            with sepurux_trace(trace_task_name, task_input=task_input) as recorder:
                recorder.model_step(
                    "function.call",
                    {"qualname": getattr(func, "__qualname__", func.__name__)},
                )
                try:
                    result = func(*args, **kwargs)
                except Exception as exc:
                    recorder.error(tool=func.__name__, message=str(exc))
                    raise
                recorder.model_step(
                    "function.return", {"ok": True}, output=_safe_json_value(result)
                )

                trace = recorder.to_trace()

            # SDK telemetry should not break business logic.
            try:
                trace_id = client.upload_trace(trace)
                if campaign_id:
                    client.start_run(trace_id=trace_id, campaign_id=campaign_id)
            except Exception:
                pass

            return result

        return wrapper

    return decorator


def _safe_json_value(value: Any) -> Any:
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, dict):
        return {str(k): _safe_json_value(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set):
        return [_safe_json_value(v) for v in value]

    if inspect.isfunction(value) or inspect.ismethod(value):
        return getattr(value, "__name__", "callable")

    return repr(value)

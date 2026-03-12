from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any

from .client import SepuruxClient

if TYPE_CHECKING:
    from .client import ManagedTraceRecorder

_default_client: SepuruxClient | None = None


def configure(client: SepuruxClient | None = None, **from_env_kwargs: Any) -> SepuruxClient:
    global _default_client
    if client is None:
        client = SepuruxClient.from_env(**from_env_kwargs)
    _default_client = client
    return client


def get_client() -> SepuruxClient:
    global _default_client
    if _default_client is None:
        _default_client = SepuruxClient.from_env()
    return _default_client


@contextmanager
def trace(
    task_name: str,
    task_input: dict[str, Any] | None = None,
    **kwargs: Any,
) -> Iterator[ManagedTraceRecorder]:
    with get_client().trace(task_name, task_input, **kwargs) as recorder:
        yield recorder


def traceable(**kwargs: Any) -> Any:
    return get_client().traceable(**kwargs)

"""LangChain callback handler for Sepurux trace recording.

Usage::

    from sepurux.integrations.langchain import SepuruxCallbackHandler

    handler = SepuruxCallbackHandler(
        "customer_refund_flow",
        {"ticket_id": "t-101"},
        campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
    )

    # Pass to any LangChain chain, agent, or LLM
    result = chain.invoke(inputs, config={"callbacks": [handler]})

    # Upload trace and start run
    handler.finish()
    print(handler.trace_id, handler.run_id)
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any
from uuid import UUID

from ..client import ManagedTraceRecorder, SepuruxClient
from ..easy import get_client
from ..recorder import safe_json_value

if TYPE_CHECKING:
    pass

try:
    from langchain_core.callbacks import BaseCallbackHandler as _BaseCallbackHandler

    _BASE: type = _BaseCallbackHandler
except ImportError:
    _BASE = object


class SepuruxCallbackHandler(_BASE):  # type: ignore[misc,valid-type]
    """LangChain callback handler that records chain, LLM, and tool events
    as a Sepurux trace and uploads on ``finish()``.

    Requires ``langchain-core`` to be installed::

        pip install langchain-core

    All LLM calls, tool calls, and the final agent output are recorded
    automatically. Call ``handler.finish()`` once the chain completes to
    upload the trace and optionally start a reliability run.
    """

    def __init__(
        self,
        task_name: str,
        task_input: dict[str, Any] | None = None,
        *,
        client: SepuruxClient | None = None,
        campaign_id: str | None = None,
        mutation_pack: str | None = None,
        source: str = "langchain",
        raise_on_error: bool = False,
    ) -> None:
        try:
            import langchain_core  # noqa: F401
        except ImportError as exc:
            raise ImportError(
                "langchain-core is required to use SepuruxCallbackHandler. "
                "Install it with: pip install langchain-core"
            ) from exc

        super().__init__()

        self._client = client or get_client()
        self._campaign_id = campaign_id
        self._mutation_pack = mutation_pack
        self._raise_on_error = raise_on_error

        self._recorder = ManagedTraceRecorder(
            task_name=task_name,
            task_input=task_input or {},
            source=source,
        )
        if task_input:
            self._recorder.prompt(safe_json_value(task_input), name=task_name)

        # Pending LLM steps: run_id -> {name, input, started_at}
        self._pending_llm: dict[str, dict[str, Any]] = {}
        # Pending tool calls: run_id -> tool_name
        self._pending_tools: dict[str, str] = {}

        # Populated after finish()
        self.trace_id: str | None = None
        self.run_id: str | None = None
        self.upload_error: Exception | None = None

    # ------------------------------------------------------------------
    # LLM / Chat model events
    # ------------------------------------------------------------------

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        name = _model_name(serialized)
        self._pending_llm[str(run_id)] = {
            "name": name,
            "input": {"prompts": prompts},
            "started_at": time.monotonic(),
        }

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[Any]],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        name = _model_name(serialized)
        try:
            msg_input = [
                [m.dict() if hasattr(m, "dict") else str(m) for m in batch]
                for batch in messages
            ]
        except Exception:
            msg_input = str(messages)  # type: ignore[assignment]
        self._pending_llm[str(run_id)] = {
            "name": name,
            "input": {"messages": msg_input},
            "started_at": time.monotonic(),
        }

    def on_llm_end(
        self,
        response: Any,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        pending = self._pending_llm.pop(str(run_id), {})
        name = pending.get("name", "llm")
        inp = pending.get("input", {})
        started_at: float | None = pending.get("started_at")
        latency_ms = int((time.monotonic() - started_at) * 1000) if started_at else None

        output: Any
        try:
            output = [[g.text for g in gen] for gen in response.generations]
        except Exception:
            output = safe_json_value(response)

        self._recorder.llm_call(
            name,
            safe_json_value(inp),
            safe_json_value(output),
            latency_ms=latency_ms,
            status="success",
        )

    def on_llm_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        pending = self._pending_llm.pop(str(run_id), {})
        name = pending.get("name", "llm")
        self._recorder.error(tool=name, message=str(error))

    # ------------------------------------------------------------------
    # Tool events
    # ------------------------------------------------------------------

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        tool_name = serialized.get("name") or "tool"
        self._pending_tools[str(run_id)] = tool_name
        try:
            import json

            args: dict[str, Any] = json.loads(input_str)
            if not isinstance(args, dict):
                args = {"input": args}
        except Exception:
            args = {"input": input_str}
        self._recorder.tool_call(tool_name, safe_json_value(args))

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        tool_name = self._pending_tools.pop(str(run_id), "tool")
        self._recorder.tool_result(tool_name, safe_json_value(output))

    def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        tool_name = self._pending_tools.pop(str(run_id), "tool")
        self._recorder.error(tool=tool_name, message=str(error))

    # ------------------------------------------------------------------
    # Agent events
    # ------------------------------------------------------------------

    def on_agent_finish(
        self,
        finish: Any,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        return_values = getattr(finish, "return_values", {})
        self._recorder.agent_output(safe_json_value(return_values), name="agent_finish")

    # Chain start/end are intentionally skipped — they are noisy wrappers
    # and add no signal beyond what LLM/tool events already capture.

    # ------------------------------------------------------------------
    # Upload
    # ------------------------------------------------------------------

    def finish(self) -> dict[str, str | None]:
        """Upload the trace and optionally start a reliability run.

        Returns a dict with ``trace_id`` and ``run_id`` (may be None if no
        campaign was configured). Stores results on ``self.trace_id`` and
        ``self.run_id`` for later access.
        """
        try:
            self._client._finalize_trace(
                self._recorder,
                campaign_id=self._campaign_id,
                mutation_pack=self._mutation_pack,
            )
            self.trace_id = self._recorder.trace_id
            self.run_id = self._recorder.run_id
        except Exception as exc:
            self.upload_error = exc
            if self._raise_on_error:
                raise
        return {"trace_id": self.trace_id, "run_id": self.run_id}

    # ------------------------------------------------------------------
    # Context manager support
    # ------------------------------------------------------------------

    def __enter__(self) -> SepuruxCallbackHandler:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_val is not None:
            self._recorder.error(message=str(exc_val))
        self.finish()


def _model_name(serialized: dict[str, Any]) -> str:
    """Extract a human-readable model name from a LangChain serialized dict."""
    if name := serialized.get("name"):
        return str(name)
    ids: list[Any] = serialized.get("id", [])
    return str(ids[-1]) if ids else "llm"

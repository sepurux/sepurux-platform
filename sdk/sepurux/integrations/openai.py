"""OpenAI instrumentation for Sepurux trace recording.

Usage::

    import openai
    from sepurux import SepuruxClient
    from sepurux.integrations.openai import instrument_openai

    client = SepuruxClient.from_env()
    openai_client = openai.OpenAI()

    with client.trace("customer_refund_flow", {"ticket_id": "t-101"}) as trace:
        ai = instrument_openai(openai_client, recorder=trace)
        response = ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Classify this ticket"}],
        )

    print(trace.trace_id)
"""

from __future__ import annotations

import json
import time
from typing import Any

from ..recorder import TraceRecorder, safe_json_value


def instrument_openai(client: Any, *, recorder: TraceRecorder) -> "InstrumentedOpenAI":
    """Wrap an ``openai.OpenAI`` (or ``AsyncOpenAI``) client so every
    ``chat.completions.create`` call is automatically recorded as an
    ``llm_call`` event on *recorder*.

    Tool calls present in the response are also recorded as ``tool_call``
    events so the downstream resolution can be tracked.

    Args:
        client: An ``openai.OpenAI`` or ``openai.AsyncOpenAI`` instance.
        recorder: A :class:`~sepurux.recorder.TraceRecorder` (the object
            yielded by ``client.trace(...)``).

    Returns:
        A thin wrapper that delegates all attribute access to the original
        client while intercepting ``chat.completions.create``.
    """
    return InstrumentedOpenAI(client, recorder=recorder)


class InstrumentedOpenAI:
    """Wraps an OpenAI client to automatically record ``llm_call`` and
    ``tool_call`` events on every ``chat.completions.create`` call.

    Supports both sync (``openai.OpenAI``) and async (``openai.AsyncOpenAI``)
    clients — async detection is done at call time.
    """

    def __init__(self, client: Any, *, recorder: TraceRecorder) -> None:
        self._client = client
        self._recorder = recorder
        self.chat = _InstrumentedChat(client.chat, recorder=recorder)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


class _InstrumentedChat:
    def __init__(self, chat: Any, *, recorder: TraceRecorder) -> None:
        self._chat = chat
        self.completions = _InstrumentedCompletions(chat.completions, recorder=recorder)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)


class _InstrumentedCompletions:
    def __init__(self, completions: Any, *, recorder: TraceRecorder) -> None:
        self._completions = completions
        self._recorder = recorder

    def create(self, *, model: str, messages: list[Any], **kwargs: Any) -> Any:
        """Sync wrapper — records llm_call + any tool_calls on the response."""
        started_at = time.monotonic()
        try:
            response = self._completions.create(model=model, messages=messages, **kwargs)
        except Exception as exc:
            self._recorder.error(tool=model, message=str(exc))
            raise
        self._record_response(model, messages, response, started_at)
        return response

    async def acreate(self, *, model: str, messages: list[Any], **kwargs: Any) -> Any:
        """Async wrapper — records llm_call + any tool_calls on the response."""
        started_at = time.monotonic()
        try:
            response = await self._completions.acreate(model=model, messages=messages, **kwargs)
        except Exception as exc:
            self._recorder.error(tool=model, message=str(exc))
            raise
        self._record_response(model, messages, response, started_at)
        return response

    def _record_response(
        self,
        model: str,
        messages: list[Any],
        response: Any,
        started_at: float,
    ) -> None:
        latency_ms = int((time.monotonic() - started_at) * 1000)

        output = _extract_output(response)
        self._recorder.llm_call(
            model,
            {"messages": safe_json_value(messages)},
            output,
            latency_ms=latency_ms,
            status="success",
        )

        # Record any tool calls present in the response choices
        for choice in getattr(response, "choices", []) or []:
            msg = getattr(choice, "message", None)
            if msg is None:
                continue
            for tc in getattr(msg, "tool_calls", []) or []:
                fn = getattr(tc, "function", None)
                tool_name: str = getattr(fn, "name", None) or "tool"
                raw_args: str = getattr(fn, "arguments", "{}") or "{}"
                try:
                    args: dict[str, Any] = json.loads(raw_args)
                    if not isinstance(args, dict):
                        args = {"input": args}
                except Exception:
                    args = {"input": raw_args}
                self._recorder.tool_call(tool_name, safe_json_value(args))

    def __getattr__(self, name: str) -> Any:
        return getattr(self._completions, name)


def _extract_output(response: Any) -> Any:
    """Pull a serialisable output value from an OpenAI ChatCompletion response."""
    try:
        return [
            {
                "content": getattr(choice.message, "content", None),
                "role": getattr(choice.message, "role", None),
                "tool_calls": [
                    {
                        "id": getattr(tc, "id", None),
                        "function": {
                            "name": getattr(getattr(tc, "function", None), "name", None),
                            "arguments": getattr(getattr(tc, "function", None), "arguments", None),
                        },
                    }
                    for tc in (getattr(choice.message, "tool_calls", []) or [])
                ],
            }
            for choice in response.choices
        ]
    except Exception:
        return safe_json_value(response)

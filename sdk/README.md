# Sepurux Python SDK

Python SDK for recording Sepurux traces and uploading them to a Sepurux API.

## Install

```bash
pip install -e sdk
```

## Quick start

```python
import os

from sepurux import SepuruxClient

os.environ["SEPURUX_API_BASE_URL"] = "http://localhost:8000"
os.environ["SEPURUX_API_KEY"] = "sepurux-dev-key"
os.environ["SEPURUX_PROJECT_ID"] = "22222222-2222-2222-2222-222222222222"

with SepuruxClient.from_env() as client:
    with client.trace("example_task", {"user_id": "u-123"}) as trace:
        trace.model_step("plan", {"goal": "create issue"}, output={"ok": True})
        trace.tool_call("jira.create_issue(commit)", {"summary": "SDK test"})
        trace.tool_result("jira.create_issue(commit)", {"issue_id": "OPS-123"})

    print("trace_id:", trace.trace_id)
```

This is the intended ergonomic path:
- `SepuruxClient.from_env()` reads `SEPURUX_API_BASE_URL`, `SEPURUX_API_KEY`, and `SEPURUX_PROJECT_ID`
- `client.trace(...)` records and uploads automatically on exit
- `trace.trace_id` and `trace.run_id` are available after the context closes

## LangSmith-style ergonomics

### Auto-upload trace context

```python
from sepurux import SepuruxClient

client = SepuruxClient.from_env()

with client.trace(
    "checkout_refund",
    {"ticket_id": "t-123"},
    campaign_id="refund_reliability",
    mutation_pack="sepurux.core.reliability",
) as trace:
    trace.model_step("triage", {"text": "Refund the duplicate charge"})
    trace.tool_call("payments.refund", {"payment_id": "pay_123", "amount": 4200})
    trace.tool_result("payments.refund", {"refund_id": "rf_123", "status": "queued"})

print(trace.trace_id)
print(trace.run_id)
```

### `@traceable` decorator

```python
from sepurux import SepuruxClient

client = SepuruxClient.from_env()

@client.traceable(campaign_id="refund_reliability")
def score_refund_risk(amount: int, currency: str) -> dict:
    return {"risk": "medium", "approve": amount < 10000, "currency": currency}

result = score_refund_risk(4200, "usd")
```

### Global configuration

```python
from sepurux import configure, trace, traceable

configure()

@traceable()
def classify_ticket(text: str) -> dict:
    return {"label": "bug", "priority": "p2"}

with trace("support_session", {"channel": "email"}) as rec:
    rec.model_step("classify", {"text": "checkout timed out"})
```

## API

### `SepuruxClient`

```python
SepuruxClient(base_url, api_key=None, project_id=None, timeout=30, sdk_header=None)
SepuruxClient.from_env(...)
```

The SDK automatically sends `X-Sepurux-SDK: py/<version>` on requests.
Use `sdk_header` only if you need to override it manually.

Methods:
- `trace(task_name, task_input=None, campaign_id=None, mutation_pack=None) -> recorder`
- `traceable(name=None, campaign_id=None, mutation_pack=None) -> decorator`
- `upload_trace(trace: dict) -> str`
- `create_campaign(name, mutation_set, eval_set, mutation_pack_id=None) -> str`
- `start_run(trace_id, campaign_id, thresholds=None) -> str`
- `run_pack(campaign_id, mutation_pack) -> str`
- `get_run(run_id) -> dict`

### `TraceBuilder`

`TraceBuilder` outputs backend-compatible traces:

```json
{
  "trace_version": "0.1",
  "source": "sdk",
  "task": {"name": "...", "input": {}},
  "events": []
}
```

### Recommended tracing flow

Use `client.trace(...)`, `client.traceable(...)`, or the global `trace(...)` / `traceable(...)`
helpers as the default integration path. Legacy helpers like `sepurux_trace(...)` and
`record_trace(...)` remain available for compatibility, but they are deprecated and no longer
the documented path.

### Server-side pack execution

```python
run_id = client.run_campaign("demo_campaign", mutation_pack="core.reliability")
```


Optional environment variables:
- `SEPURUX_API_BASE_URL` (default `http://localhost:8000`)
- `SEPURUX_UI_BASE_URL` (default `http://localhost:3000`)
- `SEPURUX_API_KEY`
- `SEPURUX_PROJECT_ID`
- `SEPURUX_CAMPAIGN_ID` (if provided, script starts a run)

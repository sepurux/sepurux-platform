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
- `upload_trace(trace: dict) -> str`
- `trace(task_name, task_input=None, campaign_id=None, mutation_pack=None) -> recorder`
- `traceable(name=None, campaign_id=None, mutation_pack=None) -> decorator`
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

### Recorder

Use a low-level context manager when you want to build the trace manually:

```python
from sepurux import sepurux_trace

with sepurux_trace("task_name", {"input": "value"}) as rec:
    rec.model_step("name", {"foo": "bar"}, output={"ok": True})
    rec.tool_call("tool.name", {"arg": 1})
    rec.tool_result("tool.name", {"result": "ok"})
    rec.error(message="something happened", tool="tool.name")
```

### Decorator

```python
from sepurux import record_trace

@record_trace(client=client, campaign_id="<campaign_id>")
def run_business_logic(x: int) -> int:
    return x * 2
```

The decorator preserves the function return value and attempts to upload/start runs in the background path without interrupting normal execution.

### Server-side pack execution

```python
run_id = client.run_campaign("demo_campaign", mutation_pack="core.reliability")
```

## Example script

See `examples/sdk_demo.py`.

```bash
python sdk/examples/sdk_demo.py
```

Optional environment variables:
- `SEPURUX_API_BASE_URL` (default `http://localhost:8000`)
- `SEPURUX_UI_BASE_URL` (default `http://localhost:3000`)
- `SEPURUX_API_KEY`
- `SEPURUX_PROJECT_ID`
- `SEPURUX_CAMPAIGN_ID` (if provided, script starts a run)

## Publish to PyPI (CI)

This repository includes `.github/workflows/sdk-publish-pypi.yml` to publish the SDK directly to PyPI.

Setup:
- Add `PYPI_API_TOKEN` in GitHub repository secrets.
- Ensure the package version in `sdk/pyproject.toml` is new.

Release:
- Push a tag like `sdk-v0.3.0` to trigger publish.
- Or run the workflow manually from GitHub Actions.

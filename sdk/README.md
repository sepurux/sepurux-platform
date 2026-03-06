# Crash Lab Python SDK

Python SDK for recording Crash Lab traces and uploading them to a Crash Lab API.

## Install

```bash
pip install -e sdk
```

## Quick start

```python
from crashlab_sdk import CrashLabClient, crashlab_trace

client = CrashLabClient(
    base_url="http://localhost:8000",
    api_key="crashlab-dev-key",
    project_id="22222222-2222-2222-2222-222222222222",
)

with crashlab_trace("example_task", {"user_id": "u-123"}) as rec:
    rec.model_step("plan", {"goal": "create issue"}, output={"ok": True})
    rec.tool_call("jira.create_issue(commit)", {"summary": "SDK test"})
    rec.tool_result("jira.create_issue(commit)", {"issue_id": "OPS-123"})

trace_id = client.upload_trace(rec.to_trace())
print("trace_id:", trace_id)
```

## API

### `CrashLabClient`

```python
CrashLabClient(base_url, api_key=None, project_id=None, timeout=30)
```

Methods:
- `upload_trace(trace: dict) -> str`
- `create_campaign(name, mutation_set, eval_set, mutation_pack_id=None) -> str`
- `start_run(trace_id, campaign_id, thresholds=None) -> str`
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

Use a context manager:

```python
from crashlab_sdk import crashlab_trace

with crashlab_trace("task_name", {"input": "value"}) as rec:
    rec.model_step("name", {"foo": "bar"}, output={"ok": True})
    rec.tool_call("tool.name", {"arg": 1})
    rec.tool_result("tool.name", {"result": "ok"})
    rec.error(message="something happened", tool="tool.name")
```

### Decorator

```python
from crashlab_sdk import record_trace

@record_trace(client=client, campaign_id="<campaign_id>")
def run_business_logic(x: int) -> int:
    return x * 2
```

The decorator preserves the function return value and attempts to upload/start runs in the background path without interrupting normal execution.

## Example script

See `examples/sdk_demo.py`.

```bash
python sdk/examples/sdk_demo.py
```

Optional environment variables:
- `CRASHLAB_API_BASE_URL` (default `http://localhost:8000`)
- `CRASHLAB_UI_BASE_URL` (default `http://localhost:3000`)
- `CRASHLAB_API_KEY`
- `CRASHLAB_PROJECT_ID`
- `CRASHLAB_CAMPAIGN_ID` (if provided, script starts a run)

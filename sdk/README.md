# Sepurux Python SDK

Python SDK for recording Sepurux traces and uploading them to a Sepurux API.

## Install

```bash
pip install -e sdk
```

## Quick start

```python
from sepurux import SepuruxClient, sepurux_trace

client = SepuruxClient(
    base_url="http://localhost:8000",
    api_key="sepurux-dev-key",
    project_id="22222222-2222-2222-2222-222222222222",
)

with sepurux_trace("example_task", {"user_id": "u-123"}) as rec:
    rec.model_step("plan", {"goal": "create issue"}, output={"ok": True})
    rec.tool_call("jira.create_issue(commit)", {"summary": "SDK test"})
    rec.tool_result("jira.create_issue(commit)", {"issue_id": "OPS-123"})

trace_id = client.upload_trace(rec.to_trace())
print("trace_id:", trace_id)
```

## API

### `SepuruxClient`

```python
SepuruxClient(base_url, api_key=None, project_id=None, timeout=30, sdk_header=None)
```

The SDK automatically sends `X-Sepurux-SDK: py/<version>` on requests.
Use `sdk_header` only if you need to override it manually.

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
- Push a tag like `sdk-v0.2.0` to trigger publish.
- Or run the workflow manually from GitHub Actions.

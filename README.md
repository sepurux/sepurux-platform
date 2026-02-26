# Crash-Lab

## Local Dev

```bash
docker compose -f infra/docker-compose.yml up --build
```

Run DB migrations in the API container:

```bash
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

## API Quick Start

Create a trace:

```bash
curl -sS -X POST http://localhost:8000/v1/traces \
  -H 'Content-Type: application/json' \
  -d '{"event":"demo"}'
```

Create a campaign:

```bash
curl -sS -X POST http://localhost:8000/v1/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Inspector Demo",
    "mutation_set":[
      {"mutation_id":"ok-1","tool":"jira.create_issue"},
      {"mutation_id":"fail-1","tool":"jira.create_issue","force_fail":true,"failure_reason":"timeout"}
    ],
    "eval_set":{"checks":["status"]}
  }'
```

Queue a run:

```bash
curl -sS -X POST http://localhost:8000/v1/runs \
  -H 'Content-Type: application/json' \
  -d '{"trace_id":"<trace_id>","campaign_id":"<campaign_id>"}'
```

## Run Inspector Endpoints

List attempts for a run:

```bash
curl -sS "http://localhost:8000/v1/runs/<run_id>/attempts?limit=50&offset=0&result=failed"
```

Get attempt details:

```bash
curl -sS http://localhost:8000/v1/attempts/<attempt_id>
```

Fetch the timeline artifact through the API (MVP):

```bash
curl -sS http://localhost:8000/v1/attempts/<attempt_id>/timeline
```

## Analytics Endpoints

Run-level stats:

```bash
curl -sS http://localhost:8000/v1/runs/<run_id>/stats
```

Cross-run tool fragility (MVP uses first failure tool only):

```bash
curl -sS "http://localhost:8000/v1/tools/fragility?window_days=7&limit=10"
```

Mutation summary (optional dashboard helper):

```bash
curl -sS "http://localhost:8000/v1/mutations/summary?window_days=7&limit=10"
```

## Counterfactual Lite

List counterfactual what-if replays for a failed attempt:

```bash
curl -sS http://localhost:8000/v1/attempts/<attempt_id>/counterfactuals
```

Get a single counterfactual result:

```bash
curl -sS http://localhost:8000/v1/counterfactuals/<counterfactual_id>
```

## GitHub PR Gate (Crash Lab CI)

Crash Lab exposes CI gate endpoints under `/v1/ci/*` so a GitHub workflow can block a PR until a replay run finishes and meets thresholds.

- Auth: set `CI_TOKEN` on the Crash Lab API and send it as `X-CrashLab-Token`.
- Dev mode: if `CI_TOKEN` is unset, `/v1/ci/*` is allowed locally for easier testing.

### Reusable Composite Action (use from another repo)

This repo ships a composite action at `.github/actions/crashlab-gate`.
Another repository can call it via a repo path + ref:

```yaml
name: Crash Lab Gate

on:
  pull_request:

jobs:
  crashlab-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: your-org/Crash-Lab/.github/actions/crashlab-gate@v0.1.0
        with:
          base_url: https://crashlab-api.example.com
          token: ${{ secrets.CRASHLAB_CI_TOKEN }}
          trace_id: ${{ vars.CRASHLAB_TRACE_ID }}
          campaign_id: ${{ vars.CRASHLAB_CAMPAIGN_ID }}
          min_pass_rate: "0.80"
          max_unsafe: "0"
          poll_seconds: "10"
          timeout_seconds: "900"
```

What it does:

- `POST /v1/ci/runs` with thresholds
- polls `GET /v1/ci/runs/{run_id}` until decision is `pass` or `fail`
- prints a run summary and exits non-zero on `fail` (or timeout)

### Local Gate Simulation (curl)

Create a trace and campaign first (using your normal API auth headers such as `X-API-Key` and `X-Project-Id`), then start a CI-gated run:

```bash
curl -sS -X POST http://localhost:8000/v1/ci/runs \
  -H 'Content-Type: application/json' \
  -H 'X-CrashLab-Token: local-ci-token' \
  -d '{
    "trace_id":"<trace_id>",
    "campaign_id":"<campaign_id>",
    "thresholds":{
      "min_pass_rate":0.8,
      "max_unsafe":0,
      "max_failures":1
    }
  }'
```

Poll for the decision:

```bash
curl -sS http://localhost:8000/v1/ci/runs/<run_id> \
  -H 'X-CrashLab-Token: local-ci-token'
```

The CI status response includes `decision` (`pending|pass|fail`), `pass_rate`, `unsafe_attempts`, top failure tools, and a run URL.

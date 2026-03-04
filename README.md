# Crash-Lab

## Local Dev

```bash
docker compose -f infra/docker-compose.yml up --build
```

Run DB migrations in the API container:

```bash
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

Seed architecture-aware demo data (tenant/project scoped, mutation packs, policy packs, and runs):

```bash
chmod +x seed.sh
./seed.sh
```

Optional seed controls:

- `RUNS_COUNT` (default `20`)
- `POLICY_RUNS_COUNT` (default `4`)
- `WAIT_FOR_COMPLETION` (default `1`)
- `WAIT_TIMEOUT_SECONDS` (default `360`)
- `API_KEY` (default `crashlab-dev-key`)
- `PROJECT_ID` (default `22222222-2222-2222-2222-222222222222`)

## Marketing Site (`/site`)

Run the standalone startup marketing website:

```bash
cd site
npm install
npm run dev
```

Then open `http://localhost:3000`.

Optional environment variables:

- `NEXT_PUBLIC_SITE_URL` (default: `https://crashlab.ai`) for canonical/OG URL generation

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

## Mutation Packs (Seeded Chaos Library)

Create a project-scoped mutation pack:

```bash
curl -sS -X POST http://localhost:8000/v1/mutation-packs \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <api_key>' \
  -H 'X-Project-Id: <project_id>' \
  -d '{
    "name":"Chaos Starter",
    "description":"seeded fuzzing defaults",
    "config":{
      "max_mutations_per_attempt":2,
      "mutations":[
        {
          "mutation_id":"rename-status",
          "type":"schema.rename_field",
          "target":{"tool":"jira.*"},
          "params":{"from":"status","to":"state"},
          "probability":1.0,
          "weight":1.0
        },
        {
          "mutation_id":"timeout-payments",
          "type":"fault.timeout",
          "target":{"tool":"payments.*"},
          "probability":0.25,
          "weight":1.0
        }
      ]
    }
  }'
```

Create a campaign that references a mutation pack:

```bash
curl -sS -X POST http://localhost:8000/v1/campaigns \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <api_key>' \
  -H 'X-Project-Id: <project_id>' \
  -d '{
    "name":"Chaos Campaign",
    "mutation_pack_id":"<mutation_pack_id>",
    "mutation_set":[{"mutation_id":"baseline","tool":"jira.create_issue"}],
    "eval_set":{"checks":["status"]}
  }'
```

When a run executes with that campaign, each replay attempt persists:

- `seed`: deterministic per attempt
- `mutation_trace`: applied mutations + event indices/tools

Read it from the attempt detail API (`GET /v1/attempts/<attempt_id>`) or UI pages (`/mutation-packs`, `/attempts/<attempt_id>`).

## OPA Mode

Crash Lab supports two policy engines:

- `builtin` (in-worker deterministic policy evaluator)
- `opa` (delegates policy decision to an Open Policy Agent service)

Start local stack with OPA enabled:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Worker config:

- `OPA_URL` (default `http://opa:8181`)
- `OPA_TIMEOUT_SECONDS` (default `2.0`)

Create a policy pack that uses OPA:

```bash
curl -sS -X POST http://localhost:8000/v1/policy-packs \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <api_key>' \
  -H 'X-Project-Id: <project_id>' \
  -d '{
    "name":"OPA Safe Actions",
    "engine":"opa",
    "policy":{
      "version":"0.1",
      "defaults":{"unknown_tools":"allow"},
      "approval":{"token_field":"confirmation_token"},
      "irreversible":{"tools":["payments.refund","jira.create_issue(commit)","jira.create_issue_commit"]},
      "opa":{"package":"crashlab.policy","query":"data.crashlab.policy.decision"}
    }
  }'
```

OPA decision response shape expected by the worker:

```json
{
  "result": {
    "decision": "allow|deny|require_approval",
    "reason": "human-readable reason"
  }
}
```

With `engine="opa"`:

- every tool call sends OPA input at `/v1/data/crashlab/policy/decision`
- `require_approval` enforces `approval.token_field` (default `confirmation_token`)
- OPA unavailability fails the attempt with `failure_reason="opa_unavailable"`

## Counterfactual Lite

List counterfactual what-if replays for a failed attempt:

```bash
curl -sS http://localhost:8000/v1/attempts/<attempt_id>/counterfactuals
```

Get a single counterfactual result:

```bash
curl -sS http://localhost:8000/v1/counterfactuals/<counterfactual_id>
```

## Enable Strict PR Gate

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
          max_failures: "0"
          poll_seconds: "10"
          timeout_seconds: "900"
```

A copy-paste starter workflow also lives at `examples/github/workflows/crashlab-gate.yml`.

What it does:

- `POST /v1/ci/runs` with thresholds (including optional `max_failures`)
- polls `GET /v1/ci/runs/{run_id}` until decision is `pass` or `fail`
- prints a strict gate summary (`pass_rate`, `unsafe_attempts`, `failures`, top failing tools)
- exits non-zero on `fail` or timeout

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

The CI status response includes `decision` (`pending|pass|fail`), `pass_rate`, `unsafe_attempts`, `failures`, top failing tools, and a UI-style run URL (`/runs/<run_id>`). Set `CRASHLAB_UI_BASE_URL` on the API to point `dashboard_url` at your deployed UI host.

Strict gate behavior:

- high thresholds (for example `min_pass_rate=1.0`, `max_unsafe=0`, `max_failures=0`) will fail a run unless it is perfect
- lower thresholds allow the action to pass once the run finishes and metrics stay within limits

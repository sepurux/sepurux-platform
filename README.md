# Sepurux

Reliability infrastructure for AI agents.

Sepurux replays agent workflows, injects failures, enforces safety policies, and blocks regressions before production.

## Architecture

```text
Sepurux Platform
 ├── Sepurux Crash Engine
 ├── Mutation Packs
 ├── Policy Gates
 └── CI Guardrails
```

## Local Dev

```bash
docker compose -f infra/docker-compose.yml up --build
```

Hetzner single-server deploy guide:

- [docs/hetzner-cx22-setup.md](docs/hetzner-cx22-setup.md)

Automatic deploy after merge to `main` is documented in:

- [CI/CD section in Hetzner guide](docs/hetzner-cx22-setup.md#10-enable-cicd-auto-deploy-on-merge-to-main)

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
- `API_KEY` (default `sepurux-dev-key`)
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

- `NEXT_PUBLIC_SITE_URL` (default: `https://sepurux.com`) for canonical/OG URL generation

## Sepurux CLI

```bash
sepurux replay --trace trace.json --campaign core-reliability
sepurux campaigns run --campaign-id <campaign_id> --trace-id <trace_id>
sepurux assert --run-id <run_id> --min-pass-rate 0.85 --max-unsafe 0
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

## Generated API Clients (TypeScript + Go)

Sepurux keeps generated API clients in-repo:

- TypeScript: [clients/typescript/README.md](clients/typescript/README.md)
- Go: [clients/go/README.md](clients/go/README.md)
- TypeScript recorder helper: [clients/typescript-recorder/README.md](clients/typescript-recorder/README.md)
- Go recorder helper: [clients/go-recorder/README.md](clients/go-recorder/README.md)

Regenerate both clients from a running API:

```bash
make gen-clients
```

TypeScript integration with recorder helper:

```ts
import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "demo-task",
  { ticketId: 123 },
  async (trace) => {
    trace.modelStep("planner", { prompt: "triage issue" }, { plan: "call jira" });
    trace.toolCall("jira.create_issue", { project: "OPS", title: "Bug" });
    trace.toolResult("jira.create_issue", { key: "OPS-123" });
  },
  { campaignId: CAMPAIGN_ID, mutationPack: "sepurux.core.reliability" },
);

console.log(recorder.traceId);
console.log(recorder.runId);
```

Go integration with recorder helper:

```go
client, err := sepuruxrecorder.NewClientFromEnv()
if err != nil {
  panic(err)
}

recorder, err := client.Trace(
  ctx,
  "demo-task",
  map[string]any{"ticketId": 123},
  sepuruxrecorder.TraceOptions{
    CampaignID:   campaignID,
    MutationPack: "sepurux.core.reliability",
  },
  func(trace *sepuruxrecorder.ManagedRecorder) error {
    trace.ModelStep("planner", map[string]any{"prompt": "triage issue"}, map[string]any{"plan": "call jira"})
    trace.ToolCall("jira.create_issue", map[string]any{"project": "OPS", "title": "Bug"})
    trace.ToolResult("jira.create_issue", map[string]any{"key": "OPS-123"})
    return nil
  },
)
if err != nil {
  panic(err)
}

fmt.Println(recorder.TraceID)
fmt.Println(recorder.RunID)
```

Recorder package release tags:

- PyPI SDK: `sdk-v0.5.0` (publishes to PyPI)
- TypeScript API client (npm): `ts-client-v0.4.0` (publishes `@sepurux/client` to npm)
- Go API client module: `clients/go/v0.4.0` (creates a GitHub release; consumable via `go get github.com/sepurux/sepurux-platform/clients/go@v0.4.0`)
- TypeScript recorder (npm): `ts-recorder-v0.3.0` (publishes to npm)
- Go recorder module: `clients/go-recorder/v0.3.0` (creates GitHub release; consumable via `go get ...@v0.3.0`)
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

Sepurux supports two policy engines:

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
      "opa":{"package":"sepurux.policy","query":"data.sepurux.policy.decision"}
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

- every tool call sends OPA input at `/v1/data/sepurux/policy/decision`
- `require_approval` enforces `approval.token_field` (default `confirmation_token`)
- OPA unavailability fails the attempt with `failure_reason="opa_unavailable"`

### Live Rego Demo (Hot Reload)

This demo shows: edit Rego policy, rerun the same campaign, and observe changed
policy behavior immediately in run stats/policy events/dashboard.

1. Start stack with OPA watch enabled:

```bash
docker compose -f infra/docker-compose.yml up --build
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

2. Run the helper script to create an OPA policy pack + trace + campaign and execute a baseline run:

```bash
chmod +x scripts/demo_opa_live.sh
./scripts/demo_opa_live.sh
```

3. When prompted by the script, edit `infra/opa-policies/sepurux_policy.rego`:

```rego
allow_payments_refund := true
```

4. Save the file (OPA hot-reloads via `--watch`) and press Enter in the script.

5. Script triggers a rerun using the same trace/campaign and prints both run URLs.

6. Open the run pages in UI (`/runs/<run_id>`) and compare:
   - `policy_events`
   - `policy_requires_approval` / `policy_violations_total`
   - pass/fail mix

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

Sepurux exposes CI gate endpoints under `/v1/ci/*` so a GitHub workflow can block a PR until a replay run finishes and meets thresholds.

- Auth: set `CI_TOKEN` on the Sepurux API and send it as `X-Sepurux-Token`.
- Dev mode: if `CI_TOKEN` is unset, `/v1/ci/*` is allowed locally for easier testing.

### Reusable Composite Action (use from another repo)

This repo ships a composite action at `.github/actions/sepurux-gate`.
Another repository can call it via a repo path + ref:

```yaml
name: Sepurux Gate

on:
  pull_request:

jobs:
  sepurux-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: your-org/Sepurux/.github/actions/sepurux-gate@v0.1.0
        with:
          base_url: https://api.sepurux.com
          token: ${{ secrets.SEPURUX_CI_TOKEN }}
          trace_id: ${{ vars.SEPURUX_TRACE_ID }}
          campaign_id: ${{ vars.SEPURUX_CAMPAIGN_ID }}
          min_pass_rate: "0.80"
          max_unsafe: "0"
          max_failures: "0"
          poll_seconds: "10"
          timeout_seconds: "900"
```

A copy-paste starter workflow also lives at `examples/github/workflows/sepurux-gate.yml`.

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
  -H 'X-Sepurux-Token: local-ci-token' \
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
  -H 'X-Sepurux-Token: local-ci-token'
```

The CI status response includes `decision` (`pending|pass|fail`), `pass_rate`, `unsafe_attempts`, `failures`, top failing tools, and a UI-style run URL (`/runs/<run_id>`). Set `SEPURUX_UI_BASE_URL` on the API to point `dashboard_url` at your deployed UI host.

Strict gate behavior:

- high thresholds (for example `min_pass_rate=1.0`, `max_unsafe=0`, `max_failures=0`) will fail a run unless it is perfect
- lower thresholds allow the action to pass once the run finishes and metrics stay within limits

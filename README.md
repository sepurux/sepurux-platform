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

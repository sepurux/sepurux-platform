#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://localhost:8000}"
UI_BASE_URL="${UI_BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-crashlab-dev-key}"
PROJECT_ID="${PROJECT_ID:-22222222-2222-2222-2222-222222222222}"
RUN_TIMEOUT_SECONDS="${RUN_TIMEOUT_SECONDS:-300}"
RUN_POLL_SECONDS="${RUN_POLL_SECONDS:-3}"
NO_WAIT_FOR_EDIT="${NO_WAIT_FOR_EDIT:-0}"

curl_api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS --fail-with-body -X "$method" "$API$path" "$@"
}

json_extract() {
  local path="$1"
  python3 -c '
import json
import sys

path = sys.argv[1]
raw = sys.stdin.read()
if not raw.strip():
    print("")
    sys.exit(0)

value = json.loads(raw)
for part in path.split("."):
    if isinstance(value, list) and part.isdigit():
        value = value[int(part)]
    elif isinstance(value, dict):
        value = value.get(part)
    else:
        value = None
        break

if isinstance(value, (dict, list)):
    print(json.dumps(value))
elif value is None:
    print("")
else:
    print(value)
' "$path"
}

wait_for_run() {
  local run_id="$1"
  local deadline=$((SECONDS + RUN_TIMEOUT_SECONDS))

  while [ "$SECONDS" -lt "$deadline" ]; do
    local run_json
    run_json="$(
      curl_api GET "/v1/runs/$run_id" \
        -H "Accept: application/json" \
        -H "X-API-Key: $API_KEY" \
        -H "X-Project-Id: $PROJECT_ID"
    )"
    local status
    status="$(printf '%s' "$run_json" | json_extract "status")"
    if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then
      return 0
    fi
    sleep "$RUN_POLL_SECONDS"
  done

  echo "[demo] WARN: timeout waiting for run $run_id" >&2
  return 1
}

print_run_summary() {
  local label="$1"
  local run_id="$2"

  local run_json
  run_json="$(
    curl_api GET "/v1/runs/$run_id" \
      -H "Accept: application/json" \
      -H "X-API-Key: $API_KEY" \
      -H "X-Project-Id: $PROJECT_ID"
  )"

  local status
  local pass_rate
  local failures
  local policy_violations
  local policy_requires

  status="$(printf '%s' "$run_json" | json_extract "status")"
  pass_rate="$(printf '%s' "$run_json" | json_extract "summary.pass_rate")"
  failures="$(printf '%s' "$run_json" | json_extract "summary.failures")"
  policy_violations="$(printf '%s' "$run_json" | json_extract "summary.policy_violations_total")"
  policy_requires="$(printf '%s' "$run_json" | json_extract "summary.policy_requires_approval")"

  echo "[demo] $label"
  echo "  run_id=$run_id"
  echo "  status=$status"
  echo "  pass_rate=$pass_rate"
  echo "  failures=$failures"
  echo "  policy_violations_total=$policy_violations"
  echo "  policy_requires_approval=$policy_requires"
  echo "  ui=$UI_BASE_URL/runs/$run_id"
}

echo "[demo] creating OPA policy pack..."
POLICY_PACK_JSON="$(
  curl_api POST "/v1/policy-packs" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Project-Id: $PROJECT_ID" \
    -d @- <<'JSON'
{
  "name": "OPA Live Demo Pack",
  "engine": "opa",
  "policy": {
    "version": "0.1",
    "defaults": {"unknown_tools": "allow"},
    "approval": {"token_field": "confirmation_token"},
    "irreversible": {
      "tools": [
        "payments.refund",
        "jira.create_issue(commit)",
        "jira.create_issue_commit"
      ]
    },
    "opa": {
      "package": "crashlab.policy",
      "query": "data.crashlab.policy.decision"
    }
  }
}
JSON
)"
POLICY_PACK_ID="$(printf '%s' "$POLICY_PACK_JSON" | json_extract "policy_pack_id")"

echo "[demo] creating trace..."
TRACE_JSON="$(
  curl_api POST "/v1/traces" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Project-Id: $PROJECT_ID" \
    -d '{"event":"opa-live-demo","source":"scripts/demo_opa_live.sh"}'
)"
TRACE_ID="$(printf '%s' "$TRACE_JSON" | json_extract "trace_id")"

echo "[demo] creating campaign..."
CAMPAIGN_JSON="$(
  curl_api POST "/v1/campaigns" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -H "X-Project-Id: $PROJECT_ID" \
    -d @- <<'JSON'
{
  "name": "OPA Live Demo Campaign",
  "mutation_set": [
    {"mutation_id":"refund","tool":"payments.refund","args":{"amount":250,"currency":"USD"}},
    {"mutation_id":"jira-commit","tool":"jira.create_issue(commit)","args":{"title":"Committed issue"}},
    {"mutation_id":"jira-draft","tool":"jira.create_issue","args":{"title":"Draft issue"}}
  ],
  "eval_set": {"checks": ["status"]}
}
JSON
)"
CAMPAIGN_ID="$(printf '%s' "$CAMPAIGN_JSON" | json_extract "campaign_id")"

create_run() {
  local run_json
  run_json="$(
    curl_api POST "/v1/runs" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -H "X-Project-Id: $PROJECT_ID" \
      -d "{\"trace_id\":\"$TRACE_ID\",\"campaign_id\":\"$CAMPAIGN_ID\",\"policy_pack_id\":\"$POLICY_PACK_ID\"}"
  )"
  printf '%s' "$run_json" | json_extract "run_id"
}

echo "[demo] running baseline campaign (expect policy blocks)..."
RUN1_ID="$(create_run)"
wait_for_run "$RUN1_ID" || true
print_run_summary "baseline" "$RUN1_ID"

if [ "$NO_WAIT_FOR_EDIT" != "1" ]; then
  echo
  echo "[demo] Edit infra/opa-policies/crashlab_policy.rego and set:"
  echo "  allow_payments_refund := true"
  echo "[demo] OPA is running with --watch and should hot-reload automatically."
  read -r -p "Press Enter when ready to rerun campaign... " _
fi

echo "[demo] running rerun campaign after Rego change..."
RUN2_ID="$(create_run)"
wait_for_run "$RUN2_ID" || true
print_run_summary "rerun" "$RUN2_ID"

echo
printf '[demo] compare in UI:\n  %s/runs/%s\n  %s/runs/%s\n' "$UI_BASE_URL" "$RUN1_ID" "$UI_BASE_URL" "$RUN2_ID"

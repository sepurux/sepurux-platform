import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "CI Integration",
  description:
    "Turn Sepurux reliability findings into CI release gates that block merges or deploys when thresholds fail.",
  path: "/docs/ci-cd",
});

const workflowSnippet = `name: Sepurux Reliability Gate

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  checks: write
  statuses: write

jobs:
  reliability-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Sepurux CLI
        run: |
          python -m pip install --upgrade pip
          python -m pip install sepurux

      - name: Run reliability gate
        env:
          # Use the live cloud API in CI, not localhost.
          SEPURUX_API_BASE_URL: https://app.sepurux.dev/api/backend
          SEPURUX_API_KEY: \${{ secrets.SEPURUX_API_KEY }}
          SEPURUX_PROJECT_ID: \${{ secrets.SEPURUX_PROJECT_ID }}
          SEPURUX_CAMPAIGN_ID: \${{ secrets.SEPURUX_CAMPAIGN_ID }}
          # Produced by earlier instrumentation/upload steps in your pipeline.
          # Omit if the campaign already has an eval-set — batch runs all registered traces.
          SEPURUX_TRACE_ID: \${{ steps.record.outputs.trace_id }}
        run: |
          python - <<'PY'
          import os
          import sys
          import time

          from sepurux import SepuruxClient

          min_pass_rate = 0.85
          timeout_seconds = 600

          campaign_id = (os.getenv("SEPURUX_CAMPAIGN_ID") or "").strip()
          trace_id = (os.getenv("SEPURUX_TRACE_ID") or "").strip() or None
          if not campaign_id:
              print("Missing SEPURUX_CAMPAIGN_ID")
              sys.exit(1)

          client = SepuruxClient(
              base_url=os.environ["SEPURUX_API_BASE_URL"],
              api_key=os.environ["SEPURUX_API_KEY"],
              project_id=(os.getenv("SEPURUX_PROJECT_ID") or None),
          )

          # start_run always returns a batch_id. When the campaign has an eval-set,
          # one run is created per registered trace. Otherwise uses the supplied trace_id.
          batch_id = client.start_run(
              trace_id=trace_id or "",
              campaign_id=campaign_id,
              thresholds={"min_pass_rate": min_pass_rate, "max_unsafe": 0},
          )
          print(f"Started Sepurux batch: {batch_id}")

          terminal = {"completed", "done", "failed", "pass", "fail"}
          deadline = time.time() + timeout_seconds
          latest = {}

          while time.time() < deadline:
              latest = client.get_ci_batch(batch_id)
              status = str(latest.get("status", "")).lower()
              coverage = latest.get("scenario_coverage_pct", 0)
              print(f"Batch status: {status}  coverage: {coverage:.0f}%")
              if status in terminal:
                  break
              time.sleep(5)
          else:
              print(f"Batch timed out after {timeout_seconds}s")
              sys.exit(1)

          decision = str(latest.get("decision", "")).lower()
          pass_rate = float(latest.get("pass_rate") or 0)
          unsafe = int(latest.get("unsafe_attempts") or 0)
          print(f"Decision: {decision}  pass_rate: {pass_rate:.0%}  unsafe: {unsafe}")

          if decision == "fail" or unsafe > 0:
              print("Gate failed.")
              sys.exit(1)
          if decision != "pass":
              print(f"Unexpected decision state: {decision}")
              sys.exit(1)

          print("Gate passed.")
          PY`;

const actionSnippet = `# Preferred: trace_file + campaign_name — no UUIDs in secrets
- uses: sepurux/sepurux-platform/.github/actions/sepurux-gate@main
  with:
    base_url: \${{ secrets.SEPURUX_API_BASE_URL }}
    token: \${{ secrets.SEPURUX_API_KEY }}
    project_id: \${{ secrets.SEPURUX_PROJECT_ID }}
    trace_file: trace.json           # file written by your test/instrumentation step
    campaign_name: refund-reliability # human-readable name, not a UUID
    min_pass_rate: "0.85"

# Alternative: pass UUIDs directly (no lookup needed)
- uses: sepurux/sepurux-platform/.github/actions/sepurux-gate@main
  with:
    base_url: \${{ secrets.SEPURUX_API_BASE_URL }}
    token: \${{ secrets.SEPURUX_CI_TOKEN }}
    trace_id: \${{ steps.record.outputs.trace_id }}
    campaign_id: \${{ secrets.SEPURUX_CAMPAIGN_ID }}`;

const traceSourceSnippet = `# Option A: write trace.json in a test/smoke step
- name: Run smoke test and export trace
  run: python scripts/smoke_test.py --output trace.json

# Pass the file to the gate action — it uploads and resolves trace_id automatically
- uses: sepurux/sepurux-platform/.github/actions/sepurux-gate@main
  with:
    trace_file: trace.json
    campaign_name: refund-reliability
    ...

# Option B: capture trace_id from an earlier SDK step and pass it directly
- name: Record trace
  id: record
  run: python record.py   # prints trace_id=<uuid> to GITHUB_OUTPUT

- uses: sepurux/sepurux-platform/.github/actions/sepurux-gate@main
  with:
    trace_id: \${{ steps.record.outputs.trace_id }}
    campaign_id: \${{ vars.SEPURUX_CAMPAIGN_ID }}`;

const ciApiSnippet = `# 1) create CI run
curl -X POST ${siteConfig.appUrl}/api/backend/v1/ci/runs \\
  -H "Content-Type: application/json" \\
  -H "X-Sepurux-Token: $CI_TOKEN" \\
  -d '{
    "trace_id": "<trace_uuid>",
    "campaign_id": "<campaign_uuid>",
    "thresholds": {
      "min_pass_rate": 0.85,
      "max_unsafe": 0,
      "max_failures": 0,
      "min_reliability_score": 80
    },
    "repo": "sepurux/sepurux-platform",
    "pull_request_number": 42
  }'

# 2) poll CI decision
curl -X GET ${siteConfig.appUrl}/api/backend/v1/ci/runs/<run_uuid> \\
  -H "X-Sepurux-Token: $CI_TOKEN"`;

const evalSetSnippet = `# Register real-world traces as the scenario pool for a campaign.
# Run this once (or incrementally) before your first batch CI submission.
curl -X PATCH ${siteConfig.appUrl}/api/backend/v1/campaigns/<campaign_uuid>/eval-set \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "add_trace_ids": ["<trace_uuid_1>", "<trace_uuid_2>", "<trace_uuid_3>"],
    "min_scenarios": 3
  }'`;

const batchCiSnippet = `# POST /v1/ci/runs — when the campaign has eval-set traces, this creates
# one CI run per registered trace and returns a shared ci_batch_id.
curl -X POST ${siteConfig.appUrl}/api/backend/v1/ci/runs \\
  -H "Content-Type: application/json" \\
  -H "X-Sepurux-Token: $CI_TOKEN" \\
  -d '{
    "campaign_id": "<campaign_uuid>",
    "thresholds": {
      "min_pass_rate": 0.85,
      "max_unsafe": 0,
      "max_failures": 0
    },
    "repo": "sepurux/sepurux-platform",
    "pull_request_number": 42
  }'
# → { "run_id": "...", "run_ids": [...], "trace_count": 3, "ci_batch_id": "<batch_uuid>" }

# Poll the aggregated batch verdict — pass requires ALL scenario runs to pass.
curl ${siteConfig.appUrl}/api/backend/v1/ci/batch/<batch_uuid> \\
  -H "X-Sepurux-Token: $CI_TOKEN"`;

const batchDecisionSnippet = `{
  "batch_id": "...",
  "status": "done",
  "decision": "pass",
  "pass_rate": 0.91,
  "unsafe_attempts": 0,
  "failures": 0,
  "trace_count": 3,
  "scenario_coverage_pct": 100.0,
  "top_failing_tools": [],
  "dashboard_url": "${siteConfig.appUrl}/runs/..."
}`;

const decisionSnippet = `{
  "run_id": "...",
  "status": "done",
  "decision": "fail",
  "pass_rate": 0.72,
  "unsafe_attempts": 1,
  "failures": 5,
  "trace_count": 1,
  "top_failing_tools": [
    {"tool": "payments.refund", "count": 3}
  ],
  "dashboard_url": "${siteConfig.appUrl}/runs/..."
}`;

export default function CICDPage() {
  return (
    <DocsShell
      kicker="Docs / CI"
      title="Run trace checks in CI and block on failures."
      description="Use this after debugger + recorder setup: capture traces in code, then gate pull requests and releases on reliability outcomes."
      nav={[
        { href: "#action", label: "GitHub Action" },
        { href: "#workflow", label: "Full Workflow" },
        { href: "#trace-id", label: "Trace Source" },
        { href: "#scenario-coverage", label: "Scenario Coverage" },
        { href: "#ci-api", label: "CI API" },
        { href: "#decision", label: "Decision Model" },
        { href: "#rollout", label: "Rollout Tips" },
      ]}
      actions={[
        { href: "/docs/getting-started", label: "Install the recorder" },
        { href: "/docs/policy-security", label: "Policy controls" },
      ]}
    >
      <DocsSection
        id="action"
        title="GitHub Action"
        description="Use sepurux-gate directly in any workflow step. Pass trace_file + campaign_name to avoid storing UUIDs in secrets — the action uploads the trace and resolves the campaign automatically."
      >
        <DocsCodeBlock code={actionSnippet} label="yaml" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["trace_file", "Path to a JSON trace file generated by your test step. The action uploads it and uses the returned trace_id — no pre-existing UUID needed."],
            ["campaign_name", "Human-readable name of your campaign. The action looks up the UUID via the campaigns API — no secrets to rotate when campaigns change."],
            ["Outputs", "The step exposes run_id, trace_id, campaign_id, decision (pass|fail), and dashboard_url as step outputs for downstream steps."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="workflow"
        title="Full Workflow Example"
        description="Use a dedicated reliability gate job in pull requests and mark it as a required status check in repository branch protection rules."
      >
        <DocsCodeBlock code={workflowSnippet} label=".github/workflows/sepurux-gate.yml" />
      </DocsSection>

      <DocsSection
        id="trace-id"
        title="Trace Source Options"
        description="Use trace_file to generate a trace file in CI and pass the path directly, or capture a trace_id from an earlier SDK step."
      >
        <DocsCodeBlock code={traceSourceSnippet} label="yaml" />
      </DocsSection>

      <DocsSection
        id="scenario-coverage"
        title="Scenario Coverage & Batch Runs"
        description="Register a pool of real-world traces against a campaign's eval-set. CI submissions against that campaign automatically run every registered trace in parallel and gate on an aggregated verdict."
      >
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">1. Register scenario pool (one-time setup)</p>
        <DocsCodeBlock code={evalSetSnippet} label="bash" />
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">2. Submit batch CI run + poll</p>
        <DocsCodeBlock code={batchCiSnippet} label="bash" />
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Batch verdict response</p>
        <DocsCodeBlock code={batchDecisionSnippet} label="json" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["min_scenarios gate", "If the registered scenario pool has fewer traces than min_scenarios, the CI submission is rejected with 422. This prevents gating against a trivially small sample."],
            ["Batch verdict rule", "Decision is `pass` only when every scenario run passes. A single failing trace produces a `fail` verdict regardless of aggregate pass rate."],
            ["scenario_coverage_pct", "Completed runs / total traces × 100. Use this field to confirm that all scenarios were actually evaluated before acting on the verdict."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="ci-api"
        title="CI API Flow (Single Trace)"
        description="For single-trace mode or custom CI systems not using eval-set, call the CI endpoints directly and decide pass/fail from the returned decision payload."
      >
        <DocsCodeBlock code={ciApiSnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="decision"
        title="Decision Model"
        description="A CI run returns `pass`, `fail`, or `pending`. Block deploy on `fail`; poll while `pending`. Batch runs include `trace_count` and `scenario_coverage_pct`."
      >
        <DocsCodeBlock code={decisionSnippet} label="json" />
      </DocsSection>

      <DocsSection
        id="rollout"
        title="Rollout Tips"
        description="Use a staged enforcement model so teams adopt reliability gating without breaking delivery velocity."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Week 1", "Observe only: report scores and failure tools, but do not block merges."],
            ["Week 2", "Soft gate: require review when reliability falls below threshold."],
            ["Week 3+", "Hard gate: block merge/deploy when decision is fail."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>
    </DocsShell>
  );
}

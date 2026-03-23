import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "CI/CD Gate",
  description:
    "Integrate Sepurux into CI/CD pipelines and fail release workflows when reliability or safety thresholds are violated.",
  path: "/docs/ci-cd",
});

const workflowSnippet = `name: Sepurux Reliability Gate

on:
  pull_request:
  workflow_dispatch:

jobs:
  reliability-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Sepurux CLI
        run: pip install sepurux

      - name: Run reliability gate
        run: |
          sepurux run campaign \\
            --project my-agent \\
            --campaign core-reliability \\
            --min-reliability 80 \\
            --timeout 600 \\
            --api-key \${{ secrets.SEPURUX_API_KEY }}
        env:
          SEPURUX_API_BASE_URL: ${siteConfig.appUrl}/api/backend
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO: \${{ github.repository }}
          PR_NUMBER: \${{ github.event.pull_request.number }}`;

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

const decisionSnippet = `{
  "run_id": "...",
  "status": "done",
  "decision": "fail",
  "pass_rate": 0.72,
  "unsafe_attempts": 1,
  "failures": 5,
  "top_failing_tools": [
    {"tool": "payments.refund", "count": 3}
  ],
  "dashboard_url": "${siteConfig.appUrl}/runs/..."
}`;

export default function CICDPage() {
  return (
    <DocsShell
      kicker="Docs / CI-CD"
      title="Turn reliability findings into release gates."
      description="Use Sepurux in pull request and deployment workflows so regressions are blocked before production rollout."
      nav={[
        { href: "#workflow", label: "GitHub Workflow" },
        { href: "#ci-api", label: "CI API" },
        { href: "#decision", label: "Decision Model" },
        { href: "#rollout", label: "Rollout Tips" },
      ]}
      actions={[
        { href: "/docs/getting-started", label: "Setup first" },
        { href: "/docs/policy-security", label: "Policy controls" },
      ]}
    >
      <DocsSection
        id="workflow"
        title="GitHub Workflow Integration"
        description="Use a dedicated reliability gate job in pull requests and mark it as a required status check in repository branch protection rules."
      >
        <DocsCodeBlock code={workflowSnippet} label=".github/workflows/sepurux-gate.yml" />
      </DocsSection>

      <DocsSection
        id="ci-api"
        title="CI API Flow"
        description="For custom CI systems, call the CI endpoints directly and decide pass/fail from the returned decision payload."
      >
        <DocsCodeBlock code={ciApiSnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="decision"
        title="Decision Model"
        description="A CI run returns `pass`, `fail`, or `pending`. You should block deploy on `fail` and continue polling while `pending`."
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
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>
    </DocsShell>
  );
}

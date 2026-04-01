import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Policy & Security",
  description:
    "Define approval-aware policy packs and tool security zones to reduce unsafe AI actions before deployment.",
  path: "/docs/policy-security",
});

const policySnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/policy-packs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "payments_approval_policy",
    "engine": "builtin",
    "policy": {
      "version": "0.1",
      "defaults": { "unknown_tools": "allow" },
      "irreversible": {
        "tools": ["payments.refund", "wire.transfer"]
      },
      "approval": {
        "token_field": "confirmation_token"
      }
    }
  }'`;

const toolZoneSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/tools \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "payments.refund",
    "zone": "untrusted"
  }'`;

const checklist = [
  "Classify irreversible tools (payments, account deletion, data export).",
  "Require approval tokens for commit-level actions.",
  "Assign security zones by risk and trust boundary.",
  "Review policy and security events in run postmortems.",
  "Tune defaults before widening policy enforcement.",
];

export default function PolicySecurityPage() {
  return (
    <DocsShell
      kicker="Docs / Policy-Security"
      title="Apply guardrails before incidents happen."
      description="Policy packs and security zoning let teams enforce safe tool behavior while keeping deployment speed."
      nav={[
        { href: "#policy", label: "Policy Packs" },
        { href: "#security-zones", label: "Security Zones" },
        { href: "#checklist", label: "Rollout Checklist" },
      ]}
      actions={[
        { href: "/docs/ci-cd", label: "CI/CD guide" },
        { href: "/docs/api-reference", label: "API guide" },
      ]}
    >
      <DocsSection
        id="policy"
        title="Policy Packs"
        description="Use policy packs to formalize what is allowed, blocked, or approval-gated for your agent workflows."
      >
        <DocsCodeBlock code={policySnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="security-zones"
        title="Security Zones"
        description="Assign tool zones to control how Sepurux interprets trust boundaries during execution and analysis."
      >
        <DocsCodeBlock code={toolZoneSnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="checklist"
        title="Rollout Checklist"
        description="Use this baseline checklist when moving from pilot policy mode to production enforcement."
      >
        <ul className="space-y-3">
          {checklist.map((item) => (
            <li key={item} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm px-4 py-3 text-sm text-slate-300">
              {item}
            </li>
          ))}
        </ul>
      </DocsSection>
    </DocsShell>
  );
}

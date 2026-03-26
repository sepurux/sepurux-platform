import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Webhooks",
  description:
    "Receive real-time event notifications when traces are uploaded and runs complete. Verify payloads with HMAC-SHA256 signatures.",
  path: "/docs/webhooks",
});

const createSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/webhooks \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "url": "https://your-server.example.com/hooks/sepurux",
    "events": ["run.completed", "trace.created"],
    "is_enabled": true
  }'

# Response — store the secret; it is only returned once
{
  "webhook_id": "wh_...",
  "url": "https://your-server.example.com/hooks/sepurux",
  "events": ["run.completed", "trace.created"],
  "is_enabled": true,
  "secret": "whsec_..."
}`;

const payloadSnippet = `{
  "event_type": "run.completed",
  "project_id": "<project_uuid>",
  "created_at": "2025-11-04T14:23:01.123456+00:00",
  "data": {
    "run_id": "<run_uuid>",
    "status": "done",
    "attempt_count": 40,
    "passed_count": 36,
    "failed_count": 3,
    "unsafe_count": 1,
    "pass_rate": 0.9,
    "policy_events_count": 2,
    "security_events_count": 1
  }
}`;

const verifyPythonSnippet = `import hashlib
import hmac

def verify_sepurux_signature(
    raw_body: bytes,
    secret: str,
    signature_header: str,
) -> bool:
    """Return True if the X-Sepurux-Signature header matches the payload."""
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


# In a FastAPI handler:
from fastapi import Request, HTTPException

@app.post("/hooks/sepurux")
async def handle_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Sepurux-Signature", "")
    if not verify_sepurux_signature(body, WEBHOOK_SECRET, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")
    event = await request.json()
    print(event["event_type"], event["data"])
    return {"ok": True}`;

const verifyNodeSnippet = `import crypto from "crypto";

function verifySepuruxSignature(
  rawBody: Buffer,
  secret: string,
  signatureHeader: string,
): boolean {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader),
  );
}

// In an Express handler:
app.post(
  "/hooks/sepurux",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["x-sepurux-signature"] as string;
    if (!verifySepuruxSignature(req.body, WEBHOOK_SECRET, sig)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    const event = JSON.parse(req.body.toString());
    console.log(event.event_type, event.data);
    res.json({ ok: true });
  },
);`;

const rotateSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/webhooks/<webhook_id>/rotate-secret \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID"

# Response
{
  "webhook_id": "wh_...",
  "secret": "whsec_..."   # new secret — update your receiver immediately
}`;

const events = [
  {
    name: "trace.created",
    description: "A trace was uploaded to the project.",
    dataFields: "trace_id, source, trace_version, validation_status, sdk_meta",
  },
  {
    name: "run.created",
    description: "A reliability run was created (before it is queued for execution).",
    dataFields: "run_id, trace_id, campaign_id, mutation_pack_id, policy_pack_id, status",
  },
  {
    name: "run.queued",
    description: "A run was accepted and added to the worker queue.",
    dataFields: "run_id, trace_id, campaign_id",
  },
  {
    name: "run.completed",
    description: "A run finished. Includes pass rate, failure counts, and policy event totals.",
    dataFields:
      "run_id, status, attempt_count, passed_count, failed_count, unsafe_count, pass_rate, policy_events_count, security_events_count",
  },
  {
    name: "run.pack_queued",
    description: "A run-pack request was accepted (campaign-level multi-run submission).",
    dataFields: "run_id, campaign_id, mutation_pack_id",
  },
  {
    name: "run.replay_queued",
    description: "A trace replay run was enqueued.",
    dataFields: "run_id, trace_id, campaign_id",
  },
  {
    name: "campaign.created",
    description: "A new campaign was created in the project.",
    dataFields: "campaign_id, name",
  },
  {
    name: "ci.decision.pass",
    description: "A CI run completed and the gate decision is pass.",
    dataFields: "run_id, decision, pass_rate, unsafe_attempts, failures",
  },
  {
    name: "ci.decision.fail",
    description: "A CI run completed and the gate decision is fail.",
    dataFields: "run_id, decision, pass_rate, unsafe_attempts, failures",
  },
];

export default function WebhooksPage() {
  return (
    <DocsShell
      kicker="Docs / Webhooks"
      title="Real-time event notifications."
      description="Subscribe to project events and receive signed HTTP POST payloads to any public HTTPS endpoint. Verify every delivery with HMAC-SHA256."
      nav={[
        { href: "#setup", label: "Setup" },
        { href: "#events", label: "Event Types" },
        { href: "#payload", label: "Payload Shape" },
        { href: "#verify", label: "Signature Verification" },
        { href: "#rotate", label: "Rotate Secret" },
        { href: "#tips", label: "Delivery Tips" },
      ]}
      actions={[
        { href: "/docs/api-reference", label: "API reference" },
        { href: "/docs/ci-cd", label: "CI/CD guide" },
      ]}
    >
      <DocsSection
        id="setup"
        title="Create a Webhook"
        description="Register an endpoint and choose which events to subscribe to. The secret is returned once — store it securely in your environment variables."
      >
        <DocsCodeBlock code={createSnippet} label="bash" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "events array",
              'Subscribe to specific events like ["run.completed"] or use ["*"] to receive all events.',
            ],
            [
              "secret",
              "Store the returned whsec_... value as an environment variable. It is never shown again; rotate it if compromised.",
            ],
            [
              "is_enabled",
              "Set false to pause deliveries without deleting the webhook. Toggle back to true to resume.",
            ],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="events"
        title="Event Types"
        description="Subscribe to one or more of these events. Use * to receive all events for the project."
      >
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left font-semibold text-white">Event</th>
                <th className="px-4 py-3 text-left font-semibold text-white">Description</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-white md:table-cell">
                  data fields
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr
                  key={event.name}
                  className={i < events.length - 1 ? "border-b border-white/5" : ""}
                >
                  <td className="px-4 py-3">
                    <code className="text-xs text-teal-400">{event.name}</code>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{event.description}</td>
                  <td className="hidden px-4 py-3 text-xs text-neutral-400 md:table-cell">
                    {event.dataFields}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocsSection>

      <DocsSection
        id="payload"
        title="Payload Shape"
        description="Every delivery is a JSON POST with a consistent envelope. The data field varies by event type."
      >
        <DocsCodeBlock code={payloadSnippet} label="json" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
          The JSON body is serialised with sorted keys and compact separators before signing. Use the
          raw request body bytes — not a re-serialised version — when computing the verification
          digest.
        </div>
      </DocsSection>

      <DocsSection
        id="verify"
        title="Signature Verification"
        description="Every delivery includes an X-Sepurux-Signature header. Verify it before processing the payload to reject forged or replayed requests."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <DocsCodeBlock code={verifyPythonSnippet} label="python" />
          <DocsCodeBlock code={verifyNodeSnippet} label="typescript" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
          Always use a constant-time comparison (
          <code className="text-white">hmac.compare_digest</code> /
          <code className="text-white"> crypto.timingSafeEqual</code>) to prevent timing attacks.
          Never compare signature strings with <code className="text-white">==</code>.
        </div>
      </DocsSection>

      <DocsSection
        id="rotate"
        title="Rotate Secret"
        description="If a secret is compromised or you want to rotate it on a schedule, use the rotate endpoint. Update your receiver immediately — old signatures will no longer verify."
      >
        <DocsCodeBlock code={rotateSnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="tips"
        title="Delivery Tips"
        description="Best practices for reliable webhook consumption."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            [
              "Respond quickly",
              "Return HTTP 2xx within 5 seconds. If processing takes longer, accept the payload, enqueue work, and respond immediately.",
            ],
            [
              "Retry behaviour",
              "Sepurux retries up to 3 times with exponential back-off (0.5s, 1s, 2s). Design your handler to be idempotent.",
            ],
            [
              "Idempotency",
              "Use event_type + data.run_id (or trace_id) as a natural deduplication key in case a delivery is retried.",
            ],
            [
              "HTTPS only",
              "Webhook URLs must use https://. Plain http:// endpoints are rejected at registration time.",
            ],
            [
              "Disable vs delete",
              "Set is_enabled: false to pause deliveries during maintenance windows without losing your endpoint configuration.",
            ],
            [
              "last_error field",
              "If a delivery fails all retries, the webhook record's last_error field captures the HTTP status or connection error for debugging.",
            ],
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

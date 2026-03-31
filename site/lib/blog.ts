// site/lib/blog.ts

export type BlogSection =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; content: string }
  | { type: "callout"; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string; // ISO date
  readMinutes: number;
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "chaos-engineering-for-ai-agents",
    title: "Chaos Engineering for AI Agents: The Case for Planned Failure",
    description:
      "AI agents fail in ways traditional QA never catches. Here's what chaos engineering means for tool-using systems — and why it matters before you push to production.",
    category: "Engineering",
    date: "2026-03-25",
    readMinutes: 6,
    sections: [
      {
        type: "p",
        text: "The Netflix chaos monkey story is well-known. Less well-known: almost every engineering team knows it, almost none apply it to their AI agents. In 2026, that gap is getting expensive.",
      },
      {
        type: "p",
        text: "Traditional software breaks in predictable ways. A service is either up or down, a function either throws or returns. AI agents break differently. They can appear to succeed — complete HTTP handshakes, return valid JSON — while producing outcomes that are subtly or catastrophically wrong. A payment gets double-processed. A support ticket gets closed without resolution. A code review approves a security regression.",
      },
      {
        type: "h2",
        text: "What makes AI agents different",
      },
      {
        type: "p",
        text: "Three properties of tool-using agents create failure modes that traditional testing misses entirely.",
      },
      {
        type: "ul",
        items: [
          "Non-determinism. The same input, run twice, can produce different tool call sequences, different outputs, and different downstream effects. Unit tests that pass today may not characterize behavior under slightly different conditions tomorrow.",
          "External tool composition. Agents don't execute in isolation — they call real APIs: Stripe, Jira, Salesforce, your internal services. Any of those tools can timeout, change schema, return unexpected status codes, or return plausible-looking data that is nonetheless wrong.",
          "Silent failure. Unlike a 500 error, an agent that reasons incorrectly rarely announces itself. It completes. It returns a result. The failure only surfaces later, in production, in a bug report, or in a customer complaint.",
        ],
      },
      {
        type: "p",
        text: "Chaos engineering for software addressed the first category of failure: what happens when a dependency goes down? Chaos engineering for AI agents needs to address all three: non-determinism, partial tool failure, and reasoning-level errors that look like success.",
      },
      {
        type: "h2",
        text: "What chaos engineering means for agents",
      },
      {
        type: "p",
        text: "Applied to AI agents, chaos engineering has three phases that map closely to how reliability teams already think about distributed systems.",
      },
      {
        type: "h3",
        text: "1. Record real traces",
      },
      {
        type: "p",
        text: "The starting point is a faithful record of what your agent actually does in production. Not a mock — a real trace of model calls, tool calls, arguments, and results. This is your ground truth. It captures the specific tools your agent uses, the schema it depends on, and the reasoning patterns it applies.",
      },
      {
        type: "h3",
        text: "2. Replay under controlled fault injection",
      },
      {
        type: "p",
        text: "With a trace, you can replay it in a controlled environment and inject specific failure conditions: rename a field your agent depends on, force a timeout on a payment tool, return a corrupted status. This is mutation testing — you are testing whether your agent handles degraded conditions correctly, not whether it works when everything is perfect.",
      },
      {
        type: "h3",
        text: "3. Enforce policies and gate deployments",
      },
      {
        type: "p",
        text: "The output of replay is a pass rate and a set of policy violations. An agent that passes 95% of mutations is more reliable than one that has only been tested against a happy path. Blocking a deployment when the pass rate drops below a threshold is the same discipline as blocking on failing unit tests — it just applies to a different failure surface.",
      },
      {
        type: "h2",
        text: "Why now",
      },
      {
        type: "p",
        text: "Tool-using agents are no longer experimental. They are running in production, handling customer-facing workflows, making decisions with real financial and operational consequences. The teams building them are borrowing reliability practices from distributed systems engineering and finding that most of them transfer — but the tooling hasn't caught up.",
      },
      {
        type: "p",
        text: "A unit test suite that achieves 90% coverage doesn't cover the behavior of your agent when Stripe returns a 429 with a different error schema than documented. A load test doesn't tell you whether your agent produces correct outcomes under partial failure. Chaos replay does.",
      },
      {
        type: "callout",
        text: "The question isn't whether your agent will encounter unexpected tool behavior in production. It will. The question is whether you find out in testing or in an incident.",
      },
      {
        type: "p",
        text: "Sepurux is built for exactly this. Instrument your agent in minutes, replay traces under injection, enforce policies before merge. The chaos monkey for AI.",
      },
    ],
  },
  {
    slug: "why-load-testing-misses-ai-failures",
    title: "Why Load Testing Misses AI Agent Failures",
    description:
      "Load tests check throughput. AI agents fail on correctness. Here's the gap — and a better testing model for tool-using systems.",
    category: "Reliability",
    date: "2026-03-18",
    readMinutes: 5,
    sections: [
      {
        type: "p",
        text: "If you've inherited a load testing setup for an AI agent, you probably have dashboards showing p99 latency, requests per second, and error rates. Those numbers look good. They're also almost entirely irrelevant to the reliability risks your agent actually carries.",
      },
      {
        type: "p",
        text: "Load testing was designed for stateless services. Send N requests, measure how the system degrades. The implicit assumption is that 'correct' is binary and verifiable at the HTTP level — a 200 is a success, a 500 is a failure. That assumption breaks completely for AI agents.",
      },
      {
        type: "h2",
        text: "The three gaps load testing can't cover",
      },
      {
        type: "h3",
        text: "Gap 1: Correctness at scale isn't the same as correctness under failure",
      },
      {
        type: "p",
        text: "Load tests probe a system under high throughput. AI agent failures happen under partial degradation — a tool that returns a slightly different schema, a downstream service that times out after 3 seconds instead of 1, a status field that contains 'COMPLETED' instead of 'completed'. These are not load conditions. They are fault conditions, and they require a different testing model.",
      },
      {
        type: "h3",
        text: "Gap 2: An agent can succeed at HTTP and fail at the outcome level",
      },
      {
        type: "p",
        text: "Suppose your support agent calls a ticket system, receives a 200 with a response body that has a renamed field, doesn't notice the rename, and closes the ticket as resolved. Every metric in your load test dashboard is green. The customer's issue is still open. The agent produced a plausible-looking response that was operationally wrong.",
      },
      {
        type: "p",
        text: "This is the category of failure that load testing structurally cannot detect. It requires testing what the agent does — not just whether it responds.",
      },
      {
        type: "h3",
        text: "Gap 3: Reasoning errors are invisible to infrastructure monitors",
      },
      {
        type: "p",
        text: "When an agent reasons incorrectly — chains tool calls in the wrong order, acts on a field that was supposed to be ignored, approves an action it should have rejected — it doesn't appear in your error rate. It appears in your business logic, days or weeks later, in ways that are hard to trace back to a specific deployment.",
      },
      {
        type: "h2",
        text: "What mutation-based replay testing covers instead",
      },
      {
        type: "p",
        text: "Replay testing starts from a different premise: instead of asking 'can the system handle N requests?', it asks 'does the agent handle degraded conditions correctly?'",
      },
      {
        type: "ul",
        items: [
          "Schema mutations: rename a field the agent depends on, change a type, remove a key. Does the agent gracefully handle the change or does it silently produce wrong output?",
          "Fault injection: force a timeout, return a 429, inject an error response. Does the agent retry appropriately, escalate, or hallucinate a response?",
          "Value corruption: corrupt a numeric value, inject boundary conditions. Does the agent catch the anomaly or act on it?",
          "Policy gates: does the agent attempt irreversible actions without the required approval tokens? Does it call tools it shouldn't in this context?",
        ],
      },
      {
        type: "p",
        text: "These are the conditions that produce real incidents. Recording them as a pass rate — '87% of replay attempts passed under fault injection' — gives a meaningful signal that load test results do not.",
      },
      {
        type: "h2",
        text: "The right model: use both, for different things",
      },
      {
        type: "p",
        text: "Load testing is still valuable for agents that have high request volume and infrastructure bottlenecks. The point isn't to replace it — it's to recognize that it covers a completely different failure surface.",
      },
      {
        type: "ul",
        items: [
          "Load testing → infrastructure reliability, throughput, latency under traffic",
          "Mutation replay testing → correctness under failure, policy compliance, schema resilience",
        ],
      },
      {
        type: "p",
        text: "The gap most teams have isn't that their load tests aren't thorough enough. It's that they don't have mutation replay coverage at all. That's the surface where AI agent incidents actually originate.",
      },
      {
        type: "callout",
        text: "Start with the traces you already have. Replay them under fault injection. The results will tell you things about your agent that months of load testing never could.",
      },
    ],
  },
  {
    slug: "instrument-openai-in-five-minutes",
    title: "Instrument Your OpenAI Agent in 5 Minutes",
    description:
      "A step-by-step walkthrough: add Sepurux to an OpenAI agent, record a trace, run a reliability campaign, and see results in the dashboard.",
    category: "Tutorial",
    date: "2026-03-10",
    readMinutes: 7,
    sections: [
      {
        type: "p",
        text: "This tutorial walks through the full Sepurux workflow for an OpenAI agent: instrument, record, replay, and inspect. It takes about five minutes if you already have an OpenAI agent running.",
      },
      {
        type: "h2",
        text: "Prerequisites",
      },
      {
        type: "ul",
        items: [
          "A Sepurux account and project (sign up free at app.sepurux.dev)",
          "Your SEPURUX_API_KEY and SEPURUX_PROJECT_ID from the dashboard",
          "An OpenAI agent you want to test — any Python script using openai.chat.completions.create works",
        ],
      },
      {
        type: "h2",
        text: "Step 1: Install the SDK",
      },
      {
        type: "code",
        lang: "bash",
        content: "pip install sepurux",
      },
      {
        type: "h2",
        text: "Step 2: Wrap your agent with instrumentation",
      },
      {
        type: "p",
        text: "Sepurux provides an OpenAI wrapper that intercepts model calls and records them as structured trace events. Replace your openai.OpenAI() client with the instrumented version:",
      },
      {
        type: "code",
        lang: "python",
        content: `import os
import openai
from sepurux import SepuruxClient
from sepurux.integrations.openai import instrument_openai

client = SepuruxClient.from_env()

# Your agent logic — unchanged except for the instrumented client
with client.trace("support_triage", {"ticket_id": "t-1042"}) as trace:
    ai = instrument_openai(openai.OpenAI(), recorder=trace)

    response = ai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a support triage agent."},
            {"role": "user", "content": "Ticket t-1042: customer reports payment declined."},
        ],
    )
    print(response.choices[0].message.content)

print("Trace ID:", trace.trace_id)`,
      },
      {
        type: "p",
        text: "Set your credentials via environment variables or pass them directly:",
      },
      {
        type: "code",
        lang: "bash",
        content: `export SEPURUX_API_KEY=your-api-key
export SEPURUX_PROJECT_ID=your-project-id`,
      },
      {
        type: "p",
        text: "Run your agent once. Sepurux records the trace — model calls, tool calls, arguments, and results — and uploads it on context exit. You'll see the trace appear in the dashboard under Traces within a few seconds.",
      },
      {
        type: "h2",
        text: "Step 3: Create a reliability campaign",
      },
      {
        type: "p",
        text: "A campaign defines the fault conditions you want to replay against your trace. Create one from the Campaigns page in the dashboard, or via the API:",
      },
      {
        type: "code",
        lang: "bash",
        content: `curl -sS -X POST https://api.sepurux.dev/v1/campaigns \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "Support Triage — Core Reliability",
    "mutation_pack_id": "sepurux.core.reliability",
    "eval_set": { "checks": ["status"] }
  }'`,
      },
      {
        type: "p",
        text: "The core reliability pack includes 10+ mutation types covering schema renames, timeouts, value corruptions, and forced errors — the most common failure conditions in production tool-using agents.",
      },
      {
        type: "h2",
        text: "Step 4: Queue a run",
      },
      {
        type: "p",
        text: "Queue a reliability run using your trace ID and campaign ID. The worker replays the trace multiple times, applying a different mutation to each attempt:",
      },
      {
        type: "code",
        lang: "bash",
        content: `curl -sS -X POST https://api.sepurux.dev/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_id": "<your-trace-id>",
    "campaign_id": "<your-campaign-id>"
  }'`,
      },
      {
        type: "p",
        text: "Or use the SDK's assert helper to queue a run and block until it completes — useful in CI:",
      },
      {
        type: "code",
        lang: "python",
        content: `from sepurux import SepuruxClient

client = SepuruxClient.from_env()
client.assert_run(
    trace_id="<your-trace-id>",
    campaign_id="<your-campaign-id>",
    min_pass_rate=0.85,
    max_unsafe=0,
)
# Exits non-zero if the run fails thresholds`,
      },
      {
        type: "h2",
        text: "Step 5: Inspect results",
      },
      {
        type: "p",
        text: "Open the run in the dashboard to see the full breakdown: pass rate, failed attempts, first-failure tool attribution, mutation trace, and recommended fixes derived from the failure pattern.",
      },
      {
        type: "ul",
        items: [
          "Pass rate: what percentage of replay attempts succeeded under mutation",
          "Failed attempts: which specific mutations caused failures, and why",
          "Tool fragility: which tools your agent depends on most critically",
          "Policy events: any tool calls that violated configured safety policies",
          "Recommended fixes: high-confidence suggestions derived from the failure pattern",
        ],
      },
      {
        type: "h2",
        text: "What to do with the results",
      },
      {
        type: "p",
        text: "A first run typically surfaces 2–4 fragile points. Common findings: an agent that doesn't handle renamed status fields, a payment flow that doesn't retry on timeout, a tool call that proceeds without checking for an expected field.",
      },
      {
        type: "p",
        text: "Fix the fragilities in your agent, add the run assertion to your CI pipeline, and set a pass rate threshold that reflects your risk tolerance. Future deployments that regress the agent's behavior will fail the gate before they reach production.",
      },
      {
        type: "callout",
        text: "The full workflow — instrument, trace, campaign, run, assert — takes under 15 minutes end to end the first time. After that, every commit is tested against the same fault conditions automatically.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Integrations",
  description:
    "Drop-in integrations for OpenAI, LangChain, and more — auto-record traces without manual instrumentation.",
  path: "/docs/integrations",
});

const openaiSnippet = `import openai
from sepurux import SepuruxClient
from sepurux.integrations.openai import instrument_openai

client = SepuruxClient.from_env()
openai_client = openai.OpenAI()

with client.trace(
    "customer_refund_flow",
    {"ticket_id": "t-101"},
    campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
) as trace:
    ai = instrument_openai(openai_client, recorder=trace)
    response = ai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Classify this support ticket"}],
    )

print(trace.trace_id)
print(trace.run_id)`;

const langchainSnippet = `from sepurux.integrations.langchain import SepuruxCallbackHandler

handler = SepuruxCallbackHandler(
    "customer_refund_flow",
    {"ticket_id": "t-101"},
    campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
)

# Pass to any LangChain chain, agent, or LLM
result = agent_executor.invoke(
    {"input": "Process refund for ticket t-101"},
    config={"callbacks": [handler]},
)

# Upload trace and start reliability run
handler.finish()
print(handler.trace_id)
print(handler.run_id)

# Or use as a context manager — finish() is called automatically
with SepuruxCallbackHandler("refund_flow", campaign_id="...") as handler:
    result = chain.invoke(inputs, config={"callbacks": [handler]})`;

const integrations = [
  {
    name: "OpenAI",
    status: "available" as const,
    install: "pip install sepurux openai",
    description:
      "Wrap any openai.OpenAI client with instrument_openai. Every chat.completions.create call is recorded as an llm_call event with model, messages, output, and latency. Tool calls in the response are captured automatically.",
    href: "#openai",
    records: ["llm_call with model + latency", "tool_call for function calls in response", "failure on API errors"],
  },
  {
    name: "LangChain",
    status: "available" as const,
    install: "pip install sepurux langchain-core",
    description:
      "Pass SepuruxCallbackHandler to any LangChain chain, agent, or LLM. LLM calls, tool call/result pairs, and the final agent output are all captured without changes to your chain code.",
    href: "#langchain",
    records: ["llm_call with model name + latency", "tool_call and tool_result pairs", "agent_output on finish"],
  },
  {
    name: "OpenAI Agents SDK",
    status: "coming-soon" as const,
    install: "",
    description:
      "Native tracing for the OpenAI Agents SDK — captures handoffs, tool use, and guardrail events from multi-agent pipelines.",
    href: "#coming-soon",
    records: [],
  },
  {
    name: "CrewAI",
    status: "coming-soon" as const,
    install: "",
    description:
      "Automatic trace recording for CrewAI agent crews — captures task assignments, tool executions, and crew-level outputs.",
    href: "#coming-soon",
    records: [],
  },
];

export default function IntegrationsPage() {
  return (
    <DocsShell
      kicker="Docs / Integrations"
      title="Drop-in integrations for popular AI frameworks."
      description="Each integration wraps your existing client or chain and records traces automatically — no manual model_step() calls needed."
      nav={[
        { href: "#overview", label: "Overview" },
        { href: "#openai", label: "OpenAI" },
        { href: "#langchain", label: "LangChain" },
        { href: "#coming-soon", label: "Coming Soon" },
      ]}
      actions={[
        { href: "/docs/getting-started", label: "Getting started" },
        { href: "/docs/api-reference", label: "API reference" },
      ]}
    >
      <DocsSection
        id="overview"
        title="Available Integrations"
        description="All integrations are included in the sepurux package. No extra SDK installs beyond the framework itself."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-[--text-primary]">{integration.name}</p>
                {integration.status === "available" ? (
                  <span className="rounded-full bg-[rgba(var(--accent-rgb),0.10)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-[--surface-2] px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{integration.description}</p>
              {integration.records.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {integration.records.map((r) => (
                    <li key={r} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="h-1 w-1 rounded-full bg-[rgba(var(--accent-rgb),0.55)]" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
              {integration.install && (
                <code className="mt-3 block rounded-lg bg-[--surface-2] px-3 py-2 text-xs text-slate-300">
                  {integration.install}
                </code>
              )}
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="openai"
        title="OpenAI"
        description="instrument_openai wraps any openai.OpenAI (or AsyncOpenAI) client. Pass it a recorder from client.trace() and every chat.completions.create call is captured automatically."
      >
        <DocsCodeBlock label="python" code={openaiSnippet} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["No code changes", "Your existing chat.completions.create calls work as-is — just swap the client."],
            ["Async support", "Call await ai.chat.completions.acreate(...) for AsyncOpenAI — same recording behavior."],
            ["Tool call capture", "Function calls returned by the model are automatically recorded as tool_call events."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="langchain"
        title="LangChain"
        description="SepuruxCallbackHandler hooks into LangChain's callback system. Pass it via config to any chain, agent, or LLM and it records everything without changes to your chain logic."
      >
        <DocsCodeBlock label="python" code={langchainSnippet} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Any runnable", "Works with chains, agents, AgentExecutor, LLMs — anything that accepts callbacks."],
            ["Context manager", "Use with SepuruxCallbackHandler(...) as handler: and finish() is called on exit."],
            ["Full event capture", "LLM calls with latency, tool call/result pairs, and final agent output — all recorded."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white/8 shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="coming-soon"
        title="Coming Soon"
        description="These integrations are in development. Star the repo or sign up for updates to be notified when they ship."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["OpenAI Agents SDK", "Capture handoffs, tool use, and guardrail events from multi-agent pipelines built on the OpenAI Agents SDK."],
            ["CrewAI", "Record task assignments, tool executions, and crew-level outputs from CrewAI agent crews."],
            ["AutoGen", "Trace multi-agent conversations, function calls, and code execution steps in AutoGen workflows."],
            ["Custom integration", "Any framework can be instrumented manually using client.trace() and the TraceRecorder API."],
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

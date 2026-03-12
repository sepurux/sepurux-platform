from __future__ import annotations

import os

from sepurux import SepuruxClient


def main() -> None:
    ui_base = os.getenv("SEPURUX_UI_BASE_URL", "http://localhost:3000").rstrip("/")
    campaign_id = os.getenv("SEPURUX_CAMPAIGN_ID")
    mutation_pack = os.getenv("SEPURUX_MUTATION_PACK")

    with SepuruxClient.from_env() as client:
        with client.trace(
            "sdk_demo_flow",
            {"intent": "create jira issue"},
            campaign_id=campaign_id,
            mutation_pack=mutation_pack,
            source="sdk-demo",
        ) as trace:
            trace.model_step(
                "analyze_request",
                {"text": "Please create a bug ticket for checkout timeout"},
                output={"action": "create_issue", "project": "OPS"},
            )
            trace.tool_call(
                "jira.create_issue(commit)",
                {
                    "project": "OPS",
                    "summary": "Checkout timeout spikes",
                    "description": "Observed timeout spikes in payment checkout flow.",
                },
            )
            trace.tool_result(
                "jira.create_issue(commit)",
                {
                    "issue_id": "OPS-123",
                    "status": "created",
                },
            )

        if trace.trace_id:
            print(f"Uploaded trace_id: {trace.trace_id}")
        if trace.run_id:
            print(f"Started run_id: {trace.run_id}")
            print(f"Run URL: {ui_base}/runs/{trace.run_id}")
        elif campaign_id:
            print("Trace uploaded, but run did not start. Check trace.upload_error for details.")
        else:
            print("Trace uploaded. SEPURUX_CAMPAIGN_ID not provided; skipping run start.")


if __name__ == "__main__":
    main()

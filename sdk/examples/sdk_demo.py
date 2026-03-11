from __future__ import annotations

import os

from sepurux import SepuruxClient, sepurux_trace


def main() -> None:
    base_url = os.getenv("SEPURUX_API_BASE_URL", "http://localhost:8000")
    ui_base = os.getenv("SEPURUX_UI_BASE_URL", "http://localhost:3000").rstrip("/")
    api_key = os.getenv("SEPURUX_API_KEY")
    project_id = os.getenv("SEPURUX_PROJECT_ID")
    campaign_id = os.getenv("SEPURUX_CAMPAIGN_ID")
    mutation_pack = os.getenv("SEPURUX_MUTATION_PACK")

    with SepuruxClient(
        base_url=base_url,
        api_key=api_key,
        project_id=project_id,
    ) as client:
        with sepurux_trace("sdk_demo_flow", {"intent": "create jira issue"}) as recorder:
            recorder.model_step(
                "analyze_request",
                {"text": "Please create a bug ticket for checkout timeout"},
                output={"action": "create_issue", "project": "OPS"},
            )
            recorder.tool_call(
                "jira.create_issue(commit)",
                {
                    "project": "OPS",
                    "summary": "Checkout timeout spikes",
                    "description": "Observed timeout spikes in payment checkout flow.",
                },
            )
            recorder.tool_result(
                "jira.create_issue(commit)",
                {
                    "issue_id": "OPS-123",
                    "status": "created",
                },
            )

        trace_id = client.upload_trace(recorder.to_trace())
        print(f"Uploaded trace_id: {trace_id}")

        if campaign_id and mutation_pack:
            run_id = client.run_pack(campaign_id=campaign_id, mutation_pack=mutation_pack)
            print(f"Started run_id: {run_id}")
            print(f"Run URL: {ui_base}/runs/{run_id}")
        elif campaign_id:
            run_id = client.start_run(trace_id=trace_id, campaign_id=campaign_id)
            print(f"Started run_id: {run_id}")
            print(f"Run URL: {ui_base}/runs/{run_id}")
        else:
            print("SEPURUX_CAMPAIGN_ID not provided; skipping run start.")


if __name__ == "__main__":
    main()

from __future__ import annotations

import logging
from collections import OrderedDict
from typing import Any
from uuid import UUID, uuid4

import redis
from rq import Queue, Worker

from config import get_settings
from counterfactuals import run_counterfactual_replays
from db import get_session
from models import Campaign, Counterfactual, PolicyEvent, PolicyPack, ReplayAttempt, Run, Trace
from policy_engine import evaluate_policy
from replayer import build_attempt_replay_outcome, iter_mutations
from storage import put_json_object

logger = logging.getLogger(__name__)


def _extract_tool_usage_metadata(
    timeline_artifact: dict[str, Any],
) -> tuple[list[str], dict[str, int]]:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return [], {}

    ordered_tools: OrderedDict[str, None] = OrderedDict()
    tool_call_counts: dict[str, int] = {}
    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_call":
            continue
        tool = event.get("tool")
        if not isinstance(tool, str) or not tool:
            continue
        ordered_tools.setdefault(tool, None)
        tool_call_counts[tool] = tool_call_counts.get(tool, 0) + 1

    return list(ordered_tools.keys()), tool_call_counts


def _is_unsafe_failure_reason(failure_reason: str | None) -> bool:
    reason = (failure_reason or "").lower()
    return reason.startswith("unsafe") or reason == "policy_blocked"


def _policy_blocked_mutation(
    mutation: Any,
    *,
    failure_reason: str,
    error_type: str,
    error_message: str,
) -> dict[str, Any]:
    mutation_obj = mutation if isinstance(mutation, dict) else {"value": mutation}
    blocked_mutation = dict(mutation_obj)
    blocked_mutation["force_fail"] = True
    blocked_mutation["failure_reason"] = failure_reason
    blocked_mutation.setdefault("error_type", error_type)
    blocked_mutation.setdefault("error_message", error_message)
    return blocked_mutation


def _mutation_tool_name(mutation: Any) -> str:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    tool = mutation_obj.get("tool")
    if isinstance(tool, str) and tool:
        return tool
    return "replay.execute"


def _mutation_tool_args(mutation: Any) -> dict[str, Any]:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    args = mutation_obj.get("args")
    if isinstance(args, dict):
        return args
    return {}


def execute_run(run_id: str) -> None:
    logger.info("Executing run %s", run_id)
    run_uuid = UUID(str(run_id))

    with get_session() as db:
        run = db.get(Run, run_uuid)
        if run is None:
            raise ValueError(f"Run not found: {run_id}")

        trace = db.get(Trace, run.trace_id)
        campaign = db.get(Campaign, run.campaign_id)
        if trace is None:
            raise ValueError(f"Trace not found for run {run_id}")
        if campaign is None:
            raise ValueError(f"Campaign not found for run {run_id}")
        policy_pack: PolicyPack | None = None
        if run.policy_pack_id is not None:
            policy_pack = db.get(PolicyPack, run.policy_pack_id)
            if policy_pack is None:
                raise ValueError(f"Policy pack not found for run {run_id}")
            if policy_pack.project_id != run.project_id:
                raise ValueError(f"Policy pack project mismatch for run {run_id}")
        policy_document: dict[str, Any] | None = None
        if policy_pack is not None and isinstance(policy_pack.policy, dict):
            policy_document = policy_pack.policy

        run.status = "running"
        db.commit()

        mutations = iter_mutations(campaign.mutation_set)
        passed_count = 0
        failed_count = 0
        unsafe_count = 0
        policy_denied_count = 0
        policy_requires_approval_count = 0
        policy_events_count = 0

        for index, mutation in enumerate(mutations):
            attempt_id = uuid4()
            mutation_for_replay = mutation
            if isinstance(policy_document, dict):
                tool_name = _mutation_tool_name(mutation)
                evaluation = evaluate_policy(
                    policy_document,
                    tool=tool_name,
                    args=_mutation_tool_args(mutation),
                )
                db.add(
                    PolicyEvent(
                        policy_event_id=uuid4(),
                        run_id=run.run_id,
                        attempt_id=attempt_id,
                        event_index=2,
                        tool=tool_name,
                        action="tool_call",
                        decision=evaluation.decision,
                        reason=evaluation.reason,
                    )
                )
                policy_events_count += 1
                if evaluation.decision == "deny":
                    policy_denied_count += 1
                    mutation_for_replay = _policy_blocked_mutation(
                        mutation,
                        failure_reason="policy_denied",
                        error_type="PolicyDeniedError",
                        error_message=evaluation.reason,
                    )
                elif evaluation.decision == "require_approval":
                    policy_requires_approval_count += 1
                    mutation_for_replay = _policy_blocked_mutation(
                        mutation,
                        failure_reason="policy_requires_approval",
                        error_type="PolicyApprovalRequiredError",
                        error_message=evaluation.reason,
                    )

            outcome = build_attempt_replay_outcome(
                run_id=run.run_id,
                attempt_id=attempt_id,
                mutation=mutation_for_replay,
                trace_s3_key=trace.s3_key,
                default_mutation_id=f"mutation-{index}",
            )
            artifact_key = f"runs/{run.run_id}/attempts/{attempt_id}.timeline.json"
            put_json_object(artifact_key, outcome.timeline_artifact)
            tools_touched, tool_call_counts = _extract_tool_usage_metadata(
                outcome.timeline_artifact
            )

            attempt_record = ReplayAttempt(
                attempt_id=attempt_id,
                project_id=run.project_id,
                run_id=run.run_id,
                mutation_id=outcome.mutation_id,
                result=outcome.result,
                failure_reason=outcome.failure_reason,
                first_failure_event_index=outcome.first_failure_event_index,
                first_failure_tool=outcome.first_failure_tool,
                tools_touched=tools_touched,
                tool_call_counts=tool_call_counts,
                artifacts_s3_key=artifact_key,
            )
            db.add(attempt_record)
            db.flush()

            if outcome.result == "failed":
                for counterfactual in run_counterfactual_replays(
                    run_id=run.run_id,
                    attempt=attempt_record,
                    mutation=mutation,
                    trace_s3_key=trace.s3_key,
                ):
                    db.add(
                        Counterfactual(
                            counterfactual_id=uuid4(),
                            project_id=run.project_id,
                            attempt_id=attempt_record.attempt_id,
                            strategy=counterfactual.strategy,
                            result=counterfactual.result,
                            failure_reason=counterfactual.failure_reason,
                            metrics=counterfactual.metrics,
                            diff=counterfactual.diff,
                        )
                    )

            if outcome.result == "passed":
                passed_count += 1
            else:
                failed_count += 1
                if _is_unsafe_failure_reason(outcome.failure_reason):
                    unsafe_count += 1

        prior_summary = run.summary if isinstance(run.summary, dict) else {}
        ci_thresholds = prior_summary.get("ci_thresholds")

        run.status = "completed"
        run.summary = {
            "timeline_version": "0.1",
            "attempt_count": len(mutations),
            "passed_count": passed_count,
            "failures": failed_count,
            "failed_count": failed_count,
            "pass_rate": round((passed_count / len(mutations)), 4) if mutations else 0.0,
            "unsafe_attempts": unsafe_count,
            "unsafe_count": unsafe_count,
            "policy_denied_count": policy_denied_count,
            "policy_requires_approval_count": policy_requires_approval_count,
            "policy_events_count": policy_events_count,
        }
        if ci_thresholds is not None:
            run.summary["ci_thresholds"] = ci_thresholds
        db.commit()

    logger.info("Completed run %s", run_id)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    connection = redis.from_url(settings.redis_url)
    queue = Queue("crashlab", connection=connection)
    worker = Worker([queue], connection=connection)
    worker.work()


if __name__ == "__main__":
    main()

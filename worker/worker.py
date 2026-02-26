from __future__ import annotations

import logging
from uuid import UUID, uuid4

import redis
from rq import Queue, Worker

from config import get_settings
from counterfactuals import run_counterfactual_replays
from db import get_session
from models import Campaign, Counterfactual, ReplayAttempt, Run, Trace
from replayer import build_attempt_replay_outcome, iter_mutations
from storage import put_json_object

logger = logging.getLogger(__name__)


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

        run.status = "running"
        db.commit()

        mutations = iter_mutations(campaign.mutation_set)
        passed_count = 0
        failed_count = 0
        unsafe_count = 0

        for index, mutation in enumerate(mutations):
            attempt_id = uuid4()
            outcome = build_attempt_replay_outcome(
                run_id=run.run_id,
                attempt_id=attempt_id,
                mutation=mutation,
                trace_s3_key=trace.s3_key,
                default_mutation_id=f"mutation-{index}",
            )
            artifact_key = f"runs/{run.run_id}/attempts/{attempt_id}.timeline.json"
            put_json_object(artifact_key, outcome.timeline_artifact)

            attempt_record = ReplayAttempt(
                attempt_id=attempt_id,
                project_id=run.project_id,
                run_id=run.run_id,
                mutation_id=outcome.mutation_id,
                result=outcome.result,
                failure_reason=outcome.failure_reason,
                first_failure_event_index=outcome.first_failure_event_index,
                first_failure_tool=outcome.first_failure_tool,
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
                if (outcome.failure_reason or "").lower() == "policy_blocked":
                    unsafe_count += 1

        prior_summary = run.summary if isinstance(run.summary, dict) else {}
        ci_thresholds = prior_summary.get("ci_thresholds")

        run.status = "completed"
        run.summary = {
            "timeline_version": "0.1",
            "attempt_count": len(mutations),
            "passed_count": passed_count,
            "failed_count": failed_count,
            "pass_rate": round((passed_count / len(mutations)), 4) if mutations else 0.0,
            "unsafe_count": unsafe_count,
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

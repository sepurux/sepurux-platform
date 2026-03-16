"""Command-line interface for Sepurux."""

from __future__ import annotations

import argparse
import os
import sys

from .client import SepuruxClient


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sepurux",
        description="Sepurux — reliability testing for AI agents.",
    )
    sub = parser.add_subparsers(dest="command", metavar="COMMAND")

    run_parser = sub.add_parser("run", help="Run Sepurux workflows")
    run_sub = run_parser.add_subparsers(dest="subcommand", metavar="SUBCOMMAND")

    campaign_parser = run_sub.add_parser("campaign", help="Run a reliability campaign and check the quality gate")
    campaign_parser.add_argument(
        "--project",
        metavar="PROJECT",
        help="Project name or ID (or set SEPURUX_PROJECT_ID)",
    )
    campaign_parser.add_argument(
        "--campaign",
        required=True,
        metavar="CAMPAIGN",
        help="Campaign name or ID",
    )
    campaign_parser.add_argument(
        "--api-key",
        metavar="API_KEY",
        help="Sepurux API key (or set SEPURUX_API_KEY)",
    )
    campaign_parser.add_argument(
        "--base-url",
        metavar="URL",
        help="API base URL (or set SEPURUX_API_BASE_URL, default: http://localhost:8000)",
    )
    campaign_parser.add_argument(
        "--min-reliability",
        type=float,
        default=80.0,
        metavar="SCORE",
        help="Minimum reliability score 0-100 for quality gate (default: 80)",
    )
    campaign_parser.add_argument(
        "--timeout",
        type=float,
        default=300.0,
        metavar="SECONDS",
        help="Seconds to wait for run completion (default: 300)",
    )
    campaign_parser.add_argument(
        "--poll-interval",
        type=float,
        default=5.0,
        metavar="SECONDS",
        help="Polling interval in seconds (default: 5)",
    )

    return parser


def _run_campaign(args: argparse.Namespace) -> int:
    api_key = args.api_key or os.getenv("SEPURUX_API_KEY")
    base_url = args.base_url or os.getenv("SEPURUX_API_BASE_URL", "http://localhost:8000")
    project_id = args.project or os.getenv("SEPURUX_PROJECT_ID")

    if not api_key:
        print(
            "error: API key required — use --api-key or set SEPURUX_API_KEY.",
            file=sys.stderr,
        )
        return 1

    client = SepuruxClient(
        base_url=base_url,
        api_key=api_key,
        project_id=project_id,
    )

    print(f"sepurux: authenticating with {base_url}")
    print(f"sepurux: triggering campaign '{args.campaign}'")

    try:
        result = client.run_campaign(
            args.campaign,
            wait_for_completion=True,
            timeout_seconds=args.timeout,
            poll_interval=args.poll_interval,
        )
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    run_id = result.get("run_id", "unknown")
    run_status = result.get("status", "unknown")
    reliability_score = result.get("reliability_score")
    reliability_status = result.get("reliability_status", "unknown")
    failures = result.get("failures") or []

    print()
    print(f"  Run ID:      {run_id}")
    print(f"  Status:      {run_status}")
    print(f"  Failures:    {len(failures)}")

    if reliability_score is not None:
        # API returns 0.0–1.0; normalise to 0–100 for display
        score_pct = reliability_score * 100.0 if reliability_score <= 1.0 else float(reliability_score)
        print(f"  Reliability: {score_pct:.1f}% ({reliability_status})")

        threshold = args.min_reliability
        print()
        if score_pct < threshold:
            print(
                f"Quality gate FAILED: {score_pct:.1f}% < threshold {threshold:.1f}%",
                file=sys.stderr,
            )
            return 1

        print(f"Quality gate PASSED: {score_pct:.1f}% >= threshold {threshold:.1f}%")
        return 0

    # No reliability score yet — treat a non-terminal status as a soft pass,
    # but an explicit failure status as an error.
    if run_status in {"failed", "error"}:
        print(f"\nerror: run finished with status '{run_status}'", file=sys.stderr)
        return 1

    return 0


def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command == "run" and getattr(args, "subcommand", None) == "campaign":
        sys.exit(_run_campaign(args))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

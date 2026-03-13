from __future__ import annotations


def calculate_reliability_score(
    *,
    critical: int = 0,
    high: int = 0,
    medium: int = 0,
) -> dict[str, float | str]:
    score = 100 - (critical * 10) - (high * 5) - (medium * 2)
    if score < 0:
        score = 0

    status = "healthy"
    if score < 70:
        status = "critical"
    elif score < 90:
        status = "warning"

    return {
        "score": float(score),
        "status": status,
    }

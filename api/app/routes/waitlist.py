from __future__ import annotations

from time import time

from app.db import get_db
from app.schemas import WaitlistSubmissionRequest, WaitlistSubmissionResponse
from app.services.waitlist_service import create_waitlist_entry
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

public_router = APIRouter(prefix="/waitlist", tags=["waitlist"])

RATE_WINDOW_SECONDS = 10 * 60
RATE_LIMIT_MAX = 5
request_buckets: dict[str, list[float]] = {}


def _client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.headers.get("x-real-ip") or "unknown"


def _is_rate_limited(ip: str) -> bool:
    now = time()
    existing = request_buckets.get(ip, [])
    valid = [value for value in existing if now - value < RATE_WINDOW_SECONDS]
    if len(valid) >= RATE_LIMIT_MAX:
        request_buckets[ip] = valid
        return True
    valid.append(now)
    request_buckets[ip] = valid
    return False


@public_router.post("", response_model=WaitlistSubmissionResponse)
def post_waitlist_entry(
    payload: WaitlistSubmissionRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> WaitlistSubmissionResponse:
    ip = _client_ip(request)
    if _is_rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    if payload.website:
        return WaitlistSubmissionResponse(message="Thanks! You are on the waitlist.")

    try:
        _, created = create_waitlist_entry(
            db,
            email=payload.email,
            role=payload.role,
            company=payload.company,
            source="site",
            submitted_from_ip=ip,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return WaitlistSubmissionResponse(
        message="Thanks! You are on the waitlist."
        if created
        else "You are already on the waitlist."
    )

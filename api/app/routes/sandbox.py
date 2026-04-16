from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.storage import get_json_object, put_json_object

router = APIRouter(prefix="/sandbox", tags=["sandbox"])

_DRAFT_TTL_MINUTES = 30
_MAX_INPUT_BYTES = 512_000  # 512 KB


class DraftRequest(BaseModel):
    input: str
    kind: str  # "json" | "raw" | "trace-id"


class DraftResponse(BaseModel):
    draft_id: str
    expires_at: str


class DraftDetail(BaseModel):
    draft_id: str
    input: str
    kind: str
    expires_at: str


@router.post("/draft", status_code=status.HTTP_201_CREATED, response_model=DraftResponse)
def create_sandbox_draft(body: DraftRequest) -> DraftResponse:
    if len(body.input.encode("utf-8")) > _MAX_INPUT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Input exceeds maximum size of {_MAX_INPUT_BYTES // 1024} KB",
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=_DRAFT_TTL_MINUTES)
    expires_at_iso = expires_at.isoformat()

    payload = {
        "draft_id": token,
        "input": body.input,
        "kind": body.kind,
        "expires_at": expires_at_iso,
    }
    put_json_object(f"sandbox-drafts/{token}.json", payload)

    return DraftResponse(draft_id=token, expires_at=expires_at_iso)


@router.get("/draft/{token}", response_model=DraftDetail)
def get_sandbox_draft(token: str) -> DraftDetail:
    try:
        data = get_json_object(f"sandbox-drafts/{token}.json")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found or already expired",
        )

    expires_at_str = data.get("expires_at", "")
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now(tz=timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Draft has expired",
            )
    except (ValueError, TypeError):
        pass  # malformed expires_at — let it through

    return DraftDetail(
        draft_id=data["draft_id"],
        input=data["input"],
        kind=data["kind"],
        expires_at=expires_at_str,
    )

from __future__ import annotations

from typing import Annotated

from app.db import get_db
from app.schemas import DemoInfoResponse, DemoSessionResponse
from app.services.demo_service import (
    DEMO_MUTATION_PACK_NAME,
    DEMO_PROJECT_NAME,
    create_demo_session,
    demo_info_payload,
)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/demo", tags=["demo"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/info", response_model=DemoInfoResponse)
def get_demo_info() -> DemoInfoResponse:
    payload = demo_info_payload()
    payload["demo_project"] = DEMO_PROJECT_NAME
    payload["demo_mutation_pack"] = DEMO_MUTATION_PACK_NAME
    return DemoInfoResponse(**payload)


@router.post("/session", status_code=status.HTTP_201_CREATED, response_model=DemoSessionResponse)
def post_demo_session(db: DbSession) -> DemoSessionResponse:
    payload = create_demo_session(db)
    return DemoSessionResponse(**payload)

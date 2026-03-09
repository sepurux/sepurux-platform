from __future__ import annotations

from app.services.demo_service import (
    DEMO_MUTATION_PACK_NAME,
    DEMO_PROJECT_NAME,
    demo_info_payload,
)
from fastapi import APIRouter

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/info")
def get_demo_info() -> dict[str, object]:
    payload = demo_info_payload()
    payload["demo_project"] = DEMO_PROJECT_NAME
    payload["demo_mutation_pack"] = DEMO_MUTATION_PACK_NAME
    return payload

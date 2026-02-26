from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import CounterfactualListItem, CounterfactualMetadata
from app.services.counterfactual_service import (
    CounterfactualNotFoundError,
    get_counterfactual_or_raise,
    list_counterfactuals_for_attempt,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1", tags=["counterfactuals"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_counterfactual_list_item(record) -> CounterfactualListItem:
    return CounterfactualListItem(
        strategy=record.strategy,
        result=record.result,
        failure_reason=record.failure_reason,
        metrics=record.metrics,
        diff=record.diff,
        created_at=record.created_at,
    )


def _to_counterfactual_metadata(record) -> CounterfactualMetadata:
    return CounterfactualMetadata(
        counterfactual_id=record.counterfactual_id,
        attempt_id=record.attempt_id,
        strategy=record.strategy,
        result=record.result,
        failure_reason=record.failure_reason,
        metrics=record.metrics,
        diff=record.diff,
        created_at=record.created_at,
    )


@router.get("/attempts/{attempt_id}/counterfactuals", response_model=list[CounterfactualListItem])
def get_attempt_counterfactuals(
    attempt_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[CounterfactualListItem]:
    records = list_counterfactuals_for_attempt(
        db,
        project_id=project_scope.project_id,
        attempt_id=attempt_id,
    )
    return [_to_counterfactual_list_item(record) for record in records]


@router.get("/counterfactuals/{counterfactual_id}", response_model=CounterfactualMetadata)
def get_counterfactual(
    counterfactual_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> CounterfactualMetadata:
    try:
        record = get_counterfactual_or_raise(
            db,
            project_id=project_scope.project_id,
            counterfactual_id=counterfactual_id,
        )
    except CounterfactualNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_counterfactual_metadata(record)

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_permission, require_visible_section
from app.config import Settings, get_settings
from app.db import get_db
from app.schemas import (
    MutationPackCoverageResponse,
    MutationPackCreateRequest,
    MutationPackCreateResponse,
    MutationPackMetadata,
    MutationPackUpdateRequest,
)
from app.services.mutation_pack_policy import evaluate_mutation_pack_config
from app.services.mutation_pack_service import (
    MutationPackInUseError,
    SystemMutationPackModificationError,
    create_mutation_pack,
    delete_mutation_pack,
    list_mutation_packs,
    mutation_pack_coverage,
    resolve_mutation_pack,
    update_mutation_pack,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/mutation-packs", tags=["mutation-packs"])

DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
MutationPackReadScope = Annotated[ProjectScope, Depends(require_visible_section("mutation-packs"))]
MutationPackManageScope = Annotated[
    ProjectScope,
    Depends(require_permission("can_manage_mutation_packs", section_name="mutation-packs")),
]


def _to_mutation_pack_metadata(record) -> MutationPackMetadata:
    return MutationPackMetadata(
        mutation_pack_id=record.mutation_pack_id,
        project_id=record.project_id,
        name=record.name,
        description=record.description,
        config=record.config,
        is_system=record.is_system,
        coverage_score=record.coverage_score,
        credit_cost=record.credit_cost,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MutationPackCreateResponse)
def post_mutation_pack(
    payload: MutationPackCreateRequest,
    db: DbSession,
    project_scope: MutationPackManageScope,
    settings: SettingsDep,
) -> MutationPackCreateResponse:
    validation = evaluate_mutation_pack_config(payload.config)
    validation_mode = (
        str(getattr(settings, "mutation_pack_validation_mode", "warn")).strip().lower()
    )
    if validation_mode == "block" and validation.issues:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "weak_mutation_pack",
                "warning": validation.warning,
                "coverage_score": validation.coverage_score,
                "details": validation.issues,
            },
        )

    record = create_mutation_pack(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        description=payload.description,
        config=payload.config,
        coverage_score=validation.coverage_score,
        credit_cost=payload.credit_cost,
    )
    return MutationPackCreateResponse(
        **_to_mutation_pack_metadata(record).model_dump(),
        warning=validation.warning,
        validation_issues=validation.issues,
    )


@router.get("", response_model=list[MutationPackMetadata])
def get_mutation_packs(
    db: DbSession,
    project_scope: MutationPackReadScope,
    include_system: bool = Query(True),
) -> list[MutationPackMetadata]:
    records = list_mutation_packs(
        db,
        project_id=project_scope.project_id,
        include_system=include_system,
    )
    return [_to_mutation_pack_metadata(record) for record in records]


@router.get("/{pack_ref}", response_model=MutationPackMetadata)
def get_mutation_pack_by_id(
    pack_ref: str,
    db: DbSession,
    project_scope: MutationPackReadScope,
) -> MutationPackMetadata:
    record = resolve_mutation_pack(
        db,
        project_id=project_scope.project_id,
        pack_ref=pack_ref,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mutation pack not found",
        )
    return _to_mutation_pack_metadata(record)


@router.get("/{pack_ref}/coverage", response_model=MutationPackCoverageResponse)
def get_mutation_pack_coverage(
    pack_ref: str,
    db: DbSession,
    project_scope: MutationPackReadScope,
) -> MutationPackCoverageResponse:
    record = resolve_mutation_pack(
        db,
        project_id=project_scope.project_id,
        pack_ref=pack_ref,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mutation pack not found",
        )
    coverage = mutation_pack_coverage(record)
    categories_value = coverage.get("categories")
    categories = categories_value if isinstance(categories_value, list) else []
    warning_value = coverage.get("warning")
    warning = warning_value if isinstance(warning_value, str) else None
    coverage_score_value = coverage.get("coverage_score")
    coverage_score = (
        coverage_score_value if isinstance(coverage_score_value, int) else record.coverage_score
    )
    return MutationPackCoverageResponse(
        mutation_pack_id=record.mutation_pack_id,
        coverage_score=coverage_score,
        categories=[str(item) for item in categories],
        warning=warning,
    )


@router.patch("/{mutation_pack_id}", response_model=MutationPackCreateResponse)
def patch_mutation_pack(
    mutation_pack_id: UUID,
    payload: MutationPackUpdateRequest,
    db: DbSession,
    project_scope: MutationPackManageScope,
    settings: SettingsDep,
) -> MutationPackCreateResponse:
    warning: str | None = None
    validation_issues: list[str] = []

    if payload.config is not None:
        validation = evaluate_mutation_pack_config(payload.config)
        validation_mode = (
            str(getattr(settings, "mutation_pack_validation_mode", "warn")).strip().lower()
        )
        if validation_mode == "block" and validation.issues:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "weak_mutation_pack",
                    "warning": validation.warning,
                    "coverage_score": validation.coverage_score,
                    "details": validation.issues,
                },
            )
        warning = validation.warning
        validation_issues = validation.issues

    try:
        record = update_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=mutation_pack_id,
            name=payload.name,
            description=payload.description,
            config=payload.config,
            credit_cost=payload.credit_cost,
        )
    except SystemMutationPackModificationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mutation pack not found",
        )
    return MutationPackCreateResponse(
        **_to_mutation_pack_metadata(record).model_dump(),
        warning=warning,
        validation_issues=validation_issues,
    )


@router.delete("/{mutation_pack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mutation_pack_by_id(
    mutation_pack_id: UUID,
    db: DbSession,
    project_scope: MutationPackManageScope,
) -> Response:
    try:
        deleted = delete_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=mutation_pack_id,
        )
    except SystemMutationPackModificationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except MutationPackInUseError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mutation pack not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

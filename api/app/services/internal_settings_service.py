from __future__ import annotations

from app.models import InternalFeatureFlag
from app.schemas import InternalFeatureFlags, InternalFeatureFlagsUpdate
from sqlalchemy import select
from sqlalchemy.orm import Session

DEFAULT_INTERNAL_FLAGS: dict[str, bool] = {
    "enable_ci": True,
    "enable_mutations": True,
    "enable_billing": True,
}


def _ensure_feature_flags(db: Session) -> dict[str, InternalFeatureFlag]:
    keys = tuple(DEFAULT_INTERNAL_FLAGS.keys())
    rows = list(db.scalars(select(InternalFeatureFlag).where(InternalFeatureFlag.key.in_(keys))))
    flags_by_key = {row.key: row for row in rows}

    for key, default_value in DEFAULT_INTERNAL_FLAGS.items():
        if key in flags_by_key:
            continue
        flag = InternalFeatureFlag(key=key, enabled=default_value)
        db.add(flag)
        flags_by_key[key] = flag

    db.flush()
    return flags_by_key


def _to_payload(flags_by_key: dict[str, InternalFeatureFlag]) -> InternalFeatureFlags:
    return InternalFeatureFlags(
        enable_ci=bool(flags_by_key["enable_ci"].enabled),
        enable_mutations=bool(flags_by_key["enable_mutations"].enabled),
        enable_billing=bool(flags_by_key["enable_billing"].enabled),
    )


def get_internal_feature_flags(db: Session) -> InternalFeatureFlags:
    flags_by_key = _ensure_feature_flags(db)
    return _to_payload(flags_by_key)


def update_internal_feature_flags(
    db: Session,
    payload: InternalFeatureFlagsUpdate,
) -> InternalFeatureFlags:
    flags_by_key = _ensure_feature_flags(db)
    updates = payload.model_dump()
    for key, value in updates.items():
        flags_by_key[key].enabled = bool(value)
    db.flush()
    return _to_payload(flags_by_key)

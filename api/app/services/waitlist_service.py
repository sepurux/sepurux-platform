from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models import WaitlistEntry
from sqlalchemy import select
from sqlalchemy.orm import Session

ALLOWED_WAITLIST_ROLES = {"Platform Eng", "Security", "Product", "Other"}
ALLOWED_WAITLIST_STATUSES = {"pending", "contacted", "approved", "rejected"}


def is_valid_waitlist_email(value: str) -> bool:
    return bool(value) and "@" in value and "." in value.split("@")[-1]


def is_waitlist_email_approved(db: Session, *, email: str) -> bool:
    normalized_email = email.strip().lower()
    if not normalized_email:
        return False

    record = db.scalar(select(WaitlistEntry).where(WaitlistEntry.email == normalized_email))
    return isinstance(record, WaitlistEntry) and record.status == "approved"


def serialize_waitlist_entry(entry: WaitlistEntry) -> dict[str, object]:
    return {
        "waitlist_entry_id": entry.waitlist_entry_id,
        "email": entry.email,
        "role": entry.role,
        "company": entry.company,
        "source": entry.source,
        "status": entry.status,
        "notes": entry.notes,
        "submitted_from_ip": entry.submitted_from_ip,
        "reviewed_by": entry.reviewed_by,
        "reviewed_at": entry.reviewed_at,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }


def create_waitlist_entry(
    db: Session,
    *,
    email: str,
    role: str,
    company: str | None = None,
    source: str = "site",
    submitted_from_ip: str | None = None,
) -> tuple[WaitlistEntry, bool]:
    normalized_email = email.strip().lower()
    normalized_role = role.strip()
    normalized_company = company.strip() if isinstance(company, str) and company.strip() else None

    if not is_valid_waitlist_email(normalized_email):
        raise ValueError("Please provide a valid email.")
    if normalized_role not in ALLOWED_WAITLIST_ROLES:
        raise ValueError("Please select a valid role.")

    existing = db.scalar(select(WaitlistEntry).where(WaitlistEntry.email == normalized_email))
    if isinstance(existing, WaitlistEntry):
        return existing, False

    record = WaitlistEntry(
        waitlist_entry_id=uuid4(),
        email=normalized_email,
        role=normalized_role,
        company=normalized_company,
        source=source.strip() or "site",
        submitted_from_ip=submitted_from_ip.strip() if isinstance(submitted_from_ip, str) and submitted_from_ip.strip() else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, True


def list_waitlist_entries(
    db: Session,
    *,
    status: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[WaitlistEntry]:
    query = select(WaitlistEntry)
    if isinstance(status, str) and status.strip():
        query = query.where(WaitlistEntry.status == status.strip().lower())
    query = query.order_by(WaitlistEntry.created_at.desc(), WaitlistEntry.waitlist_entry_id.desc())
    return list(db.scalars(query.offset(offset).limit(limit)).all())


def update_waitlist_entry(
    db: Session,
    *,
    waitlist_entry_id: UUID,
    status: str | None = None,
    notes: str | None = None,
    reviewed_by: str | None = None,
) -> tuple[WaitlistEntry, bool]:
    record = db.scalar(
        select(WaitlistEntry).where(WaitlistEntry.waitlist_entry_id == waitlist_entry_id)
    )
    if not isinstance(record, WaitlistEntry):
        raise ValueError("Waitlist entry not found")

    previous_status = record.status
    changed = False
    if status is not None:
        normalized_status = status.strip().lower()
        if normalized_status not in ALLOWED_WAITLIST_STATUSES:
            raise ValueError("Invalid waitlist status")
        if record.status != normalized_status:
            record.status = normalized_status
            changed = True

    if notes is not None and record.notes != notes:
        record.notes = notes
        changed = True

    if changed:
        record.reviewed_at = datetime.now(UTC)
        record.reviewed_by = reviewed_by.strip() if isinstance(reviewed_by, str) and reviewed_by.strip() else None
        db.add(record)
        db.commit()
        db.refresh(record)

    return record, previous_status != "approved" and record.status == "approved"

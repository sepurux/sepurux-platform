from __future__ import annotations

from uuid import UUID, uuid4

from app.models import QualityContract, Run, Trace
from app.schemas import ContractReport, ContractViolation, QualityContractResponse
from sqlalchemy import select
from sqlalchemy.orm import Session


def get_contract(db: Session, *, campaign_id: UUID) -> QualityContract | None:
    return db.scalar(
        select(QualityContract).where(QualityContract.campaign_id == campaign_id)
    )


def upsert_contract(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    required_pack_ids: list[str],
    required_tools: list[str],
    min_attempts_per_pack: int,
) -> QualityContract:
    existing = get_contract(db, campaign_id=campaign_id)
    if existing is not None:
        existing.required_pack_ids = required_pack_ids
        existing.required_tools = required_tools
        existing.min_attempts_per_pack = min_attempts_per_pack
        existing.version = (existing.version or 1) + 1
        db.flush()
        return existing

    contract = QualityContract(
        contract_id=uuid4(),
        project_id=project_id,
        campaign_id=campaign_id,
        required_pack_ids=required_pack_ids,
        required_tools=required_tools,
        min_attempts_per_pack=min_attempts_per_pack,
        version=1,
    )
    db.add(contract)
    db.flush()
    return contract


def delete_contract(db: Session, *, campaign_id: UUID) -> bool:
    contract = get_contract(db, campaign_id=campaign_id)
    if contract is None:
        return False
    db.delete(contract)
    db.flush()
    return True


def serialize_contract(contract: QualityContract) -> QualityContractResponse:
    return QualityContractResponse(
        contract_id=contract.contract_id,
        campaign_id=contract.campaign_id,
        required_pack_ids=list(contract.required_pack_ids or []),
        required_tools=list(contract.required_tools or []),
        min_attempts_per_pack=contract.min_attempts_per_pack,
        version=contract.version,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


def evaluate_contract(
    contract: QualityContract,
    *,
    batch_runs: list[Run],
    total_attempts: int,
    db: Session,
) -> ContractReport:
    """Evaluate a quality contract against a completed CI batch.

    Checks:
    - required_pack_ids: the pack used must be in the required list
    - required_tools: each required tool must appear in at least one batch trace
    - min_attempts_per_pack: total attempts must meet the minimum
    """
    violations: list[ContractViolation] = []

    # 1. Pack requirement — pack used must be in required_pack_ids
    required_pack_ids: list[str] = list(contract.required_pack_ids or [])
    if required_pack_ids and batch_runs:
        pack_id = batch_runs[0].mutation_pack_id
        pack_id_str = str(pack_id) if pack_id else None
        if pack_id_str not in required_pack_ids:
            violations.append(
                ContractViolation(
                    type="wrong_pack",
                    detail=(
                        f"Pack used ({pack_id_str or 'none'}) is not in the required pack list."
                    ),
                    missing=required_pack_ids,
                    actual=pack_id_str,
                )
            )

    # 2. Tool coverage — collect all tool calls across batch traces
    covered_tools: set[str] = set()
    trace_ids = [r.trace_id for r in batch_runs if r.trace_id is not None]
    if trace_ids:
        traces = db.scalars(select(Trace).where(Trace.trace_id.in_(trace_ids))).all()
        for trace in traces:
            events = trace.events if isinstance(trace.events, list) else []
            for event in events:
                if isinstance(event, dict) and event.get("type") in {"tool_call", "tool_result"}:
                    tool = event.get("tool") or event.get("name")
                    if tool:
                        covered_tools.add(str(tool))

    required_tools: list[str] = list(contract.required_tools or [])
    missing_tools = [t for t in required_tools if t not in covered_tools]
    if missing_tools:
        violations.append(
            ContractViolation(
                type="untested_tool",
                detail=(
                    f"{len(missing_tools)} required tool(s) never appeared in any batch trace: "
                    + ", ".join(missing_tools)
                ),
                missing=missing_tools,
                required=required_tools,
            )
        )

    # 3. Minimum attempts
    min_attempts = contract.min_attempts_per_pack or 10
    if total_attempts < min_attempts:
        violations.append(
            ContractViolation(
                type="insufficient_attempts",
                detail=(
                    f"Only {total_attempts} attempt(s) recorded; "
                    f"contract requires at least {min_attempts}."
                ),
                required=min_attempts,
                actual=total_attempts,
            )
        )

    return ContractReport(
        contract_id=contract.contract_id,
        version=contract.version,
        passed=len(violations) == 0,
        violations=violations,
        required_pack_ids=required_pack_ids,
        required_tools=required_tools,
        covered_tools=sorted(covered_tools),
        total_attempts=total_attempts,
    )

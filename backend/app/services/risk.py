from datetime import datetime, UTC

from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.maritime import Vessel
from app.models.risk import RiskFlag
from app.schemas.risk import RiskFlagRead


HIGH_RISK_FLAG_COUNTRIES = {"KP", "IR", "SY"}


def flag_country_severity(flag_country_code: str | None) -> str | None:
    if not flag_country_code:
        return None
    return "high" if flag_country_code.upper() in HIGH_RISK_FLAG_COUNTRIES else None

class RiskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def for_vessel(self, vessel_id: int) -> list[RiskFlagRead]:
        rows = await self.session.scalars(
            select(RiskFlag)
            .where(RiskFlag.vessel_id == vessel_id, RiskFlag.status == "active")
            .order_by(desc(RiskFlag.created_at))
        )
        return [RiskFlagRead.model_validate(row) for row in rows]

    async def for_entity(self, entity_id: int) -> list[RiskFlagRead]:
        rows = await self.session.scalars(
            select(RiskFlag)
            .where(RiskFlag.entity_id == entity_id, RiskFlag.status == "active")
            .order_by(desc(RiskFlag.created_at))
        )
        return [RiskFlagRead.model_validate(row) for row in rows]

    async def recompute(self, vessel_id: int | None = None) -> dict[str, int]:
        stats = {"vessels_seen": 0, "flags_inserted": 0, "flags_retired": 0}

        # Retire historical "unknown_ownership" flags — the rule was removed.
        retire_stmt = (
            update(RiskFlag)
            .where(RiskFlag.flag_type == "unknown_ownership", RiskFlag.status == "active")
            .values(status="resolved", resolved_at=datetime.now(UTC))
        )
        if vessel_id is not None:
            retire_stmt = retire_stmt.where(RiskFlag.vessel_id == vessel_id)
        retired = await self.session.execute(retire_stmt)
        stats["flags_retired"] = retired.rowcount or 0

        statement = select(Vessel)
        if vessel_id is not None:
            statement = statement.where(Vessel.id == vessel_id)
        vessels = list(await self.session.scalars(statement))
        for vessel in vessels:
            stats["vessels_seen"] += 1
            # NOTE: the old "unknown_ownership" rule was removed. OCEANS-X
            # currently exposes registered-owner relationships only for
            # Singapore-flagged vessels, so absence of ownership data on
            # other flags is uninformative and shouldn't penalize a vessel.
            severity = flag_country_severity(vessel.flag_country_code)
            if severity:
                stats["flags_inserted"] += int(
                    await self._ensure_flag(vessel.id, None, "high_risk_flag_country", severity, f"Flag country {vessel.flag_country_code} is configured as high risk.", None)
                )
            if await self._has_conflicting_identity(vessel):
                stats["flags_inserted"] += int(
                    await self._ensure_flag(vessel.id, None, "conflicting_identity", "high", "Stored source observations contain conflicting vessel identity values.", None)
                )
        await self.session.commit()
        return stats

    async def _has_conflicting_identity(self, vessel: Vessel) -> bool:
        observations = await self.session.scalars(
            select(SourceObservation).where(
                SourceObservation.source_record_id.ilike(f"%{vessel.imo}%") if vessel.imo else SourceObservation.id == -1
            )
        )
        names = {
            str(obs.raw_payload.get("vesselName") or (obs.raw_payload.get("vesselParticulars") or {}).get("vesselName") or "").casefold()
            for obs in observations
        }
        names.discard("")
        return len(names) > 1

    async def _ensure_flag(self, vessel_id: int | None, entity_id: int | None, flag_type: str, severity: str, summary: str, evidence_id: int | None) -> bool:
        existing = await self.session.scalar(
            select(RiskFlag).where(
                RiskFlag.vessel_id == vessel_id,
                RiskFlag.entity_id == entity_id,
                RiskFlag.flag_type == flag_type,
                RiskFlag.evidence_id == evidence_id,
                RiskFlag.status == "active",
            )
        )
        if existing is not None:
            return False
        self.session.add(RiskFlag(vessel_id=vessel_id, entity_id=entity_id, flag_type=flag_type, severity=severity, summary=summary, evidence_id=evidence_id, status="active"))
        await self.session.flush()
        return True

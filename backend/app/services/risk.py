from datetime import datetime, UTC

from sqlalchemy import case, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import SourceObservation
from app.models.maritime import Entity, Vessel
from app.models.risk import RiskFlag
from app.schemas.risk import RiskFeedItem, RiskFlagRead


HIGH_RISK_FLAG_COUNTRIES = {"KP", "IR", "SY"}


def flag_country_severity(flag_country_code: str | None) -> str | None:
    if not flag_country_code:
        return None
    return "high" if flag_country_code.upper() in HIGH_RISK_FLAG_COUNTRIES else None

class RiskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def feed(
        self,
        *,
        limit: int = 250,
        include_resolved: bool = False,
        flag_types: list[str] | None = None,
    ) -> list[RiskFeedItem]:
        severity_rank = case(
            (RiskFlag.severity == "critical", 4),
            (RiskFlag.severity == "high", 3),
            (RiskFlag.severity == "medium", 2),
            (RiskFlag.severity == "low", 1),
            else_=0,
        )
        statement = (
            select(RiskFlag, Vessel.name, Entity.name)
            .outerjoin(Vessel, RiskFlag.vessel_id == Vessel.id)
            .outerjoin(Entity, RiskFlag.entity_id == Entity.id)
            .order_by(desc(severity_rank), desc(RiskFlag.created_at))
            .limit(limit)
        )
        if not include_resolved:
            statement = statement.where(RiskFlag.status == "active")
        if flag_types:
            statement = statement.where(RiskFlag.flag_type.in_(flag_types))

        rows = await self.session.execute(statement)
        items: list[RiskFeedItem] = []
        for flag, vessel_name, entity_name in rows:
            if flag.vessel_id is not None:
                subject = vessel_name or f"Vessel #{flag.vessel_id}"
            else:
                subject = entity_name or f"Entity #{flag.entity_id}"
            items.append(
                RiskFeedItem(
                    flag=RiskFlagRead.model_validate(flag),
                    subject=subject,
                    vessel_id=flag.vessel_id,
                    entity_id=flag.entity_id,
                )
            )
        return items

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
        stats = {"vessels_seen": 0, "flags_inserted": 0, "flags_retired": 0, "flags_deduped": 0}

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

        # Dedup pass: collapse duplicate active risk flags down to the
        # most-recent row per (vessel_id, entity_id, flag_type). The old
        # _ensure_flag treated evidence_id as part of the uniqueness key,
        # which let enrichment matchers (sanctions, news) accumulate
        # multiple active rows per vessel × flag type as new evidence
        # arrived. Keep the newest, mark the rest resolved.
        stats["flags_deduped"] = await self._dedup_active_flags(vessel_id)

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
        """Insert-or-update a unique active risk flag per (subject, flag_type).

        Uniqueness no longer keys on `evidence_id` — that was the bug
        behind hundreds of duplicate sanctions/news flags. If a flag of
        the same kind already exists for this subject, we refresh its
        `summary`, `severity`, and `evidence_id` to the latest values
        and return False (no new row inserted).
        """
        existing = await self.session.scalar(
            select(RiskFlag).where(
                RiskFlag.vessel_id == vessel_id,
                RiskFlag.entity_id == entity_id,
                RiskFlag.flag_type == flag_type,
                RiskFlag.status == "active",
            )
        )
        if existing is not None:
            # Keep the row but pull forward the latest evidence + severity
            # so the UI reflects the most recent observation.
            if evidence_id is not None and existing.evidence_id != evidence_id:
                existing.evidence_id = evidence_id
            if existing.severity != severity:
                existing.severity = severity
            if existing.summary != summary:
                existing.summary = summary
            await self.session.flush()
            return False
        self.session.add(
            RiskFlag(
                vessel_id=vessel_id,
                entity_id=entity_id,
                flag_type=flag_type,
                severity=severity,
                summary=summary,
                evidence_id=evidence_id,
                status="active",
            )
        )
        await self.session.flush()
        return True

    async def _dedup_active_flags(self, vessel_id: int | None) -> int:
        """One-shot cleanup that collapses duplicate active risk flags down
        to the most-recent row per (vessel_id, entity_id, flag_type).
        Older rows are marked `resolved` (never deleted) so the dedup is
        reversible.
        """
        statement = select(RiskFlag).where(RiskFlag.status == "active").order_by(desc(RiskFlag.created_at))
        if vessel_id is not None:
            statement = statement.where(RiskFlag.vessel_id == vessel_id)
        rows = list(await self.session.scalars(statement))
        seen: set[tuple[int | None, int | None, str]] = set()
        retired = 0
        now = datetime.now(UTC)
        for flag in rows:
            key = (flag.vessel_id, flag.entity_id, flag.flag_type)
            if key in seen:
                flag.status = "resolved"
                flag.resolved_at = now
                retired += 1
            else:
                seen.add(key)
        if retired:
            await self.session.flush()
        return retired
